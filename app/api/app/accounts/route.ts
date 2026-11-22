import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { assignAccountLink, LINK_KINDS, loadAccountLinks, type LinkKind } from '@/lib/account-links';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// The Anwarz app's Google & Ads screen (same data as Admin → Google & Ads): Google Business
// locations, Google Ads and Facebook ad accounts, GA4 properties and Search Console sites, and the
// client each belongs to. ?refresh=1 re-reads the ad account lists.

export const GET = appRoute(async (request) => loadAccountLinks({ refresh: new URL(request.url).searchParams.get('refresh') === '1' }));

/** { kind, id, clientId | null }: links one to a client, moves it, or unlinks it. */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ kind?: unknown; id?: unknown; clientId?: unknown }>(request);
  const kind = LINK_KINDS.find((k) => k === body.kind) as LinkKind | undefined;
  if (!kind) throw new AppError('Unknown account type.');
  if (typeof body.id !== 'string' || !body.id || body.id.length > 300) throw new AppError('Which one?');
  const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
  try {
    await assignAccountLink(kind, body.id, clientId);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message.slice(0, 300) : 'Couldn’t save.');
  }
  return loadAccountLinks();
});
