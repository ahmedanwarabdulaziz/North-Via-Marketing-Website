import type { gmail_v1 } from 'googleapis';
import { supabase } from '../supabase';
import { bodyText, gmailClient, header, parseFrom, readGmail, withoutQuote, type MailMessage } from './gmail';
import { listEmailAccounts, newEmailId, type EmailAccount, type EmailItem } from './inbox';
import { graph, outlookSession } from './outlook';
import { imapInboxBetween, imapThread, readImap, searchImap, type ImapFound } from './imap';

// The chat's live view of Ahmed's real mailboxes. The 5-minute check only saves new Inbox mail;
// this reads every folder of every connected inbox on demand, straight from Gmail and Microsoft:
// Sent, Archive / All Mail, Spam / Junk, every tab, label and sub-folder, any date.
//   searchMailboxes    find emails (any folder, any age)
//   openMailboxEmail   one email in full + its whole conversation (his replies too) + attachment list
//   attachmentText     the text of a PDF (or text) attachment
//   waitingOnMe        emails from real people he hasn't answered after N days (checked against Sent)
//   saveFound          keeps a found email in Anwarz so the chat's actions (reply, done…) work on it
// Nothing here changes the mailbox.

export type Folder = 'any' | 'inbox' | 'sent' | 'spam' | 'archive' | 'drafts' | 'trash';

export interface FoundEmail {
  ref: string; // "<account id>:<provider message id>", what the other functions take
  inbox: string;
  provider: 'gmail' | 'outlook' | 'imap';
  folder: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  fromMe: boolean;
}

const MAX_RESULTS = 12;
const accountsCache = { at: 0, list: [] as EmailAccount[] };

async function accounts() {
  if (Date.now() - accountsCache.at > 60_000) accountsCache.list = (await listEmailAccounts()).filter((a) => a.enabled);
  accountsCache.at = Date.now();
  return accountsCache.list;
}

export function parseRef(ref: string) {
  const i = ref.indexOf(':');
  return i > 0 ? { accountId: ref.slice(0, i), messageId: ref.slice(i + 1) } : null;
}

async function outlookToken(account: EmailAccount) {
  const s = await outlookSession(account.encrypted_refresh_token);
  if (s.encryptedRefreshToken) await supabase.from('email_accounts').update({ encrypted_refresh_token: s.encryptedRefreshToken }).eq('id', account.id);
  return s.accessToken;
}

// ---------- Gmail ----------

const GMAIL_FOLDER: Record<Folder, string> = {
  any: 'in:anywhere',
  inbox: 'in:inbox',
  sent: 'in:sent',
  spam: 'in:spam',
  archive: '-in:inbox -in:sent -in:spam -in:trash -in:drafts',
  drafts: 'in:drafts',
  trash: 'in:trash',
};

function gmailFolderOf(labels: string[]) {
  if (labels.includes('SPAM')) return 'Spam';
  if (labels.includes('TRASH')) return 'Trash';
  if (labels.includes('DRAFT')) return 'Drafts';
  if (labels.includes('SENT')) return 'Sent';
  if (labels.includes('INBOX')) {
    const tab = labels.find((l) => l.startsWith('CATEGORY_') && l !== 'CATEGORY_PERSONAL');
    return tab ? `Inbox · ${tab.slice(9).toLowerCase()}` : 'Inbox';
  }
  return 'Archive';
}

const hasAttachment = (part?: gmail_v1.Schema$MessagePart): boolean => Boolean(part && ((part.filename && part.body?.attachmentId) || (part.parts || []).some(hasAttachment)));

