import crypto from 'crypto';
import { handleCallback, handleReviewMessage } from '@/lib/review-telegram';
import { handleMenuCallback, sendMenu } from '@/lib/telegram-menu';
import { isAllowedChat, sendMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function validSecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const received = request.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!expected || expected.length < 32) return false;
  const a = crypto.createHash('sha256').update(received).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Telegram delivers bot updates here. The secret header proves the request is from
 * Telegram; only chats in TELEGRAM_ALLOWED_CHAT_IDS can see reviews or press buttons.
 */
export async function POST(request: Request) {
  if (!validSecret(request)) return new Response('Forbidden', { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update = (await request.json().catch(() => null)) as any;
  if (!update) return Response.json({ ok: true });

  try {
    if (update.callback_query) {
      const chatId = update.callback_query.message?.chat?.id;
      if (isAllowedChat(chatId)) {
        if (String(update.callback_query.data || '').startsWith('m:')) await handleMenuCallback(update.callback_query);
        else await handleCallback(update.callback_query);
      }
    } else if (update.message?.chat) {
      const chatId = update.message.chat.id;
      if (isAllowedChat(chatId)) {
        // Review commands and edit replies first; anything else (x, menu, /start…) opens the menu.
        const handled = await handleReviewMessage(update.message);
        if (!handled) await sendMenu(chatId);
      } else if (update.message.chat.type === 'private') {
        // Lets the owner discover their chat id during setup; reveals nothing else.
        await sendMessage(chatId, { text: `This bot is private.\nYour chat ID is <code>${chatId}</code>.` });
      }
    }
  } catch (error) {
    console.error('Telegram webhook error:', error);
  }
  // Always 200 so Telegram doesn't redeliver (which could repeat an action).
  return Response.json({ ok: true });
}
