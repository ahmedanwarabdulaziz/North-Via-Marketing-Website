import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { isStepCount, jsonSchema, streamText, tool, type ModelMessage, type ToolSet } from 'ai';
import { listClientProfiles } from './admin-ops';
import { recordAiCall } from './ai-usage';
import {
  actionSummary,
  buildContext,
  emailLine,
  emailsByIds,
  searchEmails,
  systemPromptFor,
  toActions,
  type AssistantAction,
  type ChatEmail,
  type ChatMessage,
  type PlannerApp,
  type PlannerCampaign,
  type PlannerClient,
  type PlannerComment,
} from './assistant';
import { getEmailItem, inboxBusinessLinks, listEmailAccounts } from './email/inbox';
import { attachmentsText, type ChatAttachment } from './chat-attachments';
import { attachmentText, openMailboxEmail, saveFound, searchMailboxes, waitingOnMe, type FoundEmail } from './email/live';
import { jlApi, jlRecords, type JlRecord } from './jl-comfort';
import { searchKnowledge } from './knowledge';
import { clientFileText } from './memory-files';
import { OPENROUTER_MODEL, openRouterOn } from './openrouter';
import { formatWhen, listOpenTasks, type Task } from './tasks';

// The Anwarz app chat as ONE assistant with tools (Claude Haiku 5.5 through OpenRouter).
//
// Lookup tools run at once and return data, so the assistant can find the email, order, task or
// campaign Ahmed means before acting. Change tools never change anything: each one is checked by
// toActions (the same checks as the classic planner) and becomes a card he confirms in the app; if
// the check fails, the reason goes back to the assistant so it can fix the call or ask him.
//
// Adding a skill = adding one entry to TOOLS (a lookup or a change). The loop runs on the Vercel AI
// SDK (streamText): it retries OpenRouter's short hiccups and streams steps and words to the app.
// The classic two-call chat in lib/assistant.ts is only the emergency fallback when OpenRouter fails.

const MAX_STEPS = 20;
const TIME_BUDGET_MS = 150_000; // Haiku's share of the route's 300 s (Sonnet may retry in what's left)
/** Tried again when Haiku can't manage a message (see lib/app-chat.ts). Override with OPENROUTER_STRONG_MODEL. */
export const STRONG_MODEL = process.env.OPENROUTER_STRONG_MODEL || 'anthropic/claude-sonnet-5.5';

/** What the app chat lends the tools (kept in lib/app-chat.ts). */
export interface AgentDeps {
  businessNow: (topic: string) => Promise<string>;
  campaigns: () => Promise<PlannerCampaign[]>;
  comments: () => Promise<PlannerComment[]>;
}

/** One turn's data, loaded once and only when a tool needs it. */
class TurnData {
  private cache = new Map<string, Promise<unknown>>();
  /** Every email and task the assistant has seen this turn, so its [E:…]/[T:…] tags become buttons. */
  seenEmails = new Map<string, ChatEmail>();
  seenTasks = new Map<string, Task>();
  /** Files attached in this conversation (for library_file). */
  files: ChatAttachment[] = [];
  constructor(readonly deps: AgentDeps) {}
  private once<T>(key: string, load: () => Promise<T>) {
    if (!this.cache.has(key)) this.cache.set(key, load());
    return this.cache.get(key) as Promise<T>;
  }
  clients = () => this.once('clients', async () => (await listClientProfiles()).filter((c) => c.id && c.brandName) as PlannerClient[]);
  tasks = () => this.once('tasks', () => listOpenTasks());
  jl = () => this.once('jl', () => jlRecords());
  campaigns = () => this.once('campaigns', () => this.deps.campaigns());
  comments = () => this.once('comments', () => this.deps.comments());
  inboxes = () => this.once('inboxes', async () => (await listEmailAccounts()).filter((x) => x.enabled).map((x) => x.email.toLowerCase()));
  /** Each mailbox with what it is and whose it is, so he can say "Sanad's mailbox". */
  inboxLines = () =>
    this.once('inboxLines', async () => {
      const [accounts, links, clients] = await Promise.all([listEmailAccounts(), inboxBusinessLinks().catch(() => ({}) as Record<string, string>), this.clients()]);
      return accounts
        .filter((a) => a.enabled)
        .map((a) => {
          const provider = a.provider === 'gmail' ? 'Gmail' : a.provider === 'outlook' ? 'Outlook' : `IMAP (${a.imap?.imapHost || 'own server'})`;
          const client = links[a.id] ? clients.find((c) => c.id === links[a.id])?.brandName : null;
          return `- ${a.email} · ${provider}${a.label ? ` · label "${a.label}"` : ''}${client ? ` · belongs to the client ${client}` : ''}`;
        });
    });
}

type Json = Record<string, unknown>;

interface Tool {
  name: string;
  description: string;
  parameters: Json;
  /** lookup: returns data to the assistant. change: becomes a card Ahmed confirms. */
  kind: 'lookup' | 'change';
  run: (input: Json, data: TurnData) => Promise<unknown>;
}

const str = (description: string) => ({ type: 'string', description });
const nullableStr = (description: string) => ({ type: ['string', 'null'], description });
const obj = (properties: Json, required: string[] = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });

