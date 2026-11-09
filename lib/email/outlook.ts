import { decryptString, encryptString } from '../encryption';
import type { MailMessage } from './gmail';

// Outlook / Microsoft 365 mailboxes through Microsoft Graph (official OAuth, delegated access).
// Env: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET (an Azure app registration that allows
// work and personal accounts). Microsoft rotates refresh tokens: every refresh returns a new
// one, which the caller saves.

const AUTH = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const GRAPH = 'https://graph.microsoft.com/v1.0';
export const OUTLOOK_SCOPES = ['offline_access', 'openid', 'email', 'User.Read', 'Mail.ReadWrite', 'Mail.Send'];

export function outlookRedirectUri(requestUrl?: string) {
  if (requestUrl) {
    const url = new URL(requestUrl);
    if (url.protocol === 'https:' || url.hostname === 'localhost') return `${url.origin}/api/microsoft/callback`;
  }
  return 'https://www.northviamarketing.com/api/microsoft/callback';
}

export function outlookAuthUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: OUTLOOK_SCOPES.join(' '),
    state,
    prompt: 'select_account',
  });
  return `${AUTH}/authorize?${q}`;
}

async function token(body: Record<string, string>) {
  const res = await fetch(`${AUTH}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.MICROSOFT_CLIENT_ID || '', client_secret: process.env.MICROSOFT_CLIENT_SECRET || '', ...body }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(`Microsoft login: ${data.error_description?.split('\r\n')[0] || data.error || res.status}`);
  return data as { access_token: string; refresh_token?: string };
}

async function graph<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', Prefer: 'outlook.body-content-type="text"', ...(init.headers || {}) },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 202 || res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Outlook: ${(data as { error?: { message?: string } }).error?.message || res.status}`);
  return data as T;
}

/** Exchanges the code; returns the mailbox address and the encrypted refresh token. */
export async function completeOutlookConnection(code: string, redirectUri: string) {
  const t = await token({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, scope: OUTLOOK_SCOPES.join(' ') });
  if (!t.refresh_token) throw new Error('Microsoft gave no refresh token (offline_access missing).');
  const me = await graph<{ mail?: string; userPrincipalName?: string }>(t.access_token, '/me?$select=mail,userPrincipalName');
  const email = (me.mail || me.userPrincipalName || '').toLowerCase();
  if (!email) throw new Error('Could not read the Outlook address.');
  return { email, encryptedRefreshToken: encryptString(t.refresh_token) };
}

/** A fresh access token, and the rotated refresh token to save (encrypted). */
export async function outlookSession(encryptedRefreshToken: string) {
  const t = await token({ grant_type: 'refresh_token', refresh_token: decryptString(encryptedRefreshToken), scope: OUTLOOK_SCOPES.join(' ') });
  return { accessToken: t.access_token, encryptedRefreshToken: t.refresh_token ? encryptString(t.refresh_token) : null };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
  inferenceClassification?: 'focused' | 'other';
}

function withoutQuote(text: string) {
  const cut = text.search(/\n(On .{5,200} wrote:|-----Original Message-----|From: .+\n(Sent|Date): |________________________________)/);
  return (cut > 0 ? text.slice(0, cut) : text).replace(/\n{3,}/g, '\n\n').trim();
}

/** Inbox mail received after `sinceMs`, oldest first. "Other" (non-Focused) mail is skipped. */
export async function listNewOutlook(accessToken: string, sinceMs: number, max = 10): Promise<MailMessage[]> {
  const since = new Date(sinceMs).toISOString();
  const q = new URLSearchParams({
    $filter: `receivedDateTime ge ${since}`,
    $orderby: 'receivedDateTime desc',
    $top: String(max),
    $select: 'id,conversationId,internetMessageId,subject,receivedDateTime,bodyPreview,body,from,toRecipients,inferenceClassification',
  });
  const data = await graph<{ value: GraphMessage[] }>(accessToken, `/me/mailFolders/inbox/messages?${q}`);
  return (data.value || [])
    .filter((m) => m.inferenceClassification !== 'other')
    .reverse()
    .map((m) => ({
      messageId: m.id,
      threadId: m.conversationId || null,
      rfcMessageId: m.internetMessageId || null,
      references: null,
      fromName: m.from?.emailAddress?.name || m.from?.emailAddress?.address || '',
      fromEmail: (m.from?.emailAddress?.address || '').toLowerCase(),
      to: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean).join(', '),
      subject: m.subject || '(no subject)',
      receivedAt: m.receivedDateTime || new Date().toISOString(),
      snippet: m.bodyPreview || '',
      body: withoutQuote(m.body?.content || m.bodyPreview || '').slice(0, 6000),
      labels: [],
    }));
}

/** Replies in the same conversation (Graph's reply keeps the thread and quotes the original). */
export async function sendOutlookReply(accessToken: string, messageId: string, text: string) {
  await graph(accessToken, `/me/messages/${encodeURIComponent(messageId)}/reply`, { method: 'POST', body: JSON.stringify({ comment: text }) });
}
