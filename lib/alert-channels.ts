import { AsyncLocalStorage } from 'async_hooks';
import { getSetting, setSetting } from './data/store';

// Where alerts go. The Anwarz app (push) is always on; Telegram alerts can be paused for a day or
// turned off, and ntfy rings (the old alarm app) turned off, from the app's More page.
// Pausing Telegram stops only what the bot sends on its own (reminders, emails, sites, reviews, ads,
// digests). While Ahmed is talking to the bot (a webhook update) it still answers, so the bot keeps
// working as a backup.

const KEY = 'alert_channels';
const CACHE_MS = 30_000;

export interface AlertChannels {
  telegram: 'on' | 'paused' | 'off';
  telegramUntil: string | null; // when a pause ends
  ntfy: 'on' | 'off';
  updatedAt: string | null;
}

const DEFAULTS: AlertChannels = { telegram: 'on', telegramUntil: null, ntfy: 'on', updatedAt: null };

let cache: { at: number; value: AlertChannels } | null = null;

export async function getAlertChannels(): Promise<AlertChannels> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const stored = (await getSetting<Partial<AlertChannels>>(KEY).catch(() => null)) || {};
  const value = { ...DEFAULTS, ...stored };
  // A pause that has run out counts as on.
  if (value.telegram === 'paused' && (!value.telegramUntil || Date.parse(value.telegramUntil) <= Date.now())) {
    value.telegram = 'on';
    value.telegramUntil = null;
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function setAlertChannels(patch: { telegram?: 'on' | 'off' | 'pause_day'; ntfy?: 'on' | 'off' }) {
  const current = await getAlertChannels();
  const next: AlertChannels = { ...current, updatedAt: new Date().toISOString() };
  if (patch.telegram === 'pause_day') {
    next.telegram = 'paused';
    next.telegramUntil = new Date(Date.now() + 24 * 3_600_000).toISOString();
  } else if (patch.telegram) {
    next.telegram = patch.telegram;
    next.telegramUntil = null;
  }
  if (patch.ntfy) next.ntfy = patch.ntfy;
  await setSetting(KEY, next);
  cache = { at: Date.now(), value: next };
  return next;
}

// ---------- Telling replies from alerts ----------

const interactive = new AsyncLocalStorage<boolean>();

/** Runs a Telegram webhook update: messages sent inside are replies to Ahmed, never muted. */
export function runInteractive<T>(fn: () => Promise<T>) {
  return interactive.run(true, fn);
}

/** True when a Telegram message now would be an alert that is paused or off. */
export async function telegramAlertMuted() {
  if (interactive.getStore()) return false;
  return (await getAlertChannels().catch(() => DEFAULTS)).telegram !== 'on';
}

export async function ntfyMuted() {
  return (await getAlertChannels().catch(() => DEFAULTS)).ntfy === 'off';
}