// ---------- Lookup tools ----------

const day = (iso: string) => (iso ? iso.slice(0, 10) : '');
const foundLine = (e: FoundEmail) =>
  [`[M:${e.ref}]`, day(e.date), `${e.inbox} · ${e.folder}`, e.fromMe ? `from ME to ${e.to.slice(0, 80)}` : `from ${e.fromName} <${e.fromEmail}>`, e.subject, e.hasAttachments ? '📎' : '', e.snippet.replace(/\s+/g, ' ').slice(0, 160)]
    .filter(Boolean)
    .join(' | ');
const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });

/** Live mailbox tools: every folder of every connected inbox, straight from Gmail / Microsoft (lib/email/live.ts). */
const MAILBOX: Tool[] = [
  {
    name: 'mailbox_search',
    kind: 'lookup',
    description:
      'Search Ahmed’s REAL mailboxes live: every connected inbox and EVERY folder (Inbox and its tabs, Sent, Archive / All Mail, Spam / Junk, Trash, labels, sub-folders), any date. Use it for anything search_emails can’t find, for his own sent emails ("what did I send…", "did I reply…"), spam, old emails, attachments. Fill only what you know; null for the rest. Each result has a ref [M:…] for mailbox_open.',
    parameters: obj({
      text: nullable('string', 'Any words (names, subject or body words), or null'),
      from: nullable('string', 'Sender address or name, or null'),
      to: nullable('string', 'Recipient address or name, or null'),
      subject: nullable('string', 'Words in the subject, or null'),
      folder: { type: ['string', 'null'], enum: ['any', 'inbox', 'sent', 'spam', 'archive', 'drafts', 'trash', null], description: 'Where to look; null = every folder' },
      after: nullable('string', 'Only emails on or after this day (YYYY-MM-DD), or null'),
      before: nullable('string', 'Only emails before this day (YYYY-MM-DD), or null'),
      has_attachment: nullable('boolean', 'true = only emails with attachments, or null'),
      inbox: nullable('string', 'Only this inbox (address), or null for all'),
    }),
    run: async (input) => {
      const s = (k: string) => (typeof input[k] === 'string' && input[k] ? String(input[k]) : undefined);
      const { results, failed, perInbox: searched } = await searchMailboxes({
        text: s('text'),
        from: s('from'),
        to: s('to'),
        subject: s('subject'),
        folder: (s('folder') as never) || 'any',
        after: s('after'),
        before: s('before'),
        hasAttachment: input.has_attachment === true,
        inbox: s('inbox'),
      });
      return {
        results: results.length ? results.map(foundLine) : 'Nothing found in the mailboxes. Try fewer or other words, or another folder.',
        searched_mailboxes: searched.map((x) => `${x.inbox}: ${x.found === 0 ? 'nothing found' : x.found === 'could not search' ? 'could not search' : `${x.found} found`}`),
        ...(failed.length ? { could_not_search: failed } : {}),
      };
    },
  },
  {
    name: 'mailbox_open',
    kind: 'lookup',
    description:
      'Open one email from mailbox_search or waiting_on_me in full: its text, the WHOLE conversation (his own replies included, so you can tell if he replied and what was agreed), and its attachments. It also returns an email_id that every email change tool (email_reply, email_done, email_important…) accepts.',
    parameters: obj({ ref: str('The ref from [M:…], without the M:') }),
    run: async (input, data) => {
      const ref = String(input.ref || '').replace(/^M:/, '');
      const opened = await openMailboxEmail(ref);
      const emailId = await saveFound(ref).catch(() => null);
      if (emailId) {
        const [line] = await emailsByIds([emailId]);
        if (line) data.seenEmails.set(emailId, line);
      }
      return {
        email_id: emailId,
        header: foundLine(opened.email),
        text: opened.email.body,
        replied_by_him_after_it: opened.repliedByMe,
        conversation: opened.thread.map((t) => `${day(t.date)} ${t.fromMe ? 'AHMED' : t.from}: ${t.text.replace(/\s+/g, ' ').slice(0, 600)}`),
        attachments: opened.attachments.map((a) => `${a.name} (${a.type || 'file'}, ${Math.round(a.size / 1024)} KB) id=${a.id}`),
      };
    },
  },
  {
    name: 'mailbox_attachment',
    kind: 'lookup',
    description: 'Read the text of a PDF (or text) attachment of an email opened with mailbox_open, e.g. to find an invoice total, a date or an order number.',
    parameters: obj({ ref: str('The email’s ref'), attachment_id: str('The attachment id from mailbox_open') }),
    run: async (input) => attachmentText(String(input.ref || '').replace(/^M:/, ''), String(input.attachment_id || '')),
  },
  {
    name: 'waiting_on_me',
    kind: 'lookup',
    description:
      'Emails from real people that Ahmed has NOT answered (checked against his Sent mail), received in the last 3 weeks and waiting at least `days` days. Automated mail, codes and auto-replies are left out. Use for "what am I late on", "who is waiting for my reply".',
    parameters: obj({ days: nullable('number', 'Waiting at least this many days (default 2)') }),
    run: async (input) => {
      const { waiting, failed } = await waitingOnMe(typeof input.days === 'number' ? Math.max(0, Math.min(30, input.days)) : 2, 21);
      return {
        waiting: waiting.length ? waiting.map((w) => `${w.waitingDays} days · ${foundLine(w)}`) : 'Nobody is waiting on a reply. ✅',
        ...(failed.length ? { could_not_check: failed } : {}),
      };
    },
  },
];

