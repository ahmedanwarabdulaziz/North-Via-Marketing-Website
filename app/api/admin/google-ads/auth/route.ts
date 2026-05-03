import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Demands a refresh_token
    prompt: 'consent', // Forces Google to yield the refresh_token even if previously authorized
    scope: ['https://www.googleapis.com/auth/adwords'],
  });

  return NextResponse.redirect(authUrl);
}
