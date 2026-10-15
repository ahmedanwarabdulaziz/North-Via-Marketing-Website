'use server';

import { requireAdmin } from '@/lib/admin-auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import {
  GBP_LOCATIONS,
  createConnectToken,
  disconnectClient,
  syncClientLocations,
} from '@/lib/google-business';
import {
  GBP_REVIEWS,
  generateReplyDraft,
  postApprovedReply,
  regenerateReviewDraft,
  saveReplySettings,
} from '@/lib/review-engine';
import { nextDigestRun, saveDigestSchedule } from '@/lib/digest-schedule';
import type { GbpReplySettings } from '@/types/database';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || (host?.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function getGbpConnectUrl(clientId: string, via: 'admin' | 'client_link') {
  await requireAdmin();
  try {
    const token = await createConnectToken(clientId, via);
    return { success: true, url: `${await siteOrigin()}/api/google/business/connect?token=${encodeURIComponent(token)}` };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function syncGbpLocations(clientId: string) {
  await requireAdmin();
  try {
    const count = await syncClientLocations(clientId);
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: true, count };
  } catch (error) {
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: false, error: errorMessage(error) };
  }
}

export async function setGbpLocationLinked(clientId: string, locationId: string, linked: boolean) {
  await requireAdmin();
  try {
    const ref = db.collection(GBP_LOCATIONS).doc(locationId);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.clientId !== clientId) {
      return { success: false, error: 'Location not found for this client.' };
    }
    await ref.update({ linked, updatedAt: new Date().toISOString() });
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function disconnectGbp(clientId: string) {
  await requireAdmin();
  try {
    await disconnectClient(clientId);
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveReplyStyle(settings: GbpReplySettings) {
  await requireAdmin();
  try {
    await saveReplySettings({ ...settings, clientId: settings.clientId });
    revalidatePath(`/admin/clients/${settings.clientId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

const SAMPLE_REVIEWS = {
  positive: { reviewerName: 'Sarah M.', rating: 5, comment: 'Amazing experience from start to finish. The team was friendly and everything was exactly what we hoped for. Will definitely be back!' },
  negative: { reviewerName: 'James', rating: 2, comment: 'Waited almost 40 minutes and nobody updated us. The staff seemed overwhelmed. Disappointing compared to last time.' },
};

/** Generates a sample reply with unsaved settings so the style can be tried before saving. */
export async function previewReplyStyle(settings: GbpReplySettings, sample: 'positive' | 'negative') {
  await requireAdmin();
  try {
    const client = await db.collection('clients').doc(settings.clientId).get();
    const businessName = (client.data()?.brandName as string) || 'the business';
    const reply = await generateReplyDraft(settings, businessName, SAMPLE_REVIEWS[sample]);
    return { success: true, reply, review: SAMPLE_REVIEWS[sample] };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function regenerateDraft(reviewId: string) {
  await requireAdmin();
  try {
    const draft = await regenerateReviewDraft(reviewId);
    revalidatePath('/admin/reviews');
    return { success: true, draft };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

/** One-by-one approval: the admin's click is the approval. */
export async function approveReview(reviewId: string, reply: string) {
  await requireAdmin();
  try {
    await postApprovedReply(reviewId, reply);
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function skipReview(reviewId: string) {
  await requireAdmin();
  try {
    await db.collection(GBP_REVIEWS).doc(reviewId).update({ status: 'skipped', updatedAt: new Date().toISOString() });
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveDigestScheduleAction(input: { enabled: boolean; hours: number[]; days: number[]; timezone: string }) {
  await requireAdmin();
  try {
    const schedule = await saveDigestSchedule(input);
    revalidatePath('/admin/reviews');
    return { success: true, nextRun: nextDigestRun({ ...schedule }) };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