const LOOKUPS: Tool[] = [
  ...MAILBOX,
  {
    name: 'search_emails',
    kind: 'lookup',
    description:
      'Search the emails Anwarz has SAVED (new Inbox mail it sorted, including skipped ones) by sender name, address or subject words. Fast; use it first for recent inbox email. For Sent, Archive, Spam, tabs, old mail or anything not found here, use mailbox_search. Returns the best matches first, each with its id.',
    parameters: obj({ query: str('Names, email addresses or subject words, e.g. "Isabelle sofa" or "karim@patriva.com"') }),
    run: async (input, data) => {
      const found = await searchEmails(String(input.query || ''), 10);
      found.forEach((e) => data.seenEmails.set(e.id, e));
      return found.length ? found.map(emailLine) : 'No saved email matches. Try other words (the sender’s name or a subject word).';
    },
  },
  {
    name: 'get_email',
    kind: 'lookup',
    description: 'Read one email in full (sender, inbox, date, status and text) by its id.',
    parameters: obj({ email_id: str('The id from search_emails or EMAILS') }),
    run: async (input, data) => {
      const item = await getEmailItem(String(input.email_id || ''));
      if (!item) return 'No email with that id.';
      const [line] = await emailsByIds([item.id]);
      if (line) data.seenEmails.set(item.id, line);
      return { header: line ? emailLine(line) : item.subject, text: (item.body || item.snippet || '').replace(/\s+\n/g, '\n').slice(0, 4000), draft: item.draft || null };
    },
  },
  {
    name: 'list_tasks',
    kind: 'lookup',
    description: 'Ahmed’s open tasks with their ids and when they are due. Optional words narrow the list.',
    parameters: obj({ query: nullableStr('Words to filter by (title, notes), or null for all') }),
    run: async (input, data) => {
      const words = String(input.query || '').toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      const tasks = (await data.tasks()).filter((t) => !words.length || words.some((w) => `${t.title} ${t.notes || ''}`.toLowerCase().includes(w)));
      tasks.forEach((t) => data.seenTasks.set(t.id, t));
      return tasks.slice(0, 40).map((t) => `${t.id} | ${t.title} | ${formatWhen(t)}${t.priority === 'high' ? ' | HIGH' : ''}`);
    },
  },
  {
    name: 'list_clients',
    kind: 'lookup',
    description: 'The agency’s clients with their ids and details (owner, email, phone, website, social links).',
    parameters: obj({}),
    run: async (_input, data) =>
      (await data.clients()).map((c) => [c.id, c.brandName, c.ownerName, c.email, c.mobileNumber, c.websiteUrl, c.facebookLink, c.instagramLink].map((v) => v || '-').join(' | ')),
  },
  {
    name: 'jl_find',
    kind: 'lookup',
    description:
      'JL Comfort (his online fabric store) orders (JL-…) and sample requests (S-…), newest first, with ids and statuses. Filter by number, customer name or status. Use it before any JL Comfort change.',
    parameters: obj({
      query: nullableStr('An order/request number (JL-1022, S-1040), a customer name, or null'),
      kind: { type: ['string', 'null'], enum: ['order', 'sample', null], description: 'Only orders or only sample requests, or null for both' },
      status: nullableStr('Only this status, e.g. sent_to_supplier, or null'),
    }),
    run: async (input, data) => {
      const { records, carriers } = await data.jl();
      const q = String(input.query || '').toLowerCase().replace(/\s+/g, '');
      const list = records.filter(
        (r) =>
          (!input.kind || r.kind === input.kind) &&
          (!input.status || r.status === input.status) &&
          (!q || r.number.toLowerCase().replace('-', '') === q.replace('-', '') || r.customer.toLowerCase().replace(/\s+/g, '').includes(q))
      );
      return {
        records: list.slice(0, 30).map((r) => `${r.id} | ${r.number} | ${r.kind} | ${r.customer} | ${r.status}${r.hasTracking ? ' (has tracking)' : ''} | ${r.createdAt.slice(0, 10)}`),
        carriers: carriers.map((c) => `${c.id} (${c.name})`),
        note: list.length ? undefined : 'Nothing matches among the latest 60 orders and 60 sample requests.',
      };
    },
  },
  {
    name: 'jl_details',
    kind: 'lookup',
    description: 'One JL Comfort order or sample request in full: items, address, tracking, supplier numbers, and its history (emails sent, status changes).',
    parameters: obj({ jl_id: str('The id from jl_find') }),
    run: async (input, data) => {
      const r = (await data.jl()).records.find((x) => x.id === input.jl_id);
      if (!r) return 'No order or sample request with that id. Use jl_find first.';
      const json = await jlApi<Json>(`${r.kind}s/${r.id}`, undefined, 15_000);
      return JSON.stringify(json).slice(0, 6000);
    },
  },
  {
    name: 'list_campaigns',
    kind: 'lookup',
    description: 'Every client’s Google Ads and Meta ad campaigns with a key and whether each is active or paused. Use before pausing or resuming ads.',
    parameters: obj({}),
    run: async (_input, data) => (await data.campaigns()).map((c) => `${c.key} | ${c.clientName} | ${c.platform === 'google' ? 'Google Ads' : 'Meta'} | ${c.name} | ${c.status}`),
  },
  {
    name: 'list_comments',
    kind: 'lookup',
    description: 'Facebook / Instagram comments waiting for a reply on clients’ pages (risky first), each with its id and the AI draft reply if any.',
    parameters: obj({}),
    run: async (_input, data) =>
      (await data.comments()).map((c) => `${c.id} | ${c.clientName || ''} | ${c.platform} | ${c.author}: ${c.message.replace(/\s+/g, ' ').slice(0, 200)} | draft: ${(c.draft || '-').slice(0, 160)}`),
  },
  {
    name: 'client_file',
    kind: 'lookup',
    description:
      'Everything about ONE client: details, the rules and facts saved for them, their open tasks, recent emails from them, and their ads, reviews and website status. Use for "what’s going on with X", before writing to a client, or when unsure how a client likes things done.',
    parameters: obj({ client_id: str('Id from list_clients') }),
    run: async (input, data) => {
      const client = (await data.clients()).find((c) => c.id === input.client_id);
      if (!client) return 'No client with that id. Use list_clients first.';
      const domain = client.email?.split('@')[1];
      const generic = /^(gmail|yahoo|hotmail|outlook|icloud|live)\./i.test(domain || '');
      const [file, tasks, emails, snapshot] = await Promise.all([
        clientFileText(client.id, client.brandName).catch(() => ''),
        data.tasks(),
        searchEmails([client.brandName, client.ownerName, client.email, domain && !generic ? domain : ''].filter(Boolean).join(' '), 8).catch(() => [] as ChatEmail[]),
        data.deps.businessNow(`${client.brandName} ads reviews website`).catch(() => ''),
      ]);
      emails.forEach((e) => data.seenEmails.set(e.id, e));
      const mine = tasks.filter((t) => t.client_id === client.id);
      mine.forEach((t) => data.seenTasks.set(t.id, t));
      return [
        `CLIENT: ${[client.brandName, client.ownerName && `owner ${client.ownerName}`, client.email, client.mobileNumber, client.websiteUrl, client.facebookLink, client.instagramLink].filter(Boolean).join(' | ')}`,
        file || 'No saved rules or facts for this client yet.',
        `OPEN TASKS FOR ${client.brandName}:`,
        ...(mine.length ? mine.map((t) => `${t.id} | ${t.title} | ${formatWhen(t)}`) : ['none']),
        'RECENT EMAILS THAT MENTION THEM:',
        ...(emails.length ? emails.map(emailLine) : ['none found']),
        snapshot ? `BUSINESS NOW (all clients; pick out ${client.brandName}):\n${snapshot.slice(0, 4000)}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    },
  },
  {
    name: 'search_library',
    kind: 'lookup',
    description: 'Search Ahmed’s knowledge library (saved ideas, links, screenshots, notes).',
    parameters: obj({ query: str('What to look for') }),
    run: async (input) =>
      (await searchKnowledge(String(input.query || ''), 8)).map((k) => `[K:${k.id}] ${k.type} | ${k.title} | ${k.summary || ''} ${k.url || ''}`.slice(0, 400)),
  },
  {
    name: 'business_now',
    kind: 'lookup',
    description:
      'A live snapshot of one area: reviews waiting, stopped ads and ad results, websites down, social followers and comments, JL Comfort counts, competitors, or what he finished lately. Pass the topic in his words.',
    parameters: obj({ topic: str('e.g. "ads this month", "reviews", "competitors", "what did I finish this week"') }),
    run: async (input, data) => (await data.deps.businessNow(String(input.topic || ''))).slice(0, 8000),
  },
];

// ---------- Change tools ----------
// Each one is the classic planner's action with the same fields; toActions checks it.

const CHANGE_SPECS: { name: string; description: string; parameters: Json }[] = [
  { name: 'task', description: 'Save a task or reminder (done at once, with Undo). Write it as he would say it to his task bot, with client, day and time if known.', parameters: obj({ text: str('The task') }) },
  { name: 'complete_task', description: 'Mark an open task done (he confirms).', parameters: obj({ task_id: str('Id from list_tasks or OPEN TASKS') }) },
  {
    name: 'task_edit',
    description:
      'Change a saved task: move it to another day or time, rename it, change its priority or notes (he confirms, with Undo). Give ONLY the fields that change. Work out dates from NOW (Cairo): "Thursday" = the coming Thursday.',
    parameters: obj({
      task_id: str('Id from list_tasks or OPEN TASKS'),
      changes: {
        type: 'object',
        additionalProperties: false,
        description: 'Only what changes',
        properties: {
          title: str('New title'),
          date: nullableStr('New day YYYY-MM-DD (Cairo), or null for no date'),
          time: nullableStr('New time HH:MM 24-hour (Cairo), or null for all day'),
          priority: { type: 'string', enum: ['low', 'normal', 'high'] },
          notes: nullableStr('New notes, or null to clear them'),
        },
      },
    }),
  },
  { name: 'task_delete', description: 'Delete (cancel) a task he no longer needs (he confirms, with Undo). Not for finished tasks: those are complete_task.', parameters: obj({ task_id: str('Id from list_tasks or OPEN TASKS') }) },
  {
    name: 'library_file',
    description: 'Save a file he attached in this chat (a picture, screenshot or PDF) to his knowledge library (done at once, with Undo). The library reads and files it.',
    parameters: obj({ name: str('The attached file’s name, as listed under ATTACHED FILES') }),
  },
  { name: 'library_note', description: 'Save an idea, note, link or reference to his knowledge library (done at once, with Undo).', parameters: obj({ text: str('What to save, in his words, with the link if any') }) },
  {
    name: 'remember',
    description: 'Remember a lasting fact about him, his companies, clients or how he likes things done. Not for things with a date (those are tasks).',
    parameters: obj({ text: str('One short fact, in his language'), asked: { type: 'boolean', description: 'true only when he explicitly asked you to remember it' } }),
  },
  { name: 'forget', description: 'Forget a remembered fact (he confirms).', parameters: obj({ memory_id: str('Id from MEMORY') }) },
  { name: 'update_profile', description: 'Add or correct something in Ahmed’s own master profile (role, venture, degree, achievement). Not for client facts.', parameters: obj({ change: str('The change, in his words') }) },
  {
    name: 'email_important',
    description: 'Bring a skipped email back to his inbox as important (he confirms). always=true also shows every future email from that sender ("always show emails from X").',
    parameters: obj({ email_id: str('Id from search_emails or EMAILS'), always: { type: 'boolean', description: 'Always show this sender from now on' } }),
  },
  {
    name: 'email_ignore',
    description:
      'Stop showing emails he doesn’t want (he confirms): mode "sender" skips every email from that sender from now on; "similar" skips emails like this one (same sender and kind of subject).',
    parameters: obj({ email_id: str('Id from search_emails or EMAILS'), mode: { type: 'string', enum: ['sender', 'similar'] } }),
  },
  { name: 'email_done', description: 'Mark an email handled / no reply needed (he confirms).', parameters: obj({ email_id: str('Id from search_emails or EMAILS') }) },
  {
    name: 'email_reply',
    description: 'Reply to an email. The app writes the draft; he reads it and taps Send. Never for no-reply senders. Do not write the reply yourself.',
    parameters: obj({
      email_id: str('Id from search_emails or EMAILS'),
      notes: str('What the reply should say, in his words and language; "" when he just says reply'),
      tone: nullableStr('How it should sound when he says so, e.g. "short and formal", "warm", "firm about the payment"; else null'),
    }),
  },
  {
    name: 'email_new',
    description: 'A NEW email (not a reply) from one of his inboxes. The app writes it; he reads it and taps Send. Needs the recipient’s full address.',
    parameters: obj({
      from_inbox: str('One address from INBOXES'),
      to: str('Recipient email address'),
      subject: nullableStr('Subject, or null to let the app write one'),
      notes: str('Everything the email should say, in his words: amounts, dates, requests'),
    }),
  },
  { name: 'approve_five_star', description: 'Post every ready 5★ Google review reply, for one client or all (he confirms).', parameters: obj({ client_id: nullableStr('Client id, or null for all clients') }) },
  { name: 'comment_reply', description: 'Reply publicly to a Facebook / Instagram comment (he confirms).', parameters: obj({ comment_id: str('Id from list_comments'), text: nullableStr('The reply, or null to post the AI draft') }) },
  { name: 'comment_hide', description: 'Hide a rude, spam or harmful comment, only when he asks (he confirms).', parameters: obj({ comment_id: str('Id from list_comments') }) },
  { name: 'comment_skip', description: 'No reply needed for a comment.', parameters: obj({ comment_id: str('Id from list_comments') }) },
  {
    name: 'ads_status',
    description: 'Pause or resume one client’s ad campaigns (he confirms). Use list_campaigns first.',
    parameters: obj({ campaigns: { type: 'array', items: { type: 'string' }, description: 'Keys from list_campaigns, all of ONE client' }, pause: { type: 'boolean', description: 'true to pause, false to resume' } }),
  },
  {
    name: 'add_client',
    description: 'Add a new client (he confirms). Needs at least a brand name.',
    parameters: obj(
      {
        brandName: str('Brand name'),
        ownerName: nullableStr('Owner'),
        email: nullableStr('Email'),
        mobileNumber: nullableStr('Phone'),
        websiteUrl: nullableStr('Website'),
        facebookLink: nullableStr('Facebook'),
        instagramLink: nullableStr('Instagram'),
        tiktokLink: nullableStr('TikTok'),
        googleLink: nullableStr('Google Business link'),
        check_website: { type: 'boolean', description: 'Also check its website every hour (true unless he says not to)' },
      },
      ['brandName', 'check_website']
    ),
  },
  {
    name: 'update_client',
    description: 'Change a client’s details (he confirms). Only the fields that change.',
    parameters: obj({
      client_id: str('Id from list_clients'),
      changes: {
        type: 'object',
        description: 'Fields to change: brandName, ownerName, email, mobileNumber, websiteUrl, facebookLink, instagramLink, tiktokLink, googleLink',
        additionalProperties: { type: 'string' },
      },
    }),
  },
  { name: 'add_website', description: 'Check an extra page or site every hour for an existing client (he confirms).', parameters: obj({ client_id: str('Id from list_clients'), client_name: str('Client name'), url: str('https://…'), label: nullableStr('Short label or null') }) },
  {
    name: 'jl_status',
    description:
      'Change a JL Comfort order’s or sample request’s status, no email (he confirms). Order statuses: paid, sent_to_supplier, shipped, delivered, closed, cancelled, problem. Sample statuses: pending, sent_to_supplier, supplier_confirmed, shipped, delivered, cancelled, problem. For shipped WITH tracking use jl_ship.',
    parameters: obj({ jl_id: str('Id from jl_find'), status: str('The new status'), note: nullableStr('A note for the history, or null') }),
  },
  {
    name: 'jl_ship',
    description: 'It shipped: marks it Shipped and emails the customer the tracking (he confirms). Needs the tracking number.',
    parameters: obj({ jl_id: str('Id from jl_find'), carrier: nullableStr('Carrier id from jl_find’s carriers, or null'), tracking_number: str('As he gave it'), tracking_url: nullableStr('https:// link, only for a carrier not in the list') }),
  },
  { name: 'jl_confirmed', description: 'The supplier (Charlotte) confirmed a SAMPLE request: sets "Confirmed by the supplier" and emails the customer (he confirms).', parameters: obj({ jl_id: str('Id of a sample request from jl_find') }) },
  {
    name: 'jl_resend',
    description: 'Send one of an order’s / sample request’s emails again (he confirms): the customer confirmation, the customer shipped/tracking email, or the request to the supplier.',
    parameters: obj({ jl_id: str('Id from jl_find'), email: { type: 'string', enum: ['confirmation', 'shipped', 'supplier'], description: 'Which email' } }),
  },
];

/** The lists toActions needs to check a change, loaded only for the kind of change it is. */
async function appFor(name: string, input: Json, data: TurnData): Promise<PlannerApp> {
  const ids = typeof input.email_id === 'string' ? [input.email_id] : [];
  const [emails, jl, campaigns, comments, inboxes] = await Promise.all([
    ids.length ? emailsByIds(ids) : Promise.resolve([] as ChatEmail[]),
    name.startsWith('jl_') ? data.jl() : Promise.resolve({ records: [] as JlRecord[], carriers: [] }),
    name === 'ads_status' ? data.campaigns() : Promise.resolve([] as PlannerCampaign[]),
    name.startsWith('comment_') ? data.comments() : Promise.resolve([] as PlannerComment[]),
    name === 'email_new' ? data.inboxes() : Promise.resolve([] as string[]),
  ]);
  return { emails, comments, inboxes, campaigns, jl: jl.records, carriers: jl.carriers, attachments: data.files.map((f) => f.name) };
}

const TOOLS: Tool[] = [
  ...LOOKUPS,
  ...CHANGE_SPECS.map(
    (spec): Tool => ({
      ...spec,
      kind: 'change',
      run: async () => {
        throw new Error('change tools run through prepareChange');
      },
    })
  ),
];

// ---------- The loop (Vercel AI SDK through OpenRouter) ----------

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: { 'HTTP-Referer': 'https://www.northviamarketing.com', 'X-Title': 'Anwarz (North Via)' },
});

/** What the app sees while a turn runs: a step ("Searching the mailboxes…"), words of the answer, or "start the answer again". */
export type AgentEvent = { type: 'step'; label: string } | { type: 'text'; delta: string } | { type: 'reset' };

/** Short, human labels for the live progress line. */
const STEP_LABELS: Record<string, string> = {
  mailbox_search: 'Searching the mailboxes',
  mailbox_open: 'Opening the email',
  mailbox_attachment: 'Reading the attachment',
  waiting_on_me: 'Checking who is waiting on you',
  search_emails: 'Searching saved emails',
  get_email: 'Reading the email',
  list_tasks: 'Looking at your tasks',
  list_clients: 'Looking at the clients',
  jl_find: 'Looking up JL Comfort',
  jl_details: 'Opening the JL Comfort order',
  list_campaigns: 'Checking the ad campaigns',
  list_comments: 'Checking comments',
  client_file: 'Opening the client file',
  search_library: 'Searching the library',
  business_now: 'Checking the business',
};
export const stepLabel = (name: string) => STEP_LABELS[name] || `Preparing: ${name.replace(/_/g, ' ')}`;

const AGENT_RULES = `

How you work in this app (tools):
- You have LOOKUP tools (search_emails, get_email, mailbox_search, mailbox_open, mailbox_attachment, waiting_on_me, list_tasks, list_clients, jl_find, jl_details, list_campaigns, list_comments, search_library, business_now) and CHANGE tools (one per kind of change).
- FOLLOW THE CONVERSATION. Each message continues the one before: "it", "that", "the sent one", "him", "there", "and the inbox?" refer to what you were just talking about. Carry the same mailbox, client, email, order or task into your next tool calls (e.g. after talking about Sanad's mailbox, "the last sent email" = mailbox_search with folder sent and inbox = Sanad's address). The [Looked at: …] notes in your earlier answers say what you already searched. Ask only when it's really unclear.
- MAILBOXES lists every connected mailbox with its provider and whose it is. Questions like "do you have access to X's email" are answered from that list (and checked with mailbox_search when needed), never guessed. A mailbox belongs to the client named there, not to a Gmail label.
- When a search covers several mailboxes, say what each one had (searched_mailboxes), including "nothing found" (e.g. "Sanad's Sent folder is empty").
- ATTACHED FILES are files he sent in this chat: pictures are shown to you; PDFs and text files are given as text. Read them to answer, use them for tasks, emails or replies, and save one to the library with library_file when he asks.
- Email: search_emails only covers mail Anwarz saved from the Inbox. His real mailboxes (Sent, Archive, Spam/Junk, Gmail tabs, Outlook's Other tab, labels, sub-folders, old mail) are reached with mailbox_search, then mailbox_open for the full text, the whole conversation (his replies too) and attachments. "Did I reply / what did I send / what did we agree" = open the conversation and read it. To act on a mailbox email, use the email_id that mailbox_open returns with the email change tools. If search_emails finds nothing, ALWAYS try mailbox_search before saying it isn't there.
- When he asks for a change, first find the exact item with a lookup tool (unless its id is already in the CONTEXT), then call the change tool with that id. Never guess an id.
- A change tool never changes anything by itself: it puts a card under your answer, and it happens only when he taps ✅ Confirm (tasks, library notes and facts he asked you to remember are saved at once, with Undo). The tool result tells you if the card was prepared, or why not; when it wasn't, fix the call or ask him for what's missing.
- Several changes in one message are fine (one tool call each), e.g. "reply to these 3 and mark them done": find each, then one change call per item.
- "Move / postpone / reschedule / rename" a task = task_edit; "delete / remove / cancel" a task = task_delete; "done / finished" = complete_task.
- When the lookups don't find what he means, say what you searched and ask (e.g. the sender's name, the order number). Don't say you can't do something a tool can do.
- After the tools, answer in one short message: what you found and which cards are below. Never say a change is done unless a tool result says "done".`;

export interface AgentReply {
  text: string;
  actions: AssistantAction[];
  dropped: string[];
  emails: { id: string; subject: string }[];
  tasks: Task[];
  steps: string[]; // tool calls, for the log
  /** It used every step (or answered nothing) without finishing. */
  ranOut: boolean;
}

/** One chat turn with tools. Throws when OpenRouter is off or fails, so the caller can fall back. */
export async function runChatAgent(
  question: string,
  history: ChatMessage[],
  deps: AgentDeps,
  runsAtOnce: (a: AssistantAction) => boolean,
  extraContext?: () => Promise<string>,
  opts: { model?: string; budgetMs?: number; attachments?: ChatAttachment[]; onEvent?: (e: AgentEvent) => void; earlier?: string } = {}
): Promise<AgentReply> {
  if (!(await openRouterOn())) throw new Error('OpenRouter is off.');
  const model = opts.model || OPENROUTER_MODEL;
  const deadline = Date.now() + (opts.budgetMs ?? TIME_BUDGET_MS);
  const emit = (e: AgentEvent) => {
    try {
      opts.onEvent?.(e);
    } catch {
      // the app went away; the turn still finishes and is saved
    }
  };
  const data = new TurnData(deps);
  const [context, extra] = await Promise.all([buildContext(question, history, true), extraContext ? extraContext().catch(() => '') : Promise.resolve('')]);
  if (extra) context.text += `\n\n${extra}`;
  context.emails.forEach((e) => data.seenEmails.set(e.id, e));
  context.tasks.forEach((t) => data.seenTasks.set(t.id, t));
  const inboxLines = await data.inboxLines().catch(() => [] as string[]);
  const files = opts.attachments ?? [];
  data.files = files;
  const pictures = files.filter((f) => f.kind === 'image' && f.image).slice(-3);

  // The classic prompt's "PLANNED CHANGES" section describes the two-call chat; the tool rules replace it.
  const instructions = `${systemPromptFor('app').split('Changes — be honest:')[0].trim()}${AGENT_RULES}\n\nCONTEXT:\n${context.text}\n\nMAILBOXES (connected; he can read and send from each):\n${inboxLines.join('\n') || '(none)'}${files.length ? `\n\n${attachmentsText(files)}` : ''}${opts.earlier ? `\n\nEARLIER IN THIS CHAT (summary of the older messages, before the ones below; use it to follow the conversation):\n${opts.earlier}` : ''}`;
  const messages: ModelMessage[] = [
    ...history.slice(-12).map((h): ModelMessage => (h.role === 'user' ? { role: 'user', content: h.content.slice(0, 2000) } : { role: 'assistant', content: h.content.slice(0, 2000) })),
    // Pictures he attached are shown to Claude with his message.
    pictures.length
      ? { role: 'user', content: [{ type: 'text', text: question }, ...pictures.map((f) => ({ type: 'image' as const, image: f.image!, mediaType: 'image/jpeg' }))] }
      : { role: 'user', content: question },
  ];

  const actions: AssistantAction[] = [];
  const dropped: string[] = [];
  const steps: string[] = [];

  /** Checks a change with the classic planner's rules; returns what the assistant is told. */
  const prepareChange = async (name: string, input: Json) => {
    const [clients, tasks] = await Promise.all([data.clients(), data.tasks()]);
    const facts = context.memory.facts;
    const why: string[] = [];
    const made = toActions({ actions: [{ ...input, type: name }] }, clients, tasks, facts, await appFor(name, input, data), why);
    if (!made.length) {
      dropped.push(...why);
      return `NOT prepared: ${why.join(' ') || 'the details didn’t check out.'}`;
    }
    actions.push(...made);
    return made.map((a) => (runsAtOnce(a) ? `done (saved at once, with an Undo button): ${actionSummary(a)}` : `card prepared, waiting for his ✅ Confirm: ${actionSummary(a)}`)).join('\n');
  };

  // Lookups return data at once; changes become cards (prepareChange). Errors go back to the assistant as text.
  const tools: ToolSet = Object.fromEntries(
    TOOLS.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: jsonSchema<Json>(t.parameters as never),
        execute: async (input: Json) => {
          steps.push(`${t.name} ${JSON.stringify(input).slice(0, 200)}`);
          try {
            const out = t.kind === 'change' ? await prepareChange(t.name, input) : await t.run(input, data);
            return (typeof out === 'string' ? out : JSON.stringify(out)).slice(0, 12_000) || '(empty)';
          } catch (error) {
            return `Error: ${error instanceof Error ? error.message.slice(0, 300) : String(error)}`;
          }
        },
      }),
    ])
  );

  let finalText = '';
  let stepText = '';
  let tokens = 0;
  try {
    const result = streamText({
      model: openrouter.chat(model, { extraBody: { reasoning: { enabled: false } } }),
      instructions,
      messages,
      tools,
      temperature: 0.3,
      maxOutputTokens: 2048,
      maxRetries: 2, // OpenRouter's short hiccups (429 / 5xx) are retried instead of ending the turn
      abortSignal: AbortSignal.timeout(Math.max(5_000, deadline - Date.now())),
      stopWhen: isStepCount(MAX_STEPS),
      // The last step (or when time is short) answers with what it has, no more tools.
      prepareStep: ({ stepNumber }) => (stepNumber >= MAX_STEPS - 1 || deadline - Date.now() < 10_000 ? { toolChoice: 'none' as const } : undefined),
    });
    for await (const part of result.fullStream) {
      if (part.type === 'start-step') {
        if (stepText.trim()) emit({ type: 'reset' }); // words before a tool call ("Let me check…") make way for the answer
        stepText = '';
      } else if (part.type === 'text-delta') {
        stepText += part.text;
        emit({ type: 'text', delta: part.text });
      } else if (part.type === 'tool-call') {
        emit({ type: 'step', label: stepLabel(part.toolName) });
      } else if (part.type === 'finish-step') {
        tokens += part.usage?.totalTokens ?? 0;
        if (part.finishReason !== 'tool-calls') finalText = stepText;
      } else if (part.type === 'error') {
        throw part.error instanceof Error ? part.error : new Error(String(part.error));
      }
    }
  } catch (error) {
    await recordAiCall({ provider: 'openrouter', model, feature: 'assistant', ok: false, error: error instanceof Error ? error : new Error(String(error)) });
    // Out of time after some work: answer with what was prepared rather than failing the turn.
    if (steps.length && error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`)) return finish(finalText.trim(), actions, dropped, steps, data, true);
    throw error;
  }
  await recordAiCall({ provider: 'openrouter', model, feature: 'assistant', ok: true, tokens });
  return finish(finalText.trim(), actions, dropped, steps, data, !finalText.trim());
}

