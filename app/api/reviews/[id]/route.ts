import { db } from '@/lib/firebase';
import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { GBP_REVIEWS, getStoredReview, postApprovedReply, regenerateReviewDraft } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Acts on one review: { action: "approve" | "skip" | "regenerate", reply?: string }.
 * "approve" publishes publicly — call it only from a human tap (e.g. a Telegram
 * approval button), never from an automatic step.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAutomationRequest(request)) return unauthorized();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  try {
    const review = await getStoredReview(id);
    if (!review) return Response.json({ error: 'Review not found' }, { status: 404 });

    if (action === 'approve') {
      const reply = typeof body.reply === 'string' && body.reply.trim() ? body.reply : review.draft;
      if (!reply) return Response.json({ error: 'No draft to approve' }, { status: 400 });
      await postApprovedReply(id, reply);
      return Response.json({ success: true, status: 'posted' });
    }
    if (action === 'skip') {
      await db.collection(GBP_REVIEWS).doc(id).update({ status: 'skipped', updatedAt: new Date().toISOString() });
      return Response.json({ success: true, status: 'skipped' });
    }
    if (action === 'regenerate') {
      const draft = await regenerateReviewDraft(id);
      return Response.json({ success: true, status: 'draft_ready', draft });
    }
    return Response.json({ error: 'action must be approve, skip or regenerate' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
