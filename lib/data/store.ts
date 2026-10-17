import crypto from 'crypto';
import { supabase, supabaseConfigProblem } from '../supabase';

/**
 * Document-style access to the Supabase tables, so the app keeps working with
 * its camelCase records. Columns are the snake_case form of each field; any
 * legacy field without a column lives in `extra` (see supabase/migrations).
 */
const TABLES = {
  clients: {
    pk: 'id',
    fields: ['brandName', 'ownerName', 'email', 'mobileNumber', 'websiteUrl', 'facebookLink', 'instagramLink', 'tiktokLink', 'googleLink', 'ga4PropertyId', 'clarityProjectId', 'clarityApiTokenEncrypted', 'searchConsoleSite', 'linkedGoogleAdsIds', 'createdAt', 'updatedAt'],
  },
  google_connections: {
    pk: 'id',
    fields: ['provider', 'accountEmail', 'encryptedAccessToken', 'encryptedRefreshToken', 'tokenExpiry', 'scopes', 'createdAt', 'updatedAt'],
  },
  google_ads_accounts: {
    pk: 'id',
    fields: ['googleConnectionId', 'customerId', 'descriptiveName', 'currencyCode', 'timeZone', 'isSelected', 'brandName', 'ownerName', 'clientBusinessName', 'clientContactName', 'aiPromptNotes', 'campaignNames', 'campaignsCheckedAt', 'createdAt', 'updatedAt'],
  },
  ads_reports_snapshots: {
    pk: 'id',
    fields: ['customerId', 'dateRangeKey', 'reportType', 'payloadJson', 'fetchedAt'],
  },
  admin_tasks: {
    pk: 'id',
    fields: ['title', 'details', 'client', 'type', 'priority', 'status', 'dueDate', 'ownerNote', 'createdAt', 'updatedAt'],
  },
  admin_followups: {
    pk: 'id',
    fields: ['clientName', 'contactPerson', 'channel', 'reason', 'lastContactDate', 'nextFollowUpDate', 'cadenceStyle', 'currentIssue', 'promisedNextStep', 'notes', 'ownerNote', 'status', 'createdAt', 'updatedAt'],
  },
  admin_reports: {
    pk: 'id',
    fields: ['clientName', 'reportType', 'reportingPeriod', 'dueDate', 'keyFocus', 'notes', 'ownerNote', 'sentDate', 'status', 'createdAt', 'updatedAt'],
  },
  admin_invoices: {
    pk: 'id',
    fields: ['clientId', 'clientName', 'clientBrand', 'recipientEmail', 'invoiceNumber', 'description', 'lineItems', 'payments', 'standardAmount', 'discountAmount', 'subtotalAmount', 'totalAmount', 'amount', 'currency', 'serviceMonth', 'serviceMonthKey', 'billingPeriodFrom', 'billingPeriodTo', 'serviceSummary', 'issueDate', 'dueDate', 'sentDate', 'paidDate', 'paymentNote', 'ownerNote', 'isTemplateGenerated', 'status', 'createdAt', 'updatedAt'],
  },
  admin_audit_logs: {
    pk: 'id',
    fields: ['action', 'metadataJson', 'ipAddress', 'createdAt'],
  },
  gbp_connections: {
    pk: 'clientId',
    fields: ['googleEmail', 'encryptedRefreshToken', 'scopes', 'status', 'lastError', 'connectedVia', 'connectedAt', 'updatedAt'],
  },
  gbp_locations: {
    pk: 'id',
    fields: ['clientId', 'accountName', 'locationName', 'title', 'address', 'linked', 'replyMode', 'lastSyncedAt', 'updatedAt'],
  },
  gbp_reply_settings: {
    pk: 'clientId',
    fields: ['tone', 'length', 'language', 'signOff', 'useReviewerName', 'mentionBusinessName', 'allowEmojis', 'negativeContact', 'highlights', 'avoid', 'extraInstructions', 'updatedAt'],
  },
  gbp_reviews: {
    pk: 'id',
    fields: ['clientId', 'locationId', 'locationTitle', 'reviewName', 'reviewerName', 'rating', 'comment', 'createTime', 'updateTime', 'status', 'draft', 'draftGeneratedAt', 'draftError', 'existingReply', 'postedReply', 'postedAt', 'shortRef', 'telegramSentAt', 'firstSeenAt', 'updatedAt'],
  },
  gbp_telegram_batches: {
    pk: 'id',
    fields: ['clientName', 'reviewIds', 'lastPartIds', 'parts', 'createdAt'],
  },
  websites: {
    pk: 'id',
    fields: ['clientId', 'url', 'label', 'mustContain', 'enabled', 'status', 'lastStatusCode', 'lastResponseMs', 'lastError', 'downSince', 'sslExpiresAt', 'sslAlertedDays', 'lastCheckedAt', 'createdAt', 'updatedAt'],
  },
  website_checks: {
    pk: 'id',
    fields: ['websiteId', 'clientId', 'ok', 'statusCode', 'responseMs', 'error', 'checkedAt'],
  },
  clarity_daily: {
    pk: 'id',
    fields: ['clientId', 'day', 'sessions', 'botSessions', 'pagesPerSession', 'scrollDepth', 'activeSeconds', 'rageClickPct', 'deadClickPct', 'quickbackPct', 'scriptErrorPct', 'raw', 'capturedAt'],
  },
  client_reports: {
    pk: 'id',
    fields: ['clientId', 'periodDays', 'language', 'periodStart', 'periodEnd', 'data', 'createdAt'],
  },
  meta_connections: {
    pk: 'id',
    fields: ['connectedVia', 'clientId', 'metaUserId', 'metaUserName', 'encryptedUserToken', 'tokenExpiresAt', 'scopes', 'status', 'lastError', 'connectedAt', 'updatedAt'],
  },
  social_accounts: {
    pk: 'id',
    fields: ['connectionId', 'clientId', 'pageName', 'encryptedPageToken', 'igUserId', 'igUsername', 'linked', 'linkedAt', 'lastSyncedAt', 'lastError', 'updatedAt'],
  },
  social_follower_snapshots: {
    pk: 'id',
    fields: ['accountId', 'clientId', 'day', 'fbFollowers', 'igFollowers', 'capturedAt'],
  },
  social_posts: {
    pk: 'id',
    fields: ['accountId', 'clientId', 'platform', 'message', 'permalink', 'createdTime', 'reach', 'views', 'likes', 'commentsCount', 'lastSyncedAt', 'updatedAt'],
  },
  social_comments: {
    pk: 'id',
    fields: ['accountId', 'clientId', 'platform', 'postId', 'postPermalink', 'postExcerpt', 'authorName', 'authorId', 'message', 'createdTime', 'status', 'riskLevel', 'riskCategory', 'riskReason', 'draft', 'draftGeneratedAt', 'draftError', 'postedReply', 'postedAt', 'hiddenAt', 'shortRef', 'telegramSentAt', 'riskAlertedAt', 'firstSeenAt', 'updatedAt'],
  },
} as const;

