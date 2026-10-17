import crypto from 'crypto';
import { addDoc, getDoc, listDocs } from './data/store';
import { cairoDay } from './social-sync';
import { conversionsMeaningful, costPerConversion, ctr, describeAdsError, fetchClientAds, fetchClientKeywords } from './ads-metrics';
import { MIN_CONVERSIONS_TO_SHOW } from './ads-thresholds';
import { describeGaError, fetchGa4 } from './ga4';
import { clarityPeriod, listClaritySnapshots } from './clarity';
import type {
  ClientProfile,
  GbpStoredReview,
  SocialAccount,
  SocialFollowerSnapshot,
  SocialPost,
  Website,
  WebsiteCheck,
} from '@/types/database';

// Client reports: one frozen snapshot of a period (7 or 30 days) compared with the
// period before it, shared as a link (/r/<id>). Numbers are computed once at
// creation, so a link sent to a client always shows the same report.

export type ReportLanguage = 'en' | 'ar';
export type ReportDays = 7 | 30;

const SITE = 'https://www.northviamarketing.com';
const DAY = 86_400_000;

/**
 * A metric for this period and the previous one; `previous` is null when there's no
 * history yet. `lastYear` (same dates a year earlier) is only set where it exists.
 */
export interface Compared {
  current: number | null;
  previous: number | null;
  lastYear?: number | null;
}

export interface PlatformStats {
  name: string; // Page name or @username
  followers: number | null;
  followersChange: Compared; // net new followers in each period
  posts: Compared;
  reach: Compared; // Instagram reach; Facebook unique media views
  likes: Compared;
  comments: Compared;
}

export interface ReportPost {
  platform: 'facebook' | 'instagram';
  message: string;
  permalink?: string;
  createdTime: string;
  reach: number;
  likes: number;
  comments: number;
}

export interface ReportData {
  clientName: string;
  days: ReportDays;
  periodStart: string; // YYYY-MM-DD, Cairo
  periodEnd: string;
  previousStart: string;
  previousEnd: string;
  generatedAt: string;
  social: {
    facebook: PlatformStats | null;
    instagram: PlatformStats | null;
    topPosts: ReportPost[];
    followersTrackedSince: string | null; // first follower snapshot
  } | null;
  reviews: {
    newReviews: Compared;
    averageRating: Compared; // of the period's new reviews
    answered: Compared;
    stars: number[]; // count of 5★…1★ this period
  } | null;
  ads: {
    currency: string;
    accounts: string[];
    // Impressions and clicks are the headline results; spend and cost follow.
    impressions: Compared;
    clicks: Compared;
    ctr: Compared; // %
    spend: Compared;
    avgCpc: Compared;
    // Only shown with enough conversions to mean tracking is actually in use.
    showConversions: boolean;
    conversions: Compared;
    costPerConversion: Compared;
    hasLastYear: boolean;
    lastYearStart: string;
    lastYearEnd: string;
    campaigns: Array<{ name: string; cost: number; clicks: number; conversions: number }>;
    keywords: { source: 'keywords' | 'search_terms'; items: Array<{ text: string; impressions: number; clicks: number }> };
  } | null;
  analytics: {
    ga: {
      visitors: Compared;
      sessions: Compared;
      engagementRate: Compared; // %
      pageViews: Compared;
      showKeyEvents: boolean;
      keyEvents: Compared;
      hasLastYear: boolean;
      channels: Array<{ name: string; sessions: number }>;
      pages: Array<{ title: string; path: string; views: number }>;
    } | null;
    clarity: {
      sessions: Compared;
      scrollDepth: Compared; // average %
      rageClickPct: Compared;
      deadClickPct: Compared;
      days: number; // daily snapshots behind the numbers
    } | null;
  } | null;
  websites: {
    uptime: Compared; // % across all monitored pages
    incidents: Compared;
    avgResponseMs: Compared;
    pages: Array<{ label: string; url: string; uptime: number | null; sslDaysLeft: number | null }>;
    trackedSince: string | null;
  } | null;
}

