import { AppError, appRoute, jsonBody, setDevicePush } from '@/lib/app-auth';
import { pushConfigured, sendPush } from '@/lib/push';

export const dynamic = 'force-dynamic';

/** This phone's sign-in and whether push is set up. */
export const GET = appRoute(async (_request, device) => ({
  id: device.id,
  name: device.name,
  platform: device.platform,
  appVersion: device.app_version,
  hasPushToken: Boolean(device.push_token),
  pushConfigured: pushConfigured(),
  createdAt: device.created_at,
}));

/**
 * Saves the phone's Firebase push token (sent on every app start, since it can change).
 * Body: { pushToken: string | null, appVersion? }   or   { test: true } to send a test push.
 */
export const POST = appRoute(async (request, device) => {
  const body = await jsonBody<{ pushToken?: unknown; appVersion?: unknown; test?: unknown }>(request);
  if (body.test === true) {
    const sent = await sendPush({ title: '✅ Anwarz', body: 'Push notifications from the website work on this phone.', channel: 'attention', data: { type: 'test' } });
    return { ok: sent > 0, sent };
  }
  if (body.pushToken !== null && (typeof body.pushToken !== 'string' || body.pushToken.length < 20 || body.pushToken.length > 4096)) {
    throw new AppError('pushToken must be the FCM device token (or null).');
  }
  await setDevicePush(device.id, body.pushToken, typeof body.appVersion === 'string' ? body.appVersion : null);
  return { ok: true };
});
