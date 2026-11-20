import { ImapFlow, type FetchMessageObject, type ListResponse, type SearchObject } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer';
import { decryptString } from '../encryption';
import type { MailMessage } from './gmail';

// "Other email (IMAP)": any mailbox reached with IMAP (reading) and SMTP (sending), e.g. Purelymail,
// Zoho, Hostinger or cPanel mail. The password (ideally an app password) is stored encrypted in
// email_accounts.encrypted_refresh_token; the servers in email_accounts.imap.
// A message is named "<folder>|<uidvalidity>|<uid>", which stays the same as long as the folder does.

export interface ImapSettings {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
}

/** Known providers: the address's domain → servers. Anything else is typed in. */
export const KNOWN_IMAP: Record<string, ImapSettings & { name: string }> = {
  purelymail: { name: 'Purelymail', imapHost: 'imap.purelymail.com', imapPort: 993, smtpHost: 'smtp.purelymail.com', smtpPort: 465, username: '' },
};

export interface ImapAccountLike {
  email: string;
  encrypted_refresh_token: string;
  imap?: ImapSettings | null;
}

const TIMEOUT = 20_000;

function settingsOf(account: ImapAccountLike): ImapSettings & { password: string } {
  const s = account.imap;
  if (!s?.imapHost || !s.smtpHost) throw new Error('This mailbox has no server details. Reconnect it.');
  return { ...s, username: s.username || account.email, password: decryptString(account.encrypted_refresh_token) };
}

function client(s: ImapSettings & { password: string }) {
  return new ImapFlow({
    host: s.imapHost,
    port: s.imapPort || 993,
    secure: (s.imapPort || 993) === 993,
    auth: { user: s.username, pass: s.password },
    logger: false,
    connectionTimeout: TIMEOUT,
    greetingTimeout: TIMEOUT,
    socketTimeout: 60_000,
  });
}

/** Opens a connection, runs `fn`, always logs out. */
export async function withImap<T>(account: ImapAccountLike, fn: (imap: ImapFlow) => Promise<T>): Promise<T> {
  const imap = client(settingsOf(account));
  await imap.connect();
  try {
    return await fn(imap);
  } finally {
    await imap.logout().catch(() => imap.close());
  }
}

function smtp(s: ImapSettings & { password: string }) {
  return nodemailer.createTransport({
    host: s.smtpHost,
    port: s.smtpPort || 465,
    secure: (s.smtpPort || 465) === 465,
    auth: { user: s.username, pass: s.password },
    connectionTimeout: TIMEOUT,
    greetingTimeout: TIMEOUT,
  });
}

/** Signs in to both servers (the "Connect" form). Throws a readable error. */
export async function testImapAccount(email: string, password: string, s: ImapSettings) {
  const full = { ...s, username: s.username || email, password };
  const imap = client(full);
  try {
    await imap.connect();
    await imap.logout();
  } catch (error) {
    const e = error as { message?: string; authenticationFailed?: boolean; responseText?: string; serverResponseCode?: string };
    const msg = [e.message, e.responseText].filter(Boolean).join(': ');
    const refused = e.authenticationFailed || e.serverResponseCode === 'AUTHENTICATIONFAILED' || /auth|login|credentials|password/i.test(msg);
    throw new Error(refused ? 'The email or password is wrong (the mailbox refused the sign-in).' : `Couldn’t reach the IMAP server ${s.imapHost}: ${msg.slice(0, 120)}`);
  }
  try {
    await smtp(full).verify();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(/auth|login|credentials|535/i.test(msg) ? 'Reading works, but sending was refused (SMTP sign-in). Check the password.' : `Couldn’t reach the SMTP server ${s.smtpHost}: ${msg.slice(0, 120)}`);
  }
}

// ---------- Parsing ----------

const keyOf = (folder: string, uidValidity: bigint | number | string, uid: number) => `${folder}|${uidValidity}|${uid}`;

export function parseKey(key: string) {
  const parts = key.split('|');
  if (parts.length < 3) return null;
  const uid = Number(parts.pop());
  const uidValidity = parts.pop()!;
  return { folder: parts.join('|'), uidValidity, uid };
}

function addressOf(v: ParsedMail['from']) {
  const first = Array.isArray(v) ? v[0]?.value[0] : v?.value[0];
  return { name: first?.name || first?.address || '', email: (first?.address || '').toLowerCase() };
}

