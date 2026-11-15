import { SignJWT, jwtVerify } from 'jose';
import { listClientProfiles } from './admin-ops';
import { getDoc, listDocs } from './data/store';
import { listEmailAccounts } from './email/inbox';
import { AGENCY_CONNECT_ID, GBP_CONNECTIONS } from './google-business';
import { getSetting } from './data/store';
import { META_CONNECTIONS, SOCIAL_ACCOUNTS } from './meta';
import type { GbpConnection, MetaConnection, SocialAccount } from '@/types/database';

// Reconnecting accounts from the Anwarz app (More → Connections). The app asks for a link; the
// website signs a 15-minute, single-purpose token and the phone's browser opens
// /api/app/connect/start?t=…, which starts the provider's sign-in. The token rides along in the
// OAuth state, so the callback accepts it in place of an admin login (the phone's browser has none).

export type ConnectKind = 'gmail' | 'outlook' | 'google_ads' | 'gbp' | 'meta';
const PURPOSE = 'anwarz-app-connect';
const key = () => new TextEncoder().encode(`${process.env.SESSION_SECRET}:app-connect`);

export async function createAppConnectToken(kind: ConnectKind, clientId: string | null = null) {
  return new SignJWT({ purpose: PURPOSE, kind, cid: clientId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key());
}

export async function verifyAppConnectToken(token: string | null | undefined): Promise<{ kind: ConnectKind; clientId: string | null } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (payload.purpose !== PURPOSE || typeof payload.kind !== 'string') return null;
    return { kind: payload.kind as ConnectKind, clientId: typeof payload.cid === 'string' ? payload.cid : null };
  } catch {
    return null;
  }
}

/** "mail:gmail~<token>" style OAuth state: splits off the app token, if any. */
export function splitAppState(state: string | null) {
  const [base, token] = (state || '').split('~');
  return { base, token: token || null };
}

/** Where the browser lands after an app reconnect. */
export const appDoneUrl = (requestUrl: string, status: 'connected' | 'error', what: string) =>
  new URL(`/connect/done?status=${status}&what=${encodeURIComponent(what.slice(0, 120))}`, requestUrl);

// ---------- Status of every connection ----------

export interface ConnectionRow {
  id: string;
  group: 'Email' | 'Google' | 'Facebook & Instagram';
  name: string;
  detail: string;
  ok: boolean;
  problem: string | null;
  kind: ConnectKind;
  clientId: string | null;
}

const HOUR = 3_600_000;

