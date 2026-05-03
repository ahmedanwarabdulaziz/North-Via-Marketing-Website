import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { Target, Search, MonitorSmartphone, Globe, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function getDeltaString(current: number, past: number) {
  if (past === 0) return current > 0 ? 100 : 0;
  return ((current - past) / past) * 100;
}

function ReportKpi({ title, value, pastValue, delta, isLead = false, inverseColor = false }: any) {
  const isPositive = delta > 0;
  const isZero = delta === 0;

  let colorClass = isZero ? 'text-neutral-500 bg-neutral-100' : 
    (isPositive ? (inverseColor ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100') : 
                  (inverseColor ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'));

  const DeltaIcon = isZero ? Minus : (isPositive ? TrendingUp : TrendingDown);

  return (
    <div className="border border-neutral-200 bg-white rounded-xl p-5 break-inside-avoid">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[12px] font-black uppercase tracking-widest text-neutral-500">{title}</h4>
        <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${colorClass}`}>
          <DeltaIcon className="w-3 h-3" />
          {Math.abs(delta).toFixed(1)}%
        </div>
      </div>
      <p className={`text-3xl font-black font-mono tracking-tight ${isLead ? 'text-blue-600' : 'text-black'}`}>{value}</p>
      <p className="text-[10px] font-bold text-neutral-400 mt-2 uppercase tracking-wide">
        PREV: {pastValue}
      </p>
    </div>
  );
}

export default async function ClientReportPage({ params }: { params: { id: string } }) {
  const snapshotId = params.id;
  
  if (!snapshotId) return notFound();

  const doc = await db.collection('ads_reports_snapshots').doc(snapshotId).get();
  if (!doc.exists) return notFound();

  const snapshot = doc.data();
  const payload = JSON.parse(snapshot?.payloadJson || '{}');

  const { resolvedStreams, timeframe, crmClient, totalCost, totalConversions } = payload;

  if (!resolvedStreams) return notFound();

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans selection:bg-blue-100">
      
      {/* Dynamic Digital Header */}
      <div className="bg-black text-white p-6 md:p-10 flex items-center justify-between shadow-xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{crmClient?.businessName || 'Performance'} Executive Report</h1>
          <p className="text-zinc-400 font-mono mt-2 flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-blue-500" /> Secure Matrix Generated: {new Date(snapshot?.fetchedAt).toLocaleString()}
          </p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-1">Timeframe Focus</p>
          <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 px-4 py-2 rounded-xl font-bold tracking-tight text-sm">
            {timeframe}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-12">

        {/* Global Strategy KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-blue-600">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Total Network Spend</p>
            <p className="text-3xl font-black font-mono">${(totalCost || 0).toFixed(2)}</p>
          </div>
          
          {crmClient?.primaryObjective === 'traffic_optimization' ? (
            <>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-purple-600">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Total Network Clicks</p>
                <p className="text-3xl font-black font-mono text-purple-600">
                  {resolvedStreams.reduce((acc: number, stream: any) => acc + (stream.metrics?.clicks || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-emerald-600">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Average Cost Per Click</p>
                <p className="text-3xl font-black font-mono text-emerald-600">
                  ${(resolvedStreams.reduce((acc: number, stream: any) => acc + (stream.metrics?.clicks || 0), 0) > 0) 
                    ? (totalCost / resolvedStreams.reduce((acc: number, stream: any) => acc + (stream.metrics?.clicks || 0), 0)).toFixed(2) 
                    : '-'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-emerald-600">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Total Network Leads</p>
                <p className="text-3xl font-black font-mono text-emerald-600">{(totalConversions || 0).toFixed(1)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-purple-600">
                <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">Average Cost Per Lead</p>
                <p className="text-3xl font-black font-mono text-purple-600">
                  ${totalConversions > 0 ? (totalCost / totalConversions).toFixed(2) : '-'}
                </p>
              </div>
              {crmClient?.targetCostPerLead && (
                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm border-l-4 border-l-amber-500">
                  <p className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-1">CRM Target CPL</p>
                  <p className="text-3xl font-black font-mono text-amber-600">${crmClient.targetCostPerLead}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Nodes Loop */}
        <div className="space-y-16">
          {resolvedStreams.map((stream: any, idx: number) => {
            const { account, metrics, pastMetrics, campaigns, searchTerms, devices, locations, summary, summaryError } = stream;
            
            return (
              <div key={idx} className="bg-white border border-neutral-200 rounded-3xl p-6 md:p-8 shadow-sm">
                
                <div className="mb-6 flex items-center gap-3 border-b border-neutral-100 pb-5">
                  <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg">Node #{idx + 1}</span>
                  <h3 className="text-xl font-bold bg-white text-black leading-none">{account?.descriptiveName || 'Account'}</h3>
                  <span className="text-sm font-mono text-neutral-400 ml-auto hidden sm:block">ID: {account?.customerId}</span>
                </div>

                {/* We removed the massive global top summary and relocated them deeply inside the UI sections below */}

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <ReportKpi 
                    title="Ad Spend" 
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
                    isLead={crmClient?.primaryObjective === 'traffic_optimization'}
                  />
                  {crmClient?.primaryObjective === 'traffic_optimization' ? (
                    <ReportKpi 
                      title="Avg. Cost Per Click" 
                      value={`$${metrics?.clicks > 0 ? (metrics.cost / metrics.clicks).toFixed(2) : '0.00'}`} 
                      pastValue={`$${pastMetrics?.clicks > 0 ? (pastMetrics.cost / pastMetrics.clicks).toFixed(2) : '0.00'}`} 
                      delta={getDeltaString((metrics?.cost / (metrics?.clicks || 1)) || 0, (pastMetrics?.cost / (pastMetrics?.clicks || 1)) || 0)} 
                      inverseColor
                    />
                  ) : (
                    <ReportKpi 
                      title="Conversions" 
                      value={metrics?.conversions?.toFixed(1) || '0'} 
                      pastValue={pastMetrics?.conversions?.toFixed(1) || '0'} 
                      delta={getDeltaString(metrics?.conversions || 0, pastMetrics?.conversions || 0)} 
                      isLead 
                    />
                  )}
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden mb-8">
                  <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex flex-col gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-neutral-600">Active Campaign Yields</span>
                  </div>
                  {summary?.campaignsInsight && (
                    <div className="px-5 py-4 bg-white border-b border-neutral-100 text-sm italic text-neutral-700 leading-relaxed">
                      " {summary.campaignsInsight} "
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-white text-neutral-500 text-[10px] uppercase tracking-wider font-bold border-b border-neutral-200">
                        <tr>
                          <th className="px-5 py-3">Campaign Target</th>
                          <th className="px-5 py-3 text-right">Spend</th>
                          <th className="px-5 py-3 text-right text-blue-600">Conv.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        {campaigns.length === 0 ? (
                          <tr><td colSpan={3} className="px-5 py-8 text-center text-neutral-400 font-medium">No active campaigns detected.</td></tr>
                        ) : campaigns.map((camp: any, i: number) => (
                          <tr key={i}>
                            <td className="px-5 py-3 font-bold text-neutral-900">{camp.name}</td>
                            <td className="px-5 py-3 text-right font-mono text-neutral-600">${camp.cost.toFixed(2)}</td>
                            <td className="px-5 py-3 text-right font-mono font-black text-blue-600">{camp.conversions.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden mb-8">
                  <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex flex-col gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-neutral-600">Top Keyword Pulls</span>
                  </div>
                  {summary?.keywordsInsight && (
                    <div className="px-5 py-4 bg-white border-b border-neutral-100 text-sm italic text-neutral-700 leading-relaxed">
                      " {summary.keywordsInsight} "
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-white text-neutral-500 text-[10px] uppercase tracking-wider font-bold border-b border-neutral-200 sticky top-0">
                        <tr>
                          <th className="px-5 py-3">Search Term</th>
                          <th className="px-5 py-3 text-right">Spend</th>
                          {crmClient?.primaryObjective === 'traffic_optimization' ? (
                            <>
                              <th className="px-5 py-3 text-right">Clicks</th>
                              <th className="px-5 py-3 text-right text-emerald-600">Avg CPC</th>
                            </>
                          ) : (
                            <th className="px-5 py-3 text-right text-blue-600">Conv.</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 bg-white">
                        {!searchTerms || searchTerms.length === 0 ? (
                          <tr><td colSpan={crmClient?.primaryObjective === 'traffic_optimization' ? 4 : 3} className="px-5 py-8 text-center text-neutral-400 font-medium">No keyword data.</td></tr>
                        ) : searchTerms.map((term: any, i: number) => (
                          <tr key={i}>
                            <td className="px-5 py-3 font-bold text-neutral-900">{term.term}</td>
                            <td className="px-5 py-3 text-right font-mono text-neutral-600">${term.cost.toFixed(2)}</td>
                            {crmClient?.primaryObjective === 'traffic_optimization' ? (
                              <>
                                <td className="px-5 py-3 text-right font-mono text-neutral-800">{term.clicks?.toLocaleString() || '0'}</td>
                                <td className="px-5 py-3 text-right font-mono font-black text-emerald-600">${term.clicks > 0 ? (term.cost / term.clicks).toFixed(2) : '-'}</td>
                              </>
                            ) : (
                              <td className="px-5 py-3 text-right font-mono font-black text-blue-600">{term.conversions.toFixed(1)}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-neutral-600">
                      <Globe className="w-3 h-3" /> Geographic Heatmap
                    </div>
                    {summary?.geoInsight && (
                      <div className="px-5 py-4 bg-white border-b border-neutral-100 text-sm italic text-neutral-700 leading-relaxed">
                        " {summary.geoInsight} "
                      </div>
                    )}
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 bg-white sticky top-0">
                          <tr>
                            <th className="px-4 py-2 border-b border-neutral-100">Origin</th>
                            <th className="px-4 py-2 border-b border-neutral-100 text-right">Spend</th>
                            <th className="px-4 py-2 border-b border-neutral-100 text-right text-blue-600">Leads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 bg-white">
                          {!locations || locations.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-4 text-center text-neutral-400 text-[11px]">No geo data.</td></tr>
                          ) : locations.map((loc: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-2 font-bold text-neutral-800">{loc.city}</td>
                              <td className="px-4 py-2 font-mono text-neutral-600 text-right">${loc.cost.toFixed(2)}</td>
                              <td className="px-4 py-2 font-mono font-black text-blue-600 text-right">{loc.conversions.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded-xl overflow-hidden">
                    <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-neutral-600">
                      <MonitorSmartphone className="w-3 h-3" /> Hardware Breakdowns
                    </div>
                    {summary?.deviceInsight && (
                      <div className="px-5 py-4 bg-white border-b border-neutral-100 text-sm italic text-neutral-700 leading-relaxed">
                        " {summary.deviceInsight} "
                      </div>
                    )}
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 bg-white sticky top-0">
                          <tr>
                            <th className="px-4 py-2 border-b border-neutral-100">Device</th>
                            <th className="px-4 py-2 border-b border-neutral-100 text-right">Spend</th>
                            <th className="px-4 py-2 border-b border-neutral-100 text-right text-blue-600">Leads</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 bg-white">
                          {!devices || devices.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-4 text-center text-neutral-400 text-[11px]">No device data.</td></tr>
                          ) : devices.map((dev: any, i: number) => (
                            <tr key={i}>
                              <td className="px-4 py-2 font-bold text-neutral-800">{dev.device}</td>
                              <td className="px-4 py-2 font-mono text-neutral-600 text-right">${dev.cost.toFixed(2)}</td>
                              <td className="px-4 py-2 font-mono font-black text-blue-600 text-right">{dev.conversions.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        <div className="text-center font-bold text-xs uppercase tracking-widest text-neutral-400 pb-10">
          Strictly Confidential • North Via Marketing Intelligence
        </div>
      </div>
    </div>
  );
}
