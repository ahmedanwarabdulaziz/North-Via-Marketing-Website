'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, RefreshCw, Unplug, CheckCircle2 } from 'lucide-react';
import { disconnectGoogleAds, syncAdsAccounts, assignAdsAccountToClient } from '@/app/actions/google-ads';
import type { GoogleAdsAccount, ClientProfile } from '@/types/database';

export function GoogleAdsManager({ 
  isConnected, 
  accounts,
  clients 
}: { 
  isConnected: boolean, 
  accounts: GoogleAdsAccount[],
  clients: ClientProfile[]
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  async function handleDisconnect() {
    setIsDisconnecting(true);
    await disconnectGoogleAds();
    setIsDisconnecting(false);
    router.refresh();
  }

  async function handleSync() {
    setIsSyncing(true);
    await syncAdsAccounts();
    setIsSyncing(false);
    router.refresh();
  }

  async function handleAssign(customerId: string, clientId: string) {
    setAssigningId(customerId);
    await assignAdsAccountToClient(customerId, clientId);
    setAssigningId(null);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden mb-8">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Google Ads Integration
          </h2>
          <p className="text-sm text-zinc-500 mt-1">Connect your master Google Ads account to sync client campaigns.</p>
        </div>
        
        {!isConnected ? (
          <a
            href="/api/admin/google-ads/auth"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20"
          >
            Connect Google Ads
          </a>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-xl hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Accounts
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <Unplug className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
      
      {isConnected && accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-100">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Customer ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Assigned Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900">{account.descriptiveName}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{account.currencyCode} • {account.timeZone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-600 font-mono">
                    {account.customerId}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 max-w-xs">
                      {assigningId === account.customerId ? (
                        <div className="animate-pulse h-9 w-full bg-zinc-100 rounded-lg"></div>
                      ) : (
                        <select 
                          className="w-full text-sm bg-white border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          value={clients.find(c => c.brandName === account.brandName)?.id || ''}
                          onChange={(e) => handleAssign(account.customerId, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id}>{c.brandName}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isConnected && accounts.length === 0 && (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-zinc-900">Connected Successfully</h3>
          <p className="text-zinc-500 mt-1 max-w-sm mb-6">Your account is connected. Click sync to pull in your ad accounts.</p>
        </div>
      )}
    </div>
  );
}
