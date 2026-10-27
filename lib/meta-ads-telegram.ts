import { listDocs } from './data/store';
import { cairoDay } from './social-sync';
import { money } from './ads-metrics';
import { clientIdsWithMetaAds, describeMetaAdsError, fetchClientMetaAds } from './meta-ads';
import { escapeHtml as h } from './telegram';

// Facebook Ads in Telegram: the "📘 Facebook Ads" menu screen and the digest line.
// Dates are Cairo days; Meta reports by each ad account's own time zone, so a day
// can be shifted by a few hours. Fine for a daily overview.

const DAY = 86_400_000;
const day = (offset: number) => cairoDay(new Date(Date.now() - offset * DAY));
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);
const arrow = (cur: number, prev: number) => {
  const p = pct(cur, prev);
  return p === null ? '' : p === 0 ? ' (=)' : ` (${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%)`;
};

async function clientsWithMetaAds() {
  const ids = await clientIdsWithMetaAds();
  if (!ids.length) return [];
  const clients = await listDocs<{ brandName: string }>('clients', { where: { id: ids } });
  return clients.sort((a, b) => a.brandName.localeCompare(b.brandName));
}

export type MetaAdsPeriod = 'today' | 7 | 30;

/**
 * Today so far, or the last 7 (or 30) full days vs the same length before, per client
 * with a linked ad account. Today has no comparison: a part day against a full one misleads.
 * Telegram allows 4096 characters per message, so with many clients the ad lists get shorter.
 */
export async function metaAdsScreenText(period: MetaAdsPeriod = 'today') {
  for (const adLimit of [5, 3, 1]) {
    const text = await metaAdsScreenTextWith(adLimit, period);
    if (text.length <= 3900 || adLimit === 1) return text.slice(0, 4000);
  }
  return '';
}

async function metaAdsScreenTextWith(adLimit: number, period: MetaAdsPeriod) {
  const clients = await clientsWithMetaAds();
  const today = period === 'today';
  const days = today ? 1 : period;
  const lines = ['📘 <b>Facebook Ads</b>', `<i>${today ? 'Today so far' : `Last ${days} days vs the ${days} before`}</i>`, ''];
  if (!clients.length) {
    lines.push('No Facebook ad accounts are linked to clients yet.', 'Link them on each client page (Facebook Ads tab → Choose ad accounts).');
    return lines.join('\n');
  }
  for (const c of clients) {
    try {
      const [cur, prev] = today
        ? [await fetchClientMetaAds(c.id, day(0), day(0)), null]
        : await Promise.all([fetchClientMetaAds(c.id, day(days), day(1)), fetchClientMetaAds(c.id, day(days * 2), day(days + 1))]);
      if (!cur || (!today && !prev)) continue;
      const t = cur.totals;
      const p = prev?.totals || t; // today: no arrows
      const ran = cur.ads.filter((a) => a.impressions > 0);
      lines.push(
        `<b>${h(c.brandName)}</b>`,
        `👀 ${t.reach.toLocaleString('en-CA')} reach${today ? '' : arrow(t.reach, p.reach)} · 👆 ${t.clicks} clicks${today ? '' : arrow(t.clicks, p.clicks)}`,
        `💰 ${money(t.spend, cur.currency)}${today ? '' : arrow(t.spend, p.spend)}${t.clicks ? ` · ${money(t.spend / t.clicks, cur.currency)} per click` : ''}${t.linkClicks ? ` · 🔗 ${t.linkClicks} link clicks` : ''}`,
        ...(ran.length
          ? [
              `📣 ${ran.length > adLimit ? `Top ${adLimit} of ${ran.length} ads` : ran.length === 1 ? 'Ad' : 'Ads'} (clicks):`,
              ...ran.slice(0, adLimit).map((a, i) => `${i + 1}. ${h(a.name)} — ${a.clicks}`),
            ]
          : [today ? 'No ads have run yet today.' : 'No ads ran in this period.']),
        ''
      );
    } catch (error) {
      const reason = describeMetaAdsError(error);
      lines.push(`<b>${h(c.brandName)}</b>`, `⚠️ ${h(reason)}`, '');
      if (/Reconnect/.test(reason)) break; // an expired login fails for every client
    }
  }
  return lines.join('\n').trim();
}

/**
 * Digest lines: yesterday's clicks per client, flagging accounts that spent in the
 * previous week but nothing yesterday (billing, rejected or paused ads).
 */
export async function metaAdsDigestLines() {
  const clients = await clientsWithMetaAds();
  if (!clients.length) return [];
  const lines: string[] = [];
  for (const c of clients) {
    try {
      const [yesterday, week] = await Promise.all([fetchClientMetaAds(c.id, day(1), day(1)), fetchClientMetaAds(c.id, day(8), day(2))]);
      if (!yesterday || !week) continue;
      const t = yesterday.totals;
      if (t.spend === 0 && week.totals.spend > 0) {
        lines.push(`• ⚠️ ${h(c.brandName)}: no spend yesterday (spent ${money(week.totals.spend, week.currency)} the week before). Check billing and ad status.`);
      } else if (t.spend > 0) {
        lines.push(`• ${h(c.brandName)}: ${t.reach.toLocaleString('en-CA')} reach · ${t.clicks} clicks · ${money(t.spend, yesterday.currency)}`);
      }
    } catch (error) {
      return [`📘 ⚠️ Facebook Ads: ${h(describeMetaAdsError(error))}`];
    }
  }
  return lines.length ? ['📘 <b>Facebook Ads yesterday</b>', ...lines] : [];
}
