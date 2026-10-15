'use server';

import { requireAdmin } from '@/lib/admin-auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import {
  GBP_LOCATIONS,
  createConnectToken,
  disconnectClient,
  fetchLocationReviews,
  listLinkedLocations,
  publishReviewReply,
  syncClientLocations,
} from '@/lib/google-business';
import { listClientProfiles } from '@/lib/admin-ops';
import type { GbpLocation, GbpReview } from '@/types/database';

const MAX_REPLY_LENGTH = 4000;

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

export interface ReviewInboxLocation {
  location: GbpLocation & { id: string };
  clientName: string;
  averageRating: number;
  totalReviewCount: number;
  reviews: GbpReview[];
  error?: string;
}

/** Live pull of reviews for every linked location. */
export async function loadReviewInbox(): Promise<ReviewInboxLocation[]> {
  await requireAdmin();
  const [locations, clients] = await Promise.all([listLinkedLocations(), listClientProfiles()]);
  const clientNames = new Map(clients.map((c) => [c.id, c.brandName]));

  return Promise.all(
    locations.map(async (location) => {
      const clientName = clientNames.get(location.clientId) || 'Unknown client';
      try {
        const data = await fetchLocationReviews(location);
        return { location, clientName, ...data };
      } catch (error) {
        return { location, clientName, averageRating: 0, totalReviewCount: 0, reviews: [], error: errorMessage(error) };
      }
    })
  );
}

/**
 * Posts a public reply. The admin's click on "Approve & post" is the approval;
 * there is no automatic posting path.
 */
export async function approveAndPostReply(locationId: string, reviewName: string, comment: string) {
  await requireAdmin();
  const text = comment.trim();
  if (!text) return { success: false, error: 'Reply cannot be empty.' };
  if (text.length > MAX_REPLY_LENGTH) return { success: false, error: `Reply must be under ${MAX_REPLY_LENGTH} characters.` };

  try {
    const doc = await db.collection(GBP_LOCATIONS).doc(locationId).get();
    if (!doc.exists) return { success: false, error: 'Location not found.' };
    const location = doc.data() as GbpLocation;
    if (!location.linked) return { success: false, error: 'This location is not enabled for review management.' };

    await publishReviewReply(location, reviewName, text);
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
