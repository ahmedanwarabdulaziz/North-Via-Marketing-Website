import crypto from 'crypto';
import { getSetting, setSetting } from './data/store';
import { supabase } from './supabase';
import type { PushChannel } from './push';

// "Urgent pop-ups" (the app's More → Alerts). Ahmed picks which kinds of alert are urgent. Those stay
// pinned on the phone (can't be swiped away) and show in a pop-up when he opens the app until he taps
// Seen. Every alert is kept in app_alerts so the app knows which urgent ones are unseen.

const SETTING = 'urgent_alerts';

export const ALERT_KINDS: { key: PushChannel; label: string }[] = [
  { key: 'site_down', label: '🌐 Website down / SSL expiring' },
  { key: 'ads_stopped', label: '📉 Ads stopped' },
  { key: 'attention', label: '🔌 Connection broken, logins, AI quota' },
  { key: 'email', label: '🚨 Urgent email' },
  { key: 'review', label: '⭐ Bad review (1–2★)' },
  { key: 'jl_order', label: '🛋 JL Comfort order / sample' },
  { key: 'task', label: '⏰ Task reminders' },
  { key: 'summary', label: '☀️ 9 AM summary & 9 PM skipped emails' },
];

const DEFAULT_URGENT: PushChannel[] = ['site_down', 'ads_stopped', 'attention'];
// Full-screen alarm (lights up the locked screen, rings until Seen): only for some urgent kinds.
const DEFAULT_ALARM: PushChannel[] = ['site_down'];

interface Stored {
  kinds?: PushChannel[];
  alarm?: PushChannel[];
}

let cache: { at: number; kinds: PushChannel[]; alarm: PushChannel[] } | null = null;
const valid = (list: unknown): PushChannel[] | null =>
  Array.isArray(list) ? ALERT_KINDS.map((a) => a.key).filter((k) => (list as string[]).includes(k)) : null;

async function load() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const stored = await getSetting<Stored>(SETTING).catch(() => null);
  const kinds = valid(stored?.kinds) ?? DEFAULT_URGENT;
  const alarm = (valid(stored?.alarm) ?? DEFAULT_ALARM).filter((k) => kinds.includes(k));
  cache = { at: Date.now(), kinds, alarm };
  return cache;
}

export async function urgentKinds(): Promise<PushChannel[]> {
  return (await load()).kinds;
}

export async function alarmKinds(): Promise<PushChannel[]> {
  return (await load()).alarm;
}

/** Saves which kinds are urgent and which of those ring as a full-screen alarm (an alarm is always urgent). */
export async function setUrgentKinds(kinds: string[], alarm?: string[]) {
  const current = await load();
  const nextAlarm = alarm ? valid(alarm)! : current.alarm;
  const nextKinds = [...new Set([...valid(kinds)!, ...(alarm ? nextAlarm : [])])];
  const clean = { kinds: ALERT_KINDS.map((a) => a.key).filter((k) => nextKinds.includes(k)), alarm: nextAlarm.filter((k) => nextKinds.includes(k)) };
  await setSetting(SETTING, { ...clean, updatedAt: new Date().toISOString() });
  cache = { at: Date.now(), ...clean };
  return clean;
}

/** Keeps a copy of an alert; returns its id and whether it is urgent. Never throws. */
export async function logAlert(alert: { kind: PushChannel; title: string; body: string; data?: Record<string, string> }) {
  const settings = await load().catch(() => ({ kinds: DEFAULT_URGENT, alarm: DEFAULT_ALARM }));
  const urgent = settings.kinds.includes(alert.kind);
  const alarm = urgent && settings.alarm.includes(alert.kind);
  const id = crypto.randomBytes(6).toString('base64url');
  const { error } = await supabase.from('app_alerts').insert({ id, kind: alert.kind, title: alert.title.slice(0, 200), body: alert.body.slice(0, 2000), data: alert.data || {}, urgent });
  if (error) console.error('Alert log failed:', error.message);
  return { id: error ? null : id, urgent, alarm };
}

export interface StoredAlert {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, string> | null;
  urgent: boolean;
  created_at: string;
  seen_at: string | null;
}

/** Urgent alerts not seen yet (last 7 days), newest first. */
export async function unseenUrgent() {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase.from('app_alerts').select().eq('urgent', true).is('seen_at', null).gte('created_at', since).order('created_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as StoredAlert[];
}

export async function markSeen(ids: string[] | 'all') {
  let q = supabase.from('app_alerts').update({ seen_at: new Date().toISOString() }).is('seen_at', null);
  q = ids === 'all' ? q.eq('urgent', true) : q.in('id', ids.slice(0, 100));
  const { error } = await q;
  if (error) throw new Error(error.message);
}
