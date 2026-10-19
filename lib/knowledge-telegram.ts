import { listClientProfiles } from './admin-ops';
import {
  analyzeLink,
  analyzeNote,
  analyzeScreenshot,
  findUrls,
  getKnowledge,
  knowledgeCounts,
  listKnowledge,
  newKnowledgeId,
  readPage,
  saveKnowledge,
  searchKnowledge,
  setKnowledgeStatus,
  similarKnowledge,
  storeImage,
  type KnowledgeItem,
  type LibraryClient,
} from './knowledge';
import { startTaskFromText } from './task-telegram';
import { InlineButton, OutgoingMessage, answerCallback, downloadFile, editMessage, escapeHtml as h, sendMessage, sendPhoto, telegram, truncate } from './telegram';

// Knowledge library in the bot. Screenshots, links and "save: …" notes are read by the AI and
// filed; /find searches them. Button data: "kb:<action>:<id>".

interface PhotoSize {
  file_id: string;
  file_size?: number;
  width?: number;
  height?: number;
}

interface IncomingMessage {
  message_id?: number;
  text?: string;
  caption?: string;
  chat: { id: number };
  photo?: PhotoSize[];
  document?: { file_id: string; mime_type?: string; file_size?: number; file_name?: string };
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number }; photo?: unknown; caption?: string };
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const NOTE_PREFIX = /^(save|note|keep|احفظ|حفظ|ملاحظة|ملاحظه)\s*[:：\-–]?\s+/i;
const TYPE_ICON: Record<KnowledgeItem['type'], string> = { screenshot: '🖼', link: '🔗', note: '📝' };

async function libraryClients(): Promise<LibraryClient[]> {
  return (await listClientProfiles())
    .filter((c) => c.id && c.brandName)
    .map((c) => ({ id: c.id!, name: c.brandName, owner: c.ownerName || undefined }));
}

function typing(chatId: number | string, action = 'typing') {
  return telegram('sendChatAction', { chat_id: chatId, action }).catch(() => undefined);
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' }).format(new Date(iso));
}

// ---------- Cards ----------

function itemCard(item: KnowledgeItem, clients: LibraryClient[], header?: string, maxLength = 3500): OutgoingMessage {
  const client = item.client_id ? clients.find((c) => c.id === item.client_id)?.name || 'Client' : null;
  const lines = [
    ...(header ? [header, ''] : []),
    `${TYPE_ICON[item.type]} <b>${h(item.title)}</b>`,
    item.summary ? h(truncate(item.summary, 600)) : null,
    item.url ? `🔗 <a href="${h(item.url)}">${h(item.domain || truncate(item.url, 60))}</a>` : null,
    client ? `💼 ${h(client)}` : item.category === 'personal' ? '🏠 Personal' : null,
    item.tags.length ? `🏷 ${item.tags.map((t) => `#${h(t.replace(/-/g, '_'))}`).join(' ')}` : null,
    `<i>Saved ${shortDate(item.created_at)}</i>`,
  ].filter(Boolean) as string[];
  let text = lines.join('\n');
  if (text.length > maxLength) text = truncate(text, maxLength);

  if (item.status === 'removed') {
    return { text: `🗑 <s>${h(item.title)}</s>\n<i>Removed from the library.</i>`, buttons: [[{ text: '♻️ Restore', callback_data: `kb:r:${item.id}` }]] };
  }
  const buttons: InlineButton[][] = [
    [
      { text: '➕ Make a task', callback_data: `kb:t:${item.id}` },
      { text: '🔎 Similar', callback_data: `kb:s:${item.id}` },
    ],
    [{ text: '🗑 Remove', callback_data: `kb:u:${item.id}` }],
  ];
  if (item.url) buttons[1].unshift({ text: '🌐 Open', url: item.url });
  return { text, buttons };
}

function listLine(item: KnowledgeItem, n: number, clients: LibraryClient[]) {
  const client = item.client_id ? clients.find((c) => c.id === item.client_id)?.name : null;
  return `${n}. ${TYPE_ICON[item.type]} ${h(truncate(item.title, 70))}${client ? ` — <i>${h(client)}</i>` : ''} · ${shortDate(item.created_at)}`;
}

function listMessage(title: string, items: KnowledgeItem[], clients: LibraryClient[], back: string, empty = 'Nothing here yet.'): OutgoingMessage {
  const buttons: InlineButton[][] = items.map((item, i) => [{ text: `${i + 1}. ${truncate(item.title, 40)}`, callback_data: `kb:o:${item.id}` }]);
  buttons.push([{ text: '⬅️ Back', callback_data: back }]);
  return {
    text: [`<b>${title}</b>`, '', ...(items.length ? items.map((item, i) => listLine(item, i + 1, clients)) : [`<i>${empty}</i>`])].join('\n'),
    buttons,
  };
}

// ---------- Saving ----------