function finish(raw: string, actions: AssistantAction[], dropped: string[], steps: string[], data: TurnData, ranOut: boolean): AgentReply {
  const ids = (prefix: string) => [...new Set([...raw.matchAll(new RegExp(`\\[${prefix}:([A-Za-z0-9_-]{6,40})\\]`, 'g'))].map((x) => x[1]))];
  const text = raw
    .replace(/\s*\[(K|T|E):[A-Za-z0-9_-]{6,40}\]/g, '')
    .replace(/\s*\[M:[^\]\s]{4,200}\]/g, '') // live mailbox refs are for the tools, not for him
    .replace(/\s*\[(DONE by the bot|FAILED|PROPOSED[^\]]*)\]/gi, '')
    .trim();
  return {
    text: text || (actions.length ? 'Here’s what I prepared:' : 'I couldn’t finish that. Try asking again in other words.'),
    actions,
    dropped,
    emails: ids('E').map((id) => data.seenEmails.get(id)).filter((e): e is ChatEmail => Boolean(e)).map((e) => ({ id: e.id, subject: e.subject || '(no subject)' })),
    tasks: ids('T').map((id) => data.seenTasks.get(id)).filter((t): t is Task => Boolean(t)),
    steps,
    ranOut: ranOut || !raw,
  };
}
