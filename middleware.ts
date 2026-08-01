import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/session';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  // Authentication has been temporarily disabled while we rebuild the admin panel from scratch.
  // We will re-implement the secure login flow later.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/admin/:path*',
};
