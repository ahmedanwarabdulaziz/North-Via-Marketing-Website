import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { setDoc } from '@/lib/data/store';
import { encryptString } from '@/lib/encryption';
import { GoogleConnection } from '@/types/database';
import { completeGbpConnection, verifyConnectToken } from '@/lib/google-business';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { googleRedirectUri } from '@/lib/google-oauth';

// Business Profile authorizations carry a signed `state`; Google Ads ones carry
// "ads:<clientId>" and Google Analytics ones "ga:<clientId>".
async function handleBusinessProfileCallback(request: Request, code: string | null, state: string) {
  const verified = await verifyConnectToken(state);
  if (!verified) {
    return NextResponse.redirect(new URL('/connect/google?status=expired', request.url));
  }

  const { clientId, via } = verified;
  const doneUrl = (status: 'connected' | 'error') =>
    via === 'admin'
      ? new URL(`/admin/clients/${clientId}?gbp=${status}`, request.url)
      : new URL(`/connect/google?status=${status === 'connected' ? 'success' : 'error'}`, request.url);

  if (!code) return NextResponse.redirect(doneUrl('error'));

  try {
    await completeGbpConnection(code, clientId, via, googleRedirectUri(request.url));
    return NextResponse.redirect(doneUrl('connected'));
  } catch (error) {
    console.error('Business Profile callback error:', error);
    return NextResponse.redirect(doneUrl('error'));
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const kind = state?.startsWith('ga:') ? 'ga' : state?.startsWith('ads:') ? 'ads' : state ? 'gbp' : 'ads';
    if (kind === 'gbp') {
      return handleBusinessProfileCallback(request, code, state!);
    }
    const connectionId = kind === 'ga' ? 'analytics_admin_connection' : 'master_admin_connection';
    // Back to the client page the connection was started from, or Settings.
    const adsClientId = state?.split(':')[1] || '';
    const adsDone = (query: string) =>
      new URL(adsClientId ? `/admin/clients/${adsClientId}?${kind}=${query}` : `/admin/settings?${query === 'connected' ? 'success=connected' : 'error=' + query}`, request.url);

    // The shared Google Ads / Analytics connections may only be replaced by a signed-in admin.
    if (!(await isAdminAuthenticated())) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!code) {
      return NextResponse.redirect(adsDone('NoAuthCode'));
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      googleRedirectUri(request.url)
    );

    // Exchange the code for access & refresh tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn('Google did not return a refresh token! Revoke access natively in your Google account and try again.');
    }

    // Process our AES-256-GCM Cryptography to protect external access
    const encryptedAccess = tokens.access_token ? encryptString(tokens.access_token) : '';
    const encryptedRefresh = tokens.refresh_token ? encryptString(tokens.refresh_token) : '';

    const payload: GoogleConnection = {
      provider: 'google',
      accountEmail: 'admin-authorized',
      encryptedAccessToken: encryptedAccess,
      // If we didn't receive a refresh token but already have one in DB, we should retain the old one ideally,
      // but 'prompt: consent' fundamentally forces a new one every time anyway.
      encryptedRefreshToken: encryptedRefresh,
      tokenExpiry: tokens.expiry_date || Date.now() + 3600 * 1000,
      scopes: tokens.scope ? tokens.scope.split(' ') : [kind === 'ga' ? 'https://www.googleapis.com/auth/analytics.readonly' : 'https://www.googleapis.com/auth/adwords'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc('google_connections', connectionId, payload, { merge: true });

    return NextResponse.redirect(adsDone('connected'));
  } catch (error) {
    console.error('Google Callback Critical Server Error:', error);
    return NextResponse.redirect(new URL('/admin/settings?error=CallbackFailed', request.url));
  }
}