const listAddresses = (v: ParsedMail['to']) =>
  (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((a) => a.value.map((x) => x.address))
    .filter(Boolean)
    .join(', ');

const quoteCut = (text: string) => {
  const cut = text.search(/\n(On .{5,200} wrote:|-----Original Message-----|From: .+\n(Sent|Date): )/);
  return (cut > 0 ? text.slice(0, cut) : text)
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

function bodyOf(mail: ParsedMail) {
  if (mail.text) return mail.text;
  return (mail.html || '')
    .toString()
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function toMail(key: string, mail: ParsedMail, received: Date | undefined): MailMessage {
  const from = addressOf(mail.from);
  const refs = Array.isArray(mail.references) ? mail.references : mail.references ? [mail.references] : [];
  const body = quoteCut(bodyOf(mail)).slice(0, 6000);
  return {
    messageId: key,
    threadId: refs[0] || mail.messageId || null,
    rfcMessageId: mail.messageId || null,
    references: refs.join(' ') || null,
    fromName: from.name,
    fromEmail: from.email,
    to: listAddresses(mail.to),
    subject: mail.subject || '(no subject)',
    receivedAt: (received || mail.date || new Date()).toISOString(),
    snippet: body.replace(/\s+/g, ' ').slice(0, 200),
    body,
    labels: [],
  };
}

// ---------- The 5-minute check: new Inbox mail ----------

/** Inbox mail received after `sinceMs`, oldest first (at most `max`). */
export async function listNewImap(account: ImapAccountLike, sinceMs: number, max = 10): Promise<MailMessage[]> {
  return withImap(account, async (imap) => {
    const lock = await imap.getMailboxLock('INBOX');
    try {
      const box = imap.mailbox;
      const validity = box ? box.uidValidity : 0;
      const uids = (await imap.search({ since: new Date(sinceMs - 86_400_000) }, { uid: true })) || [];
      const recent = uids.slice(-40);
      const out: MailMessage[] = [];
      if (!recent.length) return out;
      for await (const m of imap.fetch(recent, { uid: true, internalDate: true, source: true }, { uid: true })) {
        const received = m.internalDate ? new Date(m.internalDate) : undefined;
        if (received && received.getTime() < sinceMs) continue;
        if (!m.source) continue;
        out.push(toMail(keyOf('INBOX', validity, m.uid), await simpleParser(m.source), received));
      }
      return out.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)).slice(-max);
    } finally {
      lock.release();
    }
  });
}

// ---------- Sending (replies and new emails) ----------

async function sentFolder(imap: ImapFlow) {
  const boxes = await imap.list();
  return (boxes.find((b) => b.specialUse === '\\Sent') || boxes.find((b) => /^(sent|sent items|sent mail|sent messages)$/i.test(b.name)))?.path || null;
}

/** Sends through the mailbox's SMTP and files a copy in its Sent folder (many servers don't do that themselves). */
export async function sendImapMail(
  account: ImapAccountLike,
  mail: { to: string; subject: string; text: string; inReplyTo?: string | null; references?: string | null }
) {
  const s = settingsOf(account);
  const raw = await new MailComposer({
    from: account.email,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    ...(mail.inReplyTo ? { inReplyTo: mail.inReplyTo, references: [mail.references, mail.inReplyTo].filter(Boolean).join(' ') } : {}),
  })
    .compile()
    .build();
  await smtp(s).sendMail({ envelope: { from: account.email, to: mail.to.split(',').map((x) => x.trim()).filter(Boolean) }, raw });
  await withImap(account, async (imap) => {
    const sent = await sentFolder(imap);
    if (sent) await imap.append(sent, raw, ['\\Seen']);
  }).catch((error) => console.error('Copy to Sent failed:', error instanceof Error ? error.message : error));
}

// ---------- Live search, open, attachments, waiting-on-me (lib/email/live.ts) ----------

export type ImapFolder = 'any' | 'inbox' | 'sent' | 'spam' | 'archive' | 'drafts' | 'trash';

const SPECIAL: Record<Exclude<ImapFolder, 'any' | 'inbox'>, string> = { sent: '\\Sent', spam: '\\Junk', archive: '\\Archive', drafts: '\\Drafts', trash: '\\Trash' };

function folderName(b: ListResponse) {
  if (b.path.toUpperCase() === 'INBOX') return 'Inbox';
  const special: Record<string, string> = { '\\Sent': 'Sent', '\\Junk': 'Spam', '\\Archive': 'Archive', '\\Drafts': 'Drafts', '\\Trash': 'Trash' };
  return (b.specialUse && special[b.specialUse]) || b.name;
}

async function foldersFor(imap: ImapFlow, folder: ImapFolder) {
  const boxes = (await imap.list()).filter((b) => !b.flags?.has('\\Noselect'));
  if (folder === 'inbox') return boxes.filter((b) => b.path.toUpperCase() === 'INBOX');
  if (folder !== 'any') return boxes.filter((b) => b.specialUse === SPECIAL[folder]);
  // Every folder, Inbox and Sent first; at most 12 so a search stays quick.
  const rank = (b: ListResponse) => (b.path.toUpperCase() === 'INBOX' ? 0 : b.specialUse === '\\Sent' ? 1 : b.specialUse ? 2 : 3);
  return boxes.sort((a, b) => rank(a) - rank(b)).slice(0, 12);
}

export interface ImapFound {
  key: string;
  folder: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  hasAttachments: boolean;
  fromMe: boolean;
}

const hasParts = (m: FetchMessageObject) => {
  const walk = (p: FetchMessageObject['bodyStructure']): boolean =>
    Boolean(p && ((p.disposition === 'attachment' || (p.dispositionParameters?.filename && p.disposition !== 'inline')) || (p.childNodes || []).some(walk)));
  return walk(m.bodyStructure);
};

export async function searchImap(
  account: ImapAccountLike,
  o: { text?: string; from?: string; to?: string; subject?: string; folder?: ImapFolder; after?: string; before?: string; hasAttachment?: boolean },
  max: number
): Promise<ImapFound[]> {
  const me = account.email.toLowerCase();
  return withImap(account, async (imap) => {
    const out: ImapFound[] = [];
    const query: SearchObject = {
      ...(o.text ? { text: o.text } : {}),
      ...(o.from ? { from: o.from } : {}),
      ...(o.to ? { to: o.to } : {}),
      ...(o.subject ? { subject: o.subject } : {}),
      ...(o.after ? { since: o.after } : {}),
      ...(o.before ? { before: o.before } : {}),
    };
    if (!Object.keys(query).length) query.all = true;
    for (const box of await foldersFor(imap, o.folder || 'any')) {
      const lock = await imap.getMailboxLock(box.path).catch(() => null);
      if (!lock) continue;
      try {
        const validity = imap.mailbox ? imap.mailbox.uidValidity : 0;
        const uids = ((await imap.search(query, { uid: true })) || []).slice(-max);
        if (!uids.length) continue;
        for await (const m of imap.fetch(uids, { uid: true, envelope: true, internalDate: true, bodyStructure: true }, { uid: true })) {
          const from = m.envelope?.from?.[0];
          const fromEmail = (from?.address || '').toLowerCase();
          const found: ImapFound = {
            key: keyOf(box.path, validity, m.uid),
            folder: folderName(box),
            fromName: from?.name || fromEmail,
            fromEmail,
            to: (m.envelope?.to || []).map((t) => t.address).filter(Boolean).join(', '),
            subject: m.envelope?.subject || '(no subject)',
            date: new Date(m.internalDate || m.envelope?.date || Date.now()).toISOString(),
            hasAttachments: hasParts(m),
            fromMe: fromEmail === me,
          };
          if (!o.hasAttachment || found.hasAttachments) out.push(found);
        }
      } finally {
        lock.release();
      }
    }
    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);
  });
}

