import { getDoc, listDocs, setDocs, updateDoc } from './data/store';
import { getAdsClient } from './google-ads';

// Google Ads numbers for reports and Telegram, per client (summed over the ad
// accounts linked to that client on its page).

export interface AdsTotals {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface AdsCampaign {
  name: string;
  status: string;
  cost: number;
  clicks: number;
  conversions: number;
}

const empty = (): AdsTotals => ({ cost: 0, impressions: 0, clicks: 0, conversions: 0 });

/** Ad account ids linked to a client. */
export async function clientAdsAccounts(clientId: string) {
  const client = await getDoc<{ linkedGoogleAdsIds?: string[] }>('clients', clientId);
  const ids = client?.linkedGoogleAdsIds || [];
  if (!ids.length) return [];
  const accounts = await listDocs<{ customerId: string; descriptiveName?: string; currencyCode?: string }>('google_ads_accounts', { where: { id: ids } });
  return ids.map((id) => {
    const a = accounts.find((x) => x.id === id);
    return { customerId: id, name: a?.descriptiveName || id, currency: a?.currencyCode || 'CAD' };
  });
}

/** Clients with at least one linked ad account. */
export async function clientsWithAds() {
  const clients = await listDocs<{ brandName: string; linkedGoogleAdsIds?: string[] }>('clients');
  return clients.filter((c) => c.linkedGoogleAdsIds?.length);
}

/** Readable reason for a Google Ads failure. */
export function describeAdsError(error: unknown) {
  const err = error as { message?: string; errors?: Array<{ message?: string }> };
  const message = err?.errors?.[0]?.message || err?.message || String(error);
  if (/invalid_grant/i.test(message)) return 'Google Ads access expired. Reconnect it on any client page (Google Ads card).';
  if (/No Google connection|refresh token/i.test(message)) return 'Google Ads is not connected. Connect it on any client page (Google Ads card).';
  return message.slice(0, 200);
}

/**
 * Totals and campaigns for one ad account between two dates (YYYY-MM-DD, inclusive,
 * in the account's own time zone, as Google Ads reports them).
 */
export async function fetchAdsPeriod(customerId: string, start: string, end: string) {
  const { client, refreshToken } = await getAdsClient();
  const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });
  const rows = (await customer.query(`
    SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
  `)) as Array<{ campaign?: { name?: string; status?: string | number }; metrics?: { cost_micros?: number; impressions?: number; clicks?: number; conversions?: number } }>;

  const totals = empty();
  const byCampaign = new Map<string, AdsCampaign>();
  for (const row of rows) {
    const cost = (row.metrics?.cost_micros || 0) / 1_000_000;
    const clicks = row.metrics?.clicks || 0;
    const conversions = row.metrics?.conversions || 0;
    totals.cost += cost;
    totals.impressions += row.metrics?.impressions || 0;
    totals.clicks += clicks;
    totals.conversions += conversions;
    const name = row.campaign?.name || 'Campaign';
    const c = byCampaign.get(name) || { name, status: String(row.campaign?.status ?? ''), cost: 0, clicks: 0, conversions: 0 };
    c.cost += cost;
    c.clicks += clicks;
    c.conversions += conversions;
    byCampaign.set(name, c);
  }
  const campaigns = [...byCampaign.values()].filter((c) => c.cost > 0 || c.clicks > 0).sort((a, b) => b.cost - a.cost);
  return { totals, campaigns };
}

/** Sums a client's ad accounts for a period. */
export async function fetchClientAds(clientId: string, start: string, end: string) {
  const accounts = await clientAdsAccounts(clientId);
  if (!accounts.length) return null;
  const totals = empty();
  const campaigns: AdsCampaign[] = [];
  for (const account of accounts) {
    const r = await fetchAdsPeriod(account.customerId, start, end);
    totals.cost += r.totals.cost;
    totals.impressions += r.totals.impressions;
    totals.clicks += r.totals.clicks;
    totals.conversions += r.totals.conversions;
    campaigns.push(...r.campaigns);
  }
  return { accounts, currency: accounts[0].currency, totals, campaigns: campaigns.sort((a, b) => b.cost - a.cost) };
}

export function money(amount: number, currency: string, locale = 'en-CA') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: amount >= 100 ? 0 : 2 }).format(amount);
}

