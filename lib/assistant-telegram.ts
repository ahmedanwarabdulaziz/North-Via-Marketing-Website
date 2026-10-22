import crypto from 'crypto';
import { listClientProfiles } from './admin-ops';
import { CHAT_MODELS, CLIENT_FIELDS, actionSummary, askAssistant, availableChatModels, claimsDone, type AssistantAction, type ChatMessage, type ChatModel, type ClientField } from './assistant';
import { addDoc, updateDoc } from './data/store';
import { supabase } from './supabase';
import { completeTask, formatWhen } from './tasks';
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
      actions: reply.actions.map((a) => ({ ...a, id: crypto.randomBytes(4).toString('base64url') })),
    },
  ].slice(-KEEP_MESSAGES);
  // Switch to the model that answered, so the next turn doesn't wait on the busy one again.
  await updateSession(session.id, { messages, model: reply.usedModel.model, provider: reply.usedModel.provider, pending_question: null });

  const buttons: InlineButton[][] = [];
  for (const item of reply.items.slice(0, 4)) buttons.push([{ text: `📚 ${truncate(item.title, 45)}`, callback_data: `kb:o:${item.id}` }]);
  for (const task of reply.tasks.slice(0, Math.max(0, 5 - buttons.length))) buttons.push([{ text: `📌 ${truncate(task.title, 45)}`, callback_data: `tk:o:${task.id}` }]);
  buttons.push([
    { text: '🔁 Switch model', callback_data: `ch:s:${session.id}` },
    { text: '✖️ End chat', callback_data: `ch:e:${session.id}` },
  ]);

  const footer = reply.fellBackFrom
    ? `<i>— ${h(reply.usedModel.label)} (${h(reply.fellBackFrom.label)} was busy)</i>`
    : `<i>— ${h(reply.usedModel.label)}</i>`;
  const warning =
    !reply.actions.length && claimsDone(reply.text) && !history.slice(-4).some((m) => m.content.startsWith('[DONE by the bot]'))
      ? '\n\n⚠️ <i>Nothing was changed. Changes only happen through a ✅ Confirm card.</i>'
      : '';
  const body = reply.text ? toTelegramHtml(reply.text) : reply.actions.length ? 'Here’s what I prepared:' : '…';
  await sendMessage(chatId, { text: `${truncate(body, 3400)}${warning}\n\n${footer}`, buttons });

  // One confirmation card per change: exactly what will be saved, Confirm / Cancel.
  const proposed = messages[messages.length - 1].actions || [];
  for (const a of proposed) {
    await sendMessage(chatId, {
      text: actionCard(a),
      buttons: [
        [
          { text: '✅ Confirm', callback_data: `ch:a:${session.id}:${a.id}` },
          { text: '✖️ Cancel', callback_data: `ch:x:${session.id}:${a.id}` },
        ],
      ],
    });
  }
}

const host = (u?: string | null) => (u ? new URL(u).hostname.replace(/^www\./, '') : '');

/** The confirmation card: what will change, field by field. */
function actionCard(a: AssistantAction) {
  if (a.type === 'task') return ['📝 <b>Confirm: save a task</b>', '', h(a.text), '', '<i>The task bot reads it and asks if a date or client is missing.</i>'].join('\n');
  if (a.type === 'add_client') {
    const rows = (Object.keys(CLIENT_FIELDS) as ClientField[]).filter((k) => a.fields[k]).map((k) => `• ${CLIENT_FIELDS[k]}: <b>${h(a.fields[k]!)}</b>`);
    return [
      '➕ <b>Confirm: add a new client</b>',
      '',
      ...rows,
      ...(a.checkWebsite ? ['', `🌐 Also check ${h(host(a.fields.websiteUrl))} every hour (uptime + SSL).`] : []),
    ].join('\n');
  }
  if (a.type === 'update_client') {
    const rows = (Object.keys(a.changes) as ClientField[]).map((k) => `• ${CLIENT_FIELDS[k]}: ${a.before[k] ? `<s>${h(a.before[k]!)}</s>` : '<i>(empty)</i>'} → <b>${h(a.changes[k]!)}</b>`);
    return [`✏️ <b>Confirm: update ${h(a.clientName)}</b>`, '', ...rows].join('\n');
  }
  if (a.type === 'add_website') return [`🌐 <b>Confirm: check a website every hour</b>`, '', `• Client: <b>${h(a.clientName)}</b>`, `• Address: <b>${h(a.url)}</b>`].join('\n');
  return [`✅ <b>Confirm: mark task done</b>`, '', h(a.title)].join('\n');
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
  return `🌐 ${host(site.url)} is now checked every hour: ${status}.`;
}