export type Table = keyof typeof TABLES;
type Doc = Record<string, unknown>;
export type WithId<T> = T & { id: string };

const snake = (field: string) => field.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const columnMaps = Object.fromEntries(
  Object.entries(TABLES).map(([table, { pk, fields }]) => {
    const all = [pk, ...fields];
    return [table, { pkColumn: snake(pk), toColumn: new Map(all.map((f) => [f, snake(f)])), toField: new Map(all.map((f) => [snake(f), f])) }];
  })
) as Record<Table, { pkColumn: string; toColumn: Map<string, string>; toField: Map<string, string> }>;

/** Column names of a table, primary key first. */
export function columnsOf(table: Table) {
  return [...columnMaps[table].toColumn.values()];
}

export function pkColumnOf(table: Table) {
  return columnMaps[table].pkColumn;
}

/** Firestore-style auto id. */
export function newId() {
  return crypto.randomBytes(15).toString('base64url').slice(0, 20);
}

function fail(table: string, action: string, error: { message: string; details?: string }): never {
  const problem = supabaseConfigProblem();
  // supabase-js reports network errors as "TypeError: fetch failed" with the cause in details.
  const detail = problem || (error.details ? `${error.message} (${String(error.details).slice(0, 200)})` : error.message);
  throw new Error(`Database ${action} on ${table} failed: ${detail}`);
}

