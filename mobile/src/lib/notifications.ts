import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { router } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { registerAlarmEvents, showAlarm, type AlarmPush } from './alarm';
import { api, ensureSession } from './api';

// Push notifications from the website (lib/push.ts), sent through Firebase as data messages so this
// app shows them itself: each kind of alert has its own Android channel (own sound, pop-up, vibration,
// all changeable per channel in the phone's settings), task reminders carry ☑️ Done / 💤 1 hour
// buttons (also on a Galaxy Watch), and a tap opens the right screen.
//
// On the watch: Android shows these notifications there with their buttons, and a button with a text
// box becomes voice dictation. So from the wrist: 🎙 Ask Anwarz (on the 9 AM / 9 PM summaries and on
// every answer), ✔️ Done / 🎙 Reply on an urgent email (the reply comes back as a draft to 📨 Send),
// ✅ Confirm what the chat prepared, ☑️ Done / 💤 1 hour / 📅 Tomorrow on a task.

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
  { id: 'summary', name: '☀️ Daily summary & watch', description: '9 AM summary, 9 PM skipped emails, and answers to what you ask from the watch.', sound: 'chime.wav', soundName: 'Chime', importance: AndroidImportance.DEFAULT, vibration: [0, 120] },
  { id: 'info', name: '📰 Info', description: 'Digests and good news: in the notification panel, no pop-up or sound.', sound: null, soundName: 'Silent', importance: AndroidImportance.LOW, vibration: [0] },
];

const BACKGROUND_TASK = 'anwarz-notification-actions';

// Shown while the app is open too (as a banner, with its sound).
// Alarms (no title) are drawn by lib/alarm.ts as a full-screen alarm instead.
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const alarm = (n.request.content.data as Record<string, unknown> | undefined)?.alarm === '1' || !n.request.content.title;
    return { shouldShowBanner: !alarm, shouldShowList: !alarm, shouldPlaySound: !alarm, shouldSetBadge: false };
  },
});

/** The data the website puts in `body`: what the alert is about. */
interface AlertData {
  type?: string; // task | email | review | site | jl_order | jl_sample | ads | skipped | home | chat | connections | test
  id?: string;
  actionId?: string; // a chat card to confirm or send from the watch
  alertId?: string; // set on every pushed alert; urgent ones stay pinned until Seen
}

function dataOf(notification: Notifications.Notification): AlertData {
  const raw = notification.request.content.data as Record<string, unknown> | undefined;
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return { type: str(raw?.type), id: str(raw?.id), actionId: str(raw?.actionId), alertId: str(raw?.alertId) };
}

/** Tells the website an urgent alert was seen, so it leaves the pop-up. */
export async function markSeen(alertId: string) {
  if (await ensureSession()) await api('/alerts/urgent', { body: { seen: [alertId] } }).catch(() => undefined);
}

/** A notification shown by the app itself (answers and drafts for the watch). */
async function notify(title: string, body: string, data: Record<string, string>, category?: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body: body.slice(0, 1500), data, ...(category ? { categoryIdentifier: category } : {}) },
    trigger: { channelId: 'summary' },
  });
}

interface ChatAnswer {
  content: string;
  actions?: { id: string; state: string; result?: string; draft?: string; draftSubject?: string }[];
}

/** What a chat answer says, with what was done and the first card that still needs a tap. */
async function showAnswer(answer: ChatAnswer) {
  const done = (answer.actions || []).filter((a) => a.state === 'done' && a.result).map((a) => a.result);
  const waiting = (answer.actions || []).find((a) => a.state === 'proposed' || a.state === 'drafted');
  const body = [answer.content, ...done, waiting?.draft ? `\n${waiting.draftSubject ? `${waiting.draftSubject}\n` : ''}${waiting.draft}` : ''].filter(Boolean).join('\n');
  if (waiting?.state === 'drafted') return notify('📝 Draft ready', body, { type: 'chat', actionId: waiting.id }, 'chat_send');
  if (waiting) return notify('💬 Anwarz', body, { type: 'chat', actionId: waiting.id }, 'chat_confirm');
  return notify('💬 Anwarz', body, { type: 'chat' }, 'ask');
}

