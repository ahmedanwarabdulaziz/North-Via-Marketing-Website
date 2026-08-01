'use server';

import { db } from '@/lib/firebase';
import { ClientProfile } from '@/types/database';
import { revalidatePath } from 'next/cache';

function removeUndefinedValues<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

export async function createOrUpdateClient(data: Partial<ClientProfile>) {
  try {
    const timestamp = new Date().toISOString();
    
    if (data.id) {
      // Update
      const docRef = db.collection('clients').doc(data.id);
      const updatePayload = removeUndefinedValues({
        ...data,
        updatedAt: timestamp
      });
      delete updatePayload.id;
      
      await docRef.update(updatePayload);
    } else {
      // Create
      const newPayload = removeUndefinedValues({
        brandName: data.brandName || '',
        ownerName: data.ownerName || '',
        email: data.email || '',
        mobileNumber: data.mobileNumber || '',
        facebookLink: data.facebookLink || '',
        instagramLink: data.instagramLink || '',
        tiktokLink: data.tiktokLink || '',
        googleLink: data.googleLink || '',
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await db.collection('clients').add(newPayload);
    }
    
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to merge Client Profile:', error);
    return { success: false, error: error.message || 'Operation failed' };
  }
}

export async function deleteClientProfile(clientId: string) {
  try {
    await db.collection('clients').doc(clientId).delete();
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Client:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteClientProfileFromForm(formData: FormData) {
  const clientId = valueAsString(formData.get('clientId'));
  if (!clientId) {
    return { success: false, error: 'Client id is required.' };
  }
  return deleteClientProfile(clientId);
}

function valueAsString(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function saveClientFromForm(formData: FormData) {
  const id = valueAsString(formData.get('id'));
  const brandName = valueAsString(formData.get('brandName'));
  const ownerName = valueAsString(formData.get('ownerName'));
  const email = valueAsString(formData.get('email'));
  const mobileNumber = valueAsString(formData.get('mobileNumber'));
  const facebookLink = valueAsString(formData.get('facebookLink'));
  const instagramLink = valueAsString(formData.get('instagramLink'));
  const tiktokLink = valueAsString(formData.get('tiktokLink'));
  const googleLink = valueAsString(formData.get('googleLink'));

  return createOrUpdateClient({
    id: id || undefined,
    brandName,
    ownerName,
    email,
    mobileNumber,
    facebookLink,
    instagramLink,
    tiktokLink,
    googleLink
  });
}
