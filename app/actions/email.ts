'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { deleteEmailAccount, setInboxBusiness, updateEmailAccount } from '@/lib/email/inbox';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function saveInboxSettings(
  id: string,
  input: { label: string; focus: string; enabled: boolean; ringUrgent: boolean; ignoredSenders: string; businessId: string }
) {
  await requireAdmin();
  try {
    await setInboxBusiness(id, input.businessId || null);
    await updateEmailAccount(id, {
      label: input.label.trim().slice(0, 60) || null,
      focus: input.focus.trim().slice(0, 1500) || null,
      enabled: input.enabled,
      ring_urgent: input.ringUrgent,
      ignored_senders: [...new Set(input.ignoredSenders.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter((s) => s.includes('@')))].slice(0, 200),
    });
    revalidatePath('/admin/email');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function disconnectInbox(id: string) {
  await requireAdmin();
  try {
    await deleteEmailAccount(id);
    revalidatePath('/admin/email');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
