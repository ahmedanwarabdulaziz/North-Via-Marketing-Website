import { getDoc, listDocs } from './data/store';
import { getAdsClient } from './google-ads';

// Google Ads numbers for reports and Telegram, per client (summed over the ad
// accounts linked to that client in Admin → Settings → Google Ads).

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
  if (/invalid_grant/i.test(message)) return 'Google Ads access expired. Reconnect it in Admin → Settings → Google Ads.';
  if (/No Google connection|refresh token/i.test(message)) return 'Google Ads is not connected. Connect it in Admin → Settings → Google Ads.';
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
