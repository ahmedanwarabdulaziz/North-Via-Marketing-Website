'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleAdsAccount, ClientProfile } from '@/types/database';
import { fetchCustomerMetrics, fetchCampaignMetrics, fetchSearchTermMetrics, fetchDeviceMetrics, fetchGeographicMetrics } from '@/app/actions/ads-reports';
import { ReviewInsightsModal } from './review-insights-modal';
import { Loader2, TrendingUp, TrendingDown, MousePointerClick, Eye, DollarSign, Calendar, ChevronUp, ChevronDown, Minus, Search, FileText, Layers, Target, MapPin, MonitorSmartphone, Globe, Send, FileEdit } from 'lucide-react';
import { calculateDateWindows, Timeframe } from '@/lib/date-utils';

export function AdsDashboardClient({ 
  accounts, 
  clients,
  selectedTargetId 
}: { 
  accounts: GoogleAdsAccount[], 
  clients: ClientProfile[],
  selectedTargetId: string | null
}) {
  const router = useRouter();
  
  const [timeframe, setTimeframe] = useState<Timeframe>('THIS_WEEK');
  const [loading, setLoading] = useState(true);
  
  // Array of data for each active account we are fetching
  const [accountStreams, setAccountStreams] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMassEmail = async () => {
    if (!selectedTargetId || !targetClient) {
      alert("Only registered CRM Clients can receive mass emails (must have an associated profile and emails).");
      return;
    }
    // We open the editor instead of blinding generating:
    setIsModalOpen(true);
  };

  // Figure out if target is a Client or an Unlinked Account
  const targetClient = clients.find(c => c.id === selectedTargetId);
  
  // The list of Ad Accounts we need to fetch data for.
  // If it's a Client, map over linkedGoogleAdsIds.
  // If it's an Unlinked Account, just use selectedTargetId.
  const targetAccounts = targetClient ? 
    targetClient.linkedGoogleAdsIds.map(id => accounts.find(a => a.customerId === id)).filter(Boolean) : 
    (accounts.find(a => a.customerId === selectedTargetId) ? [accounts.find(a => a.customerId === selectedTargetId)] : []);

  // Filter out accounts that are ALREADY linked to a CRM Client to populate the "Unlinked" list
  const linkedIds = new Set(clients.flatMap(c => c.linkedGoogleAdsIds || []));
  const unlinkedAccounts = accounts.filter(a => !linkedIds.has(a.customerId));

  const bounds = calculateDateWindows(timeframe);

  useEffect(() => {
    if (!selectedTargetId || targetAccounts.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchAllData = async () => {
      const streams = [];

      for (const acc of targetAccounts) {
        if (!acc) continue;
        const [metricsRes, pastMetricsRes, campaignsRes, searchTermsRes, devicesRes, geoRes] = await Promise.all([
          fetchCustomerMetrics(acc.customerId, bounds.currentStart, bounds.currentEnd),
          fetchCustomerMetrics(acc.customerId, bounds.pastStart, bounds.pastEnd),
          fetchCampaignMetrics(acc.customerId, bounds.currentStart, bounds.currentEnd),
          fetchSearchTermMetrics(acc.customerId, bounds.currentStart, bounds.currentEnd),
          fetchDeviceMetrics(acc.customerId, bounds.currentStart, bounds.currentEnd),
          fetchGeographicMetrics(acc.customerId, bounds.currentStart, bounds.currentEnd)
        ]);

        streams.push({
          account: acc,
          metrics: metricsRes.success ? metricsRes.data : null,
          pastMetrics: pastMetricsRes.success ? pastMetricsRes.data : null,
          campaigns: campaignsRes.success ? campaignsRes.campaigns : [],
          searchTerms: searchTermsRes.success ? searchTermsRes.searchTerms : [],
          devices: devicesRes.success ? devicesRes.devices : [],
          locations: geoRes.success ? geoRes.locations : []
        });
      }

      setAccountStreams(streams);
      setLoading(false);
    };

    fetchAllData();
  }, [selectedTargetId, timeframe]);

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/admin/ads?accountId=${e.target.value}`);
  };

  if (!selectedTargetId && accounts.length === 0) {
    return <div className="text-center py-24 text-neutral-500">No managed accounts found. Register an account natively in System Settings first.</div>;
  }

  return (
    <div className="w-full">
      {/* Dynamic Top Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 md:p-6 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
            Viewing: <span className="text-blue-600 dark:text-blue-400">{targetClient ? targetClient.businessName : targetAccounts[0]?.descriptiveName}</span>
          </h2>
          <p className="text-sm text-neutral-500 flex items-center gap-1.5 mt-1 font-medium">
            <Layers className="w-3.5 h-3.5" />
            {targetClient ? `${targetAccounts.length} Connected Ad Account(s)` : '1 Unlinked Ad Account'}
          </p>
          <div className="flex flex-col text-[11px] font-bold text-neutral-500 dark:text-neutral-400 mt-3 space-y-1 uppercase tracking-wider">
            <span className="bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 px-2.5 py-1 rounded-md w-fit shadow-sm">
              Current: <span className="text-blue-600 dark:text-blue-400 ml-1">{bounds.currentStart} to {bounds.currentEnd}</span>
            </span>
            <span className="bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 px-2.5 py-1 rounded-md w-fit shadow-sm">
              Previous: <span className="text-neutral-600 dark:text-neutral-300 ml-1">{bounds.pastStart} to {bounds.pastEnd}</span>
            </span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {/* PDF Report Button */}
          <button 
            onClick={() => window.open(`/admin/ads/print?targetId=${selectedTargetId}&timeframe=${timeframe}`, '_blank')}
            className="flex items-center gap-2 px-4 py-3 md:py-2.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-white text-sm font-semibold rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors shrink-0 w-full md:w-auto justify-center shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Super PDF
          </button>
          
          <button 
            onClick={handleMassEmail}
            disabled={!targetClient || accountStreams.length === 0}
            className="flex items-center gap-2 px-4 py-3 md:py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors shrink-0 w-full md:w-auto justify-center shadow-lg shadow-blue-500/20 disabled:opacity-50"
            title={!targetClient ? "Must select a CRM Client to email" : ""}
          >
            <FileEdit className="w-4 h-4" />
            Draft AI & Dispatch
          </button>

          <div className="relative w-full md:w-56">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-neutral-400" />
            </div>
            <select 
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              className="pl-9 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-sm font-semibold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-sm transition-colors cursor-pointer outline-none text-neutral-900 dark:text-white"
            >
              <option value="THIS_WEEK">This Week (Mon-Sun)</option>
              <option value="THIS_MONTH">This Month vs Last</option>
              <option value="THIS_YEAR">This Year (YTD)</option>
            </select>
          </div>

          <select 
            value={selectedTargetId || ''}
            onChange={handleTargetChange}
            className="bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-sm font-semibold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full md:w-64 p-2.5 shadow-sm transition-colors cursor-pointer outline-none text-neutral-900 dark:text-white"
          >
            <optgroup label="--- ACTIVE CLIENTS (CRM) ---">
              {clients.map(c => (
                <option key={`client-${c.id}`} value={c.id}>🎯 {c.businessName}</option>
              ))}
            </optgroup>
            
            <optgroup label="--- UNLINKED ACCOUNTS ---">
              {unlinkedAccounts.map(a => (
                <option key={`unlinked-${a.customerId}`} value={a.customerId}>⚠️ {a.descriptiveName}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {targetClient && (targetClient.mainGoal || targetClient.targetCostPerLead || (targetClient.targetCities && targetClient.targetCities.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-6 py-5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          {targetClient.mainGoal && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"><Target className="w-4 h-4" /></div>
              <div>
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Primary Objective</h4>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">{targetClient.mainGoal}</p>
              </div>
            </div>
          )}
          {targetClient.targetCostPerLead && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><TrendingDown className="w-4 h-4" /></div>
              <div>
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Target Acquisition Cost</h4>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-snug font-mono">${targetClient.targetCostPerLead.toFixed(2)} CPL</p>
              </div>
            </div>
          )}
          {targetClient.targetCities && targetClient.targetCities.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"><MapPin className="w-4 h-4" /></div>
              <div>
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Target Geographies</h4>
                <p className="text-sm font-bold text-neutral-900 dark:text-white leading-snug truncate max-w-[200px]" title={targetClient.targetCities.join(', ')}>{targetClient.targetCities.join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-neutral-500 font-medium tracking-tight">Synchronizing parallel Google Ads data nodes...</p>
        </div>
      ) : targetAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-2xl border border-neutral-200 dark:border-zinc-800 text-center shadow-sm">
          <Layers className="w-12 h-12 text-neutral-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Integration Offline</h3>
          <p className="text-neutral-500 max-w-sm mt-2 text-sm font-medium">The selected client does not have any synchronized Google Ads accounts linked to their profile.</p>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {accountStreams.map((stream, idx) => (
            <AccountDashboardBlock key={stream.account?.customerId || idx} stream={stream} targetClient={targetClient} />
          ))}
        </div>
      )}
      
      {/* Editor Modal */}
      {targetClient && (
        <ReviewInsightsModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          accountStreams={accountStreams}
          timeframe={timeframe}
          bounds={bounds}
          targetClient={targetClient}
          clientId={targetClient.id!}
        />
      )}
    </div>
  );
}

// Separate component to elegantly stack multiple account arrays continuously without blending DBs
function AccountDashboardBlock({ stream, targetClient }: { stream: any, targetClient?: any }) {
  const { account, metrics, pastMetrics, campaigns, searchTerms, devices, locations } = stream;
  
  if (!account) return null;

  const getDelta = (current: number, past: number) => {
    if (!past || past === 0) return current > 0 ? 100 : 0;
    return ((current - past) / past) * 100;
  };

  return (
    <div className="relative pt-6 border-t-[4px] border-neutral-200 dark:border-zinc-800 mt-12 first:mt-0 first:border-0 first:pt-0">
      <div className="absolute -top-[16px] left-4 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-4 py-1 rounded-full text-xs font-black tracking-wider border-2 border-white dark:border-zinc-950 flex items-center gap-2 shadow-sm uppercase">
        <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
        {account.descriptiveName}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-4">
        <KpiCard 
          title="Total Spend" 
          value={metrics?.cost ? `$${metrics.cost.toFixed(2)}` : '$0.00'} 
          pastValue={pastMetrics?.cost ? `$${pastMetrics.cost.toFixed(2)}` : '$0.00'} 
          icon={<DollarSign className="w-4 h-4 text-blue-500" />} 
          delta={getDelta(metrics?.cost || 0, pastMetrics?.cost || 0)}
          inverseColor={true} 
        />
        <KpiCard 
          title="Impressions" 
          value={metrics?.impressions?.toLocaleString() || '0'} 
          pastValue={pastMetrics?.impressions?.toLocaleString() || '0'} 
          icon={<Eye className="w-4 h-4 text-purple-500" />} 
          delta={getDelta(metrics?.impressions || 0, pastMetrics?.impressions || 0)}
        />
        <KpiCard 
          title="Total Clicks" 
          value={metrics?.clicks?.toLocaleString() || '0'} 
          pastValue={pastMetrics?.clicks?.toLocaleString() || '0'} 
          icon={<MousePointerClick className="w-4 h-4 text-green-500" />} 
          delta={getDelta(metrics?.clicks || 0, pastMetrics?.clicks || 0)}
        />
        {targetClient?.primaryObjective === 'traffic_optimization' ? (
          <KpiCard 
            title="Avg. Cost/Click" 
            value={`$${metrics?.clicks > 0 ? (metrics.cost / metrics.clicks).toFixed(2) : '0.00'}`} 
            pastValue={`$${pastMetrics?.clicks > 0 ? (pastMetrics.cost / pastMetrics.clicks).toFixed(2) : '0.00'}`} 
            icon={<TrendingDown className="w-4 h-4 text-emerald-500" />} 
            delta={getDelta((metrics?.cost / (metrics?.clicks || 1)) || 0, (pastMetrics?.cost / (pastMetrics?.clicks || 1)) || 0)}
            inverseColor={true}
          />
        ) : (
          <KpiCard 
            title="Conversions" 
            value={metrics?.conversions?.toFixed(1) || '0'} 
            pastValue={pastMetrics?.conversions?.toFixed(1) || '0'} 
            icon={<TrendingUp className="w-4 h-4 text-orange-500" />} 
            delta={getDelta(metrics?.conversions || 0, pastMetrics?.conversions || 0)}
          />
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Active Campaigns Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-neutral-50/80 dark:bg-zinc-800/50 text-neutral-500 dark:text-neutral-400 font-semibold tracking-tight">
              <tr>
                <th className="px-5 py-3.5">Campaign Target</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Spend</th>
                <th className="px-5 py-3.5 text-right">Impr.</th>
                <th className="px-5 py-3.5 text-right">Clicks</th>
                {targetClient?.primaryObjective === 'traffic_optimization' ? (
                  <th className="px-5 py-3.5 text-right">Avg CPC</th>
                ) : (
                  <th className="px-5 py-3.5 text-right">Conv.</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-neutral-500 font-medium">No campaigns detected for this profile block.</td>
                </tr>
              ) : (
                campaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/20">
                    <td className="px-5 py-3.5 font-bold text-neutral-900 dark:text-neutral-100">{camp.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold uppercase tracking-wider border ${camp.status === 'ENABLED' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400' : 'bg-neutral-50 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400'}`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-neutral-700 dark:text-neutral-300">${camp.cost.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-neutral-700 dark:text-neutral-300">{camp.impressions.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-neutral-700 dark:text-neutral-300">{camp.clicks.toLocaleString()}</td>
                    {targetClient?.primaryObjective === 'traffic_optimization' ? (
                      <td className="px-5 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">${camp.clicks > 0 ? (camp.cost / camp.clicks).toFixed(2) : '0.00'}</td>
                    ) : (
                      <td className="px-5 py-3.5 text-right font-mono text-blue-600 dark:text-blue-400 font-black">{camp.conversions.toFixed(1)}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-900">
          <h3 className="font-semibold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
            <Search className="w-4 h-4 text-neutral-400" />
            Top Keyword Pulls
          </h3>
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 px-3 py-1 rounded-lg">{searchTerms.length} Keywords Data</span>
        </div>
        <div className="max-h-[600px] overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-neutral-50/90 dark:bg-zinc-800/90 text-neutral-500 dark:text-neutral-400 font-semibold tracking-tight sticky top-0 backdrop-blur-sm z-10 shadow-sm">
              <tr>
                <th className="px-5 py-3.5">Search Term / Query</th>
                <th className="px-5 py-3.5 min-w-48">Ad Group Origin</th>
                <th className="px-5 py-3.5 text-right">Spend</th>
                <th className="px-5 py-3.5 text-right">Clicks</th>
                <th className="px-5 py-3.5 text-right">CTR</th>
                {targetClient?.primaryObjective === 'traffic_optimization' ? (
                  <>
                    <th className="px-5 py-3.5 text-right">Avg CPC</th>
                    <th className="px-5 py-3.5 text-right font-bold text-neutral-900 dark:text-white">Impressions</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3.5 text-right">Leads</th>
                    <th className="px-5 py-3.5 text-right font-bold text-neutral-900 dark:text-white">Cost/Lead</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
              {searchTerms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-500 font-medium">No search terms harvested.</td>
                </tr>
              ) : (
                [...searchTerms].sort((a, b) => b.clicks - a.clicks).map((term: any, index: number) => (
                  <tr key={`${term.searchTerm}-${index}`} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/20">
                    <td className="px-5 py-3 font-bold text-neutral-900 dark:text-neutral-100">{term.searchTerm}</td>
                    <td className="px-5 py-3 text-xs font-medium text-neutral-500 truncate max-w-[200px]">{term.adGroupName}</td>
                    <td className="px-5 py-3 text-right font-mono text-neutral-500">${term.cost.toFixed(2)}</td>
                    <td className="px-5 py-3 text-right font-mono text-neutral-500">{term.clicks.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-neutral-500">{(term.ctr * 100).toFixed(1)}%</td>
                    {targetClient?.primaryObjective === 'traffic_optimization' ? (
                      <>
                        <td className="px-5 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">${term.clicks > 0 ? (term.cost / term.clicks).toFixed(2) : '-'}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{term.impressions?.toLocaleString() || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-5 py-3 text-right font-mono text-blue-600 dark:text-blue-400 font-bold">{term.conversions.toFixed(1)}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{term.conversions > 0 ? `$${term.costPerConversion.toFixed(2)}` : '-'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid for Devices and Geographic Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Geographic Top Yields */}
        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-900">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
              <Globe className="w-4 h-4 text-blue-500" />
              Geographic Heatmap
            </h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50/90 dark:bg-zinc-800/90 text-neutral-500 dark:text-neutral-400 font-semibold tracking-tight">
                <tr>
                  <th className="px-4 py-3">City / Origin</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  {targetClient?.primaryObjective === 'traffic_optimization' ? (
                    <>
                      <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">Clicks</th>
                      <th className="px-4 py-3 text-right">Avg CPC</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">Leads</th>
                      <th className="px-4 py-3 text-right">Cost/Lead</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
                {(!locations || locations.length === 0) ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No geo data acquired.</td></tr>
                ) : (
                  locations.map((loc: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/20">
                      <td className="px-4 py-3 font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[150px]" title={loc.city}>{loc.city}</td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-500">${loc.cost.toFixed(2)}</td>
                      {targetClient?.primaryObjective === 'traffic_optimization' ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">{loc.clicks?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{loc.clicks > 0 ? `$${(loc.cost / loc.clicks).toFixed(2)}` : '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 font-black">{loc.conversions.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{loc.conversions > 0 ? `$${loc.costPerConversion.toFixed(2)}` : '-'}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Matrix */}
        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-neutral-50/50 dark:bg-zinc-900">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-neutral-900 dark:text-white">
              <MonitorSmartphone className="w-4 h-4 text-purple-500" />
              Device Funnel Analysis
            </h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left h-full">
              <thead className="bg-neutral-50/90 dark:bg-zinc-800/90 text-neutral-500 dark:text-neutral-400 font-semibold tracking-tight">
                <tr>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3 text-right">Spend</th>
                  {targetClient?.primaryObjective === 'traffic_optimization' ? (
                    <>
                      <th className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">Clicks</th>
                      <th className="px-4 py-3 text-right">Avg CPC</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">Leads</th>
                      <th className="px-4 py-3 text-right">CPA</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
                {(!devices || devices.length === 0) ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-500">No device data acquired.</td></tr>
                ) : (
                  devices.map((dev: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50/50 dark:hover:bg-zinc-800/20">
                      <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">{dev.device}</td>
                      <td className="px-4 py-3 text-right font-mono text-neutral-500">${dev.cost.toFixed(2)}</td>
                      {targetClient?.primaryObjective === 'traffic_optimization' ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black">{dev.clicks?.toLocaleString() || '0'}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{dev.clicks > 0 ? `$${(dev.cost / dev.clicks).toFixed(2)}` : '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 font-black">{dev.conversions.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 dark:text-white">{dev.conversions > 0 ? `$${dev.costPerConversion.toFixed(2)}` : '-'}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, pastValue, icon, delta, inverseColor = false }: { title: string, value: string, pastValue: string, icon: React.ReactNode, delta: number, inverseColor?: boolean }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;

  const positiveColor = inverseColor ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const negativeColor = inverseColor ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

  const DeltaIcon = isZero ? Minus : (isPositive ? ChevronUp : ChevronDown);
  const colorClass = isZero ? 'text-neutral-500' : (isPositive ? positiveColor : negativeColor);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-50 border border-neutral-100 dark:border-zinc-700/50 dark:bg-zinc-800 rounded-xl shadow-inner">
            {icon}
          </div>
          <h4 className="text-sm font-bold tracking-tight text-neutral-500 dark:text-neutral-400">{title}</h4>
        </div>
        <div className={`flex items-center gap-0.5 text-xs font-black px-2 py-1 rounded-full ${isZero ? 'bg-neutral-100 dark:bg-zinc-800' : (isPositive ? (inverseColor ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20') : (inverseColor ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'))} ${colorClass}`}>
          <DeltaIcon className="w-3 h-3" />
          {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <p className="text-3xl font-black font-mono tracking-tight text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-neutral-400 mt-2 border-t border-neutral-100 dark:border-zinc-800/50 pt-2">
        Previous Period: {pastValue}
      </p>
    </div>
  );
}
