import { cairoDay } from './social-sync';
import { clientsWithAds, costPerConversion, describeAdsError, fetchClientAds, money } from './ads-metrics';
import { escapeHtml as h } from './telegram';

// Google Ads in Telegram: the "📈 Google Ads" menu screen and the digest line.
// Dates are Cairo days; Google Ads reports by each account's own time zone,
// so a day can be shifted by a few hours. Fine for a daily overview.

const DAY = 86_400_000;
const day = (offset: number) => cairoDay(new Date(Date.now() - offset * DAY));
const pct = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);
const arrow = (cur: number, prev: number) => {
  const p = pct(cur, prev);
  return p === null ? '' : p === 0 ? ' (=)' : ` (${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%)`;
};

/** Last 7 days vs the 7 before, per client with linked ad accounts. */
export async function adsScreenText() {
  const clients = await clientsWithAds();
  const lines = ['📈 <b>Google Ads</b>', `<i>Last 7 days vs the 7 before</i>`, ''];
  if (!clients.length) {
    lines.push('No ad accounts are linked to clients yet.', 'Link them in Admin → Settings → Google Ads.');
    return lines.join('\n');
  }
  for (const c of clients) {
    try {
      const [cur, prev] = await Promise.all([fetchClientAds(c.id, day(7), day(1)), fetchClientAds(c.id, day(14), day(8))]);
      if (!cur || !prev) continue;
      const cpa = costPerConversion(cur.totals);
      lines.push(
        `<b>${h(c.brandName)}</b>`,
        `💰 ${money(cur.totals.cost, cur.currency)}${arrow(cur.totals.cost, prev.totals.cost)} · 👆 ${cur.totals.clicks} clicks${arrow(cur.totals.clicks, prev.totals.clicks)}`,
        `🎯 ${Math.round(cur.totals.conversions * 10) / 10} conversions${arrow(cur.totals.conversions, prev.totals.conversions)}${cpa !== null ? ` · ${money(cpa, cur.currency)} each` : ''}`,
        ...(cur.campaigns[0] ? [`Top: ${h(cur.campaigns[0].name)} (${money(cur.campaigns[0].cost, cur.currency)})`] : []),
        ''
      );
    } catch (error) {
      lines.push(`<b>${h(c.brandName)}</b>`, `⚠️ ${h(describeAdsError(error))}`, '');
      // One expired connection fails for every client, so say it once.
      if (/Reconnect|not connected/.test(describeAdsError(error))) break;
    }
  }
  return lines.join('\n').trim();
}

/**
 * Digest lines: yesterday's spend per client, flagging accounts that spent in the
 * previous week but nothing yesterday (billing, disapprovals or paused campaigns).
 */
export async function adsDigestLines() {
  const clients = await clientsWithAds();
  if (!clients.length) return [];
  const lines: string[] = [];
  for (const c of clients) {
    try {
      const [yesterday, week] = await Promise.all([fetchClientAds(c.id, day(1), day(1)), fetchClientAds(c.id, day(8), day(2))]);
      if (!yesterday || !week) continue;
      const t = yesterday.totals;
      if (t.cost === 0 && week.totals.cost > 0) {
        lines.push(`• ⚠️ ${h(c.brandName)}: no spend yesterday (spent ${money(week.totals.cost, week.currency)} the week before). Check billing and ad status.`);
      } else if (t.cost > 0) {
        lines.push(`• ${h(c.brandName)}: ${money(t.cost, yesterday.currency)} · ${t.clicks} clicks · ${Math.round(t.conversions * 10) / 10} conv.`);
      }
    } catch (error) {
      return [`⚠️ ${h(describeAdsError(error))}`];
    }
  }
  return lines.length ? ['📈 <b>Google Ads yesterday</b>', ...lines] : [];
}
