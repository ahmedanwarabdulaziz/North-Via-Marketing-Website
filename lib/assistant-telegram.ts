import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { CHAT_MODELS, askAssistant, availableChatModels, claimsDone, type AssistantAction, type ChatMessage, type ChatModel } from './assistant';
import { addDoc } from './data/store';
import { supabase } from './supabase';
import { startTaskFromText } from './task-telegram';
import { InlineButton, OutgoingMessage, answerCallback, editMessage, escapeHtml as h, sendMessage, telegram, truncate } from './telegram';
import { addWebsite, listClientWebsites, runWebsiteChecks } from './website-monitor';

// Chatting with the bot. A question (typed or spoken) opens a conversation: the bot first asks
// which model to use (only ones with free quota left), then answers from the library, tasks and
// clients. The chat stays open 30 minutes after the last message, or until "End chat".
// Button data: "ch:<action>:<session id>[:<value>]".

interface ChatSession {
  id: string;
  chat_id: string;
  provider: string | null;
  model: string | null;
  status: 'active' | 'ended';
  pending_question: string | null;
  messages: ChatMessage[];
  updated_at: string;
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

const IDLE_MS = 30 * 60_000;
const KEEP_MESSAGES = 12;

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function modelByKey(key: string | null | undefined) {
  return CHAT_MODELS.find((m) => m.key === key) || null;
}

function modelOf(session: ChatSession) {
  return CHAT_MODELS.find((m) => m.model === session.model) || null;
}

// ---------- Sessions ----------

/** The chat's open conversation, if a message came in the last 30 minutes. */
export async function activeChatSession(chatId: number | string) {
  return check(
    await supabase
      .from('chat_sessions')
      .select()
      .eq('chat_id', String(chatId))
      .eq('status', 'active')
      .gte('updated_at', new Date(Date.now() - IDLE_MS).toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ) as ChatSession | null;
}

async function getSession(id: string) {
  return check(await supabase.from('chat_sessions').select().eq('id', id).maybeSingle()) as ChatSession | null;
}

async function updateSession(id: string, patch: Partial<ChatSession>) {
  return check(await supabase.from('chat_sessions').update(patch).eq('id', id).select().single()) as ChatSession;
}

async function endOpenSessions(chatId: number | string) {
  const { error } = await supabase.from('chat_sessions').update({ status: 'ended' }).eq('chat_id', String(chatId)).eq('status', 'active');
  if (error) console.error('Ending chats failed:', error.message);
}

// ---------- Messages ----------

/** The model's light markdown (**bold**, "- " bullets) as Telegram HTML. */
function toTelegramHtml(text: string) {
  return h(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^#+\s*(.+)$/gm, '<b>$1</b>');
}

async function modelPicker(sessionId: string, intro: string): Promise<OutgoingMessage> {
  const models = await availableChatModels();
  const buttons: InlineButton[][] = models.map((m) => [
    {
      text: `${m.provider === 'groq' ? '⚡' : '✨'} ${m.label} · ${m.requestsLeft !== null ? `${m.requestsLeft} left today` : m.note}${m.warning ? ' ⚠️' : ''}`,
      callback_data: `ch:m:${sessionId}:${m.key}`,
    },
  ]);
  buttons.push([{ text: '✖️ Cancel', callback_data: `ch:e:${sessionId}` }]);
  return {
    text: [
      intro,
      '',
      models.length ? '🤖 <b>Which model should answer?</b>' : '⚠️ <b>No model has free quota left right now.</b> Try again later.',
      models.length ? '<i>Only models with free quota left today are listed. ⚡ Groq (the number is what’s left today) · ✨ Gemini</i>' : '',
    ]
      .filter(Boolean)
      .join('\n'),
    buttons,
  };
}

/** Opens a conversation: ends any other, then asks which model to use. */
export async function startConversation(chatId: number, question: string | null) {
  await endOpenSessions(chatId);
  const session = check(
    await supabase
      .from('chat_sessions')
      .insert({ id: crypto.randomBytes(6).toString('base64url'), chat_id: String(chatId), pending_question: question })
      .select()
      .single()
  ) as ChatSession;
  const intro = question ? `💬 <b>Let’s talk.</b> I’ll answer from your library, tasks and clients.\n<i>“${h(truncate(question, 200))}”</i>` : '💬 <b>Let’s talk.</b> Ask me anything about your tasks, clients or library.';
  await sendMessage(chatId, await modelPicker(session.id, intro));
}

export async function endConversation(chatId: number) {
  const session = await activeChatSession(chatId);
  await endOpenSessions(chatId);
  await sendMessage(chatId, { text: session ? '👋 Chat ended. Messages go back to tasks and the library.' : 'There’s no open chat. Ask me a question to start one.' });
}

async function answer(chatId: number, session: ChatSession, question: string) {
  const chosen = modelOf(session);
  if (!chosen) {
    await sendMessage(chatId, await modelPicker(session.id, '💬 Pick a model first:'));
    return;
  }
  await telegram('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => undefined);
  const history = session.messages || [];
  let reply;
  try {
    reply = await askAssistant(chosen, question, history);
  } catch (error) {
    console.error('Assistant failed:', error);
    await sendMessage(chatId, {
      text: '⚠️ No model could answer right now (busy or out of quota). Try again in a minute, or switch model.',
      buttons: [[{ text: '🔁 Switch model', callback_data: `ch:s:${session.id}` }, { text: '✖️ End chat', callback_data: `ch:e:${session.id}` }]],
    });
    return;
  }

  const now = new Date().toISOString();
  const messages: ChatMessage[] = [
    ...history,
    { role: 'user' as const, content: question, at: now },
    {
      role: 'assistant' as const,
      // The history says plainly that proposals aren't done yet, so the model can't later assume they were.
      content: [reply.text, ...reply.actions.map((a) => `[PROPOSED, not done yet: ${actionSummary(a)}]`)].filter(Boolean).join('\n'),
      at: now,
      actions: reply.actions,
    },
  ].slice(-KEEP_MESSAGES);
  // Switch to the model that answered, so the next turn doesn't wait on the busy one again.
  await updateSession(session.id, { messages, model: reply.usedModel.model, provider: reply.usedModel.provider, pending_question: null });

  const msgIndex = messages.length - 1;
  const buttons: InlineButton[][] = reply.actions.map((a, i) => [{ text: actionButton(a), callback_data: `ch:a:${session.id}:${msgIndex}:${i}` }]);
  for (const item of reply.items.slice(0, 4)) buttons.push([{ text: `📚 ${truncate(item.title, 45)}`, callback_data: `kb:o:${item.id}` }]);
  for (const task of reply.tasks.slice(0, Math.max(0, 6 - buttons.length))) buttons.push([{ text: `📌 ${truncate(task.title, 45)}`, callback_data: `tk:o:${task.id}` }]);
  buttons.push([
    { text: '🔁 Switch model', callback_data: `ch:s:${session.id}` },
    { text: '✖️ End chat', callback_data: `ch:e:${session.id}` },
  ]);

  const footer = reply.fellBackFrom
    ? `<i>— ${h(reply.usedModel.label)} (${h(reply.fellBackFrom.label)} was busy)</i>`
    : `<i>— ${h(reply.usedModel.label)}</i>`;
  // What the bot will really do is spelled out, so a reply that sounds "done" can't mislead.
  const status = reply.actions.length
    ? `\n\n⏳ <b>Not done yet</b>. Tap ✅ to confirm:\n${reply.actions.map((a) => `• ${h(actionSummary(a))}`).join('\n')}`
    : claimsDone(reply.text) && !history.slice(-4).some((m) => m.content.startsWith('[DONE by the bot]'))
      ? '\n\n⚠️ <i>Nothing was changed. I can only change things through the ✅ buttons.</i>'
      : '';
  const body = reply.text ? toTelegramHtml(reply.text) : reply.actions.length ? 'Here’s what I can do:' : '…';
  await sendMessage(chatId, { text: `${truncate(body, 3400)}${status}\n\n${footer}`, buttons });
}

function actionSummary(a: AssistantAction) {
  if (a.type === 'task') return `Save task: ${truncate(a.text, 150)}`;
  if (a.type === 'add_client') {
    return `Add client ${a.brand}${a.owner ? ` (owner ${a.owner})` : ''}${a.website ? ` and check ${new URL(a.website).hostname} hourly` : ''}`;
  }
  return `Check website ${new URL(a.url).hostname} hourly for ${a.client}`;
}

function actionButton(a: AssistantAction) {
  if (a.type === 'task') return `✅ Save task: ${truncate(a.text, 32)}`;
  if (a.type === 'add_client') return `✅ Add client: ${truncate(a.brand, 28)}${a.website ? ' + website check' : ''}`;
  return `✅ Check website: ${truncate(new URL(a.url).hostname.replace(/^www\./, ''), 30)}`;
}

function findClient(clients: Array<{ id?: string; brandName: string }>, name: string) {
  const key = name.trim().toLowerCase();
  return clients.find((c) => c.brandName.trim().toLowerCase() === key) || clients.find((c) => c.brandName.toLowerCase().includes(key) || key.includes(c.brandName.toLowerCase()));
}

/** Starts the hourly check for a site and reads its first status. */
async function addSiteCheck(clientId: string, url: string, label?: string | null) {
  const site = await addWebsite({ clientId, url, label: label || undefined });
  await runWebsiteChecks({ ids: [site.id] }).catch((error) => console.error('First website check failed:', error));
  const checked = (await listClientWebsites(clientId)).find((s) => s.id === site.id);
  const status = checked?.status === 'up' ? `🟢 up${checked.lastResponseMs ? ` (${(checked.lastResponseMs / 1000).toFixed(1)}s)` : ''}` : checked?.status === 'down' ? '🔴 down right now' : 'first check pending';
  return `🌐 ${new URL(site.url).hostname} is now checked every hour: ${status}.`;
}

/** Runs one confirmed action for real and says exactly what happened. */
async function runAction(chatId: number, a: AssistantAction): Promise<{ ok: boolean; message: string }> {
  if (a.type === 'task') {
    await startTaskFromText(chatId, a.text, 'chat');
    return { ok: true, message: `task "${truncate(a.text, 80)}" sent to the task flow` };
  }
  const clients = await listClientProfiles();
  if (a.type === 'add_client') {
    const existing = findClient(clients, a.brand);
    if (existing && existing.brandName.trim().toLowerCase() === a.brand.trim().toLowerCase()) {
      return { ok: false, message: `${existing.brandName} is already a client, nothing added` };
    }
    const now = new Date().toISOString();
    const id = await addDoc('clients', {
      brandName: a.brand,
      ownerName: a.owner || '',
      email: a.email || '',
      mobileNumber: a.phone || '',
      websiteUrl: a.website || '',
      createdAt: now,
      updatedAt: now,
    });
    const lines = [`✅ Added client <b>${h(a.brand)}</b>${a.owner ? ` (owner ${h(a.owner)})` : ''}.`];
    if (a.website) {
      try {
        lines.push(h(await addSiteCheck(id, a.website)));
      } catch (error) {
        lines.push(`⚠️ The website check wasn’t added: ${h(error instanceof Error ? error.message : String(error))}`);
      }
    }
    await sendMessage(chatId, { text: lines.join('\n') });
    return { ok: true, message: `added client ${a.brand} (id ${id})${a.website ? ` with website ${a.website}` : ''}` };
  }
  const client = findClient(clients, a.client);
  if (!client?.id) return { ok: false, message: `no client named "${a.client}", so the website wasn't added. Add the client first` };
  try {
    const text = await addSiteCheck(client.id, a.url, a.label);
    await sendMessage(chatId, { text: `✅ ${h(text)}\n<i>Client: ${h(client.brandName)}</i>` });
    return { ok: true, message: `website ${a.url} added to the hourly checks for ${client.brandName}` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** A message inside an open conversation. */
export async function handleChatMessage(chatId: number, session: ChatSession, text: string) {
  if (!session.model) {
    // Still choosing a model: keep the newest question for when one is picked.
    await updateSession(session.id, { pending_question: [session.pending_question, text].filter(Boolean).join('\n') });
    await sendMessage(chatId, { text: '👆 Pick a model above first, then I’ll answer.' });
    return;
  }
  await answer(chatId, session, text);
}

// ---------- Buttons ----------

export async function handleChatCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, id, value] = (query.data || '').split(':');

  try {
    const session = await getSession(id);
    if (!session) return answerCallback(query.id, 'This chat has expired.');

    if (action === 'm') {
      const model: ChatModel | null = modelByKey(value);
      if (!model) return answerCallback(query.id, 'Unknown model.');
      const updated = await updateSession(session.id, { model: model.model, provider: model.provider, status: 'active' });
      await editMessage(chatId, messageId, { text: `💬 Chatting with <b>${h(model.label)}</b>. Ask me anything; tap ✖️ End chat when you’re done.` });
      await answerCallback(query.id, model.label);
      if (updated.pending_question) await answer(chatId, updated, updated.pending_question);
      return;
    }
    if (action === 's') {
      await updateSession(session.id, { model: null, provider: null, status: 'active' });
      await sendMessage(chatId, await modelPicker(session.id, '🔁 Switch model. The conversation so far is kept.'));
      return answerCallback(query.id);
    }
    if (action === 'e') {
      await updateSession(session.id, { status: 'ended' });
      await editMessage(chatId, messageId, { text: '👋 Chat ended. Messages go back to tasks and the library.' });
      return answerCallback(query.id, 'Chat ended');
    }
    if (action === 'a') {
      // ch:a:<session>:<message index>:<action index>
      const [, , , msgIndex, actionIndex] = (query.data || '').split(':');
      const messages = session.messages || [];
      const proposed = messages[Number(msgIndex)]?.actions?.[Number(actionIndex)];
      if (!proposed) return answerCallback(query.id, 'That suggestion is no longer available.');
      if (proposed.done) return answerCallback(query.id, 'Already done.');
      await answerCallback(query.id, 'Working on it…');
      let outcome: { ok: boolean; message: string };
      try {
        outcome = await runAction(chatId, proposed);
      } catch (error) {
        console.error('Chat action failed:', error);
        outcome = { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
      if (!outcome.ok) await sendMessage(chatId, { text: `⚠️ Not done: ${h(outcome.message)}.` });
      // The real outcome goes into the conversation, so later answers can't contradict it.
      if (outcome.ok) messages[Number(msgIndex)].actions![Number(actionIndex)].done = true;
      messages.push({ role: 'assistant', content: `${outcome.ok ? '[DONE by the bot]' : '[FAILED]'} ${outcome.message}`, at: new Date().toISOString() });
      await updateSession(session.id, { messages: messages.slice(-KEEP_MESSAGES) });
      return;
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Chat button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}
