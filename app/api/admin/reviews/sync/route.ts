import { isAdminAuthenticated } from '@/lib/admin-auth';
import { syncAllReviews } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// "Check now" button in the admin panel (session-protected by the proxy and here).
export async function POST() {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return Response.json(await syncAllReviews());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Sync failed' }, { status: 500 });
  }
}
