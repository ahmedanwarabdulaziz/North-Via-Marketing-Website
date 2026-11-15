import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { clientNames } from '@/lib/app-api';
import { clientsWithAds, costPerConversion, ctr, describeAdsError, fetchClientAds } from '@/lib/ads-metrics';
import { adsWatchState, runAdsWatch, stoppedAds } from '@/lib/ads-watch';
import { clientIdsWithMetaAds, describeMetaAdsError, fetchClientMetaAds } from '@/lib/meta-ads';
import { cairoDay } from '@/lib/social-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAY = 86_400_000;
const day = (offset: number) => cairoDay(new Date(Date.now() - offset * DAY));

/**
 * Google and Meta ads per client for the last 7 or 30 days, with the period before for ▲▼, and the
 * hourly watch's state (running / limited / stopped). GET ?days=7|30
 */
export const GET = appRoute(async (request) => {
  const days = new URL(request.url).searchParams.get('days') === '30' ? 30 : 7;
  const [names, googleClients, metaClients, watch, stopped] = await Promise.all([
    clientNames(),
    clientsWithAds(),
    clientIdsWithMetaAds(),
    adsWatchState(),
    stoppedAds(),
  ]);
  const ids = [...new Set([...googleClients.map((c) => c.id as string), ...metaClients])];

  const clients = await Promise.all(
    ids.map(async (clientId) => {
      const health = watch.clients?.[clientId] || {};
      const [google, meta] = await Promise.all([
        googleClients.some((c) => c.id === clientId)
          ? Promise.all([fetchClientAds(clientId, day(days), day(1)), fetchClientAds(clientId, day(days * 2), day(days + 1))])
              .then(([cur, prev]) =>
                cur
                  ? {
                      currency: cur.currency,
                      spend: cur.totals.cost,
                      impressions: cur.totals.impressions,
                      clicks: cur.totals.clicks,
                      conversions: cur.totals.conversions,
                      ctr: ctr(cur.totals),
                      costPerConversion: costPerConversion(cur.totals),
                      prev: prev ? { spend: prev.totals.cost, impressions: prev.totals.impressions, clicks: prev.totals.clicks, conversions: prev.totals.conversions } : null,
                      health: health.google || null,
                      error: null as string | null,
                    }
                  : null
              )
              .catch((error) => ({ error: describeAdsError(error), health: health.google || null }))
          : null,
        metaClients.includes(clientId)
          ? Promise.all([fetchClientMetaAds(clientId, day(days), day(1)), fetchClientMetaAds(clientId, day(days * 2), day(days + 1))])
              .then(([cur, prev]) =>
                cur
                  ? {
                      currency: cur.currency,
                      spend: cur.totals.spend,
                      reach: cur.totals.reach,
                      impressions: cur.totals.impressions,
                      clicks: cur.totals.clicks,
                      linkClicks: cur.totals.linkClicks,
                      ctr: cur.totals.impressions ? (cur.totals.clicks / cur.totals.impressions) * 100 : null,
                      prev: prev ? { spend: prev.totals.spend, reach: prev.totals.reach, clicks: prev.totals.clicks, linkClicks: prev.totals.linkClicks } : null,
                      health: health.meta || null,
                      error: null as string | null,
                    }
                  : null
              )
              .catch((error) => ({ error: describeMetaAdsError(error), health: health.meta || null }))
          : null,
      ]);
      return { clientId, clientName: names.get(clientId) || 'Client', google, meta };
    })
  );
  return { days, clients: clients.sort((a, b) => a.clientName.localeCompare(b.clientName)), stopped: stopped.stopped, checkedAt: stopped.checkedAt };
});

/** { action: 'check' }: runs the stopped-ads watch now (alerts if something changed). */
export const POST = appRoute(async (request) => {
  const body = await jsonBody<{ action?: unknown }>(request);
  if (body.action !== 'check') throw new AppError('Unknown action.');
  const result = await runAdsWatch({ force: true, budgetMs: 45_000 });
  return { ...result, ...(await stoppedAds()) };
});