/** One message, parsed in full (with attachments), and where it is. */
export async function readImap(account: ImapAccountLike, key: string) {
  const k = parseKey(key);
  if (!k) throw new Error('That email reference isn’t valid.');
  return withImap(account, async (imap) => {
    const lock = await imap.getMailboxLock(k.folder);
    try {
      if (imap.mailbox && String(imap.mailbox.uidValidity) !== k.uidValidity) throw new Error('That folder changed since; search again.');
      const m = await imap.fetchOne(String(k.uid), { uid: true, source: true, internalDate: true }, { uid: true });
      if (!m || !m.source) throw new Error('That email isn’t there any more.');
      const parsed = await simpleParser(m.source);
      return { parsed, mail: toMail(key, parsed, m.internalDate ? new Date(m.internalDate) : undefined), folder: k.folder };
    } finally {
      lock.release();
    }
  });
}

/** The conversation around a message: Inbox and Sent mail with the same subject, oldest first. */
export async function imapThread(account: ImapAccountLike, subject: string, messageId: string | null) {
  const base = subject.replace(/^((re|fwd?|fw)\s*:\s*)+/i, '').trim().slice(0, 80);
  if (!base) return { turns: [] as { from: string; fromMe: boolean; date: string; text: string; messageId: string | null; inReplyTo: string | null }[] };
  const me = account.email.toLowerCase();
  return withImap(account, async (imap) => {
    const turns: { from: string; fromMe: boolean; date: string; text: string; messageId: string | null; inReplyTo: string | null }[] = [];
    const boxes = (await imap.list()).filter((b) => b.path.toUpperCase() === 'INBOX' || b.specialUse === '\\Sent');
    for (const box of boxes) {
      const lock = await imap.getMailboxLock(box.path).catch(() => null);
      if (!lock) continue;
      try {
        const uids = ((await imap.search({ subject: base }, { uid: true })) || []).slice(-8);
        if (!uids.length) continue;
        for await (const m of imap.fetch(uids, { uid: true, source: true, internalDate: true }, { uid: true })) {
          if (!m.source) continue;
          const p = await simpleParser(m.source);
          const f = addressOf(p.from);
          turns.push({
            from: f.name || f.email,
            fromMe: f.email === me,
            date: (m.internalDate ? new Date(m.internalDate) : p.date || new Date()).toISOString(),
            text: quoteCut(bodyOf(p)).slice(0, 1200),
            messageId: p.messageId || null,
            inReplyTo: p.inReplyTo || null,
          });
        }
      } finally {
        lock.release();
      }
    }
    turns.sort((a, b) => a.date.localeCompare(b.date));
    const seen = new Set<string>();
    return { turns: turns.filter((t) => (t.messageId ? (seen.has(t.messageId) ? false : (seen.add(t.messageId), true)) : true)), messageId };
  });
}

