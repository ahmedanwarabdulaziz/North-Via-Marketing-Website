// Rings Ahmed's phone like an alarm through the private ntfy server on the VPS
// (ntfy.northviamarketing.com, topic "ahmed-alerts", ntfy app on Android).
// Used for timed task reminders and for alerts that need someone to step in.
// It never throws: the Telegram message is the main channel, the ring is extra.
//
// Env: NTFY_TOKEN (send-only token of the "anwarz" ntfy user). Optional NTFY_URL, NTFY_TOPIC.

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
}

export function ntfyConfigured() {
  return Boolean(process.env.NTFY_TOKEN);
}

export async function ringPhone(ring: Ring): Promise<boolean> {
  const token = process.env.NTFY_TOKEN;
  if (!token) return false;
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
