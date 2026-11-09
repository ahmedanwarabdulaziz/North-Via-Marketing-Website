import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { aiJson } from './ai-json';
import { FACT_LABELS, labelOf, type FactLabel, type MemoryFact } from './assistant-memory';
import { getSetting, setSetting } from './data/store';
import { addFactTo, clientIdOf, listFacts, type FileKey } from './memory-files';
import { answerCallback, editMessage, escapeHtml as h, sendMessage, truncate, type OutgoingMessage } from './telegram';

// Every new memory fact goes through here. The AI decides WHERE it belongs (a specific client's
// file, or the general rules), labels it, and compares it with that file only: nothing related →
// saved (with Undo); a duplicate, a contradiction or an overlap → Ahmed sees both and picks
// 🔁 Replace old / ➕ Keep both / ✖️ Cancel. Button data: "mf:r|k|x:<pending id>".

const PENDING = 'pending_fact';
const KEEP_MS = 24 * 3_600_000;

interface Related {
  id: string;
  relation: 'duplicate' | 'conflict' | 'overlap';
}
type Pending = Record<string, { text: string; label: FactLabel; file: FileKey; related: Related[]; at: number }>;

/** The Undo / delete button data for a fact: "m:mem:del:<fact id>[:<client id>]". */
export const deleteData = (fact: MemoryFact, file: FileKey) => `m:mem:del:${fact.id}${clientIdOf(file) ? `:${clientIdOf(file)}` : ''}`;

async function placeFact(text: string, clients: { id: string; brandName: string }[]) {
  // Step 1: which file. Step 2 (below): compare with that file only.
  try {
    const raw = await aiJson({
      system: `Decide where a fact or instruction for Ahmed's assistant belongs.
- If it is about ONE specific client (their preferences, contacts, rules for their emails/posts/reviews, how to talk to them), "client_id" = that client's id from the list.
- Otherwise (about Ahmed, all clients, or general rules) "client_id" = null.
- "label": "email" (which emails matter / inbox rules), "client" (about a client), or "general".
- "text": the fact as one clear sentence in the SAME language, keeping every detail.
Return ONLY JSON: {"client_id": "<id or null>", "label": "...", "text": "..."}`,
      user: [`FACT: ${text}`, '', 'CLIENTS (id | name):', ...clients.map((c) => `${c.id} | ${c.brandName}`)].join('\n'),
      feature: 'assistant',
      timeBudgetMs: 12_000,
    });
    const clientId = typeof raw.client_id === 'string' && clients.some((c) => c.id === raw.client_id) ? raw.client_id : null;
    const label = (['email', 'client', 'general'] as const).find((l) => l === raw.label) || (clientId ? 'client' : 'general');
    const clean = typeof raw.text === 'string' && raw.text.trim().length > 3 ? raw.text.trim() : text;
    return { file: (clientId ? `client:${clientId}` : 'general') as FileKey, label: clientId ? ('client' as FactLabel) : label, text: clean };
  } catch {
    return { file: 'general' as FileKey, label: 'general' as FactLabel, text };
  }
}

async function findRelated(text: string, facts: MemoryFact[]): Promise<Related[]> {
  if (!facts.length) return [];
  try {
    const raw = await aiJson({
      system: `Compare a NEW fact with SAVED ones in the same memory file. List saved items that are a "duplicate" (same meaning), a "conflict" (they disagree, or one undoes the other) or an "overlap" (one already covers the other). Only clear cases; [] if none.
Return ONLY JSON: {"related": [{"id": "<saved id>", "relation": "duplicate|conflict|overlap"}]}`,
      user: [`NEW: ${text}`, '', 'SAVED (id | text):', ...facts.map((f) => `${f.id} | ${f.text}`)].join('\n'),
      feature: 'assistant',
      timeBudgetMs: 12_000,
    });
    return (Array.isArray(raw.related) ? (raw.related as Related[]) : [])
      .filter((r) => facts.some((f) => f.id === r.id) && ['duplicate', 'conflict', 'overlap'].includes(r.relation))
      .slice(0, 5);
  } catch (error) {
    console.error('Memory check failed, saving without it:', error instanceof Error ? error.message.slice(0, 150) : error);
    return [];
  }
}

