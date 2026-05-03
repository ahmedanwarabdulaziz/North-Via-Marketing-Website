'use server';

import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';

export async function updateClientProfile(customerId: string, data: {
  clientBusinessName?: string;
  clientContactName?: string;
  aiPromptNotes?: string;
}) {
  try {
    const snapshot = await db.collection('google_ads_accounts')
      .where('customerId', '==', customerId)
      .limit(1)
      .get();
      
    if (snapshot.empty) {
      return { success: false, error: 'Target Ads Account not found in Database' };
    }

    const docId = snapshot.docs[0].id;
    
    const updateData: any = { updatedAt: new Date().toISOString() };
    
    // Safely mapping data to prevent undefined overwriting
    if (data.clientBusinessName !== undefined) updateData.clientBusinessName = data.clientBusinessName;
    if (data.clientContactName !== undefined) updateData.clientContactName = data.clientContactName;
    if (data.aiPromptNotes !== undefined) updateData.aiPromptNotes = data.aiPromptNotes;

    await db.collection('google_ads_accounts').doc(docId).update(updateData);
    
    // Instant cache invalidation for seamless UX
    revalidatePath('/admin/ads');
    revalidatePath('/admin/settings');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to merge client profile:', error);
    return { success: false, error: error.message || 'Database execution failed' };
  }
}
