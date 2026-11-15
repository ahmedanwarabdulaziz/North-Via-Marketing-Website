import { listClientProfiles } from './admin-ops';
import { AppError } from './app-auth';
import type { TaskClient } from './task-ai';
import type { RepeatFreq, TaskFields } from './tasks';

// Task fields sent by the Anwarz app are checked here before they reach the database.

export async function taskClientList(): Promise<TaskClient[]> {
  return (await listClientProfiles())
    .filter((c) => c.id && c.brandName)
    .map((c) => ({ id: c.id!, name: c.brandName, owner: c.ownerName || undefined }));
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const FREQS: RepeatFreq[] = ['daily', 'weekly', 'monthly', 'yearly'];

/** Keeps only known task fields with valid values; throws AppError for a bad value. */
export function sanitizeTaskFields(input: unknown, clients: TaskClient[]): TaskFields {
  if (!input || typeof input !== 'object') throw new AppError('fields must be an object.');
  const f = input as Record<string, unknown>;
  const out: TaskFields = {};
  const bad = (name: string) => {
    throw new AppError(`Invalid ${name}.`);
  };
  const has = (k: string) => f[k] !== undefined;

  if (has('title')) typeof f.title === 'string' && f.title.trim() ? (out.title = f.title.trim().slice(0, 300)) : bad('title');
  if (has('notes')) f.notes === null || typeof f.notes === 'string' ? (out.notes = (f.notes as string | null)?.slice(0, 4000) || null) : bad('notes');
  if (has('kind')) f.kind === 'task' || f.kind === 'reminder' ? (out.kind = f.kind) : bad('kind');
  if (has('category')) f.category === null || f.category === 'work' || f.category === 'personal' ? (out.category = f.category) : bad('category');
  if (has('clientId')) {
    if (f.clientId === null) out.clientId = null;
    else if (typeof f.clientId === 'string' && clients.some((c) => c.id === f.clientId)) out.clientId = f.clientId;
    else bad('clientId');
  }
  if (has('noClient')) out.noClient = f.noClient === true;
  if (has('date')) f.date === null || (typeof f.date === 'string' && DATE.test(f.date)) ? (out.date = f.date as string | null) : bad('date');
  if (has('time')) f.time === null || (typeof f.time === 'string' && TIME.test(f.time)) ? (out.time = f.time as string | null) : bad('time');
  if (has('allDay')) out.allDay = f.allDay === true;
  if (has('noDate')) out.noDate = f.noDate === true;
  if (has('priority')) f.priority === 'low' || f.priority === 'normal' || f.priority === 'high' ? (out.priority = f.priority) : bad('priority');
  if (has('remindBeforeMin')) {
    const n = Number(f.remindBeforeMin);
    Number.isInteger(n) && n >= 0 && n <= 7 * 1440 ? (out.remindBeforeMin = n) : bad('remindBeforeMin');
  }
  if (has('repeat')) {
    if (f.repeat === null) out.repeat = null;
    else {
      const r = f.repeat as Record<string, unknown>;
      const interval = Number(r?.interval ?? 1);
      if (!r || !FREQS.includes(r.freq as RepeatFreq) || !Number.isInteger(interval) || interval < 1 || interval > 365) bad('repeat');
      const weekdays = Array.isArray(r.weekdays) ? r.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : undefined;
      const monthDay = r.monthDay === undefined ? undefined : Number(r.monthDay);
      if (monthDay !== undefined && !(Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31)) bad('repeat.monthDay');
      out.repeat = { freq: r.freq as RepeatFreq, interval, ...(weekdays?.length ? { weekdays } : {}), ...(monthDay ? { monthDay } : {}) };
    }
  }
  if (has('repeatUntil')) f.repeatUntil === null || (typeof f.repeatUntil === 'string' && DATE.test(f.repeatUntil)) ? (out.repeatUntil = f.repeatUntil as string | null) : bad('repeatUntil');
  if (has('repeatCount')) {
    if (f.repeatCount === null) out.repeatCount = null;
    else {
      const n = Number(f.repeatCount);
      Number.isInteger(n) && n >= 1 && n <= 1000 ? (out.repeatCount = n) : bad('repeatCount');
    }
  }
  if (has('repeatForever')) out.repeatForever = f.repeatForever === true;
  return out;
}
