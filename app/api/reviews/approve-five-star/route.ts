import { isAutomationRequest, unauthorized } from '@/lib/automation-auth';
import { approveFiveStarDrafts } from '@/lib/review-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Bulk-approves 5-star reviews that have an AI draft. Optional body
 * { reviewIds: string[] } limits it to those reviews. Only call from a human
 * "approve all 5★" tap.
 */
export async function POST(request: Request) {
  if (!isAutomationRequest(request)) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.reviewIds) ? body.reviewIds.filter((v: unknown) => typeof v === 'string') : undefined;
  const results = await approveFiveStarDrafts(ids);
  return Response.json({ results, posted: results.filter((r) => r.success).length });
}
