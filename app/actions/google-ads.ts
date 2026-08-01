'use server';

import { db } from '@/lib/firebase';
import { revalidatePath } from 'next/cache';

export async function disconnectGoogleAds() {
  try {
    // Shred the connection securely 
    await db.collection('google_connections').doc('master_admin_connection').delete();
    
    // Purge related ad account metadata 
    const accountsSnapshot = await db.collection('google_ads_accounts').where('googleConnectionId', '==', 'master_admin_connection').get();
    
    const batch = db.batch();
    accountsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (error: any) {
    console.error('Google Ads Disconnect Error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkGoogleAdsConnection() {
  try {
    const doc = await db.collection('google_connections').doc('master_admin_connection').get();
    return { isConnected: doc.exists };
  } catch (error: any) {
    return { isConnected: false, error: error.message };
  }
}

export async function syncAdsAccounts() {
  try {
    const { listAccessibleCustomers } = await import('@/lib/google-ads');
    const clients = await listAccessibleCustomers();

    if (!clients || clients.length === 0) {
      return { success: true, accounts: [] };
    }

    const batch = db.batch();
    
    // We update/insert all accounts pulled
    for (const client of clients) {
      // Check if we need to preserve an existing isSelected status
      let isSelected = false;
      const existingDoc = await db.collection('google_ads_accounts').doc(client.customerId).get();
      if (existingDoc.exists) {
        isSelected = existingDoc.data()?.isSelected || false;
      }

      batch.set(db.collection('google_ads_accounts').doc(client.customerId), {
        googleConnectionId: 'master_admin_connection',
        customerId: client.customerId,
        descriptiveName: client.descriptiveName,
        currencyCode: client.currencyCode,
        timeZone: client.timeZone,
        isSelected: isSelected,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    await batch.commit();
    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');

    return { success: true, count: clients.length };
  } catch (error: any) {
    console.error('Sync Accounts Action Error:', error);
    return { success: false, error: error.message };
  }
}

export async function selectDefaultAdsAccount(customerId: string) {
  try {
    // We only permit one single account to be toggled as True simultaneously
    const allDocs = await db.collection('google_ads_accounts').get();
    const batch = db.batch();

    allDocs.forEach((doc) => {
      batch.update(doc.ref, {
        isSelected: doc.id === customerId
      });
    });

    await batch.commit();
    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignAdsAccountToClient(customerId: string, clientId: string | null) {
  try {
    const batch = db.batch();
    
    // 1. Fetch all clients to clean up existing links for this customerId
    const clientsSnapshot = await db.collection('clients').get();
    clientsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const linkedIds: string[] = data.linkedGoogleAdsIds || [];
      if (linkedIds.includes(customerId)) {
        batch.update(doc.ref, {
          linkedGoogleAdsIds: linkedIds.filter(id => id !== customerId),
          updatedAt: new Date().toISOString()
        });
      }
    });

    let brandName = '';
    let ownerName = '';

    // 2. If a new clientId is specified, link it to this client
    if (clientId) {
      const clientDoc = await db.collection('clients').doc(clientId).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        brandName = clientData?.brandName || '';
        ownerName = clientData?.ownerName || '';

        const currentLinked: string[] = clientData?.linkedGoogleAdsIds || [];
        if (!currentLinked.includes(customerId)) {
          batch.update(clientDoc.ref, {
            linkedGoogleAdsIds: [...currentLinked, customerId],
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    // 3. Update the google_ads_accounts document metadata
    const accountDocRef = db.collection('google_ads_accounts').doc(customerId);
    const accountDoc = await accountDocRef.get();
    if (accountDoc.exists) {
      batch.update(accountDocRef, {
        brandName: brandName || null,
        ownerName: ownerName || null,
        updatedAt: new Date().toISOString()
      });
    }

    await batch.commit();

    revalidatePath('/admin/settings');
    revalidatePath('/admin/ads');
    revalidatePath('/admin/clients');

    return { success: true };
  } catch (error: any) {
    console.error('Failed to assign Ads Account to Client:', error);
    return { success: false, error: error.message || 'Database update failed' };
  }
}
