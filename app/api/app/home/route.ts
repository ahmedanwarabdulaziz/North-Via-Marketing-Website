import { appRoute } from '@/lib/app-auth';
import { appEmail, appTask, appWebsite, clientNames } from '@/lib/app-api';
import { groupTasks, listOpenTasks } from '@/lib/tasks';
import { listEmailAccounts, type EmailItem } from '@/lib/email/inbox';
import { websiteOverview } from '@/lib/website-monitor';
import { supabase } from '@/lib/supabase';

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
    websites: sites
      ? {
          total: sites.sites.length,
          down: sites.down.map((s) => ({ ...appWebsite(s), clientName: sites.names.get(s.clientId) || null })),
          sslSoon: sites.sslSoon.map((s) => ({ ...appWebsite(s), clientName: sites.names.get(s.clientId) || null })),
        }
      : null,
  };
});
