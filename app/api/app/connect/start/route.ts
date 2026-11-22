import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyAppConnectToken } from '@/lib/app-connect';
import { gmailAuthUrl } from '@/lib/email/gmail';
import { outlookAuthUrl, outlookRedirectUri } from '@/lib/email/outlook';
import { AGENCY_CONNECT_ID, createConnectToken } from '@/lib/google-business';
import { googleRedirectUri } from '@/lib/google-oauth';
import { createMetaConnectToken } from '@/lib/meta';

export const dynamic = 'force-dynamic';

// Opened in the phone's browser from the Anwarz app (More → Connections) with a signed 15-minute
// token: starts the provider's sign-in. Gmail, Outlook and Google Ads carry the token in the OAuth
// state ("…~<token>") so their callbacks accept it without an admin login; Business Profile and
// Facebook use their own signed connect links.
export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get('t');
  const verified = await verifyAppConnectToken(t);
  if (!verified) return NextResponse.redirect(new URL('/connect/done?status=expired', request.url));
  const { kind, clientId } = verified;

  switch (kind) {
    case 'gmail':
      return NextResponse.redirect(gmailAuthUrl(googleRedirectUri(request.url), `mail:gmail~${t}`));
    case 'outlook':
      if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) return NextResponse.redirect(new URL('/connect/done?status=error&what=Outlook', request.url));
      return NextResponse.redirect(outlookAuthUrl(outlookRedirectUri(request.url), `mail:outlook~${t}`));
    case 'google_ads': {
      const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri(request.url));
      return NextResponse.redirect(
        oauth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/adwords'], state: `ads:~${t}` })
      );
    }
    case 'gbp':
      // No client: the agency's Google account (the app's Google & Ads screen).
      return NextResponse.redirect(new URL(`/api/google/business/connect?token=${encodeURIComponent(await createConnectToken(clientId ?? AGENCY_CONNECT_ID, 'admin', false, true))}`, request.url));
    case 'meta':
      // No client: your own Facebook login from the app's Social screen.
      return NextResponse.redirect(new URL(`/api/meta/connect?token=${encodeURIComponent(await createMetaConnectToken(clientId ?? '', 'admin', true))}`, request.url));
  }
}
