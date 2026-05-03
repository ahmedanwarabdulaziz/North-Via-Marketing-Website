'use client';

import { useTransition } from 'react';
import { syncAdsAccounts } from '@/app/actions/google-ads';
import { RefreshCw, BarChart4 } from 'lucide-react';
import { GoogleAdsAccount } from '@/types/database';
import Link from 'next/link';

export function AdsAccountsSelector({ initialAccounts }: { initialAccounts: GoogleAdsAccount[] }) {
  const [isSyncing, startSync] = useTransition();

  const handleSync = () => {
    startSync(async () => {
      const res = await syncAdsAccounts();
      if (!res.success) {
        alert('REST Fetching Error: ' + res.error);
      }
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-6 w-full shadow-sm mb-6 mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-neutral-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-semibold">Managed Ads Accounts</h2>
          <p className="text-xs text-neutral-500 mt-1">Found {initialAccounts.length} clients connected to this API key.</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {initialAccounts.length === 0 ? 'Fetch Available Accounts' : 'Resync Accounts'}
        </button>
      </div>

      {initialAccounts.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-sm">
          No ad accounts registered yet. Click fetch to execute the SDK scan.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {initialAccounts.map((account) => (
            <div 
              key={account.customerId} 
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 transition-colors"
            >
              <div>
                <h4 className="font-semibold">{account.descriptiveName}</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                  ID: {account.customerId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')} 
                  <span className="opacity-50 ml-2">({account.currencyCode})</span>
                </p>
              </div>

              <Link 
                href={`/admin/ads?accountId=${account.customerId}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors text-neutral-700 dark:text-neutral-300"
              >
                <BarChart4 className="w-4 h-4" />
                View Dash
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
