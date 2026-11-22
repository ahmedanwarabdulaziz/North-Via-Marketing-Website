import { listClientProfiles } from './admin-ops';
import { getDoc, listDocs, setDocs, updateDoc } from './data/store';
import { getAgencyConnection, listLinkedLocations, previewAgencyLocations, saveAgencyLocationLinks } from './google-business';
import { analyticsConnected, describeGaError, listGa4Properties, setClientGa4Property } from './ga4';
import { assignMetaAdAccount, listMetaAdAccounts, metaAdsConnected, previewClientMetaAdAccounts } from './meta-ads';
import { describeSearchError, listSearchSites, searchConsoleReady, setClientSearchSite } from './search-console';
import type { ClientProfile } from '@/types/database';

// Google & Ads: every Google Business location, Google Ads account, Facebook ad account, GA4
// property and Search Console site the shared logins can reach, and the client each belongs to.
// Used by Admin → Google & Ads and the Anwarz app's Google & Ads screen.

export type LinkKind = 'gbp' | 'google_ads' | 'meta_ads' | 'ga4' | 'search_console';
export const LINK_KINDS: LinkKind[] = ['gbp', 'google_ads', 'meta_ads', 'ga4', 'search_console'];

export interface LinkItem {
  id: string;
  name: string;
  detail: string | null;
  clientId: string | null;
  /** Can't be changed here (e.g. reached only through a client's own Google login). */
  locked: string | null;
}

export interface LinkSection {
  kind: LinkKind;
  title: string;
  /** The shared login this list comes from is connected. */
  connected: boolean;
  /** Who / what is connected, when known. */
  account: string | null;
  /** A client can have only one (GA4, Search Console): linking another replaces it. */
  onePerClient: boolean;
  items: LinkItem[];
  error: string | null;
}

export interface AccountLinksData {
  sections: LinkSection[];
  clients: Array<{ id: string; name: string }>;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);
// The GA4 / Search Console messages send you to the client page; here the button is on this page.
const here = (message: string) => message.replace(/ ?(on|from) the client page \(Analytics tab\)/g, ' with the button above').replace('click “Reconnect Google Analytics” with the button above', 'reconnect with the button above');
const dashed = (id: string) => id.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');

type Client = ClientProfile & { id: string };

async function gbpSection(clients: Client[]): Promise<LinkSection> {
  const agency = await getAgencyConnection().catch(() => null);
  const base = { kind: 'gbp' as const, title: 'Google Business Profile', connected: Boolean(agency), account: agency?.accountEmail ?? null, onePerClient: false };
  const linked = await listLinkedLocations().catch(() => []);
  const names = new Map(clients.map((c) => [c.id, c.brandName]));
  // Locations monitored through a client's own login aren't in the agency's list; shown, not editable.
  const ownLogin = (ids: Set<string>): LinkItem[] =>
    linked
      .filter((l) => l.linked && !ids.has(l.id!))
      .map((l) => ({ id: l.id!, name: l.title, detail: l.address || null, clientId: l.clientId, locked: `Through ${names.get(l.clientId) ?? 'the client'}’s own Google login` }));
  if (!agency) return { ...base, items: ownLogin(new Set()), error: null };
  try {
    const found = await previewAgencyLocations();
    const items: LinkItem[] = found.map((l) => ({ id: l.locationId, name: l.title, detail: l.address || null, clientId: l.clientId, locked: null }));
    return { ...base, items: [...items, ...ownLogin(new Set(items.map((i) => i.id)))], error: null };
  } catch (error) {
    return { ...base, items: ownLogin(new Set()), error: errorText(error) };
  }
}

async function googleAdsSection(clients: Client[], refresh: boolean): Promise<LinkSection> {
  const connected = Boolean(await getDoc('google_connections', 'master_admin_connection').catch(() => null));
  const base = { kind: 'google_ads' as const, title: 'Google Ads', connected, account: null, onePerClient: false };
  if (!connected) return { ...base, items: [], error: null };
  let error: string | null = null;
  type Account = { id: string; customerId: string; descriptiveName?: string; currencyCode?: string };
  let accounts = await listDocs<Account>('google_ads_accounts');
  if (refresh || !accounts.length) {
    try {
      const { listAccessibleCustomers } = await import('./google-ads');
      const found = await listAccessibleCustomers();
      const now = new Date().toISOString();
      await setDocs(
        'google_ads_accounts',
        found.map((c) => ({
          id: c.customerId,
          data: { googleConnectionId: 'master_admin_connection', customerId: c.customerId, descriptiveName: c.descriptiveName, currencyCode: c.currencyCode, timeZone: c.timeZone, updatedAt: now },
        })),
        { merge: true }
      );
      accounts = await listDocs<Account>('google_ads_accounts');
    } catch (e) {
      error = errorText(e);
    }
  }
  const owner = (id: string) => clients.find((c) => c.linkedGoogleAdsIds?.includes(id))?.id ?? null;
  return {
    ...base,
    error,
    items: accounts.map((a) => {
      const id = a.customerId || a.id;
      return { id, name: a.descriptiveName || `Account ${dashed(id)}`, detail: [dashed(id), a.currencyCode].filter(Boolean).join(' · '), clientId: owner(id), locked: null };
    }),
  };
}