async function saveScreenshot(message: IncomingMessage, fileId: string, mimeType: string, caption: string) {
  const chatId = message.chat.id;
  await typing(chatId, 'upload_photo');
  const [{ data }, clients] = await Promise.all([downloadFile(fileId), libraryClients()]);
  if (data.length > MAX_IMAGE_BYTES) {
    await sendMessage(chatId, { text: '🖼 That image is too big for me (over 15 MB).', replyTo: message.message_id });
    return;
  }
  const id = newKnowledgeId();
  const [analysis, filePath] = await Promise.all([
    analyzeScreenshot({ data: data.toString('base64'), mimeType }, caption, clients),
    storeImage(id, data, mimeType).catch((error) => {
      console.error('Screenshot upload failed:', error);
      return null; // the Telegram copy still works; only the panel copy is missing
    }),
  ]);
  const item = await saveKnowledge({ id, chatId: String(chatId), type: 'screenshot', analysis, telegramFileId: fileId, filePath, sourceText: caption || null });
  await sendMessage(chatId, { ...itemCard(item, clients, '📚 <b>Saved to your library</b>'), replyTo: message.message_id });
  // "Remind me to call them tomorrow" as a caption: also start that task.
  if (analysis.taskRequest) await startTaskFromText(chatId, `${analysis.taskRequest}\n(About: ${analysis.title})`, 'screenshot');
}

/** Saves a link (with any words around it) or a plain note; used for "save: …" and by the task flow. */
export async function saveTextToLibrary(chatId: number, text: string, replyTo?: number) {
  const clients = await libraryClients();
  const url = findUrls(text)[0];
  if (url) {
    await typing(chatId);
    const note = text.replace(url, '').replace(NOTE_PREFIX, '').trim();
    const page = await readPage(url);
    const analysis = await analyzeLink(url, page, note, clients);
    const item = await saveKnowledge({ chatId: String(chatId), type: 'link', analysis, url, sourceText: text, extra: { pageRead: Boolean(page) } });
    await sendMessage(chatId, {
      ...itemCard(item, clients, page ? '📚 <b>Saved to your library</b>' : '📚 <b>Saved</b> <i>(the page couldn’t be opened, so this is from the link and your note)</i>'),
      replyTo,
    });
    if (analysis.taskRequest) await startTaskFromText(chatId, `${analysis.taskRequest}\n${url}`, 'link');
    return;
  }
  const body = text.replace(NOTE_PREFIX, '').trim();
  const analysis = await analyzeNote(body, clients);
  const item = await saveKnowledge({ chatId: String(chatId), type: 'note', analysis, sourceText: text });
  await sendMessage(chatId, { ...itemCard(item, clients, '📚 <b>Saved to your library</b>'), replyTo });
}

/** Library messages: images, /find, /library, "save: …", and bare links. False = not for the library. */
export async function handleKnowledgeMessage(message: IncomingMessage): Promise<boolean> {
  const chatId = message.chat.id;
  const caption = (message.caption || '').trim();
  const text = (message.text || '').trim();

  const imageDoc = message.document?.mime_type?.startsWith('image/') ? message.document : null;
  const photo = message.photo?.length ? message.photo[message.photo.length - 1] : null; // largest size
  if (photo || imageDoc) {
    try {
      if (((photo || imageDoc)!.file_size || 0) > MAX_IMAGE_BYTES) {
        await sendMessage(chatId, { text: '🖼 That image is too big for me (over 15 MB).' });
        return true;
      }
      await saveScreenshot(message, (photo || imageDoc)!.file_id, imageDoc?.mime_type || 'image/jpeg', caption);
    } catch (error) {
      console.error('Screenshot save failed:', error);
      await sendMessage(chatId, { text: '⚠️ I couldn’t read that image right now (the AI may be busy). Please send it again in a minute.' });
    }
    return true;
  }
  if (!text) return false;

  const command = text.split(/[\s@]/)[0].toLowerCase();
  if (command === '/find' || command === '/search') {
    const query = text.replace(/^\S+\s*/, '').trim();
    await sendMessage(chatId, query ? await searchScreen(query) : { text: '🔎 Type what you’re looking for after /find, e.g. <code>/find reel ideas</code> or <code>/find عروض رمضان</code>.' });
    return true;
  }
  if (command === '/library' || command === '/lib') {
    await sendMessage(chatId, await libraryHomeScreen());
    return true;
  }

  // "save: …" notes, and messages that are only a link (nothing else to read as a task).
  const onlyLinks = findUrls(text).length > 0 && text.replace(/https?:\/\/[^\s<>"']+/gi, '').replace(/[\s.,;:!?'"()[\]{}\-–—…،؛؟]/g, '').length === 0;
  if (NOTE_PREFIX.test(text) || onlyLinks) {
    try {
      await saveTextToLibrary(chatId, text, message.message_id);
    } catch (error) {
      console.error('Library save failed:', error);
      await sendMessage(chatId, { text: '⚠️ I couldn’t save that right now (the AI may be busy). Please send it again in a minute.' });
    }
    return true;
  }
  return false;
}

// ---------- Screens ----------

export async function libraryCount() {
  return (await knowledgeCounts()).total;
}

