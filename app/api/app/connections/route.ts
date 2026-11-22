import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { createAppConnectToken, listConnections, type ConnectKind } from '@/lib/app-connect';
import { getSetting } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

const KINDS: ConnectKind[] = ['gmail', 'outlook', 'google_ads', 'gbp', 'meta'];

/** Every account the automation depends on, with its status, and when the 5-minute job last ran. */
export const GET = appRoute(async () => {
  const [connections, heartbeat] = await Promise.all([listConnections(), getSetting<{ at?: string }>('automation_heartbeat').catch(() => null)]);
  return { connections, automation: { lastRunAt: heartbeat?.at || null } };
});

/** { kind, clientId? }: a 15-minute link that starts that sign-in in the phone's browser. */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ kind?: unknown; clientId?: unknown }>(request);
  const kind = KINDS.find((k) => k === body.kind);
  if (!kind) throw new AppError('Unknown connection.');
  const clientId = typeof body.clientId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(body.clientId) ? body.clientId : null;
  // Without a client, Facebook is your own login and Google Business the agency's account.
  const token = await createAppConnectToken(kind, clientId);
  const origin = new URL(request.url).origin;
  return { url: `${origin}/api/app/connect/start?t=${encodeURIComponent(token)}` };
});