/** Every account the automation depends on, with what's wrong (if anything). */
export async function listConnections(): Promise<ConnectionRow[]> {
  const [accounts, clients, gbp, meta, social, ads, agencyGbp, reviewSync, watch] = await Promise.all([
    listEmailAccounts().catch(() => []),
    listClientProfiles().catch(() => []),
    listDocs<GbpConnection>(GBP_CONNECTIONS).catch(() => []),
    listDocs<MetaConnection>(META_CONNECTIONS).catch(() => []),
    listDocs<SocialAccount>(SOCIAL_ACCOUNTS, { where: { linked: true } }).catch(() => []),
    getDoc<{ encryptedRefreshToken?: string; updatedAt?: string; lastError?: string }>('google_connections', 'master_admin_connection').catch(() => null),
    getDoc<{ accountEmail?: string; encryptedRefreshToken?: string }>('google_connections', 'gbp_agency_connection').catch(() => null),
    getSetting<{ finishedAt?: string; errors?: { location: string; error: string }[] }>('gbp_sync_status').catch(() => null),
    import('./ads-watch').then((m) => m.adsWatchState()).catch(() => null),
  ]);
  // The hourly ads watch records sign-in errors per client and platform.
  const AUTH = /reconnect|invalid_grant|unauthor|expired|revoked|token|permission|OAuth/i;
  const adsAuthError = (platform: 'google' | 'meta') =>
    Object.values(watch?.clients || {})
      .map((c) => c[platform])
      .find((h) => h?.state === 'error' && AUTH.test(h.reason))?.reason || null;
  const name = (id: string | undefined) => (id && clients.find((c) => c.id === id)?.brandName) || 'Agency';
  const rows: ConnectionRow[] = [];

  for (const a of accounts.filter((x) => x.enabled)) {
    const stale = !a.last_checked_at || Date.now() - Date.parse(a.last_checked_at) > 2 * HOUR;
    const problem = a.last_error ? `Can’t read the inbox: ${a.last_error.slice(0, 140)}` : stale ? `Not checked for ${a.last_checked_at ? Math.round((Date.now() - Date.parse(a.last_checked_at)) / HOUR) : '?'} hours` : null;
    rows.push({
      id: `email:${a.id}`,
      group: 'Email',
      name: a.email,
      detail: a.provider === 'gmail' ? 'Gmail' : 'Outlook',
      ok: !problem,
      problem,
      kind: a.provider === 'gmail' ? 'gmail' : 'outlook',
      clientId: null,
    });
  }

  rows.push({
    id: 'google_ads',
    group: 'Google',
    name: 'Google Ads',
    detail: 'All clients’ ad accounts (one Google login)',
    ok: Boolean(ads?.encryptedRefreshToken) && !ads?.lastError && !adsAuthError('google'),
    problem: !ads?.encryptedRefreshToken
      ? 'Not connected'
      : ads.lastError
      ? ads.lastError.slice(0, 140)
      : adsAuthError('google')
      ? `Ads can’t be read: ${adsAuthError('google')!.slice(0, 140)}`
      : null,
    kind: 'google_ads',
    clientId: null,
  });
  // The agency's Google login reads every client's reviews: a sign-in error in the last sync means reconnect.
  if (agencyGbp?.encryptedRefreshToken) {
    const auth = (reviewSync?.errors || []).find((e) => /reconnect|invalid_grant|unauthor|expired|revoked|permission/i.test(e.error));
    const stale = reviewSync?.finishedAt && Date.now() - Date.parse(reviewSync.finishedAt) > 30 * HOUR;
    const problem = auth ? `Reviews can’t sync: ${auth.error.slice(0, 140)}` : stale ? 'Reviews haven’t synced for over a day' : null;
    rows.push({ id: 'gbp:agency', group: 'Google', name: 'Google reviews (agency login)', detail: agencyGbp.accountEmail || '', ok: !problem, problem, kind: 'gbp', clientId: AGENCY_CONNECT_ID });
  }
  for (const g of gbp) {
    const problem = g.status === 'error' ? `Reviews can’t sync: ${(g.lastError || 'sign-in expired').slice(0, 140)}` : null;
    rows.push({ id: `gbp:${g.clientId}`, group: 'Google', name: `${name(g.clientId)} · Business Profile`, detail: g.googleEmail, ok: !problem, problem, kind: 'gbp', clientId: g.clientId });
  }

  for (const m of meta) {
    const expires = m.tokenExpiresAt ? Date.parse(m.tokenExpiresAt) : null;
    const days = expires ? Math.round((expires - Date.now()) / (24 * HOUR)) : null;
    const problem =
      !m.clientId && adsAuthError('meta')
        ? `Facebook ads can’t be read: ${adsAuthError('meta')!.slice(0, 140)}`
        : m.status === 'error'
        ? `Facebook sign-in failed: ${(m.lastError || 'expired').slice(0, 140)}`
        : days !== null && days < 0
        ? 'Facebook sign-in expired'
        : days !== null && days <= 7
        ? `Facebook sign-in expires in ${days} day${days === 1 ? '' : 's'}`
        : null;
    const pages = social.filter((s) => s.connectionId === m.id);
    rows.push({
      id: `meta:${m.id}`,
      group: 'Facebook & Instagram',
      name: `${m.clientId ? name(m.clientId) : 'Agency'} · ${m.metaUserName}`,
      detail: pages.length ? pages.map((p) => p.pageName).join(', ').slice(0, 120) : 'Facebook login',
      ok: !problem,
      problem,
      kind: 'meta',
      clientId: m.clientId || (pages[0]?.clientId ?? null),
    });
  }
  for (const s of social.filter((x) => x.lastError)) {
    rows.push({
      id: `social:${s.id}`,
      group: 'Facebook & Instagram',
      name: `${name(s.clientId)} · ${s.pageName}`,
      detail: s.igUsername ? `Page + @${s.igUsername}` : 'Facebook Page',
      ok: false,
      problem: `Can’t read the page: ${s.lastError!.slice(0, 140)}`,
      kind: 'meta',
      clientId: s.clientId || null,
    });
  }
  return rows;
}