/** Inbox mail from others in the window, for "waiting on me" (live.ts decides who is a real person). */
export async function imapInboxBetween(account: ImapAccountLike, since: Date, until: Date) {
  return withImap(account, async (imap) => {
    const lock = await imap.getMailboxLock('INBOX');
    const validity = imap.mailbox ? imap.mailbox.uidValidity : 0;
    const rows: { key: string; fromName: string; fromEmail: string; to: string; subject: string; date: string; messageId: string | null }[] = [];
    try {
      const uids = ((await imap.search({ since, before: new Date(until.getTime() + 86_400_000) }, { uid: true })) || []).slice(-40);
      if (uids.length) {
        for await (const m of imap.fetch(uids, { uid: true, envelope: true, internalDate: true }, { uid: true })) {
          const raw = m.internalDate || m.envelope?.date;
          const at = raw ? new Date(raw) : null;
          if (!at || at > until) continue;
          const from = m.envelope?.from?.[0];
          rows.push({
            key: keyOf('INBOX', validity, m.uid),
            fromName: from?.name || from?.address || '',
            fromEmail: (from?.address || '').toLowerCase(),
            to: (m.envelope?.to || []).map((t) => t.address).filter(Boolean).join(', '),
            subject: m.envelope?.subject || '(no subject)',
            date: at.toISOString(),
            messageId: m.envelope?.messageId || null,
          });
        }
      }
    } finally {
      lock.release();
    }
    // Which of them he answered: a Sent message pointing at it (In-Reply-To).
    const sent = await sentFolder(imap);
    const answered = new Set<string>();
    if (sent && rows.length) {
      const l2 = await imap.getMailboxLock(sent).catch(() => null);
      if (l2) {
        try {
          const uids = ((await imap.search({ since }, { uid: true })) || []).slice(-150);
          if (uids.length) {
            for await (const m of imap.fetch(uids, { uid: true, envelope: true }, { uid: true })) if (m.envelope?.inReplyTo) answered.add(m.envelope.inReplyTo);
          }
        } finally {
          l2.release();
        }
      }
    }
    return rows.filter((r) => !(r.messageId && answered.has(r.messageId)));
  });
}
