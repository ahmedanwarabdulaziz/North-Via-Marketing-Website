import { AppError, appRoute } from '@/lib/app-auth';
import { appEmail } from '@/lib/app-api';
import { listEmailAccounts, type EmailItem } from '@/lib/email/inbox';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VIEWS: Record<string, string[]> = {
  waiting: ['new', 'replying', 'draft'], // needs Ahmed
  handled: ['sent', 'done', 'ignored'],
};

/**
 * The important emails the AI kept (not the skipped ones), newest first.
 * GET ?view=waiting|handled|all &inbox=<account id> &before=<ISO received_at, for paging>
 */
export const GET = appRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const view = params.get('view') || 'waiting';
  if (view !== 'all' && !VIEWS[view]) throw new AppError('view must be waiting, handled or all.');
  const statuses = view === 'all' ? [...VIEWS.waiting, ...VIEWS.handled] : VIEWS[view];

  let query = supabase.from('email_items').select().in('status', statuses).order('received_at', { ascending: false }).limit(40);
  const inbox = params.get('inbox');
  if (inbox) query = query.eq('account_id', inbox);
  const before = params.get('before');
  if (before) {
    if (Number.isNaN(Date.parse(before))) throw new AppError('before must be a date.');
    query = query.lt('received_at', before);
  }
  const [{ data, error }, accounts] = await Promise.all([query, listEmailAccounts()]);
  if (error) throw new Error(error.message);
  const byId = new Map(accounts.map((a) => [a.id, a]));
  return {
    inboxes: accounts.map((a) => ({ id: a.id, email: a.email, label: a.label, provider: a.provider, enabled: a.enabled, lastError: a.last_error })),
    emails: ((data || []) as EmailItem[]).map((e) => appEmail(e, byId.get(e.account_id))),
  };
});
