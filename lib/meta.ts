import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { addDoc, deleteDocs, getDoc, listDocs, setDoc, setDocs, updateDoc } from './data/store';
import { decryptString, encryptString } from './encryption';
import type { MetaConnection, SocialAccount } from '@/types/database';

// Facebook & Instagram through Meta's Graph API ("Instagram API with Facebook Login").
// One login (the admin's, or a client's via a link) gives Page tokens for every Page
// it manages; each Page and its linked Instagram account is then assigned to a client.
// Page tokens obtained from a long-lived user token don't expire.

export const META_CONNECTIONS = 'meta_connections' as const;
export const SOCIAL_ACCOUNTS = 'social_accounts' as const;

const GRAPH_VERSION = 'v25.0';
// META_GRAPH_BASE is only for pointing tests at a mock server.
const GRAPH = () => process.env.META_GRAPH_BASE || `https://graph.facebook.com/${GRAPH_VERSION}`;
const DIALOG = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;

export const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_read_user_content',
  'pages_manage_engagement', // reply to and hide Facebook comments
  'read_insights',
  'instagram_basic',
  'instagram_manage_comments', // reply to and hide Instagram comments
  'instagram_manage_insights',
  'business_management', // Pages owned through a business portfolio
  'ads_read', // Facebook Ads numbers on the client page and in Telegram
];

const STATE_PURPOSE = 'meta_connect';
const stateKey = new TextEncoder().encode(process.env.SESSION_SECRET);
type ConnectVia = MetaConnection['connectedVia'];

export function metaConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function redirectUri() {
  return process.env.META_REDIRECT_URI || 'https://www.northviamarketing.com/api/meta/callback';
}

// ---------- Graph requests ----------

export class MetaApiError extends Error {
  constructor(message: string, public code?: number, public status?: number) {
    super(message);
  }
  /** The token was revoked or expired; the connection needs to be redone. */
  get needsReconnect() {
    return this.code === 190 || this.code === 102 || this.status === 401;
  }
}

/** Proves to Meta that a call comes from our server (recommended for server-side tokens). */
function appSecretProof(token: string) {
  return crypto.createHmac('sha256', process.env.META_APP_SECRET || '').update(token).digest('hex');
}