async function metaAdsSection(refresh: boolean): Promise<LinkSection> {
  const connected = await metaAdsConnected().catch(() => false);
  const base = { kind: 'meta_ads' as const, title: 'Facebook Ads', connected, account: null, onePerClient: false };
  if (!connected) return { ...base, items: [], error: null };
  let error: string | null = null;
  let stored = await listMetaAdAccounts();
  if (refresh || !stored.length) {
    try {
      await previewClientMetaAdAccounts(''); // re-reads every ad account from Facebook and saves the list
      stored = await listMetaAdAccounts();
    } catch (e) {
      error = errorText(e);
    }
  }
  return {
    ...base,
    error,
    items: stored.map((a) => ({ id: a.id, name: a.name, detail: [`act_${a.id}`, a.currency].join(' · '), clientId: a.clientId ?? null, locked: null })),
  };
}

async function ga4Section(clients: Client[]): Promise<LinkSection> {
  const connected = await analyticsConnected().catch(() => false);
  const base = { kind: 'ga4' as const, title: 'Google Analytics', connected, account: null, onePerClient: true };
  if (!connected) return { ...base, items: [], error: null };
  try {
    const props = await listGa4Properties();
    return {
      ...base,
      error: null,
      items: props.map((p) => ({ id: p.propertyId, name: p.name, detail: [p.account, `Property ${p.propertyId}`].filter(Boolean).join(' · '), clientId: clients.find((c) => c.ga4PropertyId === p.propertyId)?.id ?? null, locked: null })),
    };
  } catch (error) {
    return { ...base, items: [], error: here(describeGaError(error)) };
  }
}

async function searchSection(clients: Client[]): Promise<LinkSection> {
  const ready = await searchConsoleReady().catch(() => ({ connected: false, hasScope: false }));
  const base = { kind: 'search_console' as const, title: 'Search Console', connected: ready.connected, account: null, onePerClient: true };
  if (!ready.connected) return { ...base, items: [], error: null };
  if (!ready.hasScope) return { ...base, items: [], error: 'Search Console needs one more permission: reconnect Google Analytics with the button above.' };
  try {
    const sites = await listSearchSites();
    return {
      ...base,
      error: null,
      items: sites.map((s) => ({
        id: s.siteUrl,
        name: s.siteUrl.replace(/^sc-domain:/, '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
        detail: s.siteUrl.startsWith('sc-domain:') ? 'Domain property' : 'URL prefix',
        clientId: clients.find((c) => c.searchConsoleSite === s.siteUrl)?.id ?? null,
        locked: null,
      })),
    };
  } catch (error) {
    return { ...base, items: [], error: here(describeSearchError(error)) };
  }
}

/** `refresh` re-reads the Google Ads and Facebook ad account lists (the others are always live). */
export async function loadAccountLinks(options: { refresh?: boolean } = {}): Promise<AccountLinksData> {
  const clients = (await listClientProfiles()).filter((c): c is Client => Boolean(c.id));
  const sections = await Promise.all([
    gbpSection(clients),
    googleAdsSection(clients, Boolean(options.refresh)),
    metaAdsSection(Boolean(options.refresh)),
    ga4Section(clients),
    searchSection(clients),
  ]);
  for (const s of sections) s.items.sort((a, b) => a.name.localeCompare(b.name));
  return { sections, clients: clients.map((c) => ({ id: c.id, name: c.brandName })).sort((a, b) => a.name.localeCompare(b.name)) };
}

/** Puts one account on a client, moves it from another client, or (null) unlinks it. */
export async function assignAccountLink(kind: LinkKind, id: string, clientId: string | null) {
  if (clientId && !(await getDoc('clients', clientId))) throw new Error('That client doesn’t exist.');
  const now = new Date().toISOString();
  const clients = (await listClientProfiles()).filter((c): c is Client => Boolean(c.id));

  switch (kind) {
    case 'gbp':
      await saveAgencyLocationLinks({ [id]: clientId });
      return;
    case 'google_ads': {
      for (const c of clients) {
        const ids = c.linkedGoogleAdsIds ?? [];
        const want = c.id === clientId;
        if (ids.includes(id) && !want) await updateDoc('clients', c.id, { linkedGoogleAdsIds: ids.filter((x) => x !== id), updatedAt: now });
        if (!ids.includes(id) && want) await updateDoc('clients', c.id, { linkedGoogleAdsIds: [...ids, id], updatedAt: now });
      }
      const owner = clients.find((c) => c.id === clientId);
      await updateDoc('google_ads_accounts', id, { brandName: owner?.brandName ?? null, ownerName: owner?.ownerName ?? null, updatedAt: now }).catch(() => undefined);
      return;
    }
    case 'meta_ads':
      await assignMetaAdAccount(id, clientId);
      return;
    case 'ga4':
      if (!/^\d{5,15}$/.test(id)) throw new Error('That is not a GA4 property ID.');
      for (const c of clients) if (c.ga4PropertyId === id && c.id !== clientId) await setClientGa4Property(c.id, null);
      if (clientId) await setClientGa4Property(clientId, id);
      return;
    case 'search_console':
      for (const c of clients) if (c.searchConsoleSite === id && c.id !== clientId) await setClientSearchSite(c.id, null);
      if (clientId) await setClientSearchSite(clientId, id);
      return;
  }
}
