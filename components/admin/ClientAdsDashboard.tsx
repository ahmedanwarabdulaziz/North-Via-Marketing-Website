'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  MousePointerClick, 
  DollarSign,
  Target,
  AlertCircle,
  Smartphone,
  Monitor,
  Tablet,
  Search,
  Activity,
  Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ClientAdsReportTemplate } from './ClientAdsReportTemplate';
import { useRef } from 'react';
import { 
  fetchCustomerMetrics, 
  fetchCampaignMetrics,
  fetchDeviceMetrics,
  fetchSearchTermMetrics,
  fetchAdMetrics
} from '@/app/actions/ads-reports';

export function ClientAdsDashboard({ 
  customerId, 
  brandName 
}: { 
  customerId: string;
  brandName: string;
}) {
  const [dateRange, setDateRange] = useState('LAST_30_DAYS'); 
  
  const getDates = (range: string) => {
    const end = new Date();
    const start = new Date();
    
    let prevStart = new Date();
    let prevEnd = new Date();

    if (range === 'LAST_7_DAYS') {
      start.setDate(end.getDate() - 6);
      prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 6);
    } else if (range === 'LAST_30_DAYS') {
      start.setDate(end.getDate() - 29);
      prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - 29);
    } else if (range === 'THIS_MONTH') {
      start.setDate(1); // 1st of current month
      // For this month, previous period should be the same days in the PREVIOUS month
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1); // 1st of previous month
      
      prevEnd = new Date(end);
      prevEnd.setMonth(prevEnd.getMonth() - 1); // Same day in previous month
    }

    let lastYearStart = new Date(start);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    let lastYearEnd = new Date(end);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      prevStartDate: prevStart.toISOString().split('T')[0],
      prevEndDate: prevEnd.toISOString().split('T')[0],
      lastYearStartDate: lastYearStart.toISOString().split('T')[0],
      lastYearEndDate: lastYearEnd.toISOString().split('T')[0],
    };
  };

  const [metrics, setMetrics] = useState<any>(null);
  const [prevMetrics, setPrevMetrics] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [searchTerms, setSearchTerms] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [lastYearMetrics, setLastYearMetrics] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const { startDate, endDate, prevStartDate, prevEndDate, lastYearStartDate, lastYearEndDate } = getDates(dateRange);
        
        const [
          currMetricsRes, 
          prevMetricsRes, 
          lastYearMetricsRes,
          campaignsRes,
          devicesRes,
          searchTermsRes,
          adsRes
        ] = await Promise.all([
          fetchCustomerMetrics(customerId, startDate, endDate),
          fetchCustomerMetrics(customerId, prevStartDate, prevEndDate),
          fetchCustomerMetrics(customerId, lastYearStartDate, lastYearEndDate),
          fetchCampaignMetrics(customerId, startDate, endDate),
          fetchDeviceMetrics(customerId, startDate, endDate),
          fetchSearchTermMetrics(customerId, startDate, endDate),
          fetchAdMetrics(customerId, startDate, endDate)
        ]);

        if (!currMetricsRes.success) throw new Error(currMetricsRes.error);
        if (!campaignsRes.success) throw new Error(campaignsRes.error);

        setMetrics(currMetricsRes.data);
        setPrevMetrics(prevMetricsRes.success ? prevMetricsRes.data : null);
        setLastYearMetrics(lastYearMetricsRes.success ? lastYearMetricsRes.data : null);
        setCampaigns((campaignsRes.campaigns || []).filter((c: any) => c.cost > 0));
        setDevices(devicesRes.success ? devicesRes.devices || [] : []);
        setSearchTerms(searchTermsRes.success ? searchTermsRes.searchTerms || [] : []);
        setAds(adsRes.success ? (adsRes.ads || []).filter((a: any) => a.cost > 0) : []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch Ads data');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [customerId, dateRange]);

  const generatePdf = async () => {
    if (!pdfRef.current || !metrics) return;
    setIsGeneratingPdf(true);
    
    try {
      // Need a slight delay to ensure rendering is fresh if we just un-hid it
      await new Promise(r => setTimeout(r, 100));
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = pdfRef.current.querySelectorAll('.pdf-page');
      
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
      
      pdf.save(`${brandName} - Performance Report.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const calculateChange = (current: number, previous: number, inverseGood = false) => {
    if (!previous || previous === 0) return { pct: 0, isGood: true, text: 'N/A' };
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    // For cost/CPA, lower is better. For clicks/convs, higher is better.
    const isGood = inverseGood ? pct <= 0 : pct >= 0;
    
    return {
      pct: Math.abs(pct),
      isGood,
      text: `${pct >= 0 ? '+' : '-'}${Math.abs(pct).toFixed(1)}%`
    };
  };

  const renderKPI = (title: string, value: string, icon: React.ReactNode, current: number, previous: number | undefined, inverseGood = false) => {
    const change = previous !== undefined ? calculateChange(current, previous, inverseGood) : null;
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100 flex flex-col justify-between h-full relative overflow-hidden group hover:border-zinc-200 transition-colors">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 mb-3">
          <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
            {icon}
          </div>
          {title}
        </div>
        <div className="flex items-end justify-between mt-auto">
          <div className="text-3xl font-bold text-zinc-900 tracking-tight">{value}</div>
          {change && change.text !== 'N/A' && (
            <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${change.isGood ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {change.isGood ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {change.text}
            </div>
          )}
        </div>
      </div>
    );
  };

  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-500" />
          Performance Dashboard
        </h2>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPreview(true)}
            disabled={!metrics}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Preview Report
          </button>
          <button 
            onClick={generatePdf}
            disabled={isGeneratingPdf || !metrics}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {isGeneratingPdf ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer hover:border-zinc-300 transition-colors"
          >
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-zinc-100 h-32 rounded-2xl"></div>
          ))}
          <div className="md:col-span-2 lg:col-span-4 bg-white border border-zinc-100 h-64 rounded-2xl"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      ) : !metrics ? (
        <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-zinc-100 text-zinc-500">
          No data available for this date range.
        </div>
      ) : (
        <>
          {/* Comparative KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderKPI('Total Spend', `$${metrics.cost.toFixed(2)}`, <DollarSign className="w-4 h-4" />, metrics.cost, prevMetrics?.cost, true)}
            {renderKPI('Impressions', metrics.impressions.toLocaleString(), <Activity className="w-4 h-4" />, metrics.impressions, prevMetrics?.impressions, false)}
            {renderKPI('Clicks', metrics.clicks.toLocaleString(), <MousePointerClick className="w-4 h-4" />, metrics.clicks, prevMetrics?.clicks, false)}
            {renderKPI('CPC (Cost per Click)', `$${metrics.averageCpc.toFixed(2)}`, <TrendingUp className="w-4 h-4" />, metrics.averageCpc, prevMetrics?.averageCpc, true)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Campaign Breakdown (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/30">
                <h3 className="font-semibold text-zinc-900">Campaign Performance</h3>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      <th className="px-5 py-3">Campaign</th>
                      <th className="px-5 py-3 text-right">Spend</th>
                      <th className="px-5 py-3 text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-zinc-500 text-sm">
                          No active campaigns in this period.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-medium text-zinc-900 truncate max-w-[200px]" title={camp.name}>{camp.name}</div>
                            <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${camp.status === 'ENABLED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              {camp.status}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-medium text-zinc-900">
                            ${camp.cost.toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-right text-zinc-600">
                            {camp.clicks.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Device Breakdown (1/3 width) */}
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/30">
                <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-zinc-400" />
                  Devices
                </h3>
              </div>
              <div className="p-5 space-y-6 flex-1">
                {devices.length === 0 ? (
                  <div className="text-center text-zinc-500 text-sm mt-8">No device data.</div>
                ) : (
                  devices.map((d, i) => {
                    const pct = metrics.cost > 0 ? (d.cost / metrics.cost) * 100 : 0;
                    let Icon = Smartphone;
                    if (d.device.includes('Desktop')) Icon = Monitor;
                    if (d.device.includes('Tablet')) Icon = Tablet;
                    
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-2 font-medium text-zinc-700">
                            <Icon className="w-4 h-4 text-zinc-400" />
                            {d.device}
                          </div>
                          <div className="font-bold text-zinc-900">{pct.toFixed(1)}%</div>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2 mb-1 overflow-hidden">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500 mt-1.5">
                          <span>${d.cost.toFixed(2)} Spend</span>
                          <span>{d.clicks} Clicks</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Search Terms Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden mt-6">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400" />
                Top Search Terms
              </h3>
              <div className="text-xs font-medium text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200 shadow-sm">
                Highest Intent Queries
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Search Term</th>
                    <th className="px-5 py-3">Campaign</th>
                    <th className="px-5 py-3 text-right">Spend</th>
                    <th className="px-5 py-3 text-right">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {searchTerms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-zinc-500 text-sm">
                        No search term data available.
                      </td>
                    </tr>
                  ) : (
                    // only show top 10 to keep UI clean
                    searchTerms.slice(0, 10).map((term, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-zinc-900">{term.searchTerm}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-sm text-zinc-600 truncate max-w-[150px]" title={term.campaignName}>{term.campaignName}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-zinc-900">
                          ${term.cost.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-zinc-600">
                          {term.clicks}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ads Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden mt-6">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-zinc-400" />
                Top Performing Ads
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Ad Name / Type</th>
                    <th className="px-5 py-3">Campaign / Ad Group</th>
                    <th className="px-5 py-3 text-right">Spend</th>
                    <th className="px-5 py-3 text-right">Clicks</th>
                    <th className="px-5 py-3 text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 text-sm">
                        No active ads in this period.
                      </td>
                    </tr>
                  ) : (
                    ads.slice(0, 15).map((ad, i) => (
                      <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-zinc-900 truncate max-w-[200px]" title={ad.adName}>{ad.adName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{String(ad.adType || '').replace(/_/g, ' ')}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-zinc-800 text-sm truncate max-w-[150px]" title={ad.campaignName}>{ad.campaignName}</div>
                          <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[150px]" title={ad.adGroupName}>{ad.adGroupName}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-medium text-zinc-900">
                          ${ad.cost.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-zinc-600">
                          {ad.clicks.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-zinc-600">
                          {(ad.ctr * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </>
      )}

      {/* Preview Modal */}
      {showPreview && metrics && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 shrink-0">
            <h3 className="text-white font-medium">Report Preview: {brandName}</h3>
            <div className="flex gap-3">
              <button 
                onClick={generatePdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
              </button>
              <button 
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded text-sm font-medium hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-zinc-950/50">
            <div className="shadow-[0_0_50px_rgba(0,0,0,0.3)] shrink-0 my-4 transform scale-75 md:scale-100 origin-top">
              <ClientAdsReportTemplate 
                clientName={brandName}
                data={{
                  customerId: customerId,
                  periodDays: dateRange === 'LAST_7_DAYS' ? 7 : 30,
                  window: {
                    currentStart: getDates(dateRange).startDate,
                    currentEnd: getDates(dateRange).endDate,
                    previousStart: getDates(dateRange).prevStartDate,
                    previousEnd: getDates(dateRange).prevEndDate,
                    lastYearStart: getDates(dateRange).lastYearStartDate,
                    lastYearEnd: getDates(dateRange).lastYearEndDate,
                  },
                  current: metrics,
                  previous: prevMetrics,
                  lastYear: lastYearMetrics,
                  campaigns: campaigns,
                  previousCampaigns: [],
                  generatedAt: new Date().toISOString()
                }}
                searchTerms={searchTerms}
                devices={devices}
                ads={ads}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Generator */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ transform: 'scale(1)' }}>
        {metrics && (
          <ClientAdsReportTemplate 
            ref={pdfRef}
            clientName={brandName}
            data={{
              customerId: customerId,
              periodDays: dateRange === 'LAST_7_DAYS' ? 7 : 30,
              window: {
                currentStart: getDates(dateRange).startDate,
                currentEnd: getDates(dateRange).endDate,
                previousStart: getDates(dateRange).prevStartDate,
                previousEnd: getDates(dateRange).prevEndDate,
                lastYearStart: getDates(dateRange).lastYearStartDate,
                lastYearEnd: getDates(dateRange).lastYearEndDate,
              },
              current: metrics,
              previous: prevMetrics,
              lastYear: lastYearMetrics,
              campaigns: campaigns,
              previousCampaigns: [],
              generatedAt: new Date().toISOString()
            }}
            searchTerms={searchTerms}
            devices={devices}
            ads={ads}
          />
        )}
      </div>
    </div>
  );
}
