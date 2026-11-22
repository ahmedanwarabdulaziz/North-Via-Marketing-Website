import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { setDoc } from '@/lib/data/store';
import { encryptString } from '@/lib/encryption';
import { GoogleConnection } from '@/types/database';
import { AGENCY_CONNECT_ID, completeGbpConnection, verifyConnectToken } from '@/lib/google-business';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { googleRedirectUri } from '@/lib/google-oauth';
import { completeGmailConnection } from '@/lib/email/gmail';
import { saveEmailAccount } from '@/lib/email/inbox';
import { appDoneUrl, splitAppState, verifyAppConnectToken } from '@/lib/app-connect';

// Business Profile authorizations carry a signed `state`; Google Ads ones carry
// "ads:<clientId>" and Google Analytics ones "ga:<clientId>".
const HUB = '_hub'; // Admin → Google & Ads, in place of a client id
async function handleBusinessProfileCallback(request: Request, code: string | null, state: string) {
  const verified = await verifyConnectToken(state);
  if (!verified) {
    return NextResponse.redirect(new URL('/connect/google?status=expired', request.url));
  }

  const { clientId, via, hub, fromApp } = verified;
  const doneUrl = (status: 'connected' | 'error') =>
    fromApp
      ? appDoneUrl(request.url, status, 'Google Business')
      : hub
      ? new URL(`/admin/google?gbp=${status}`, request.url)
      : clientId === AGENCY_CONNECT_ID
      ? new URL(`/admin/reviews?gbp=${status}`, request.url)
      : via === 'admin'
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
    // From the Anwarz app, the state ends in "~<signed token>", which stands in for the admin login.
    const { base, token: appToken } = splitAppState(searchParams.get('state'));
    const state = appToken ? base : searchParams.get('state');
    const fromApp = appToken ? await verifyAppConnectToken(appToken) : null;
    if (appToken && !fromApp) return NextResponse.redirect(appDoneUrl(request.url, 'error', 'The link expired'));

    // Gmail inboxes from Admin → Email ("mail:gmail") or the app.
    if (state === 'mail:gmail') {
      if (!fromApp && !(await isAdminAuthenticated())) return NextResponse.redirect(new URL('/admin/login', request.url));
      if (!code) return NextResponse.redirect(fromApp ? appDoneUrl(request.url, 'error', 'Gmail') : new URL('/admin/email?error=cancelled', request.url));
      try {
        const { email, encryptedRefreshToken } = await completeGmailConnection(code, googleRedirectUri(request.url));
        await saveEmailAccount('gmail', email, encryptedRefreshToken);
        return NextResponse.redirect(fromApp ? appDoneUrl(request.url, 'connected', email) : new URL(`/admin/email?connected=${encodeURIComponent(email)}`, request.url));
      } catch (error) {
        console.error('Gmail callback error:', error);
        const reason = error instanceof Error ? error.message : 'failed';
        return NextResponse.redirect(fromApp ? appDoneUrl(request.url, 'error', `Gmail: ${reason}`) : new URL(`/admin/email?error=${encodeURIComponent(reason.slice(0, 200))}`, request.url));
      }
    }

    const kind = state?.startsWith('ga:') ? 'ga' : state?.startsWith('ads:') ? 'ads' : state ? 'gbp' : 'ads';
    if (kind === 'gbp') {
      return handleBusinessProfileCallback(request, code, state!);
    }
    const connectionId = kind === 'ga' ? 'analytics_admin_connection' : 'master_admin_connection';
    // Back to the client page the connection was started from, or Settings.
    const adsClientId = state?.split(':')[1] || '';
    // "_hub": started from Admin → Google & Ads.
    const adsDone = (query: string) =>
      fromApp
        ? appDoneUrl(request.url, query === 'connected' ? 'connected' : 'error', 'Google Ads')
        : adsClientId === HUB
        ? new URL(`/admin/google?${kind}=${query}`, request.url)
        : new URL(adsClientId ? `/admin/clients/${adsClientId}?${kind}=${query}` : `/admin/settings?${query === 'connected' ? 'success=connected' : 'error=' + query}`, request.url);

    // The shared Google Ads / Analytics connections may only be replaced by a signed-in admin (or the app's signed link).
    if (!(fromApp && fromApp.kind === 'google_ads' && kind === 'ads') && !(await isAdminAuthenticated())) {
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
