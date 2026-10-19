import { listClientProfiles } from './admin-ops';
import {
  analyzeLink,
  analyzeNote,
  analyzeScreenshot,
  createCategory,
  findUrls,
  getKnowledge,
  knowledgeCounts,
  listCategories,
  listKnowledge,
  newKnowledgeId,
  readPage,
  saveKnowledge,
  searchKnowledge,
  setItemCategory,
  setKnowledgeStatus,
  similarKnowledge,
  storeImage,
  type KnowledgeCategory,
  type KnowledgeItem,
  type LibraryClient,
} from './knowledge';
import { startTaskFromText } from './task-telegram';
import { InlineButton, OutgoingMessage, answerCallback, downloadFile, editMessage, escapeHtml as h, sendMessage, sendPhoto, telegram, truncate } from './telegram';

// Knowledge library in the bot. Screenshots, links and "save: …" notes are read by the AI and
// filed in a category; when the AI isn't sure, the item waits in Public and the bot asks.
// /find searches everything. Button data: "kb:<action>:<id>[:<value>]".

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
  reply_to_message?: { text?: string };
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number }; photo?: unknown; caption?: string };
}

interface LibraryContext {
  clients: LibraryClient[];
  categories: KnowledgeCategory[];
}

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const NOTE_PREFIX = /^(save|note|keep|احفظ|حفظ|ملاحظة|ملاحظه)\s*[:：\-–]?\s+/i;
const TYPE_ICON: Record<KnowledgeItem['type'], string> = { screenshot: '🖼', link: '🔗', note: '📝' };

async function libraryContext(): Promise<LibraryContext> {
  const [profiles, categories] = await Promise.all([listClientProfiles(), listCategories()]);
  return {
    clients: profiles.filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName, owner: c.ownerName || undefined })),
    categories,
  };
}

function typing(chatId: number | string, action = 'typing') {
  return telegram('sendChatAction', { chat_id: chatId, action }).catch(() => undefined);
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: 'numeric', month: 'short' }).format(new Date(iso));
}

function categoryLabel(ctx: LibraryContext, id: string) {
  const c = ctx.categories.find((x) => x.id === id);
  return c ? `${c.emoji} ${h(c.name)}` : '🌐 Public';
}

// ---------- Cards ----------

function itemCard(item: KnowledgeItem, ctx: LibraryContext, header?: string, maxLength = 3500): OutgoingMessage {
  const client = item.client_id ? ctx.clients.find((c) => c.id === item.client_id)?.name || 'Client' : null;
  const lines = [
    ...(header ? [header, ''] : []),
    `${TYPE_ICON[item.type]} <b>${h(item.title)}</b>`,
    item.summary ? h(truncate(item.summary, 600)) : null,
    item.url ? `🔗 <a href="${h(item.url)}">${h(item.domain || truncate(item.url, 60))}</a>` : null,
    `🗂 ${categoryLabel(ctx, item.category_id)}${client ? ` · 💼 ${h(client)}` : item.category === 'personal' ? ' · 🏠 Personal' : ''}`,
    item.tags.length ? `🏷 ${item.tags.map((t) => `#${h(t.replace(/-/g, '_'))}`).join(' ')}` : null,
    `<i>Saved ${shortDate(item.created_at)}</i>`,
  ].filter(Boolean) as string[];
  let text = lines.join('\n');
  if (text.length > maxLength) text = truncate(text, maxLength);

  if (item.status === 'removed') {
    return { text: `🗑 <s>${h(item.title)}</s>\n<i>Removed from the library.</i>`, buttons: [[{ text: '♻️ Restore', callback_data: `kb:r:${item.id}` }]] };
  }
  const row2: InlineButton[] = [{ text: '🗂 Category', callback_data: `kb:p:${item.id}` }];
  if (item.url) row2.push({ text: '🌐 Open', url: item.url });
  row2.push({ text: '🗑 Remove', callback_data: `kb:u:${item.id}` });
  return {
    text,
    buttons: [
      [
        { text: '➕ Make a task', callback_data: `kb:t:${item.id}` },
        { text: '🔎 Similar', callback_data: `kb:s:${item.id}` },
      ],
      row2,
    ],
  };
}

