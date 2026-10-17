import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { googleRedirectUri } from '@/lib/google-oauth';

// Starts the Google Analytics (GA4) login, read-only. Admin only: /api/admin is
// behind the login proxy. ?client=<id> brings you back to that client's page.
export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri(request.url));
  const clientId = new URL(request.url).searchParams.get('client') || '';
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/analytics.readonly'],
    state: `ga:${/^[A-Za-z0-9_-]{1,40}$/.test(clientId) ? clientId : ''}`,
  });
  return NextResponse.redirect(authUrl);
}
