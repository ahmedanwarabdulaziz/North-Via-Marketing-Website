import { google } from 'googleapis';
import { setDoc } from './data/store';
import { encryptString } from './encryption';
import { completeGbpConnection } from './google-business';
import type { GoogleConnection } from '@/types/database';

// The Anwarz app's native Google sign-in (the phone's account picker, no browser). The app asks
// Google for a one-time server auth code with the web client ID (GOOGLE_CLIENT_ID); the server
// exchanges it here exactly as the browser sign-in's callback does. Codes from the Android sign-in
// are exchanged with an empty redirect URI.

const ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

/** Google Ads, the agency-wide login (same record the browser sign-in writes: master_admin_connection). */
export async function connectGoogleAdsFromApp(serverAuthCode: string) {
  const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, '');
  const { tokens } = await oauth.getToken({ code: serverAuthCode, redirect_uri: '' });
  const scopes = tokens.scope ? tokens.scope.split(' ') : [];
  if (!scopes.includes(ADS_SCOPE)) throw new Error('Google Ads access was not granted. Try again and allow Google Ads.');
  if (!tokens.refresh_token) throw new Error('Google didn’t return a lasting login. Remove Anwarz from your Google account’s third-party access and connect again.');
  const now = new Date().toISOString();
  await setDoc(
    'google_connections',
    'master_admin_connection',
    {
      provider: 'google',
      accountEmail: 'admin-authorized',
      encryptedAccessToken: tokens.access_token ? encryptString(tokens.access_token) : '',
      encryptedRefreshToken: encryptString(tokens.refresh_token),
      tokenExpiry: tokens.expiry_date || Date.now() + 3600 * 1000,
      scopes,
      createdAt: now,
      updatedAt: now,
    } satisfies GoogleConnection,
    { merge: true }
  );
}

/** Google Business Profile for one client (or the agency), through the same code as the browser sign-in. */
export async function connectGbpFromApp(serverAuthCode: string, clientId: string) {
  await completeGbpConnection(serverAuthCode, clientId, 'admin', '');
}
