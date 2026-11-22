import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { getDoc } from '@/lib/data/store';
import { connectGbpFromApp, connectGoogleAdsFromApp } from '@/lib/google-native';
import { AGENCY_CONNECT_ID } from '@/lib/google-business';
import { completeMetaConnectionFromApp, metaConfigured } from '@/lib/meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Sign-ins done natively in the Anwarz app (the Facebook app, the phone's Google account picker)
 * instead of the browser:
 *   { provider: 'meta', clientId, accessToken }                     → Facebook & Instagram
 *   { provider: 'google', kind: 'google_ads', serverAuthCode }        → Google Ads (agency-wide)
 *   { provider: 'google', kind: 'gbp', clientId?, serverAuthCode }   → Google Business (a client, or the agency)
 * Afterwards the app shows the pickers (/api/app/clients/[id]/social).
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ provider?: unknown; kind?: unknown; clientId?: unknown; accessToken?: unknown; serverAuthCode?: unknown }>(request);
  const clientId = typeof body.clientId === 'string' && body.clientId ? body.clientId : null;
  if (clientId && !(await getDoc('clients', clientId))) throw new AppError('That client doesn’t exist.', 404);

  try {
    if (body.provider === 'meta') {
      if (!metaConfigured()) throw new AppError('Facebook isn’t set up on the server (META_APP_ID / META_APP_SECRET).', 503);
      if (typeof body.accessToken !== 'string' || body.accessToken.length < 20) throw new AppError('The Facebook login didn’t come through. Try again.');
      // No client: your own login from the app's Social screen.
      const { pages } = await completeMetaConnectionFromApp(body.accessToken, clientId ?? '');
      return {
        ok: true,
        message: `Facebook connected: ${pages} Page${pages === 1 ? '' : 's'} found. ${clientId ? 'Pick this client’s below.' : 'Choose a client for each one.'}`,
      };
    }
    if (body.provider === 'google') {
      if (typeof body.serverAuthCode !== 'string' || body.serverAuthCode.length < 10) throw new AppError('The Google sign-in didn’t come through. Try again.');
      if (body.kind === 'google_ads') {
        await connectGoogleAdsFromApp(body.serverAuthCode);
        return { ok: true, message: 'Google Ads connected. Pick this client’s ad accounts below.' };
      }
      if (body.kind === 'gbp') {
        await connectGbpFromApp(body.serverAuthCode, clientId || AGENCY_CONNECT_ID);
        return { ok: true, message: 'Google Business connected. Pick the locations below.' };
      }
    }
    throw new AppError('Unknown sign-in.');
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Native connect failed:', error);
    throw new AppError(error instanceof Error ? error.message.slice(0, 300) : 'The sign-in failed. Try again.', 502);
  }
});
