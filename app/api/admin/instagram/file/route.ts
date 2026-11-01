import { isAdminAuthenticated } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Instagram's file servers don't allow other sites to read their files, so previews and
// downloads pass through here. Only those servers can be reached through this route.
const ALLOWED_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let target: URL;
  try {
    target = new URL(searchParams.get('url') || '');
  } catch {
    return Response.json({ error: 'Bad file link' }, { status: 400 });
  }
  if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
    return Response.json({ error: 'Bad file link' }, { status: 400 });
  }

  const upstream = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(55_000), cache: 'no-store' }).catch(() => null);
  const type = upstream?.headers.get('content-type') || '';
  if (!upstream?.ok || !upstream.body || !/^(image|video)\//.test(type)) {
    return Response.json({ error: 'Instagram did not return the file. Its link may have expired; search again.' }, { status: 502 });
  }

  const headers = new Headers({ 'Content-Type': type, 'Cache-Control': 'private, max-age=3600' });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  const name = (searchParams.get('name') || '').replace(/[^\w.-]/g, '_');
  if (name) headers.set('Content-Disposition', `attachment; filename="${name}"`);
  return new Response(upstream.body, { headers });
}
