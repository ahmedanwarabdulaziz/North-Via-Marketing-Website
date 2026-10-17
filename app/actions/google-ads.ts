'use server';

import { requireAdmin } from '@/lib/admin-auth';
import { deleteDocs, getDoc, getDocs, listDocs, setDocs, updateDoc } from '@/lib/data/store';
import { revalidatePath } from 'next/cache';

export async function disconnectGoogleAds() {
  await requireAdmin();
  try {
    // Shred the connection securely
    await deleteDocs('google_connections', { id: 'master_admin_connection' });

    // Purge related ad account metadata
    await deleteDocs('google_ads_accounts', { googleConnectionId: 'master_admin_connection' });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (error: any) {
    console.error('Google Ads Disconnect Error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkGoogleAdsConnection() {
  await requireAdmin();
  try {
    const connection = await getDoc('google_connections', 'master_admin_connection');
    return { isConnected: Boolean(connection) };
  } catch (error: any) {
    return { isConnected: false, error: error.message };
  }
}

export async function syncAdsAccounts() {
  await requireAdmin();
  try {
    const { listAccessibleCustomers } = await import('@/lib/google-ads');
    const clients = await listAccessibleCustomers();

    if (!clients || clients.length === 0) {
      return { success: true, accounts: [] };
    }

    const existing = await getDocs<{ isSelected?: boolean }>('google_ads_accounts', clients.map((c) => c.customerId));
    const writes: Array<{ id: string; data: object }> = [];

    // We update/insert all accounts pulled
    for (const client of clients) {
      // Preserve an existing isSelected status
      const isSelected = existing.get(client.customerId)?.isSelected || false;

      writes.push({ id: client.customerId, data: {
        googleConnectionId: 'master_admin_connection',
        customerId: client.customerId,
        descriptiveName: client.descriptiveName,
        currencyCode: client.currencyCode,
        timeZone: client.timeZone,
        isSelected: isSelected,
        updatedAt: new Date().toISOString(),
      } });
    }

    await setDocs('google_ads_accounts', writes, { merge: true });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');

    return { success: true, count: clients.length };
  } catch (error: any) {
    console.error('Sync Accounts Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function selectDefaultAdsAccount(customerId: string) {
  await requireAdmin();
  try {
    // We only permit one single account to be toggled as True simultaneously
    const allDocs = await listDocs('google_ads_accounts');
    await updateDoc('google_ads_accounts', allDocs.filter((doc) => doc.id !== customerId).map((doc) => doc.id), { isSelected: false });
    await updateDoc('google_ads_accounts', customerId, { isSelected: true });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignAdsAccountToClient(customerId: string, clientId: string | null) {
  await requireAdmin();
  try {
    // 1. Fetch all clients to clean up existing links for this customerId
    const allClients = await listDocs<{ linkedGoogleAdsIds?: string[] }>('clients');
    for (const doc of allClients) {
      const linkedIds: string[] = doc.linkedGoogleAdsIds || [];
      if (linkedIds.includes(customerId) && doc.id !== clientId) {
        await updateDoc('clients', doc.id, {
          linkedGoogleAdsIds: linkedIds.filter(id => id !== customerId),
          updatedAt: new Date().toISOString()
        });
      }
    }

    let brandName = '';
    let ownerName = '';

    // 2. If a new clientId is specified, link it to this client
    if (clientId) {
      const clientData = await getDoc<{ brandName?: string; ownerName?: string; linkedGoogleAdsIds?: string[] }>('clients', clientId);
      if (clientData) {
        brandName = clientData?.brandName || '';
        ownerName = clientData?.ownerName || '';

        const currentLinked: string[] = clientData?.linkedGoogleAdsIds || [];
        if (!currentLinked.includes(customerId)) {
          await updateDoc('clients', clientId, {
            linkedGoogleAdsIds: [...currentLinked, customerId],
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 3. Update the google_ads_accounts document metadata
    {
      await updateDoc('google_ads_accounts', customerId, {
        brandName: brandName || null,
        ownerName: ownerName || null,
        updatedAt: new Date().toISOString()
      });
    }

    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    revalidatePath('/admin/clients');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to assign Ads Account to Client:', error);
    return { success: false, error: error.message || 'Database update failed' };
  }
}
