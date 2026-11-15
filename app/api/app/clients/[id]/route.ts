import { AppError, appRoute, jsonBody } from '@/lib/app-auth';
import { appClient, appEmail, appTask, appWebsite, clientNames } from '@/lib/app-api';
import { getClientProfileById } from '@/lib/admin-ops';
import { listDocs } from '@/lib/data/store';
import { GBP_LOCATIONS } from '@/lib/google-business';
import {
  inboxBusinessLinks,
  listEmailAccounts,
  listIgnoreRules,
  listImportantSenders,
  removeIgnoreRule,
  removeImportantSender,
  updateEmailAccount,
  type EmailAccount,
  type EmailItem,
  type IgnoreRule,
  type ImportantSender,
} from '@/lib/email/inbox';
import { addFactTo, listFacts, removeFactFrom, updateFactIn } from '@/lib/memory-files';
import { getReplySettings } from '@/lib/review-engine';
import { LANGUAGE_OPTIONS, LENGTH_OPTIONS, TONE_OPTIONS } from '@/lib/review-reply-options';
import { listClientWebsites } from '@/lib/website-monitor';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const label = (options: Array<{ value: string; label: string }>, value: string) => options.find((o) => o.value === value)?.label || value;

/**
 * Everything Anwarz follows for this client, in one place:
 *   notes          the client's memory file (preferences, contacts, "always do X"), used by the chat, email and tasks
 *   reviewReplies  how Google review replies are written for them (Admin → Reviews → reply style)
 *   inboxes        their linked inboxes: what each watches for, ignored senders, ignore rules, always-important senders
 */
async function clientRules(id: string, accounts: EmailAccount[], inboxIds: string[], rules: IgnoreRule[], important: ImportantSender[], hasGoogle: boolean) {
  const [notes, reply] = await Promise.all([listFacts(`client:${id}`), hasGoogle ? getReplySettings(id).catch(() => null) : Promise.resolve(null)]);
  return {
    notes: [...notes].reverse().map((f) => ({ id: f.id, text: f.text, at: f.at })),
    reviewReplies: reply
      ? {
          tone: label(TONE_OPTIONS, reply.tone),
          length: label(LENGTH_OPTIONS, reply.length),
          language: label(LANGUAGE_OPTIONS, reply.language),
          signOff: reply.signOff || null,
          useReviewerName: reply.useReviewerName,
          mentionBusinessName: reply.mentionBusinessName,
          allowEmojis: reply.allowEmojis,
          negativeContact: reply.negativeContact || null,
          highlights: reply.highlights || null,
          avoid: reply.avoid || null,
          extraInstructions: reply.extraInstructions || null,
        }
      : null,
    inboxes: accounts
      .filter((a) => inboxIds.includes(a.id))
      .map((a) => ({
        id: a.id,
        email: a.email,
        label: a.label,
        focus: a.focus,
        ignoredSenders: a.ignored_senders,
        ignoreRules: rules.filter((r) => r.accountId === a.id).map((r) => ({ id: r.id, subject: r.subject, fromEmail: r.fromEmail })),
        importantSenders: important.filter((s) => s.accountId === a.id).map((s) => s.fromEmail),
      })),
  };
}

/** One client: contact and links, open tasks, websites, recent important email from their inboxes, and their rules. */
export const GET = appRoute<Ctx>(async (_request, _device, { params }) => {
  const { id } = await params;
  const client = await getClientProfileById(id);
  if (!client) throw new AppError('Client not found.', 404);

  const [names, tasks, sites, links, accounts, rules, important] = await Promise.all([
    clientNames(),
    supabase.from('tasks').select().eq('client_id', id).eq('status', 'open').order('due_at', { ascending: true, nullsFirst: false }).limit(100),
    listClientWebsites(id),
    inboxBusinessLinks(),
    listEmailAccounts(),
    listIgnoreRules(),
    listImportantSenders(),
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
    // Review reply style shows for clients with a Google Business location watched for reviews.
    rules: await clientRules(id, accounts, inboxIds, rules, important, (await listDocs(GBP_LOCATIONS, { where: { clientId: id, linked: true }, limit: 1 }).catch(() => [])).length > 0),
  };
});

/**
 * Changes to the client's rules:
 *   add_note { text } · edit_note { noteId, text } · remove_note { noteId }
 *   unignore_sender { inboxId, email } · remove_rule { ruleId } · remove_important { inboxId, email }
 */
export const POST = appRoute<Ctx>(async (request, _device, { params }) => {
  const { id } = await params;
  if (!(await getClientProfileById(id))) throw new AppError('Client not found.', 404);
  const body = await jsonBody<{ action?: unknown; text?: unknown; noteId?: unknown; inboxId?: unknown; email?: unknown; ruleId?: unknown }>(request);
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const key = `client:${id}` as const;

  switch (body.action) {
    case 'add_note': {
      if (str(body.text).length < 2) throw new AppError('Write the rule first.');
      await addFactTo(key, str(body.text), 'client');
      break;
    }
    case 'edit_note':
      if (!str(body.noteId) || str(body.text).length < 2) throw new AppError('noteId and text are needed.');
      await updateFactIn(key, str(body.noteId), str(body.text));
      break;
    case 'remove_note':
      if (!(await removeFactFrom(key, str(body.noteId)))) throw new AppError('Rule not found.', 404);
      break;
    case 'unignore_sender': {
      const account = (await listEmailAccounts()).find((a) => a.id === str(body.inboxId));
      if (!account) throw new AppError('Inbox not found.', 404);
      await updateEmailAccount(account.id, { ignored_senders: account.ignored_senders.filter((s) => s !== str(body.email)) });
      break;
    }
    case 'remove_rule':
      await removeIgnoreRule(str(body.ruleId));
      break;
    case 'remove_important':
      await removeImportantSender(str(body.inboxId), str(body.email));
      break;
    default:
      throw new AppError('Unknown action.');
  }
  return { ok: true };
});
