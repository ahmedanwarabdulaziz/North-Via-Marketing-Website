import { generateVAPIDKeys, sendNotification, setVapidDetails } from 'web-push';
import { getSetting, setSetting } from './data/store';
import { decryptString, encryptString } from './encryption';

// Windows / browser notifications for the Anwarz PC version (northviamarketing.com/app, installed
// from Chrome or Edge). A PC registers like a phone, but its "push token" is a Web Push
// subscription (JSON). The VAPID keys are made on first use and kept in app_settings (private key
// encrypted), so nothing needs setting up.

const SETTING = 'web_push_vapid';

let keys: { publicKey: string; privateKey: string } | null = null;

export async function vapidKeys() {
  if (keys) return keys;
  const stored = await getSetting<{ publicKey?: string; encryptedPrivateKey?: string }>(SETTING).catch(() => null);
  if (stored?.publicKey && stored.encryptedPrivateKey) {
    keys = { publicKey: stored.publicKey, privateKey: decryptString(stored.encryptedPrivateKey) };
  } else {
    const made = generateVAPIDKeys();
    await setSetting(SETTING, { publicKey: made.publicKey, encryptedPrivateKey: encryptString(made.privateKey), createdAt: new Date().toISOString() });
    keys = made;
  }
  return keys;
}

export const isWebPushToken = (token: string) => token.trimStart().startsWith('{');

/** Sends to PC subscriptions. Returns how many got it and the ones that are gone (unsubscribed / expired). */
export async function sendWebPush(tokens: { id: string; token: string }[], payload: { title: string; body: string; data: Record<string, string>; urgent: boolean }) {
  if (!tokens.length) return { sent: 0, gone: [] as string[] };
  const k = await vapidKeys();
  setVapidDetails('mailto:alerts@northviamarketing.com', k.publicKey, k.privateKey);
  const gone: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (t) => {
      try {
        await sendNotification(JSON.parse(t.token), JSON.stringify(payload), { TTL: 24 * 3600, urgency: payload.urgent ? 'high' : 'normal' });
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(t.id);
        else console.error('Web push failed:', status, error instanceof Error ? error.message.slice(0, 200) : error);
      }
    })
  );
  return { sent, gone };
}
