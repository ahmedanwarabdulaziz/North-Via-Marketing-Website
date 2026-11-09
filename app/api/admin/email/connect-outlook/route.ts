import { NextResponse } from 'next/server';
import { outlookAuthUrl, outlookRedirectUri } from '@/lib/email/outlook';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// Starts "Connect Outlook" from Admin → Email (admin only). Microsoft's account picker opens,
// so each click can add a different mailbox (work or personal). /api/microsoft/callback finishes it.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.redirect(new URL('/admin/login', request.url));
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/admin/email?error=Microsoft app is not set up yet (MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET).', request.url));
  }
  return NextResponse.redirect(outlookAuthUrl(outlookRedirectUri(request.url), 'mail:outlook'));
}