/** "Which category?" with every category, Keep in Public and New category. */
function categoryQuestion(item: KnowledgeItem, ctx: LibraryContext, unsure: boolean): OutgoingMessage {
  const choices = ctx.categories.filter((c) => c.id !== 'public');
  const buttons: InlineButton[][] = [];
  for (let i = 0; i < choices.length; i += 2) {
    buttons.push(choices.slice(i, i + 2).map((c) => ({ text: `${c.emoji} ${truncate(c.name, 24)}`, callback_data: `kb:c:${item.id}:${c.id}` })));
  }
  buttons.push([
    { text: '🌐 Keep in Public', callback_data: `kb:c:${item.id}:public` },
    { text: '➕ New category', callback_data: `kb:n:${item.id}` },
  ]);
  return {
    text: [
      `🗂 <b>Which category for “${h(truncate(item.title, 60))}”?</b>`,
      unsure ? '<i>I wasn’t sure, so it’s in 🌐 Public until you choose.</i>' : `<i>Now in ${categoryLabel(ctx, item.category_id)}.</i>`,
    ].join('\n'),
    buttons,
  };
}

function listLine(item: KnowledgeItem, n: number, ctx: LibraryContext) {
  const client = item.client_id ? ctx.clients.find((c) => c.id === item.client_id)?.name : null;
  const category = ctx.categories.find((c) => c.id === item.category_id);
  return `${n}. ${TYPE_ICON[item.type]} ${h(truncate(item.title, 70))}${client ? ` — <i>${h(client)}</i>` : ''} · ${category?.emoji || '🌐'} · ${shortDate(item.created_at)}`;
}

function listMessage(title: string, items: KnowledgeItem[], ctx: LibraryContext, back: string, empty = 'Nothing here yet.'): OutgoingMessage {
  const buttons: InlineButton[][] = items.map((item, i) => [{ text: `${i + 1}. ${truncate(item.title, 40)}`, callback_data: `kb:o:${item.id}` }]);
  buttons.push([{ text: '⬅️ Back', callback_data: back }]);
  return {
    text: [`<b>${title}</b>`, '', ...(items.length ? items.map((item, i) => listLine(item, i + 1, ctx)) : [`<i>${empty}</i>`])].join('\n'),
    buttons,
  };
}

/** Sends the saved card, then asks for the category if the AI wasn't sure. */
async function announceSaved(chatId: number, item: KnowledgeItem, ctx: LibraryContext, header: string, replyTo?: number) {
  await sendMessage(chatId, { ...itemCard(item, ctx, header), replyTo });
  if (!item.category_confirmed) await sendMessage(chatId, categoryQuestion(item, ctx, true));
}

// ---------- Saving ----------

async function saveScreenshot(message: IncomingMessage, fileId: string, mimeType: string, caption: string) {
  const chatId = message.chat.id;
  await typing(chatId, 'upload_photo');
  const [{ data }, ctx] = await Promise.all([downloadFile(fileId), libraryContext()]);
  if (data.length > MAX_IMAGE_BYTES) {
    await sendMessage(chatId, { text: '🖼 That image is too big for me (over 15 MB).', replyTo: message.message_id });
    return;
  }
  const id = newKnowledgeId();
  const [analysis, filePath] = await Promise.all([
    analyzeScreenshot({ data: data.toString('base64'), mimeType }, caption, ctx.clients),
    storeImage(id, data, mimeType).catch((error) => {
      console.error('Screenshot upload failed:', error);
      return null; // the Telegram copy still works; only the panel copy is missing
    }),
  ]);
  const item = await saveKnowledge({ id, chatId: String(chatId), type: 'screenshot', analysis, telegramFileId: fileId, filePath, sourceText: caption || null });
  await announceSaved(chatId, item, ctx, '📚 <b>Saved to your library</b>', message.message_id);
  // "Remind me to call them tomorrow" as a caption: also start that task.
  if (analysis.taskRequest) await startTaskFromText(chatId, `${analysis.taskRequest}\n(About: ${analysis.title})`, 'screenshot');
}

