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
        businessName: data.businessName || '',
        contactName: data.contactName || '',
        email: data.email || '',
        reportingEmails: data.reportingEmails || [],
        industry: data.industry || '',
        businessDescription: data.businessDescription || '',
        primaryServices: data.primaryServices || [],
        serviceAreas: data.serviceAreas || [],
        targetCities: data.targetCities || [],
        excludedCities: data.excludedCities || [],
        idealCustomerProfile: data.idealCustomerProfile || '',
        averageJobValue: data.averageJobValue,
        targetCostPerLead: data.targetCostPerLead,
        monthlyAdBudget: data.monthlyAdBudget,
        mainGoal: data.mainGoal || '',
        primaryObjective: data.primaryObjective || 'lead_generation',
        conversionDefinition: data.conversionDefinition || '',
        leadQualificationRules: data.leadQualificationRules || '',
        leadQualityNotes: data.leadQualityNotes || '',
        priorityOffers: data.priorityOffers || [],
        competitors: data.competitors || [],
        seasonalityNotes: data.seasonalityNotes || '',
        reportTone: data.reportTone || 'executive',
        clientConcerns: data.clientConcerns || '',
        nextStepNotes: data.nextStepNotes || '',
        aiBehavioralNotes: data.aiBehavioralNotes || '',
        aiAvoidanceWarnings: data.aiAvoidanceWarnings || '',
        linkedGoogleAdsIds: data.linkedGoogleAdsIds || [],
        linkedSocialMediaAccounts: data.linkedSocialMediaAccounts || [],
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await db.collection('clients').add(newPayload);
    }
    
    revalidatePath('/admin/clients');
    revalidatePath('/admin/ads');
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
    revalidatePath('/admin/ads');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete Client:', error);
    return { success: false, error: error.message };
  }
}
