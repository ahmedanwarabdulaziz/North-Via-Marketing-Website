import { appRoute } from '@/lib/app-auth';
import { clientAdsAccounts, describeAdsError, fetchClientAds, fetchClientKeywords } from '@/lib/ads-metrics';
import { adsWatchState } from '@/lib/ads-watch';
import { adStatusLabel, clientMetaAdAccounts, describeMetaAdsError, fetchClientMetaAds } from '@/lib/meta-ads';
import { cairoDay } from '@/lib/social-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DAY = 86_400_000;
const day = (offset: number) => cairoDay(new Date(Date.now() - offset * DAY));

type Ctx = { params: Promise<{ clientId: string }> };

/** One client's campaigns (Google), ads (Meta) and top keywords for the last 7 or 30 days. GET ?days=7|30 */
export const GET = appRoute<Ctx>(async (request, _device, { params }) => {
  const { clientId } = await params;
  const days = new URL(request.url).searchParams.get('days') === '30' ? 30 : 7;
  const [googleAccounts, metaAccounts, watch] = await Promise.all([clientAdsAccounts(clientId), clientMetaAdAccounts(clientId), adsWatchState()]);
  const health = watch.clients?.[clientId] || {};

  const google = googleAccounts.length
    ? await Promise.all([fetchClientAds(clientId, day(days), day(1)), fetchClientKeywords(clientId, day(days), day(1)).catch(() => ({ source: 'keywords' as const, items: [] }))])
        .then(([ads, keywords]) => ({
          currency: ads?.currency || 'CAD',
          campaigns: (ads?.campaigns || []).slice(0, 15).map((c) => ({ name: c.name, status: c.status, spend: c.cost, clicks: c.clicks, conversions: c.conversions })),
          keywords: keywords.items.slice(0, 10).map((k) => ({ text: k.text, clicks: k.clicks })),
          health: health.google || null,
          error: null as string | null,
        }))
        .catch((error) => ({ error: describeAdsError(error), health: health.google || null }))
    : null;

  const meta = metaAccounts.length
    ? await fetchClientMetaAds(clientId, day(days), day(1))
        .then((r) => ({
          currency: r?.currency || 'CAD',
          ads: (r?.ads || []).slice(0, 15).map((a) => ({ name: a.name, status: adStatusLabel(a.status), active: a.status === 'ACTIVE', spend: a.spend, reach: a.reach, clicks: a.clicks, linkClicks: a.linkClicks })),
          health: health.meta || null,
          error: null as string | null,
        }))
        .catch((error) => ({ error: describeMetaAdsError(error), health: health.meta || null }))
    : null;

  return { days, google, meta };
});
