import { AppError, appRoute } from '@/lib/app-auth';
import { appClient, appEmail, appTask, appWebsite, clientNames } from '@/lib/app-api';
import { getClientProfileById } from '@/lib/admin-ops';
import { inboxBusinessLinks, listEmailAccounts, type EmailItem } from '@/lib/email/inbox';
import { listClientWebsites } from '@/lib/website-monitor';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** One client: contact and links, open tasks, websites, and recent important email from their inboxes. */
export const GET = appRoute<Ctx>(async (_request, _device, { params }) => {
  const { id } = await params;
  const client = await getClientProfileById(id);
  if (!client) throw new AppError('Client not found.', 404);

  const [names, tasks, sites, links, accounts] = await Promise.all([
    clientNames(),
    supabase.from('tasks').select().eq('client_id', id).eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).limit(100),
    listClientWebsites(id),
    inboxBusinessLinks(),
    listEmailAccounts(),
  ]);
  if (tasks.error) throw new Error(tasks.error.message);

  // Inboxes linked to this client in Admin → Email.
  const inboxIds = Object.entries(links).filter(([, clientId]) => clientId === id).map(([accountId]) => accountId);
  let emails: EmailItem[] = [];
  if (inboxIds.length) {
    const { data, error } = await supabase.from('email_items').select().in('account_id', inboxIds).neq('status', 'skipped').order('received_at', { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    emails = (data || []) as EmailItem[];
  }
  const byId = new Map(accounts.map((a) => [a.id, a]));

  return {
    client: { ...appClient({ ...client, id }) },
    tasks: ((tasks.data || []) as Task[]).map((t) => appTask(t, names)),
    websites: sites.map((s) => appWebsite(s)),
    emails: emails.map((e) => appEmail(e, byId.get(e.account_id))),
  };
});
