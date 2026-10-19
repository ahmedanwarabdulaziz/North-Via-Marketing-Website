'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Home, List, Plus, Repeat, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { markTaskDone, moveTasks, saveTask, setTaskState, type TaskInput } from '@/app/actions/tasks';
import type { AdminTask } from '@/lib/admin-tasks';
import type { RepeatFreq } from '@/lib/tasks';

interface ClientOption {
  id: string;
  name: string;
}

const inputClass = 'w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
const labelClass = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CLIENT_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-lime-50 text-lime-800 border-lime-200',
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
];

// ---------- Dates (all YYYY-MM-DD strings already in Cairo time) ----------

function addDays(date: string, days: number) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekday(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function prettyDate(date: string) {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS[weekday(date)]} ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}

function prettyTime(time: string) {
  const [hh, mm] = time.split(':').map(Number);
  return `${hh % 12 === 0 ? 12 : hh % 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${hh < 12 ? 'AM' : 'PM'}`;
}

function whenLabel(t: AdminTask, today: string) {
  if (!t.date) return 'No date';
  const day = t.date === today ? 'Today' : t.date === addDays(today, 1) ? 'Tomorrow' : t.date === addDays(today, -1) ? 'Yesterday' : prettyDate(t.date);
  return t.time ? `${day}, ${prettyTime(t.time)}` : `${day} (all day)`;
}

function sortKey(t: AdminTask) {
  return `${t.date || '9999-99-99'} ${t.time || '00:00'}`;
}

// ---------- Board ----------

