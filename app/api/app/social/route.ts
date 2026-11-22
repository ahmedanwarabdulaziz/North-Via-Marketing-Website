import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { getDoc } from '@/lib/data/store';
import { assignSocialAccount } from '@/lib/meta';
import { loadSocialConnections } from '@/lib/social-connections';

export const dynamic = 'force-dynamic';

// The Anwarz app's Social screen (same data as Admin → Facebook & Instagram): your Facebook login,
// every Page / Instagram account, and which client each belongs to.

export const GET = appRoute(async () => loadSocialConnections());

/** { accountId, clientId | null }: puts a Page on a client, moves it, or takes it off. */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ accountId?: unknown; clientId?: unknown }>(request);
  if (typeof body.accountId !== 'string' || !/^\d{1,40}$/.test(body.accountId)) throw new AppError('Which Page?');
  const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
  if (clientId && !(await getDoc('clients', clientId))) throw new AppError('That client doesn’t exist.', 404);
  try {
    await assignSocialAccount(body.accountId, clientId);
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'Couldn’t save.');
  }
  return loadSocialConnections();
});
