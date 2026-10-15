import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { listReviewQueue } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const queue = await listReviewQueue();
  return Response.json({
    pending: queue
      .filter((r) => r.status === 'draft_ready' || r.status === 'needs_draft')
      .map(({ id, clientId, locationTitle, reviewerName, rating, comment, draft, draftError, status, createTime }) => ({
        id, clientId, locationTitle, reviewerName, rating, comment, draft: draft || null, draftError: draftError || null, status, createTime,
        approval: rating === 5 && status === 'draft_ready' ? 'bulk' : 'one_by_one',
      })),
  });
}
