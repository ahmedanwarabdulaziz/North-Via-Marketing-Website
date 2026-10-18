import crypto from 'crypto';
import { supabase } from './supabase';

// Tasks and reminders: storage, Cairo time and repeat rules.
// Times are stored in UTC; dates the user talks about ("Thursday 3 PM") are Cairo time.

export const TASK_TZ = 'Africa/Cairo';
const ALL_DAY_REMIND_HOUR = '09:00';

export type RepeatFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RepeatRule {
  freq: RepeatFreq;
  interval: number; // every N days/weeks/months/years
  weekdays?: number[]; // weekly: 0 = Sunday … 6 = Saturday
  monthDay?: number; // monthly: day of the month (clamped to short months)
}

/** What the AI and the questions fill in, before it becomes a saved task. */
export interface TaskFields {
  title?: string;
  notes?: string | null;
  kind?: 'task' | 'reminder';
  category?: 'work' | 'personal' | null;
  clientId?: string | null;
  noClient?: boolean; // work, but not for a particular client
  date?: string | null; // YYYY-MM-DD, Cairo
  time?: string | null; // HH:MM, Cairo
  allDay?: boolean;
  noDate?: boolean; // the user said there's no date
  priority?: 'low' | 'normal' | 'high';
  remindBeforeMin?: number;
  repeat?: RepeatRule | null;
  repeatUntil?: string | null; // YYYY-MM-DD
  repeatCount?: number | null;
  repeatForever?: boolean;
  editTaskId?: string; // set when the questions are for a change to a saved task
}

export type MissingField = 'category' | 'client' | 'when' | 'time' | 'repeat_end';

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  kind: 'task' | 'reminder';
  category: 'work' | 'personal';
  client_id: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'done' | 'cancelled';
  due_at: string | null;
  all_day: boolean;
  remind_before_min: number;
  remind_at: string | null;
  reminded_at: string | null;
  repeat_rule: RepeatRule | null;
  repeat_until: string | null;
  repeat_count: number | null;
  source: string;
  raw_input: string | null;
  chat_id: string | null;
  extra: Record<string, unknown>;
  created_at: string;
  done_at: string | null;
}

export interface TaskDraft {
  id: string;
  chat_id: string;
  fields: TaskFields;
  missing: MissingField[];
  asking: MissingField | null;
  raw_input: string | null;
  source: string;
  updated_at: string;
  expires_at: string;
}

export function newId() {
  return crypto.randomBytes(6).toString('base64url'); // 8 chars
}

// ---------- Cairo time ----------

/** Cairo calendar parts of an instant. */
export function cairoParts(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TASK_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function cairoToday() {
  return cairoParts(new Date()).date;
}

/** UTC instant for a Cairo wall-clock date and time (handles Egypt's summer time). */
export function cairoToUtc(date: string, time = '00:00') {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall;
  for (let i = 0; i < 2; i++) {
    const p = cairoParts(new Date(guess));
    const [py, pm, pd] = p.date.split('-').map(Number);
    const [ph, pmin] = p.time.split(':').map(Number);
    guess += wall - Date.UTC(py, pm - 1, pd, ph, pmin);
  }
  return new Date(guess);
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number, day?: number) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day ?? d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatTime(time: string) {
  const [hh, mm] = time.split(':').map(Number);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}

/** "Today, 3:00 PM", "Tomorrow (all day)", "Thu 23 Oct, 9:30 AM", "No date". */
export function formatWhen(task: Pick<Task, 'due_at' | 'all_day'>) {
  if (!task.due_at) return 'No date';
  const { date, time } = cairoParts(new Date(task.due_at));
  const today = cairoToday();
  const day = date === today ? 'Today' : date === addDays(today, 1) ? 'Tomorrow' : date === addDays(today, -1) ? 'Yesterday' : formatDate(date);
  return task.all_day ? `${day} (all day)` : `${day}, ${formatTime(time)}`;
}

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
  return `${n}${s}`;
}