/** Runs one confirmed change for real; the text says exactly what happened (Telegram HTML). */
async function runAction(chatId: number, a: AssistantAction): Promise<{ ok: boolean; message: string; card: string }> {
  if (a.type === 'task') {
    await startTaskFromText(chatId, a.text, 'chat');
    return { ok: true, message: `task "${truncate(a.text, 80)}" sent to the task bot`, card: `📝 <b>Sent to the task bot</b>\n${h(a.text)}\n<i>Its card is below.</i>` };
  }
  if (a.type === 'complete_task') {
    const { task, movedTo } = await completeTask(a.taskId);
    const text = movedTo ? `marked "${a.title}" done; next one ${formatWhen(task)}` : `marked "${a.title}" done`;
    return { ok: true, message: text, card: `✅ <b>Done:</b> ${h(a.title)}${movedTo ? `\n🔁 Next one: ${h(formatWhen(task))}` : ''}` };
  }
  const clients = await listClientProfiles();
  if (a.type === 'add_client') {
    const brand = a.fields.brandName!;
    if (clients.some((c) => c.brandName.trim().toLowerCase() === brand.toLowerCase())) {
      return { ok: false, message: `${brand} is already a client, nothing added`, card: `⚠️ <b>${h(brand)}</b> is already a client. Nothing was added.` };
    }
    const now = new Date().toISOString();
    const id = await addDoc('clients', {
      brandName: brand,
      ownerName: a.fields.ownerName || '',
      email: a.fields.email || '',
      mobileNumber: a.fields.mobileNumber || '',
      websiteUrl: a.fields.websiteUrl || '',
      facebookLink: a.fields.facebookLink || '',
      instagramLink: a.fields.instagramLink || '',
      tiktokLink: a.fields.tiktokLink || '',
      googleLink: a.fields.googleLink || '',
      createdAt: now,
      updatedAt: now,
    });
    const lines = [`✅ <b>Added client ${h(brand)}</b>${a.fields.ownerName ? ` (owner ${h(a.fields.ownerName)})` : ''}.`];
    let message = `added client ${brand} (id ${id})`;
    if (a.checkWebsite && a.fields.websiteUrl) {
      try {
        lines.push(h(await addSiteCheck(id, a.fields.websiteUrl)));
        message += ` and started the hourly check for ${a.fields.websiteUrl}`;
      } catch (error) {
        lines.push(`⚠️ The website check wasn’t added: ${h(error instanceof Error ? error.message : String(error))}`);
        message += `; the website check failed`;
      }
    }
    // Google reviews need the owner's Google sign-in, which only the panel can do.
    lines.push('⭐ To check their Google reviews, connect the Google Business Profile on the client page and tick "Monitor reviews".');
    lines.push(`<a href="https://www.northviamarketing.com/admin/clients/${encodeURIComponent(id)}">Open in the panel</a>`);
    return { ok: true, message, card: lines.join('\n') };
  }
  if (a.type === 'update_client') {
    const client = clients.find((c) => c.id === a.clientId);
    if (!client) return { ok: false, message: `client ${a.clientName} no longer exists`, card: `⚠️ ${h(a.clientName)} wasn’t found. Nothing changed.` };
    await updateDoc('clients', a.clientId, { ...a.changes, updatedAt: new Date().toISOString() });
    const rows = (Object.keys(a.changes) as ClientField[]).map((k) => `• ${CLIENT_FIELDS[k]}: <b>${h(a.changes[k]!)}</b>`);
    return {
      ok: true,
      message: `updated ${a.clientName}: ${(Object.keys(a.changes) as ClientField[]).map((k) => `${CLIENT_FIELDS[k]} = ${a.changes[k]}`).join(', ')}`,
      card: [`✅ <b>Updated ${h(a.clientName)}</b>`, ...rows].join('\n'),
    };
  }
  // add_website: the client may have been added a moment ago in this same chat.
  const client = (a.clientId && clients.find((c) => c.id === a.clientId)) || findClient(clients, a.clientName);
  if (!client?.id) {
    return { ok: false, message: `no client named "${a.clientName}", so the website wasn't added`, card: `⚠️ There’s no client named “${h(a.clientName)}”. Add the client first.` };
  }
  try {
    const text = await addSiteCheck(client.id, a.url, a.label);
    return { ok: true, message: `website ${a.url} added to the hourly checks for ${client.brandName}`, card: `✅ ${h(text)}\n<i>Client: ${h(client.brandName)}</i>` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: reason, card: `⚠️ Not added: ${h(reason)}` };
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
    if (action === 'a' || action === 'x') {
      // ch:a:<session>:<change id> confirms, ch:x:… cancels.
      const messages = session.messages || [];
      const proposed = messages.flatMap((m) => m.actions || []).find((a) => a.id === value);
      if (!proposed) {
        await editMessage(chatId, messageId, { text: '<i>This change has expired. Ask again.</i>' });
        return answerCallback(query.id);
      }
      if (proposed.done) return answerCallback(query.id, 'Already done.');
      if (proposed.cancelled) return answerCallback(query.id, 'Already cancelled.');

      if (action === 'x') {
        proposed.cancelled = true;
        messages.push({ role: 'assistant', content: `[CANCELLED by the owner] ${actionSummary(proposed)}`, at: new Date().toISOString() });
        await updateSession(session.id, { messages: messages.slice(-KEEP_MESSAGES) });
        await editMessage(chatId, messageId, { text: `✖️ <i>Cancelled: ${h(actionSummary(proposed))}</i>` });
        return answerCallback(query.id, 'Cancelled');
      }

      // Mark it before running, so a double tap can't run it twice.
      proposed.done = true;
      await updateSession(session.id, { messages });
      await answerCallback(query.id, 'Working on it…');
      let outcome: { ok: boolean; message: string; card: string };
      try {
        outcome = await runAction(chatId, proposed);
      } catch (error) {
        console.error('Chat action failed:', error);
        const reason = error instanceof Error ? error.message : String(error);
        outcome = { ok: false, message: reason, card: `⚠️ <b>Not done:</b> ${h(reason)}` };
      }
      // The real outcome goes into the conversation, so later answers can't contradict it.
      const latest = (await getSession(session.id))?.messages || messages;
      const stored = latest.flatMap((m) => m.actions || []).find((a) => a.id === value);
      if (stored) stored.done = outcome.ok;
      latest.push({ role: 'assistant', content: `${outcome.ok ? '[DONE by the bot]' : '[FAILED]'} ${outcome.message}`, at: new Date().toISOString() });
      await updateSession(session.id, { messages: latest.slice(-KEEP_MESSAGES) });
      await editMessage(chatId, messageId, {
        text: outcome.card,
        buttons: outcome.ok ? [] : [[{ text: '🔁 Try again', callback_data: `ch:a:${session.id}:${value}` }]],
      });
      return;
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Chat button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}
