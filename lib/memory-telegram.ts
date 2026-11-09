import crypto from 'crypto';
import { proposeFact } from './memory-guard';
import { getSetting, setSetting } from './data/store';
import { findUrls } from './knowledge';
import { saveTextToLibrary } from './knowledge-telegram';
import { startTaskFromText } from './task-telegram';
import { answerCallback, editMessage, escapeHtml as h, sendMessage, truncate } from './telegram';

// "احفظ …", "save …", "افتكر …", "remember …" outside a chat could mean an instruction for
// Anwarz's memory (used by the chat and the email sorting) or a note for the library, so the
// bot asks: 🧠 Memory or 📚 Library. Links, screenshots and "ملاحظة:" / "note:" go to the
// library without asking (the library handler takes them). Button data: "sv:m|l|x:<id>".

const ASK_PREFIX = /^(احفظ|حفظ|افتكر|إفتكر|خلي بالك|خلّي بالك|سجل عندك|سجّل عندك|save|keep|remember|memorize)\s*(إن|ان|that)?\s*[:：\-–,]?\s+/i;
const PENDING = 'pending_save';
const KEEP_MS = 24 * 3_600_000;

type Pending = Record<string, { text: string; messageId?: number; at: number }>;

export async function handleMemoryMessage(message: { chat: { id: number }; message_id?: number; text?: string }): Promise<boolean> {
  const text = (message.text || '').trim();
  if (!ASK_PREFIX.test(text) || findUrls(text).length) return false;
  if (text.replace(ASK_PREFIX, '').trim().length < 3) return false;

  await askWhereToSave(message.chat.id, text, { messageId: message.message_id });
  return true;
}


/**
 * Asks where something goes: 🧠 Memory (an instruction or fact to keep in mind), 📚 Library (a
 * note to find later) and, for a message the task reader thought was an instruction, ✅ Task.
 */
export async function askWhereToSave(chatId: number | string, text: string, opts: { messageId?: number; offerTask?: boolean } = {}) {
  const offerTask = opts.offerTask ?? !ASK_PREFIX.test(text);
  const id = crypto.randomBytes(5).toString('base64url');
  const pending = (await getSetting<Pending>(PENDING)) || {};
  for (const [k, v] of Object.entries(pending)) if (Date.now() - v.at > KEEP_MS) delete pending[k];
  pending[id] = { text, messageId: opts.messageId, at: Date.now() };
  await setSetting(PENDING, pending);
  await sendMessage(chatId, {
    text: [
      offerTask ? '💾 <b>This sounds like an instruction. Where should it go?</b>' : '💾 <b>Where should I save this?</b>',
      `<i>${h(truncate(text.replace(ASK_PREFIX, '').trim(), 300))}</i>`,
      '',
      '🧠 <b>Memory</b>: an instruction or fact I should always keep in mind (it goes to the right client’s file or the general rules).',
      ...(offerTask ? ['✅ <b>Task</b>: something to do, with a date.'] : []),
      '📚 <b>Library</b>: a note or idea to find later.',
    ].join('\n'),
    buttons: [
      [
        { text: '🧠 Memory', callback_data: `sv:m:${id}` },
        ...(offerTask ? [{ text: '✅ Task', callback_data: `sv:t:${id}` }] : []),
        { text: '📚 Library', callback_data: `sv:l:${id}` },
      ],
      [{ text: '✖️ Cancel', callback_data: `sv:x:${id}` }],
    ],
  });
}

export async function handleSaveChoice(query: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } }) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, choice, id] = (query.data || '').split(':');
  const pending = (await getSetting<Pending>(PENDING)) || {};
  const item = pending[id];
  if (!item) {
    await editMessage(chatId, messageId, { text: '<i>This was already handled or has expired.</i>' });
    return answerCallback(query.id);
  }
  delete pending[id];
  await setSetting(PENDING, pending);

  if (choice === 'x') {
    await editMessage(chatId, messageId, { text: '✖️ <i>Not saved.</i>' });
    return answerCallback(query.id, 'Cancelled');
  }
  if (choice === 'm') {
    await answerCallback(query.id, 'Checking memory…');
    // Checked against what's saved first: a duplicate or conflict asks Replace / Keep both.
    await proposeFact(chatId, item.text.replace(ASK_PREFIX, '').trim(), { editMessageId: messageId });
    return;
  }
  if (choice === 't') {
    // It was a task after all: the task reader takes it from here (asks for the date if missing).
    await editMessage(chatId, messageId, { text: '✅ <i>Making it a task…</i>' });
    await answerCallback(query.id);
    await startTaskFromText(chatId as number, item.text, 'text');
    return;
  }
  await editMessage(chatId, messageId, { text: '📚 <i>Saving to the library…</i>' });
  await answerCallback(query.id);
  try {
    await saveTextToLibrary(chatId, item.text, item.messageId);
  } catch (error) {
    console.error('Library save failed:', error);
    await sendMessage(chatId, { text: '⚠️ I couldn’t save that right now (the AI may be busy). Please send it again in a minute.' });
  }
}