async function fileName(file: FileKey) {
  const clientId = clientIdOf(file);
  if (!clientId) return '⚙️ General rules';
  const client = (await listClientProfiles()).find((c) => c.id === clientId);
  return `📁 ${client?.brandName || 'Client'}’s file`;
}

async function savedCard(fact: MemoryFact, file: FileKey, note?: string): Promise<OutgoingMessage> {
  const where = clientIdOf(file) ? await fileName(file) : FACT_LABELS[labelOf(fact)];
  return {
    text: [`🧠 <b>Saved</b> · ${h(where)}`, h(fact.text), note ? `\n<i>${note}</i>` : '', '\n<i>/memory shows every file. Edit them in Admin → Memory.</i>'].filter(Boolean).join('\n'),
    buttons: [[{ text: '↩️ Undo', callback_data: deleteData(fact, file) }, { text: '🧠 All memory', callback_data: 'm:mem' }]],
  };
}

const RELATION_TEXT = { duplicate: 'says the same', conflict: 'disagrees', overlap: 'overlaps' } as const;

/** Routes, checks and saves a fact, or asks Ahmed when it clashes. Sends (or edits into) the card. */
export async function proposeFact(chatId: number | string, rawText: string, opts: { editMessageId?: number; clientId?: string | null } = {}) {
  const show = (m: OutgoingMessage) => (opts.editMessageId ? editMessage(chatId, opts.editMessageId, m) : sendMessage(chatId, m));
  const text = rawText.trim();
  if (text.length < 3) return;
  const clients = (await listClientProfiles()).filter((c): c is typeof c & { id: string } => Boolean(c.id && c.brandName)).map((c) => ({ id: c.id, brandName: c.brandName }));
  const placed = opts.clientId
    ? { file: `client:${opts.clientId}` as FileKey, label: 'client' as FactLabel, text }
    : await placeFact(text, clients);
  const facts = await listFacts(placed.file);
  const related = await findRelated(placed.text, facts);
  if (!related.length) {
    await show(await savedCard(await addFactTo(placed.file, placed.text, placed.label), placed.file));
    return;
  }
  const id = crypto.randomBytes(5).toString('base64url');
  const pending = (await getSetting<Pending>(PENDING)) || {};
  for (const [k, v] of Object.entries(pending)) if (Date.now() - v.at > KEEP_MS) delete pending[k];
  pending[id] = { text: placed.text, label: placed.label, file: placed.file, related, at: Date.now() };
  await setSetting(PENDING, pending);
  const lines = related.map((r) => {
    const f = facts.find((x) => x.id === r.id)!;
    return `• <i>${RELATION_TEXT[r.relation]}:</i> ${h(truncate(f.text, 200))} <i>(${f.at.slice(0, 10)})</i>`;
  });
  await show({
    text: [`⚠️ <b>This is close to something already saved</b> in ${h(await fileName(placed.file))}`, '', `<b>New:</b> ${h(placed.text)}`, '', '<b>Saved:</b>', ...lines, '', 'What should I do?'].join('\n'),
    buttons: [
      [
        { text: '🔁 Replace old', callback_data: `mf:r:${id}` },
        { text: '➕ Keep both', callback_data: `mf:k:${id}` },
      ],
      [{ text: '✖️ Cancel', callback_data: `mf:x:${id}` }],
    ],
  });
}

export async function handleFactChoice(query: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } }) {
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
    await editMessage(chatId, messageId, { text: '✖️ <i>Not saved. Memory unchanged.</i>' });
    return answerCallback(query.id, 'Cancelled');
  }
  const replace = choice === 'r' ? item.related.map((r) => r.id) : [];
  const fact = await addFactTo(item.file, item.text, item.label, replace);
  await editMessage(
    chatId,
    messageId,
    await savedCard(fact, item.file, replace.length ? `Replaced ${replace.length} older fact${replace.length === 1 ? '' : 's'}.` : 'Kept the older one too; if they disagree, this newer one wins.')
  );
  return answerCallback(query.id, replace.length ? 'Replaced' : 'Saved');
}
