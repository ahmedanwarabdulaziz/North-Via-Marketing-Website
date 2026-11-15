import { NextResponse } from 'next/server';
import { completeOutlookConnection, outlookRedirectUri } from '@/lib/email/outlook';
import { saveEmailAccount } from '@/lib/email/inbox';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { appDoneUrl, splitAppState, verifyAppConnectToken } from '@/lib/app-connect';

// Microsoft sends the admin back here after "Connect Outlook". Only a signed-in admin can add a mailbox.
// From the Anwarz app the state is "mail:outlook~<signed token>", which stands in for the admin login.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { base, token } = splitAppState(params.get('state'));
  const fromApp = token ? await verifyAppConnectToken(token) : null;
  if (token && !fromApp) return NextResponse.redirect(appDoneUrl(request.url, 'error', 'The link expired'));
  if (!fromApp && !(await isAdminAuthenticated())) return NextResponse.redirect(new URL('/admin/login', request.url));
  const done = (ok: boolean, text: string) =>
    fromApp
      ? appDoneUrl(request.url, ok ? 'connected' : 'error', text)
      : new URL(ok ? `/admin/email?connected=${encodeURIComponent(text)}` : `/admin/email?error=${encodeURIComponent(text.slice(0, 200))}`, request.url);
  const code = params.get('code');
  if (base !== 'mail:outlook' || !code) {
    const why = params.get('error_description') || params.get('error') || 'cancelled';
    return NextResponse.redirect(done(false, why.split('\r\n')[0]));
  }
  try {
    const { email, encryptedRefreshToken } = await completeOutlookConnection(code, outlookRedirectUri(request.url));
    await saveEmailAccount('outlook', email, encryptedRefreshToken);
    return NextResponse.redirect(done(true, email));
  } catch (error) {
    console.error('Outlook callback error:', error);
    return NextResponse.redirect(done(false, error instanceof Error ? error.message : 'failed'));
  }
}
