import { supabase } from './supabase';
import { cairoParts, describeRepeat, type RepeatRule, type Task } from './tasks';

// Tasks for the admin panel: plain objects with the Cairo date and time already worked out,
// so the browser never has to convert time zones.

export interface AdminTask {
  id: string;
  title: string;
  notes: string | null;
  category: 'work' | 'personal';
  clientId: string | null;
  priority: 'low' | 'normal' | 'high';
  status: 'open' | 'done' | 'cancelled';
  date: string | null; // YYYY-MM-DD, Cairo
  time: string | null; // HH:MM, Cairo (null = all day or no date)
  allDay: boolean;
  remindBeforeMin: number;
  repeat: RepeatRule | null;
  repeatUntil: string | null;
  repeatCount: number | null;
  repeatLabel: string;
  source: string;
  doneAt: string | null;
  createdAt: string;
}

export function toAdminTask(t: Task): AdminTask {
  const when = t.due_at ? cairoParts(new Date(t.due_at)) : null;
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    category: t.category,
    clientId: t.client_id,
    priority: t.priority,
    status: t.status,
    date: when?.date ?? null,
    time: when && !t.all_day ? when.time : null,
    allDay: t.all_day,
    remindBeforeMin: t.remind_before_min,
    repeat: t.repeat_rule,
    repeatUntil: t.repeat_until,
    repeatCount: t.repeat_count,
    repeatLabel: describeRepeat(t.repeat_rule, t.repeat_until, t.repeat_count),
    source: t.source,
    doneAt: t.done_at,
    createdAt: t.created_at,
  };
}

/** Every open task, plus those done in the last 60 days (for the Done view and the calendar). */
export async function listAdminTasks(opts: { clientId?: string } = {}) {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  let open = supabase.from('tasks').select().eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).limit(1000);
  let done = supabase.from('tasks').select().eq('status', 'done').gte('done_at', since).order('done_at', { ascending: false }).limit(500);
  if (opts.clientId) {
    open = open.eq('client_id', opts.clientId);
    done = done.eq('client_id', opts.clientId);
  }
  const [o, d] = await Promise.all([open, done]);
  if (o.error) throw new Error(o.error.message);
  if (d.error) throw new Error(d.error.message);
  return [...(o.data as Task[]), ...(d.data as Task[])].map(toAdminTask);
}
