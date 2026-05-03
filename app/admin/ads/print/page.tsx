import { checkGoogleAdsConnection } from '@/app/actions/google-ads';
import { fetchCustomerMetrics, fetchCampaignMetrics, fetchDeviceMetrics, fetchGeographicMetrics } from '@/app/actions/ads-reports';
import { generateExecutiveSummary, generateOverallConclusion } from '@/app/actions/generate-report';
import { db } from '@/lib/firebase';
import { GoogleAdsAccount, ClientProfile } from '@/types/database';
import { calculateDateWindows, Timeframe } from '@/lib/date-utils';
import { PrintTrigger } from './print-trigger';
import { BarChart3, Layers, Target, TrendingDown, MapPin } from 'lucide-react';

export default async function PrintReportPage({ searchParams }: { searchParams: Promise<{ targetId?: string, accountId?: string, timeframe?: Timeframe }> }) {
  const { isConnected } = await checkGoogleAdsConnection();
  if (!isConnected) return <div className="p-12 text-black font-sans">Not Connected API</div>;

  const resolvedParams = await searchParams;
  const targetId = resolvedParams.targetId || resolvedParams.accountId;
  if (!targetId) return <div className="p-12 text-black font-sans">Invalid Target ID. Cannot resolve report.</div>;

  const timeframe = resolvedParams.timeframe || 'THIS_MONTH';
  const bounds = calculateDateWindows(timeframe);

  // 1. Determine if Target is a CRM Client or a raw single Account
  let crmClient: ClientProfile | null = null;
  let accountIdsToQuery: string[] = [];

  const clientDoc = await db.collection('clients').doc(targetId).get();
  if (clientDoc.exists) {
    crmClient = { id: clientDoc.id, ...clientDoc.data() } as ClientProfile;
    accountIdsToQuery = crmClient.linkedGoogleAdsIds || [];
  } else {
    accountIdsToQuery = [targetId];
    // Fallback: If printing an unlinked account, see if it was secretly linked to any CRM Client anyway
    const cq = await db.collection('clients').where('linkedGoogleAdsIds', 'array-contains', targetId).limit(1).get();
    if (!cq.empty) crmClient = { id: cq.docs[0].id, ...cq.docs[0].data() } as ClientProfile;
  }

  if (accountIdsToQuery.length === 0) {
    return <div className="p-12 text-black font-sans">Error: Target has no linked Google Ads accounts to fetch.</div>;
  }

  // 2. Resolve native Google Ads Objects
  const accountsData: GoogleAdsAccount[] = [];
  for (const id of accountIdsToQuery) {
    const doc = await db.collection('google_ads_accounts').doc(id).get();
    if (doc.exists) accountsData.push(doc.data() as GoogleAdsAccount);
  }

  let totalCost = 0;
  let totalConversions = 0;

  // 3. Multi-Pipeline Parallel API Execution & Generative Summaries
  const resolvedStreams = await Promise.all(accountsData.map(async (account) => {
    const [metricsRes, pastMetricsRes, campaignsRes, devicesRes, geoRes] = await Promise.all([
      fetchCustomerMetrics(account.customerId, bounds.currentStart, bounds.currentEnd),
      fetchCustomerMetrics(account.customerId, bounds.pastStart, bounds.pastEnd),
      fetchCampaignMetrics(account.customerId, bounds.currentStart, bounds.currentEnd),
      fetchDeviceMetrics(account.customerId, bounds.currentStart, bounds.currentEnd),
      fetchGeographicMetrics(account.customerId, bounds.currentStart, bounds.currentEnd)
    ]);
    
    const metrics = metricsRes.data;
    const pastMetrics = pastMetricsRes.data;
    const campaigns = campaignsRes.campaigns || [];
    const devices = devicesRes.success ? devicesRes.devices : [];
    const locations = geoRes.success ? geoRes.locations : [];
    
    if (metrics?.cost) totalCost += metrics.cost;
    if (metrics?.conversions) totalConversions += metrics.conversions;

    const { summary, error } = await generateExecutiveSummary(
      metrics, pastMetrics, account.descriptiveName, timeframe, bounds, 
      crmClient || undefined
    );

    return { account, metrics, pastMetrics, campaigns, devices, locations, summary, summaryError: error };
  }));

  // 4. Generate Holistic AI Conclusion
  let globalConclusionStr = null;
  let globalConclusionError = null;

  if (resolvedStreams.length > 1 || crmClient) {
     const titleTarget = crmClient?.businessName || accountsData[0]?.descriptiveName || 'Client';
     const res = await generateOverallConclusion(
       titleTarget,
       timeframe,
       totalCost,
       totalConversions,
       crmClient || undefined,
       bounds
     );
     globalConclusionStr = res.summary;
     globalConclusionError = res.error;
  }

  const getDeltaString = (current: number, past: number) => {
    if (!past || past === 0) return current > 0 ? '+100%' : '0%';
    const delta = ((current - past) / past) * 100;
    return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
  };

  const getDeltaIsPositive = (current: number, past: number) => {
    if (!past || past === 0) return current >= 0;
    return ((current - past) / past) >= 0;
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans p-12 max-w-[1024px] mx-auto print:p-0 print:max-w-none">
      
      {/* Auto triggers the native PDF engine when it mounts */}
      <PrintTrigger />

      {/* Corporate Letterhead */}
      <div className="flex items-center justify-between border-b-4 border-black pb-8 mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-black text-white p-3 rounded-xl flex items-center justify-center">
            {resolvedStreams.length > 1 ? <Layers className="w-8 h-8" strokeWidth={2} /> : <BarChart3 className="w-8 h-8" strokeWidth={2} />}
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">{resolvedStreams.length > 1 ? 'Multi-Network Executive Report' : 'Executive Performance Report'}</h1>
            <p className="text-neutral-500 font-bold tracking-widest text-xs uppercase mt-1">North Via Marketing Intelligence</p>
          </div>
        </div>
        
        <div className="text-right">
          <h2 className="text-2xl font-bold text-neutral-900">{crmClient?.businessName || accountsData[0]?.descriptiveName || targetId}</h2>
          <p className="text-neutral-500 text-sm font-medium mt-1">
            Period: {bounds.currentStart} to {bounds.currentEnd}
          </p>
          {resolvedStreams.length > 1 && (
            <p className="text-neutral-400 font-bold text-xs mt-1 bg-neutral-100 inline-block px-2 py-0.5 rounded uppercase tracking-wider">{resolvedStreams.length} Tracked Accounts</p>
          )}
        </div>
      </div>

      {/* CRM Intelligence Matrix Details */}
      {crmClient && (crmClient.mainGoal || crmClient.targetCostPerLead || (crmClient.targetCities && crmClient.targetCities.length > 0)) && (
        <div className="grid grid-cols-3 gap-6 mb-10 pb-10 border-b-2 border-dashed border-neutral-100 break-inside-avoid">
          {crmClient.mainGoal && (
            <div>
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Target className="w-3 h-3" /> Primary Objective</h4>
              <p className="text-[13px] leading-snug font-bold text-neutral-900">{crmClient.mainGoal}</p>
            </div>
          )}
          {crmClient.targetCostPerLead && (
            <div>
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><TrendingDown className="w-3 h-3" /> Target Acquisition Cost</h4>
              <p className="text-[13px] leading-snug font-bold text-blue-600 font-mono">${crmClient.targetCostPerLead.toFixed(2)} CPL</p>
            </div>
          )}
          {crmClient.targetCities && crmClient.targetCities.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Target Geographies</h4>
              <p className="text-[13px] leading-snug font-bold text-neutral-900 truncate">{crmClient.targetCities.join(', ')}</p>
            </div>
          )}
        </div>
      )}

      {/* Global AI Executive Conclusion Block (Brought to the top for C-Level executives) */}
      {(globalConclusionStr || globalConclusionError) && (
        <div className="bg-neutral-50 rounded-2xl p-8 mb-12 border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
          <h3 className="text-sm font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2">
            OVERALL HOLISTIC CONCLUSION
          </h3>
          {globalConclusionError ? (
            <p className="text-red-600 font-mono text-sm tracking-tight">{globalConclusionError}</p>
          ) : (
            <p className="text-lg leading-relaxed text-neutral-800 font-medium whitespace-pre-wrap">
              {globalConclusionStr}
            </p>
          )}
          
          {/* Global Combined Stats Footer */}
          <div className="mt-8 pt-6 border-t border-neutral-200 flex items-center gap-12">
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Global Cross-Network Spend</p>
              <p className="text-2xl font-black text-black font-mono">${totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Global Total Conversions</p>
              <p className="text-2xl font-black text-blue-600 font-mono">{totalConversions.toFixed(1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stacked Individual Account Blocks */}
      <div className="space-y-16">
        {resolvedStreams.map((stream, idx) => {
          const { account, metrics, pastMetrics, campaigns, devices, locations, summary, summaryError } = stream;
          if (!account) return null;
          
          return (
            <div key={account.customerId} className="pt-8 border-t-[3px] border-neutral-200/60 first:pt-0 first:border-0 break-inside-avoid">
              
              {/* Account Identifier */}
              <div className="mb-6 flex items-center gap-3">
                <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg break-inside-avoid">Node #{idx + 1}</span>
                <h3 className="text-xl font-bold bg-white text-black leading-none">{account.descriptiveName}</h3>
                <span className="text-sm font-mono text-neutral-400 ml-auto">ID: {account.customerId}</span>
              </div>

              {/* Node specific AI breakdown */}
              <div className="mb-8">
                {summaryError ? (
                  <p className="text-red-500 font-mono text-sm tracking-tight">{summaryError}</p>
                ) : (
                  <p className="text-neutral-700 italic border-l-4 border-neutral-200 pl-4 py-1 leading-relaxed">"{summary}"</p>
                )}
              </div>

              {/* Fixed Mathematical KPIs */}
              <div className="grid grid-cols-4 gap-4 mb-8 break-inside-avoid">
                <ReportKpi 
                  title="Total Ad Spend" 
                  value={metrics?.cost ? `$${metrics.cost.toFixed(2)}` : '$0.00'} 
                  pastValue={pastMetrics?.cost ? `$${pastMetrics.cost.toFixed(2)}` : '$0.00'} 
                  delta={getDeltaString(metrics?.cost || 0, pastMetrics?.cost || 0)} 
                />
                <ReportKpi 
                  title="Impressions" 
                  value={metrics?.impressions?.toLocaleString() || '0'} 
                  pastValue={pastMetrics?.impressions?.toLocaleString() || '0'} 
                  delta={getDeltaString(metrics?.impressions || 0, pastMetrics?.impressions || 0)} 
                />
                <ReportKpi 
                  title="Total Clicks" 
                  value={metrics?.clicks?.toLocaleString() || '0'} 
                  pastValue={pastMetrics?.clicks?.toLocaleString() || '0'} 
                  delta={getDeltaString(metrics?.clicks || 0, pastMetrics?.clicks || 0)} 
                />
                <ReportKpi 
                  title="Conversions" 
                  value={metrics?.conversions?.toFixed(1) || '0'} 
                  pastValue={pastMetrics?.conversions?.toFixed(1) || '0'} 
                  delta={getDeltaString(metrics?.conversions || 0, pastMetrics?.conversions || 0)} 
                  isLead 
                />
              </div>

              {/* Campaign Breakdowns */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden break-inside-avoid">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-600">Active Campaign Yields</h3>
                </div>
                <table className="w-full text-sm text-left">
                  <thead className="bg-white text-neutral-500 text-[10px] uppercase tracking-wider font-bold border-b border-neutral-200">
                    <tr>
                      <th className="px-5 py-3">Campaign Target</th>
                      <th className="px-5 py-3 text-right">Spend</th>
                      <th className="px-5 py-3 text-right">Impr.</th>
                      <th className="px-5 py-3 text-right">Clicks</th>
                      <th className="px-5 py-3 text-right text-blue-600">Conv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-neutral-400 font-medium">No campaigns registered traffic on this node.</td>
                      </tr>
                    ) : (
                      campaigns.map((camp: any) => (
                        <tr key={camp.id}>
                          <td className="px-5 py-3 font-bold text-neutral-900">{camp.name}</td>
                          <td className="px-5 py-3 text-right font-mono text-neutral-600">${camp.cost.toFixed(2)}</td>
                          <td className="px-5 py-3 text-right font-mono text-neutral-600">{camp.impressions.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-mono text-neutral-600">{camp.clicks.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right font-mono font-black text-blue-600">{camp.conversions.toFixed(1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grid for Devices & Locations Natively on Print block */}
              <div className="grid grid-cols-2 gap-6 mt-6 break-inside-avoid">
                <div className="border border-neutral-200 rounded-xl overflow-hidden text-[10px]">
                  <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                    <h3 className="font-black uppercase tracking-widest text-neutral-600">Geographic Heatmap</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 bg-white">
                      <tr>
                        <th className="px-4 py-2 border-b border-neutral-100">Origin Region</th>
                        <th className="px-4 py-2 text-right border-b border-neutral-100">Spend</th>
                        <th className="px-4 py-2 text-right border-b border-neutral-100 text-blue-600">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {locations.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-neutral-400">No geo data acquired.</td></tr>
                      ) : locations.map((loc: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-bold text-neutral-800 truncate max-w-[150px]">{loc.city}</td>
                          <td className="px-4 py-2 text-right font-mono text-neutral-600">${loc.cost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-black text-blue-600">{loc.conversions.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden text-[10px]">
                  <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                    <h3 className="font-black uppercase tracking-widest text-neutral-600">Device Segments</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead className="text-[9px] uppercase tracking-wider font-bold text-neutral-400 bg-white">
                      <tr>
                        <th className="px-4 py-2 border-b border-neutral-100">Hardware</th>
                        <th className="px-4 py-2 text-right border-b border-neutral-100">Spend</th>
                        <th className="px-4 py-2 text-right border-b border-neutral-100 text-blue-600">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {devices.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-neutral-400">No device data acquired.</td></tr>
                      ) : devices.map((dev: any, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-bold text-neutral-800">{dev.device}</td>
                          <td className="px-4 py-2 text-right font-mono text-neutral-600">${dev.cost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-mono font-black text-blue-600">{dev.conversions.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className="mt-16 text-center text-neutral-300 text-[10px] font-bold uppercase tracking-widest pt-8 border-t border-neutral-100 break-inside-avoid">
        Strictly Confidential • North Via Marketing Intelligence
      </div>
    </div>
  );
}

function ReportKpi({ title, value, pastValue, delta, isLead = false }: { title: string, value: string, pastValue: string, delta: string, isLead?: boolean }) {
  const isPositive = !delta.startsWith('-');
  const isZero = delta === '0%';
  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm">
      <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">{title}</h4>
      <p className={`text-2xl font-black font-mono tracking-tight ${isLead ? 'text-blue-600' : 'text-black'}`}>{value}</p>
      
      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-neutral-400 tracking-wider">
          PREV: {pastValue}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isZero ? 'bg-neutral-100 text-neutral-500' : (isPositive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}`}>
          {delta}
        </span>
      </div>
    </div>
  );
}
