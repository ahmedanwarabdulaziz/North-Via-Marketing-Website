'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import {
  createMetaConnectToken,
  disconnectClientSocial,
  metaConfigured,
  previewClientAccounts,
  saveClientAccountSelection,
} from '@/lib/meta';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function getMetaConnectUrl(clientId: string, via: 'admin' | 'client_link') {
  await requireAdmin();
  try {
    if (!metaConfigured()) throw new Error('Facebook isn’t set up yet: add META_APP_ID and META_APP_SECRET to the environment.');
    const token = await createMetaConnectToken(clientId, via);
    return { success: true, url: `${await siteOrigin()}/api/meta/connect?token=${encodeURIComponent(token)}` };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function previewSocialAccounts(clientId: string) {
  await requireAdmin();
  try {
    return { success: true, accounts: await previewClientAccounts(clientId) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveSocialAccounts(clientId: string, selectedIds: string[]) {
  await requireAdmin();
  try {
    const monitored = await saveClientAccountSelection(clientId, selectedIds);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, monitored };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function disconnectSocial(clientId: string) {
  await requireAdmin();
  try {
    await disconnectClientSocial(clientId);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
