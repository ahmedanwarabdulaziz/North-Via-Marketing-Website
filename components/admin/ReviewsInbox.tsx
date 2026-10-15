'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, RefreshCw, Send, SkipForward, Sparkles, CheckCircle2, AlertTriangle, MessageSquare, Pencil } from 'lucide-react';
import { approveReview, regenerateDraft, skipReview } from '@/app/actions/google-business';
import type { GbpStoredReview } from '@/types/database';

export type InboxReview = GbpStoredReview & { id: string; clientName: string };

interface SyncInfo {
  finishedAt: string;
  newReviews: number;
  draftsCreated: number;
  draftsDeferred: number;
  errors: Array<{ location: string; error: string }>;
}

type Tab = 'five' | 'review' | 'posted' | 'skipped';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={value ? `${value} out of 5 stars` : 'No rating'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} />
      ))}
    </span>
  );
}

function ReviewHeader({ review }: { review: InboxReview }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-medium text-blue-600 truncate">{review.clientName} · {review.locationTitle}</div>
        <div className="font-medium text-zinc-900 mt-0.5">{review.reviewerName || 'Anonymous'}</div>
        <div className="flex items-center gap-2 mt-1">
          <Stars value={review.rating} />
          <span className="text-xs text-zinc-500">{new Date(review.createTime).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

function ReviewText({ comment }: { comment: string }) {
  return (
    <p className="text-sm text-zinc-700 mt-3 whitespace-pre-line">
      {comment || <span className="italic text-zinc-400">Rating only, no written review.</span>}
    </p>
  );
}

/** One-by-one approval card with editable draft. */
function ApprovalCard({ review }: { review: InboxReview }) {
  const router = useRouter();
  const [draft, setDraft] = useState(review.draft || '');
  const [busy, setBusy] = useState<'post' | 'regen' | 'skip' | null>(null);
  const [error, setError] = useState<string | null>(review.status === 'needs_draft' ? review.draftError || null : null);

  async function act(kind: 'post' | 'regen' | 'skip') {
    if (kind === 'post' && !confirm('Post this reply publicly on Google?')) return;
    setBusy(kind);
    setError(null);
    const result =
      kind === 'post' ? await approveReview(review.id, draft)
      : kind === 'regen' ? await regenerateDraft(review.id)
      : await skipReview(review.id);
    setBusy(null);
    if (!result.success) {
      setError(result.error || 'Something went wrong.');
      return;
    }
    if (kind === 'regen' && 'draft' in result && typeof result.draft === 'string') setDraft(result.draft);
    router.refresh();
  }

  const negative = review.rating > 0 && review.rating <= 2;

  return (
    <div className={`p-5 rounded-2xl border ${negative ? 'border-red-200 bg-red-50/30' : 'border-zinc-200 bg-white'}`}>
      <ReviewHeader review={review} />
      <ReviewText comment={review.comment} />
      <div className="mt-4">
        <div className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> {review.draft ? 'AI draft, edit freely' : 'No draft yet'}
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Write a reply or click Regenerate…"
          className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>
      {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
      <div className="flex flex-wrap gap-2 justify-end mt-3">
        <button onClick={() => act('skip')} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-600 rounded-lg hover:bg-zinc-100 disabled:opacity-50">
          <SkipForward className="w-4 h-4" /> Skip
        </button>
        <button onClick={() => act('regen')} disabled={busy !== null} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${busy === 'regen' ? 'animate-spin' : ''}`} /> Regenerate
        </button>
        <button onClick={() => act('post')} disabled={busy !== null || !draft.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <Send className="w-4 h-4" /> {busy === 'post' ? 'Posting…' : 'Approve & post'}
        </button>
      </div>
    </div>
  );
}

function FiveStarQueue({ reviews }: { reviews: InboxReview[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(reviews.map((r) => r.id)));
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const bulkIds = reviews.filter((r) => selected.has(r.id) && !editing.has(r.id)).map((r) => r.id);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function approveSelected() {
    if (!confirm(`Post ${bulkIds.length} five-star repl${bulkIds.length === 1 ? 'y' : 'ies'} publicly on Google?`)) return;
    setPosting(true);
    setMessage(null);
    const res = await fetch('/api/admin/reviews/approve-five-star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewIds: bulkIds }),
    });
    const data = await res.json().catch(() => ({}));
    setPosting(false);
    if (!res.ok) {
      setMessage(data.error || 'Bulk approval failed.');
    } else {
      const failed = (data.results || []).filter((r: { success: boolean }) => !r.success).length;
      setMessage(`Posted ${data.posted} repl${data.posted === 1 ? 'y' : 'ies'}${failed ? `, ${failed} failed` : ''}.`);
    }
    router.refresh();
  }

  if (reviews.length === 0) return <Empty text="No 5★ drafts waiting. Nice." />;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={selected.size === reviews.length}
            onChange={(e) => setSelected(e.target.checked ? new Set(reviews.map((r) => r.id)) : new Set())}
            className="w-4 h-4 rounded border-zinc-300 text-blue-600"
          />
          Select all ({reviews.length})
        </label>
        <div className="flex items-center gap-3">
          {message && <span className="text-sm text-zinc-600">{message}</span>}
          <button
            onClick={approveSelected}
            disabled={posting || bulkIds.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {posting ? 'Posting…' : `Approve ${bulkIds.length} selected`}
          </button>
        </div>
      </div>

      {reviews.map((review) =>
        editing.has(review.id) ? (
          <ApprovalCard key={review.id} review={review} />
        ) : (
          <div key={review.id} className="p-5 rounded-2xl border border-zinc-200 bg-white flex gap-4">
            <input
              type="checkbox"
              checked={selected.has(review.id)}
              onChange={() => toggle(review.id)}
              className="w-4 h-4 mt-1 rounded border-zinc-300 text-blue-600 shrink-0"
              aria-label="Include in bulk approval"
            />
            <div className="flex-1 min-w-0">
              <ReviewHeader review={review} />
              <ReviewText comment={review.comment} />
              <div className="mt-3 pl-3 border-l-2 border-emerald-300 text-sm text-zinc-800 whitespace-pre-line">{review.draft}</div>
              <button
                onClick={() => setEditing((s) => new Set(s).add(review.id))}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit this one
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function HistoryList({ reviews }: { reviews: InboxReview[] }) {
  if (reviews.length === 0) return <Empty text="Nothing here yet." />;
  return (
    <div className="space-y-3">
      {reviews.slice(0, 50).map((review) => (
        <div key={review.id} className="p-5 rounded-2xl border border-zinc-200 bg-white">
          <ReviewHeader review={review} />
          <ReviewText comment={review.comment} />
          {review.postedReply && (
            <div className="mt-3 pl-3 border-l-2 border-zinc-200 text-sm text-zinc-600 whitespace-pre-line">
              <div className="text-xs text-zinc-400 mb-1">Posted {review.postedAt ? new Date(review.postedAt).toLocaleString() : ''}</div>
              {review.postedReply}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
      <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
      {text}
    </div>
  );
}

export function ReviewsInbox({ reviews, lastSync, hasLocations }: { reviews: InboxReview[]; lastSync: SyncInfo | null; hasLocations: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('five');
  const [clientFilter, setClientFilter] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const clients = useMemo(
    () => Array.from(new Map(reviews.map((r) => [r.clientId, r.clientName])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [reviews]
  );

  const groups = useMemo(() => {
    const scoped = clientFilter ? reviews.filter((r) => r.clientId === clientFilter) : reviews;
    const isFiveReady = (r: InboxReview) => r.rating === 5 && r.status === 'draft_ready';
    return {
      five: scoped.filter(isFiveReady),
      // Lowest ratings first so complaints are handled before praise.
      review: scoped
        .filter((r) => (r.status === 'draft_ready' || r.status === 'needs_draft') && !isFiveReady(r))
        .sort((a, b) => (a.rating || 6) - (b.rating || 6) || b.createTime.localeCompare(a.createTime)),
      posted: scoped.filter((r) => r.status === 'posted').sort((a, b) => (b.postedAt || '').localeCompare(a.postedAt || '')),
      skipped: scoped.filter((r) => r.status === 'skipped'),
    };
  }, [reviews, clientFilter]);

  async function checkNow() {
    setChecking(true);
    setCheckError(null);
    const res = await fetch('/api/admin/reviews/sync', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setChecking(false);
    if (!res.ok) setCheckError(data.error || 'Check failed.');
    router.refresh();
  }

  if (!hasLocations) {
    return (
      <Empty text='No locations are monitored yet. Open a client, connect their Google Business Profile, sync locations and tick "Monitor reviews".' />
    );
  }

  const tabs: Array<[Tab, string, number]> = [
    ['five', '5★ ready', groups.five.length],
    ['review', '4★ & below', groups.review.length],
    ['posted', 'Posted', groups.posted.length],
    ['skipped', 'Skipped', groups.skipped.length],
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-sm text-zinc-600">
          {lastSync ? (
            <>
              Last checked <span className="font-medium text-zinc-900">{new Date(lastSync.finishedAt).toLocaleString()}</span>
              {' · '}{lastSync.newReviews} new · {lastSync.draftsCreated} drafted
              {lastSync.draftsDeferred > 0 && <> · {lastSync.draftsDeferred} queued for next run</>}
            </>
          ) : (
            'Not checked yet.'
          )}
          {lastSync?.errors?.map((e) => (
            <div key={e.location} className="flex items-start gap-1.5 text-red-600 mt-1">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {e.location}: {e.error}
            </div>
          ))}
          {checkError && <div className="text-red-600 mt-1">{checkError}</div>}
        </div>
        <button
          onClick={checkNow}
          disabled={checking}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Check now'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                tab === key ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {label} <span className={tab === key ? 'text-zinc-300' : 'text-zinc-400'}>{count}</span>
            </button>
          ))}
        </div>
        {clients.length > 1 && (
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2"
          >
            <option value="">All clients</option>
            {clients.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'five' && <FiveStarQueue key={groups.five.map((r) => r.id).join()} reviews={groups.five} />}
      {tab === 'review' &&
        (groups.review.length === 0 ? (
          <Empty text="No reviews need individual approval." />
        ) : (
          <div className="space-y-4">
            {groups.review.map((review) => <ApprovalCard key={`${review.id}-${review.draftGeneratedAt}`} review={review} />)}
          </div>
        ))}
      {tab === 'posted' && <HistoryList reviews={groups.posted} />}
      {tab === 'skipped' && <HistoryList reviews={groups.skipped} />}
    </div>
  );
}
