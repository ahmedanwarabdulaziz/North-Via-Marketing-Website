import crypto from 'crypto';
import { aiJson } from '../ai-json';
import { factsInBudget, getMemory } from '../assistant-memory';
import { listClientProfiles } from '../admin-ops';
import { clientFileText, clientsForAddresses, type ClientRef } from '../memory-files';
import { ringPhone } from '../ntfy';
import { supabase } from '../supabase';
import { getSetting, setSetting } from '../data/store';
import { allowedChatIds, escapeHtml as h, sendMessage, truncate, type InlineButton, type OutgoingMessage } from '../telegram';
import { gmailClient, listNewGmail, readGmail, sendGmailNew, sendGmailReply, type MailMessage } from './gmail';
import { listNewOutlook, outlookSession, sendOutlookNew, sendOutlookReply } from './outlook';

// Connected inboxes: every 5 minutes (from /api/tasks/due) new mail is read, the AI keeps the
// important ones and a Telegram card is sent. The AI sees each inbox's focus rules, Ahmed's
// memory (/memory: "tell me when Ahmed emails" etc.) and the earlier emails and replies with
// the same person, so it keeps the conversation. Replies are only sent after ✅ Send.

export interface EmailAccount {
  id: string;
  provider: 'gmail' | 'outlook';
  email: string;
  label: string | null;
  focus: string | null;
  enabled: boolean;
  ring_urgent: boolean;
  encrypted_refresh_token: string;
  ignored_senders: string[];
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface EmailItem {
  id: string;
  account_id: string;
  message_id: string;
  thread_id: string | null;
  rfc_message_id: string | null;
  from_name: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  received_at: string | null;
  snippet: string | null;
  body: string | null;
  summary: string | null;
  reason: string | null;
  urgent: boolean;
  status: 'new' | 'replying' | 'draft' | 'sent' | 'done' | 'ignored' | 'skipped';
  draft: string | null;
  brief: string | null;
  chat_id: string | null;
  card_message_id: number | null;
  sent_at: string | null;
  updated_at: string;
}

const RUN_BUDGET_MS = 30_000;
const MAX_PER_ACCOUNT = 10;
/** First check of a new inbox only looks back this far. */
const FIRST_LOOKBACK_H = 12;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export const newEmailId = () => crypto.randomBytes(6).toString('base64url');

// ---------- Accounts ----------

export async function listEmailAccounts() {
  return check(await supabase.from('email_accounts').select().order('created_at')) as EmailAccount[];
}

export async function saveEmailAccount(provider: EmailAccount['provider'], email: string, encryptedRefreshToken: string) {
  const existing = check(await supabase.from('email_accounts').select('id').eq('email', email).maybeSingle()) as { id: string } | null;
  if (existing) {
    check(await supabase.from('email_accounts').update({ encrypted_refresh_token: encryptedRefreshToken, last_error: null, enabled: true }).eq('id', existing.id));
    return existing.id;
  }
  const id = newEmailId();
  // New inboxes don't ring the phone (Telegram card only); it can be turned on per inbox in the admin page.
  check(await supabase.from('email_accounts').insert({ id, provider, email, label: email.split('@')[0], encrypted_refresh_token: encryptedRefreshToken, ring_urgent: false }));
  return id;
}

export async function updateEmailAccount(id: string, patch: Partial<Pick<EmailAccount, 'label' | 'focus' | 'enabled' | 'ring_urgent' | 'ignored_senders'>>) {
  check(await supabase.from('email_accounts').update(patch).eq('id', id));
}

export async function deleteEmailAccount(id: string) {
  check(await supabase.from('email_accounts').delete().eq('id', id));
}


// ---------- Inbox → business links (Admin → Email) ----------

const INBOX_LINKS = 'inbox_business_links';

/** inbox id → client id, set per inbox in Admin → Email. */
export async function inboxBusinessLinks(): Promise<Record<string, string>> {
  return ((await getSetting<Record<string, string>>(INBOX_LINKS).catch(() => null)) || {}) as Record<string, string>;
}

export async function setInboxBusiness(accountId: string, clientId: string | null) {
  const links = await inboxBusinessLinks();
  if (clientId) links[accountId] = clientId;
  else delete links[accountId];
  await setSetting(INBOX_LINKS, links);
}

// ---------- "Ignore emails like this" (the app's 🚫 button) ----------
// A rule remembers one unwanted email: the same sender with the same subject (numbers, dates and
// ids ignored) is skipped without asking the AI, and the AI also sees the list, so similar
// emails from other addresses are judged not important too.

const IGNORE_RULES = 'email_ignore_rules';
const MAX_RULES = 200;

export interface IgnoreRule {
  id: string;
  accountId: string;
  fromEmail: string | null;
  subjectKey: string;
  subject: string;
  summary: string | null;
  createdAt: string;
}

/** The subject without Re:/Fwd:, numbers, dates, ids and spacing, so "Run #123 failed" matches "Run #456 failed". */
export function subjectKey(subject: string | null | undefined) {
  return (subject || '')
    .toLowerCase()
    .replace(/^((re|fwd?|fw)\s*:\s*)+/i, '')
    .replace(/[0-9a-f]{8,}/g, '#')
    .replace(/\d+/g, '#')
    .replace(/[^a-zÀ-ɏ؀-ۿ#]+/g, ' ')
    .trim();
}

export async function listIgnoreRules(): Promise<IgnoreRule[]> {
  return ((await getSetting<IgnoreRule[]>(IGNORE_RULES).catch(() => null)) || []) as IgnoreRule[];
}

export async function addIgnoreRule(item: EmailItem) {
  const rules = await listIgnoreRules();
  const key = subjectKey(item.subject);
  if (rules.some((r) => r.accountId === item.account_id && r.fromEmail === (item.from_email || null) && r.subjectKey === key)) return rules;
  const rule: IgnoreRule = {
    id: newEmailId(),
    accountId: item.account_id,
    fromEmail: item.from_email || null,
    subjectKey: key,
    subject: (item.subject || '').slice(0, 200),
    summary: item.summary?.slice(0, 300) || null,
    createdAt: new Date().toISOString(),
  };
  const next = [...rules, rule].slice(-MAX_RULES);
  await setSetting(IGNORE_RULES, next);
  return next;
}

export async function removeIgnoreRule(id: string) {
  await setSetting(IGNORE_RULES, (await listIgnoreRules()).filter((r) => r.id !== id));
}

/** The ignore rule an email matches, if any. */
export function matchingIgnoreRule(rules: IgnoreRule[], accountId: string, mail: Pick<MailMessage, 'fromEmail' | 'subject'>) {
  const key = subjectKey(mail.subject);
  if (!key) return null;
  return rules.find((r) => r.accountId === accountId && (!r.fromEmail || r.fromEmail === mail.fromEmail) && r.subjectKey === key) || null;
}

function matchesIgnoreRule(rules: IgnoreRule[], accountId: string, mail: Pick<MailMessage, 'fromEmail' | 'subject'>) {
  return Boolean(matchingIgnoreRule(rules, accountId, mail));
}

// ---------- Emails that are never skipped ----------
// A real person acting through a platform (a Drive share, a calendar invite, a platform message, a
// Google / Meta staff member) and anything from a client's address or domain. The AI still writes the
// summary; it just can't skip them. Ignore rules and ignored senders still win.

const PUBLIC_DOMAINS = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|aol|proton|protonmail|gmx|mail|yandex)\./i;

const domainOf = (address: string) => address.toLowerCase().split('@')[1] || '';
const hostOf = (url: string | undefined) => {
  try {
    return url ? new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase() : '';
  } catch {
    return '';
  }
};

/** Clients' email addresses, and their own domains (from email and website; not Gmail-style ones, not Ahmed's own). */
export async function clientSenders(ownInboxes: string[]) {
  const clients = await listClientProfiles().catch(() => []);
  const own = new Set(ownInboxes.map(domainOf));
  const addresses = new Map<string, string>();
  const domains = new Map<string, string>();
  for (const c of clients) {
    if (!c.brandName) continue;
    const email = (c.email || '').trim().toLowerCase();
    if (email.includes('@')) addresses.set(email, c.brandName);
    for (const d of [domainOf(email), hostOf(c.websiteUrl)]) if (d && !PUBLIC_DOMAINS.test(d) && !own.has(d)) domains.set(d, c.brandName);
  }
  for (const own of ownInboxes) addresses.delete(own.toLowerCase());
  return { addresses, domains };
}

/** Why this email must be shown whatever the AI thinks, or null. */
export function mustShow(mail: Pick<MailMessage, 'fromName' | 'fromEmail' | 'subject'>, clients: Awaited<ReturnType<typeof clientSenders>>) {
  const from = (mail.fromEmail || '').toLowerCase();
  const client = clients.addresses.get(from) || clients.domains.get(domainOf(from));
  if (client) return `From the client ${client}`;
  const via = /^(.+?)\s*\(via (Google (Drive|Docs|Sheets|Slides|Calendar|Chat|Meet)|Dropbox|OneDrive|SharePoint|Canva|Figma)[^)]*\)/i.exec(mail.fromName || '');
  if (via) return `${via[1].trim()} shared or sent something (${via[2]})`;
  if (/^(updated )?invitation:|^invitation from |^new event:/i.test(mail.subject || '')) return 'A calendar invitation';
  if (/new message from |sent you a message|messaged you|mentioned you|assigned (you|to you)/i.test(mail.subject || '')) return 'A real person messaged or mentioned you';
  if (/@(xwf\.google\.com|google\.com)$/.test(from) && !/no-?reply|noreply|notification|alerts?@|ads-|googleplay|payments|accounts/i.test(from)) return 'A person at Google';
  return null;
}

// ---------- "Always important" senders (the app's Skipped tab) ----------
// Emails from these senders (in that inbox) are never skipped: the AI still writes the summary.

const IMPORTANT_SENDERS = 'email_important_senders';

export interface ImportantSender {
  accountId: string;
  fromEmail: string;
  createdAt: string;
}

export async function listImportantSenders(): Promise<ImportantSender[]> {
  return ((await getSetting<ImportantSender[]>(IMPORTANT_SENDERS).catch(() => null)) || []) as ImportantSender[];
}

export async function addImportantSender(accountId: string, fromEmail: string) {
  const list = await listImportantSenders();
  const email = fromEmail.toLowerCase();
  if (list.some((s) => s.accountId === accountId && s.fromEmail === email)) return list;
  const next = [...list, { accountId, fromEmail: email, createdAt: new Date().toISOString() }].slice(-300);
  await setSetting(IMPORTANT_SENDERS, next);
  return next;
}

export async function removeImportantSender(accountId: string, fromEmail: string) {
  const email = fromEmail.toLowerCase();
  await setSetting(IMPORTANT_SENDERS, (await listImportantSenders()).filter((s) => !(s.accountId === accountId && s.fromEmail === email)));
}

function isImportantSender(list: ImportantSender[], accountId: string, fromEmail: string | null | undefined) {
  const email = (fromEmail || '').toLowerCase();
  return Boolean(email) && list.some((s) => s.accountId === accountId && s.fromEmail === email);
}

/** Why a skipped email was skipped: the sender is ignored, it matches an ignore rule, or the AI judged it. */
export function skipCause(item: EmailItem, account: Pick<EmailAccount, 'id' | 'ignored_senders'> | undefined, rules: IgnoreRule[]) {
  if (item.status !== 'skipped') return null;
  if (account && item.from_email && account.ignored_senders.includes(item.from_email)) return { kind: 'sender' as const, text: 'You ignored this sender' };
  const rule = matchingIgnoreRule(rules, item.account_id, { fromEmail: item.from_email || '', subject: item.subject || '' });
  if (rule) return { kind: 'rule' as const, ruleId: rule.id, text: `Your rule: ignore “${rule.subject}”${rule.fromEmail ? ` from ${rule.fromEmail}` : ''}` };
  return { kind: 'ai' as const, text: item.reason ? `AI: ${item.reason}` : 'AI: not important' };
}

function ignoreRulesText(rules: IgnoreRule[], accountId: string) {
  const mine = rules.filter((r) => r.accountId === accountId).slice(-30);
  if (!mine.length) return '';
  return [
    'AHMED MARKED THESE EMAILS AS UNWANTED: emails like them (same kind of content, even from another address) are NOT important:',
    ...mine.map((r) => `- From ${r.fromEmail || 'anyone'}: "${r.subject}"${r.summary ? ` (${r.summary})` : ''}`),
  ].join('\n');
}

// ---------- Items ----------

export async function getEmailItem(id: string) {
  return check(await supabase.from('email_items').select().eq('id', id).maybeSingle()) as EmailItem | null;
}

export async function updateEmailItem(id: string, patch: Partial<EmailItem>) {
  return check(await supabase.from('email_items').update(patch).eq('id', id).select().single()) as EmailItem;
}

export async function getEmailAccount(id: string) {
  return check(await supabase.from('email_accounts').select().eq('id', id).maybeSingle()) as EmailAccount | null;
}

/** The email waiting for Ahmed's voice note / text (at most one at a time). */
export async function emailAwaitingReply(chatId: number | string) {
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  return check(
    await supabase.from('email_items').select().eq('status', 'replying').eq('chat_id', String(chatId)).gte('updated_at', since).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  ) as EmailItem | null;
}

/** Earlier emails and replies with the same person (or thread), oldest first: the conversation so far. */
export async function conversationWith(item: Pick<EmailItem, 'id' | 'account_id' | 'from_email' | 'thread_id'>, limit = 6) {
  const filters = [item.from_email ? `from_email.eq.${item.from_email}` : null, item.thread_id ? `thread_id.eq.${item.thread_id}` : null].filter(Boolean).join(',');
  if (!filters) return [] as EmailItem[];
  const rows = check(
    await supabase.from('email_items').select().eq('account_id', item.account_id).neq('id', item.id).or(filters).order('received_at', { ascending: false }).limit(limit)
  ) as EmailItem[];
  return rows.reverse();
}

export function conversationText(history: EmailItem[]) {
  if (!history.length) return 'No earlier emails with this person.';
  return history
    .map((e) =>
      [
        `• ${e.received_at?.slice(0, 10)} — ${e.from_name || e.from_email}: "${e.subject}"`,
        `  ${truncate((e.summary || e.snippet || '').replace(/\s+/g, ' '), 300)}`,
        e.status === 'sent' && e.draft ? `  Ahmed replied: ${truncate(e.draft.replace(/\s+/g, ' '), 400)}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n');
}

/**
 * What the AI should know for one email: Ahmed's general rules (email rules first), and the file
 * of the client this email belongs to — matched by the inbox's domain (info@pacificegy.com →
 * Pacific) or the sender's. Other clients' files are never sent.
 */
async function memoryText(addresses: (string | null | undefined)[] = [], accountId?: string) {
  const [m, clients, links] = await Promise.all([getMemory().catch(() => null), listClientProfiles().catch(() => []), inboxBusinessLinks()]);
  if (!m) return '';
  const facts = [...factsInBudget(m.facts, ['email']), ...factsInBudget(m.facts, ['client', 'general'])];
  const known = clients.filter((c) => c.id && c.brandName) as ClientRef[];
  // An inbox linked to a business in Admin → Email always uses that business; otherwise match by domain.
  const linked = accountId && links[accountId] ? known.filter((c) => c.id === links[accountId]) : [];
  const matched = (linked.length ? linked : clientsForAddresses(addresses, known)).slice(0, 2);
  const files = (await Promise.all(matched.map((c) => clientFileText(c.id, c.brandName).catch(() => '')))).filter(Boolean);
  return [
    `ABOUT AHMED: ${m.profile}`,
    'AHMED’S GENERAL INSTRUCTIONS AND FACTS (follow them; newest first — if two disagree, the NEWER one wins):',
    ...facts.map((f) => `- (${f.at.slice(0, 10)}) ${f.text}`),
    ...(matched.length ? ['', `THIS EMAIL BELONGS TO CLIENT: ${matched.map((c) => c.brandName).join(', ')}`] : []),
    ...files.flatMap((f) => ['', f]),
  ].join('\n');
}

/**
 * When Ahmed replies (in Telegram) to an email card, the email itself as context for the chat:
 * sender, inbox, text and the earlier emails with the same person. Null for other messages.
 */
export async function emailContextForCard(chatId: number | string, cardMessageId: number) {
  const item = check(
    await supabase.from('email_items').select().eq('chat_id', String(chatId)).eq('card_message_id', cardMessageId).maybeSingle()
  ) as EmailItem | null;
  if (!item) return null;
  const [account, history] = await Promise.all([getEmailAccount(item.account_id), conversationWith(item, 8)]);
  return [
    `[He is asking about THIS email [E:${item.id}] — answer about it, not about earlier topics]`,
    `Inbox: ${account?.label || account?.email || ''} (${account?.email || ''})`,
    `From: ${item.from_name || ''} <${item.from_email || ''}>`,
    `Received: ${item.received_at?.slice(0, 16).replace('T', ' ')}`,
    `Subject: ${item.subject || ''}`,
    `Text: ${truncate((item.body || item.snippet || '').replace(/\s+/g, ' '), 1500)}`,
    `Earlier emails with this sender in this inbox (${history.length}):`,
    conversationText(history),
  ].join('\n');
}

// ---------- Triage ----------

interface Triage {
  important: boolean;
  urgent: boolean;
  summary: string;
  reason: string;
}

async function triage(account: EmailAccount, mail: MailMessage, history: EmailItem[], memory: string, unwanted = ''): Promise<Triage> {
  const raw = await aiJson({
    system: `You sort Ahmed Anwar's email. Decide if this email needs Ahmed's attention.
IMPORTANT: from a real person or business about his work, clients, money (invoices, payments, bank), contracts, meetings, legal or government matters, a real account problem that needs action (account suspended or restricted, payment failed, policy violation, domain or hosting expiring), or anything his instructions or this inbox's focus say to watch for. A reply in a conversation he already had is usually important.
NOT IMPORTANT: newsletters, marketing, promotions, tips and recommendations, weekly/monthly stats, automated notifications that need no action, routine security notices (sign-in alerts, "new device", verification or 2FA codes, "password changed", recovery email checks), receipts for small routine things, spam.
PEOPLE BEAT PLATFORMS: when a real person is behind the email, it is IMPORTANT even if it comes through a platform or a no-reply address: someone shared a file or folder ("Name (via Google Drive)"), mentioned or assigned him, sent him a direct message on a platform ("You have a new message from …"), a calendar invite, a person at Google / Meta / a bank or a supplier writing about his or a client's account, or a client forwarding him something (even a promotion: they want his opinion). Judge the person, not the platform.
WHEN IN DOUBT, IT IS IMPORTANT: if you are not sure, choose important. A few extra emails are fine; a missed one is not.
ORDER OF PRECEDENCE when rules disagree: 1) this inbox's FOCUS, 2) his instructions about a specific inbox, sender or client, 3) his general instructions (newer beats older), 4) these defaults. E.g. if he says to ignore something, it's not important; if he says to watch for something, it is.
URGENT (rings his phone): needs action today, a deadline, an angry client or complaint, a payment problem, an account suspended, or his instructions say to alert him.
Write "summary" in 1-2 short sentences in the email's language (Arabic or English), and "reason" in a few words (e.g. "client asking for a quote").
Return ONLY JSON: {"important": true|false, "urgent": true|false, "summary": "...", "reason": "..."}

${memory}

THIS INBOX: ${account.label || account.email} (${account.email})
FOCUS FOR THIS INBOX: ${account.focus || '(none set: use general judgement)'}${unwanted ? `

${unwanted}` : ''}`,
    user: [
      `EARLIER EMAILS WITH THIS PERSON:\n${conversationText(history)}`,
      '',
      `NEW EMAIL`,
      `From: ${mail.fromName} <${mail.fromEmail}>`,
      `Subject: ${mail.subject}`,
      `Text:\n${truncate(mail.body || mail.snippet, 2500)}`,
    ].join('\n'),
    feature: 'comments',
    timeBudgetMs: 12_000,
  });
  return {
    important: raw.important === true,
    urgent: raw.urgent === true,
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 400) : mail.snippet.slice(0, 200),
    reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 120) : '',
  };
}

// ---------- Telegram card ----------

export function isNoReply(address: string | null | undefined) {
  return /(^|[._+-])(no-?reply|do-?not-?reply|donotreply|mailer-daemon|notifications?)([._+-]|@)/i.test(address || '');
}

export function emailCard(item: EmailItem, account: Pick<EmailAccount, 'label' | 'email'>, header?: string): OutgoingMessage {
  const lines = [
    header || `${item.urgent ? '🚨' : '📧'} <b>${h(account.label || account.email)}</b> · ${h(item.from_name || item.from_email || '')}`,
    `<b>${h(truncate(item.subject || '(no subject)', 150))}</b>`,
    '',
    h(item.summary || truncate(item.snippet || '', 300)),
  ];
  if (item.reason) lines.push(`<i>${h(item.reason)}</i>`);
  if (item.from_email) lines.push(`<i>${h(item.from_email)}</i>`);
  const buttons: InlineButton[][] =
    item.status === 'sent' || item.status === 'done' || item.status === 'ignored'
      ? [[{ text: '📄 Full email', callback_data: `em:f:${item.id}` }]]
      : [
          // No Reply for no-reply senders (Google, banks' notifications…): nobody reads those.
          isNoReply(item.from_email)
            ? [{ text: '📄 Full email', callback_data: `em:f:${item.id}` }]
            : [
                { text: '✍️ Reply', callback_data: `em:r:${item.id}` },
                { text: '📄 Full email', callback_data: `em:f:${item.id}` },
              ],
          [
            { text: '✅ Done', callback_data: `em:d:${item.id}` },
            { text: '🔕 Ignore sender', callback_data: `em:i:${item.id}` },
          ],
        ];
  return { text: lines.join('\n'), buttons };
}

// ---------- The 5-minute check ----------

export async function checkInboxes(now = new Date()) {
  const deadline = Date.now() + RUN_BUDGET_MS;
  const accounts = (await listEmailAccounts().catch(() => [] as EmailAccount[])).filter((a) => a.enabled);
  if (!accounts.length) return { accounts: 0, new: 0, important: 0 };
  let fresh = 0;
  let important = 0;
  const [rules, importantSenders, clients] = await Promise.all([
    listIgnoreRules(),
    listImportantSenders(),
    clientSenders(accounts.map((a) => a.email)).catch(() => ({ addresses: new Map<string, string>(), domains: new Map<string, string>() })),
  ]);

  for (const account of accounts) {
    if (Date.now() > deadline) break;
    const startedAt = now.toISOString();
    try {
      // A 10-minute overlap with the last check, with the unique index, avoids gaps.
      const since = (account.last_checked_at ? Date.parse(account.last_checked_at) : Date.now() - FIRST_LOOKBACK_H * 3_600_000) - 10 * 60_000;
      const isKnown = async (ids: string[]) =>
        new Set(ids.length ? ((check(await supabase.from('email_items').select('message_id').eq('account_id', account.id).in('message_id', ids)) as { message_id: string }[]).map((r) => r.message_id)) : []);

      // Each provider gives a list of new messages, read lazily (Gmail) or all at once (Outlook).
      let readers: Array<() => Promise<MailMessage>> = [];
      if (account.provider === 'gmail') {
        const gmail = gmailClient(account.encrypted_refresh_token);
        const ids = await listNewGmail(gmail, Math.floor(since / 1000), MAX_PER_ACCOUNT);
        const known = await isKnown(ids);
        readers = ids.filter((i) => !known.has(i)).reverse().map((id) => () => readGmail(gmail, id));
      } else {
        const session = await outlookSession(account.encrypted_refresh_token);
        if (session.encryptedRefreshToken) await supabase.from('email_accounts').update({ encrypted_refresh_token: session.encryptedRefreshToken }).eq('id', account.id);
        const mails = await listNewOutlook(session.accessToken, since, MAX_PER_ACCOUNT);
        const known = await isKnown(mails.map((m) => m.messageId));
        readers = mails.filter((m) => !known.has(m.messageId)).map((m) => async () => m);
      }

      let finished = true;
      for (const read of readers) {
        if (Date.now() > deadline) {
          finished = false; // the rest are picked up next run
          break;
        }
        const mail = await read();
        if (mail.fromEmail === account.email || mail.labels.includes('SENT')) continue;
        fresh++;
        const keep = isImportantSender(importantSenders, account.id, mail.fromEmail) ? 'Always important sender' : mustShow(mail, clients);
        const alwaysImportant = Boolean(keep);
        const ignored = !alwaysImportant && (account.ignored_senders.includes(mail.fromEmail) || matchesIgnoreRule(rules, account.id, mail));
        const item: EmailItem = {
          id: newEmailId(),
          account_id: account.id,
          message_id: mail.messageId,
          thread_id: mail.threadId,
          rfc_message_id: mail.rfcMessageId,
          from_name: mail.fromName,
          from_email: mail.fromEmail,
          to_email: mail.to,
          subject: mail.subject,
          received_at: mail.receivedAt,
          snippet: mail.snippet,
          body: mail.body,
          summary: null,
          reason: null,
          urgent: false,
          status: 'skipped',
          draft: null,
          brief: null,
          chat_id: null,
          card_message_id: null,
          sent_at: null,
          updated_at: new Date().toISOString(),
        };
        let verdict: Triage = { important: false, urgent: false, summary: '', reason: '' };
        if (!ignored) {
          const history = await conversationWith({ id: item.id, account_id: account.id, from_email: mail.fromEmail, thread_id: mail.threadId });
          verdict = await triage(account, mail, history, await memoryText([account.email, mail.fromEmail], account.id), ignoreRulesText(rules, account.id)).catch((error) => {
            // If the AI is down, err on the side of showing it.
            console.error('Email triage failed:', error instanceof Error ? error.message.slice(0, 150) : error);
            return { important: true, urgent: false, summary: mail.snippet.slice(0, 300), reason: 'AI busy: not sorted' };
          });
          if (keep && !verdict.important) verdict = { ...verdict, important: true, reason: keep };
        }
        Object.assign(item, {
          summary: verdict.summary || null,
          reason: verdict.reason || null,
          urgent: verdict.urgent,
          status: verdict.important ? 'new' : 'skipped',
        });
        const insert = await supabase.from('email_items').insert(item);
        if (insert.error) continue; // already stored by an overlapping run
        if (!verdict.important) continue;
        important++;
        for (const chatId of allowedChatIds()) {
          const sent = await sendMessage(chatId, emailCard(item, account)).catch(() => null);
          const messageId = (sent as { message_id?: number } | null)?.message_id;
          await updateEmailItem(item.id, { chat_id: String(chatId), ...(messageId ? { card_message_id: messageId } : {}) });
        }
        if (verdict.urgent && account.ring_urgent) {
          await ringPhone({ title: `🚨 Email: ${mail.fromName || mail.fromEmail}`, message: `${mail.subject}\n${verdict.summary}`.slice(0, 500), tags: ['email'], channel: 'email', category: 'email', data: { type: 'email', id: item.id } });
        }
      }
      await supabase.from('email_accounts').update({ ...(finished ? { last_checked_at: startedAt } : {}), last_error: null }).eq('id', account.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Inbox ${account.email} failed:`, message.slice(0, 200));
      await supabase.from('email_accounts').update({ last_error: message.slice(0, 300) }).eq('id', account.id);
    }
  }
  return { accounts: accounts.length, new: fresh, important };
}

