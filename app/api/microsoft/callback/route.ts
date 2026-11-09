import { NextResponse } from 'next/server';
import { completeOutlookConnection, outlookRedirectUri } from '@/lib/email/outlook';
import { saveEmailAccount } from '@/lib/email/inbox';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// Microsoft sends the admin back here after "Connect Outlook". Only a signed-in admin can add a mailbox.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.redirect(new URL('/admin/login', request.url));
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  if (params.get('state') !== 'mail:outlook' || !code) {
    const why = params.get('error_description') || params.get('error') || 'cancelled';
    return NextResponse.redirect(new URL(`/admin/email?error=${encodeURIComponent(why.split('\r\n')[0].slice(0, 200))}`, request.url));
  }
  try {
    const { email, encryptedRefreshToken } = await completeOutlookConnection(code, outlookRedirectUri(request.url));
    await saveEmailAccount('outlook', email, encryptedRefreshToken);
    return NextResponse.redirect(new URL(`/admin/email?connected=${encodeURIComponent(email)}`, request.url));
  } catch (error) {
    console.error('Outlook callback error:', error);
    const reason = error instanceof Error ? error.message : 'failed';
    return NextResponse.redirect(new URL(`/admin/email?error=${encodeURIComponent(reason.slice(0, 200))}`, request.url));
  }
}