export const ctr = (t: AdsTotals) => (t.impressions ? (t.clicks / t.impressions) * 100 : null);
export const costPerConversion = (t: AdsTotals) => (t.conversions ? t.cost / t.conversions : null);

// ---------- Choosing a client's ad accounts ----------

export interface AdsAccountChoice {
  customerId: string;
  name: string;
  currency: string;
  campaigns: string[]; // active first; helps tell similar accounts apart
  selected: boolean;
  takenBy?: string; // another client's name
}

/** "1234567890" → "123-456-7890", as Google Ads shows account ids. */
export const formatCustomerId = (id: string) => id.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');

async function campaignNames(customerId: string) {
  const { client, refreshToken } = await getAdsClient();
  const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });
  const rows = (await customer.query(`
    SELECT campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' LIMIT 50
  `)) as Array<{ campaign?: { name?: string; status?: string | number } }>;
  const enabled = (s: unknown) => s === 2 || s === 'ENABLED';
  return rows
    .sort((a, b) => Number(enabled(b.campaign?.status)) - Number(enabled(a.campaign?.status)))
    .map((r) => `${r.campaign?.name || 'Campaign'}${enabled(r.campaign?.status) ? '' : ' (paused)'}`)
    .slice(0, 6);
}

/**
 * Re-reads every ad account the Google login can access, with campaign names,
 * and marks which client each one belongs to. Throws if Google Ads isn't connected.
 */
export async function previewClientAdsAccounts(clientId: string): Promise<AdsAccountChoice[]> {
  const { listAccessibleCustomers } = await import('./google-ads');
  // That helper returns [] on any error; check the login first so an expired one says so.
  const { client, refreshToken } = await getAdsClient();
  await client.listAccessibleCustomers(refreshToken);
  const accessible = (await listAccessibleCustomers()) as Array<{ customerId: string; descriptiveName: string; currencyCode?: string; timeZone?: string }>;
  const now = new Date().toISOString();
  const withCampaigns = await Promise.all(
    accessible.map(async (a) => ({ ...a, campaigns: await campaignNames(a.customerId).catch(() => [] as string[]) }))
  );
  await setDocs(
    'google_ads_accounts',
    withCampaigns.map((a) => ({
      id: a.customerId,
      data: {
        googleConnectionId: 'master_admin_connection',
        customerId: a.customerId,
        descriptiveName: a.descriptiveName,
        currencyCode: a.currencyCode,
        timeZone: a.timeZone,
        campaignNames: a.campaigns,
        campaignsCheckedAt: now,
        updatedAt: now,
      },
    })),
    { merge: true }
  );

  const clients = await listDocs<{ brandName: string; linkedGoogleAdsIds?: string[] }>('clients');
  const owner = new Map<string, { id: string; name: string }>();
  for (const c of clients) for (const id of c.linkedGoogleAdsIds || []) owner.set(id, { id: c.id, name: c.brandName });
  return withCampaigns
    .map((a) => ({
      customerId: a.customerId,
      name: a.descriptiveName,
      currency: a.currencyCode || 'CAD',
      campaigns: a.campaigns,
      selected: owner.get(a.customerId)?.id === clientId,
      takenBy: owner.get(a.customerId) && owner.get(a.customerId)!.id !== clientId ? owner.get(a.customerId)!.name : undefined,
    }))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
}

/** Links exactly `customerIds` to the client (accounts owned by another client are skipped). */
export async function saveClientAdsSelection(clientId: string, customerIds: string[]) {
  const clients = await listDocs<{ brandName: string; ownerName?: string; linkedGoogleAdsIds?: string[] }>('clients');
  const me = clients.find((c) => c.id === clientId);
  if (!me) throw new Error('Client not found.');
  const takenByOthers = new Set(clients.filter((c) => c.id !== clientId).flatMap((c) => c.linkedGoogleAdsIds || []));
  const chosen = [...new Set(customerIds)].filter((id) => !takenByOthers.has(id));
  const dropped = (me.linkedGoogleAdsIds || []).filter((id) => !chosen.includes(id));
  const now = new Date().toISOString();
  await updateDoc('clients', clientId, { linkedGoogleAdsIds: chosen, updatedAt: now });
  // Keep the account labels used by the Ads pages in step.
  await setDocs('google_ads_accounts', chosen.map((id) => ({ id, data: { brandName: me.brandName, ownerName: me.ownerName ?? null, updatedAt: now } })), { merge: true });
  await setDocs('google_ads_accounts', dropped.map((id) => ({ id, data: { brandName: null, ownerName: null, updatedAt: now } })), { merge: true });
  return chosen.length;
}

