import { db } from './firebase';
import { DIGEST_TIMEZONES } from './digest-schedule-options';

// When the Telegram review digest goes out. n8n calls the digest endpoint every hour;
// the endpoint only runs at the hours/days chosen here, so times are set from the panel.
const DOC = () => db.collection('gbp_settings').doc('telegram_digest');

export interface DigestSchedule {
  enabled: boolean;
  hours: number[]; // 0–23 in the chosen time zone
  days: number[]; // 0 = Sunday … 6 = Saturday
  timezone: string;
  lastRunKey?: string; // "YYYY-MM-DD-HH" of the last scheduled run, prevents double sends
  updatedAt?: string;
}

export const DEFAULT_DIGEST_SCHEDULE: DigestSchedule = {
  enabled: true,
  hours: [9],
  days: [0, 1, 2, 3, 4, 5, 6],
  timezone: 'America/Toronto',
};

export async function getDigestSchedule(): Promise<DigestSchedule> {
  const doc = await DOC().get();
  return { ...DEFAULT_DIGEST_SCHEDULE, ...(doc.exists ? (doc.data() as DigestSchedule) : {}) };
}

export async function saveDigestSchedule(input: Pick<DigestSchedule, 'enabled' | 'hours' | 'days' | 'timezone'>) {
  const unique = (values: unknown, max: number) =>
    Array.from(new Set((Array.isArray(values) ? values : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= max))).sort((a, b) => a - b);

  const schedule = {
    enabled: Boolean(input.enabled),
    hours: unique(input.hours, 23),
    days: unique(input.days, 6),
    timezone: DIGEST_TIMEZONES.some((t) => t.value === input.timezone) ? input.timezone : DEFAULT_DIGEST_SCHEDULE.timezone,
    updatedAt: new Date().toISOString(),
  };
  if (schedule.enabled && (schedule.hours.length === 0 || schedule.days.length === 0)) {
    throw new Error('Pick at least one time and one day, or turn the digest off.');
  }
  await DOC().set(schedule, { merge: true });
  return schedule;
}

function localParts(date: Date, timezone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      weekday: 'short',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), weekday };
}

/** Whether the hourly n8n call should run the digest now. */
export async function checkScheduledRun(now = new Date()) {
  const schedule = await getDigestSchedule();
  if (!schedule.enabled) return { due: false as const, reason: 'Digest is turned off in the panel.' };

  const { dateKey, hour, weekday } = localParts(now, schedule.timezone);
  if (!schedule.days.includes(weekday) || !schedule.hours.includes(hour)) {
    return { due: false as const, reason: 'Not a scheduled time.' };
  }
  const runKey = `${dateKey}-${String(hour).padStart(2, '0')}`;
  if (schedule.lastRunKey === runKey) return { due: false as const, reason: 'Already sent this hour.' };
  return { due: true as const, runKey };
}

/** Recorded only after a successful run, so an n8n retry after a failure still sends. */
export async function markScheduledRun(runKey: string) {
  await DOC().set({ lastRunKey: runKey }, { merge: true });
}

/** Next scheduled send time, for display. */
export function nextDigestRun(schedule: DigestSchedule, from = new Date()) {
  if (!schedule.enabled || !schedule.hours.length || !schedule.days.length) return null;
  const start = new Date(from);
  start.setUTCMinutes(0, 0, 0);
  for (let i = 1; i <= 24 * 8; i++) {
    const candidate = new Date(start.getTime() + i * 3600_000);
    const { hour, weekday } = localParts(candidate, schedule.timezone);
    if (schedule.days.includes(weekday) && schedule.hours.includes(hour)) return candidate.toISOString();
  }
  return null;
}
