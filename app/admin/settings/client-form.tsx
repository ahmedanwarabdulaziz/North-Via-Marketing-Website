'use client';

import { useTransition } from 'react';
import { disconnectGoogleAds } from '@/app/actions/google-ads';
import { Link2, Link2Off, Loader2 } from 'lucide-react';

export function AdminSettingsForm({ isConnected }: { isConnected: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleDisconnect = () => {
    if (confirm('Are you absolutely sure you want to disconnect? All automated Google Ads daily reports will halt.')) {
      startTransition(async () => {
        await disconnectGoogleAds();
      });
    }
  };

  if (isConnected) {
    return (
      <button 
        onClick={handleDisconnect}
        disabled={isPending}
        className="px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
        Disconnect Google Ads
      </button>
    );
  }

  return (
    <a 
      href="/api/admin/google-ads/auth"
      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
    >
      <Link2 className="w-4 h-4" />
      Connect Google Ads
    </a>
  );
}
