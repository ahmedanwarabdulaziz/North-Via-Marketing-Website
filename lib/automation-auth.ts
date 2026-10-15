import crypto from 'crypto';

function safeEqual(a: string, b: string) {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left, right);
}

/**
 * Machine access for n8n (REVIEWS_API_KEY) and Vercel Cron (CRON_SECRET),
 * both sent as `Authorization: Bearer <secret>`. These routes sit outside the
 * admin session proxy, so this check is their only gate.
 */
export function isAutomationRequest(request: Request) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return false;
  return [process.env.REVIEWS_API_KEY, process.env.CRON_SECRET]
    .filter((s): s is string => Boolean(s && s.length >= 32))
    .some((secret) => safeEqual(token, secret));
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
