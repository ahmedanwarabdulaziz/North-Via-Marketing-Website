'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Star,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Link2Off,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  StarIcon,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface Review {
  name: string;
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: string;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

interface Location {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
  };
  reviews: Review[];
  totalReviewCount: number;
  averageRating: number;
  error?: string;
}

interface Account {
  name: string;
  accountName: string;
  type: string;
  role: string;
}

type StarRatingMap = {
  [key: string]: number;
};

const STAR_RATING_MAP: StarRatingMap = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  STAR_RATING_UNSPECIFIED: 0,
};

export default function ReviewsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [generatingReply, setGeneratingReply] = useState<string>('');
  const [publishingReply, setPublishingReply] = useState<string>('');
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [expandedLocations, setExpandedLocations] = useState<{ [key: string]: boolean }>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [error, setError] = useState<string>('');

  // Check connection status
  useEffect(() => {
    checkConnection();
  }, []);

  // Show toast from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      showToast('success', 'Google account connected successfully!');
      window.history.replaceState({}, '', '/admin/reviews');
    }
    if (params.get('error')) {
      const errorMsg = params.get('error');
      showToast('error', `Connection failed: ${errorMsg}`);
      window.history.replaceState({}, '', '/admin/reviews');
    }
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/google/status');
      const data = await res.json();
      setIsConnected(data.connected);
      if (data.connected) {
        fetchAccounts();
      }
    } catch {
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/google/accounts');
      if (res.status === 401) {
        setIsConnected(false);
        return;
      }
      const data = await res.json();
      setAccounts(data.accounts || []);
      if (data.accounts?.length > 0) {
        setSelectedAccount(data.accounts[0].name);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to fetch accounts');
    }
  };

  const fetchReviews = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setLoadingReviews(true);
    setError('');
    try {
      const res = await fetch(`/api/google/reviews?accountId=${encodeURIComponent(accountId)}`);
      if (res.status === 401) {
        setIsConnected(false);
        return;
      }
      const data = await res.json();
      setLocations(data.locations || []);

      // Auto-expand locations with reviews
      const expanded: { [key: string]: boolean } = {};
      (data.locations || []).forEach((loc: Location) => {
        if (loc.reviews.length > 0) {
          expanded[loc.name] = true;
        }
      });
      setExpandedLocations(expanded);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to fetch reviews');
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchReviews(selectedAccount);
    }
  }, [selectedAccount, fetchReviews]);

  const generateReply = async (review: Review, businessName: string) => {
    setGeneratingReply(review.name);
    try {
      const res = await fetch('/api/gemini/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewText: review.comment || '(No comment, only star rating)',
          starRating: STAR_RATING_MAP[review.starRating] || 0,
          businessName,
          reviewerName: review.reviewer?.displayName || 'Customer',
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setReplyTexts((prev) => ({ ...prev, [review.name]: data.reply }));
      } else {
        showToast('error', 'Failed to generate reply');
      }
    } catch {
      showToast('error', 'Failed to generate reply');
    } finally {
      setGeneratingReply('');
    }
  };

  const publishReply = async (reviewName: string) => {
    const comment = replyTexts[reviewName];
    if (!comment?.trim()) {
      showToast('error', 'Please enter or generate a reply first');
      return;
    }

    setPublishingReply(reviewName);
    try {
      const res = await fetch('/api/google/reviews/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewName, comment: comment.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Reply published successfully!');
        // Remove from unreplied list
        setLocations((prev) =>
          prev.map((loc) => ({
            ...loc,
            reviews: loc.reviews.filter((r) => r.name !== reviewName),
          }))
        );
        setReplyTexts((prev) => {
          const next = { ...prev };
          delete next[reviewName];
          return next;
        });
      } else {
        showToast('error', data.error || 'Failed to publish reply');
      }
    } catch {
      showToast('error', 'Failed to publish reply');
    } finally {
      setPublishingReply('');
    }
  };

  const disconnectGoogle = async () => {
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      setIsConnected(false);
      setAccounts([]);
      setLocations([]);
      setSelectedAccount('');
      showToast('success', 'Google account disconnected');
    } catch {
      showToast('error', 'Failed to disconnect');
    }
  };

  const toggleLocation = (locationName: string) => {
    setExpandedLocations((prev) => ({
      ...prev,
      [locationName]: !prev[locationName],
    }));
  };

  const renderStars = (rating: string | number) => {
    const numRating = typeof rating === 'string' ? STAR_RATING_MAP[rating] || 0 : rating;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            className={`w-4 h-4 ${
              i <= numRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-neutral-200 text-neutral-200 dark:fill-zinc-700 dark:text-zinc-700'
            }`}
          />
        ))}
      </div>
    );
  };

  const totalUnreplied = locations.reduce((sum, loc) => sum + loc.reviews.length, 0);

  return (
    <AdminShell>
      <AdminHeader 
        title="Google Reviews Manager"
        headerStatus={isConnected && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 ml-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Connected
          </span>
        )}
        headerActions={isConnected && (
          <button
            onClick={disconnectGoogle}
            className="text-sm text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 flex items-center gap-2 transition-colors mr-2"
          >
            <Link2Off className="w-4 h-4" />
            <span className="hidden sm:block">Disconnect</span>
          </button>
        )}
      />

      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 w-full">
          {/* Toast notification */}
          {toast && (
            <div
              className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in slide-in-from-right ${
                toast.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Not connected state */}
          {!isLoading && !isConnected && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 p-12 text-center shadow-sm">
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-3">Connect Your Google Account</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                Connect your Google account to manage reviews across all your business profiles.
                We&apos;ll find unreplied reviews and help you respond with AI-generated suggestions.
              </p>
              <a
                href="/api/google/auth"
                className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                Connect Google Account
              </a>
            </div>
          )}

          {/* Connected state */}
          {!isLoading && isConnected && (
            <>
              {/* Account selector */}
              {accounts.length > 1 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 p-5 shadow-sm">
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                    Select Business Account
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-neutral-100"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.name} value={acc.name}>
                        {acc.accountName} ({acc.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Stats bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-1">
                    Business Locations
                  </div>
                  <div className="text-2xl font-semibold">{locations.length}</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-1">
                    Unreplied Reviews
                  </div>
                  <div className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    {totalUnreplied}
                  </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 font-medium mb-1">
                      Status
                    </div>
                    <div className="text-2xl font-semibold">
                      {totalUnreplied === 0 ? '✅ All Clear' : '⚠️ Needs Attention'}
                    </div>
                  </div>
                  <button
                    onClick={() => fetchReviews(selectedAccount)}
                    disabled={loadingReviews}
                    className="p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title="Refresh reviews"
                  >
                    <RefreshCw
                      className={`w-5 h-5 text-neutral-500 ${loadingReviews ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </div>

              {/* Loading reviews */}
              {loadingReviews && (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading reviews from Google...</span>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 flex items-center gap-3 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Locations & Reviews */}
              {!loadingReviews && locations.length > 0 && (
                <div className="space-y-4">
                  {locations.map((location) => (
                    <div
                      key={location.name}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm overflow-hidden"
                    >
                      {/* Location header */}
                      <button
                        onClick={() => toggleLocation(location.name)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                            <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-base">{location.title}</h3>
                            <div className="flex items-center gap-3 mt-0.5">
                              {location.averageRating > 0 && (
                                <div className="flex items-center gap-1.5">
                                  {renderStars(location.averageRating)}
                                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                    ({location.averageRating.toFixed(1)})
                                  </span>
                                </div>
                              )}
                              <span className="text-sm text-neutral-400 dark:text-neutral-500">
                                {location.totalReviewCount} total reviews
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {location.reviews.length > 0 && (
                            <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full">
                              {location.reviews.length} unreplied
                            </span>
                          )}
                          {location.reviews.length === 0 && (
                            <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-full">
                              All replied ✓
                            </span>
                          )}
                          {expandedLocations[location.name] ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </button>

                      {/* Reviews list */}
                      {expandedLocations[location.name] && (
                        <div className="border-t border-neutral-100 dark:border-zinc-800">
                          {location.reviews.length === 0 ? (
                            <div className="px-6 py-8 text-center text-neutral-400 dark:text-neutral-500">
                              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                              <p>All reviews have been replied to!</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-neutral-100 dark:divide-zinc-800">
                              {location.reviews.map((review) => (
                                <div key={review.name} className="px-6 py-5">
                                  {/* Review header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 bg-neutral-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                                        {(review.reviewer?.displayName || 'A')[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {review.reviewer?.displayName || 'Anonymous'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {renderStars(review.starRating)}
                                          <span className="text-xs text-neutral-400">
                                            {new Date(review.createTime).toLocaleDateString()}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Review text */}
                                  {review.comment && (
                                    <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-relaxed mb-4 pl-12">
                                      &ldquo;{review.comment}&rdquo;
                                    </p>
                                  )}
                                  {!review.comment && (
                                    <p className="text-neutral-400 dark:text-neutral-500 text-sm italic mb-4 pl-12">
                                      No comment — only a star rating was left.
                                    </p>
                                  )}

                                  {/* Reply area */}
                                  <div className="pl-12 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => generateReply(review, location.title)}
                                        disabled={generatingReply === review.name}
                                        className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50"
                                      >
                                        {generatingReply === review.name ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Sparkles className="w-4 h-4" />
                                        )}
                                        {generatingReply === review.name
                                          ? 'Generating...'
                                          : 'Generate AI Reply'}
                                      </button>
                                    </div>

                                    {replyTexts[review.name] !== undefined && (
                                      <>
                                        <textarea
                                          value={replyTexts[review.name]}
                                          onChange={(e) =>
                                            setReplyTexts((prev) => ({
                                              ...prev,
                                              [review.name]: e.target.value,
                                            }))
                                          }
                                          rows={4}
                                          className="w-full bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-neutral-100"
                                          placeholder="Edit the reply or write your own..."
                                        />
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => publishReply(review.name)}
                                            disabled={publishingReply === review.name}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm hover:shadow disabled:opacity-50"
                                          >
                                            {publishingReply === review.name ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Send className="w-4 h-4" />
                                            )}
                                            {publishingReply === review.name
                                              ? 'Publishing...'
                                              : 'Confirm & Publish Reply'}
                                          </button>
                                          <button
                                            onClick={() => generateReply(review, location.title)}
                                            disabled={generatingReply === review.name}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                            Regenerate
                                          </button>
                                          <button
                                            onClick={() =>
                                              setReplyTexts((prev) => {
                                                const next = { ...prev };
                                                delete next[review.name];
                                                return next;
                                              })
                                            }
                                            className="text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* No locations */}
              {!loadingReviews && !error && locations.length === 0 && accounts.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 p-12 text-center shadow-sm">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                  <h3 className="text-lg font-semibold mb-2">No Locations Found</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No business locations were found for this account. Make sure your Google Business
                    Profile is verified.
                  </p>
                </div>
              )}

              {/* No accounts */}
              {!loadingReviews && !error && accounts.length === 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 p-12 text-center shadow-sm">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                  <h3 className="text-lg font-semibold mb-2">No Business Accounts Found</h3>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    No Google Business Profile accounts were found for your Google account. Please
                    make sure you have{' '}
                    <a
                      href="https://business.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      verified business profiles
                    </a>
                    .
                  </p>
                </div>
              )}
            </>
          )}
      </div>
    </AdminShell>
  );
}