// ---------- 9 PM: what was skipped today ----------

const SKIPPED_DIGEST = 'skipped_email_digest';
const SKIPPED_DIGEST_FROM = '21:00';
const AUTOMATED = /no-?reply|noreply|notifications?@|notify@|alerts?@|news(letter)?@|updates?@|marketing@|promo|mailer|digest@|info@e\.|@e\.|@(mail|email|messaging|t|em|news)\.|bounce|do-not-reply|donotreply|automated|support@|billing@|invoic/i;

/** Once a day from 9 PM Cairo: an app notification counting today's skipped emails, naming the ones from real people. */
export async function sendSkippedDigest(now = new Date()) {
  const { cairoParts } = await import('../tasks');
  const { sendPush } = await import('../push');
  const { date: today, time } = cairoParts(now);
  if (time < SKIPPED_DIGEST_FROM) return { sent: false, reason: 'before 9 PM Cairo' };
  const last = await getSetting<{ day?: string }>(SKIPPED_DIGEST).catch(() => null);
  if (last?.day === today) return { sent: false, reason: 'already sent today' };
  await setSetting(SKIPPED_DIGEST, { day: today, at: now.toISOString() });

  const { data, error } = await supabase
    .from('email_items')
    .select('id, from_name, from_email, subject, reason, received_at')
    .eq('status', 'skipped')
    .gte('received_at', new Date(now.getTime() - 26 * 3_600_000).toISOString())
    .order('received_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const todays = ((data || []) as Pick<EmailItem, 'id' | 'from_name' | 'from_email' | 'subject' | 'reason' | 'received_at'>[]).filter(
    (e) => e.received_at && cairoParts(new Date(e.received_at)).date === today
  );
  if (!todays.length) return { sent: false, reason: 'nothing skipped today' };
  const people = todays.filter((e) => !AUTOMATED.test(e.from_email || '') || /\(via /i.test(e.from_name || ''));
  const names = [...new Set(people.map((e) => (e.from_name || e.from_email || '').replace(/\s*\(via .*\)$/i, '').trim()).filter(Boolean))].slice(0, 3);
  const sent = await sendPush({
    title: `📭 Skipped today: ${todays.length}`,
    body: names.length
      ? `${people.length} from real people: ${names.join(', ')}${people.length > names.length ? '…' : ''}. Tap to check.`
      : 'All automated (newsletters, notices, promotions). Tap to check.',
    channel: 'summary',
    category: 'ask',
    data: { type: 'skipped' },
  });
  return { sent: true, skipped: todays.length, people: people.length, devices: sent };
}

// ---------- Replies ----------

/** Turns Ahmed's voice note / text into a professional reply, knowing the conversation so far. */
export async function draftEmailReply(item: EmailItem, account: EmailAccount, brief: string) {
  const [history, memory] = await Promise.all([conversationWith(item), memoryText([account.email, item.from_email], account.id)]);
  const raw = await aiJson({
    system: `You write email replies for Ahmed Anwar, sent from ${account.email} (${account.label || ''}).
Ahmed tells you roughly what to say (often spoken, in Egyptian Arabic or English). Write the full reply email:
- In the language of the email he is replying to (Arabic email → Arabic, English → English), unless he says otherwise.
- Professional, warm, direct, well structured, short paragraphs. No hype, no filler. Keep every fact, date, number and decision he gave; never invent new ones.
- Greeting with the sender's first name, then the message, then a short closing and the signature "Ahmed Anwar" (add "North Via Marketing" only for NVM / client work).
- Plain text only (no markdown). Don't repeat the subject line.
Return ONLY JSON: {"reply": "..."}

${memory}`,
    user: [
      `EARLIER EMAILS WITH THIS PERSON:\n${conversationText(history)}`,
      '',
      `EMAIL TO REPLY TO`,
      `From: ${item.from_name} <${item.from_email}>`,
      `Subject: ${item.subject}`,
      `Text:\n${truncate(item.body || item.snippet || '', 3000)}`,
      '',
      `WHAT AHMED WANTS TO SAY (all his notes, latest last):\n${brief}`,
    ].join('\n'),
    feature: 'comments',
    timeBudgetMs: 25_000,
    geminiFirst: true,
  });
  const reply = typeof raw.reply === 'string' ? raw.reply.trim() : '';
  if (reply.length < 10) throw new Error('The AI returned an empty reply.');
  return reply;
}

export async function sendEmailReply(item: EmailItem, account: EmailAccount) {
  if (!item.draft) throw new Error('No reply drafted.');
  if (account.provider === 'outlook') {
    const session = await outlookSession(account.encrypted_refresh_token);
    if (session.encryptedRefreshToken) await supabase.from('email_accounts').update({ encrypted_refresh_token: session.encryptedRefreshToken }).eq('id', account.id);
    await sendOutlookReply(session.accessToken, item.message_id, item.draft);
    return item.message_id;
  }
  const gmail = gmailClient(account.encrypted_refresh_token);
  return sendGmailReply(gmail, {
    from: account.email,
    to: item.from_name && item.from_email ? `${item.from_name.replace(/[<>"]/g, '')} <${item.from_email}>` : item.from_email || '',
    subject: item.subject || '',
    text: item.draft,
    threadId: item.thread_id,
    inReplyTo: item.rfc_message_id,
    references: null,
  });
}

// ---------- New emails (the app chat: "send an email from … to …") ----------

export const isEmailAddress = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s);

