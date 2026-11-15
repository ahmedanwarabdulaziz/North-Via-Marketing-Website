import { headers } from 'next/headers';
import { createDeviceSession, passwordMatches } from '@/lib/app-auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * The Anwarz app signs in with the admin password and gets its own long-lived token.
 * Body: { password, deviceName?, platform?, appVersion? } → { token, deviceId, expiresAt }
 */
export async function POST(request: Request) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const limit = checkRateLimit(`app:${ip}`);
  if (!limit.success) return Response.json({ error: limit.error }, { status: 429 });

  let body: { password?: unknown; deviceName?: unknown; platform?: unknown; appVersion?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }
  if (!process.env.ADMIN_PASSWORD) return Response.json({ error: 'Server misconfiguration: password not set.' }, { status: 500 });
  if (typeof body.password !== 'string' || !passwordMatches(body.password)) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }
  resetRateLimit(`app:${ip}`);
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  try {
    return Response.json(await createDeviceSession({ name: str(body.deviceName), platform: str(body.platform), appVersion: str(body.appVersion) }));
  } catch (error) {
    console.error('App login failed:', error);
    return Response.json({ error: 'Could not sign in right now. Try again.' }, { status: 500 });
  }
}
