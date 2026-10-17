/**
 * One-off copy of every Firestore collection into Supabase.
 *
 *   npx tsx scripts/migrate-firestore-to-supabase.ts            # dry run: counts and checks only
 *   npx tsx scripts/migrate-firestore-to-supabase.ts --replace  # empties the Supabase tables, then copies
 *
 * --replace makes Supabase an exact copy of Firestore. Only run it before the
 * cutover (or with n8n paused, as its last step): after go-live it would wipe
 * whatever the site has written to Supabase since.
 *
 * Needs FIREBASE_* and SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL in .env.local.
 */
import { loadEnvConfig } from '@next/env';
import * as admin from 'firebase-admin';
import { Client } from 'pg';

loadEnvConfig(process.cwd());

type Store = typeof import('../lib/data/store');
type Table = import('../lib/data/store').Table;

// Firestore collection → table. Order matters: clients first (foreign keys).
const COLLECTIONS: Array<[string, Table]> = [
  ['clients', 'clients'],
  ['google_connections', 'google_connections'],
  ['google_ads_accounts', 'google_ads_accounts'],
  ['ads_reports_snapshots', 'ads_reports_snapshots'],
  ['admin_tasks', 'admin_tasks'],
  ['admin_followups', 'admin_followups'],
  ['admin_reports', 'admin_reports'],
  ['admin_invoices', 'admin_invoices'],
  ['admin_audit_logs', 'admin_audit_logs'],
  ['gbp_connections', 'gbp_connections'],
  ['gbp_locations', 'gbp_locations'],
  ['gbp_reply_settings', 'gbp_reply_settings'],
  ['gbp_reviews', 'gbp_reviews'],
  ['gbp_telegram_batches', 'gbp_telegram_batches'],
];
// Single documents → app_settings keys.
const SETTINGS: Array<[string, string, string]> = [
  ['gbp_settings', 'telegram_digest', 'telegram_digest'],
  ['gbp_sync_status', 'latest', 'gbp_sync_status'],
];
const HANDLED_ELSEWHERE = new Set(['admin_metadata', ...SETTINGS.map(([c]) => c)]);
const CLIENT_SCOPED = new Set<Table>(['gbp_connections', 'gbp_locations', 'gbp_reply_settings', 'gbp_reviews']);

/** Firestore Timestamps → ISO strings; everything else as is. */
function plain(value: unknown): unknown {
  if (value && typeof value === 'object') {
    if (typeof (value as { toDate?: unknown }).toDate === 'function') return (value as admin.firestore.Timestamp).toDate().toISOString();
    if (Array.isArray(value)) return value.map(plain);
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  }
  return value;
}

async function main() {
  const replace = process.argv.includes('--replace');
  const store: Store = await import('../lib/data/store');
  const { supabase } = await import('../lib/supabase');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  const firestore = admin.firestore();

  const known = new Set([...COLLECTIONS.map(([c]) => c), ...HANDLED_ELSEWHERE]);
  const unmapped = (await firestore.listCollections()).map((c) => c.id).filter((id) => !known.has(id));
  if (unmapped.length) throw new Error(`Firestore has collections with no table: ${unmapped.join(', ')}`);

  // Read everything first so nothing is written if any read or check fails.
  const data = new Map<Table, Array<{ id: string; row: Record<string, unknown> }>>();
  const report: string[] = [];
  for (const [collection, table] of COLLECTIONS) {
    const snapshot = await firestore.collection(collection).get();
    const columns = store.columnsOf(table);
    const pk = store.pkColumnOf(table);
    const rows = snapshot.docs.map((doc) => {
      const row: Record<string, unknown> = Object.fromEntries(columns.map((c) => [c, null]));
      Object.assign(row, store.toRow(table, plain(doc.data()) as object, { keepUnknown: true }));
      row.extra = row.extra || {};
      row[pk] = doc.id;
      return { id: doc.id, row };
    });
    data.set(table, rows);
    const extras = new Set(rows.flatMap(({ row }) => Object.keys(row.extra as object)));
    report.push(`${table.padEnd(24)} ${String(rows.length).padStart(4)}${extras.size ? `  (kept in extra: ${[...extras].join(', ')})` : ''}`);
  }

  // Rows pointing at a client that no longer exists can't satisfy the foreign keys.
  const clientIds = new Set(data.get('clients')!.map(({ id }) => id));
  for (const table of CLIENT_SCOPED) {
    const rows = data.get(table)!;
    const orphans = rows.filter(({ row }) => !clientIds.has(row.client_id as string));
    if (orphans.length) {
      report.push(`!! ${table}: skipping ${orphans.length} row(s) of deleted clients: ${orphans.map((o) => o.id).slice(0, 5).join(', ')}`);
      data.set(table, rows.filter((r) => !orphans.includes(r)));
    }
  }
  for (const { row } of data.get('admin_invoices')!) {
    if (row.client_id && !clientIds.has(row.client_id as string)) row.client_id = null;
  }

  const settings = await Promise.all(
    SETTINGS.map(async ([collection, doc, key]) => {
      const snap = await firestore.collection(collection).doc(doc).get();
      return { key, value: snap.exists ? plain(snap.data()) : null };
    })
  );
  const counter = await firestore.collection('admin_metadata').doc('invoices').get();
  const lastInvoiceSequence = Number(counter.data()?.lastInvoiceSequence || 0);
  report.push(`app_settings             ${settings.filter((s) => s.value).map((s) => s.key).join(', ')}`);
  report.push(`invoice sequence         last used ${lastInvoiceSequence}`);

  console.log(report.join('\n'));
  if (!replace) {
    console.log('\nDry run: nothing written. Re-run with --replace to copy.');
    return;
  }

  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  try {
    await pg.query(`truncate ${[...COLLECTIONS.map(([, t]) => t), 'app_settings'].join(', ')} cascade`);

    for (const [, table] of COLLECTIONS) {
      const rows = data.get(table)!.map(({ row }) => row);
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from(table).insert(rows.slice(i, i + 200));
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    }
    for (const { key, value } of settings) {
      if (!value) continue;
      const { error } = await supabase.from('app_settings').insert({ key, value });
      if (error) throw new Error(`app_settings: ${error.message}`);
    }
    if (lastInvoiceSequence > 0) await pg.query(`select setval('invoice_number_seq', $1, true)`, [lastInvoiceSequence]);
    else await pg.query(`select setval('invoice_number_seq', 1, false)`);

    // Verify: every table holds exactly what was read.
    let mismatches = 0;
    for (const [, table] of COLLECTIONS) {
      const { rows } = await pg.query(`select count(*)::int as n from ${table}`);
      const expected = data.get(table)!.length;
      if (rows[0].n !== expected) {
        mismatches++;
        console.error(`MISMATCH ${table}: expected ${expected}, found ${rows[0].n}`);
      }
    }
    console.log(mismatches ? `\nCopy finished with ${mismatches} mismatch(es).` : '\nCopy finished: every table matches Firestore.');
    if (mismatches) process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
