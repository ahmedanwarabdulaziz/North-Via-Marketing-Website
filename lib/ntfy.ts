// Rings Ahmed's phone like an alarm through the private ntfy server on the VPS
// (ntfy.northviamarketing.com, topic "ahmed-alerts", ntfy app on Android).
// Used for timed task reminders and for alerts that need someone to step in.
// It never throws: the Telegram message is the main channel, the ring is extra.
//
// Every ring is also sent as a push notification to the Anwarz app (lib/push.ts).
//
// Env: NTFY_TOKEN (send-only token of the "anwarz" ntfy user). Optional NTFY_URL, NTFY_TOPIC.

import { ntfyMuted } from './alert-channels';
import { sendPush, type PushChannel } from './push';

const NTFY_URL = process.env.NTFY_URL || 'https://ntfy.northviamarketing.com';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'ahmed-alerts';

export interface Ring {
  title: string;
  message: string;
  /** 5 = urgent (alarm sound, bypasses Do Not Disturb), 4 = high. Default 5. */
  priority?: 4 | 5;
  /** ntfy emoji tags, e.g. ['rotating_light'] */
  tags?: string[];
  /** Opens this link when the notification is tapped, e.g. the bot chat. */
  click?: string;
  /** Up to 3 buttons on the notification; each calls a URL in the background (ntfy "http" action). */
  actions?: { label: string; url: string }[];
  /** For the Anwarz app's push notification: what a tap opens, e.g. { type: 'task', id }. */
  data?: Record<string, string>;
  /** The app's alert kind (its own sound): site_down, task, email, review, jl_order, attention, info. */
  channel?: PushChannel;
  /** Buttons on the app's notification: 'task' = ☑️ Done / 💤 1 hour. */
  category?: 'task' | 'ask' | 'email';
}

export function ntfyConfigured() {
  return Boolean(process.env.NTFY_TOKEN);
}

/** Rings through ntfy and, at the same time, sends a push notification to the Anwarz app. */
export async function ringPhone(ring: Ring): Promise<boolean> {
  const [rang] = await Promise.all([
    ringNtfy(ring),
    sendPush({ title: ring.title, body: ring.message, channel: ring.channel, category: ring.category, data: ring.data }),
  ]);
  return rang;
}

async function ringNtfy(ring: Ring): Promise<boolean> {
  const token = process.env.NTFY_TOKEN;
  if (!token || (await ntfyMuted())) return false; // ntfy rings turned off in the app (More → Alerts)
  try {
    const response = await fetch(NTFY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: NTFY_TOPIC,
        title: ring.title.slice(0, 200),
        message: ring.message.slice(0, 2000),
        priority: ring.priority ?? 5,
        tags: ring.tags ?? ['rotating_light'],
        ...(ring.click ? { click: ring.click } : {}),
        ...(ring.actions?.length
          ? { actions: ring.actions.slice(0, 3).map((a) => ({ action: 'http', label: a.label, url: a.url, method: 'POST', clear: true })) }
          : {}),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) console.error('ntfy ring failed:', response.status, await response.text().catch(() => ''));
    return response.ok;
  } catch (error) {
    console.error('ntfy ring failed:', error);
    return false;
  }
}
