import { NextResponse } from 'next/server';
import { gmailAuthUrl } from '@/lib/email/gmail';
import { googleRedirectUri } from '@/lib/google-oauth';
import { isAdminAuthenticated } from '@/lib/admin-auth';

// Starts "Connect Gmail" from Admin → Email (admin only). Google's account picker opens,
// so each click can add a different inbox. The shared /api/google/callback finishes it.
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.redirect(new URL('/admin/login', request.url));
  return NextResponse.redirect(gmailAuthUrl(googleRedirectUri(request.url), 'mail:gmail'));
}