/** "Every week on Sun, Tue · until 20 Jan 2027". */
export function describeRepeat(rule: RepeatRule | null | undefined, until?: string | null, count?: number | null) {
  if (!rule) return '';
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[rule.freq];
  let text = rule.interval > 1 ? `Every ${rule.interval} ${unit}s` : `Every ${unit}`;
  if (rule.freq === 'weekly' && rule.weekdays?.length) text += ` on ${rule.weekdays.map((d) => WEEKDAYS[d]).join(', ')}`;
  if (rule.freq === 'monthly' && rule.monthDay) text += ` on the ${ordinal(rule.monthDay)}`;
  if (until) text += ` · until ${formatDate(until)} ${until.slice(0, 4)}`;
  else if (count) text += ` · ${count} more time${count === 1 ? '' : 's'}`;
  return text;
}

// ---------- Repeat rules ----------

/** The occurrence after `date` (YYYY-MM-DD) for a rule, or null if the rule is broken. */
export function nextOccurrence(date: string, rule: RepeatRule) {
  const interval = Math.max(1, rule.interval || 1);
  if (rule.freq === 'daily') return addDays(date, interval);
  if (rule.freq === 'monthly') return addMonths(date, interval, rule.monthDay);
  if (rule.freq === 'yearly') return addMonths(date, 12 * interval);
  const days = rule.weekdays?.length ? rule.weekdays : [weekdayOf(date)];
  const weekStart = addDays(date, -weekdayOf(date));
  for (let i = 1; i <= 7 * interval + 7; i++) {
    const candidate = addDays(date, i);
    const weeks = Math.round((Date.parse(addDays(candidate, -weekdayOf(candidate))) - Date.parse(weekStart)) / (7 * 86_400_000));
    if (weeks % interval === 0 && days.includes(weekdayOf(candidate))) return candidate;
  }
  return null;
}

// ---------- Fields → missing questions / row ----------

/** The questions still needed before the item can be saved, in asking order. */
export function missingFields(f: TaskFields): MissingField[] {
  const missing: MissingField[] = [];
  if (!f.category) missing.push('category');
  if (f.category === 'work' && !f.clientId && !f.noClient) missing.push('client');
  if (!f.date && (!f.noDate || f.repeat)) missing.push('when');
  if (f.date && !f.time && !f.allDay) missing.push('time');
  if (f.repeat && !f.repeatUntil && !f.repeatCount && !f.repeatForever) missing.push('repeat_end');
  return missing;
}

function dueAndRemind(f: TaskFields) {
  if (!f.date) return { due_at: null, remind_at: null, all_day: false };
  const allDay = Boolean(f.allDay || !f.time);
  const due = cairoToUtc(f.date, allDay ? '00:00' : f.time!);
  const remind = allDay ? cairoToUtc(f.date, ALL_DAY_REMIND_HOUR) : new Date(due.getTime() - (f.remindBeforeMin || 0) * 60_000);
  return { due_at: due.toISOString(), remind_at: remind.toISOString(), all_day: allDay };
}

function rowFromFields(f: TaskFields) {
  const when = dueAndRemind(f);
  return {
    title: (f.title || 'Untitled').slice(0, 300),
    notes: f.notes || null,
    kind: f.kind === 'reminder' ? 'reminder' : 'task',
    category: f.category === 'work' ? 'work' : 'personal',
    client_id: f.category === 'work' ? f.clientId || null : null,
    priority: f.priority || 'normal',
    remind_before_min: f.remindBeforeMin || 0,
    ...when,
    // A reminder time that has already passed when saved counts as sent, so saving
    // "called Mona at 2" at 3 PM doesn't ping straight away. Future ones start unsent.
    reminded_at: when.remind_at && Date.parse(when.remind_at) <= Date.now() ? new Date().toISOString() : null,
    repeat_rule: f.repeat || null,
    repeat_until: f.repeat ? f.repeatUntil || null : null,
    repeat_count: f.repeat ? f.repeatCount || null : null,
  };
}

/** Saved task back to editable fields (for "Edit"). */
export function fieldsFromTask(task: Task): TaskFields {
  const when = task.due_at ? cairoParts(new Date(task.due_at)) : null;
  return {
    title: task.title,
    notes: task.notes,
    kind: task.kind,
    category: task.category,
    clientId: task.client_id,
    noClient: task.category === 'work' && !task.client_id,
    date: when?.date ?? null,
    time: when && !task.all_day ? when.time : null,
    allDay: task.all_day,
    noDate: !task.due_at,
    priority: task.priority,
    remindBeforeMin: task.remind_before_min,
    repeat: task.repeat_rule,
    repeatUntil: task.repeat_until,
    repeatCount: task.repeat_count,
    repeatForever: Boolean(task.repeat_rule && !task.repeat_until && !task.repeat_count),
  };
}