async function searchGmail(account: EmailAccount, q: string, max: number): Promise<FoundEmail[]> {
  const gmail = gmailClient(account.encrypted_refresh_token);
  const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: max, includeSpamTrash: /in:(anywhere|spam|trash)/.test(q) });
  const ids = (list.data.messages || []).map((m) => m.id!).filter(Boolean);
  const out = await Promise.all(
    ids.map(async (id) => {
      const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const h = data.payload?.headers;
      const from = parseFrom(header(h, 'From'));
      const labels = data.labelIds || [];
      return {
        ref: `${account.id}:${id}`,
        inbox: account.email,
        provider: 'gmail' as const,
        folder: gmailFolderOf(labels),
        fromName: from.name,
        fromEmail: from.email,
        to: header(h, 'To'),
        subject: header(h, 'Subject') || '(no subject)',
        date: new Date(Number(data.internalDate) || Date.now()).toISOString(),
        snippet: (data.snippet || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
        hasAttachments: hasAttachment(data.payload),
        fromMe: from.email === account.email.toLowerCase() || labels.includes('SENT'),
      };
    })
  );
  return out;
}

// ---------- Outlook ----------

interface GraphMsg {
  id: string;
  conversationId?: string;
  subject?: string;
  receivedDateTime?: string;
  sentDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { name?: string; address?: string } }[];
  hasAttachments?: boolean;
  parentFolderId?: string;
  internetMessageId?: string;
}

const OUTLOOK_FOLDER: Record<Folder, string | null> = { any: null, inbox: 'inbox', sent: 'sentitems', spam: 'junkemail', archive: 'archive', drafts: 'drafts', trash: 'deleteditems' };
const SELECT = 'id,conversationId,subject,receivedDateTime,sentDateTime,bodyPreview,from,toRecipients,hasAttachments,parentFolderId';

async function outlookFolders(token: string) {
  const res = await graph<{ value: { id: string; displayName: string }[] }>(token, '/me/mailFolders?$top=100&$select=id,displayName&includeHiddenFolders=true').catch(() => ({ value: [] }));
  return new Map(res.value.map((f) => [f.id, f.displayName]));
}

function outlookFound(account: EmailAccount, m: GraphMsg, folders: Map<string, string>): FoundEmail {
  const fromEmail = (m.from?.emailAddress?.address || '').toLowerCase();
  return {
    ref: `${account.id}:${m.id}`,
    inbox: account.email,
    provider: 'outlook',
    folder: (m.parentFolderId && folders.get(m.parentFolderId)) || 'Mail',
    fromName: m.from?.emailAddress?.name || fromEmail,
    fromEmail,
    to: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean).join(', '),
    subject: m.subject || '(no subject)',
    date: m.receivedDateTime || m.sentDateTime || '',
    snippet: (m.bodyPreview || '').slice(0, 300),
    hasAttachments: Boolean(m.hasAttachments),
    fromMe: fromEmail === account.email.toLowerCase(),
  };
}

