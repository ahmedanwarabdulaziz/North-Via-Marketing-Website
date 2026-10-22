import { ReviewsInbox, type InboxReview } from '@/components/admin/ReviewsInbox';
import { listLinkedLocations } from '@/lib/google-business';
import { getLatestSyncSummary, listReviewQueue } from '@/lib/review-engine';
import { listClientProfiles } from '@/lib/admin-ops';
import { DigestScheduleCard } from '@/components/admin/DigestScheduleCard';
import { getDigestSchedule, nextDigestRun } from '@/lib/digest-schedule';
import { Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const [queue, lastSync, clients, locations, schedule] = await Promise.all([
    listReviewQueue(),
    getLatestSyncSummary(),
    listClientProfiles(),
    listLinkedLocations(),
    getDigestSchedule(),
  ]);
  const clientNames = new Map(clients.map((c) => [c.id, c.brandName]));
  const reviews: InboxReview[] = queue.map((r) => ({ ...r, clientName: clientNames.get(r.clientId) || 'Unknown client' }));
  // Every client with a monitored location, so a newly connected client shows here before it has reviews to approve.
  const monitoredClients = Array.from(new Set(locations.map((l) => l.clientId))).map((id) => ({
    id,
    name: clientNames.get(id) || locations.find((l) => l.clientId === id)?.title || 'Unknown client',
  }));

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

      <div className="mb-6">
        <DigestScheduleCard
          initial={{ enabled: schedule.enabled, hours: schedule.hours, days: schedule.days, timezone: schedule.timezone }}
          nextRun={nextDigestRun(schedule)}
        />
      </div>

      <ReviewsInbox reviews={reviews} lastSync={lastSync} hasLocations={locations.length > 0} monitoredClients={monitoredClients} />
    </div>
  );
}