export interface StoredReport {
  clientId: string;
  periodDays: ReportDays;
  language: ReportLanguage;
  periodStart: string;
  periodEnd: string;
  data: ReportData;
  createdAt: string;
}

// ---------- Helpers ----------

interface Window {
  start: number; // ms, inclusive
  end: number; // ms, exclusive
}

const inWindow = (iso: string | undefined, w: Window) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= w.start && t < w.end;
};
const sum = (values: Array<number | undefined>) => values.reduce<number>((a, v) => a + (v || 0), 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Start of a Cairo calendar day as a UTC timestamp. */
function cairoMidnight(day: string) {
  // Cairo is UTC+2 or +3 (DST); find the instant whose Cairo date is `day` at 00:00.
  for (const offset of [2, 3]) {
    const t = Date.parse(`${day}T00:00:00Z`) - offset * 3600_000;
    if (cairoDay(new Date(t)) === day && cairoDay(new Date(t - 3600_000)) !== day) return t;
  }
  return Date.parse(`${day}T00:00:00Z`) - 2 * 3600_000;
}

function windows(days: ReportDays) {
  // The period ends with yesterday (Cairo), so every day in it is complete.
  const today = cairoDay();
  const end = cairoMidnight(today);
  const start = end - days * DAY;
  const prevStart = start - days * DAY;
  return {
    current: { start, end } as Window,
    previous: { start: prevStart, end: start } as Window,
    labels: {
      periodStart: cairoDay(new Date(start + 3 * 3600_000)),
      periodEnd: cairoDay(new Date(end - 3 * 3600_000)),
      previousStart: cairoDay(new Date(prevStart + 3 * 3600_000)),
      previousEnd: cairoDay(new Date(start - 3 * 3600_000)),
    },
  };
}

// ---------- Sections ----------

async function socialSection(clientId: string, w: ReturnType<typeof windows>) {
  const accounts = (await listDocs<SocialAccount>('social_accounts', { where: { clientId } })).filter((a) => a.linked);
  if (!accounts.length) return null;
  const ids = accounts.map((a) => a.id);
  const [posts, snaps] = await Promise.all([
    listDocs<SocialPost>('social_posts', { where: { accountId: ids } }),
    listDocs<SocialFollowerSnapshot>('social_follower_snapshots', { where: { accountId: ids } }),
  ]);

  const followersAt = (field: 'fbFollowers' | 'igFollowers', dayIso: string) => {
    // Per account: the last snapshot on or before the day; null if none exists yet.
    let total = 0;
    for (const id of ids) {
      const s = snaps.filter((x) => x.accountId === id && x.day <= dayIso && x[field] !== undefined).sort((a, b) => b.day.localeCompare(a.day))[0];
      if (!s) return null;
      total += s[field]!;
    }
    return total;
  };
  const latestFollowers = (field: 'fbFollowers' | 'igFollowers') => {
    let total = 0;
    let found = false;
    for (const id of ids) {
      const s = snaps.filter((x) => x.accountId === id && x[field] !== undefined).sort((a, b) => b.day.localeCompare(a.day))[0];
      if (s) {
        total += s[field]!;
        found = true;
      }
    }
    return found ? total : null;
  };
  const change = (field: 'fbFollowers' | 'igFollowers', from: string, to: string) => {
    const a = followersAt(field, from);
    const b = followersAt(field, to);
    return a === null || b === null ? null : b - a;
  };
  const dayBefore = (iso: string) => cairoDay(new Date(cairoMidnight(iso) - 12 * 3600_000));

  const platform = (key: 'facebook' | 'instagram'): PlatformStats | null => {
    const list = posts.filter((p) => p.platform === key);
    const field = key === 'facebook' ? 'fbFollowers' : 'igFollowers';
    const followers = latestFollowers(field);
    if (!list.length && followers === null) return null;
    const cur = list.filter((p) => inWindow(p.createdTime, w.current));
    const prev = list.filter((p) => inWindow(p.createdTime, w.previous));
    // Posts are stored for ~2 months, so the previous window has data once the account was synced.
    const metric = (pick: (p: SocialPost) => number | undefined): Compared => ({ current: sum(cur.map(pick)), previous: sum(prev.map(pick)) });
    return {
      name: key === 'facebook' ? accounts.map((a) => a.pageName).join(', ') : accounts.filter((a) => a.igUsername).map((a) => `@${a.igUsername}`).join(', '),
      followers,
      followersChange: {
        current: change(field, dayBefore(w.labels.periodStart), w.labels.periodEnd),
        previous: change(field, dayBefore(w.labels.previousStart), w.labels.previousEnd),
      },
      posts: { current: cur.length, previous: prev.length },
      reach: metric((p) => p.reach),
      likes: metric((p) => p.likes),
      comments: metric((p) => p.commentsCount),
    };
  };

  const topPosts = posts
    .filter((p) => inWindow(p.createdTime, w.current))
    .sort((a, b) => (b.reach || 0) - (a.reach || 0) || (b.likes || 0) - (a.likes || 0))
    .slice(0, 3)
    .map((p) => ({
      platform: p.platform,
      message: (p.message || '').slice(0, 220),
      permalink: p.permalink,
      createdTime: p.createdTime,
      reach: p.reach || 0,
      likes: p.likes || 0,
      comments: p.commentsCount || 0,
    }));

  const firstSnap = snaps.map((s) => s.day).sort()[0] || null;
  return { facebook: platform('facebook'), instagram: platform('instagram'), topPosts, followersTrackedSince: firstSnap };
}

async function reviewsSection(clientId: string, w: ReturnType<typeof windows>) {
  const reviews = await listDocs<GbpStoredReview>('gbp_reviews', { where: { clientId } });
  if (!reviews.length) return null;
  const pick = (win: Window) => reviews.filter((r) => inWindow(r.createTime, win));
  const cur = pick(w.current);
  const prev = pick(w.previous);
  const avg = (list: GbpStoredReview[]) => {
    const rated = list.filter((r) => r.rating > 0);
    return rated.length ? round1(sum(rated.map((r) => r.rating)) / rated.length) : null;
  };
  const answered = (list: GbpStoredReview[]) => list.filter((r) => r.status === 'posted' || r.status === 'replied').length;
  return {
    newReviews: { current: cur.length, previous: prev.length },
    averageRating: { current: avg(cur), previous: avg(prev) },
    answered: { current: answered(cur), previous: answered(prev) },
    stars: [5, 4, 3, 2, 1].map((s) => cur.filter((r) => r.rating === s).length),
  };
}

async function websitesSection(clientId: string, w: ReturnType<typeof windows>) {
  const sites = (await listDocs<Website>('websites', { where: { clientId } })).filter((s) => s.enabled);
  if (!sites.length) return null;
  const checks = await listDocs<WebsiteCheck>('website_checks', { where: { websiteId: sites.map((s) => s.id) } });
  const stats = (win: Window, siteId?: string) => {
    const list = checks.filter((c) => inWindow(c.checkedAt, win) && (!siteId || c.websiteId === siteId)).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
    if (!list.length) return { uptime: null, incidents: null, avg: null };
    let incidents = 0;
    const last = new Map<string, boolean>();
    for (const c of list) {
      if (last.get(c.websiteId) !== false && !c.ok) incidents++;
      last.set(c.websiteId, c.ok);
    }
    const ok = list.filter((c) => c.ok);
    return {
      uptime: round1((ok.length / list.length) * 100),
      incidents,
      avg: ok.length ? Math.round(sum(ok.map((c) => c.responseMs)) / ok.length) : null,
    };
  };
  const cur = stats(w.current);
  const prev = stats(w.previous);
  const first = checks.map((c) => c.checkedAt).sort()[0];
  return {
    uptime: { current: cur.uptime, previous: prev.uptime },
    incidents: { current: cur.incidents, previous: prev.incidents },
    avgResponseMs: { current: cur.avg, previous: prev.avg },
    pages: sites.map((s) => ({
      label: s.label || 'Website',
      url: s.url,
      uptime: stats(w.current, s.id).uptime,
      sslDaysLeft: s.sslExpiresAt ? Math.floor((new Date(s.sslExpiresAt).getTime() - Date.now()) / DAY) : null,
    })),
    trackedSince: first ? cairoDay(new Date(first)) : null,
  };
}

/** The same dates one year earlier ("2026-10-16" → "2025-10-16"). */
const yearEarlier = (day: string) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

async function adsSection(clientId: string, w: ReturnType<typeof windows>): Promise<ReportData['ads']> {
  const lastYearStart = yearEarlier(w.labels.periodStart);
  const lastYearEnd = yearEarlier(w.labels.periodEnd);
  const [cur, prev, ly, keywords] = await Promise.all([
    fetchClientAds(clientId, w.labels.periodStart, w.labels.periodEnd),
    fetchClientAds(clientId, w.labels.previousStart, w.labels.previousEnd),
    // Last year is optional: missing or empty history simply isn't shown.
    fetchClientAds(clientId, lastYearStart, lastYearEnd).catch(() => null),
    fetchClientKeywords(clientId, w.labels.periodStart, w.labels.periodEnd).catch(() => ({ source: 'keywords' as const, items: [] })),
  ]);
  if (!cur || !prev) return null;
  const hasLastYear = Boolean(ly && (ly.totals.impressions > 0 || ly.totals.cost > 0));
  const round2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);
  const cpc = (t: { cost: number; clicks: number }) => (t.clicks ? t.cost / t.clicks : null);
  const metric = (pick: (t: NonNullable<typeof cur>['totals']) => number | null): Compared => ({
    current: pick(cur.totals),
    previous: pick(prev.totals),
    ...(hasLastYear ? { lastYear: pick(ly!.totals) } : {}),
  });
  return {
    currency: cur.currency,
    accounts: cur.accounts.map((a) => a.name),
    impressions: metric((t) => t.impressions),
    clicks: metric((t) => t.clicks),
    ctr: metric((t) => round2(ctr(t))),
    spend: metric((t) => round2(t.cost)),
    avgCpc: metric((t) => round2(cpc(t))),
    showConversions: conversionsMeaningful(cur.totals.conversions, cur.totals.clicks),
    conversions: metric((t) => round1(t.conversions)),
    costPerConversion: metric((t) => round2(costPerConversion(t))),
    hasLastYear,
    lastYearStart,
    lastYearEnd,
    campaigns: cur.campaigns.slice(0, 5).map((c) => ({ name: c.name, cost: round2(c.cost)!, clicks: c.clicks, conversions: round1(c.conversions) })),
    keywords,
  };
}

