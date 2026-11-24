import Constants from 'expo-constants';
import { fetch as expoFetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Talks to the website's /api/app routes with the phone's sign-in token.
// The token lives in the phone's secure storage (localStorage in the web preview).

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'https://www.northviamarketing.com'
).replace(/\/+$/, '');

const TOKEN_KEY = 'anwarz_token';

export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string) {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear() {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown = null) {
    super(message);
  }
}

let token: string | null = null;
let onSignedOut: (() => void) | null = null;

export function setSession(value: string | null) {
  token = value;
}

/** Background work (notification buttons, watch replies) runs without the app's screens: load the token. */
export async function ensureSession() {
  if (!token) token = await tokenStore.get().catch(() => null);
  return Boolean(token);
}

/** Called when the server says the token no longer works (signed out from elsewhere, expired). */
export function onUnauthorized(callback: () => void) {
  onSignedOut = callback;
}

export async function api<T>(path: string, options: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/app${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    throw new ApiError(aborted ? 'The server took too long. Try again.' : 'No connection. Check the internet and try again.', 0);
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // empty or not JSON
  }
  if (response.status === 401 && path !== '/login') {
    onSignedOut?.();
    throw new ApiError('Signed out. Please sign in again.', 401, body);
  }
  // 422 with "needs" is an answer (questions to ask), not a failure.
  if (!response.ok && !(response.status === 422 && body && typeof body === 'object' && 'needs' in body)) {
    const message = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : `Error ${response.status}`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

/**
 * POSTs and reads a newline-delimited JSON stream (the chat's live answer), calling onEvent for each
 * line as it arrives. Uses expo/fetch on phones (React Native's own fetch can't stream) and the
 * browser's fetch on the web. Resolves when the stream ends.
 */
export async function apiStream(path: string, body: unknown, onEvent: (event: Record<string, unknown>) => void, timeoutMs = 120_000): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const doFetch = (Platform.OS === 'web' ? globalThis.fetch.bind(globalThis) : expoFetch) as unknown as typeof globalThis.fetch;
  try {
    let response: Response;
    try {
      response = await doFetch(`${API_URL}/api/app${path}`, {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new ApiError(aborted ? 'The server took too long. Try again.' : 'No connection. Check the internet and try again.', 0);
    }
    if (!response.ok || !response.body) {
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        // empty or not JSON
      }
      if (response.status === 401) {
        onSignedOut?.();
        throw new ApiError('Signed out. Please sign in again.', 401, data);
      }
      const message = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : `Error ${response.status}`;
      throw new ApiError(message, response.status, data);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const flush = (line: string) => {
      if (!line.trim()) return;
      try {
        onEvent(JSON.parse(line) as Record<string, unknown>);
      } catch {
        // a broken line: skip it
      }
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl = buffer.indexOf('\n');
        while (nl >= 0) {
          flush(buffer.slice(0, nl));
          buffer = buffer.slice(nl + 1);
          nl = buffer.indexOf('\n');
        }
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new ApiError(aborted ? 'The server took too long. Try again.' : 'The connection dropped. Try again.', 0);
    }
    flush(buffer + decoder.decode());
  } finally {
    clearTimeout(timer);
  }
}
