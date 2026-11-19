import { appRoute } from '@/lib/app-auth';
import { appEmail, appTask, appWebsite, clientNames } from '@/lib/app-api';
import { groupTasks, listOpenTasks } from '@/lib/tasks';
import { listEmailAccounts, type EmailItem } from '@/lib/email/inbox';
import { websiteOverview } from '@/lib/website-monitor';
import { supabase } from '@/lib/supabase';
import { listDocs } from '@/lib/data/store';
import { GBP_REVIEWS } from '@/lib/review-engine';
import type { GbpStoredReview } from '@/types/database';
import { stoppedAds } from '@/lib/ads-watch';
import { isLowBalance, openRouterBalance } from '@/lib/openrouter';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const WAITING = ['new', 'replying', 'draft'];

/** The Home screen: today's tasks, emails waiting on Ahmed, and websites that are down. */
export const GET = appRoute(async () => {
  const now = new Date();
  const [names, open, accounts, emails, sites] = await Promise.all([
    clientNames(),
    listOpenTasks(),
    listEmailAccounts(),
    supabase.from('email_items').select().in('status', WAITING).order('received_at', { ascending: false }).limit(50),
    websiteOverview().catch((error) => {
      console.error('Home: websites failed:', error);
      return null;
    }),
  ]);
  const reviews = await listDocs<GbpStoredReview>(GBP_REVIEWS, { where: { status: ['draft_ready', 'needs_draft'] } })
    .then((rows) => rows.filter((r) => r.backlog !== 'waiting' && r.backlog !== 'dismissed'))
    .catch(() => null);
  const [ads, credit] = await Promise.all([stoppedAds().catch(() => null), openRouterBalance().catch(() => null)]);
  if (emails.error) throw new Error(emails.error.message);
  const groups = groupTasks(open, now);
  const byAccount = new Map(accounts.map((a) => [a.id, a]));
  const waiting = (emails.data || []) as EmailItem[];

  return {
    generatedAt: now.toISOString(),
    tasks: {
      counts: {
        overdue: groups.overdue.length,
        today: groups.today.length,
        tomorrow: groups.tomorrow.length,
        week: groups.week.length,
        noDate: groups.nodate.length,
      },
      overdue: groups.overdue.slice(0, 20).map((t) => appTask(t, names, now)),
      today: groups.today.slice(0, 30).map((t) => appTask(t, names, now)),
    },
    emails: {
      waiting: waiting.length,
      urgent: waiting.filter((e) => e.urgent).length,
      drafts: waiting.filter((e) => e.status === 'draft').length,
      latest: waiting.slice(0, 5).map((e) => appEmail(e, byAccount.get(e.account_id))),
    },
    // Stopped Google / Meta ads (hourly watch): the red banner on Home.
    adsStopped: ads?.stopped ?? [],
    // OpenRouter credit left (the AI chat and drafts use it): the small tag on Home.
    aiCredit: credit ? { left: Math.round(credit.left * 100) / 100, total: Math.round(credit.total * 100) / 100, low: isLowBalance(credit) } : null,
    reviews: reviews ? { waiting: reviews.length, bad: reviews.filter((r) => r.rating > 0 && r.rating <= 2).length } : null,
    websites: sites
      ? {
          total: sites.sites.length,
          down: sites.down.map((s) => ({ ...appWebsite(s), clientName: sites.names.get(s.clientId) || null })),
          sslSoon: sites.sslSoon.map((s) => ({ ...appWebsite(s), clientName: sites.names.get(s.clientId) || null })),
        }
      : null,
  };
});