/**
 * Every notification button, also from the watch (runs without opening the app). `text` is what was
 * typed or dictated into a 🎙 button.
 */
async function runButton(action: string, data: AlertData, text?: string) {
  if (!(await ensureSession())) return;
  const said = text?.trim();
  // Any button on an urgent alert counts as seen (it also leaves the pop-up in the app).
  if (data.alertId) void markSeen(data.alertId);
  switch (action) {
    case 'seen':
      return;
    // Tasks
    case 'done':
      if (data.type === 'task' && data.id) await api(`/tasks/${data.id}`, { body: { action: 'done' } });
      return;
    case 'snooze':
      if (data.type === 'task' && data.id) await api(`/tasks/${data.id}`, { body: { action: 'snooze', for: '1h' } });
      return;
    case 'tomorrow':
      if (data.type === 'task' && data.id) await api(`/tasks/${data.id}`, { body: { action: 'move', day: 'tomorrow' } });
      return;
    // Ask the AI from the wrist; the answer comes back as a notification.
    case 'ask': {
      if (!said) return;
      try {
        const r = await api<{ answer: ChatAnswer }>('/chat', { body: { text: said }, timeoutMs: 90_000 });
        await showAnswer(r.answer);
      } catch (e) {
        await notify('⚠️ No answer', e instanceof Error ? e.message : String(e), { type: 'chat' }, 'ask');
      }
      return;
    }
    case 'chat_confirm':
    case 'chat_send':
      if (!data.actionId) return;
      try {
        const r = await api<{ action: { state: string; result?: string; draft?: string; draftSubject?: string; id: string } }>(`/chat/actions/${data.actionId}`, {
          body: { decision: action === 'chat_send' ? 'send' : 'confirm' },
          timeoutMs: 90_000,
        });
        if (r.action.state === 'drafted') await showAnswer({ content: 'Read it, then 📨 Send.', actions: [r.action] });
        else await notify(r.action.state === 'failed' ? '⚠️ Not done' : '✅ Done', r.action.result || 'Done.', { type: 'chat' }, 'ask');
      } catch (e) {
        await notify('⚠️ Not done', e instanceof Error ? e.message : String(e), { type: 'chat' }, 'ask');
      }
      return;
    case 'chat_drop':
      if (data.actionId) await api(`/chat/actions/${data.actionId}`, { body: { decision: 'cancel' } }).catch(() => undefined);
      return;
    // Urgent email
    case 'email_done':
      if (data.id) await api(`/emails/${data.id}`, { body: { action: 'done' } });
      return;
    case 'email_reply': {
      if (!data.id || !said) return;
      try {
        const r = await api<{ email: { draft: string | null } }>(`/emails/${data.id}`, { body: { action: 'draft', text: said }, timeoutMs: 90_000 });
        await notify('📝 Reply draft', r.email.draft || '', { type: 'email', id: data.id }, 'email_draft');
      } catch (e) {
        await notify('⚠️ No draft', e instanceof Error ? e.message : String(e), { type: 'email', id: data.id });
      }
      return;
    }
    case 'email_send':
      if (!data.id) return;
      try {
        await api(`/emails/${data.id}`, { body: { action: 'send' }, timeoutMs: 60_000 });
        await notify('📨 Sent', 'Your reply was sent.', { type: 'email', id: data.id });
      } catch (e) {
        await notify('⚠️ Not sent', e instanceof Error ? e.message : String(e), { type: 'email', id: data.id }, 'email_draft');
      }
      return;
    case 'email_drop':
      if (data.id) await api(`/emails/${data.id}`, { body: { action: 'cancel' } }).catch(() => undefined);
      return;
  }
}

