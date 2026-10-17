import { google } from 'googleapis';
import { getDoc, getSetting, listDocs, setSetting, updateDoc } from './data/store';
import { GA_CONNECTION, analyticsAuth } from './ga4';
import { allowedChatIds, escapeHtml as h, sendMessage } from './telegram';

// Google Search Console: how a client's site does in normal (unpaid) Google results.
// It shares the read-only Google login with GA4. Data runs about 3 days behind, so
// every period here ends 3 days ago.

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
export const SEARCH_LAG_DAYS = 3;
const DAY = 86_400_000;
const DROP_ALERT_PCT = 30; // weekly clicks falling this much (with enough volume) is alerted
const POSITION_ALERT = 3; // a top query losing this many places is alerted

export interface SearchTotals {
  clicks: number;
  impressions: number;
  ctr: number; // %
  position: number; // average, 1 = top
}

export interface SearchPeriod {
  totals: SearchTotals;
  queries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  pages: Array<{ page: string; clicks: number; impressions: number }>;
}

/** YYYY-MM-DD, `offset` days before today (UTC, as Search Console uses Pacific/UTC-ish dates). */
const dayAgo = (offset: number) => new Date(Date.now() - offset * DAY).toISOString().slice(0, 10);

/** Ranges ending SEARCH_LAG_DAYS ago: current, previous and the same dates last year. */
export function searchWindows(days: number) {
  const end = SEARCH_LAG_DAYS;
  const shiftYear = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`;
  const current = { start: dayAgo(end + days - 1), end: dayAgo(end) };
  return {
    current,
    previous: { start: dayAgo(end + days * 2 - 1), end: dayAgo(end + days) },
    lastYear: { start: shiftYear(current.start), end: shiftYear(current.end) },
  };
}

export async function searchConsoleReady() {
  const c = await getDoc<{ scopes?: string[] }>('google_connections', GA_CONNECTION);
  return { connected: Boolean(c), hasScope: Boolean(c?.scopes?.includes(SCOPE)) };
}

export function describeSearchError(error: unknown) {
  const err = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
  const message = err?.response?.data?.error?.message || err?.message || String(error);
  if (/insufficient|scope/i.test(message)) return 'Search Console needs one more permission: click “Reconnect Google Analytics” on the client page (Analytics tab).';
  if (/has not been used|is disabled/i.test(message)) return 'The Google Search Console API is off in Google Cloud. Enable it, wait a few minutes and try again.';
  if (/permission|not have sufficient|forbidden/i.test(message)) return 'This Google login has no access to that site in Search Console. Add it as a user there.';
  if (/invalid_grant/i.test(message)) return 'Google access expired. Reconnect Google Analytics on the client page (Analytics tab).';
  if (/not connected/i.test(message)) return 'Google Analytics / Search Console is not connected. Connect it on the client page (Analytics tab).';
  return message.slice(0, 200);
}

async function client() {
  return google.searchconsole({ version: 'v1', auth: await analyticsAuth() });
}

/** Sites the login can read (owner, full or restricted user). */
export async function listSearchSites() {
  const sc = await client();
  const res = await sc.sites.list();
  return (res.data.siteEntry || [])
    .filter((s) => s.permissionLevel !== 'siteUnverifiedUser')
    .map((s) => ({ siteUrl: s.siteUrl!, permission: s.permissionLevel || '' }))
    .sort((a, b) => a.siteUrl.replace('sc-domain:', '').localeCompare(b.siteUrl.replace('sc-domain:', '')));
}

export async function setClientSearchSite(clientId: string, siteUrl: string | null) {
  await updateDoc('clients', clientId, { searchConsoleSite: siteUrl || '', updatedAt: new Date().toISOString() });
}

async function query(siteUrl: string, range: { start: string; end: string }, dimensions: string[], rowLimit: number) {
  const sc = await client();
  const res = await sc.searchanalytics.query({ siteUrl, requestBody: { startDate: range.start, endDate: range.end, dimensions, rowLimit, dataState: 'final' } });
  return res.data.rows || [];
}

export async function fetchSearchPeriod(siteUrl: string, range: { start: string; end: string }, withBreakdowns: boolean): Promise<SearchPeriod> {
  const [totalRows, queryRows, pageRows] = await Promise.all([
    query(siteUrl, range, [], 1),
    withBreakdowns ? query(siteUrl, range, ['query'], 10) : Promise.resolve([]),
    withBreakdowns ? query(siteUrl, range, ['page'], 5) : Promise.resolve([]),
  ]);
  const t = totalRows[0];
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    totals: {
      clicks: t?.clicks || 0,
      impressions: t?.impressions || 0,
      ctr: round1((t?.ctr || 0) * 100),
      position: round1(t?.position || 0),
    },
    queries: queryRows.map((r) => ({ query: r.keys?.[0] || '', clicks: r.clicks || 0, impressions: r.impressions || 0, position: round1(r.position || 0) })),
    pages: pageRows.map((r) => ({ page: r.keys?.[0] || '', clicks: r.clicks || 0, impressions: r.impressions || 0 })),
  };
}

// ---------- Daily summary and alerts (10 AM Cairo, with GA4) ----------

export interface SearchSummary {
  siteUrl: string;
  start: string;
  end: string;
  clicks: number;
  clicksBefore: number;
  impressions: number;
  position: number;
  topQueries: Array<{ query: string; clicks: number; position: number }>;
  capturedAt: string;
}

export async function refreshSearchSummary(clientId: string, siteUrl: string) {
  const w = searchWindows(7);
  const [cur, prev] = await Promise.all([fetchSearchPeriod(siteUrl, w.current, true), fetchSearchPeriod(siteUrl, w.previous, true)]);
  const summary: SearchSummary = {
    siteUrl,
    start: w.current.start,
    end: w.current.end,
    clicks: cur.totals.clicks,
    clicksBefore: prev.totals.clicks,
    impressions: cur.totals.impressions,
    position: cur.totals.position,
    topQueries: cur.queries.slice(0, 5).map((q) => ({ query: q.query, clicks: q.clicks, position: q.position })),
    capturedAt: new Date().toISOString(),
  };
  await setSetting(`search_summary:${clientId}`, summary);
  return { summary, previousQueries: prev.queries };
}

export async function getSearchSummary(clientId: string) {
  return getSetting<SearchSummary>(`search_summary:${clientId}`);
}

/**
 * Once per Cairo day on the first hourly run at or after 10 AM (with GA4); alerts on
 * a sharp clicks drop or a top query slipping.
 */
export async function captureSearchDaily(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value])
  );
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const none = { refreshed: 0, alerts: 0, errors: [] as string[] };
  if (Number(parts.hour) < 10) return none;
  if ((await getSetting<{ day?: string }>('search_daily_run'))?.day === today) return none;
  const ready = await searchConsoleReady();
  if (!ready.connected || !ready.hasScope) return none;
  const result = await runSearchDaily();
  await setSetting('search_daily_run', { day: today, ...result });
  return result;
}

async function runSearchDaily() {
  const clients = (await listDocs<{ brandName: string; searchConsoleSite?: string }>('clients')).filter((c) => c.searchConsoleSite);
  let refreshed = 0;
  let alerts = 0;
  const errors: string[] = [];
  for (const c of clients) {
    try {
      const { summary, previousQueries } = await refreshSearchSummary(c.id, c.searchConsoleSite!);
      refreshed++;
      alerts += await alertOnDrops(c.id, c.brandName, summary, previousQueries);
    } catch (error) {
      errors.push(`${c.brandName}: ${describeSearchError(error)}`);
    }
  }
  return { refreshed, alerts, errors };
}

async function alertOnDrops(clientId: string, clientName: string, s: SearchSummary, previousQueries: SearchPeriod['queries']) {
  // One alert per client per week of data, so the same drop isn't repeated every day.
  const key = `search_alerted:${clientId}`;
  const last = await getSetting<{ end?: string }>(key);
  if (last?.end && Date.parse(s.end) - Date.parse(last.end) < 7 * DAY) return 0;

  const lines: string[] = [];
  if (s.clicksBefore >= 30 && s.clicks <= s.clicksBefore * (1 - DROP_ALERT_PCT / 100)) {
    lines.push(`• Google clicks: <b>${s.clicks}</b> this week vs ${s.clicksBefore} the week before (▼ ${Math.round((1 - s.clicks / s.clicksBefore) * 100)}%)`);
  }
  for (const q of s.topQueries) {
    const before = previousQueries.find((p) => p.query === q.query);
    if (before && before.position > 0 && q.position - before.position >= POSITION_ALERT) {
      lines.push(`• “${h(q.query)}” dropped from position ${before.position} to ${q.position}`);
    }
  }
  if (!lines.length) return 0;
  const text = [`🔎 <b>Google search drop: ${h(clientName)}</b>`, `<i>${s.start} – ${s.end} (Search Console runs ~3 days behind)</i>`, '', ...lines, '', 'Check Search Console for indexing issues, or whether a competitor overtook these pages.'].join('\n');
  const chats = allowedChatIds();
  for (const chat of chats) await sendMessage(chat, { text, buttons: [[{ text: '🔎 Open Search Console', url: 'https://search.google.com/search-console' }]] });
  await setSetting(key, { end: s.end });
  return chats.length;
}
