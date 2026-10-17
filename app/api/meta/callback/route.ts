import { NextRequest, NextResponse } from 'next/server';
import { completeMetaConnection, verifyMetaConnectToken } from '@/lib/meta';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verified = await verifyMetaConnectToken(params.get('state') || '');
  if (!verified) return NextResponse.redirect(new URL('/connect/meta?status=expired', request.url));

  const { clientId, via } = verified;
  const done = (status: 'connected' | 'error') =>
    via === 'admin'
      ? new URL(`/admin/clients/${clientId}?meta=${status}`, request.url)
      : new URL(`/connect/meta?status=${status === 'connected' ? 'success' : 'error'}`, request.url);

  const code = params.get('code');
  if (!code) return NextResponse.redirect(done('error')); // declined or cancelled

  try {
    await completeMetaConnection(code, clientId, via);
    return NextResponse.redirect(done('connected'));
  } catch (error) {
    console.error('Meta callback error:', error);
    return NextResponse.redirect(done('error'));
  }
}
