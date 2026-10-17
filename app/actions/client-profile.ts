'use server';

import { requireAdmin } from '@/lib/admin-auth';
import { listDocs, updateDoc } from '@/lib/data/store';
import { revalidatePath } from 'next/cache';

export async function updateClientProfile(customerId: string, data: {
  clientBusinessName?: string;
  clientContactName?: string;
  aiPromptNotes?: string;
}) {
  await requireAdmin();
  try {
    const [account] = await listDocs('google_ads_accounts', { where: { customerId }, limit: 1 });

    if (!account) {
      return { success: false, error: 'Target Ads Account not found in Database' };
    }

    const docId = account.id;

    const updateData: any = { updatedAt: new Date().toISOString() };

    // Safely mapping data to prevent undefined overwriting
    if (data.clientBusinessName !== undefined) updateData.clientBusinessName = data.clientBusinessName;
    if (data.clientContactName !== undefined) updateData.clientContactName = data.clientContactName;
    if (data.aiPromptNotes !== undefined) updateData.aiPromptNotes = data.aiPromptNotes;

    await updateDoc('google_ads_accounts', docId, updateData);

    // Instant cache invalidation for seamless UX
    revalidatePath('/admin/ads');
    revalidatePath('/admin/settings');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to merge client profile:', error);
    return { success: false, error: error.message || 'Database execution failed' };
  }
}
