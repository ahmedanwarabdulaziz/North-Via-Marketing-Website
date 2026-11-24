import { AppState, Platform } from 'react-native';

// Keeps what's on screen fresh without pulling down. The open screen (lib/use-api.ts) reloads its
// data quietly when:
//   'focus'  he comes back to the app / the PC window
//   'push'   an alert arrives (PC: the service worker tells the window; phone: a notification while open)
//   'tick'   every 60 s while the window is visible, only on screens that ask for it (Home, Tasks,
//            Inbox, Reviews)
// At most one reload every few seconds, whatever the reason.

export type RefreshReason = 'focus' | 'push' | 'tick';
type Listener = (reason: RefreshReason) => void;

const listeners = new Set<Listener>();
const TICK_MS = 60_000;
const MIN_GAP_MS = 4_000;
let lastAt = 0;
let started = false;

function visible() {
  if (Platform.OS === 'web') return typeof document === 'undefined' || document.visibilityState === 'visible';
  return AppState.currentState === 'active';
}

export function emitLiveRefresh(reason: RefreshReason) {
  const now = Date.now();
  if (now - lastAt < MIN_GAP_MS || !visible()) return;
  lastAt = now;
  listeners.forEach((l) => {
    try {
      l(reason);
    } catch {
      // one screen's error doesn't stop the others
    }
  });
}

function start() {
  if (started) return;
  started = true;
  setInterval(() => emitLiveRefresh('tick'), TICK_MS);
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') emitLiveRefresh('focus');
    });
    window.addEventListener('focus', () => emitLiveRefresh('focus'));
    // The service worker (web/sw.js) posts this when a push arrives.
    navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
      if (e.data?.type === 'anwarz-refresh') emitLiveRefresh('push');
    });
  } else {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') emitLiveRefresh('focus');
    });
  }
}

/** Listen while a screen is open; returns the stop function. */
export function onLiveRefresh(listener: Listener) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
