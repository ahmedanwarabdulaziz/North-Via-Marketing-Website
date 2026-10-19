import crypto from 'crypto';
import { handleCallback, handleReviewMessage } from '@/lib/review-telegram';
import { handleMenuCallback, handleMenuCommand, sendMenu } from '@/lib/telegram-menu';
import { handleSocialCallback, handleSocialMessage } from '@/lib/social-telegram';
import { handleTaskCallback, handleTaskMessage } from '@/lib/task-telegram';
import { handleKnowledgeCallback, handleKnowledgeMessage } from '@/lib/knowledge-telegram';
import { handleChatCallback } from '@/lib/assistant-telegram';
import { handleGbpPostCallback, handleGbpPostMessage } from '@/lib/gbp-post-telegram';
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
        const data = String(update.callback_query.data || '');
        if (data.startsWith('m:')) await handleMenuCallback(update.callback_query);
        else if (data.startsWith('sc:')) await handleSocialCallback(update.callback_query);
        else if (data.startsWith('tk:')) await handleTaskCallback(update.callback_query);
        else if (data.startsWith('kb:')) await handleKnowledgeCallback(update.callback_query);
        else if (data.startsWith('ch:')) await handleChatCallback(update.callback_query);
        else if (data.startsWith('gp:')) await handleGbpPostCallback(update.callback_query);
        else await handleCallback(update.callback_query);
      }
    } else if (update.message?.chat) {
      const chatId = update.message.chat.id;
      if (isAllowedChat(chatId)) {
        // Comment and review commands and edit replies first, then the Menu-button section
        // commands (/tasks, /ads…), then tasks (any other message is read
        // by the AI as a task); menu words (x, menu, /start…) and unknown commands open the menu.
        // Comments go first: their edit marker "cref:" also contains the reviews' "ref:".
        // A Google post being set up takes the photo, voice note or text before the library and tasks.
        const handled =
          (await handleGbpPostMessage(update.message)) ||
          (await handleSocialMessage(update.message)) ||
          (await handleReviewMessage(update.message)) ||
          (await handleMenuCommand(update.message)) ||
          (await handleKnowledgeMessage(update.message)) ||
          (await handleTaskMessage(update.message));
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