// Button presses while the app is closed arrive here (Android starts the app's JS in the background).
TaskManager.defineTask<Notifications.NotificationResponse>(BACKGROUND_TASK, async ({ data, error }) => {
  if (error || !data) return;
  // An incoming alarm push while the app is in the background or closed: ring it full screen.
  if (!('actionIdentifier' in (data as object))) {
    const push = (data as unknown as { data?: AlarmPush }).data;
    if (push?.alarm === '1') await showAlarm(push).catch((e) => console.warn('Alarm failed', e));
    return;
  }
  const response = data as unknown as Notifications.NotificationResponse;
  if (!response.actionIdentifier || response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  try {
    await runButton(response.actionIdentifier, dataOf(response.notification), response.userText);
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
    case 'skipped':
      return router.push({ pathname: '/inbox', params: { view: 'skipped' } });
    case 'chat':
      return router.push('/chat');
    case 'connections':
      return router.push('/connections');
    case 'home':
      return router.push('/');
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
  // Buttons (at most 3 per notification; the 🎙 ones become voice dictation on the watch).
  const quiet = { opensAppToForeground: false };
  const voice = (identifier: string, buttonTitle: string, placeholder: string) => ({ identifier, buttonTitle, textInput: { submitButtonTitle: 'Send', placeholder }, options: quiet });
  await Notifications.setNotificationCategoryAsync('task', [
    { identifier: 'done', buttonTitle: '☑️ Done', options: quiet },
    { identifier: 'snooze', buttonTitle: '💤 1 hour', options: quiet },
    { identifier: 'tomorrow', buttonTitle: '📅 Tomorrow', options: quiet },
  ]);
  await Notifications.setNotificationCategoryAsync('urgent', [
    { identifier: 'seen', buttonTitle: '✅ Seen', options: quiet },
    { identifier: 'open', buttonTitle: 'Open', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync('ask', [voice('ask', '🎙 Ask Anwarz', 'Ask or tell me what to do…')]);
  await Notifications.setNotificationCategoryAsync('chat_confirm', [
    { identifier: 'chat_confirm', buttonTitle: '✅ Confirm', options: quiet },
    { identifier: 'chat_drop', buttonTitle: '✖️ Cancel', options: quiet },
    voice('ask', '🎙 Ask', 'Ask or change it…'),
  ]);
  await Notifications.setNotificationCategoryAsync('chat_send', [
    { identifier: 'chat_send', buttonTitle: '📨 Send', options: quiet },
    { identifier: 'chat_drop', buttonTitle: '🗑 Drop', options: quiet },
  ]);
  await Notifications.setNotificationCategoryAsync('email', [
    { identifier: 'email_done', buttonTitle: '✔️ Done', options: quiet },
    voice('email_reply', '🎙 Reply', 'What should the reply say?'),
  ]);
  await Notifications.setNotificationCategoryAsync('email_draft', [
    { identifier: 'email_send', buttonTitle: '📨 Send', options: quiet },
    { identifier: 'email_drop', buttonTitle: '🗑 Drop', options: quiet },
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
  // An alarm push while the app is open.
  const received = Notifications.addNotificationReceivedListener((n) => {
    const raw = n.request.content.data as Record<string, unknown> | undefined;
    if (raw?.alarm !== '1') return;
    const push = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])) as AlarmPush;
    void showAlarm(push).catch(() => undefined);
  });
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = dataOf(response.notification);
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER || response.actionIdentifier === 'open') {
      if (data.alertId) void markSeen(data.alertId);
      void Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => undefined);
      openAlert(data);
    }
    else void runButton(response.actionIdentifier, data, response.userText).catch(() => undefined);
  });
  return () => {
    sub.remove();
    received.remove();
  };
}

// Taps and ✅ Seen on a full-screen alarm (also while the app is closed).
try {
  registerAlarmEvents((data) => openAlert(data));
} catch (e) {
  console.warn('Alarm events unavailable', e); // never let alarms stop the app from opening
}