export async function graph<T>(
  path: string,
  options: { token?: string; params?: Record<string, string | number | undefined>; method?: 'GET' | 'POST' | 'DELETE'; body?: Record<string, unknown> } = {}
): Promise<T> {
  const url = new URL(`${GRAPH()}/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(options.params || {})) if (v !== undefined) url.searchParams.set(k, String(v));
  if (options.token) {
    url.searchParams.set('access_token', options.token);
    url.searchParams.set('appsecret_proof', appSecretProof(options.token));
  }
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
  if (!res.ok || data.error) {
    throw new MetaApiError(data.error?.message || `Meta API error ${res.status}`, data.error?.code, res.status);
  }
  return data;
}

/** Follows `paging.next` cursors up to `maxPages`. */
async function graphAll<T>(path: string, token: string, params: Record<string, string | number>, maxPages = 5) {
  const items: T[] = [];
  let after: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await graph<{ data?: T[]; paging?: { cursors?: { after?: string }; next?: string } }>(path, { token, params: { ...params, after } });
    items.push(...(page.data || []));
    after = page.paging?.next ? page.paging.cursors?.after : undefined;
    if (!after) break;
  }
  return items;
}

// ---------- Connecting ----------

/** Signed token naming who a Meta login is for. Client links last 7 days; admin ones 30 minutes. */
export async function createMetaConnectToken(clientId: string, via: ConnectVia) {
  return new SignJWT({ cid: clientId, via, purpose: STATE_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(via === 'client_link' ? '7d' : '30m')
    .sign(stateKey);
}

export async function verifyMetaConnectToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, stateKey, { algorithms: ['HS256'] });
    if (payload.purpose !== STATE_PURPOSE || typeof payload.cid !== 'string') return null;
    return { clientId: payload.cid, via: (payload.via === 'client_link' ? 'client_link' : 'admin') as ConnectVia };
  } catch {
    return null;
  }
}

export function getMetaAuthUrl(state: string) {
  const url = new URL(DIALOG);
  url.searchParams.set('client_id', process.env.META_APP_ID || '');
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  // Facebook Login for Business uses a saved configuration; plain scopes otherwise.
  if (process.env.META_LOGIN_CONFIG_ID) url.searchParams.set('config_id', process.env.META_LOGIN_CONFIG_ID);
  else url.searchParams.set('scope', META_SCOPES.join(','));
  return url.toString();
}

interface PageEntry {
  id: string;
  name: string;
  access_token?: string;
  instagram_business_account?: { id: string; username?: string };
}

/** Exchanges the login code, stores the connection, and records every Page it can manage. */
export async function completeMetaConnection(code: string, clientId: string, via: ConnectVia) {
  const appId = process.env.META_APP_ID || '';
  const secret = process.env.META_APP_SECRET || '';
  const short = await graph<{ access_token: string }>('oauth/access_token', {
    params: { client_id: appId, client_secret: secret, redirect_uri: redirectUri(), code },
  });
  const long = await graph<{ access_token: string; expires_in?: number }>('oauth/access_token', {
    params: { grant_type: 'fb_exchange_token', client_id: appId, client_secret: secret, fb_exchange_token: short.access_token },
  });
  const token = long.access_token;

  const me = await graph<{ id: string; name: string }>('me', { token, params: { fields: 'id,name' } });
  const perms = await graph<{ data: Array<{ permission: string; status: string }> }>('me/permissions', { token });
  const scopes = perms.data.filter((p) => p.status === 'granted').map((p) => p.permission);
  if (!scopes.includes('pages_show_list')) throw new Error('Page access was not granted. Please try again and allow access to the Pages.');

  const pages = await graphAll<PageEntry>('me/accounts', token, {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: 100,
  });
  const usable = pages.filter((p) => p.access_token);
  if (!usable.length) throw new Error('No Facebook Pages were shared. Make sure at least one Page is selected during login.');

  const now = new Date().toISOString();
  const connectionId = via === 'admin' ? 'admin' : `client:${clientId}`;
  const existing = await getDoc<MetaConnection>(META_CONNECTIONS, connectionId);
  const connection: MetaConnection = {
    connectedVia: via,
    clientId: via === 'client_link' ? clientId : undefined,
    metaUserId: me.id,
    metaUserName: me.name,
    encryptedUserToken: encryptString(token),
    tokenExpiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : undefined,
    scopes,
    status: 'connected',
    connectedAt: existing?.connectedAt || now,
    updatedAt: now,
  };
  await setDoc(META_CONNECTIONS, connectionId, connection);

  // Keep existing client assignments; a client's own link assigns its unassigned Pages to it.
  const stored = await listDocs<SocialAccount>(SOCIAL_ACCOUNTS, { where: { id: usable.map((p) => p.id) } });
  const byId = new Map(stored.map((a) => [a.id, a]));
  await setDocs(
    SOCIAL_ACCOUNTS,
    usable.map((page) => {
      const prev = byId.get(page.id);
      const assign = via === 'client_link' && !prev?.clientId;
      return {
        id: page.id,
        data: {
          connectionId,
          pageName: page.name,
          encryptedPageToken: encryptString(page.access_token!),
          igUserId: page.instagram_business_account?.id ?? null,
          igUsername: page.instagram_business_account?.username ?? null,
          lastError: null,
          updatedAt: now,
          ...(assign ? { clientId, linked: true, linkedAt: now } : {}),
          ...(prev ? {} : assign ? {} : { linked: false }),
        },
      };
    }),
    { merge: true }
  );
  await logAudit('meta.connected', { connectionId, clientId, via, pages: usable.length });
  return { pages: usable.length };
}

// ---------- Choosing a client's Pages ----------

export interface AccountChoice {
  id: string;
  pageName: string;
  igUsername?: string;
  selected: boolean;
  takenByClientId?: string;
}

export async function listClientAccounts(clientId: string) {
  const accounts = await listDocs<SocialAccount>(SOCIAL_ACCOUNTS, { where: { clientId } });
  return accounts.filter((a) => a.linked).sort((a, b) => a.pageName.localeCompare(b.pageName));
}

export async function listLinkedAccounts() {
  return listDocs<SocialAccount>(SOCIAL_ACCOUNTS, { where: { linked: true } });
}

/** Every Page any connection can manage, marked with who it's assigned to. */
export async function previewClientAccounts(clientId: string): Promise<AccountChoice[]> {
  const all = await listDocs<SocialAccount>(SOCIAL_ACCOUNTS);
  return all
    .map((a) => ({
      id: a.id,
      pageName: a.pageName,
      igUsername: a.igUsername,
      selected: a.clientId === clientId && a.linked,
      takenByClientId: a.clientId && a.clientId !== clientId && a.linked ? a.clientId : undefined,
    }))
    .sort((a, b) => a.pageName.localeCompare(b.pageName));
}

export async function saveClientAccountSelection(clientId: string, selectedIds: string[]) {
  const choices = await previewClientAccounts(clientId);
  const wanted = new Set(selectedIds);
  const now = new Date().toISOString();
  const writes: Array<{ id: string; data: object }> = [];
  for (const c of choices) {
    if (wanted.has(c.id) && !c.takenByClientId && !c.selected) writes.push({ id: c.id, data: { clientId, linked: true, linkedAt: now, updatedAt: now } });
    else if (!wanted.has(c.id) && c.selected) writes.push({ id: c.id, data: { clientId: null, linked: false, updatedAt: now } });
  }
  await setDocs(SOCIAL_ACCOUNTS, writes, { merge: true });
  return choices.filter((c) => (wanted.has(c.id) && !c.takenByClientId)).length;
}

/** Stops monitoring this client's Pages; a client's own login is revoked and removed. */
export async function disconnectClientSocial(clientId: string) {
  const accounts = await listDocs<SocialAccount>(SOCIAL_ACCOUNTS, { where: { clientId } });
  const now = new Date().toISOString();
  await setDocs(SOCIAL_ACCOUNTS, accounts.map((a) => ({ id: a.id, data: { clientId: null, linked: false, updatedAt: now } })), { merge: true });

  const own = await getDoc<MetaConnection>(META_CONNECTIONS, `client:${clientId}`);
  if (own) {
    try {
      await graph('me/permissions', { token: decryptString(own.encryptedUserToken), method: 'DELETE' });
    } catch (error) {
      console.warn('Meta permission revoke failed (continuing with local removal):', error instanceof Error ? error.message : error);
    }
    await deleteDocs(META_CONNECTIONS, { id: `client:${clientId}` });
  }
  await logAudit('meta.disconnected', { clientId });
}

export async function getMetaConnections() {
  return listDocs<MetaConnection>(META_CONNECTIONS);
}

export async function markAccountError(accountId: string, message: string | null) {
  await updateDoc(SOCIAL_ACCOUNTS, accountId, { lastError: message, updatedAt: new Date().toISOString() });
}

export function pageToken(account: SocialAccount) {
  return decryptString(account.encryptedPageToken);
}

// ---------- Reading ----------

export async function fetchFollowerCounts(account: SocialAccount & { id: string }) {
  const page = await graph<{ followers_count?: number; fan_count?: number; instagram_business_account?: { id: string; username?: string; followers_count?: number } }>(
    account.id,
    { token: pageToken(account), params: { fields: 'followers_count,fan_count,instagram_business_account{id,username,followers_count}' } }
  );
  return {
    fbFollowers: page.followers_count ?? page.fan_count,
    igFollowers: page.instagram_business_account?.followers_count,
    igUserId: page.instagram_business_account?.id,
    igUsername: page.instagram_business_account?.username,
  };
}

export interface FbPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  comments?: { summary?: { total_count?: number } };
  reactions?: { summary?: { total_count?: number } };
}

/** Posts published in the last `days` days (newest first), with like and comment totals. */
export async function fetchFacebookPosts(account: SocialAccount & { id: string }, days = 62) {
  const res = await graph<{ data: FbPost[] }>(`${account.id}/published_posts`, {
    token: pageToken(account),
    params: {
      fields: 'id,message,created_time,permalink_url,comments.summary(true).limit(0),reactions.summary(true).limit(0)',
      since: Math.floor((Date.now() - days * 86_400_000) / 1000),
      limit: 100,
    },
  });
  return res.data || [];
}

/** Facebook's "reach" is now unique media views; null when Meta doesn't return it. */
export async function fetchFacebookPostViews(account: SocialAccount, postId: string) {
  try {
    const res = await graph<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(`${postId}/insights`, {
      token: pageToken(account),
      params: { metric: 'post_total_media_view_unique' },
    });
    return res.data?.[0]?.values?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

export interface IgMedia {
  id: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
}

/** Media from the last `days` days (newest first). */
export async function fetchInstagramMedia(account: SocialAccount, days = 62) {
  if (!account.igUserId) return [];
  const res = await graph<{ data: IgMedia[] }>(`${account.igUserId}/media`, {
    token: pageToken(account),
    params: { fields: 'id,caption,timestamp,permalink,like_count,comments_count', limit: 100 },
  });
  const since = Date.now() - days * 86_400_000;
  return (res.data || []).filter((m) => new Date(m.timestamp).getTime() >= since);
}

export async function fetchInstagramInsights(account: SocialAccount, mediaId: string) {
  // `views` isn't available for every media type; fall back to reach alone.
  for (const metric of ['reach,views', 'reach']) {
    try {
      const res = await graph<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(`${mediaId}/insights`, {
        token: pageToken(account),
        params: { metric },
      });
      const value = (name: string) => res.data?.find((d) => d.name === name)?.values?.[0]?.value ?? null;
      return { reach: value('reach'), views: value('views') };
    } catch {
      // try the next metric set
    }
  }
  return { reach: null, views: null };
}

export interface FbComment {
  id: string;
  message?: string;
  created_time: string;
  from?: { id: string; name?: string };
  is_hidden?: boolean;
  comments?: { data?: Array<{ from?: { id: string } }> };
}

export async function fetchFacebookComments(account: SocialAccount, postId: string) {
  const res = await graph<{ data: FbComment[] }>(`${postId}/comments`, {
    token: pageToken(account),
    params: {
      fields: 'id,message,created_time,from{id,name},is_hidden,comments.limit(25){from{id}}',
      filter: 'toplevel',
      order: 'reverse_chronological',
      limit: 50,
    },
  });
  return res.data || [];
}

export interface IgComment {
  id: string;
  text?: string;
  timestamp: string;
  username?: string;
  from?: { id: string; username?: string };
  hidden?: boolean;
  replies?: { data?: Array<{ username?: string }> };
}

export async function fetchInstagramComments(account: SocialAccount, mediaId: string) {
  const res = await graph<{ data: IgComment[] }>(`${mediaId}/comments`, {
    token: pageToken(account),
    params: { fields: 'id,text,timestamp,username,from{id,username},hidden,replies.limit(25){username}', limit: 50 },
  });
  return res.data || [];
}

// ---------- Acting (only after an explicit approval) ----------

/** Publishes a public reply under a comment. */
export async function publishCommentReply(account: SocialAccount, platform: 'facebook' | 'instagram', commentId: string, message: string) {
  const path = platform === 'facebook' ? `${commentId}/comments` : `${commentId}/replies`;
  const res = await graph<{ id: string }>(path, { token: pageToken(account), method: 'POST', params: { message } });
  await logAudit('meta.reply_published', { accountId: account.id, platform, commentId, length: message.length });
  return res.id;
}

/** Hides a comment from everyone except its author and their friends. Reversible. */
export async function hideComment(account: SocialAccount, platform: 'facebook' | 'instagram', commentId: string) {
  await graph(commentId, {
    token: pageToken(account),
    method: 'POST',
    params: platform === 'facebook' ? { is_hidden: 'true' } : { hide: 'true' },
  });
  await logAudit('meta.comment_hidden', { accountId: account.id, platform, commentId });
}

async function logAudit(action: string, metadata: Record<string, unknown>) {
  try {
    await addDoc('admin_audit_logs', { action, metadataJson: JSON.stringify(metadata), ipAddress: '', createdAt: new Date().toISOString() });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
