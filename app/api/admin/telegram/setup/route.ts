import { isAdminAuthenticated } from '@/lib/admin-auth';
import { telegram } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Points the Telegram bot at this site's webhook. Admin session required.
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || secret.length < 32) {
    return Response.json({ error: 'TELEGRAM_WEBHOOK_SECRET must be set (32+ characters).' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  try {
    await telegram('setWebhook', {
      url: `${origin}/api/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    });
    await telegram('setMyCommands', {
      commands: [
        { command: 'menu', description: 'Open the main menu (or just type x)' },
        { command: 'reviews', description: 'Show reviews waiting for approval' },
        { command: 'check', description: 'Check Google for new reviews now' },
        { command: 'comments', description: 'Show Facebook & Instagram comments waiting' },
      ],
    });
    const info = await telegram<{ url: string; pending_update_count: number; last_error_message?: string }>('getWebhookInfo', {});
    return Response.json({ success: true, webhook: info.url, lastError: info.last_error_message || null });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Telegram setup failed' }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const info = await telegram<{ url: string; pending_update_count: number; last_error_message?: string }>('getWebhookInfo', {});
    return Response.json({ connected: Boolean(info.url), webhook: info.url, lastError: info.last_error_message || null });
  } catch (error) {
    return Response.json({ connected: false, error: error instanceof Error ? error.message : 'Not configured' });
  }
}
