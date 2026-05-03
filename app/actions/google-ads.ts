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
