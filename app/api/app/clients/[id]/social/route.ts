import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { getDoc, listDocs, setDocs, updateDoc } from '@/lib/data/store';
import { previewClientLocations, saveClientLocationSelection } from '@/lib/google-business';
import { getMetaConnections, previewClientAccounts, saveClientAccountSelection } from '@/lib/meta';
import { previewClientMetaAdAccounts, saveClientMetaAdSelection } from '@/lib/meta-ads';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// A client's connections in the Anwarz app: which Facebook Pages / Instagram accounts, Meta ad
// accounts, Google Ads accounts and Google Business locations belong to them. The same rules as
// the admin panel: something linked to another client can't be picked here.

type Ctx = { params: Promise<{ id: string }> };

interface Choice {
  id: string;
  name: string;
  detail: string | null;
  selected: boolean;
  takenBy: string | null; // the other client's name
}

interface Section {
  connected: boolean;
  choices: Choice[];
  error: string | null;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error)).slice(0, 300);

async function googleAdsAccounts(clientId: string, refresh: boolean): Promise<Choice[]> {
  type Account = { customerId: string; descriptiveName?: string; currencyCode?: string };
  let accounts = await listDocs<Account>('google_ads_accounts');
  // Re-read the list from Google when asked (or the first time), as Settings → Sync does.
  if (refresh || !accounts.length) {
    const { listAccessibleCustomers } = await import('@/lib/google-ads');
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
  }
  const clients = await listDocs<{ brandName?: string; linkedGoogleAdsIds?: string[] }>('clients');
  const owner = (id: string) => clients.find((c) => c.linkedGoogleAdsIds?.includes(id));
  return accounts
    .map((a) => {
      const id = a.customerId || a.id;
      const who = owner(id);
      return {
        id,
        name: a.descriptiveName || `Account ${id}`,
        detail: [id.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'), a.currencyCode].filter(Boolean).join(' · '),
        selected: who?.id === clientId,
        takenBy: who && who.id !== clientId ? who.brandName || 'another client' : null,
      };
    })
    .sort((a, b) => Number(b.selected) - Number(a.selected) || a.name.localeCompare(b.name));
}

async function load(clientId: string, refresh: boolean) {
  const names = await clientNames();
  const taken = (id: string | null | undefined) => (id ? names.get(id) || 'another client' : null);
  const section = async (connected: Promise<boolean>, choices: () => Promise<Choice[]>): Promise<Section> => {
    const isConnected = await connected.catch(() => false);
    if (!isConnected) return { connected: false, choices: [], error: null };
    try {
      return { connected: true, choices: await choices(), error: null };
    } catch (error) {
      return { connected: true, choices: [], error: message(error) };
    }
  };
  const metaConnected = getMetaConnections().then((c) => c.length > 0);
  const [pages, metaAds, googleAds, gbp] = await Promise.all([
    section(metaConnected, async () =>
      (await previewClientAccounts(clientId)).map((a) => ({
        id: a.id,
        name: a.pageName,
        detail: a.igUsername ? `Instagram @${a.igUsername}` : 'Facebook Page',
        selected: a.selected,
        takenBy: taken(a.takenByClientId),
      }))
    ),
    section(metaConnected, async () =>
      (await previewClientMetaAdAccounts(clientId)).map((a) => ({
        id: a.id,
        name: a.name,
        detail: [a.currency, a.active ? null : 'not active'].filter(Boolean).join(' · '),
        selected: a.selected,
        takenBy: taken(a.takenBy),
      }))
    ),
    section(getDoc('google_connections', 'master_admin_connection').then(Boolean), () => googleAdsAccounts(clientId, refresh)),
    // Google Business works with the client's own login or the agency's; the picker says which is missing.
    section(Promise.resolve(true), async () =>
      (await previewClientLocations(clientId)).map((l) => ({
        id: l.locationId,
        name: l.title,
        detail: l.address || null,
        selected: l.selected,
        takenBy: taken(l.takenByClientId),
      }))
    ),
  ]);
  return { pages, metaAds, googleAds, gbp };
}

export const GET = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  if (!(await getDoc('clients', id))) throw new AppError('That client doesn’t exist.', 404);
  return load(id, new URL(request.url).searchParams.get('refresh') === '1');
});

/** { section: 'pages' | 'metaAds' | 'googleAds' | 'gbp', ids: [...] }: exactly these belong to the client. */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  const client = await getDoc<{ linkedGoogleAdsIds?: string[] }>('clients', id);
  if (!client) throw new AppError('That client doesn’t exist.', 404);
  const body = await jsonBody<{ section?: unknown; ids?: unknown }>(request);
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === 'string').slice(0, 100) : null;
  if (!ids) throw new AppError('Which ones?');
  try {
    switch (body.section) {
      case 'pages':
        await saveClientAccountSelection(id, ids);
        break;
      case 'metaAds':
        await saveClientMetaAdSelection(id, ids);
        break;
      case 'googleAds': {
        // Accounts linked to another client stay theirs.
        const others = (await listDocs<{ linkedGoogleAdsIds?: string[] }>('clients')).filter((c) => c.id !== id);
        const free = ids.filter((x) => !others.some((c) => c.linkedGoogleAdsIds?.includes(x)));
        await updateDoc('clients', id, { linkedGoogleAdsIds: free, updatedAt: new Date().toISOString() });
        break;
      }
      case 'gbp':
        await saveClientLocationSelection(id, ids);
        break;
      default:
        throw new AppError('Unknown section.');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(message(error), 502);
  }
  return load(id, false);
});
