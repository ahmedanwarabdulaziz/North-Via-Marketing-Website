import { cookies } from 'next/headers';
import { decrypt } from './session';

export const ADMIN_SESSION_COOKIE = 'admin_session';

export async function isAdminSessionToken(token: string | undefined) {
  if (!token) return false;
  const payload = await decrypt(token);
  return payload?.authenticated === true && payload?.role === 'admin';
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return isAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/**
 * Server actions are reachable by a direct POST from any path, so the proxy
 * alone does not protect them. Call this first in every admin action.
 */
export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    throw new Error('Unauthorized');
  }
}
