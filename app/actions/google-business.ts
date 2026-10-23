'use server';

import { requireAdmin } from '@/lib/admin-auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { getDoc, updateDoc } from '@/lib/data/store';
import {
  AGENCY_CONNECT_ID,
  createConnectToken,
  disconnectClient,
  previewAgencyLocations,
  previewClientLocations,
  saveAgencyLocationLinks,
  saveClientLocationSelection,
} from '@/lib/google-business';
import { listClientProfiles } from '@/lib/admin-ops';
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

/** Sign-in link for the one agency Google account used by clients without their own login. */
export async function getAgencyGbpConnectUrl() {
  return getGbpConnectUrl(AGENCY_CONNECT_ID, 'admin');
}

export async function previewAgencyGbpLocations() {
  await requireAdmin();
  try {
    const locations = await previewAgencyLocations();
    return {
      success: true,
      locations: locations.map(({ locationId, title, address, clientId }) => ({ locationId, title, address, clientId })),
    };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveAgencyGbpLinks(links: Record<string, string | null>) {
  await requireAdmin();
  try {
    const count = await saveAgencyLocationLinks(links);
    revalidatePath('/admin/reviews');
    revalidatePath('/admin/clients/[id]', 'page');
    return { success: true, count };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function previewGbpLocations(clientId: string) {
  await requireAdmin();
  try {
    const [choices, clients] = await Promise.all([previewClientLocations(clientId), listClientProfiles()]);
    const names = new Map(clients.map((c) => [c.id, c.brandName]));
    return {
      success: true,
      locations: choices.map(({ locationId, title, address, selected, takenByClientId }) => ({
        locationId,
        title,
        address,
        selected,
        takenBy: takenByClientId ? names.get(takenByClientId) || 'another client' : null,
      })),
    };
  } catch (error) {
    revalidatePath(`/admin/clients/${clientId}`);
    return { success: false, error: errorMessage(error) };
  }
}

export async function saveGbpLocations(clientId: string, locationIds: string[]) {
  await requireAdmin();
  try {
    const count = await saveClientLocationSelection(clientId, locationIds);
    revalidatePath(`/admin/clients/${clientId}`);
    revalidatePath('/admin/reviews');
    return { success: true, count };
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
    const client = await getDoc<{ brandName?: string }>('clients', settings.clientId);
    const businessName = client?.brandName || 'the business';
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
    await updateDoc(GBP_REVIEWS, reviewId, { status: 'skipped', updatedAt: new Date().toISOString() });
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