async function searchOutlook(account: EmailAccount, opts: SearchOptions, max: number): Promise<FoundEmail[]> {
  const token = await outlookToken(account);
  const folders = await outlookFolders(token);
  const folder = OUTLOOK_FOLDER[opts.folder || 'any'];
  const base = folder ? `/me/mailFolders/${folder}/messages` : '/me/messages';
  // Graph's $search (KQL) covers every folder when asked on /me/messages.
  const kql = [
    opts.text ? opts.text.replace(/"/g, '') : '',
    opts.from ? `from:${opts.from}` : '',
    opts.to ? `to:${opts.to}` : '',
    opts.subject ? `subject:${opts.subject.replace(/"/g, '')}` : '',
    opts.hasAttachment ? 'hasattachments:true' : '',
    opts.after ? `received>=${opts.after}` : '',
    opts.before ? `received<=${opts.before}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const q = new URLSearchParams({ $top: String(max), $select: SELECT });
  if (kql) q.set('$search', `"${kql}"`);
  else q.set('$orderby', 'receivedDateTime desc');
  const res = await graph<{ value: GraphMsg[] }>(token, `${base}?${q}`, { headers: { ConsistencyLevel: 'eventual' } });
  return res.value.map((m) => outlookFound(account, m, folders));
}

// ---------- IMAP (Purelymail and other mailboxes) ----------

const imapFound = (account: EmailAccount, f: ImapFound): FoundEmail => ({
  ref: `${account.id}:${f.key}`,
  inbox: account.email,
  provider: 'imap',
  folder: f.folder,
  fromName: f.fromName,
  fromEmail: f.fromEmail,
  to: f.to,
  subject: f.subject,
  date: f.date,
  snippet: '',
  hasAttachments: f.hasAttachments,
  fromMe: f.fromMe,
});

async function searchImapFound(account: EmailAccount, o: SearchOptions, max: number) {
  return (await searchImap(account, o, max)).map((f) => imapFound(account, f));
}

// ---------- Search ----------

export interface SearchOptions {
  text?: string; // any words (names, subject, body)
  from?: string; // address or name
  to?: string;
  subject?: string;
  folder?: Folder;
  after?: string; // YYYY-MM-DD
  before?: string;
  hasAttachment?: boolean;
  inbox?: string; // one inbox address, or all
}

function gmailQuery(o: SearchOptions) {
  const quote = (s: string) => (/\s/.test(s) ? `"${s.replace(/"/g, '')}"` : s);
  return [
    GMAIL_FOLDER[o.folder || 'any'],
    o.text || '',
    o.from ? `from:${quote(o.from)}` : '',
    o.to ? `to:${quote(o.to)}` : '',
    o.subject ? `subject:${quote(o.subject)}` : '',
    o.after ? `after:${o.after.replace(/-/g, '/')}` : '',
    o.before ? `before:${o.before.replace(/-/g, '/')}` : '',
    o.hasAttachment ? 'has:attachment' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Every connected inbox, every folder (or the one asked), newest first. Inboxes that fail are reported, not fatal. */
export async function searchMailboxes(opts: SearchOptions) {
  const list = (await accounts()).filter((a) => !opts.inbox || a.email.toLowerCase().includes(opts.inbox.toLowerCase()));
  const per = Math.max(4, Math.ceil(MAX_RESULTS / Math.max(1, list.length)) + 2);
  const failed: string[] = [];
  const results = await Promise.all(
    list.map((a) =>
      (a.provider === 'gmail' ? searchGmail(a, gmailQuery(opts), per) : a.provider === 'imap' ? searchImapFound(a, opts, per) : searchOutlook(a, opts, per)).catch((error) => {
        failed.push(`${a.email}: ${(error instanceof Error ? error.message : String(error)).slice(0, 120)}`);
        return [] as FoundEmail[];
      })
    )
  );
  const all = results.flat().sort((a, b) => b.date.localeCompare(a.date)).slice(0, MAX_RESULTS);
  // How many each mailbox had, empty ones included, so "Sanad's Sent is empty" can be said.
  const perInbox = list.map((a, i) => ({ inbox: a.email, found: failed.some((f) => f.startsWith(`${a.email}:`)) ? 'could not search' : results[i].length }));
  return { results: all, failed, perInbox };
}

// ---------- Open one: full text, the conversation, attachments ----------

export interface OpenedEmail {
  email: FoundEmail & { body: string };
  thread: { from: string; fromMe: boolean; date: string; text: string }[];
  attachments: { id: string; name: string; type: string; size: number }[];
  repliedByMe: boolean; // a message from him came after this one in the conversation
}

function gmailAttachments(part: gmail_v1.Schema$MessagePart | undefined, out: OpenedEmail['attachments'] = []) {
  if (!part) return out;
  // Gmail's attachment ids change on every read, so the MIME part id (stable) names it.
  if (part.filename && part.body?.attachmentId) out.push({ id: part.partId || part.body.attachmentId, name: part.filename, type: part.mimeType || '', size: part.body.size || 0 });
  for (const p of part.parts || []) gmailAttachments(p, out);
  return out;
}

export async function openMailboxEmail(ref: string): Promise<OpenedEmail> {
  const r = parseRef(ref);
  const account = r && (await accounts()).find((a) => a.id === r.accountId);
  if (!r || !account) throw new Error('That email’s inbox isn’t connected any more.');

  if (account.provider === 'imap') {
    const { parsed, mail, folder } = await readImap(account, r.messageId);
    const me = account.email.toLowerCase();
    const { turns } = await imapThread(account, mail.subject, mail.rfcMessageId).catch(() => ({ turns: [] as Awaited<ReturnType<typeof imapThread>>['turns'] }));
    const at = turns.findIndex((t) => t.messageId && t.messageId === mail.rfcMessageId);
    return {
      email: {
        ref,
        inbox: account.email,
        provider: 'imap',
        folder: folder.toUpperCase() === 'INBOX' ? 'Inbox' : folder,
        fromName: mail.fromName,
        fromEmail: mail.fromEmail,
        to: mail.to,
        subject: mail.subject,
        date: mail.receivedAt,
        snippet: mail.snippet,
        hasAttachments: parsed.attachments.length > 0,
        fromMe: mail.fromEmail === me,
        body: mail.body,
      },
      thread: turns.slice(-8).map(({ from: f, fromMe, date, text }) => ({ from: f, fromMe, date, text })),
      attachments: parsed.attachments.map((a, i) => ({ id: String(i), name: a.filename || `attachment-${i + 1}`, type: a.contentType || '', size: a.size || 0 })),
      repliedByMe: at >= 0 ? turns.slice(at + 1).some((t) => t.fromMe) : turns.some((t) => t.fromMe && t.inReplyTo === mail.rfcMessageId),
    };
  }

  if (account.provider === 'gmail') {
    const gmail = gmailClient(account.encrypted_refresh_token);
    const { data } = await gmail.users.messages.get({ userId: 'me', id: r.messageId, format: 'full' });
    const h = data.payload?.headers;
    const from = parseFrom(header(h, 'From'));
    const me = account.email.toLowerCase();
    const email: OpenedEmail['email'] = {
      ...{
        ref,
        inbox: account.email,
        provider: 'gmail' as const,
        folder: gmailFolderOf(data.labelIds || []),
        fromName: from.name,
        fromEmail: from.email,
        to: header(h, 'To'),
        subject: header(h, 'Subject') || '(no subject)',
        date: new Date(Number(data.internalDate) || Date.now()).toISOString(),
        snippet: data.snippet || '',
        hasAttachments: hasAttachment(data.payload),
        fromMe: from.email === me || (data.labelIds || []).includes('SENT'),
      },
      body: withoutQuote(bodyText(data.payload)).slice(0, 6000),
    };
    const thread = data.threadId ? (await gmail.users.threads.get({ userId: 'me', id: data.threadId, format: 'full' })).data.messages || [] : [];
    const turns = thread.map((m) => {
      const f = parseFrom(header(m.payload?.headers, 'From'));
      return { id: m.id, from: f.name || f.email, fromMe: f.email === me || (m.labelIds || []).includes('SENT'), date: new Date(Number(m.internalDate) || 0).toISOString(), text: withoutQuote(bodyText(m.payload)).slice(0, 1200) };
    });
    const at = turns.findIndex((t) => t.id === r.messageId);
    return {
      email,
      thread: turns.slice(-8).map(({ from: f, fromMe, date, text }) => ({ from: f, fromMe, date, text })),
      attachments: gmailAttachments(data.payload),
      repliedByMe: turns.slice(at + 1).some((t) => t.fromMe),
    };
  }

  const token = await outlookToken(account);
  const folders = await outlookFolders(token);
  const m = await graph<GraphMsg>(token, `/me/messages/${encodeURIComponent(r.messageId)}?$select=${SELECT},body`, { headers: { Prefer: 'outlook.body-content-type="text"' } });
  const conv = m.conversationId
    ? await graph<{ value: GraphMsg[] }>(
        token,
        `/me/messages?$filter=${encodeURIComponent(`conversationId eq '${m.conversationId.replace(/'/g, "''")}'`)}&$select=${SELECT},body&$top=20`,
        { headers: { Prefer: 'outlook.body-content-type="text"' } }
      ).catch(() => ({ value: [] as GraphMsg[] }))
    : { value: [] as GraphMsg[] };
  const me = account.email.toLowerCase();
  const turns = conv.value
    .map((x) => ({ x, date: x.receivedDateTime || x.sentDateTime || '' }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ x, date }) => {
      const f = (x.from?.emailAddress?.address || '').toLowerCase();
      return { id: x.id, from: x.from?.emailAddress?.name || f, fromMe: f === me, date, text: withoutQuote(x.body?.content || x.bodyPreview || '').slice(0, 1200) };
    });
  const at = turns.findIndex((t) => t.id === m.id);
  const files = m.hasAttachments
    ? await graph<{ value: { id: string; name: string; contentType: string; size: number }[] }>(token, `/me/messages/${encodeURIComponent(m.id)}/attachments?$select=id,name,contentType,size`).catch(() => ({ value: [] }))
    : { value: [] };
  return {
    email: { ...outlookFound(account, m, folders), body: withoutQuote(m.body?.content || m.bodyPreview || '').slice(0, 6000) },
    thread: turns.slice(-8).map(({ from: f, fromMe, date, text }) => ({ from: f, fromMe, date, text })),
    attachments: files.value.map((f) => ({ id: f.id, name: f.name, type: f.contentType, size: f.size })),
    repliedByMe: at >= 0 && turns.slice(at + 1).some((t) => t.fromMe),
  };
}

