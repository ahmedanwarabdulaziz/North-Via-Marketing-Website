import { google } from 'googleapis';
import { SignJWT, jwtVerify } from 'jose';
import { addDoc, deleteDocs, getDoc, getDocs, listDocs, setDoc, setDocs } from './data/store';
import { decryptString, encryptString } from './encryption';
import { googleRedirectUri } from './google-oauth';
import type { GbpConnection, GbpLocation, GbpReview, GoogleConnection } from '@/types/database';

export const GBP_CONNECTIONS = 'gbp_connections' as const;
export const GBP_LOCATIONS = 'gbp_locations' as const;

// One Google login for the agency, connected on the Reviews page. Clients without a login of
// their own use it. Stored in google_connections next to the shared Ads and Analytics logins.
export const AGENCY_CONNECT_ID = '_agency'; // the `cid` of its connect token
const AGENCY_CONNECTION_DOC = 'gbp_agency_connection';

const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
];

const STATE_PURPOSE = 'gbp_connect';
const stateKey = new TextEncoder().encode(process.env.SESSION_SECRET);

type ConnectVia = GbpConnection['connectedVia'];

// The redirect address only matters for the login itself; token refreshes don't use it.
function getOAuth2Client(redirectUri = googleRedirectUri()) {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, redirectUri);
}

/**
 * Signed token naming the client a Google authorization belongs to.
 * Used both as the shareable link token and as the OAuth `state`.
 * Client links stay valid for 7 days; admin-initiated ones for 30 minutes.
 */
export async function createConnectToken(clientId: string, via: ConnectVia) {
  return new SignJWT({ cid: clientId, via, purpose: STATE_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(via === 'client_link' ? '7d' : '30m')
    .sign(stateKey);
}

export async function verifyConnectToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, stateKey, { algorithms: ['HS256'] });
    if (payload.purpose !== STATE_PURPOSE || typeof payload.cid !== 'string') return null;
    return { clientId: payload.cid, via: (payload.via === 'client_link' ? 'client_link' : 'admin') as ConnectVia };
  } catch {
    return null;
  }
}

export function getGbpAuthUrl(state: string, redirectUri: string) {
  return getOAuth2Client(redirectUri).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
    scope: GBP_SCOPES,
    state,
  });
}

/** Exchanges the OAuth code and stores the client's encrypted refresh token. */
export async function completeGbpConnection(code: string, clientId: string, via: ConnectVia, redirectUri: string) {
  const oauth2Client = getOAuth2Client(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Remove the app from the Google account permissions and try again.');
  }

  const scopes = tokens.scope ? tokens.scope.split(' ') : [];
  if (!scopes.includes('https://www.googleapis.com/auth/business.manage')) {
    throw new Error('Business Profile access was not granted.');
  }

  let googleEmail = 'unknown';
  if (tokens.id_token) {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    googleEmail = ticket.getPayload()?.email || 'unknown';
  }

  const now = new Date().toISOString();
  if (clientId === AGENCY_CONNECT_ID) {
    await setDoc('google_connections', AGENCY_CONNECTION_DOC, {
      provider: 'google',
      accountEmail: googleEmail,
      encryptedAccessToken: '',
      encryptedRefreshToken: encryptString(tokens.refresh_token),
      tokenExpiry: 0,
      scopes,
      createdAt: (await getAgencyConnection())?.createdAt || now,
      updatedAt: now,
    } satisfies GoogleConnection);
    await logAudit('gbp.agency_connected', { googleEmail });
    return;
  }

  const existing = await getGbpConnection(clientId);

  const connection: GbpConnection = {
    clientId,
    googleEmail,
    encryptedRefreshToken: encryptString(tokens.refresh_token),
    scopes,
    status: 'connected',
    connectedVia: via,
    connectedAt: existing?.connectedAt || now,
    updatedAt: now,
  };

  await setDoc(GBP_CONNECTIONS, clientId, connection);
  await logAudit('gbp.connected', { clientId, googleEmail, via });
}

