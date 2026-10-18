// Minimal Telegram Bot API client for the reviews bot.

export interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface OutgoingMessage {
  text: string; // Telegram HTML
  buttons?: InlineButton[][];
  forceReply?: boolean;
  placeholder?: string; // hint shown in the reply box with forceReply
}

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Chats allowed to receive digests and press buttons, from TELEGRAM_ALLOWED_CHAT_IDS (comma-separated). */
export function allowedChatIds() {
  return (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAllowedChat(chatId: number | string | undefined) {
  return chatId !== undefined && allowedChatIds().includes(String(chatId));
}

export async function telegram<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured.');

  // TELEGRAM_API_BASE is only for pointing tests at a mock server.
  const base = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
  const res = await fetch(`${base}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${data.description || res.status}`);
  return data.result as T;
}

/** Downloads a file the user sent (voice note, photo…) by its file_id. Telegram serves up to 20 MB. */
export async function downloadFile(fileId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const file = await telegram<{ file_path?: string; file_size?: number }>('getFile', { file_id: fileId });
  if (!file.file_path) throw new Error('Telegram returned no file path.');
  const base = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';
  const res = await fetch(`${base}/file/bot${token}/${file.file_path}`);
  if (!res.ok) throw new Error(`Telegram file download failed: ${res.status}`);
  return { data: Buffer.from(await res.arrayBuffer()), path: file.file_path };
}

function markup(message: OutgoingMessage) {
  if (message.forceReply) return { force_reply: true, input_field_placeholder: message.placeholder || 'Type the new reply…' };
  if (message.buttons?.length) return { inline_keyboard: message.buttons };
  return undefined;
}

export async function sendMessage(chatId: number | string, message: OutgoingMessage) {
  return telegram('sendMessage', {
    chat_id: chatId,
    text: message.text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: markup(message),
  });
}

export async function editMessage(chatId: number | string, messageId: number, message: OutgoingMessage) {
  try {
    await telegram('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text: message.text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      reply_markup: message.buttons?.length ? { inline_keyboard: message.buttons } : { inline_keyboard: [] },
    });
  } catch (error) {
    // Pressing a button twice yields "message is not modified"; that's harmless.
    if (!(error instanceof Error && error.message.includes('not modified'))) throw error;
  }
}

export async function answerCallback(callbackQueryId: string, text?: string) {
  await telegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: false }).catch(() => undefined);
}

export function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
