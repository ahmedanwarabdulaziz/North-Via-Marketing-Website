import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { getAlertChannels, setAlertChannels } from '@/lib/alert-channels';

export const dynamic = 'force-dynamic';

/** Where alerts go: Telegram (on / paused until … / off) and ntfy rings (on / off). The app is always on. */
export const GET = appRoute(async () => ({ channels: await getAlertChannels() }));

/** { telegram?: 'on' | 'pause_day' | 'off', ntfy?: 'on' | 'off' } */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ telegram?: unknown; ntfy?: unknown }>(request);
  const telegram = body.telegram === 'on' || body.telegram === 'off' || body.telegram === 'pause_day' ? body.telegram : undefined;
  const ntfy = body.ntfy === 'on' || body.ntfy === 'off' ? body.ntfy : undefined;
  if (!telegram && !ntfy) throw new AppError('Nothing to change.');
  return { channels: await setAlertChannels({ telegram, ntfy }) };
});
