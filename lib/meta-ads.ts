import { getSetting, setSetting } from './data/store';
import { decryptString } from './encryption';
import { MetaApiError, getMetaConnections, graph } from './meta';

// Facebook & Instagram ads through Meta's Marketing API (ads_read), per client.
// Ad accounts come from the same Facebook login as the Pages; which client each
// one belongs to is kept in one settings document, so no table is needed.

const SETTING = 'meta_ad_accounts';

interface StoredAccount {
  name: string;
  currency: string;
  connectionId: string;
  clientId?: string;
}

type AccountMap = Record<string, StoredAccount>; // keyed by the numeric ad account id

export interface MetaAdsTotals {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
}

export interface MetaAd extends MetaAdsTotals {
  id: string;
  name: string;
  status: string;
}

const empty = (): MetaAdsTotals => ({ spend: 0, reach: 0, impressions: 0, clicks: 0, linkClicks: 0 });

async function storedAccounts() {
  return (await getSetting<{ accounts?: AccountMap }>(SETTING))?.accounts || {};
}

/** Facebook logins that allowed ad access, the admin's first. */
async function adsConnections() {
  const all = await getMetaConnections();
  return all
    .filter((c) => c.status === 'connected' && c.scopes?.includes('ads_read'))
    .sort((a, b) => Number(b.id === 'admin') - Number(a.id === 'admin'));
}

async function tokenFor(connectionId: string) {
  const connection = (await getMetaConnections()).find((c) => c.id === connectionId);
  if (!connection) throw new Error('The Facebook login for this ad account was removed. Reconnect Facebook and choose the ad account again.');
  return decryptString(connection.encryptedUserToken);
}

/** Readable reason for a Marketing API failure. */
export function describeMetaAdsError(error: unknown) {
  if (error instanceof MetaApiError && error.needsReconnect) return 'Facebook access expired. Reconnect Facebook on the client’s Social tab.';
  const message = error instanceof Error ? error.message : String(error);
  if (/ads_read|ads_management|permission/i.test(message)) return 'Facebook didn’t allow ad access. Reconnect Facebook and allow the ad account.';
  return message.slice(0, 200);
}

/** True when any Facebook login allowed ad access. */
export async function metaAdsConnected() {
  return (await adsConnections()).length > 0;
}

/** Ad accounts linked to a client. */
export async function clientMetaAdAccounts(clientId: string) {
  const accounts = await storedAccounts();
  return Object.entries(accounts)
    .filter(([, a]) => a.clientId === clientId)
    .map(([id, a]) => ({ id, name: a.name, currency: a.currency, connectionId: a.connectionId }));
}

/** Client ids with at least one linked ad account. */
export async function clientIdsWithMetaAds() {
  const accounts = await storedAccounts();
  return [...new Set(Object.values(accounts).map((a) => a.clientId).filter((id): id is string => Boolean(id)))];
}

// ---------- Choosing a client's ad accounts ----------

export interface MetaAdAccountChoice {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  selected: boolean;
  takenBy?: string; // another client's id
}

