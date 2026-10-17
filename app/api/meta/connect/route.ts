import { NextRequest, NextResponse } from 'next/server';
import { getMetaAuthUrl, metaConfigured, verifyMetaConnectToken } from '@/lib/meta';

// Entry point for the admin "Connect" button and the link sent to a client.
// The signed token travels as OAuth state so the callback knows who it's for.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const verified = token ? await verifyMetaConnectToken(token) : null;
  if (!token || !verified) return NextResponse.redirect(new URL('/connect/meta?status=expired', request.url));
  if (!metaConfigured()) return NextResponse.redirect(new URL('/connect/meta?status=error', request.url));
  return NextResponse.redirect(getMetaAuthUrl(token));
}
