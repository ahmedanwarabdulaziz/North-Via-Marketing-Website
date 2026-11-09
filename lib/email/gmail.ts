import { google, type gmail_v1 } from 'googleapis';
import { decryptString, encryptString } from '../encryption';

// Gmail through the site's existing Google OAuth client. Scopes: read + modify (to read new
// mail) and send (for replies Ahmed approved in Telegram). Each connected inbox keeps its own
// refresh token, encrypted like the other Google connections.

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

function oauth(redirectUri?: string) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}

export function gmailAuthUrl(redirectUri: string, state: string) {
  return oauth(redirectUri).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account', // a refresh token every time, and the account picker for adding several inboxes
    scope: GMAIL_SCOPES,
    state,
    include_granted_scopes: false,
  });
}

/** Exchanges the code; returns the inbox address and the encrypted refresh token. */
export async function completeGmailConnection(code: string, redirectUri: string) {
  const client = oauth(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error('Google gave no refresh token. Remove the app at myaccount.google.com/permissions and connect again.');
  client.setCredentials(tokens);
  const profile = await google.gmail({ version: 'v1', auth: client }).users.getProfile({ userId: 'me' });
  const email = profile.data.emailAddress?.toLowerCase();
  if (!email) throw new Error('Could not read the Gmail address.');
  return { email, encryptedRefreshToken: encryptString(tokens.refresh_token) };
}

export function gmailClient(encryptedRefreshToken: string) {
  const client = oauth();
  client.setCredentials({ refresh_token: decryptString(encryptedRefreshToken) });
  return google.gmail({ version: 'v1', auth: client });
}

export interface MailMessage {
  messageId: string;
  threadId: string | null;
  rfcMessageId: string | null;
  references: string | null;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  body: string;
  labels: string[];
}

function header(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function decode(data?: string | null) {
  return data ? Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') : '';
}

/** Plain text of a message: text/plain if there is one, otherwise HTML with the tags stripped. */
function bodyText(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) return '';
  const find = (p: gmail_v1.Schema$MessagePart, type: string): string | null => {
    if (p.mimeType === type && p.body?.data) return decode(p.body.data);
    for (const child of p.parts || []) {
      const found = find(child, type);
      if (found) return found;
    }
    return null;
  };
  const plain = find(part, 'text/plain');
  if (plain) return plain;
  const html = find(part, 'text/html') || '';
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/** Drops quoted earlier messages ("On … wrote:" and "> " lines) so only the new text is kept. */
function withoutQuote(text: string) {
  const cut = text.search(/\n(On .{5,200} wrote:|-----Original Message-----|From: .+\nSent: )/);
  const kept = cut > 0 ? text.slice(0, cut) : text;
  return kept
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseFrom(value: string) {
  const m = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>/);
  return m ? { name: m[1].trim() || m[2], email: m[2].trim().toLowerCase() } : { name: value.trim(), email: value.trim().toLowerCase() };
}

/** Inbox mail received after `afterSec` (unix seconds), newest first, skipping promotions and social. */
export async function listNewGmail(gmail: gmail_v1.Gmail, afterSec: number, max = 15): Promise<string[]> {
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `in:inbox after:${afterSec} -category:promotions -category:social -category:forums`,
    maxResults: max,
  });
  return (res.data.messages || []).map((m) => m.id!).filter(Boolean);
}

export async function readGmail(gmail: gmail_v1.Gmail, id: string): Promise<MailMessage> {
  const { data } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
  const headers = data.payload?.headers;
  const from = parseFrom(header(headers, 'From'));
  return {
    messageId: id,
    threadId: data.threadId || null,
    rfcMessageId: header(headers, 'Message-ID') || header(headers, 'Message-Id') || null,
    references: header(headers, 'References') || null,
    fromName: from.name,
    fromEmail: from.email,
    to: header(headers, 'To'),
    subject: header(headers, 'Subject') || '(no subject)',
    receivedAt: new Date(Number(data.internalDate) || Date.now()).toISOString(),
    snippet: (data.snippet || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    body: withoutQuote(bodyText(data.payload)).slice(0, 6000),
    labels: data.labelIds || [],
  };
}

function encodeHeader(value: string) {
  // Subjects with Arabic or emoji need RFC 2047 encoding.
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

/** Sends a reply in the same thread, from the connected inbox. */
export async function sendGmailReply(
  gmail: gmail_v1.Gmail,
  reply: { from: string; to: string; subject: string; text: string; threadId: string | null; inReplyTo: string | null; references: string | null }
) {
  const subject = /^re:/i.test(reply.subject) ? reply.subject : `Re: ${reply.subject}`;
  const lines = [
    `From: ${reply.from}`,
    `To: ${reply.to}`,
    `Subject: ${encodeHeader(subject)}`,
    ...(reply.inReplyTo ? [`In-Reply-To: ${reply.inReplyTo}`, `References: ${[reply.references, reply.inReplyTo].filter(Boolean).join(' ')}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(reply.text, 'utf8').toString('base64'),
  ];
  const raw = Buffer.from(lines.join('\r\n'), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw, threadId: reply.threadId || undefined } });
  return res.data.id || null;
}