/** Saves a link (with any words around it) or a plain note; used for "save: …" and by the task flow. */
export async function saveTextToLibrary(chatId: number, text: string, replyTo?: number) {
  const ctx = await libraryContext();
  const url = findUrls(text)[0];
  if (url) {
    await typing(chatId);
    const note = text.replace(url, '').replace(NOTE_PREFIX, '').trim();
    const page = await readPage(url);
    const analysis = await analyzeLink(url, page, note, ctx.clients);
    const item = await saveKnowledge({ chatId: String(chatId), type: 'link', analysis, url, sourceText: text, extra: { pageRead: Boolean(page) } });
    await announceSaved(
      chatId,
      item,
      ctx,
      page ? '📚 <b>Saved to your library</b>' : '📚 <b>Saved</b> <i>(the page couldn’t be opened, so this is from the link and your note)</i>',
      replyTo
    );
    if (analysis.taskRequest) await startTaskFromText(chatId, `${analysis.taskRequest}\n${url}`, 'link');
    return;
  }
  const body = text.replace(NOTE_PREFIX, '').trim();
  const analysis = await analyzeNote(body, ctx.clients);
  const item = await saveKnowledge({ chatId: String(chatId), type: 'note', analysis, sourceText: text });
  await announceSaved(chatId, item, ctx, '📚 <b>Saved to your library</b>', replyTo);
}

