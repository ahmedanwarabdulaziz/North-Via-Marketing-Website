import crypto from 'crypto';
import { aiJson } from '../ai-json';
import { getMemory } from '../assistant-memory';
import { ringPhone } from '../ntfy';
import { supabase } from '../supabase';
import { allowedChatIds, escapeHtml as h, sendMessage, truncate, type InlineButton, type OutgoingMessage } from '../telegram';
import { gmailClient, listNewGmail, readGmail, sendGmailReply, type MailMessage } from './gmail';
import { listNewOutlook, outlookSession, sendOutlookReply } from './outlook';

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

async function memoryText() {
  const m = await getMemory().catch(() => null);
  if (!m) return '';
  return [`ABOUT AHMED: ${m.profile}`, 'AHMED’S STANDING INSTRUCTIONS AND FACTS (follow them):', ...m.facts.slice(-40).map((f) => `- ${f.text}`)].join('\n');
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

async function triage(account: EmailAccount, mail: MailMessage, history: EmailItem[], memory: string): Promise<Triage> {
  const raw = await aiJson({
    system: `You sort Ahmed Anwar's email. Decide if this email needs Ahmed's attention.
IMPORTANT: from a real person or business about his work, clients, money (invoices, payments, bank), contracts, meetings, legal or government matters, a real account problem that needs action (account suspended or restricted, payment failed, policy violation, domain or hosting expiring), or anything his instructions or this inbox's focus say to watch for. A reply in a conversation he already had is usually important.
NOT IMPORTANT: newsletters, marketing, promotions, tips and recommendations, weekly/monthly stats, automated notifications that need no action, routine security notices (sign-in alerts, "new device", verification or 2FA codes, "password changed", recovery email checks), receipts for small routine things, spam.
AHMED'S INSTRUCTIONS AND THIS INBOX'S FOCUS ALWAYS WIN over these defaults (e.g. if he says to ignore something, it's not important; if he says to watch for something, it is).
URGENT (rings his phone): needs action today, a deadline, an angry client or complaint, a payment problem, an account suspended, or his instructions say to alert him.
Write "summary" in 1-2 short sentences in the email's language (Arabic or English), and "reason" in a few words (e.g. "client asking for a quote").
Return ONLY JSON: {"important": true|false, "urgent": true|false, "summary": "...", "reason": "..."}

${memory}

THIS INBOX: ${account.label || account.email} (${account.email})
FOCUS FOR THIS INBOX: ${account.focus || '(none set: use general judgement)'}`,
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
  const memory = await memoryText();
  let fresh = 0;
  let important = 0;

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
        const ignored = account.ignored_senders.includes(mail.fromEmail);
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
          verdict = await triage(account, mail, history, memory).catch((error) => {
            // If the AI is down, err on the side of showing it.
            console.error('Email triage failed:', error instanceof Error ? error.message.slice(0, 150) : error);
            return { important: true, urgent: false, summary: mail.snippet.slice(0, 300), reason: 'AI busy: not sorted' };
          });
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
          await ringPhone({ title: `🚨 Email: ${mail.fromName || mail.fromEmail}`, message: `${mail.subject}\n${verdict.summary}`.slice(0, 500), tags: ['email'] });
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

// ---------- Replies ----------

/** Turns Ahmed's voice note / text into a professional reply, knowing the conversation so far. */
export async function draftEmailReply(item: EmailItem, account: EmailAccount, brief: string) {
  const [history, memory] = await Promise.all([conversationWith(item), memoryText()]);
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