export async function getGbpConnection(clientId: string) {
  return getDoc<GbpConnection>(GBP_CONNECTIONS, clientId);
}

export async function getAgencyConnection() {
  return getDoc<GoogleConnection>('google_connections', AGENCY_CONNECTION_DOC);
}

/** The client's own login when it has one, else the agency's. `null` asks for the agency's. */
async function getClientAuth(clientId: string | null) {
  const connection = clientId ? await getGbpConnection(clientId) : null;
  const encrypted = connection?.encryptedRefreshToken || (await getAgencyConnection())?.encryptedRefreshToken;
  if (!encrypted) {
    throw new Error(clientId ? 'This client has not connected a Google Business Profile.' : 'Connect the Google account on the Reviews page first.');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: decryptString(encrypted) });
  return { auth: oauth2Client, connection };
}

async function markConnectionError(clientId: string, message: string) {
  await setDoc(GBP_CONNECTIONS, clientId, { status: 'error', lastError: message, updatedAt: new Date().toISOString() }, { merge: true });
}

function describeGoogleError(error: unknown) {
  const err = error as {
    message?: string;
    response?: { status?: number; data?: { error?: string | { message?: string }; error_description?: string } };
  };
  const status = err.response?.status;
  const data = err.response?.data;
  // Google's token endpoint answers with a string code (invalid_grant, invalid_client, ...); the APIs with an object.
  const tokenError = typeof data?.error === 'string' ? data.error : undefined;
  const apiMessage = typeof data?.error === 'object' ? data.error.message : undefined;
  const message = apiMessage || data?.error_description || err.message || 'Unknown Google API error';
  if (status === 429) return `Google API quota reached (${message}). Check that Business Profile API access is approved for this project.`;
  if (tokenError === 'invalid_grant' || message.includes('invalid_grant')) {
    return `Google access was revoked or expired (${data?.error_description || 'invalid_grant'}). Ask the client to reconnect.`;
  }
  // A wrong client ID/secret is our setup, not the client's login, so reconnecting would not help.
  if (tokenError) return `Google sign-in failed (${tokenError}${data?.error_description ? `: ${data.error_description}` : ''}). Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.`;
  if (status === 401) return `Google rejected the login (${message}). Ask the client to reconnect.`;
  return message;
}

async function withClientAuth<T>(clientId: string | null, fn: (auth: ReturnType<typeof getOAuth2Client>) => Promise<T>) {
  const { auth, connection } = await getClientAuth(clientId);
  try {
    const result = await fn(auth);
    // A call that works proves the login is fine again, so drop an old error badge.
    if (connection?.status === 'error') {
      await setDoc(GBP_CONNECTIONS, connection.id, { status: 'connected', lastError: null, updatedAt: new Date().toISOString() }, { merge: true });
    }
    return result;
  } catch (error) {
    const message = describeGoogleError(error);
    // The agency login has no badge; its errors show in the review check instead.
    if (connection && message.includes('reconnect')) await markConnectionError(connection.id, message);
    throw new Error(clientId ? message : message.replace('Ask the client to reconnect.', 'Reconnect the Google account on the Reviews page.'));
  }
}

interface LocationsPage {
  locations?: Array<{
    name: string;
    title?: string;
    storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string };
  }>;
  nextPageToken?: string;
}

function formatAddress(address?: { addressLines?: string[]; locality?: string; administrativeArea?: string }) {
  if (!address) return undefined;
  return [...(address.addressLines || []), address.locality, address.administrativeArea].filter(Boolean).join(', ');
}

interface AvailableLocation {
  locationId: string;
  accountName: string;
  locationName: string;
  title: string;
  address: string;
}

