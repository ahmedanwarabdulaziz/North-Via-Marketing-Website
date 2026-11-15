import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appReview, clientNames } from '@/lib/app-api';
import { approveFiveStarDrafts, GBP_REVIEWS } from '@/lib/review-engine';
import { listDocs } from '@/lib/data/store';
import type { GbpReviewStatus, GbpStoredReview } from '@/types/database';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WAITING: GbpReviewStatus[] = ['draft_ready', 'needs_draft'];
const ANSWERED: GbpReviewStatus[] = ['posted', 'replied', 'skipped'];

/**
 * Google reviews, newest first.
 * GET ?view=waiting (default: draft ready or needs a draft) | answered &client=<client id>
 * Old backlog reviews found by a full scan stay out until released from Telegram.
 */
export const GET = appRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const view = params.get('view') || 'waiting';
  if (view !== 'waiting' && view !== 'answered') throw new AppError('view must be waiting or answered.');
  const client = params.get('client');

  const [names, rows] = await Promise.all([
    clientNames(),
    listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: view === 'waiting' ? WAITING : ANSWERED, ...(client ? { clientId: client } : {}) } }),
  ]);
  const reviews = rows
    .filter((r) => r.backlog !== 'waiting' && r.backlog !== 'dismissed')
    .sort((a, b) => b.createTime.localeCompare(a.createTime))
    .slice(0, view === 'waiting' ? 200 : 60);

  // Per-client counts for the filter chips (waiting view only).
  const counts: Record<string, number> = {};
  if (view === 'waiting') for (const r of reviews) counts[r.clientId] = (counts[r.clientId] || 0) + 1;

  return {
    reviews: reviews.map((r) => appReview(r, names)),
    clients: Object.entries(counts).map(([id, count]) => ({ id, name: names.get(id) || 'Client', count })),
    fiveStarReady: reviews.filter((r) => r.rating === 5 && r.status === 'draft_ready' && r.draft).length,
  };
});

/**
 * { action: 'approve_five', clientId? }: posts every ready 5★ draft (of one client, or all).
 * Ratings are re-checked on the server, so 4★ and below are never bulk-posted.
 */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ action?: unknown; clientId?: unknown }>(request);
  if (body.action !== 'approve_five') throw new AppError('Unknown action.');
  let ids: string[] | undefined;
  if (typeof body.clientId === 'string' && body.clientId) {
    const mine = await listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: 'draft_ready', clientId: body.clientId } });
    ids = mine.map((r) => r.id);
    if (!ids.length) return { posted: 0, failed: [] };
  }
  const results = await approveFiveStarDrafts(ids);
  return {
    posted: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).map((r) => r.error || 'failed'),
  };
});