/** Writes a new email for Ahmed from his notes: { subject, body }. Nothing is sent. */
export async function draftNewEmail(account: EmailAccount, to: string, notes: string, subject: string | null) {
  const [history, memory] = await Promise.all([
    supabase.from('email_items').select().eq('account_id', account.id).eq('from_email', to.toLowerCase()).order('received_at', { ascending: false }).limit(4),
    memoryText([account.email, to], account.id),
  ]);
  const raw = await aiJson({
    system: `You write new emails for Ahmed Anwar, sent from ${account.email} (${account.label || ''}).
Ahmed tells you roughly what to say (often spoken, in Egyptian Arabic or English). Write the full email:
- In English unless he asks for Arabic or the earlier emails with this person are in Arabic.
- Professional, warm, direct, short paragraphs. Keep every fact, amount, date and request he gave; never invent new ones (no invoice numbers, dates or links he didn't give: write a short [placeholder] in square brackets if one is clearly needed).
- A greeting (the person's first name if known, otherwise "Hello"), the message, a short closing and the signature "Ahmed Anwar" plus the business that matches the inbox (e.g. JL Comfort for jlcomfort.com, North Via Marketing for NVM work).
- Plain text only (no markdown). A clear, short subject${subject ? ` (he asked for: ${subject})` : ''}.
Return ONLY JSON: {"subject": "...", "body": "..."}

${memory}`,
    user: [`TO: ${to}`, `EARLIER EMAILS FROM THIS PERSON:\n${conversationText((history.data || []) as EmailItem[])}`, '', `WHAT AHMED WANTS TO SAY:\n${notes}`].join('\n'),
    feature: 'comments',
    timeBudgetMs: 25_000,
    geminiFirst: true,
  });
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (body.length < 10) throw new Error('The AI returned an empty email.');
  return { subject: (typeof raw.subject === 'string' && raw.subject.trim()) || subject || '(no subject)', body };
}

/** Sends a new email from the connected inbox (Gmail or Outlook). */
export async function sendNewEmail(account: EmailAccount, mail: { to: string; subject: string; text: string }) {
  if (!isEmailAddress(mail.to)) throw new Error(`“${mail.to}” isn’t an email address.`);
  if (account.provider === 'outlook') {
    const session = await outlookSession(account.encrypted_refresh_token);
    if (session.encryptedRefreshToken) await supabase.from('email_accounts').update({ encrypted_refresh_token: session.encryptedRefreshToken }).eq('id', account.id);
    await sendOutlookNew(session.accessToken, mail);
    return;
  }
  await sendGmailNew(gmailClient(account.encrypted_refresh_token), { from: account.email, ...mail });
}
