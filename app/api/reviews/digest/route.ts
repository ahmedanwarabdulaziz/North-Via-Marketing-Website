import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { runDailyDigest } from '@/lib/review-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Daily job called by n8n: check Google, draft replies, send new ones to Telegram for approval.
export async function POST(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  try {
    return Response.json(await runDailyDigest());
  } catch (error) {
    console.error('Review digest failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Digest failed' }, { status: 500 });
  }
}
