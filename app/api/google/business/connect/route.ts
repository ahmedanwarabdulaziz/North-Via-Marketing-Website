import { NextRequest, NextResponse } from 'next/server';
import { getGbpAuthUrl, verifyConnectToken } from '@/lib/google-business';
import { googleRedirectUri } from '@/lib/google-oauth';

// Entry point for both the admin "Connect" button and the link sent to a client.
// The signed token is passed through as OAuth state so the callback knows which client it belongs to.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const verified = token ? await verifyConnectToken(token) : null;

  if (!token || !verified) {
    return NextResponse.redirect(new URL('/connect/google?status=expired', request.url));
  }

  return NextResponse.redirect(getGbpAuthUrl(token, googleRedirectUri(request.url)));
}
