import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { supabase } from './supabase';

// Push notifications to the Anwarz mobile app through Firebase Cloud Messaging (FCM).
// Supabase stays the database; Firebase only carries the notification to the phone.
// It never throws: like the ntfy ring, push is an extra channel next to Telegram.
//
// Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (a service account of the
// Firebase project the Android app is registered in).

const APP_NAME = 'anwarz-push';

/**
 * The app's notification channels (mobile/src/lib/notifications.ts CHANNELS): each has its own sound,
 * pop-up and vibration on the phone, changeable there per channel.
 */
export type PushChannel = 'site_down' | 'task' | 'email' | 'review' | 'jl_order' | 'ads_stopped' | 'attention' | 'summary' | 'info';

export interface PushMessage {
  title: string;
  body: string;
  /** Which kind of alert this is (sound and pop-up on the phone). Default 'attention'. */
  channel?: PushChannel;
  /**
   * Buttons on the notification (also on a Galaxy Watch, where 🎙 is voice): 'task' = ☑️ Done / 💤 1 hour /
   * 📅 Tomorrow, 'ask' = 🎙 Ask Anwarz, 'email' = ✔️ Done / 🎙 Reply.
   */
  category?: 'task' | 'ask' | 'email';
  /** What a tap opens in the app, e.g. { type: 'task', id: 'abc' }. Strings only. */
  data?: Record<string, string>;
}

export function pushConfigured() {
  return Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

function pushApp(): App | null {
  if (!pushConfigured()) return null;
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;
  return initializeApp(
    {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    },
    APP_NAME
  );
}

const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

/** Sends to every signed-in phone with a push token. Returns how many phones got it. */
export async function sendPush(message: PushMessage): Promise<number> {
  try {
    const app = pushApp();
    if (!app) return 0;
    const { data, error } = await supabase.from('app_devices').select('id, push_token').is('revoked_at', null).not('push_token', 'is', null);
    if (error) throw new Error(error.message);
    const devices = (data || []) as { id: string; push_token: string }[];
    if (!devices.length) return 0;

    // A data-only message: the app (expo-notifications) shows it itself, so it gets the channel's
    // sound, the buttons and tap-to-open. These keys are the ones expo-notifications reads.
    const channel = message.channel || 'attention';
    // Kept in app_alerts; the kinds Ahmed marked urgent stay pinned and pop up in the app until Seen.
    const { logAlert } = await import('./urgent-alerts');
    const logged = await logAlert({ kind: channel, title: message.title, body: message.body, data: message.data }).catch(() => ({ id: null, urgent: false }));
    const payload = { ...(message.data || {}), ...(logged.id ? { alertId: logged.id } : {}), ...(logged.urgent ? { urgent: '1' } : {}) };
    // Urgent ones without their own buttons get ✅ Seen / Open.
    const category = message.category || (logged.urgent ? 'urgent' : undefined);
    const result = await getMessaging(app).sendEachForMulticast({
      tokens: devices.map((d) => d.push_token),
      data: {
        title: message.title.slice(0, 200),
        message: message.body.slice(0, 1000),
        body: JSON.stringify(payload),
        channelId: channel,
        ...(category ? { categoryId: category } : {}),
        ...(logged.urgent ? { sticky: 'true' } : {}),
        threadIdentifier: channel, // groups alerts of one kind (also on the watch)
        color: '#274290',
      },
      android: { priority: 'high', ttl: 24 * 3_600_000 },
    });

    // Phones that uninstalled the app (or got a new token) are dropped.
    const gone = result.responses
      .map((r, i) => (!r.success && r.error && GONE.has(r.error.code) ? devices[i].id : null))
      .filter((id): id is string => Boolean(id));
    if (gone.length) await supabase.from('app_devices').update({ push_token: null }).in('id', gone);
    for (const r of result.responses) if (!r.success && r.error && !GONE.has(r.error.code)) console.error('Push failed:', r.error.code, r.error.message);
    return result.successCount;
  } catch (error) {
    console.error('Push failed:', error);
    return 0;
  }
}
