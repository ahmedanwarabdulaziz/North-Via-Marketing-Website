import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { generateSuggestions, listSuggestions, type SuggestionRow, type SuggestionStatus } from '@/lib/ads-suggest';
import { clientsWithAds } from '@/lib/ads-metrics';
import { unnotifiedChanges } from '@/lib/ads-client-update';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export function appSuggestion(r: SuggestionRow, names: Map<string, string>) {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: names.get(r.client_id) || 'Client',
    type: r.type,
    text: r.text,
    matchType: r.match_type,
    campaign: r.campaign_name,
    adGroup: r.ad_group_name,
    reason: r.reason,
    evidence: r.evidence,
    status: r.status,
    edited: r.edited,
    error: r.error,
    told: Boolean(r.notified_at),
    createdAt: r.created_at,
    appliedAt: r.applied_at,
  };
}

/**
 * Google Ads improvement ideas.
 * GET ?status=pending (default) | applied | rejected | all   &client=<client id>
 */
export const GET = appRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const status = (params.get('status') || 'pending') as SuggestionStatus | 'all';
  const client = params.get('client');
  const [names, rows, withAds] = await Promise.all([clientNames(), listSuggestions({ clientId: client, status }), clientsWithAds()]);
  const toTell: Record<string, number> = {};
  if (status === 'applied' || status === 'all') {
    for (const r of rows) if (r.status === 'applied' && !r.notified_at) toTell[r.client_id] = (toTell[r.client_id] || 0) + 1;
  } else {
    for (const c of withAds) {
      const n = (await unnotifiedChanges(c.id!).catch(() => [])).length;
      if (n) toTell[c.id!] = n;
    }
  }
  return {
    suggestions: rows.map((r) => appSuggestion(r, names)),
    clients: withAds.map((c) => ({ id: c.id, name: c.brandName })),
    toTell: Object.entries(toTell).map(([id, count]) => ({ id, name: names.get(id) || 'Client', count })),
  };
});

/** { action: 'generate', clientId }: checks the client's Google Ads account and saves new ideas. */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ action?: unknown; clientId?: unknown }>(request);
  if (body.action !== 'generate' || typeof body.clientId !== 'string') throw new AppError('Unknown action.');
  try {
    const result = await generateSuggestions(body.clientId);
    const names = await clientNames();
    return { created: result.created.map((r) => appSuggestion(r, names)), scanned: result.scanned, problems: result.problems };
  } catch (error) {
    throw new AppError(error instanceof Error ? error.message : 'The check failed.', 400);
  }
});