async function analyticsSection(client: ClientProfile, w: ReturnType<typeof windows>, warnings: string[]): Promise<ReportData['analytics']> {
  let ga: NonNullable<ReportData['analytics']>['ga'] = null;
  if (client.ga4PropertyId) {
    try {
      const [cur, prev, ly] = await fetchGa4(client.ga4PropertyId, [
        { start: w.labels.periodStart, end: w.labels.periodEnd },
        { start: w.labels.previousStart, end: w.labels.previousEnd },
        { start: yearEarlier(w.labels.periodStart), end: yearEarlier(w.labels.periodEnd) },
      ]);
      const hasLastYear = ly.totals.sessions > 0;
      const metric = (pick: (t: typeof cur.totals) => number): Compared => ({
        current: pick(cur.totals),
        previous: pick(prev.totals),
        ...(hasLastYear ? { lastYear: pick(ly.totals) } : {}),
      });
      ga = {
        visitors: metric((t) => t.visitors),
        sessions: metric((t) => t.sessions),
        engagementRate: metric((t) => t.engagementRate),
        pageViews: metric((t) => t.pageViews),
        // Same rule as Ads conversions: too few means key events aren't really tracked.
        showKeyEvents: cur.totals.keyEvents >= MIN_CONVERSIONS_TO_SHOW,
        keyEvents: metric((t) => t.keyEvents),
        hasLastYear,
        channels: cur.channels,
        pages: cur.pages,
      };
    } catch (error) {
      warnings.push(`Google Analytics not included: ${describeGaError(error)}`);
    }
  }

  let clarity: NonNullable<ReportData['analytics']>['clarity'] = null;
  const snapshots = await listClaritySnapshots(client.id!).catch(() => []);
  const cur = clarityPeriod(snapshots, w.labels.periodStart, w.labels.periodEnd);
  if (cur) {
    const prev = clarityPeriod(snapshots, w.labels.previousStart, w.labels.previousEnd);
    clarity = {
      sessions: { current: cur.sessions, previous: prev?.sessions ?? null },
      scrollDepth: { current: cur.scrollDepth, previous: prev?.scrollDepth ?? null },
      rageClickPct: { current: cur.rageClickPct, previous: prev?.rageClickPct ?? null },
      deadClickPct: { current: cur.deadClickPct, previous: prev?.deadClickPct ?? null },
      days: cur.days,
    };
  }
  return ga || clarity ? { ga, clarity } : null;
}