export async function libraryHomeScreen(): Promise<OutgoingMessage> {
  const { total, byType } = await knowledgeCounts();
  return {
    text: [
      '📚 <b>Library</b>',
      total ? `${total} saved · 🖼 ${byType.screenshot} screenshots · 🔗 ${byType.link} links · 📝 ${byType.note} notes` : '<i>Nothing saved yet.</i>',
      '',
      '<b>To save:</b> send a screenshot, a link, or a message starting with <code>save:</code>',
      '<b>To search:</b> <code>/find</code> + words, e.g. <code>/find reel ideas</code>. It finds things by meaning, in Arabic or English.',
    ].join('\n'),
    buttons: [
      [
        { text: '🕘 Recent', callback_data: 'kb:l:recent' },
        { text: '👥 By client', callback_data: 'kb:l:c' },
      ],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

async function searchScreen(query: string): Promise<OutgoingMessage> {
  const [items, clients] = await Promise.all([searchKnowledge(query), libraryClients()]);
  return listMessage(`🔎 “${h(truncate(query, 60))}”`, items, clients, 'kb:l:home', 'No matches. Try other words, or open Recent.');
}

async function clientsScreen(): Promise<OutgoingMessage> {
  const [{ byClient }, clients] = await Promise.all([knowledgeCounts(), libraryClients()]);
  const buttons: InlineButton[][] = clients.filter((c) => byClient.get(c.id)).map((c) => [{ text: `${truncate(c.name, 36)} (${byClient.get(c.id)})`, callback_data: `kb:l:c:${c.id}` }]);
  if (byClient.get('-')) buttons.push([{ text: `🏢 Agency / no client (${byClient.get('-')})`, callback_data: 'kb:l:c:-' }]);
  if (byClient.get('p')) buttons.push([{ text: `🏠 Personal (${byClient.get('p')})`, callback_data: 'kb:l:c:p' }]);
  const hasAny = buttons.length > 0;
  buttons.push([{ text: '⬅️ Back', callback_data: 'kb:l:home' }]);
  return { text: ['👥 <b>Library by client</b>', '', hasAny ? '<i>Pick one.</i>' : '<i>Nothing saved for a client yet.</i>'].join('\n'), buttons };
}

async function clientItemsScreen(key: string): Promise<OutgoingMessage> {
  const clients = await libraryClients();
  const items = await listKnowledge({ limit: 10, ...(key === 'p' ? { personal: true } : { clientId: key }) });
  const title = key === 'p' ? '🏠 Personal' : key === '-' ? '🏢 Agency / no client' : `💼 ${h(clients.find((c) => c.id === key)?.name || 'Client')}`;
  return listMessage(title, items, clients, 'kb:l:c');
}

/** Edits a card in place; photo cards (sent with a caption) need editMessageCaption. */
async function editCard(query: CallbackQuery, message: OutgoingMessage) {
  const chatId = query.message!.chat.id;
  const messageId = query.message!.message_id;
  if (query.message?.photo) {
    await telegram('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: truncate(message.text, 1024),
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: message.buttons || [] },
    }).catch((error) => {
      if (!String(error).includes('not modified')) throw error;
    });
    return;
  }
  await editMessage(chatId, messageId, message);
}

export async function handleKnowledgeCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, id, key] = (query.data || '').split(':');

  try {
    if (action === 'l') {
      const clients = await libraryClients();
      const screen =
        id === 'recent'
          ? listMessage('🕘 Recently saved', await listKnowledge({ limit: 10 }), clients, 'kb:l:home')
          : id === 'c'
            ? key
              ? await clientItemsScreen(key)
              : await clientsScreen()
            : await libraryHomeScreen();
      if (query.message?.photo) await sendMessage(chatId, screen);
      else await editMessage(chatId, messageId, screen);
      return answerCallback(query.id);
    }

    const [item, clients] = await Promise.all([getKnowledge(id), libraryClients()]);
    if (!item) return answerCallback(query.id, 'Not found.');

    if (action === 'o') {
      await answerCallback(query.id);
      if (item.type === 'screenshot' && item.telegram_file_id) {
        await sendPhoto(chatId, item.telegram_file_id, itemCard(item, clients, undefined, 1024));
      } else {
        await sendMessage(chatId, itemCard(item, clients));
      }
      return;
    }
    if (action === 's') {
      await answerCallback(query.id, 'Looking for similar items…');
      const similar = await similarKnowledge(item);
      await sendMessage(chatId, listMessage(`🔎 Similar to “${h(truncate(item.title, 50))}”`, similar, clients, 'kb:l:home', 'Nothing similar yet.'));
      return;
    }
    if (action === 't') {
      await answerCallback(query.id, 'Making a task…');
      const about = [item.title, item.url, item.summary ? truncate(item.summary, 300) : null].filter(Boolean).join('\n');
      await startTaskFromText(chatId, `Follow up on this: ${about}`, item.type);
      return;
    }
    if (action === 'u' || action === 'r') {
      const updated = await setKnowledgeStatus(item.id, action === 'u' ? 'removed' : 'active');
      await editCard(query, itemCard(updated, clients, action === 'r' ? '♻️ <b>Back in the library</b>' : undefined, query.message?.photo ? 1024 : 3500));
      return answerCallback(query.id, action === 'u' ? 'Removed' : 'Restored');
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Library button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}