/**
 * App record → row. Unknown fields are an error (they would be lost), except when
 * `keepUnknown` is set (the Firestore copy), which stores them in `extra`.
 */
export function toRow(table: Table, data: object, options: { keepUnknown?: boolean } = {}) {
  const { toColumn } = columnMaps[table];
  const row: Doc = {};
  const extra: Doc = {};
  for (const [field, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const column = field === 'id' && TABLES[table].pk !== 'id' ? null : toColumn.get(field);
    if (!column) {
      if (field === 'id') continue; // the pk is held under its own name
      if (!options.keepUnknown) throw new Error(`Unknown field "${field}" for ${table}.`);
      extra[field] = value;
      continue;
    }
    // Empty strings aren't valid timestamps; Firestore had no such constraint.
    row[column] = column.endsWith('_at') && value === '' ? null : value;
  }
  if (Object.keys(extra).length) row.extra = extra;
  return row;
}

/** Row → app record: nulls dropped (Firestore simply had no field), timestamps as ISO strings. */
export function fromRow<T>(table: Table, row: Doc): WithId<T> {
  const { toField, pkColumn } = columnMaps[table];
  const record: Doc = { ...((row.extra as Doc) || {}) };
  for (const [column, value] of Object.entries(row)) {
    if (column === 'extra' || value === null) continue;
    const field = toField.get(column) || column;
    record[field] = column.endsWith('_at') && typeof value === 'string' ? new Date(value).toISOString() : value;
  }
  record.id = row[pkColumn];
  return record as WithId<T>;
}

/** Full row for a Firestore-style `set` without merge: unspecified fields are cleared. */
function replacementRow(table: Table, id: string, data: object) {
  const { pkColumn, toColumn } = columnMaps[table];
  const row: Doc = Object.fromEntries([...toColumn.values()].map((c) => [c, null]));
  Object.assign(row, toRow(table, data));
  row.extra = row.extra || {};
  row[pkColumn] = id;
  return row;
}

type Filter = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q>(table: Table, query: Q, filters: Filter): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  for (const [field, value] of Object.entries(filters)) {
    const column = field === 'id' ? columnMaps[table].pkColumn : columnMaps[table].toColumn.get(field);
    if (!column) throw new Error(`Unknown filter field "${field}" for ${table}.`);
    q = Array.isArray(value) ? q.in(column, value) : q.eq(column, value);
  }
  return q as Q;
}

export async function getDoc<T>(table: Table, id: string): Promise<WithId<T> | null> {
  const { data, error } = await supabase.from(table).select('*').eq(columnMaps[table].pkColumn, id).maybeSingle();
  if (error) fail(table, 'read', error);
  return data ? fromRow<T>(table, data) : null;
}

/** Reads many rows by id; the map only holds those that exist. */
export async function getDocs<T>(table: Table, ids: string[]): Promise<Map<string, WithId<T>>> {
  const found = new Map<string, WithId<T>>();
  const unique = [...new Set(ids)];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await supabase.from(table).select('*').in(columnMaps[table].pkColumn, unique.slice(i, i + 100));
    if (error) fail(table, 'read', error);
    for (const row of data || []) {
      const doc = fromRow<T>(table, row);
      found.set(doc.id, doc);
    }
  }
  return found;
}

