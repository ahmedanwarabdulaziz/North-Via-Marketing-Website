import { listDocs } from './data/store';
import { MIN_CONVERSIONS_TO_SHOW } from './ads-thresholds';
import { analyticsConnected, describeGaError, fetchGa4, getGa4Summary } from './ga4';
import { listClaritySnapshots } from './clarity';
import { cairoDay } from './social-sync';
import { describeSearchError, fetchSearchPeriod, getSearchSummary, searchConsoleReady, searchWindows } from './search-console';
import { escapeHtml as h } from './telegram';

// "🧭 Website analytics" in the Telegram menu: GA4 visitors per client (7 or 30 days
// vs the same length before) and the latest Clarity snapshot.

const DAY = 86_400_000;
const day = (offset: number) => cairoDay(new Date(Date.now() - offset * DAY));
const fmt = (n: number) => n.toLocaleString('en-CA');
const arrow = (cur: number, prev: number) => {
  if (!prev) return '';
  const p = Math.round(((cur - prev) / prev) * 100);
  return p === 0 ? ' (=)' : ` (${p > 0 ? '▲' : '▼'} ${Math.abs(p)}%)`;
};

export async function analyticsScreenText(days: 7 | 30 = 7) {
  const clients = (await listDocs<{ brandName: string; ga4PropertyId?: string; clarityApiTokenEncrypted?: string; searchConsoleSite?: string }>('clients'))
    .filter((c) => c.ga4PropertyId || c.clarityApiTokenEncrypted || c.searchConsoleSite)
    .sort((a, b) => a.brandName.localeCompare(b.brandName));
  const lines = ['🧭 <b>Website analytics</b>', `<i>GA4 & Google search: last ${days} days vs the ${days} before (search ends ~3 days ago) · Clarity: latest day</i>`, ''];
  if (!clients.length) {
    lines.push('No client has GA4, Search Console or Clarity connected yet.', 'Connect them on each client page (Analytics and Search Console tabs).');
    return lines.join('\n');
  }

  const gaOn = await analyticsConnected().catch(() => false);
  const searchOn = (await searchConsoleReady().catch(() => ({ hasScope: false }))).hasScope;
  let gaFailure: string | null = null;
  let searchFailure: string | null = null;

  for (const c of clients) {
    lines.push(`<b>${h(c.brandName)}</b>`);

    if (c.ga4PropertyId && gaOn && !gaFailure) {
      try {
        // The 7-day numbers are saved daily at 10 AM; 30 days is read live.
        const saved = days === 7 ? await getGa4Summary(c.id) : null;
        if (saved && saved.propertyId === c.ga4PropertyId) {
          lines.push(
            `👥 ${fmt(saved.visitors)} visitors${arrow(saved.visitors, saved.visitorsBefore)} · ${fmt(saved.sessions)} visits · ${saved.engagementRate}% engaged`,
            ...(saved.keyEvents !== null ? [`🎯 ${fmt(saved.keyEvents)} key actions`] : []),
            ...(saved.topSource ? [`🔗 Top source: ${h(saved.topSource)}`] : [])
          );
        } else {
          const [cur, prev] = await fetchGa4(c.ga4PropertyId, [{ start: day(days), end: day(1) }, { start: day(days * 2), end: day(days + 1) }]);
          const t = cur.totals;
          lines.push(
            `👥 ${fmt(t.visitors)} visitors${arrow(t.visitors, prev.totals.visitors)} · ${fmt(t.sessions)} visits${arrow(t.sessions, prev.totals.sessions)} · ${t.engagementRate}% engaged`,
            ...(t.keyEvents >= MIN_CONVERSIONS_TO_SHOW ? [`🎯 ${fmt(t.keyEvents)} key actions${arrow(t.keyEvents, prev.totals.keyEvents)}`] : []),
            ...(cur.channels.length ? [`🔗 ${cur.channels.slice(0, 3).map((ch) => `${h(ch.name)} ${Math.round((ch.sessions / (t.sessions || 1)) * 100)}%`).join(' · ')}`] : []),
            ...(cur.pages[0] ? [`📄 Top page: ${h(cur.pages[0].title || cur.pages[0].path)} (${fmt(cur.pages[0].views)} views)`] : [])
          );
        }
      } catch (error) {
        // A login or API problem affects every client, so it's reported once at the end.
        gaFailure = describeGaError(error);
      }
    } else if (c.ga4PropertyId && !gaOn) {
      gaFailure = 'Google Analytics is not connected. Connect it on a client page (Analytics tab).';
    }

    if (c.searchConsoleSite && searchOn && !searchFailure) {
      try {
        const saved = days === 7 ? await getSearchSummary(c.id) : null;
        if (saved && saved.siteUrl === c.searchConsoleSite) {
          lines.push(`🔎 ${fmt(saved.clicks)} Google clicks${arrow(saved.clicks, saved.clicksBefore)} · avg position ${saved.position}${saved.topQueries[0] ? ` · top: “${h(saved.topQueries[0].query)}”` : ''}`);
        } else {
          const w = searchWindows(days);
          const [cur, prev] = await Promise.all([fetchSearchPeriod(c.searchConsoleSite, w.current, true), fetchSearchPeriod(c.searchConsoleSite, w.previous, false)]);
          lines.push(`🔎 ${fmt(cur.totals.clicks)} Google clicks${arrow(cur.totals.clicks, prev.totals.clicks)} · avg position ${cur.totals.position}${cur.queries[0] ? ` · top: “${h(cur.queries[0].query)}”` : ''}`);
        }
      } catch (error) {
        searchFailure = describeSearchError(error);
      }
    }

    if (c.clarityApiTokenEncrypted) {
      const snaps = await listClaritySnapshots(c.id).catch(() => []);
      const last = snaps.at(-1);
      if (last) {
        const before = snaps.slice(-8, -1).map((s) => s.rageClickPct).filter((v): v is number => v !== undefined);
        const avgRage = before.length ? before.reduce((a, b) => a + b, 0) / before.length : null;
        lines.push(
          `🖱 Clarity (${last.day}): ${last.sessions !== undefined ? `${fmt(last.sessions)} sessions · ` : ''}${last.scrollDepth !== undefined ? `${Math.round(last.scrollDepth)}% scroll` : ''}`,
          `   Rage clicks ${last.rageClickPct?.toFixed(1) ?? '—'}%${avgRage !== null ? ` (usually ${avgRage.toFixed(1)}%)` : ''} · Dead clicks ${last.deadClickPct?.toFixed(1) ?? '—'}%`
        );
      } else {
        lines.push('🖱 Clarity connected: first snapshot at 10 AM Cairo.');
      }
    }
    lines.push('');
  }
  if (gaFailure) lines.push(`⚠️ ${h(gaFailure)}`);
  if (searchFailure) lines.push(`⚠️ ${h(searchFailure)}`);
  return lines.join('\n').trim().slice(0, 4000);
}
