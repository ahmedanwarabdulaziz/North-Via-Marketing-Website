import { NextRequest, NextResponse } from 'next/server';
import { appDoneUrl } from '@/lib/app-connect';
import { completeMetaConnection, verifyMetaConnectToken } from '@/lib/meta';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verified = await verifyMetaConnectToken(params.get('state') || '');
  if (!verified) return NextResponse.redirect(new URL('/connect/meta?status=expired', request.url));

  const { clientId, via, fromApp } = verified;
  // From the Anwarz app: the shared "go back to the app" page. No client: started from
  // Admin → Facebook & Instagram.
  const done = (status: 'connected' | 'error') =>
    fromApp
      ? appDoneUrl(request.url, status, 'Facebook & Instagram')
      : via === 'admin'
      ? new URL(clientId ? `/admin/clients/${clientId}?meta=${status}` : `/admin/social?meta=${status}`, request.url)
      : new URL(`/connect/meta?status=${status === 'connected' ? 'success' : 'error'}`, request.url);

  const code = params.get('code');
  if (!code) return NextResponse.redirect(done('error')); // declined or cancelled

  try {
    await completeMetaConnection(code, clientId, via);
    return NextResponse.redirect(done('connected'));
  } catch (error) {
    console.error('Meta callback error:', error);
    const url = done('error');
    // The admin page shows why (our own messages, e.g. "No Facebook Pages were shared").
    if (!fromApp && via === 'admin' && !clientId && error instanceof Error) url.searchParams.set('reason', error.message.slice(0, 200));
    return NextResponse.redirect(url);
  }
}
