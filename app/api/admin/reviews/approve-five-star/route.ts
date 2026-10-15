import { isAdminAuthenticated } from '@/lib/admin-auth';
import { approveFiveStarDrafts } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.reviewIds) ? body.reviewIds.filter((v: unknown) => typeof v === 'string') : [];
  if (ids.length === 0) return Response.json({ error: 'Select at least one review' }, { status: 400 });
  const results = await approveFiveStarDrafts(ids);
  return Response.json({ results, posted: results.filter((r) => r.success).length });
}
