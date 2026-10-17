import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { checkScheduledRun, digestSentToday, markScheduledRun } from '@/lib/digest-schedule';
import { draftBacklog } from '@/lib/review-engine';
import { runDailyDigest, sendReviewDigest } from '@/lib/review-telegram';
import { runWebsiteChecks } from '@/lib/website-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called by n8n. With ?scheduled=1 (the hourly n8n trigger) it sends the digest only
 * at the times chosen in the panel; other hours draft any waiting replies and, if
 * today's digest already went out, send those as a follow-up. Without the flag it
 * runs the digest immediately. Scheduled calls also run the hourly website checks.
 */
export async function POST(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();

  const scheduled = new URL(request.url).searchParams.get('scheduled') === '1';
  try {
    if (scheduled) {
      // Website checks run every hour alongside the review work (in parallel, to stay
      // inside the time limit); Telegram only hears about changes.
      const websitesRun = runWebsiteChecks().catch((error) => {
        console.error('Website checks failed:', error);
        return { error: error instanceof Error ? error.message : 'Website checks failed' };
      });
      const check = await checkScheduledRun();
      if (!check.due) {
        const backlog = await draftBacklog({ timeBudgetMs: 30_000 });
        let followUp = null;
        if (backlog.drafted > 0 && (await digestSentToday())) {
          followUp = await sendReviewDigest({ onlyUnsent: true, followUp: true });
        }
        return Response.json({ skipped: true, reason: check.reason, backlog, followUp, websites: await websitesRun });
      }
      const result = await runDailyDigest();
      await markScheduledRun(check.runKey);
      return Response.json({ ...result, websites: await websitesRun });
    }
    return Response.json(await runDailyDigest());
  } catch (error) {
    console.error('Review digest failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Digest failed' }, { status: 500 });
  }
}