/** Linked accounts with their saved campaign names, for the client page. */
export async function clientAdsCard(clientId: string) {
  const ids = (await getDoc<{ linkedGoogleAdsIds?: string[] }>('clients', clientId))?.linkedGoogleAdsIds || [];
  const accounts = ids.length
    ? await listDocs<{ customerId: string; descriptiveName?: string; currencyCode?: string; campaignNames?: string[] }>('google_ads_accounts', { where: { id: ids } })
    : [];
  const connected = Boolean(await getDoc('google_connections', 'master_admin_connection'));
  return {
    connected,
    accounts: ids.map((id) => {
      const a = accounts.find((x) => x.id === id);
      return { customerId: id, name: a?.descriptiveName || `Account ${id}`, currency: a?.currencyCode || 'CAD', campaigns: a?.campaignNames || [] };
    }),
  };
}

// ---------- Keywords ----------

export interface AdsKeyword {
  text: string;
  impressions: number;
  clicks: number;
}

/**
 * Top keywords by clicks for one account. Campaigns without keywords (Performance
 * Max, Display) have none, so it falls back to the search terms people typed.
 */
async function topKeywords(customerId: string, start: string, end: string) {
  const { client, refreshToken } = await getAdsClient();
  const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });
  type Row = { ad_group_criterion?: { keyword?: { text?: string } }; search_term_view?: { search_term?: string }; metrics?: { impressions?: number; clicks?: number } };
  const run = async (query: string, text: (r: Row) => string | undefined) => {
    const rows = (await customer.query(query)) as Row[];
    const byText = new Map<string, AdsKeyword>();
    for (const r of rows) {
      const t = text(r)?.trim().toLowerCase();
      if (!t) continue;
      const k = byText.get(t) || { text: t, impressions: 0, clicks: 0 };
      k.impressions += r.metrics?.impressions || 0;
      k.clicks += r.metrics?.clicks || 0;
      byText.set(t, k);
    }
    return [...byText.values()];
  };
  const keywords = await run(
    `SELECT ad_group_criterion.keyword.text, metrics.impressions, metrics.clicks FROM keyword_view
     WHERE segments.date BETWEEN '${start}' AND '${end}' AND metrics.impressions > 0 ORDER BY metrics.clicks DESC LIMIT 200`,
    (r) => r.ad_group_criterion?.keyword?.text
  );
  if (keywords.length) return { source: 'keywords' as const, items: keywords };
  const terms = await run(
    `SELECT search_term_view.search_term, metrics.impressions, metrics.clicks FROM search_term_view
     WHERE segments.date BETWEEN '${start}' AND '${end}' AND metrics.clicks > 0 ORDER BY metrics.clicks DESC LIMIT 200`,
    (r) => r.search_term_view?.search_term
  );
  return { source: 'search_terms' as const, items: terms };
}

/** Top 10 keywords (or search terms) across a client's ad accounts. */
export async function fetchClientKeywords(clientId: string, start: string, end: string) {
  const accounts = await clientAdsAccounts(clientId);
  const merged = new Map<string, AdsKeyword>();
  let source: 'keywords' | 'search_terms' = 'keywords';
  for (const a of accounts) {
    const r = await topKeywords(a.customerId, start, end).catch(() => ({ source: 'keywords' as const, items: [] as AdsKeyword[] }));
    if (r.source === 'search_terms' && r.items.length) source = 'search_terms';
    for (const k of r.items) {
      const m = merged.get(k.text) || { text: k.text, impressions: 0, clicks: 0 };
      m.impressions += k.impressions;
      m.clicks += k.clicks;
      merged.set(k.text, m);
    }
  }
  const items = [...merged.values()].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 10);
  return { source, items };
}

export { MIN_CONVERSIONS_TO_SHOW, conversionsMeaningful } from './ads-thresholds';
