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

/** Full-screen alarms need app 0.5.0 or newer (react-native-notify-kit). */
const ALARM_FROM = [0, 5, 0];
function supportsAlarm(version: string | null) {
  const v = (version || '0').split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((v[i] || 0) !== ALARM_FROM[i]) return (v[i] || 0) > ALARM_FROM[i];
  return true;
}

/** Sends to every signed-in phone with a push token. Returns how many phones got it. */
export async function sendPush(message: PushMessage): Promise<number> {
  try {
    const app = pushApp();
    if (!app) return 0;
    const { data, error } = await supabase.from('app_devices').select('id, push_token, app_version').is('revoked_at', null).not('push_token', 'is', null);
    if (error) throw new Error(error.message);
    const devices = (data || []) as { id: string; push_token: string; app_version: string | null }[];
    if (!devices.length) return 0;

    // A data-only message: the app (expo-notifications) shows it itself, so it gets the channel's
    // sound, the buttons and tap-to-open. These keys are the ones expo-notifications reads.
    const channel = message.channel || 'attention';
    // Kept in app_alerts; the kinds Ahmed marked urgent stay pinned and pop up in the app until Seen.
    const { logAlert } = await import('./urgent-alerts');
    const logged = await logAlert({ kind: channel, title: message.title, body: message.body, data: message.data }).catch(() => ({ id: null, urgent: false, alarm: false }));
    const payload = {
      ...(message.data || {}),
      ...(logged.id ? { alertId: logged.id } : {}),
      ...(logged.urgent ? { urgent: '1' } : {}),
      // A full-screen alarm: sent without a title so expo-notifications leaves it to the app (lib/alarm.ts).
      ...(logged.alarm ? { alarm: '1', alarmTitle: message.title.slice(0, 200), alarmBody: message.body.slice(0, 1000) } : {}),
    };
    // Urgent ones without their own buttons get ✅ Seen / Open.
    const category = message.category || (logged.urgent ? 'urgent' : undefined);
    const common = {
      body: JSON.stringify(payload),
      channelId: channel,
      ...(category ? { categoryId: category } : {}),
      ...(logged.urgent ? { sticky: 'true' } : {}),
      threadIdentifier: channel, // groups alerts of one kind (also on the watch)
      color: '#274290',
    };
    const normal = { title: message.title.slice(0, 200), message: message.body.slice(0, 1000), ...common };
    const alarm = { alarm: '1', alarmTitle: payload.alarmTitle || '', alarmBody: payload.alarmBody || '', ...(logged.id ? { alertId: logged.id } : {}), ...common };
    // Only app versions that can draw alarms get the alarm format; older ones get the normal (pinned) notification.
    const groups = [
      { devices: devices.filter((d) => !(logged.alarm && supportsAlarm(d.app_version))), data: normal },
      { devices: devices.filter((d) => logged.alarm && supportsAlarm(d.app_version)), data: alarm },
    ].filter((g) => g.devices.length);

    let sent = 0;
    for (const g of groups) {
      const result = await getMessaging(app).sendEachForMulticast({
        tokens: g.devices.map((d) => d.push_token),
        data: g.data,
        android: { priority: 'high', ttl: 24 * 3_600_000 },
      });
      // Phones that uninstalled the app (or got a new token) are dropped.
      const gone = result.responses
        .map((r, i) => (!r.success && r.error && GONE.has(r.error.code) ? g.devices[i].id : null))
        .filter((id): id is string => Boolean(id));
      if (gone.length) await supabase.from('app_devices').update({ push_token: null }).in('id', gone);
      for (const r of result.responses) if (!r.success && r.error && !GONE.has(r.error.code)) console.error('Push failed:', r.error.code, r.error.message);
      sent += result.successCount;
    }
    return sent;
  } catch (error) {
    console.error('Push failed:', error);
    return 0;
  }
}