/** Library messages: images, /find, /library, "save: …", bare links, new-category replies. False = not for the library. */
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

  // A reply to "New category name?" creates the category and files the item in it.
  const newCategoryFor = message.reply_to_message?.text?.match(/kcat:([A-Za-z0-9_-]{8})/);
  if (newCategoryFor && !text.startsWith('/')) {
    const item = await getKnowledge(newCategoryFor[1]);
    if (!item) {
      await sendMessage(chatId, { text: 'That library item wasn’t found.' });
      return true;
    }
    const category = await createCategory(text);
    const updated = await setItemCategory(item.id, category.id);
    const ctx = await libraryContext();
    await sendMessage(chatId, { text: `🗂 Saved “${h(truncate(updated.title, 60))}” in ${categoryLabel(ctx, category.id)}.` });
    return true;
  }

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
      '<b>To search:</b> <code>/find</code> + words, or just ask me a question. I search by meaning, in Arabic or English.',
    ].join('\n'),
    buttons: [
      [
        { text: '🕘 Recent', callback_data: 'kb:l:recent' },
        { text: '🗂 By category', callback_data: 'kb:l:g' },
      ],
      [{ text: '👥 By client', callback_data: 'kb:l:c' }],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

async function searchScreen(query: string): Promise<OutgoingMessage> {
  const [items, ctx] = await Promise.all([searchKnowledge(query), libraryContext()]);
  return listMessage(`🔎 “${h(truncate(query, 60))}”`, items, ctx, 'kb:l:home', 'No matches. Try other words, or open Recent.');
}

async function clientsScreen(): Promise<OutgoingMessage> {
  const [{ byClient }, ctx] = await Promise.all([knowledgeCounts(), libraryContext()]);
  const buttons: InlineButton[][] = ctx.clients.filter((c) => byClient.get(c.id)).map((c) => [{ text: `${truncate(c.name, 36)} (${byClient.get(c.id)})`, callback_data: `kb:l:c:${c.id}` }]);
  if (byClient.get('-')) buttons.push([{ text: `🏢 Agency / no client (${byClient.get('-')})`, callback_data: 'kb:l:c:-' }]);
  if (byClient.get('p')) buttons.push([{ text: `🏠 Personal (${byClient.get('p')})`, callback_data: 'kb:l:c:p' }]);
  const hasAny = buttons.length > 0;
  buttons.push([{ text: '⬅️ Back', callback_data: 'kb:l:home' }]);
  return { text: ['👥 <b>Library by client</b>', '', hasAny ? '<i>Pick one.</i>' : '<i>Nothing saved for a client yet.</i>'].join('\n'), buttons };
}

async function categoriesScreen(): Promise<OutgoingMessage> {
  const [{ byCategory }, ctx] = await Promise.all([knowledgeCounts(), libraryContext()]);
  const buttons: InlineButton[][] = ctx.categories.map((c) => [{ text: `${c.emoji} ${truncate(c.name, 32)} (${byCategory.get(c.id) || 0})`, callback_data: `kb:l:g:${c.id}` }]);
  buttons.push([{ text: '⬅️ Back', callback_data: 'kb:l:home' }]);
  return { text: ['🗂 <b>Library by category</b>', '', '<i>New categories can be added from any item’s 🗂 Category button.</i>'].join('\n'), buttons };
}

async function clientItemsScreen(key: string): Promise<OutgoingMessage> {
  const ctx = await libraryContext();
  const items = await listKnowledge({ limit: 10, ...(key === 'p' ? { personal: true } : { clientId: key }) });
  const title = key === 'p' ? '🏠 Personal' : key === '-' ? '🏢 Agency / no client' : `💼 ${h(ctx.clients.find((c) => c.id === key)?.name || 'Client')}`;
  return listMessage(title, items, ctx, 'kb:l:c');
}

async function categoryItemsScreen(categoryId: string): Promise<OutgoingMessage> {
  const ctx = await libraryContext();
  const items = await listKnowledge({ limit: 10, categoryId });
  return listMessage(categoryLabel(ctx, categoryId), items, ctx, 'kb:l:g');
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
      const ctx = await libraryContext();
      const screen =
        id === 'recent'
          ? listMessage('🕘 Recently saved', await listKnowledge({ limit: 10 }), ctx, 'kb:l:home')
          : id === 'c'
            ? key
              ? await clientItemsScreen(key)
              : await clientsScreen()
            : id === 'g'
              ? key
                ? await categoryItemsScreen(key)
                : await categoriesScreen()
              : await libraryHomeScreen();
      if (query.message?.photo) await sendMessage(chatId, screen);
      else await editMessage(chatId, messageId, screen);
      return answerCallback(query.id);
    }

    const [item, ctx] = await Promise.all([getKnowledge(id), libraryContext()]);
    if (!item) return answerCallback(query.id, 'Not found.');

    if (action === 'o') {
      await answerCallback(query.id);
      if (item.type === 'screenshot' && item.telegram_file_id) {
        await sendPhoto(chatId, item.telegram_file_id, itemCard(item, ctx, undefined, 1024));
      } else {
        await sendMessage(chatId, itemCard(item, ctx));
      }
      return;
    }
    if (action === 'p') {
      await sendMessage(chatId, categoryQuestion(item, ctx, false));
      return answerCallback(query.id);
    }
    if (action === 'c') {
      const category = ctx.categories.find((c) => c.id === key);
      if (!category) return answerCallback(query.id, 'That category no longer exists.');
      const updated = await setItemCategory(item.id, category.id);
      await editMessage(chatId, messageId, { text: `🗂 “${h(truncate(updated.title, 60))}” is in ${categoryLabel(ctx, category.id)}.` });
      return answerCallback(query.id, 'Saved');
    }
    if (action === 'n') {
      await sendMessage(chatId, {
        text: [`➕ Name the new category for “<b>${h(truncate(item.title, 60))}</b>”:`, '<i>e.g. “Ramadan”, “Pricing”, “Video editing”</i>', `<code>kcat:${item.id}</code>`].join('\n'),
        forceReply: true,
        placeholder: 'New category name…',
      });
      return answerCallback(query.id);
    }
    if (action === 's') {
      await answerCallback(query.id, 'Looking for similar items…');
      const similar = await similarKnowledge(item);
      await sendMessage(chatId, listMessage(`🔎 Similar to “${h(truncate(item.title, 50))}”`, similar, ctx, 'kb:l:home', 'Nothing similar yet.'));
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
      await editCard(query, itemCard(updated, ctx, action === 'r' ? '♻️ <b>Back in the library</b>' : undefined, query.message?.photo ? 1024 : 3500));
      return answerCallback(query.id, action === 'u' ? 'Removed' : 'Restored');
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Library button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}
