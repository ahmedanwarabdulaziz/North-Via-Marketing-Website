import { ReviewsInbox, type InboxReview } from '@/components/admin/ReviewsInbox';
import { listLinkedLocations } from '@/lib/google-business';
import { getLatestSyncSummary, listReviewQueue } from '@/lib/review-engine';
import { listClientProfiles } from '@/lib/admin-ops';
import { Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const [queue, lastSync, clients, locations] = await Promise.all([
    listReviewQueue(),
    getLatestSyncSummary(),
    listClientProfiles(),
    listLinkedLocations(),
  ]);
  const clientNames = new Map(clients.map((c) => [c.id, c.brandName]));
  const reviews: InboxReview[] = queue.map((r) => ({ ...r, clientName: clientNames.get(r.clientId) || 'Unknown client' }));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Star className="w-8 h-8 text-amber-400" />
          Google Reviews
        </h1>
        <p className="text-zinc-500 mt-2">
          New reviews are checked automatically and drafted by AI in each client&apos;s style. 5★ replies can be approved in bulk;
          4★ and below are approved one by one.
        </p>
      </div>

      <ReviewsInbox reviews={reviews} lastSync={lastSync} hasLocations={locations.length > 0} />
    </div>
  );
}
