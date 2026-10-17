import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { googleRedirectUri } from '@/lib/google-oauth';

// Starts the Google Ads login (admin only: /api/admin is behind the login proxy).
// ?client=<id> brings you back to that client's page afterwards.
export async function GET(request: Request) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri(request.url)
  );
  const clientId = new URL(request.url).searchParams.get('client') || '';

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Demands a refresh_token
    prompt: 'consent', // Forces Google to yield the refresh_token even if previously authorized
    scope: ['https://www.googleapis.com/auth/adwords'],
    state: `ads:${/^[A-Za-z0-9_-]{1,40}$/.test(clientId) ? clientId : ''}`,
  });

  return NextResponse.redirect(authUrl);
}
