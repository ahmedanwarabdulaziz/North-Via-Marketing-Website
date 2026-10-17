'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { describeAdsError, previewClientAdsAccounts, saveClientAdsSelection } from '@/lib/ads-metrics';

export async function previewAdsAccounts(clientId: string) {
  await requireAdmin();
  try {
    return { success: true, accounts: await previewClientAdsAccounts(clientId) };
  } catch (error) {
    return { success: false, error: describeAdsError(error) };
  }
}

export async function saveAdsAccounts(clientId: string, customerIds: string[]) {
  await requireAdmin();
  try {
    const linked = await saveClientAdsSelection(clientId, customerIds);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, linked };
  } catch (error) {
    return { success: false, error: describeAdsError(error) };
  }
}
