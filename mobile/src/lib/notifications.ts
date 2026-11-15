import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { router } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { api } from './api';

// Push notifications from the website (lib/push.ts), sent through Firebase as data messages so this
// app shows them itself: each kind of alert has its own Android channel (own sound, pop-up, vibration,
// all changeable per channel in the phone's settings), task reminders carry ☑️ Done / 💤 1 hour
// buttons (also on a Galaxy Watch), and a tap opens the right screen.

export interface AlertChannel {
  id: string;
  name: string;
  description: string;
  sound: string | null; // file in assets/sounds, bundled by the expo-notifications plugin
  soundName: string; // shown on the Notification sounds page
  importance: AndroidImportance;
  vibration: number[];
}

// Channel ids are permanent on a phone (only name/description can change later), so a new sound
// needs a new id. The website picks the channel per alert (lib/push.ts CHANNELS).
export const CHANNELS: AlertChannel[] = [
  { id: 'site_down', name: '🌐 Website down', description: 'A client website is down or its SSL is about to expire.', sound: 'siren.wav', soundName: 'Siren', importance: AndroidImportance.MAX, vibration: [0, 600, 200, 600, 200, 600] },
  { id: 'task', name: '⏰ Task reminders', description: 'Timed task reminders, with Done and Snooze buttons.', sound: 'chime.wav', soundName: 'Chime', importance: AndroidImportance.HIGH, vibration: [0, 250, 150, 250] },
  { id: 'email', name: '🚨 Urgent email', description: 'An email the AI marked urgent.', sound: 'ding.wav', soundName: 'Double ding', importance: AndroidImportance.HIGH, vibration: [0, 200, 100, 200] },
  { id: 'review', name: '⭐ Bad reviews', description: 'A new 1★ or 2★ Google review to answer.', sound: 'alert.wav', soundName: 'Alert', importance: AndroidImportance.HIGH, vibration: [0, 400, 150, 400] },
  { id: 'jl_order', name: '🛋 JL Comfort orders', description: 'A new JL Comfort order or sample request.', sound: 'coins.wav', soundName: 'Coins', importance: AndroidImportance.HIGH, vibration: [0, 150, 80, 150, 80, 150] },
  { id: 'ads_stopped', name: '📉 Ads stopped', description: 'A client’s Google or Meta ads stopped (paused, rejected, billing, no spend).', sound: 'drop.wav', soundName: 'Drop', importance: AndroidImportance.MAX, vibration: [0, 500, 150, 300, 150, 150] },
  { id: 'attention', name: '🔌 Needs attention', description: 'Logins to reconnect, AI quota, ads dropping.', sound: 'knock.wav', soundName: 'Knock', importance: AndroidImportance.HIGH, vibration: [0, 200] },
  { id: 'info', name: '📰 Info', description: 'Digests and good news: in the notification panel, no pop-up or sound.', sound: null, soundName: 'Silent', importance: AndroidImportance.LOW, vibration: [0] },
];

const BACKGROUND_TASK = 'anwarz-notification-actions';

// Shown while the app is open too (as a banner, with its sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** The data the website puts in `body`: what the alert is about. */
interface AlertData {
  type?: string; // task | email | review | site | jl_order | jl_sample | ads | test
  id?: string;
}

function dataOf(notification: Notifications.Notification): AlertData {
  const raw = notification.request.content.data as Record<string, unknown> | undefined;
  return { type: typeof raw?.type === 'string' ? raw.type : undefined, id: typeof raw?.id === 'string' ? raw.id : undefined };
}

/** ☑️ Done / 💤 1 hour on a task reminder: runs without opening the app. */
async function runTaskButton(action: string, data: AlertData) {
  if (data.type !== 'task' || !data.id) return;
  if (action === 'done') await api(`/tasks/${data.id}`, { body: { action: 'done' } });
  if (action === 'snooze') await api(`/tasks/${data.id}`, { body: { action: 'snooze', for: '1h' } });
}

// Button presses while the app is closed arrive here (Android starts the app's JS in the background).
TaskManager.defineTask<Notifications.NotificationResponse>(BACKGROUND_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const response = data as unknown as Notifications.NotificationResponse;
  if (!response.actionIdentifier || response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  try {
    await runTaskButton(response.actionIdentifier, dataOf(response.notification));
    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
  } catch (e) {
    console.warn('Notification button failed', e);
  }
});

/** Opens the screen an alert is about. */
export function openAlert(data: AlertData) {
  switch (data.type) {
    case 'task':
      return data.id ? router.push(`/task/${data.id}`) : router.push('/tasks');
    case 'email':
      return data.id ? router.push(`/email/${data.id}`) : router.push('/inbox');
    case 'review':
      return router.push('/reviews');
    case 'site':
      return router.push('/');
    case 'jl_order':
    case 'jl_sample':
      return router.push('/jl');
    case 'ads':
      return router.push('/marketing');
    default:
      return router.push('/');
  }
}

let ready = false;

/** Channels and buttons; safe to call more than once. */
export async function setUpNotifications() {
  if (ready || Platform.OS !== 'android') return;
  ready = true;
  for (const c of CHANNELS) {
    await Notifications.setNotificationChannelAsync(c.id, {
      name: c.name,
      description: c.description,
      importance: c.importance,
      sound: c.sound,
      vibrationPattern: c.vibration,
      enableVibrate: c.vibration.length > 1,
      lightColor: '#274290',
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      showBadge: c.id !== 'info',
    });
  }
  await Notifications.setNotificationCategoryAsync('task', [
    { identifier: 'done', buttonTitle: '☑️ Done', options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: '💤 1 hour', options: { opensAppToForeground: false } },
  ]);
  await Notifications.registerTaskAsync(BACKGROUND_TASK).catch(() => undefined);
}

/**
 * Asks for permission (Android 13+), then sends this phone's Firebase token to the website so
 * alerts reach it. Returns a short status for the More page.
 */
export async function registerForPush(): Promise<'on' | 'denied' | 'unavailable'> {
  if (Platform.OS !== 'android') return 'unavailable';
  await setUpNotifications();
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'denied';
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    await api('/device', { body: { pushToken: token.data, appVersion: Constants.expoConfig?.version ?? null } });
    return 'on';
  } catch (e) {
    // Expo Go has no push since SDK 53, and builds without google-services.json have no Firebase.
    console.warn('Push registration failed', e);
    return 'unavailable';
  }
}

/** Taps (and buttons pressed while the app is open). Returns a cleanup function. */
export function listenForTaps() {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = dataOf(response.notification);
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) openAlert(data);
    else void runTaskButton(response.actionIdentifier, data).catch(() => undefined);
  });
  return () => sub.remove();
}
