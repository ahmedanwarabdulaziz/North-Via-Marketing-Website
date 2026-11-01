import { isAdminAuthenticated } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Asks the Instaloader service (services/instagram-downloader) for an account's media.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const base = process.env.INSTAGRAM_SERVICE_URL;
  const key = process.env.INSTAGRAM_SERVICE_KEY;
  if (!base || !key) return Response.json({ code: 'not_configured', error: 'The downloader service is not connected yet.' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const url = new URL('/media', base);
  url.searchParams.set('username', searchParams.get('username') || '');
  url.searchParams.set('limit', '12');
  const cursor = searchParams.get('cursor');
  if (cursor) url.searchParams.set('cursor', cursor);

  try {
    const res = await fetch(url, { headers: { 'x-service-key': key }, signal: AbortSignal.timeout(55_000), cache: 'no-store' });
    return Response.json(await res.json(), { status: res.status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json(
      { code: 'unreachable', error: timedOut ? 'Instagram took too long to answer. Try again.' : 'The downloader service is not responding.' },
      { status: 502 }
    );
  }
}
