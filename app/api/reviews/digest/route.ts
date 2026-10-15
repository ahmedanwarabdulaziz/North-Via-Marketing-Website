import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { checkScheduledRun, digestSentToday, markScheduledRun } from '@/lib/digest-schedule';
import { draftBacklog } from '@/lib/review-engine';
import { runDailyDigest, sendReviewDigest } from '@/lib/review-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called by n8n. With ?scheduled=1 (the hourly n8n trigger) it sends the digest only
 * at the times chosen in the panel; other hours draft any waiting replies and, if
 * today's digest already went out, send those as a follow-up. Without the flag it
 * runs the digest immediately.
 */
export async function POST(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();

  const scheduled = new URL(request.url).searchParams.get('scheduled') === '1';
  try {
    if (scheduled) {
      const check = await checkScheduledRun();
      if (!check.due) {
        const backlog = await draftBacklog();
        let followUp = null;
        if (backlog.drafted > 0 && (await digestSentToday())) {
          followUp = await sendReviewDigest({ onlyUnsent: true, followUp: true });
        }
        return Response.json({ skipped: true, reason: check.reason, backlog, followUp });
      }
      const result = await runDailyDigest();
      await markScheduledRun(check.runKey);
      return Response.json(result);
    }
    return Response.json(await runDailyDigest());
  } catch (error) {
    console.error('Review digest failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Digest failed' }, { status: 500 });
  }
}
