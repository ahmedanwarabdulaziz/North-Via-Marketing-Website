'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { describeGaError, listGa4Properties, setClientGa4Property } from '@/lib/ga4';
import { removeClarityToken, saveClarityToken } from '@/lib/clarity';

const message = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected error');

export async function loadGaProperties() {
  await requireAdmin();
  try {
    return { success: true, properties: await listGa4Properties() };
  } catch (error) {
    return { success: false, error: describeGaError(error) };
  }
}

export async function saveGaProperty(clientId: string, propertyId: string | null) {
  await requireAdmin();
  try {
    await setClientGa4Property(clientId, propertyId);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: describeGaError(error) };
  }
}

export async function saveClarity(clientId: string, token: string) {
  await requireAdmin();
  try {
    const numbers = await saveClarityToken(clientId, token);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, numbers };
  } catch (error) {
    return { success: false, error: message(error) };
  }
}

export async function removeClarity(clientId: string) {
  await requireAdmin();
  try {
    await removeClarityToken(clientId);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: message(error) };
  }
}