// ---------- Attachments ----------

/** Text of a PDF / text attachment (first ~8,000 characters). */
export async function attachmentText(ref: string, attachmentId: string) {
  const r = parseRef(ref);
  const account = r && (await accounts()).find((a) => a.id === r.accountId);
  if (!r || !account) throw new Error('That email’s inbox isn’t connected any more.');
  let bytes: Buffer;
  let name = 'attachment';
  let type = '';
  if (account.provider === 'imap') {
    const { parsed } = await readImap(account, r.messageId);
    const a = parsed.attachments[Number(attachmentId)];
    if (!a) throw new Error('That attachment wasn’t found in the email.');
    name = a.filename || name;
    type = a.contentType || '';
    bytes = a.content;
  } else if (account.provider === 'gmail') {
    const gmail = gmailClient(account.encrypted_refresh_token);
    const { data: msg } = await gmail.users.messages.get({ userId: 'me', id: r.messageId, format: 'full' });
    const findPart = (p?: gmail_v1.Schema$MessagePart): gmail_v1.Schema$MessagePart | null => {
      if (!p) return null;
      if (p.partId === attachmentId || p.body?.attachmentId === attachmentId) return p;
      for (const c of p.parts || []) {
        const f = findPart(c);
        if (f) return f;
      }
      return null;
    };
    const part = findPart(msg.payload);
    if (!part?.body?.attachmentId) throw new Error('That attachment wasn’t found in the email.');
    name = part.filename || name;
    type = part.mimeType || '';
    const { data } = await gmail.users.messages.attachments.get({ userId: 'me', messageId: r.messageId, id: part.body.attachmentId });
    bytes = Buffer.from((data.data || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  } else {
    const token = await outlookToken(account);
    const a = await graph<{ name: string; contentType: string; contentBytes?: string }>(token, `/me/messages/${encodeURIComponent(r.messageId)}/attachments/${encodeURIComponent(attachmentId)}`);
    name = a.name;
    type = a.contentType;
    bytes = Buffer.from(a.contentBytes || '', 'base64');
  }
  if (bytes.length > 15_000_000) throw new Error(`${name} is too big to read here.`);
  if (/pdf/i.test(type) || /\.pdf$/i.test(name)) {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const clean = String(text).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    return { name, pages: totalPages, text: clean.slice(0, 8000) || '(No text in this PDF: it may be a scanned image.)' };
  }
  if (/^text\/|csv|json|xml/i.test(type) || /\.(txt|csv|md|json|xml)$/i.test(name)) return { name, pages: 1, text: bytes.toString('utf8').slice(0, 8000) };
  return { name, pages: 0, text: `(${name} is a ${type || 'file'}; only PDF and text attachments can be read.)` };
}

// ---------- Waiting on me ----------

const AUTO_SUBJECT = /security code|verification code|verify your|one-time|otp|sign-?in|password|automatic reply|auto-?reply|out of office|we’ll be back|we'll be back|thank you for (your|contacting)|receipt|invoice #|order confirm/i;
const AUTOMATED = /no-?reply|noreply|notifications?@|notify@|alerts?@|news(letter)?@|updates?@|marketing@|mailer|digest@|bounce|do-not-reply|donotreply|support@|billing@|invoic|@(mail|email|messaging|t|em|news)\./i;

/** Emails from real people in the last `withinDays` that he hasn't answered for at least `days` (his Sent folder decides). */
export async function waitingOnMe(days = 2, withinDays = 21) {
  const list = await accounts();
  // All his own addresses (any connected inbox), so an email between his own accounts isn't "waiting".
  const mine = new Set(list.map((a) => a.email.toLowerCase()));
  const skip = (fromEmail: string, subject: string) => mine.has(fromEmail) || AUTOMATED.test(fromEmail) || AUTO_SUBJECT.test(subject);
  const cutoff = Date.now() - days * 86_400_000;
  const out: (FoundEmail & { waitingDays: number })[] = [];
  const failed: string[] = [];
  await Promise.all(
    list.map(async (account) => {
      try {
        const me = account.email.toLowerCase();
        if (account.provider === 'imap') {
          const rows = await imapInboxBetween(account, new Date(Date.now() - withinDays * 86_400_000), new Date(cutoff));
          const seenSubjects = new Set<string>();
          for (const row of rows.reverse()) {
            const subjectKey = row.subject.replace(/^((re|fwd?|fw)\s*:\s*)+/i, '').toLowerCase();
            if (row.fromEmail === me || skip(row.fromEmail, row.subject) || seenSubjects.has(subjectKey)) continue;
            seenSubjects.add(subjectKey);
            out.push({
              ref: `${account.id}:${row.key}`,
              inbox: account.email,
              provider: 'imap',
              folder: 'Inbox',
              fromName: row.fromName,
              fromEmail: row.fromEmail,
              to: row.to,
              subject: row.subject,
              date: row.date,
              snippet: '',
              hasAttachments: false,
              fromMe: false,
              waitingDays: Math.floor((Date.now() - Date.parse(row.date)) / 86_400_000),
            });
          }
        } else if (account.provider === 'gmail') {
          const gmail = gmailClient(account.encrypted_refresh_token);
          const q = `in:inbox newer_than:${withinDays}d older_than:${days}d -from:me -category:promotions -category:social -category:forums -category:updates`;
          const threads = (await gmail.users.threads.list({ userId: 'me', q, maxResults: 25 })).data.threads || [];
          for (const t of threads) {
            const msgs = (await gmail.users.threads.get({ userId: 'me', id: t.id!, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject'] })).data.messages || [];
            const last = msgs[msgs.length - 1];
            if (!last) continue;
            const f = parseFrom(header(last.payload?.headers, 'From'));
            if (f.email === me || (last.labelIds || []).includes('SENT') || skip(f.email, header(last.payload?.headers, 'Subject'))) continue;
            const at = Number(last.internalDate) || 0;
            if (at > cutoff) continue;
            out.push({
              ref: `${account.id}:${last.id}`,
              inbox: account.email,
              provider: 'gmail',
              folder: 'Inbox',
              fromName: f.name,
              fromEmail: f.email,
              to: header(last.payload?.headers, 'To'),
              subject: header(last.payload?.headers, 'Subject') || '(no subject)',
              date: new Date(at).toISOString(),
              snippet: last.snippet || '',
              hasAttachments: false,
              fromMe: false,
              waitingDays: Math.floor((Date.now() - at) / 86_400_000),
            });
          }
        } else {
          const token = await outlookToken(account);
          const since = new Date(Date.now() - withinDays * 86_400_000).toISOString();
          const until = new Date(cutoff).toISOString();
          const inbox = await graph<{ value: GraphMsg[] }>(
            token,
            `/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(`receivedDateTime ge ${since} and receivedDateTime le ${until}`)}&$orderby=receivedDateTime desc&$top=40&$select=${SELECT}`
          );
          const sent = await graph<{ value: GraphMsg[] }>(
            token,
            `/me/mailFolders/sentitems/messages?$filter=${encodeURIComponent(`sentDateTime ge ${since}`)}&$top=100&$select=conversationId,sentDateTime`
          ).catch(() => ({ value: [] as GraphMsg[] }));
          const lastSent = new Map<string, string>();
          for (const s of sent.value) if (s.conversationId && (s.sentDateTime || '') > (lastSent.get(s.conversationId) || '')) lastSent.set(s.conversationId, s.sentDateTime || '');
          const seen = new Set<string>();
          for (const m of inbox.value) {
            const f = (m.from?.emailAddress?.address || '').toLowerCase();
            if (!m.conversationId || seen.has(m.conversationId) || f === me || skip(f, m.subject || '')) continue;
            seen.add(m.conversationId);
            if ((lastSent.get(m.conversationId) || '') > (m.receivedDateTime || '')) continue; // he replied after it
            out.push({ ...outlookFound(account, m, new Map()), folder: 'Inbox', waitingDays: Math.floor((Date.now() - Date.parse(m.receivedDateTime || '')) / 86_400_000) });
          }
        }
      } catch (error) {
        failed.push(`${account.email}: ${(error instanceof Error ? error.message : String(error)).slice(0, 120)}`);
      }
    })
  );
  return { waiting: out.sort((a, b) => b.waitingDays - a.waitingDays).slice(0, 20), failed };
}

// ---------- Keep a found email in Anwarz (so reply / done / important work on it) ----------

/** The saved email for a mailbox message, creating it (as handled, so it doesn't land in "Needs me"). Returns its id. */
export async function saveFound(ref: string): Promise<string> {
  const r = parseRef(ref);
  const account = r && (await accounts()).find((a) => a.id === r.accountId);
  if (!r || !account) throw new Error('That email’s inbox isn’t connected any more.');
  const existing = await supabase.from('email_items').select('id').eq('account_id', account.id).eq('message_id', r.messageId).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;

  let mail: MailMessage;
  if (account.provider === 'gmail') mail = await readGmail(gmailClient(account.encrypted_refresh_token), r.messageId);
  else if (account.provider === 'imap') mail = (await readImap(account, r.messageId)).mail;
  else {
    const token = await outlookToken(account);
    const m = await graph<GraphMsg & { internetMessageId?: string }>(token, `/me/messages/${encodeURIComponent(r.messageId)}?$select=${SELECT},body,internetMessageId`, {
      headers: { Prefer: 'outlook.body-content-type="text"' },
    });
    mail = {
      messageId: m.id,
      threadId: m.conversationId || null,
      rfcMessageId: m.internetMessageId || null,
      references: null,
      fromName: m.from?.emailAddress?.name || '',
      fromEmail: (m.from?.emailAddress?.address || '').toLowerCase(),
      to: (m.toRecipients || []).map((x) => x.emailAddress?.address).filter(Boolean).join(', '),
      subject: m.subject || '(no subject)',
      receivedAt: m.receivedDateTime || new Date().toISOString(),
      snippet: m.bodyPreview || '',
      body: withoutQuote(m.body?.content || m.bodyPreview || '').slice(0, 6000),
      labels: [],
    };
  }
  const item: Partial<EmailItem> & { id: string } = {
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
    summary: mail.snippet.slice(0, 300) || null,
    reason: 'Found by the chat',
    urgent: false,
    status: 'done',
    updated_at: new Date().toISOString(),
  };
  const ins = await supabase.from('email_items').insert(item);
  if (ins.error) {
    const again = await supabase.from('email_items').select('id').eq('account_id', account.id).eq('message_id', r.messageId).maybeSingle();
    if (again.data?.id) return again.data.id as string;
    throw new Error(ins.error.message);
  }
  return item.id;
}
