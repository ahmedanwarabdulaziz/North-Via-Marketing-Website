import Constants from 'expo-constants';
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
