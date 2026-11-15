import { stoppedAds } from './ads-watch';
import { getSetting, listDocs, setSetting } from './data/store';
import { GBP_REVIEWS } from './review-engine';
import { supabase } from './supabase';
import { cairoParts, groupTasks, listOpenTasks } from './tasks';
import { websiteOverview } from './website-monitor';
import type { GbpStoredReview } from '@/types/database';

// 9 AM Cairo: one calm app notification with the day in a few lines (also on the watch, with
// 🎙 Ask Anwarz to follow up by voice). Tapping it opens Home. Sent once a day by the 5-minute job.

const SETTING = 'app_morning_summary';
const FROM = '09:00';

async function jlOrdersToShip() {
  const key = process.env.JLCOMFORT_API_KEY?.trim();
  if (!key) return null;
  const base = (process.env.JLCOMFORT_URL || 'https://www.jlcomfort.com').replace(/\/+$/, '');
  const r = await fetch(`${base}/api/anwarz/overview`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(7_000) });
  if (!r.ok) return null;
  const o = (await r.json()) as { orders?: Record<string, number> };
  return o.orders?.paid ?? 0;
}

export async function sendMorningAppSummary(now = new Date()) {
  const { date: today, time } = cairoParts(now);
  if (time < FROM) return { sent: false, reason: 'before 9 AM Cairo' };
  const last = await getSetting<{ day?: string }>(SETTING).catch(() => null);
  if (last?.day === today) return { sent: false, reason: 'already sent today' };
  await setSetting(SETTING, { day: today, at: now.toISOString() });

  const [tasks, emails, urgent, reviews, ads, sites, jl] = await Promise.all([
    listOpenTasks().catch(() => []),
    supabase.from('email_items').select('id', { count: 'exact', head: true }).in('status', ['new', 'replying', 'draft']),
    supabase.from('email_items').select('id', { count: 'exact', head: true }).in('status', ['new', 'replying', 'draft']).eq('urgent', true),
    listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: ['draft_ready', 'needs_draft'] } }).catch(() => []),
    stoppedAds().catch(() => ({ stopped: [] as { clientName: string; platform: string }[] })),
    websiteOverview().catch(() => null),
    jlOrdersToShip().catch(() => null),
  ]);
  const g = groupTasks(tasks, now);
  const waitingReviews = reviews.filter((r) => r.backlog !== 'waiting' && r.backlog !== 'dismissed');
  const lines = [
    `📌 Tasks: ${g.today.length} today${g.overdue.length ? ` · ${g.overdue.length} overdue` : ''}`,
    `📧 Emails waiting: ${emails.count ?? 0}${urgent.count ? ` (${urgent.count} urgent)` : ''}`,
    waitingReviews.length ? `⭐ Reviews to answer: ${waitingReviews.length}` : '',
    ads.stopped.length ? `⛔ Ads stopped: ${ads.stopped.map((a) => `${a.clientName} (${a.platform === 'google' ? 'Google' : 'Meta'})`).join(', ')}` : '',
    sites?.down.length ? `🌐 Sites down: ${sites.down.map((s) => sites.names.get(s.clientId) || s.url).join(', ')}` : '',
    jl ? `🛋 JL Comfort: ${jl} paid order${jl === 1 ? '' : 's'} to ship` : '',
  ].filter(Boolean);
  const first = [...g.overdue, ...g.today][0];

  const { sendPush } = await import('./push');
  const devices = await sendPush({
    title: '☀️ Good morning: your day',
    body: [...lines, first ? `\nFirst: ${first.title}` : ''].filter(Boolean).join('\n'),
    channel: 'summary',
    category: 'ask',
    data: { type: 'home' },
  });
  return { sent: true, devices };
}
