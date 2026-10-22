import { isAdminAuthenticated } from '@/lib/admin-auth';
import { syncAllReviews } from '@/lib/review-engine';
import { sendReviewDigest } from '@/lib/review-telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// "Check now" button in the admin panel (session-protected by the proxy and here).
// Like Telegram's "Check Google now": sync, draft, then send what's new to Telegram.
export async function POST() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  let summary;
  try {
    summary = await syncAllReviews();
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 });
  }
  try {
    const telegram = await sendReviewDigest({ onlyUnsent: true, summary });
    return Response.json({ ...summary, telegram });
  } catch (error) {
    // The check itself worked; report the Telegram failure without hiding the results.
    return Response.json({ ...summary, telegramError: error instanceof Error ? error.message : 'Telegram send failed' });
  }
}
