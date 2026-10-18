import { listClientProfiles } from './admin-ops';
import { QUESTION_TEXT, understandTaskMessage, type TaskClient } from './task-ai';
import {
  WEEKDAYS,
  activeDraft,
  addDays,
  addMonths,
  cairoParts,
  cairoToday,
  completeTask,
  createTask,
  deleteDraft,
  describeRepeat,
  fieldsFromTask,
  formatDate,
  formatTime,
  formatWhen,
  getDraft,
  getTask,
  groupTasks,
  listOpenTasks,
  missingFields,
  newId,
  saveDraft,
  setTaskStatus,
  updateTaskFields,
  weekdayOf,
  type MissingField,
  type Task,
  type TaskFields,
  type TaskListKey,
} from './tasks';
import { InlineButton, OutgoingMessage, answerCallback, editMessage, escapeHtml as h, sendMessage, telegram, truncate } from './telegram';

// Tasks in the bot: any message that isn't a menu word or a review/comment edit is read by
// the AI. Complete items are saved at once with Undo/Edit; otherwise the bot asks for the
// missing parts one question at a time (buttons or a typed answer).
// Button data: "tk:<action>:<id>[:<field>:<value>]".

interface IncomingMessage {
  text?: string;
  caption?: string;
  chat: { id: number };
  reply_to_message?: { text?: string };
  voice?: unknown;
  audio?: unknown;
  photo?: unknown;
  document?: unknown;
  video?: unknown;
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

const MENU_WORDS = new Set(['x', 'menu', 'm', 'start', 'help', '/start', '/menu', '/help']);

async function taskClients(): Promise<TaskClient[]> {
  return (await listClientProfiles())
    .filter((c) => c.id && c.brandName)
    .map((c) => ({ id: c.id!, name: c.brandName, owner: c.ownerName || undefined }));
}

function clientName(clients: TaskClient[], id: string | null | undefined) {
  return id ? clients.find((c) => c.id === id)?.name || 'Client' : null;
}

function typing(chatId: number | string) {
  return telegram('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => undefined);
}

// ---------- Cards ----------

function categoryLine(category: TaskFields['category'], client: string | null) {
  if (category === 'personal') return '🏠 Personal';
  if (category === 'work') return client ? `💼 ${h(client)}` : '💼 Work';
  return null;
}

function remindText(minutes: number) {
  if (!minutes) return '';
  if (minutes % 1440 === 0) return ` · reminder ${minutes / 1440} day${minutes === 1440 ? '' : 's'} before`;
  if (minutes % 60 === 0) return ` · reminder ${minutes / 60} h before`;
  return ` · reminder ${minutes} min before`;
}

function taskLines(task: Task, clients: TaskClient[]) {
  return [
    `<b>${h(task.title)}</b>`,
    categoryLine(task.category, clientName(clients, task.client_id)),
    `📅 ${formatWhen(task)}${task.due_at && !task.all_day ? remindText(task.remind_before_min) : ''}`,
    task.repeat_rule ? `🔁 ${describeRepeat(task.repeat_rule, task.repeat_until, task.repeat_count)}` : null,
    task.priority === 'high' ? '🔴 High priority' : task.priority === 'low' ? '⚪ Low priority' : null,
    task.notes ? `📝 ${h(truncate(task.notes, 400))}` : null,
  ].filter(Boolean) as string[];
}

function taskCard(task: Task, clients: TaskClient[], header: string, opts: { justSaved?: boolean } = {}): OutgoingMessage {
  if (task.status === 'cancelled') {
    return { text: [`↩️ <b>Removed</b>`, '', ...taskLines(task, clients)].join('\n'), buttons: [[{ text: '♻️ Restore', callback_data: `tk:r:${task.id}` }]] };
  }
  if (task.status === 'done') {
    return { text: [`✅ <b>Done</b>`, '', ...taskLines(task, clients)].join('\n'), buttons: [[{ text: '♻️ Reopen', callback_data: `tk:r:${task.id}` }]] };
  }
  return {
    text: [header, '', ...taskLines(task, clients)].join('\n'),
    buttons: [
      [
        { text: '✅ Done', callback_data: `tk:d:${task.id}` },
        { text: '✏️ Edit', callback_data: `tk:e:${task.id}` },
        { text: opts.justSaved ? '↩️ Undo' : '🗑 Remove', callback_data: `tk:u:${task.id}` },
      ],
    ],
  };
}

function draftSummary(f: TaskFields, clients: TaskClient[]) {
  const when = f.date ? `${formatDate(f.date)}${f.time ? `, ${formatTime(f.time)}` : f.allDay ? ' (all day)' : ''}` : f.noDate ? 'No date' : null;
  return [
    `📝 <b>${h(f.title || 'New task')}</b>`,
    categoryLine(f.category, clientName(clients, f.clientId)),
    when ? `📅 ${when}` : null,
    f.repeat ? `🔁 ${describeRepeat(f.repeat, f.repeatUntil, f.repeatCount)}` : null,
  ].filter(Boolean) as string[];
}

function questionButtons(draftId: string, field: MissingField, f: TaskFields, clients: TaskClient[]): InlineButton[][] {
  const a = (key: string, value: string) => `tk:a:${draftId}:${key}:${value}`;
  if (field === 'category') {
    return [[{ text: '💼 Work', callback_data: a('cat', 'w') }, { text: '🏠 Personal', callback_data: a('cat', 'p') }]];
  }
  if (field === 'client') {
    const rows: InlineButton[][] = [];
    const usable = clients.filter((c) => a('cl', c.id).length <= 64).slice(0, 24);
    for (let i = 0; i < usable.length; i += 2) rows.push(usable.slice(i, i + 2).map((c) => ({ text: truncate(c.name, 28), callback_data: a('cl', c.id) })));
    rows.push([{ text: '🏢 No specific client', callback_data: a('cl', '-') }, { text: '🏠 Personal instead', callback_data: a('cat', 'p') }]);
    return rows;
  }
  if (field === 'when') {
    const today = cairoToday();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const label = (d: string, i: number) => (i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS[weekdayOf(d)]} ${Number(d.slice(8))}`);
    const buttons = days.map((d, i) => ({ text: label(d, i), callback_data: a('dt', d.replace(/-/g, '')) }));
    const rows = [buttons.slice(0, 2), buttons.slice(2, 5), buttons.slice(5)];
    if (!f.repeat) rows.push([{ text: '📝 No date', callback_data: a('dt', 'none') }]);
    return rows;
  }
  if (field === 'time') {
    const times = ['09:00', '11:00', '13:00', '15:00', '17:00', '20:00'];
    const buttons = times.map((t) => ({ text: formatTime(t).replace(':00', ''), callback_data: a('tm', t.replace(':', '')) }));
    return [buttons.slice(0, 3), buttons.slice(3), [{ text: '🗓 All day', callback_data: a('tm', 'all') }]];
  }
  return [
    [
      { text: '♾ Forever', callback_data: a('re', 'f') },
      { text: '1 month', callback_data: a('re', '1') },
      { text: '3 months', callback_data: a('re', '3') },
    ],
    [
      { text: '6 months', callback_data: a('re', '6') },
      { text: '1 year', callback_data: a('re', '12') },
    ],
  ];
}

function questionMessage(draftId: string, field: MissingField, f: TaskFields, clients: TaskClient[], note?: string): OutgoingMessage {
  const buttons = questionButtons(draftId, field, f, clients);
  buttons.push([{ text: '✖️ Cancel', callback_data: `tk:x:${draftId}` }]);
  return {
    text: [
      ...draftSummary(f, clients),
      '',
      ...(note ? [note] : []),
      `❓ <b>${QUESTION_TEXT[field]}</b>`,
      '<i>Tap a button or type the answer.</i>',
    ].join('\n'),
    buttons,
  };
}

// ---------- Saving or asking ----------

/** Saves the item when nothing is missing, otherwise stores the draft and asks the next question. */
async function proceed(
  chatId: number,
  fields: TaskFields,
  clients: TaskClient[],
  ctx: { draftId?: string; rawInput?: string | null; ai?: unknown; note?: string; editMessageId?: number }
) {
  const show = (message: OutgoingMessage) => (ctx.editMessageId ? editMessage(chatId, ctx.editMessageId, message) : sendMessage(chatId, message));
  const missing = missingFields(fields);

  if (!missing.length) {
    if (ctx.draftId) await deleteDraft(ctx.draftId);
    if (fields.editTaskId) {
      const task = await updateTaskFields(fields.editTaskId, fields);
      return show(taskCard(task, clients, '✏️ <b>Updated</b>'));
    }
    const task = await createTask(fields, { chatId: String(chatId), source: 'text', rawInput: ctx.rawInput, ai: ctx.ai });
    return show(taskCard(task, clients, '✅ <b>Saved</b>', { justSaved: true }));
  }

  const draft = await saveDraft({
    id: ctx.draftId || newId(),
    chat_id: String(chatId),
    fields,
    missing,
    asking: missing[0],
    raw_input: ctx.rawInput ?? null,
    source: 'text',
  });
  return show(questionMessage(draft.id, missing[0], fields, clients, ctx.note));
}

function unknownClientNote(name: string | null) {
  return name ? `🤔 <i>“${h(name)}” isn't in the client list. Pick one, or choose “No specific client”.</i>` : undefined;
}

async function startNewItem(chatId: number, text: string, clients: TaskClient[]) {
  const result = await understandTaskMessage(text, clients);
  if (result.intent === 'chat') {
    await sendMessage(chatId, {
      text: [
        'Send me anything you need to do and I’ll save it, e.g.',
        '• <i>Call Mona from Bake House Thursday 4pm</i>',
        '• <i>Pay the internet bill on the 1st of every month</i>',
        '• <i>اجتماع مع العميل بكرة الساعة ١١</i>',
        '',
        'Type <b>x</b> for the menu.',
      ].join('\n'),
      buttons: [[{ text: '✅ My tasks', callback_data: 'tk:l:home' }]],
    });
    return;
  }
  if (result.intent === 'knowledge') {
    // The knowledge library comes in a later phase; until then nothing is saved silently.
    await sendMessage(chatId, {
      text: '📚 That looks like something to keep for later, not a task. The knowledge library is coming soon. To save it as a task anyway, add what to do, e.g. “read this tomorrow”.',
    });
    return;
  }
  await proceed(chatId, result.fields, clients, { rawInput: text, ai: result.raw, note: unknownClientNote(result.clientMentioned) });
}

// ---------- Messages ----------

/** Handles task messages; false lets the webhook show the menu instead. */
export async function handleTaskMessage(message: IncomingMessage): Promise<boolean> {
  const chatId = message.chat.id;
  const text = (message.text || message.caption || '').trim();

  if (!text) {
    if (message.voice || message.audio || message.photo || message.document || message.video) {
      await sendMessage(chatId, { text: '🎙 Voice notes, screenshots and files are coming next. For now, please type it as text.' });
      return true;
    }
    return false;
  }
  if (MENU_WORDS.has(text.toLowerCase())) return false;

  const command = text.split(/[\s@]/)[0].toLowerCase();
  if (command.startsWith('/')) {
    if (command === '/tasks') {
      await sendMessage(chatId, await tasksHomeScreen());
      return true;
    }
    if (command === '/today') {
      await sendMessage(chatId, await taskListScreen('today'));
      return true;
    }
    return false;
  }

  try {
    await typing(chatId);
    const clients = await taskClients();

    // A reply to an "Edit" prompt changes that saved task.
    const editRef = message.reply_to_message?.text?.match(/tid:([A-Za-z0-9_-]{8})/);
    if (editRef) {
      const task = await getTask(editRef[1]);
      if (!task) {
        await sendMessage(chatId, { text: 'Task not found.' });
        return true;
      }
      const result = await understandTaskMessage(text, clients, { current: fieldsFromTask(task) });
      await proceed(chatId, { ...result.fields, editTaskId: task.id }, clients, { note: unknownClientNote(result.clientMentioned) });
      return true;
    }

    // Otherwise a typed answer to the open question, if there is one.
    const draft = await activeDraft(String(chatId));
    if (draft) {
      const result = await understandTaskMessage(text, clients, { current: draft.fields, asking: draft.asking });
      if (!result.separate) {
        const fields = { ...result.fields, editTaskId: draft.fields.editTaskId };
        await proceed(chatId, fields, clients, { draftId: draft.id, rawInput: [draft.raw_input, text].filter(Boolean).join('\n'), ai: result.raw, note: unknownClientNote(result.clientMentioned) });
        return true;
      }
      await deleteDraft(draft.id);
      await sendMessage(chatId, { text: `<i>Left the unfinished “${h(draft.fields.title || 'task')}” aside.</i>` });
    }

    await startNewItem(chatId, text, clients);
  } catch (error) {
    console.error('Task message failed:', error);
    await sendMessage(chatId, { text: '⚠️ I couldn’t read that right now (the AI may be busy). Please send it again in a minute.' });
  }
  return true;
}

// ---------- Buttons ----------

function applyAnswer(f: TaskFields, key: string, value: string): TaskFields | null {
  if (key === 'cat') return value === 'w' ? { ...f, category: 'work' } : { ...f, category: 'personal', clientId: null, noClient: false };
  if (key === 'cl') return value === '-' ? { ...f, category: 'work', clientId: null, noClient: true } : { ...f, category: 'work', clientId: value, noClient: false };
  if (key === 'dt') {
    if (value === 'none') return { ...f, date: null, time: null, allDay: false, noDate: true };
    if (!/^\d{8}$/.test(value)) return null;
    return { ...f, date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`, noDate: false };
  }
  if (key === 'tm') {
    if (value === 'all') return { ...f, time: null, allDay: true };
    if (!/^\d{4}$/.test(value)) return null;
    return { ...f, time: `${value.slice(0, 2)}:${value.slice(2)}`, allDay: false };
  }
  if (key === 're') {
    if (value === 'f') return { ...f, repeatForever: true, repeatUntil: null, repeatCount: null };
    const months = Number(value);
    if (!months || !f.date) return null;
    return { ...f, repeatForever: false, repeatUntil: addMonths(f.date, months), repeatCount: null };
  }
  return null;
}

export async function handleTaskCallback(query: CallbackQuery) {
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;
  if (!chatId || !messageId) return answerCallback(query.id);
  const [, action, id, key, ...rest] = (query.data || '').split(':');
  const value = rest.join(':');

  try {
    if (action === 'l') {
      // tk:l:home, tk:l:<list>, tk:l:c (clients), tk:l:c:<clientId>
      const screen =
        id === 'c' ? (key ? await clientTasksScreen(key) : await clientsScreen()) : id === 'home' || !id ? await tasksHomeScreen() : await taskListScreen(id as TaskListKey);
      await editMessage(chatId, messageId, screen);
      return answerCallback(query.id);
    }

    const clients = await taskClients();

    if (action === 'a' || action === 'x') {
      const draft = await getDraft(id);
      if (!draft) {
        await editMessage(chatId, messageId, { text: '<i>This question has expired. Send the task again.</i>' });
        return answerCallback(query.id);
      }
      if (action === 'x') {
        await deleteDraft(draft.id);
        await editMessage(chatId, messageId, { text: `✖️ <i>Cancelled “${h(draft.fields.title || 'task')}”.</i>` });
        return answerCallback(query.id, 'Cancelled');
      }
      const fields = applyAnswer(draft.fields, key, value);
      if (!fields) return answerCallback(query.id, 'That option no longer works.');
      await proceed(chatId, fields, clients, { draftId: draft.id, rawInput: draft.raw_input, editMessageId: messageId });
      return answerCallback(query.id);
    }

    const task = await getTask(id);
    if (!task) {
      await editMessage(chatId, messageId, { text: '<i>Task not found.</i>' });
      return answerCallback(query.id);
    }

    if (action === 'o') {
      await sendMessage(chatId, taskCard(task, clients, '📌 <b>Task</b>'));
      return answerCallback(query.id);
    }
    if (action === 'd') {
      const { task: updated, movedTo } = await completeTask(task.id);
      const header = movedTo ? `✅ <b>Done.</b> Next one: ${formatWhen(updated)}` : '✅ <b>Done</b>';
      await editMessage(chatId, messageId, taskCard(updated, clients, header));
      return answerCallback(query.id, 'Done');
    }
    if (action === 'u') {
      await editMessage(chatId, messageId, taskCard(await setTaskStatus(task.id, 'cancelled'), clients, ''));
      return answerCallback(query.id, 'Removed');
    }
    if (action === 'r') {
      await editMessage(chatId, messageId, taskCard(await setTaskStatus(task.id, 'open'), clients, '♻️ <b>Back on the list</b>'));
      return answerCallback(query.id, 'Restored');
    }
    if (action === 'e') {
      await sendMessage(chatId, {
        text: [
          `✏️ What should change for “<b>${h(task.title)}</b>”?`,
          '<i>e.g. “move it to Thursday 5pm”, “it’s for Bake House”, “every Monday for 3 months”, “rename to …”</i>',
          `<code>tid:${task.id}</code>`,
        ].join('\n'),
        forceReply: true,
        placeholder: 'What should change…',
      });
      return answerCallback(query.id);
    }
    return answerCallback(query.id);
  } catch (error) {
    console.error('Task button failed:', error);
    return answerCallback(query.id, 'Something went wrong. Try again.');
  }
}

// ---------- Lists ----------

const LIST_TITLES: Record<TaskListKey, string> = {
  today: '📅 Today',
  overdue: '⚠️ Overdue',
  week: '🗓 Next 7 days',
  nodate: '📝 No date',
};

/** "3:00 PM" today, "Thu 23 Oct, 3:00 PM" otherwise. */
function shortWhen(task: Task) {
  if (!task.due_at) return '';
  const { date, time } = cairoParts(new Date(task.due_at));
  if (date === cairoToday()) return task.all_day ? 'All day' : formatTime(time);
  return formatWhen(task);
}

function listMessage(title: string, tasks: Task[], clients: TaskClient[], back: string): OutgoingMessage {
  const shown = tasks.slice(0, 10);
  const lines = shown.map((t, i) => {
    const when = shortWhen(t);
    const client = clientName(clients, t.client_id);
    return `${i + 1}. ${when ? `${when} · ` : ''}${h(t.title)}${client ? ` — <i>${h(client)}</i>` : t.category === 'personal' ? ' 🏠' : ''}${t.repeat_rule ? ' 🔁' : ''}${t.priority === 'high' ? ' 🔴' : ''}`;
  });
  const buttons: InlineButton[][] = shown.map((t, i) => [{ text: `${i + 1}. ${truncate(t.title, 40)}`, callback_data: `tk:o:${t.id}` }]);
  buttons.push([{ text: '⬅️ Back', callback_data: back }]);
  return {
    text: [
      `<b>${title}</b>`,
      '',
      ...(lines.length ? lines : ['<i>Nothing here.</i>']),
      ...(tasks.length > shown.length ? ['', `<i>+${tasks.length - shown.length} more</i>`] : []),
      ...(lines.length ? ['', '<i>Tap a task to mark it done, edit or remove it.</i>'] : []),
    ].join('\n'),
    buttons,
  };
}

export async function taskCounts() {
  const groups = groupTasks(await listOpenTasks());
  return { today: groups.today.length, overdue: groups.overdue.length, week: groups.week.length, nodate: groups.nodate.length };
}

export async function tasksHomeScreen(): Promise<OutgoingMessage> {
  const c = await taskCounts();
  return {
    text: [
      '✅ <b>Tasks</b>',
      `Today: ${c.today} · Overdue: ${c.overdue} · Next 7 days: ${c.week} · No date: ${c.nodate}`,
      '',
      '<i>To add one, just send me a message, e.g. “Call Mona from Bake House Thursday 4pm”.</i>',
    ].join('\n'),
    buttons: [
      [
        { text: `📅 Today (${c.today})`, callback_data: 'tk:l:today' },
        { text: `⚠️ Overdue (${c.overdue})`, callback_data: 'tk:l:overdue' },
      ],
      [
        { text: `🗓 Next 7 days (${c.week})`, callback_data: 'tk:l:week' },
        { text: `📝 No date (${c.nodate})`, callback_data: 'tk:l:nodate' },
      ],
      [{ text: '👥 By client', callback_data: 'tk:l:c' }],
      [{ text: '⬅️ Back to menu', callback_data: 'm:home' }],
    ],
  };
}

export async function taskListScreen(key: TaskListKey): Promise<OutgoingMessage> {
  if (!LIST_TITLES[key]) return tasksHomeScreen();
  const [tasks, clients] = await Promise.all([listOpenTasks(), taskClients()]);
  return listMessage(LIST_TITLES[key], groupTasks(tasks)[key], clients, 'tk:l:home');
}

async function clientsScreen(): Promise<OutgoingMessage> {
  const [tasks, clients] = await Promise.all([listOpenTasks(), taskClients()]);
  const counts = new Map<string, number>();
  for (const t of tasks) if (t.category === 'work') counts.set(t.client_id || '-', (counts.get(t.client_id || '-') || 0) + 1);
  const withTasks = clients.filter((c) => counts.get(c.id));
  const buttons: InlineButton[][] = withTasks.map((c) => [{ text: `${truncate(c.name, 36)} (${counts.get(c.id)})`, callback_data: `tk:l:c:${c.id}` }]);
  if (counts.get('-')) buttons.push([{ text: `🏢 Agency / no client (${counts.get('-')})`, callback_data: 'tk:l:c:-' }]);
  const personal = tasks.filter((t) => t.category === 'personal').length;
  if (personal) buttons.push([{ text: `🏠 Personal (${personal})`, callback_data: 'tk:l:c:p' }]);
  buttons.push([{ text: '⬅️ Back', callback_data: 'tk:l:home' }]);
  return { text: ['👥 <b>Open tasks by client</b>', '', buttons.length > 1 ? '<i>Pick one.</i>' : '<i>No open tasks.</i>'].join('\n'), buttons };
}

async function clientTasksScreen(clientId: string): Promise<OutgoingMessage> {
  const [tasks, clients] = await Promise.all([listOpenTasks(), taskClients()]);
  const picked =
    clientId === 'p'
      ? tasks.filter((t) => t.category === 'personal')
      : tasks.filter((t) => t.category === 'work' && (t.client_id || '-') === clientId);
  const title = clientId === 'p' ? '🏠 Personal' : clientId === '-' ? '🏢 Agency / no client' : `💼 ${h(clientName(clients, clientId) || 'Client')}`;
  return listMessage(title, picked, clients, 'tk:l:c');
}
