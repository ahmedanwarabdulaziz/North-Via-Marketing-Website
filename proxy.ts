import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE, isAdminSessionToken } from '@/lib/admin-auth';

const LOGIN_PATH = '/admin/login';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (pathname === LOGIN_PATH) {
    return authenticated ? NextResponse.redirect(new URL('/admin', request.url)) : NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/api/gemini/:path*'],
};
