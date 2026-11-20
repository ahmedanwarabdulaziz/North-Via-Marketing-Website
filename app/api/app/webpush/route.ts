import { appRoute } from '@/lib/app-auth';
import { vapidKeys } from '@/lib/web-push';

export const dynamic = 'force-dynamic';

/** The public key a PC needs to subscribe to Windows notifications (the PC version of Anwarz). */
export const GET = appRoute(async () => ({ publicKey: (await vapidKeys()).publicKey }));
