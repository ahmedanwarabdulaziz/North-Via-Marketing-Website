import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { supabase } from './supabase';

// Sign-in for the Anwarz mobile app. The app logs in once with the admin password and gets a
// long-lived token (sent as `Authorization: Bearer <token>`). The token names a row in
// app_devices; signing out (or revoking the row) ends it. /api/app/* routes sit outside the
// admin cookie proxy, so requireApp() is their only gate.

const TOKEN_DAYS = 180;
const SEEN_EVERY_MS = 10 * 60_000;

export interface AppDevice {
  id: string;
  name: string | null;
  platform: string;
  push_token: string | null;
  app_version: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

/** A key of its own (derived from SESSION_SECRET), so admin cookies and app tokens can't stand in for each other. */
function tokenKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error('SESSION_SECRET is not set.');
  return crypto.createHmac('sha256', secret).update('anwarz-mobile-app-token').digest();
}

export function passwordMatches(input: string) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !input) return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function createDeviceSession(info: { name?: string | null; platform?: string | null; appVersion?: string | null }) {
  const id = crypto.randomBytes(9).toString('base64url');
  const { error } = await supabase.from('app_devices').insert({
    id,
    name: info.name?.slice(0, 80) || null,
    platform: (info.platform || 'android').slice(0, 20),
    app_version: info.appVersion?.slice(0, 40) || null,
  });
  if (error) throw new Error(error.message);
  const expiresAt = new Date(Date.now() + TOKEN_DAYS * 86_400_000);
  const token = await new SignJWT({ role: 'app' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(tokenKey());
  return { token, deviceId: id, expiresAt: expiresAt.toISOString() };
}

/** The signed-in phone for this request, or null. */
export async function appDevice(request: Request): Promise<AppDevice | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  let deviceId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, tokenKey(), { algorithms: ['HS256'] });
    if (payload.role !== 'app') return null;
    deviceId = payload.sub;
  } catch {
    return null;
  }
  if (!deviceId) return null;
  const { data, error } = await supabase.from('app_devices').select().eq('id', deviceId).maybeSingle();
  if (error || !data || data.revoked_at) return null;
  const device = data as AppDevice;
  if (!device.last_seen_at || Date.now() - Date.parse(device.last_seen_at) > SEEN_EVERY_MS) {
    await supabase.from('app_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);
  }
  return device;
}

export async function revokeDevice(id: string) {
  const { error } = await supabase.from('app_devices').update({ revoked_at: new Date().toISOString(), push_token: null }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setDevicePush(id: string, pushToken: string | null, appVersion?: string | null) {
  if (pushToken) {
    // One phone, one row: an older sign-in on the same phone stops getting the alerts.
    await supabase.from('app_devices').update({ push_token: null }).eq('push_token', pushToken).neq('id', id);
  }
  const patch: Record<string, unknown> = { push_token: pushToken };
  if (appVersion) patch.app_version = appVersion.slice(0, 40);
  const { error } = await supabase.from('app_devices').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Handler<C> = (request: Request, device: AppDevice, context: C) => Promise<Response | unknown>;

/**
 * Wraps an /api/app route: checks the token, turns a returned object into JSON and errors into
 * `{ error }` with a status (AppError's, or 500 without internal details).
 */
export function appRoute<C = unknown>(handler: Handler<C>) {
  return async (request: Request, context: C) => {
    const device = await appDevice(request).catch(() => null);
    if (!device) return Response.json({ error: 'Not signed in' }, { status: 401 });
    try {
      const result = await handler(request, device, context);
      return result instanceof Response ? result : Response.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof AppError) return Response.json({ error: error.message }, { status: error.status });
      console.error('App API failed:', request.method, new URL(request.url).pathname, error);
      return Response.json({ error: 'Something went wrong. Try again.' }, { status: 500 });
    }
  };
}

export async function jsonBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    if (body && typeof body === 'object') return body as T;
  } catch {
    // fall through
  }
  throw new AppError('Expected a JSON body.');
}
