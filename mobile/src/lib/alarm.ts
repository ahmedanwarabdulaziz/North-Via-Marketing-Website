import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Linking, Platform, TurboModuleRegistry } from 'react-native';

import { api, ensureSession } from './api';

// Full-screen alarms for the alert kinds Ahmed picks (More → Alerts → Urgent pop-ups → 🚨 Alarm).
// Those arrive as a push with no title (so expo-notifications doesn't show it); the app then draws
// it here with react-native-notify-kit as an alarm: it lights up the locked screen like an incoming
// call, rings the siren, and stays until ✅ Seen or Open. The native module only exists in the
// installed app (not Expo Go), so it's loaded lazily and everything here is a no-op without it.

type NotifyKit = typeof import('react-native-notify-kit');

let kit: NotifyKit | null | undefined;
function notifyKit(): NotifyKit | null {
  if (kit !== undefined) return kit;
  if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return (kit = null);
  // Only when the native part is really in this build (it isn't in Expo Go): asking without "enforcing"
  // returns null instead of throwing.
  if (!TurboModuleRegistry.get('NotifeeApiModule')) return (kit = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kit = require('react-native-notify-kit') as NotifyKit;
  } catch {
    kit = null;
  }
  return kit;
}

export const alarmsAvailable = () => notifyKit() !== null;

const CHANNEL = 'alarm';

/** The push data of an alarm: { alarm: '1', alarmTitle, alarmBody, body: JSON of what a tap opens, alertId }. */
export type AlarmPush = Record<string, string | undefined>;

export async function showAlarm(push: AlarmPush) {
  const k = notifyKit();
  if (!k || push.alarm !== '1') return false;
  const { default: notifee, AndroidCategory, AndroidImportance, AndroidVisibility } = k;
  // In the background the push's raw keys arrive (what a tap opens is the JSON in `body`); in the
  // foreground expo-notifications hands over that JSON already parsed. Either way: type, id, alertId.
  let open: Record<string, string> = {};
  try {
    open = push.body ? (JSON.parse(push.body) as Record<string, string>) : (push as Record<string, string>);
  } catch {
    open = push as Record<string, string>;
  }
  const pick = (k: string) => push[k] || open[k];
  push = { ...push, alertId: pick('alertId'), alarmTitle: pick('alarmTitle'), alarmBody: pick('alarmBody') };
  open = { ...(open.type ? { type: open.type } : {}), ...(open.id ? { id: open.id } : {}) };
  await notifee.createChannel({
    id: CHANNEL,
    name: '🚨 Alarm (full screen)',
    description: 'The alert kinds you set as an alarm: lights up the screen and rings until Seen.',
    importance: AndroidImportance.HIGH,
    sound: 'siren',
    vibration: true,
    vibrationPattern: [300, 700, 300, 700],
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: true,
  });
  await notifee.displayNotification({
    id: push.alertId || undefined,
    title: push.alarmTitle || '🚨 Urgent',
    body: push.alarmBody || '',
    data: { ...open, ...(push.alertId ? { alertId: push.alertId } : {}) },
    android: {
      channelId: CHANNEL,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      smallIcon: 'notification_icon',
      color: '#C62828',
      ongoing: true,
      autoCancel: false,
      loopSound: true,
      lightUpScreen: true,
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: '✅ Seen', pressAction: { id: 'seen' } },
        { title: 'Open', pressAction: { id: 'default', launchActivity: 'default' } },
      ],
    },
  });
  return true;
}

/** ✅ Seen or a tap: marks it seen on the website and stops the alarm. Returns what a tap opens. */
async function handled(notification: { id?: string; data?: Record<string, string | object | number> } | undefined) {
  const k = notifyKit();
  const alertId = typeof notification?.data?.alertId === 'string' ? notification.data.alertId : null;
  if (alertId && (await ensureSession())) await api('/alerts/urgent', { body: { seen: [alertId] } }).catch(() => undefined);
  if (k && notification?.id) await k.default.cancelNotification(notification.id).catch(() => undefined);
}

/** Buttons and taps on an alarm while the app is closed. Registered once, at the top level. */
export function registerAlarmEvents(openAlert: (data: { type?: string; id?: string }) => void) {
  const k = notifyKit();
  if (!k) return () => undefined;
  const { default: notifee, EventType } = k;
  try {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.ACTION_PRESS || type === EventType.PRESS) await handled(detail.notification as Parameters<typeof handled>[0]);
    });
  } catch (e) {
    console.warn('Alarm events unavailable', e);
    return () => undefined;
  }
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) return;
    const data = (detail.notification?.data || {}) as Record<string, string>;
    void handled(detail.notification as Parameters<typeof handled>[0]);
    if (type === EventType.PRESS || detail.pressAction?.id === 'default') openAlert({ type: data.type, id: data.id });
  });
}

/** Android 14+: full-screen alarms need "Full screen notifications" allowed for Anwarz. */
export async function openFullScreenSettings() {
  try {
    await Linking.sendIntent('android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT');
  } catch {
    await Linking.openSettings();
  }
}
