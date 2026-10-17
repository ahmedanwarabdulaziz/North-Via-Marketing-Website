import { google } from 'googleapis';
import { SignJWT, jwtVerify } from 'jose';
import { addDoc, deleteDocs, getDoc, getDocs, listDocs, setDoc, setDocs } from './data/store';
import { decryptString, encryptString } from './encryption';
import type { GbpConnection, GbpLocation, GbpReview } from '@/types/database';

export const GBP_CONNECTIONS = 'gbp_connections' as const;
export const GBP_LOCATIONS = 'gbp_locations' as const;

const GBP_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
  'openid',
  'email',
];

const STATE_PURPOSE = 'gbp_connect';
const stateKey = new TextEncoder().encode(process.env.SESSION_SECRET);

type ConnectVia = GbpConnection['connectedVia'];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
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

export function getGbpAuthUrl(state: string) {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
    scope: GBP_SCOPES,
    state,
  });
}

/** Exchanges the OAuth code and stores the client's encrypted refresh token. */
export async function completeGbpConnection(code: string, clientId: string, via: ConnectVia) {
  const oauth2Client = getOAuth2Client();
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

async function getClientAuth(clientId: string) {
  const connection = await getGbpConnection(clientId);
  if (!connection) throw new Error('This client has not connected a Google Business Profile.');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: decryptString(connection.encryptedRefreshToken) });
  return oauth2Client;
}

async function markConnectionError(clientId: string, message: string) {
  await setDoc(GBP_CONNECTIONS, clientId, { status: 'error', lastError: message, updatedAt: new Date().toISOString() }, { merge: true });
}

function describeGoogleError(error: unknown) {
  const err = error as { message?: string; response?: { status?: number; data?: { error?: { message?: string } } } };
  const status = err.response?.status;
  const message = err.response?.data?.error?.message || err.message || 'Unknown Google API error';
  if (status === 429) return `Google API quota reached (${message}). Check that Business Profile API access is approved for this project.`;
  if (status === 401 || message.includes('invalid_grant')) return 'Google access was revoked or expired. Ask the client to reconnect.';
  return message;
}

async function withClientAuth<T>(clientId: string, fn: (auth: ReturnType<typeof getOAuth2Client>) => Promise<T>) {
  const auth = await getClientAuth(clientId);
  try {
    return await fn(auth);
  } catch (error) {
    const message = describeGoogleError(error);
    if (message.includes('reconnect')) await markConnectionError(clientId, message);
    throw new Error(message);
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

/** Every location the client's Google account can manage. Reads from Google only; saves nothing. */
async function fetchAvailableLocations(clientId: string) {
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

    await setDoc(GBP_CONNECTIONS, clientId, { status: 'connected', lastError: null, updatedAt: new Date().toISOString() }, { merge: true });
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

export async function listClientLocations(clientId: string) {
  const locations = await listDocs<GbpLocation>(GBP_LOCATIONS, { where: { clientId } });
  return locations.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export async function listLinkedLocations() {
  return listDocs<GbpLocation>(GBP_LOCATIONS, { where: { linked: true } });
}

export async function fetchLocationReviews(location: GbpLocation) {
  return withClientAuth(location.clientId, async (auth) => {
    const res = await auth.request<{ reviews?: GbpReview[]; averageRating?: number; totalReviewCount?: number }>({
      url: `https://mybusiness.googleapis.com/v4/${location.accountName}/${location.locationName}/reviews`,
      params: { pageSize: 50, orderBy: 'updateTime desc' },
    });
    return {
      reviews: res.data.reviews || [],
      averageRating: res.data.averageRating || 0,
      totalReviewCount: res.data.totalReviewCount || 0,
    };
  });
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

/** Revokes Google access and removes the client's stored connection and locations. */
export async function disconnectClient(clientId: string) {
  const connection = await getGbpConnection(clientId);
  if (connection) {
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
