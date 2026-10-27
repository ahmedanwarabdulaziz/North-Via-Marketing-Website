'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { describeMetaAdsError, previewClientMetaAdAccounts, saveClientMetaAdSelection } from '@/lib/meta-ads';

export async function previewMetaAdAccounts(clientId: string) {
  await requireAdmin();
  try {
    return { success: true, accounts: await previewClientMetaAdAccounts(clientId) };
  } catch (error) {
    return { success: false, error: describeMetaAdsError(error) };
  }
}

export async function saveMetaAdAccounts(clientId: string, ids: string[]) {
  await requireAdmin();
  try {
    const linked = await saveClientMetaAdSelection(clientId, ids);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, linked };
  } catch (error) {
    return { success: false, error: describeMetaAdsError(error) };
  }
}
