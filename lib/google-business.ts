import { google } from 'googleapis';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './firebase';
import { decryptString, encryptString } from './encryption';
import type { GbpConnection, GbpLocation, GbpReview } from '@/types/database';

export const GBP_CONNECTIONS = 'gbp_connections';
export const GBP_LOCATIONS = 'gbp_locations';

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
  const existing = await db.collection(GBP_CONNECTIONS).doc(clientId).get();

  const connection: GbpConnection = {
    clientId,
    googleEmail,
    encryptedRefreshToken: encryptString(tokens.refresh_token),
    scopes,
    status: 'connected',
    connectedVia: via,
    connectedAt: existing.exists ? (existing.data()?.connectedAt as string) || now : now,
    updatedAt: now,
  };

  await db.collection(GBP_CONNECTIONS).doc(clientId).set(connection);
  await logAudit('gbp.connected', { clientId, googleEmail, via });
}

export async function getGbpConnection(clientId: string) {
  const doc = await db.collection(GBP_CONNECTIONS).doc(clientId).get();
  return doc.exists ? (doc.data() as GbpConnection) : null;
}

async function getClientAuth(clientId: string) {
  const connection = await getGbpConnection(clientId);
  if (!connection) throw new Error('This client has not connected a Google Business Profile.');

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: decryptString(connection.encryptedRefreshToken) });
  return oauth2Client;
}

async function markConnectionError(clientId: string, message: string) {
  await db.collection(GBP_CONNECTIONS).doc(clientId).set(
    { status: 'error', lastError: message, updatedAt: new Date().toISOString() },
    { merge: true }
  );
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

/**
 * Pulls every location the client's Google account manages and upserts them.
 * Newly found locations start unlinked; existing link choices are preserved.
 */
export async function syncClientLocations(clientId: string) {
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

    const now = new Date().toISOString();
    const batch = db.batch();
    let count = 0;

    for (const accountName of accountNames) {
      pageToken = undefined;
      do {
        const res: { data: LocationsPage } = await auth.request<LocationsPage>({
          url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          params: { readMask: 'name,title,storefrontAddress', pageSize: 100, pageToken },
        });

        for (const location of res.data.locations || []) {
          const locationId = String(location.name).split('/')[1];
          const ref = db.collection(GBP_LOCATIONS).doc(locationId);
          const existing = await ref.get();
          const existingData = existing.data() as GbpLocation | undefined;

          // A location already linked to another client is left alone.
          if (existingData && existingData.clientId !== clientId && existingData.linked) continue;

          const record: GbpLocation = {
            clientId,
            accountName,
            locationName: location.name,
            title: location.title || 'Untitled location',
            address: formatAddress(location.storefrontAddress) || '', // Firestore rejects undefined; service-area businesses have no storefront
            linked: existingData?.clientId === clientId ? existingData.linked : false,
            replyMode: 'approval_required',
            lastSyncedAt: now,
            updatedAt: now,
          };
          batch.set(ref, record);
          count++;
        }
        pageToken = res.data.nextPageToken;
      } while (pageToken);
    }

    await batch.commit();
    await db.collection(GBP_CONNECTIONS).doc(clientId).set(
      { status: 'connected', lastError: null, updatedAt: now },
      { merge: true }
    );
    return count;
  });
}

export async function listClientLocations(clientId: string) {
  const snapshot = await db.collection(GBP_LOCATIONS).where('clientId', '==', clientId).get();
  return snapshot.docs
    .map((doc) => ({ ...(doc.data() as GbpLocation), id: doc.id }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function listLinkedLocations() {
  const snapshot = await db.collection(GBP_LOCATIONS).where('linked', '==', true).get();
  return snapshot.docs.map((doc) => ({ ...(doc.data() as GbpLocation), id: doc.id }));
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

  const locations = await db.collection(GBP_LOCATIONS).where('clientId', '==', clientId).get();
  const batch = db.batch();
  locations.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection(GBP_CONNECTIONS).doc(clientId));
  await batch.commit();
  await logAudit('gbp.disconnected', { clientId });
}

async function logAudit(action: string, metadata: Record<string, unknown>) {
  try {
    await db.collection('admin_audit_logs').add({
      action,
      metadataJson: JSON.stringify(metadata),
      ipAddress: '',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
  }
}
