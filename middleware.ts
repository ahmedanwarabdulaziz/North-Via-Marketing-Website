import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Check if the route is under /admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Exclude the login page from the check
    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next();
    }

    // Check for the admin session cookie
    const sessionCookie = request.cookies.get('admin_session');

    if (!sessionCookie?.value) {
      // Redirect to login if the cookie is missing
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // Verify token
    const payload = await decrypt(sessionCookie.value);
    
    if (!payload || !payload.authenticated) {
      // Invalid token, delete the cookie and redirect
      const response = NextResponse.redirect(new URL('/admin/login', request.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/admin/:path*',
};
