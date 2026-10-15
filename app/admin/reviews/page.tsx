import { loadReviewInbox } from '@/app/actions/google-business';
import { ReviewsInbox } from '@/components/admin/ReviewsInbox';
import { Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const inbox = await loadReviewInbox();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Star className="w-8 h-8 text-amber-400" />
          Google Reviews
        </h1>
        <p className="text-zinc-500 mt-2">
          Reviews from every monitored client location. Replies are only published when you approve them.
        </p>
      </div>

      <ReviewsInbox inbox={inbox} />
    </div>
  );
}
