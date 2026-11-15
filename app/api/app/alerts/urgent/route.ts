import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { ALERT_KINDS, markSeen, setUrgentKinds, unseenUrgent, urgentKinds } from '@/lib/urgent-alerts';

export const dynamic = 'force-dynamic';

/** Which kinds are urgent, and the urgent alerts not seen yet (for the pop-up when the app opens). */
export const GET = appRoute(async () => {
  const [kinds, unseen] = await Promise.all([urgentKinds(), unseenUrgent()]);
  return {
    kinds: ALERT_KINDS.map((k) => ({ ...k, urgent: kinds.includes(k.key) })),
    unseen: unseen.map((a) => ({ id: a.id, kind: a.kind, title: a.title, body: a.body, data: a.data || {}, createdAt: a.created_at })),
  };
});

/**
 * { kinds: string[] }  which alert kinds are urgent
 * { seen: string[] | 'all' }  mark urgent alerts seen
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ kinds?: unknown; seen?: unknown }>(request);
  if (Array.isArray(body.kinds)) return { kinds: await setUrgentKinds(body.kinds.filter((k): k is string => typeof k === 'string')) };
  if (body.seen === 'all') {
    await markSeen('all');
    return { ok: true };
  }
  if (Array.isArray(body.seen)) {
    await markSeen(body.seen.filter((k): k is string => typeof k === 'string' && /^[A-Za-z0-9_-]{4,20}$/.test(k)));
    return { ok: true };
  }
  throw new AppError('Nothing to change.');
});
