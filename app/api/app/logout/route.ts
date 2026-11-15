import { appRoute, revokeDevice } from '@/lib/app-auth';

export const dynamic = 'force-dynamic';

/** Signs this phone out: its token stops working and it gets no more push notifications. */
export const POST = appRoute(async (_request, device) => {
  await revokeDevice(device.id);
  return { ok: true };
});
