import { addFact } from './assistant-memory';
import { findUrls } from './knowledge';
import { escapeHtml as h, sendMessage } from './telegram';

// "احفظ: …", "افتكر إن …", "remember …" outside a chat: an instruction or fact for Anwarz's memory
// (used by the chat and by the email sorting in every inbox), not a library note.
// With a link it's still a library item (the library handler takes it).

const MEMORY_PREFIX = /^(احفظ|افتكر|إفتكر|خلي بالك|خلّي بالك|سجل عندك|سجّل عندك|remember|memorize)\s*(إن|ان|that)?\s*[:：\-–,]?\s+/i;

export async function handleMemoryMessage(message: { chat: { id: number }; text?: string }): Promise<boolean> {
  const text = (message.text || '').trim();
  if (!MEMORY_PREFIX.test(text) || findUrls(text).length) return false;
  const fact = text.replace(MEMORY_PREFIX, '').trim();
  if (fact.length < 3) return false;
  const saved = await addFact(fact);
  await sendMessage(message.chat.id, {
    text: `🧠 <b>Saved to memory</b>\n${h(saved.text)}\n\n<i>Used in chats and when sorting email in every inbox. /memory shows everything saved.</i>`,
    buttons: [[{ text: '↩️ Undo', callback_data: `m:mem:del:${saved.id}` }, { text: '🧠 All memory', callback_data: 'm:mem' }]],
  });
  return true;
}