/** Rows matching every filter (array value = "in"), optionally ordered by a field. */
export async function listDocs<T>(
  table: Table,
  options: { where?: Filter; orderBy?: string; limit?: number } = {}
): Promise<Array<WithId<T>>> {
  let query = supabase.from(table).select('*');
  if (options.where) query = applyFilters(table, query, options.where);
  if (options.orderBy) query = query.order(columnMaps[table].toColumn.get(options.orderBy) || options.orderBy, { ascending: true });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) fail(table, 'read', error);
  return (data || []).map((row) => fromRow<T>(table, row));
}

/** Inserts a new record and returns its id. */
export async function addDoc(table: Table, data: object, id = newId()) {
  const { error } = await supabase.from(table).insert({ ...toRow(table, data), [columnMaps[table].pkColumn]: id });
  if (error) fail(table, 'insert', error);
  return id;
}

/** Firestore `set`: replaces the record, or with `merge` only writes the given fields. */
export async function setDoc(table: Table, id: string, data: object, options: { merge?: boolean } = {}) {
  await setDocs(table, [{ id, data }], options);
}

/** Several `set`s in as few round-trips as possible. */
export async function setDocs(table: Table, entries: Array<{ id: string; data: object }>, options: { merge?: boolean } = {}) {
  const { pkColumn } = columnMaps[table];
  const rows = entries.map(({ id, data }) =>
    options.merge ? { ...toRow(table, data), [pkColumn]: id } : replacementRow(table, id, data)
  );
  // A bulk upsert writes the union of keys, so group rows with the same keys
  // to keep merge semantics (untouched fields stay as they are).
  const groups = new Map<string, Doc[]>();
  for (const row of rows) {
    const signature = Object.keys(row).sort().join(',');
    groups.set(signature, [...(groups.get(signature) || []), row]);
  }
  for (const group of groups.values()) {
    const { error } = await supabase.from(table).upsert(group, { onConflict: pkColumn });
    if (error) fail(table, 'write', error);
  }
}

/** Firestore `update`: changes the given fields on existing records only. */
export async function updateDoc(table: Table, id: string | string[], data: object) {
  const ids = Array.isArray(id) ? id : [id];
  if (!ids.length) return;
  const { error } = await supabase.from(table).update(toRow(table, data)).in(columnMaps[table].pkColumn, ids);
  if (error) fail(table, 'update', error);
}

export async function deleteDocs(table: Table, where: Filter) {
  if (!Object.keys(where).length) throw new Error('deleteDocs needs a filter.');
  const { error } = await applyFilters(table, supabase.from(table).delete(), where);
  if (error) fail(table, 'delete', error);
}

/** Deletes rows whose timestamp field is before `iso` (history pruning). */
export async function deleteOlderThan(table: Table, field: string, iso: string) {
  const column = columnMaps[table].toColumn.get(field);
  if (!column) throw new Error(`Unknown field "${field}" for ${table}.`);
  const { error } = await supabase.from(table).delete().lt(column, iso);
  if (error) fail(table, 'delete', error);
}

// ---------- Single settings documents ----------

export async function getSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) fail('app_settings', 'read', error);
  return data ? (data.value as T) : null;
}

/** Replaces a setting, or with `merge` shallow-merges into it atomically. */
export async function setSetting(key: string, value: object, options: { merge?: boolean } = {}) {
  const clean = JSON.parse(JSON.stringify(value)); // drops undefined, like Firestore
  const { error } = options.merge
    ? await supabase.rpc('merge_setting', { setting_key: key, patch: clean })
    : await supabase.from('app_settings').upsert({ key, value: clean }, { onConflict: 'key' });
  if (error) fail('app_settings', 'write', error);
}

export async function nextInvoiceSequence(): Promise<string> {
  const { data, error } = await supabase.rpc('next_invoice_number');
  if (error) fail('admin_invoices', 'invoice number', error);
  return data as string;
}