export function TasksBoard({
  initial,
  clients,
  today,
  nowTime,
  fixedClientId,
}: {
  initial: AdminTask[];
  clients: ClientOption[];
  today: string;
  nowTime: string;
  fixedClientId?: string;
}) {
  const [tasks, setTasks] = useState(initial);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [status, setStatus] = useState<'open' | 'done'>('open');
  const [clientFilter, setClientFilter] = useState<string>(fixedClientId || 'all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [editing, setEditing] = useState<AdminTask | { new: true; date?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const clientName = (id: string | null) => (id ? clients.find((c) => c.id === id)?.name || 'Client' : null);
  const colorOf = (id: string | null) => {
    const i = id ? clients.findIndex((c) => c.id === id) : -1;
    return i >= 0 ? CLIENT_COLORS[i % CLIENT_COLORS.length] : 'bg-zinc-50 text-zinc-600 border-zinc-200';
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (t.status === 'cancelled') return false;
      if (clientFilter === 'personal' && t.category !== 'personal') return false;
      if (clientFilter === 'agency' && !(t.category === 'work' && !t.clientId)) return false;
      if (!['all', 'personal', 'agency'].includes(clientFilter) && t.clientId !== clientFilter) return false;
      if (q && !`${t.title} ${t.notes || ''} ${clientName(t.clientId) || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, clientFilter, query]);

  const isOverdue = (t: AdminTask) => Boolean(t.date && (t.date < today || (t.date === today && t.time && t.time < nowTime)));

  const groups = useMemo(() => {
    const open = visible.filter((t) => t.status === 'open').sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const weekEnd = addDays(today, 7);
    return [
      { key: 'overdue', title: 'Overdue', tasks: open.filter(isOverdue), tone: 'text-red-600' },
      { key: 'today', title: 'Today', tasks: open.filter((t) => t.date === today && !isOverdue(t)), tone: 'text-blue-600' },
      { key: 'tomorrow', title: 'Tomorrow', tasks: open.filter((t) => t.date === addDays(today, 1)), tone: 'text-zinc-900' },
      { key: 'week', title: 'Next 7 days', tasks: open.filter((t) => t.date && t.date > addDays(today, 1) && t.date <= weekEnd), tone: 'text-zinc-900' },
      { key: 'later', title: 'Later', tasks: open.filter((t) => t.date && t.date > weekEnd), tone: 'text-zinc-900' },
      { key: 'nodate', title: 'No date', tasks: open.filter((t) => !t.date), tone: 'text-zinc-900' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, today, nowTime]);

  const doneList = useMemo(() => visible.filter((t) => t.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || '')), [visible]);
  const counts = {
    overdue: groups[0].tasks.length,
    today: groups[1].tasks.length,
    open: visible.filter((t) => t.status === 'open').length,
  };

  function replace(task: AdminTask) {
    setTasks((all) => (all.some((t) => t.id === task.id) ? all.map((t) => (t.id === task.id ? task : t)) : [task, ...all]));
  }

  async function done(t: AdminTask) {
    setBusy(t.id);
    const result = await markTaskDone(t.id);
    setBusy(null);
    if (!result.success) return setNotice({ kind: 'error', text: result.error });
    replace(result.task);
    setNotice({ kind: 'ok', text: result.movedTo ? `Done. Next one: ${whenLabel(result.task, today)}` : `Done: ${t.title}` });
  }

  async function move(list: AdminTask[], day: 'today' | 'tomorrow') {
    if (!list.length) return;
    setBusy(list.length === 1 ? list[0].id : 'move-all');
    const result = await moveTasks(
      list.map((t) => t.id),
      day
    );
    setBusy(null);
    if (!result.success) return setNotice({ kind: 'error', text: result.error });
    result.tasks.forEach(replace);
    setNotice({ kind: 'ok', text: list.length === 1 ? `Moved to ${whenLabel(result.tasks[0], today)}: ${list[0].title}` : `Moved ${list.length} overdue tasks to ${day}.` });
  }

  async function reopen(t: AdminTask) {
    setBusy(t.id);
    const result = await setTaskState(t.id, 'open');
    setBusy(null);
    if (!result.success) return setNotice({ kind: 'error', text: result.error });
    replace(result.task);
    setNotice({ kind: 'ok', text: `Reopened: ${t.title}` });
  }

  // ---------- Calendar ----------
  const calendarDays = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -weekday(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, AdminTask[]>();
    for (const t of visible) {
      if (!t.date || (status === 'open' && t.status !== 'open')) continue;
      map.set(t.date, [...(map.get(t.date) || []), t]);
    }
    for (const list of map.values()) list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return map;
  }, [visible, status]);
  const shiftMonth = (n: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  function TaskRow({ t }: { t: AdminTask }) {
    const client = clientName(t.clientId);
    const isDone = t.status === 'done';
    return (
      <li className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50/70">
        <button
          type="button"
          onClick={() => (isDone ? reopen(t) : done(t))}
          disabled={busy === t.id}
          title={isDone ? 'Reopen' : t.repeat ? 'Done (moves to the next date)' : 'Mark done'}
          className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
            isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 hover:border-emerald-500 text-transparent hover:text-emerald-500'
          } ${busy === t.id ? 'animate-pulse' : ''}`}
        >
          <Check className="w-3 h-3" strokeWidth={3} />
        </button>
        <button type="button" onClick={() => setEditing(t)} className="flex-1 min-w-0 text-start">
          <div className={`text-sm font-medium ${isDone ? 'text-zinc-400 line-through' : 'text-zinc-900'}`} dir="auto">
            {t.priority === 'high' && !isDone && <span className="inline-block w-2 h-2 rounded-full bg-red-500 me-2 align-middle" title="High priority" />}
            {t.title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-zinc-500">
            <span className={isOverdue(t) && !isDone ? 'text-red-600 font-medium' : ''}>{isDone && t.doneAt ? `Done ${new Date(t.doneAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : whenLabel(t, today)}</span>
            {client && !fixedClientId && <span className={`px-1.5 py-0.5 rounded border ${colorOf(t.clientId)}`}>{client}</span>}
            {t.category === 'personal' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-zinc-50 border-zinc-200">
                <Home className="w-3 h-3" /> Personal
              </span>
            )}
            {t.category === 'work' && !t.clientId && !fixedClientId && <span className="px-1.5 py-0.5 rounded border bg-zinc-50 border-zinc-200">Agency</span>}
            {t.repeat && (
              <span className="inline-flex items-center gap-1" title={t.repeatLabel}>
                <Repeat className="w-3 h-3" /> {t.repeatLabel}
              </span>
            )}
            {t.notes && <span className="truncate max-w-[16rem]" dir="auto">· {t.notes}</span>}
          </div>
        </button>
        {!isDone && isOverdue(t) && (
          <div className="flex gap-1 shrink-0">
            <button type="button" disabled={busy !== null} onClick={() => move([t], 'today')} className="px-2 py-1 text-xs rounded-md border border-zinc-200 bg-white hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">
              Today
            </button>
            <button type="button" disabled={busy !== null} onClick={() => move([t], 'tomorrow')} className="px-2 py-1 text-xs rounded-md border border-zinc-200 bg-white hover:border-blue-300 hover:text-blue-700 disabled:opacity-50">
              Tomorrow
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shrink-0">
          {(['list', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md ${view === v ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              {v === 'list' ? <List className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
              {v === 'list' ? 'List' : 'Calendar'}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shrink-0">
          {(['open', 'done'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${status === s ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              {s === 'open' ? `Open (${counts.open})` : 'Done (60 days)'}
            </button>
          ))}
        </div>
        {!fixedClientId && (
          <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className={`${inputClass} lg:w-52`}>
            <option value="all">All clients & personal</option>
            <option value="agency">Agency (no client)</option>
            <option value="personal">Personal</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <label className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-zinc-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tasks…" className={`${inputClass} ps-9`} dir="auto" />
        </label>
        <button
          type="button"
          onClick={() => setEditing({ new: true })}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" /> New task
        </button>
      </div>

      {notice && (
        <div className={`flex items-start justify-between gap-3 text-sm rounded-lg px-4 py-2.5 border ${notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span dir="auto">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* List */}
      {view === 'list' && status === 'open' && (
        <div className="space-y-5">
          {counts.open === 0 && <EmptyState text={query ? 'No tasks match your search.' : 'No open tasks. Send the Telegram bot a message, or add one here.'} />}
          {groups
            .filter((g) => g.tasks.length)
            .map((g) => (
              <section key={g.key} className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <h3 className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-semibold border-b border-zinc-100 bg-zinc-50/60 ${g.tone}`}>
                  <span>
                    {g.title} <span className="text-zinc-400 font-normal">({g.tasks.length})</span>
                  </span>
                  {g.key === 'overdue' && (
                    <span className="flex gap-1.5 font-normal">
                      <button type="button" disabled={busy !== null} onClick={() => move(g.tasks, 'today')} className="px-2.5 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        {busy === 'move-all' ? 'Moving…' : 'All to today'}
                      </button>
                      <button type="button" disabled={busy !== null} onClick={() => move(g.tasks, 'tomorrow')} className="px-2.5 py-1 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 disabled:opacity-50">
                        All to tomorrow
                      </button>
                    </span>
                  )}
                </h3>
                <ul className="divide-y divide-zinc-100">
                  {g.tasks.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
      {view === 'list' && status === 'done' && (
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {doneList.length ? (
            <ul className="divide-y divide-zinc-100">
              {doneList.map((t) => (
                <TaskRow key={t.id} t={t} />
              ))}
            </ul>
          ) : (
            <EmptyState text="Nothing marked done in the last 60 days." />
          )}
        </section>
      )}

      {/* Calendar */}
      {view === 'calendar' && (
        <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-zinc-100" aria-label="Previous month">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-zinc-900">
                {MONTHS[Number(month.slice(5)) - 1]} {month.slice(0, 4)}
              </h3>
              {month !== today.slice(0, 7) && (
                <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="text-xs text-blue-600 hover:underline">
                  Today
                </button>
              )}
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-zinc-100" aria-label="Next month">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-xs font-medium text-zinc-500 border-b border-zinc-100">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const list = byDay.get(day) || [];
              const inMonth = day.startsWith(month);
              return (
                <div
                  key={day}
                  onClick={() => setEditing({ new: true, date: day })}
                  className={`min-h-[6.5rem] border-b border-e border-zinc-100 p-1.5 cursor-pointer hover:bg-blue-50/30 ${inMonth ? '' : 'bg-zinc-50/60'}`}
                >
                  <div className={`text-xs mb-1 ${day === today ? 'inline-flex w-6 h-6 items-center justify-center rounded-full bg-blue-600 text-white font-semibold' : inMonth ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    {Number(day.slice(8))}
                  </div>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(t);
                        }}
                        title={t.title}
                        className={`block w-full text-start truncate text-[11px] leading-tight px-1.5 py-1 rounded border ${
                          t.status === 'done' ? 'bg-zinc-50 text-zinc-400 line-through border-zinc-200' : isOverdue(t) ? 'bg-red-50 text-red-700 border-red-200' : colorOf(t.clientId)
                        }`}
                        dir="auto"
                      >
                        {t.time ? `${prettyTime(t.time)} ` : ''}
                        {t.title}
                      </button>
                    ))}
                    {list.length > 3 && <div className="text-[11px] text-zinc-500 px-1">+{list.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="px-4 py-2.5 text-xs text-zinc-500 border-t border-zinc-100">Click a day to add a task on it. Repeating tasks show on their next date.</p>
        </section>
      )}

      {editing && (
        <TaskEditor
          task={'new' in editing ? null : editing}
          defaultDate={'new' in editing ? editing.date : undefined}
          clients={clients}
          fixedClientId={fixedClientId}
          today={today}
          onClose={() => setEditing(null)}
          onSaved={(task, text) => {
            replace(task);
            setEditing(null);
            setNotice({ kind: 'ok', text });
          }}
        />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">{text}</div>;
}

// ---------- Editor ----------

function TaskEditor({
  task,
  defaultDate,
  clients,
  fixedClientId,
  today,
  onClose,
  onSaved,
}: {
  task: AdminTask | null;
  defaultDate?: string;
  clients: ClientOption[];
  fixedClientId?: string;
  today: string;
  onClose: () => void;
  onSaved: (task: AdminTask, text: string) => void;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [notes, setNotes] = useState(task?.notes || '');
  const [category, setCategory] = useState<'work' | 'personal'>(task?.category || (fixedClientId ? 'work' : 'work'));
  const [clientId, setClientId] = useState(task?.clientId || fixedClientId || '');
  const [date, setDate] = useState(task ? task.date || '' : defaultDate || '');
  const [time, setTime] = useState(task?.time || '');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>(task?.priority || 'normal');
  const [remind, setRemind] = useState(String(task?.remindBeforeMin ?? 0));
  const [freq, setFreq] = useState<RepeatFreq | 'none'>(task?.repeat?.freq || 'none');
  const [every, setEvery] = useState(String(task?.repeat?.interval || 1));
  const [weekdays, setWeekdays] = useState<number[]>(task?.repeat?.weekdays || []);
  const [ends, setEnds] = useState<'never' | 'until' | 'count'>(task?.repeatUntil ? 'until' : task?.repeatCount ? 'count' : 'never');
  const [until, setUntil] = useState(task?.repeatUntil || '');
  const [count, setCount] = useState(String(task?.repeatCount || 10));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (freq !== 'none' && !date) return setError('A repeating task needs a start date.');
    const input: TaskInput = {
      id: task?.id,
      title,
      notes,
      category,
      clientId: category === 'work' ? clientId || null : null,
      date: date || null,
      time: time || null,
      allDay: !time,
      priority,
      remindBeforeMin: Number(remind) || 0,
      repeat:
        freq === 'none'
          ? null
          : {
              freq,
              interval: Math.max(1, Number(every) || 1),
              ...(freq === 'weekly' && weekdays.length ? { weekdays: [...weekdays].sort() } : {}),
              ...(freq === 'monthly' && date ? { monthDay: Number(date.slice(8)) } : {}),
            },
      repeatUntil: freq !== 'none' && ends === 'until' ? until || null : null,
      repeatCount: freq !== 'none' && ends === 'count' ? Math.max(1, Number(count) || 1) : null,
    };
    setBusy('save');
    const result = await saveTask(input);
    setBusy(null);
    if (!result.success) return setError(result.error);
    onSaved(result.task, task ? 'Task updated.' : 'Task added. Telegram will remind you at its time.');
  }

  async function run(key: string, action: () => Promise<{ success: true; task: AdminTask; movedTo?: string | null } | { success: false; error: string }>, text: (t: AdminTask, movedTo?: string | null) => string) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.success) return setError(result.error);
    onSaved(result.task, text(result.task, 'movedTo' in result ? result.movedTo : null));
  }

  return (
    <div className="fixed inset-0 z-50 bg-zinc-900/40 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">{task ? 'Edit task' : 'New task'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} dir="auto" autoFocus placeholder="e.g. Send the monthly report to Patriva" />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} min-h-[4rem]`} dir="auto" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Type</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as 'work' | 'personal')} className={inputClass} disabled={Boolean(fixedClientId)}>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Client</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputClass} disabled={category !== 'work' || Boolean(fixedClientId)}>
                <option value="">Agency / no client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date</label>
              <div className="flex gap-1.5">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div className="flex gap-2 mt-1.5 text-xs">
                <button type="button" className="text-blue-600 hover:underline" onClick={() => setDate(today)}>
                  Today
                </button>
                <button type="button" className="text-blue-600 hover:underline" onClick={() => setDate(addDays(today, 1))}>
                  Tomorrow
                </button>
                {date && (
                  <button type="button" className="text-zinc-500 hover:underline" onClick={() => (setDate(''), setTime(''), setFreq('none'))}>
                    No date
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Time (Cairo)</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} disabled={!date} />
              <div className="text-xs text-zinc-500 mt-1.5">{date && !time ? 'All day (reminder at 9 AM)' : ' '}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')} className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Remind me</label>
              <select value={remind} onChange={(e) => setRemind(e.target.value)} className={inputClass} disabled={!date || !time}>
                <option value="0">At the time</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Repeat className="w-4 h-4 text-zinc-400" />
              <select value={freq} onChange={(e) => setFreq(e.target.value as RepeatFreq | 'none')} className={inputClass} disabled={!date}>
                <option value="none">Doesn’t repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              {freq !== 'none' && (
                <label className="flex items-center gap-1.5 text-sm text-zinc-600 shrink-0">
                  every
                  <input type="number" min={1} max={52} value={every} onChange={(e) => setEvery(e.target.value)} className={`${inputClass} w-16`} />
                </label>
              )}
            </div>
            {freq === 'weekly' && (
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i]))}
                    className={`px-2.5 py-1 text-xs rounded-full border ${weekdays.includes(i) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-zinc-600 border-zinc-200'}`}
                  >
                    {d}
                  </button>
                ))}
                {!weekdays.length && <span className="text-xs text-zinc-500 self-center">Same weekday as the date</span>}
              </div>
            )}
            {freq !== 'none' && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-zinc-600">Ends</span>
                <select value={ends} onChange={(e) => setEnds(e.target.value as 'never' | 'until' | 'count')} className={`${inputClass} w-auto`}>
                  <option value="never">Never</option>
                  <option value="until">On a date</option>
                  <option value="count">After a number of times</option>
                </select>
                {ends === 'until' && <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={`${inputClass} w-auto`} />}
                {ends === 'count' && <input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} className={`${inputClass} w-20`} />}
              </div>
            )}
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/60">
          {task && task.status === 'open' && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('done', () => markTaskDone(task.id), (t, movedTo) => (movedTo ? `Done. Next one: ${whenLabel(t, today)}` : `Done: ${t.title}`))}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {busy === 'done' ? 'Saving…' : 'Mark done'}
            </button>
          )}
          {task && task.status === 'done' && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('reopen', () => setTaskState(task.id, 'open'), (t) => `Reopened: ${t.title}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" /> Reopen
            </button>
          )}
          {task && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (window.confirm(`Remove “${task.title}”? It stops showing here and in Telegram.`)) run('remove', () => setTaskState(task.id, 'cancelled'), (t) => `Removed: ${t.title}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy !== null || !title.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy === 'save' ? 'Saving…' : task ? 'Save changes' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}