/** Re-reads every ad account the Facebook logins can access and marks which client each belongs to. */
export async function previewClientMetaAdAccounts(clientId: string): Promise<MetaAdAccountChoice[]> {
  const connections = await adsConnections();
  if (!connections.length) throw new Error('Facebook isn’t connected with ad access yet. Reconnect Facebook on the Social tab and allow the ad account.');
  const stored = await storedAccounts();
  const found = new Map<string, StoredAccount & { active: boolean }>();
  for (const c of connections) {
    const token = decryptString(c.encryptedUserToken);
    const res = await graph<{ data?: Array<{ account_id: string; name?: string; currency?: string; account_status?: number }> }>('me/adaccounts', {
      token,
      params: { fields: 'account_id,name,currency,account_status', limit: 100 },
    });
    for (const a of res.data || []) {
      if (found.has(a.account_id)) continue;
      found.set(a.account_id, {
        name: a.name || `Ad account ${a.account_id}`,
        currency: a.currency || 'CAD',
        connectionId: c.id!,
        clientId: stored[a.account_id]?.clientId,
        active: a.account_status === 1,
      });
    }
  }
  // Remember names and logins; links to clients are kept.
  const next: AccountMap = { ...stored };
  for (const [id, a] of found) next[id] = { name: a.name, currency: a.currency, connectionId: a.connectionId, clientId: a.clientId };
  await setSetting(SETTING, { accounts: next });

  return [...found.entries()]
    .map(([id, a]) => ({
      id,
      name: a.name,
      currency: a.currency,
      active: a.active,
      selected: a.clientId === clientId,
      takenBy: a.clientId && a.clientId !== clientId ? a.clientId : undefined,
    }))
    .sort((a, b) => Number(b.selected) - Number(a.selected) || Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}

/** Links exactly `ids` to the client (accounts linked to another client are skipped). */
export async function saveClientMetaAdSelection(clientId: string, ids: string[]) {
  const stored = await storedAccounts();
  const wanted = new Set(ids);
  let linked = 0;
  for (const [id, a] of Object.entries(stored)) {
    if (wanted.has(id) && (!a.clientId || a.clientId === clientId)) {
      a.clientId = clientId;
      linked++;
    } else if (!wanted.has(id) && a.clientId === clientId) delete a.clientId;
  }
  await setSetting(SETTING, { accounts: stored });
  return linked;
}

// ---------- Numbers ----------

type InsightRow = { ad_id?: string; ad_name?: string; spend?: string; reach?: string; impressions?: string; clicks?: string; inline_link_clicks?: string };

const num = (v?: string) => Number(v || 0) || 0;

/**
 * Per-ad numbers for one ad account between two dates (YYYY-MM-DD, inclusive, in the
 * ad account's own time zone, as Meta reports them). Only ads that ran are returned.
 */
async function fetchAccountAds(accountId: string, connectionId: string, start: string, end: string) {
  const token = await tokenFor(connectionId);
  const [insights, ads] = await Promise.all([
    graph<{ data?: InsightRow[] }>(`act_${accountId}/insights`, {
      token,
      params: {
        level: 'ad',
        fields: 'ad_id,ad_name,spend,reach,impressions,clicks,inline_link_clicks',
        time_range: JSON.stringify({ since: start, until: end }),
        limit: 200,
      },
    }),
    graph<{ data?: Array<{ id: string; effective_status?: string }> }>(`act_${accountId}/ads`, {
      token,
      params: { fields: 'effective_status', limit: 200 },
    }).catch(() => ({ data: [] as Array<{ id: string; effective_status?: string }> })),
  ]);
  const status = new Map((ads.data || []).map((a) => [a.id, a.effective_status || '']));
  return (insights.data || []).map((r) => ({
    id: r.ad_id || '',
    name: r.ad_name || 'Ad',
    status: status.get(r.ad_id || '') || '',
    spend: num(r.spend),
    reach: num(r.reach),
    impressions: num(r.impressions),
    clicks: num(r.clicks),
    linkClicks: num(r.inline_link_clicks),
  }));
}

/**
 * A client's ads and totals for a period. Reach is summed across ads, so a person who
 * saw two ads counts twice; close enough for an overview.
 */
export async function fetchClientMetaAds(clientId: string, start: string, end: string) {
  const accounts = await clientMetaAdAccounts(clientId);
  if (!accounts.length) return null;
  const ads: MetaAd[] = [];
  for (const a of accounts) ads.push(...(await fetchAccountAds(a.id, a.connectionId, start, end)));
  const totals = empty();
  for (const ad of ads) {
    totals.spend += ad.spend;
    totals.reach += ad.reach;
    totals.impressions += ad.impressions;
    totals.clicks += ad.clicks;
    totals.linkClicks += ad.linkClicks;
  }
  return { accounts, currency: accounts[0].currency, totals, ads: ads.sort((a, b) => b.clicks - a.clicks || b.spend - a.spend) };
}

/** "ACTIVE" → "Active", "CAMPAIGN_PAUSED" → "Campaign paused". */
export const adStatusLabel = (status: string) => (status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ') : '');
