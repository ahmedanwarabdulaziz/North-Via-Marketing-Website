import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { listReviewQueue, syncAllReviews } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Fetches new reviews for every monitored location and drafts AI replies.
// Called by n8n on a schedule (POST) and by the daily Vercel cron (GET).
async function run(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();

  const url = new URL(request.url);
  const requested = Number(url.searchParams.get('maxDrafts'));
  const maxDrafts = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 25) : undefined;

  try {
    const summary = await syncAllReviews({ maxDrafts });
    const queue = await listReviewQueue();
    const pending = queue
      .filter((r) => r.status === 'draft_ready' || r.status === 'needs_draft')
      .map(({ id, clientId, locationTitle, reviewerName, rating, comment, draft, draftError, status, createTime }) => ({
        id, clientId, locationTitle, reviewerName, rating, comment, draft: draft || null, draftError: draftError || null, status, createTime,
        approval: rating === 5 && status === 'draft_ready' ? 'bulk' : 'one_by_one',
      }));
    return Response.json({ summary, pending });
  } catch (error) {
    console.error('Review sync failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
