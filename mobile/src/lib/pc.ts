import { Platform } from 'react-native';

import { api } from './api';

// The PC version (northviamarketing.com/app, installed from Chrome or Edge as "Anwarz").
// Windows notifications come through the service worker /app/sw.js (Web Push); this registers it
// and sends the subscription to the website like a phone's push token.

export const isPc = Platform.OS === 'web';

function base64ToBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = globalThis.atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export type PcNotifications = 'on' | 'off' | 'blocked' | 'unsupported';

export function pcNotificationState(): PcNotifications {
  if (!isPc || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' ? 'on' : 'off';
}

/**
 * Registers the service worker and subscribes this PC. `ask` = show the browser's permission prompt
 * (only from a click); without it, it just refreshes an existing subscription.
 */
export async function setUpPcNotifications(ask = false): Promise<PcNotifications> {
  const state = pcNotificationState();
  if (state === 'unsupported' || state === 'blocked') return state;
  if (state === 'off') {
    if (!ask) return 'off';
    if ((await Notification.requestPermission()) !== 'granted') return pcNotificationState();
  }
  const reg = await navigator.serviceWorker.register('/app/sw.js', { scope: '/app' });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { publicKey } = await api<{ publicKey: string }>('/webpush');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
  }
  await api('/device', { body: { pushToken: JSON.stringify(sub.toJSON()), appVersion: 'pc' } });
  return 'on';
}