// ---------- Public API ----------

export async function buildReportData(clientId: string, days: ReportDays): Promise<{ data: ReportData; warnings: string[] }> {
  const client = await getDoc<ClientProfile>('clients', clientId);
  if (!client) throw new Error('Client not found.');
  const w = windows(days);
  const warnings: string[] = [];
  // A Google Ads failure leaves Ads out of the report instead of blocking it.
  const ads = adsSection(clientId, w).catch((error) => {
    warnings.push(`Google Ads not included: ${describeAdsError(error)}`);
    return null;
  });
  const analytics = analyticsSection({ ...client, id: clientId }, w, warnings);
  const [social, reviews, websites] = await Promise.all([socialSection(clientId, w), reviewsSection(clientId, w), websitesSection(clientId, w)]);
  const data: ReportData = { clientName: client.brandName, days, ...w.labels, generatedAt: new Date().toISOString(), social, reviews, ads: await ads, analytics: await analytics, websites };
  return { data, warnings };
}

export async function createClientReport(clientId: string, days: ReportDays, language: ReportLanguage) {
  const { data, warnings } = await buildReportData(clientId, days);
  if (!data.social && !data.reviews && !data.ads && !data.analytics && !data.websites) {
    throw new Error(warnings[0] || 'Nothing to report yet: connect Facebook/Instagram, Google reviews, Google Ads or a website for this client first.');
  }
  // 128 random bits: the link is the only key to the report.
  const id = crypto.randomBytes(16).toString('base64url');
  const report: StoredReport = { clientId, periodDays: days, language, periodStart: data.periodStart, periodEnd: data.periodEnd, data, createdAt: new Date().toISOString() };
  await addDoc('client_reports', report, id);
  return { id, url: `${SITE}/r/${id}`, report, warnings };
}

export async function getClientReport(id: string) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(id)) return null;
  return getDoc<StoredReport>('client_reports', id);
}

/** Percentage change against `previous` (or another baseline), or null when there's nothing to compare against. */
export function percentChange(m: Compared, against: 'previous' | 'lastYear' = 'previous') {
  const base = m[against];
  if (m.current === null || base === null || base === undefined) return null;
  if (base === 0) return m.current === 0 ? 0 : null; // "new" rather than an infinite %
  return Math.round(((m.current - base) / Math.abs(base)) * 100);
}
