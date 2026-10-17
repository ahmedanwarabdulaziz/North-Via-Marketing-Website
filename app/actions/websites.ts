'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-auth';
import { addWebsite, listClientWebsites, removeWebsite, runWebsiteChecks, setWebsiteEnabled } from '@/lib/website-monitor';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export async function addClientWebsite(input: { clientId: string; url: string; label?: string; mustContain?: string }) {
  await requireAdmin();
  try {
    const site = await addWebsite(input);
    // Check right away so the card shows a real status, and Telegram learns its baseline.
    await runWebsiteChecks({ ids: [site.id] });
    revalidatePath(`/admin/clients/${input.clientId}`);
    return { success: true, websites: await listClientWebsites(input.clientId) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function checkClientWebsites(clientId: string) {
  await requireAdmin();
  try {
    const sites = await listClientWebsites(clientId);
    await runWebsiteChecks({ ids: sites.filter((s) => s.enabled).map((s) => s.id) });
    return { success: true, websites: await listClientWebsites(clientId) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function toggleClientWebsite(clientId: string, id: string, enabled: boolean) {
  await requireAdmin();
  try {
    await setWebsiteEnabled(id, enabled);
    return { success: true, websites: await listClientWebsites(clientId) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function removeClientWebsite(clientId: string, id: string) {
  await requireAdmin();
  try {
    await removeWebsite(id);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, websites: await listClientWebsites(clientId) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
