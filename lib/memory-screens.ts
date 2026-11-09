import { listClientProfiles } from './admin-ops';
import { FACT_LABELS, getMemory, labelOf, type FactLabel, type MemoryFact } from './assistant-memory';
import { listChatSummaries } from './chat-history';
import { getMasterProfile } from './master-profile';
import { listFacts, removeFactFrom, type FileKey } from './memory-files';
import { answerCallback, editMessage, escapeHtml as h, truncate, type InlineButton, type OutgoingMessage } from './telegram';

// /memory in Telegram: browse every memory file, delete with 🗑, open the admin page to edit.
// Button data: m:mem (home), m:mem:cl (client list), m:mem:c:<client id>, m:mem:ch (past chats),
// m:mem:del:<fact id>[:<client id>].

const ADMIN_URL = 'https://www.northviamarketing.com/admin/memory';
const dateOf = (iso: string) => iso.slice(0, 10);

function factRows(facts: MemoryFact[], start: number, del: (f: MemoryFact) => string) {
  return facts.map((f, i) => [{ text: `🗑 ${start + i}. ${truncate(f.text, 34)}`, callback_data: del(f) }]);
}

export async function memoryHomeScreen(note?: string): Promise<OutgoingMessage> {
  const [{ profile, facts }, master, summaries] = await Promise.all([getMemory(), getMasterProfile(), listChatSummaries()]);
  const lines = ['🧠 <b>Memory</b>', '', '<b>Your profile</b>', profile ? h(truncate(profile, 400)) : '<i>No short profile yet.</i>'];
  lines.push(master ? `📄 Master profile: ${master.text.length.toLocaleString('en')} characters · updated ${dateOf(master.updatedAt)}` : '📄 <i>No master profile yet.</i>');
  lines.push('', `<b>General rules (${facts.length})</b> <i>— newer wins if two disagree</i>`);
  const shown: MemoryFact[] = [];
  for (const label of ['email', 'general', 'client'] as FactLabel[]) {
    const group = [...facts].reverse().filter((f) => labelOf(f) === label).slice(0, 8);
    if (!group.length) continue;
    lines.push(`<b>${FACT_LABELS[label]}</b>`);
    for (const f of group) {
      shown.push(f);
      lines.push(`${shown.length}. ${h(truncate(f.text, 150))} <i>(${dateOf(f.at)})</i>`);
    }
  }
  if (!facts.length) lines.push('<i>None yet. Say “احفظ …” / “remember …” and choose 🧠 Memory.</i>');
  if (note) lines.push('', note);
  const buttons: InlineButton[][] = [
    ...factRows(shown, 1, (f) => `m:mem:del:${f.id}`),
    [
      { text: '📁 Client files', callback_data: 'm:mem:cl' },
      { text: `🗂 Past chats (${summaries.length})`, callback_data: 'm:mem:ch' },
    ],
    [{ text: '🖥 Edit everything (Admin)', url: ADMIN_URL }],
    [{ text: '⬅️ Menu', callback_data: 'm:home' }],
  ];
  return { text: lines.join('\n'), buttons };
}

async function clientListScreen(): Promise<OutgoingMessage> {
  const clients = (await listClientProfiles()).filter((c) => c.id && c.brandName);
  const counts = await Promise.all(clients.map(async (c) => (await listFacts(`client:${c.id}`)).length));
  return {
    text: ['📁 <b>Client files</b>', '', 'Each client’s own rules and facts, used only for that client. Tap one to see it.', '', '<i>To add: “احفظ لـ Pacific: …” and choose 🧠 Memory.</i>'].join('\n'),
    buttons: [
      ...clients.map((c, i) => [{ text: `📁 ${truncate(c.brandName, 28)} (${counts[i]})`, callback_data: `m:mem:c:${c.id}` }]),
      [{ text: '⬅️ Memory', callback_data: 'm:mem' }],
    ],
  };
}

async function clientFileScreen(clientId: string, note?: string): Promise<OutgoingMessage> {
  const client = (await listClientProfiles()).find((c) => c.id === clientId);
  const facts = [...(await listFacts(`client:${clientId}`))].reverse().slice(0, 15);
  const lines = [`📁 <b>${h(client?.brandName || 'Client')}</b>`, ''];
  if (!facts.length) lines.push('<i>Nothing saved for this client yet.</i>');
  facts.forEach((f, i) => lines.push(`${i + 1}. ${h(truncate(f.text, 180))} <i>(${dateOf(f.at)})</i>`));
  if (note) lines.push('', note);
  return {
    text: lines.join('\n'),
    buttons: [...factRows(facts, 1, (f) => `m:mem:del:${f.id}:${clientId}`), [{ text: '🖥 Edit in Admin', url: ADMIN_URL }], [{ text: '⬅️ Client files', callback_data: 'm:mem:cl' }]],
  };
}

async function pastChatsScreen(): Promise<OutgoingMessage> {
  const [items, clients] = await Promise.all([listChatSummaries(), listClientProfiles()]);
  const name = (id: string) => clients.find((c) => c.id === id)?.brandName || 'Client';
  const lines = ['🗂 <b>Past chats</b>', ''];
  if (!items.length) lines.push('<i>No finished chats summarized yet. A chat is summarized 30 minutes after its last message.</i>');
  for (const s of items.slice(0, 10)) {
    lines.push(`<b>${h(s.topic || 'Chat')}</b> · <i>${dateOf(s.at)}${s.clients.length ? ` · ${h(s.clients.map(name).join(', '))}` : ''}</i>`, h(truncate(s.summary, 220)), '');
  }
  return { text: lines.join('\n'), buttons: [[{ text: '🖥 Edit or delete (Admin)', url: ADMIN_URL }], [{ text: '⬅️ Memory', callback_data: 'm:mem' }]] };
}

export async function handleMemoryScreen(query: { id: string; data?: string }, chatId: number, messageId: number) {
  const [, , action, a, b] = (query.data || '').split(':');
  if (action === 'cl') {
    await editMessage(chatId, messageId, await clientListScreen());
    return answerCallback(query.id);
  }
  if (action === 'c' && a) {
    await editMessage(chatId, messageId, await clientFileScreen(a));
    return answerCallback(query.id);
  }
  if (action === 'ch') {
    await editMessage(chatId, messageId, await pastChatsScreen());
    return answerCallback(query.id);
  }
  if (action === 'del' && a) {
    const file: FileKey = b ? `client:${b}` : 'general';
    const removed = await removeFactFrom(file, a);
    const note = removed ? `🗑 <i>Deleted: ${h(truncate(removed.text, 80))}</i>` : '<i>Already deleted.</i>';
    await editMessage(chatId, messageId, b ? await clientFileScreen(b, note) : await memoryHomeScreen(note));
    return answerCallback(query.id, removed ? 'Deleted' : undefined);
  }
  await editMessage(chatId, messageId, await memoryHomeScreen());
  return answerCallback(query.id);
}
