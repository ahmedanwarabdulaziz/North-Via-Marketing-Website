import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { checkScheduledRun, markScheduledRun } from '@/lib/digest-schedule';
import { runDailyDigest } from '@/lib/review-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called by n8n. With ?scheduled=1 (the hourly n8n trigger) it only runs at the
 * times chosen in the panel; without it, it runs immediately.
 */
export async function POST(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();

  const scheduled = new URL(request.url).searchParams.get('scheduled') === '1';
  let runKey: string | undefined;
  if (scheduled) {
    const check = await checkScheduledRun();
    if (!check.due) return Response.json({ skipped: true, reason: check.reason });
    runKey = check.runKey;
  }

  try {
    const result = await runDailyDigest();
    if (runKey) await markScheduledRun(runKey);
    return Response.json(result);
  } catch (error) {
    console.error('Review digest failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Digest failed' }, { status: 500 });
  }
}