/** Every location the client's (or with `null` the agency's) Google account can manage. Reads from Google only; saves nothing. */
async function fetchAvailableLocations(clientId: string | null) {
  return withClientAuth(clientId, async (auth) => {
    const accountNames: string[] = [];
    let pageToken: string | undefined;
    do {
      const res = await auth.request<{ accounts?: { name: string }[]; nextPageToken?: string }>({
        url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
        params: { pageSize: 20, pageToken },
      });
      accountNames.push(...(res.data.accounts || []).map((a) => a.name));
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    const found: AvailableLocation[] = [];
    for (const accountName of accountNames) {
      pageToken = undefined;
      do {
        const res: { data: LocationsPage } = await auth.request<LocationsPage>({
          url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          params: { readMask: 'name,title,storefrontAddress', pageSize: 100, pageToken },
        });
        for (const location of res.data.locations || []) {
          found.push({
            locationId: String(location.name).split('/')[1],
            accountName,
            locationName: location.name,
            title: location.title || 'Untitled location',
            // Service-area businesses have no storefront
            address: formatAddress(location.storefrontAddress) || '',
          });
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);
    }

    return found.sort((a, b) => a.title.localeCompare(b.title));
  });
}

export interface LocationChoice extends AvailableLocation {
  selected: boolean; // currently monitored for this client
  takenByClientId?: string; // monitored for a different client, so it can't be picked here
}

/** Locations for the picker: what Google offers, marked with what's already chosen. */
export async function previewClientLocations(clientId: string): Promise<LocationChoice[]> {
  const available = await fetchAvailableLocations(clientId);
  const storedById = await getDocs<GbpLocation>(GBP_LOCATIONS, available.map((l) => l.locationId));
  return available.map((location) => {
    const stored = storedById.get(location.locationId) || null;
    return {
      ...location,
      selected: Boolean(stored && stored.clientId === clientId && stored.linked),
      takenByClientId: stored && stored.clientId !== clientId && stored.linked ? stored.clientId : undefined,
    };
  });
}

/**
 * Saves the picker: ticked locations are monitored for this client; this client's
 * unticked ones stop being monitored. Details are re-read from Google, not trusted from the browser.
 */
export async function saveClientLocationSelection(clientId: string, selectedIds: string[]) {
  const choices = await previewClientLocations(clientId);
  const wanted = new Set(selectedIds);
  const now = new Date().toISOString();
  const chosen: Array<{ id: string; data: GbpLocation }> = [];
  const dropped: string[] = [];

  for (const choice of choices) {
    if (wanted.has(choice.locationId)) {
      if (choice.takenByClientId) continue;
      const record: GbpLocation = {
        clientId,
        accountName: choice.accountName,
        locationName: choice.locationName,
        title: choice.title,
        address: choice.address,
        linked: true,
        replyMode: 'approval_required',
        lastSyncedAt: now,
        updatedAt: now,
      };
      chosen.push({ id: choice.locationId, data: record });
    } else if (choice.selected) {
      dropped.push(choice.locationId);
    }
  }

  await setDocs(GBP_LOCATIONS, chosen);
  await setDocs(GBP_LOCATIONS, dropped.map((id) => ({ id, data: { linked: false, updatedAt: now } })), { merge: true });
  return chosen.length;
}

export interface AgencyLocationChoice extends AvailableLocation {
  clientId: string | null; // the client it's monitored for, if any
}

/** Every location the agency's Google account manages, with the client each is linked to. */
export async function previewAgencyLocations(): Promise<AgencyLocationChoice[]> {
  const available = await fetchAvailableLocations(null);
  const storedById = await getDocs<GbpLocation>(GBP_LOCATIONS, available.map((l) => l.locationId));
  return available.map((location) => {
    const stored = storedById.get(location.locationId);
    return { ...location, clientId: stored?.linked ? stored.clientId : null };
  });
}

/**
 * Saves the Reviews page's links: locationId → client to monitor it for, or null to stop.
 * Locations left out of `links` are not touched. Details are re-read from Google.
 */
export async function saveAgencyLocationLinks(links: Record<string, string | null>) {
  const choices = await previewAgencyLocations();
  const now = new Date().toISOString();
  const chosen: Array<{ id: string; data: GbpLocation }> = [];
  const dropped: string[] = [];

  for (const choice of choices) {
    if (!(choice.locationId in links)) continue;
    const clientId = links[choice.locationId];
    if (clientId) {
      chosen.push({
        id: choice.locationId,
        data: {
          clientId,
          accountName: choice.accountName,
          locationName: choice.locationName,
          title: choice.title,
          address: choice.address,
          linked: true,
          replyMode: 'approval_required',
          lastSyncedAt: now,
          updatedAt: now,
        },
      });
    } else if (choice.clientId) {
      dropped.push(choice.locationId);
    }
  }

  await setDocs(GBP_LOCATIONS, chosen);
  await setDocs(GBP_LOCATIONS, dropped.map((id) => ({ id, data: { linked: false, updatedAt: now } })), { merge: true });

  // A client's own login would win over the agency's, so drop it once the agency's account
  // covers every location monitored for that client. Not revoked: it's often the same Google account.
  const reachable = new Set(choices.map((c) => c.locationId));
  for (const clientId of new Set(chosen.map((c) => c.data.clientId))) {
    if (!(await getGbpConnection(clientId))) continue;
    const monitored = (await listClientLocations(clientId)).filter((l) => l.linked);
    if (monitored.every((l) => reachable.has(l.id))) {
      await deleteDocs(GBP_CONNECTIONS, { clientId });
      await logAudit('gbp.client_moved_to_agency_login', { clientId });
    }
  }
  return chosen.length;
}

export async function listClientLocations(clientId: string) {
  const locations = await listDocs<GbpLocation>(GBP_LOCATIONS, { where: { clientId } });
  return locations.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export async function listLinkedLocations() {
  return listDocs<GbpLocation>(GBP_LOCATIONS, { where: { linked: true } });
}

/** One page (up to 50) of a location's reviews, newest change first. */
export async function fetchLocationReviews(location: GbpLocation, pageToken?: string) {
  return withClientAuth(location.clientId, async (auth) => {
    const res = await auth.request<{ reviews?: GbpReview[]; averageRating?: number; totalReviewCount?: number; nextPageToken?: string }>({
      url: `https://mybusiness.googleapis.com/v4/${location.accountName}/${location.locationName}/reviews`,
      params: { pageSize: 50, orderBy: 'updateTime desc', ...(pageToken ? { pageToken } : {}) },
    });
    return {
      reviews: res.data.reviews || [],
      averageRating: res.data.averageRating || 0,
      totalReviewCount: res.data.totalReviewCount || 0,
      nextPageToken: res.data.nextPageToken || null,
    };
  });
}

/**
 * Every review of a location, page by page (Google returns 50 at a time). Stops at `maxPages`
 * or the time limit and says whether it got them all.
 */
export async function fetchAllLocationReviews(location: GbpLocation, opts: { maxPages?: number; deadline?: number } = {}) {
  const reviews: GbpReview[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  let total = 0;
  do {
    const page = await fetchLocationReviews(location, pageToken);
    reviews.push(...page.reviews);
    total = page.totalReviewCount;
    pageToken = page.nextPageToken || undefined;
    pages++;
  } while (pageToken && pages < (opts.maxPages ?? 40) && Date.now() < (opts.deadline ?? Infinity));
  return { reviews, totalReviewCount: total, complete: !pageToken };
}

/** Publishes a public reply. Only call after an explicit human approval. */
export async function publishReviewReply(location: GbpLocation, reviewName: string, comment: string) {
  const expectedPrefix = `${location.accountName}/${location.locationName}/reviews/`;
  if (!reviewName.startsWith(expectedPrefix)) {
    throw new Error('Review does not belong to this location.');
  }

  await withClientAuth(location.clientId, (auth) =>
    auth.request({
      url: `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
      method: 'PUT',
      data: { comment },
    })
  );
  await logAudit('gbp.reply_published', { clientId: location.clientId, reviewName, length: comment.length });
}

// ---------- Posts ----------

export type LocalPostTopic = 'STANDARD' | 'EVENT' | 'OFFER';
export type LocalPostAction = 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';

interface GoogleDate {
  year: number;
  month: number;
  day: number;
}

export interface LocalPostInput {
  summary: string;
  topicType: LocalPostTopic;
  imageUrl?: string; // public or signed link Google downloads the photo from
  callToAction?: { actionType: LocalPostAction; url?: string }; // CALL uses the profile's phone, no url
  event?: { title: string; startDate: string; endDate: string }; // YYYY-MM-DD; required for EVENT and OFFER
  offer?: { couponCode?: string; redeemOnlineUrl?: string; termsConditions?: string };
}

export interface LocalPost {
  name: string;
  state?: 'LOCAL_POST_STATE_UNSPECIFIED' | 'REJECTED' | 'LIVE' | 'PROCESSING';
  searchUrl?: string;
  summary?: string;
}

function googleDate(iso: string): GoogleDate {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

function postPath(location: GbpLocation) {
  return `${location.accountName}/${location.locationName}/localPosts`;
}

/** Publishes a post on the location's profile. Only call after an explicit human approval. */
export async function createLocalPost(location: GbpLocation, input: LocalPostInput) {
  const data: Record<string, unknown> = { languageCode: 'en', summary: input.summary, topicType: input.topicType };
  if (input.imageUrl) data.media = [{ mediaFormat: 'PHOTO', sourceUrl: input.imageUrl }];
  if (input.callToAction && input.topicType !== 'OFFER') data.callToAction = input.callToAction;
  if (input.event && input.topicType !== 'STANDARD') {
    data.event = { title: input.event.title, schedule: { startDate: googleDate(input.event.startDate), endDate: googleDate(input.event.endDate) } };
  }
  if (input.offer && input.topicType === 'OFFER') data.offer = input.offer;

  const post = await withClientAuth(location.clientId, async (auth) =>
    (await auth.request<LocalPost>({ url: `https://mybusiness.googleapis.com/v4/${postPath(location)}`, method: 'POST', data })).data
  );
  await logAudit('gbp.post_published', { clientId: location.clientId, post: post.name, length: input.summary.length });
  return post;
}

function checkPostName(location: GbpLocation, postName: string) {
  if (!postName.startsWith(`${postPath(location)}/`)) throw new Error('Post does not belong to this location.');
}

export async function getLocalPost(location: GbpLocation, postName: string) {
  checkPostName(location, postName);
  return withClientAuth(location.clientId, async (auth) => (await auth.request<LocalPost>({ url: `https://mybusiness.googleapis.com/v4/${postName}` })).data);
}

export async function deleteLocalPost(location: GbpLocation, postName: string) {
  checkPostName(location, postName);
  await withClientAuth(location.clientId, (auth) => auth.request({ url: `https://mybusiness.googleapis.com/v4/${postName}`, method: 'DELETE' }));
  await logAudit('gbp.post_deleted', { clientId: location.clientId, post: postName });
}

/** Revokes Google access and removes the client's stored connection and locations. */
export async function disconnectClient(clientId: string) {
  const connection = await getGbpConnection(clientId);
  // Revoking ends the whole Google grant for that account, which would also log out
  // every other client connected with the same Google account.
  const shared =
    connection &&
    ((await getAgencyConnection())?.accountEmail === connection.googleEmail ||
      (await listDocs<GbpConnection>(GBP_CONNECTIONS, { where: { googleEmail: connection.googleEmail } })).some((other) => other.id !== clientId));
  if (connection && !shared) {
    try {
      await getOAuth2Client().revokeToken(decryptString(connection.encryptedRefreshToken));
    } catch (error) {
      console.warn('GBP token revoke failed (continuing with local removal):', describeGoogleError(error));
    }
  }

  await deleteDocs(GBP_LOCATIONS, { clientId });
  await deleteDocs(GBP_CONNECTIONS, { clientId });
  await logAudit('gbp.disconnected', { clientId });
}

async function logAudit(action: string, metadata: Record<string, unknown>) {
  try {
    await addDoc('admin_audit_logs', {
      action,
      metadataJson: JSON.stringify(metadata),
      ipAddress: '',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
