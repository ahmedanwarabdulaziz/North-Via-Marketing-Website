import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { listClientProfiles } from '@/lib/admin-ops';
import { adLibraryUrl } from '@/lib/competitor-telegram';
import { clientInstagramGrowth, competitorStatus, googleGrowth, instagramGrowth, listCompetitors, listFindings, runCompetitorChecks } from '@/lib/competitors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Competitors of one client (same data as Admin → Competitors): Instagram followers and growth,
 * Google rating, last checks, and the latest findings (offers, new products, events…).
 * GET ?client=<id> (default: the first client that has competitors)
 */
export const GET = appRoute(async (request) => {
  const wanted = new URL(request.url).searchParams.get('client');
  const clients = (await listClientProfiles()).filter((c) => c.id && c.brandName).map((c) => ({ id: c.id!, name: c.brandName }));
  const withCompetitors: { id: string; name: string; count: number }[] = [];
  for (const c of clients) {
    const n = (await listCompetitors(c.id)).length;
    if (n) withCompetitors.push({ ...c, count: n });
  }
  const clientId = withCompetitors.find((c) => c.id === wanted)?.id || withCompetitors[0]?.id || '';
  if (!clientId) return { clients: [], clientId: null, own: null, competitors: [], findings: [] };

  const [list, findings, own] = await Promise.all([listCompetitors(clientId), listFindings(clientId), clientInstagramGrowth(clientId).catch(() => null)]);
  const competitors = await Promise.all(
    list.map(async (c) => ({
      id: c.id,
      name: c.name,
      website: c.website || null,
      instagram: c.instagram || null,
      notes: c.notes || null,
      status: await competitorStatus(c.id),
      instagramGrowth: await instagramGrowth(c.id),
      googleGrowth: await googleGrowth(c.id),
      adsUrl: adLibraryUrl(c),
    }))
  );
  return {
    clients: withCompetitors,
    clientId,
    own, // the client's own Instagram, to compare
    competitors,
    findings: findings.slice(0, 30).map((f) => ({ id: f.id, at: f.at, competitorName: f.competitorName, source: f.source, kind: f.kind, title: f.title, detail: f.detail, idea: f.idea || null, url: f.url || null })),
  };
});

/** { action: 'check', id }: checks one competitor right away (Instagram, website, Google). */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ action?: unknown; id?: unknown }>(request);
  if (body.action !== 'check' || typeof body.id !== 'string') throw new AppError('Unknown action.');
  const run = await runCompetitorChecks({ onlyId: body.id, force: true, budgetMs: 45_000 });
  return { ok: true, findings: run.findings.length };
});
