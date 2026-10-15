'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, MapPin, AlertTriangle, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { approveAndPostReply, type ReviewInboxLocation } from '@/app/actions/google-business';
import type { GbpReview, GbpStarRating } from '@/types/database';

const STARS: Record<GbpStarRating, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, STAR_RATING_UNSPECIFIED: 0,
};

type Filter = 'unreplied' | 'negative' | 'all';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} />
      ))}
    </span>
  );
}

function ReviewCard({ review, locationId }: { review: GbpReview; locationId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const rating = STARS[review.starRating] ?? 0;

  async function handleApprove() {
    if (!confirm('Post this reply publicly on Google? It will be visible to everyone.')) return;
    setPosting(true);
    setError(null);
    const result = await approveAndPostReply(locationId, review.name, draft);
    setPosting(false);
    if (result.success) {
      setPosted(true);
      router.refresh();
    } else {
      setError(result.error || 'Failed to post reply.');
    }
  }

  return (
    <div className={`p-5 rounded-xl border ${rating > 0 && rating <= 2 ? 'border-red-200 bg-red-50/30' : 'border-zinc-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-zinc-900">{review.reviewer?.displayName || 'Anonymous'}</div>
          <div className="flex items-center gap-2 mt-1">
            <Stars value={rating} />
            <span className="text-xs text-zinc-500">{new Date(review.createTime).toLocaleDateString()}</span>
          </div>
        </div>
        {review.reviewReply || posted ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Replied
          </span>
        ) : (
          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">Needs reply</span>
        )}
      </div>

      <p className="text-sm text-zinc-700 mt-3 whitespace-pre-line">
        {review.comment || <span className="italic text-zinc-400">Rating only, no written review.</span>}
      </p>

      {review.reviewReply && (
        <div className="mt-3 pl-3 border-l-2 border-zinc-200 text-sm text-zinc-600">
          <div className="text-xs font-medium text-zinc-400 mb-1">Owner reply</div>
          {review.reviewReply.comment}
        </div>
      )}

      {!review.reviewReply && !posted && (
        <div className="mt-4 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Write a reply draft…"
            className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button
              onClick={handleApprove}
              disabled={posting || !draft.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {posting ? 'Posting…' : 'Approve & post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewsInbox({ inbox }: { inbox: ReviewInboxLocation[] }) {
  const [filter, setFilter] = useState<Filter>('unreplied');

  const totals = useMemo(() => {
    const all = inbox.flatMap((l) => l.reviews);
    return {
      unreplied: all.filter((r) => !r.reviewReply).length,
      negative: all.filter((r) => !r.reviewReply && (STARS[r.starRating] ?? 0) > 0 && STARS[r.starRating] <= 2).length,
    };
  }, [inbox]);

  function visible(reviews: GbpReview[]) {
    if (filter === 'all') return reviews;
    const unreplied = reviews.filter((r) => !r.reviewReply);
    if (filter === 'unreplied') return unreplied;
    return unreplied.filter((r) => (STARS[r.starRating] ?? 0) > 0 && STARS[r.starRating] <= 2);
  }

  if (inbox.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
        <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-zinc-900">No locations are being monitored yet</h3>
        <p className="text-zinc-500 mt-1 max-w-md mx-auto text-sm">
          Open a client, connect their Google Business Profile, sync locations, and tick &quot;Monitor reviews&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Locations</div>
          <div className="text-2xl font-semibold text-zinc-900 mt-1">{inbox.length}</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Awaiting reply</div>
          <div className="text-2xl font-semibold text-amber-600 mt-1">{totals.unreplied}</div>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-200 p-5">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">1–2 star, unreplied</div>
          <div className="text-2xl font-semibold text-red-600 mt-1">{totals.negative}</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {([
          ['unreplied', 'Needs reply'],
          ['negative', 'Negative first'],
          ['all', 'All recent'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filter === key ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {inbox.map(({ location, clientName, averageRating, totalReviewCount, reviews, error }) => {
        const shown = visible(reviews);
        return (
          <section key={location.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium text-blue-600">{clientName}</div>
                <h2 className="font-semibold text-zinc-900 truncate">{location.title}</h2>
                {location.address && (
                  <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" /> {location.address}
                  </div>
                )}
              </div>
              {!error && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 shrink-0">
                  <Stars value={Math.round(averageRating)} />
                  <span className="font-medium text-zinc-900">{averageRating.toFixed(1)}</span>
                  <span>({totalReviewCount})</span>
                </div>
              )}
            </div>
            <div className="p-5 space-y-4">
              {error ? (
                <div className="flex items-start gap-2 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                </div>
              ) : shown.length === 0 ? (
                <div className="text-sm text-zinc-500">Nothing here — all caught up.</div>
              ) : (
                shown.map((review) => <ReviewCard key={review.name} review={review} locationId={location.id} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
