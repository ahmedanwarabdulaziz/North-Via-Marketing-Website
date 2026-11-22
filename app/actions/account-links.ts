'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { assignAccountLink, LINK_KINDS, loadAccountLinks, type LinkKind } from '@/lib/account-links';
import { AGENCY_CONNECT_ID, createConnectToken } from '@/lib/google-business';

// Admin → Google & Ads.

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

export async function assignAccount(kind: LinkKind, id: string, clientId: string | null) {
  await requireAdmin();
  try {
    if (!LINK_KINDS.includes(kind)) throw new Error('Unknown account type.');
    await assignAccountLink(kind, id, clientId);
    revalidatePath('/admin/google');
    if (clientId) revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

/** Re-reads the Google Ads and Facebook ad account lists. */
export async function refreshAccountLists() {
  await requireAdmin();
  try {
    await loadAccountLinks({ refresh: true });
    revalidatePath('/admin/google');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

/** The agency's Google Business login, returning to this page. */
export async function getHubGbpConnectUrl() {
  await requireAdmin();
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  const token = await createConnectToken(AGENCY_CONNECT_ID, 'admin', true);
  return { success: true, url: `${proto}://${host}/api/google/business/connect?token=${encodeURIComponent(token)}` };
}
