'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { encrypt } from '@/lib/session';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function safeCompare(input: string, secret: string) {
  const inputHash = crypto.createHash('sha256').update(input).digest();
  const secretHash = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(inputHash, secretHash);
}

export async function loginAdmin(formData: FormData) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  
  const rateLimitStatus = checkRateLimit(ip);
  if (!rateLimitStatus.success) {
    return { success: false, error: rateLimitStatus.error };
  }

  const password = formData.get('password') as string;

  if (!ADMIN_PASSWORD) {
     return { success: false, error: 'Server misconfiguration: Password not set.' };
  }

  if (password && safeCompare(password, ADMIN_PASSWORD)) {
    resetRateLimit(ip);
    
    const sessionToken = await encrypt({ authenticated: true, role: 'admin' });
    
    const cookieStore = await cookies();
    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Set expiration to 1 day
      maxAge: 60 * 60 * 24,
    });

    return { success: true };
  }

  return { success: false, error: 'Invalid password' };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  redirect('/admin/login');
}
