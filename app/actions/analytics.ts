'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { describeGaError, listGa4Properties, refreshGa4Summary, setClientGa4Property } from '@/lib/ga4';
import { removeClarityToken, saveClarityToken } from '@/lib/clarity';
import { describeSearchError, listSearchSites, refreshSearchSummary, setClientSearchSite } from '@/lib/search-console';

export async function loadSearchSites() {
  await requireAdmin();
  try {
    return { success: true, sites: await listSearchSites() };
  } catch (error) {
    return { success: false, error: describeSearchError(error) };
  }
}

export async function saveSearchSite(clientId: string, siteUrl: string | null) {
  await requireAdmin();
  try {
    await setClientSearchSite(clientId, siteUrl);
    if (siteUrl) await refreshSearchSummary(clientId, siteUrl).catch(() => undefined);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: describeSearchError(error) };
  }
}

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
    // Fill the card now instead of waiting for tomorrow's 10 AM refresh.
    if (propertyId) await refreshGa4Summary(clientId, propertyId).catch(() => undefined);
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