// ---------- Storage ----------

function check<T>(result: { data: T; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function logTaskEvent(taskId: string, event: string, detail?: unknown) {
  const { error } = await supabase.from('task_events').insert({ task_id: taskId, event, detail: detail ?? null });
  if (error) console.error('task_events insert failed:', error.message);
}

export async function createTask(
  fields: TaskFields,
  meta: { chatId?: string; source?: string; rawInput?: string | null; ai?: unknown }
): Promise<Task> {
  const task = check(
    await supabase
      .from('tasks')
      .insert({
        id: newId(),
        ...rowFromFields(fields),
        source: meta.source || 'text',
        raw_input: meta.rawInput || null,
        chat_id: meta.chatId || null,
        extra: meta.ai ? { ai: meta.ai } : {},
      })
      .select()
      .single()
  ) as Task;
  await logTaskEvent(task.id, 'created', { source: task.source });
  return task;
}

export async function getTask(id: string) {
  return check(await supabase.from('tasks').select().eq('id', id).maybeSingle()) as Task | null;
}

export async function updateTaskFields(id: string, fields: TaskFields) {
  const task = check(await supabase.from('tasks').update(rowFromFields(fields)).eq('id', id).select().single()) as Task;
  await logTaskEvent(id, 'edited');
  return task;
}

export async function setTaskStatus(id: string, status: Task['status']) {
  const task = check(
    await supabase
      .from('tasks')
      .update({ status, done_at: status === 'done' ? new Date().toISOString() : null })
      .eq('id', id)
      .select()
      .single()
  ) as Task;
  await logTaskEvent(id, status === 'open' ? 'reopened' : status);
  return task;
}

/**
 * Done: a one-off task is closed; a repeating one moves to its next date (same time),
 * and closes when the series has ended. Returns the task and whether it moved.
 */
export async function completeTask(id: string): Promise<{ task: Task; movedTo: string | null }> {
  const task = await getTask(id);
  if (!task) throw new Error('Task not found.');
  if (!task.repeat_rule || !task.due_at) return { task: await setTaskStatus(id, 'done'), movedTo: null };

  const fields = fieldsFromTask(task);
  const next = nextOccurrence(fields.date!, task.repeat_rule);
  const countLeft = task.repeat_count ? task.repeat_count - 1 : null;
  const ended = !next || (task.repeat_until && next > task.repeat_until) || countLeft === 0;
  if (ended) return { task: await setTaskStatus(id, 'done'), movedTo: null };

  const moved = check(
    await supabase
      .from('tasks')
      .update({ ...rowFromFields({ ...fields, date: next, repeatCount: countLeft }), status: 'open' })
      .eq('id', id)
      .select()
      .single()
  ) as Task;
  await logTaskEvent(id, 'done', { occurrence: fields.date, next });
  return { task: moved, movedTo: next };
}

export async function listOpenTasks() {
  return check(await supabase.from('tasks').select().eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).limit(500)) as Task[];
}

// ---------- Reminders ----------

const HOUR_MS = 3_600_000;

/**
 * The hour a run belongs to. Runs are hourly on the hour, so a run that fires a few
 * seconds early or late still counts as that hour (Cairo is a whole number of hours from UTC).
 */
export function runHour(now = new Date()) {
  return new Date(Math.round(now.getTime() / HOUR_MS) * HOUR_MS);
}

/**
 * Reminders not sent yet, oldest first: everything due before the next hourly run,
 * so a 5:35 reminder goes out with the 5:00 run. Ones missed for over a week are left alone.
 */
export async function listDueReminders(now = new Date()) {
  const nextRun = new Date(runHour(now).getTime() + HOUR_MS);
  const tasks = check(
    await supabase
      .from('tasks')
      .select()
      .eq('status', 'open')
      .lt('remind_at', nextRun.toISOString())
      .gte('remind_at', new Date(now.getTime() - 7 * 86_400_000).toISOString())
      .order('remind_at', { ascending: true })
      .limit(200)
  ) as Task[];
  // PostgREST can't compare two columns, so "sent for an older time" is checked here.
  return tasks.filter((t) => !t.reminded_at || Date.parse(t.reminded_at) < Date.parse(t.remind_at!));
}

/**
 * Marks the reminder as sent before sending, only if nobody else did in the meantime
 * (overlapping runs). Returns false when another run already claimed it.
 */
export async function claimReminder(task: Task) {
  let query = supabase.from('tasks').update({ reminded_at: new Date().toISOString() }).eq('id', task.id).eq('remind_at', task.remind_at!);
  query = task.reminded_at ? query.eq('reminded_at', task.reminded_at) : query.is('reminded_at', null);
  const claimed = check(await query.select('id')) as { id: string }[];
  return claimed.length > 0;
}

/** Puts the reminder back after a failed send, so the next run tries again. */
export async function releaseReminder(task: Task) {
  const { error } = await supabase.from('tasks').update({ reminded_at: task.reminded_at }).eq('id', task.id).eq('remind_at', task.remind_at!);
  if (error) console.error('Reminder release failed:', error.message);
}

/** Moves only the reminder (not the due date) and makes it due to send again. */
export async function snoozeTask(id: string, until: Date) {
  const task = check(
    await supabase.from('tasks').update({ remind_at: until.toISOString(), reminded_at: null }).eq('id', id).select().single()
  ) as Task;
  await logTaskEvent(id, 'snoozed', { until: task.remind_at });
  return task;
}

export async function listDrafts(chatId: string) {
  return check(await supabase.from('task_drafts').select().eq('chat_id', chatId).order('created_at', { ascending: true }).limit(20)) as TaskDraft[];
}

/** Drafts nobody finished for a few days are dropped (after the digests have mentioned them). */
export async function deleteStaleDrafts(days = 3) {
  const { error } = await supabase.from('task_drafts').delete().lt('updated_at', new Date(Date.now() - days * 86_400_000).toISOString());
  if (error) console.error('Draft cleanup failed:', error.message);
}

export type TaskListKey = 'today' | 'tomorrow' | 'overdue' | 'week' | 'nodate';

/** Open tasks grouped for the bot: overdue, today, tomorrow, the 5 days after, no date. */
export function groupTasks(tasks: Task[], now = new Date()) {
  const today = cairoToday();
  const weekEnd = addDays(today, 7);
  const tomorrow = addDays(today, 1);
  const groups: Record<TaskListKey, Task[]> = { today: [], tomorrow: [], overdue: [], week: [], nodate: [] };
  for (const task of tasks) {
    if (!task.due_at) {
      groups.nodate.push(task);
      continue;
    }
    const date = cairoParts(new Date(task.due_at)).date;
    const overdue = task.all_day ? date < today : new Date(task.due_at) < now;
    if (overdue) groups.overdue.push(task);
    else if (date === today) groups.today.push(task);
    else if (date === tomorrow) groups.tomorrow.push(task);
    else if (date <= weekEnd) groups.week.push(task);
  }
  return groups;
}

// ---------- Drafts ----------

export async function saveDraft(draft: Omit<TaskDraft, 'updated_at' | 'expires_at'>) {
  return check(
    await supabase
      .from('task_drafts')
      .upsert({ ...draft, expires_at: new Date(Date.now() + 24 * 3_600_000).toISOString() })
      .select()
      .single()
  ) as TaskDraft;
}

export async function getDraft(id: string) {
  return check(await supabase.from('task_drafts').select().eq('id', id).maybeSingle()) as TaskDraft | null;
}

/** The chat's draft waiting for an answer, if one was asked in the last 2 hours. */
export async function activeDraft(chatId: string) {
  const since = new Date(Date.now() - 2 * 3_600_000).toISOString();
  return check(
    await supabase.from('task_drafts').select().eq('chat_id', chatId).gte('updated_at', since).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  ) as TaskDraft | null;
}

export async function deleteDraft(id: string) {
  const { error } = await supabase.from('task_drafts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
