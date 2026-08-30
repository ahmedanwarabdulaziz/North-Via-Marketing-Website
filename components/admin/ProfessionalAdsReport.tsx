'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { fetchProfessionalAdsReport } from '@/app/actions/ads-reports';
import {
  calculateAdsChange,
  formatAdsDateRange,
  type AdsReportCampaign,
  type AdsReportData,
  type AdsReportPeriod,
} from '@/lib/ads-report';

const PERIOD_OPTIONS: Array<{ value: AdsReportPeriod; label: string }> = [
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
];

function formatMoney(value: number) {
  return '$' + value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(current: number, previous: number) {
  const change = calculateAdsChange(current, previous);
  if (change.percentage === null) return change.direction === 'new' ? 'New activity' : 'No change';
  return (change.percentage > 0 ? '+' : '') + change.percentage.toFixed(1) + '%';
}

function downloadFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildMarkdown(report: AdsReportData, brandName: string) {
  const lines = [
    '# Google Ads Performance Dataset',
    '',
    '## Report context',
    '- Business: ' + brandName,
    '- Google Ads customer ID: ' + report.customerId,
    '- Current period: ' + report.window.currentStart + ' to ' + report.window.currentEnd,
    '- Previous comparison period: ' + report.window.previousStart + ' to ' + report.window.previousEnd,
    '- Period length: ' + report.periodDays + ' complete days',
    '- Generated at: ' + report.generatedAt,
    '',
    '## Account performance',
    '| Metric | Current period | Previous period | Change |',
    '| --- | ---: | ---: | ---: |',
    '| Spend | ' + formatMoney(report.current.cost) + ' | ' + formatMoney(report.previous.cost) + ' | ' + formatChange(report.current.cost, report.previous.cost) + ' |',
    '| Impressions | ' + report.current.impressions.toLocaleString() + ' | ' + report.previous.impressions.toLocaleString() + ' | ' + formatChange(report.current.impressions, report.previous.impressions) + ' |',
    '| Clicks | ' + report.current.clicks.toLocaleString() + ' | ' + report.previous.clicks.toLocaleString() + ' | ' + formatChange(report.current.clicks, report.previous.clicks) + ' |',
    '| Click-through rate | ' + report.current.ctr.toFixed(2) + '% | ' + report.previous.ctr.toFixed(2) + '% | ' + formatChange(report.current.ctr, report.previous.ctr) + ' |',
    '| Average CPC | ' + formatMoney(report.current.averageCpc) + ' | ' + formatMoney(report.previous.averageCpc) + ' | ' + formatChange(report.current.averageCpc, report.previous.averageCpc) + ' |',
    '',
    '## Campaign performance',
    '| Campaign | Status | Current spend | Previous spend | Spend change | Current clicks | Previous clicks | Click change |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  const previousById = new Map(report.previousCampaigns.map((campaign) => [campaign.id, campaign]));
  report.campaigns.forEach((campaign) => {
    const previous = previousById.get(campaign.id);
    lines.push(
      '| ' + campaign.name.replace(/|/g, '\\|') +
      ' | ' + campaign.status +
      ' | ' + formatMoney(campaign.cost) +
      ' | ' + formatMoney(previous?.cost || 0) +
      ' | ' + formatChange(campaign.cost, previous?.cost || 0) +
      ' | ' + campaign.clicks.toLocaleString() +
      ' | ' + (previous?.clicks || 0).toLocaleString() +
      ' | ' + formatChange(campaign.clicks, previous?.clicks || 0) + ' |'
    );
  });

  if (report.campaigns.length === 0) {
    lines.push('| No campaign activity in the current period | - | - | - | - | - | - | - |');
  }

  lines.push(
    '',
    '## Analysis guidance',
    '- Treat the current and previous windows as equal-length complete periods.',
    '- Evaluate traffic quality through clicks, impressions, CTR, CPC, and spend efficiency.',
    '- Identify meaningful campaign-level movements before making recommendations.',
    '- Do not infer conversions or revenue from this dataset unless verified separately.'
  );

  return lines.join('\n');
}

export function ProfessionalAdsReport({
  customerId,
  brandName,
}: {
  customerId: string;
  brandName: string;
}) {
  const [periodDays, setPeriodDays] = useState<AdsReportPeriod>(30);
  const [refreshToken, setRefreshToken] = useState(0);
  const [report, setReport] = useState<AdsReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadReport() {
      setIsLoading(true);
      setError(null);
      const result = await fetchProfessionalAdsReport(customerId, periodDays);

      if (!isCurrent) return;
      if (result.success) {
        setReport(result.data);
      } else {
        setReport(null);
        setError(result.error);
      }
      setIsLoading(false);
    }

    loadReport().catch((loadError: unknown) => {
      if (!isCurrent) return;
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Ads report.');
      setIsLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [customerId, periodDays, refreshToken]);

  const campaignRows = useMemo(() => {
    if (!report) return [];

    const previousById = new Map(report.previousCampaigns.map((campaign) => [campaign.id, campaign]));
    return report.campaigns
      .filter((campaign) => campaign.cost > 0)
      .slice(0, 12)
      .map((campaign) => ({
        campaign,
        previous: previousById.get(campaign.id),
      }));
  }, [report]);

  const handleDownload = (format: 'md' | 'json') => {
    if (!report) return;
    const safeName = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const baseName = (safeName || 'business') + '-google-ads-' + report.periodDays + '-days';

    if (format === 'md') {
      downloadFile(baseName + '.md', buildMarkdown(report, brandName), 'text/markdown;charset=utf-8');
    } else {
      downloadFile(baseName + '.json', JSON.stringify({
        report,
        business: brandName,
        instructions: 'Analyze equal-length complete periods. Focus on spend, impressions, clicks, CTR, CPC, and campaign movement.',
      }, null, 2), 'application/json;charset=utf-8');
    }
  };

  return (
    <section className="space-y-5">
      <div className="bg-zinc-950 text-white rounded-2xl p-6 md:p-7 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-[0.18em]">
              <CheckCircle2 className="w-4 h-4" />
              Report data foundation
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mt-2">Professional Ads Report</h2>
            <p className="text-zinc-400 text-sm mt-2 max-w-2xl">
              Complete-period performance comparison for {brandName}. Ready to export for AI analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriodDays(option.value)}
                className={
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ' +
                  (periodDays === option.value
                    ? 'bg-white text-zinc-950'
                    : 'bg-white/10 text-zinc-300 hover:bg-white/15')
                }
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="p-2 rounded-lg bg-white/10 text-zinc-300 hover:bg-white/15 transition-colors"
              aria-label="Refresh report"
              title="Refresh report"
            >
              <RefreshCw className={isLoading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-32 rounded-2xl bg-white border border-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Report data could not be loaded</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : report ? (
        <>
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Reporting window</p>
              <p className="font-semibold text-zinc-900 mt-1">{formatAdsDateRange(report.window.currentStart, report.window.currentEnd)}</p>
              <p className="text-sm text-zinc-500 mt-1">
                Compared with {formatAdsDateRange(report.window.previousStart, report.window.previousEnd)}. Today is excluded to avoid partial data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleDownload('md')} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors">
                <FileText className="w-4 h-4" />
                Export Markdown
              </button>
              <button type="button" onClick={() => handleDownload('json')} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Spend', value: formatMoney(report.current.cost), current: report.current.cost, previous: report.previous.cost, inverseGood: true },
              { label: 'Impressions', value: report.current.impressions.toLocaleString(), current: report.current.impressions, previous: report.previous.impressions, inverseGood: false },
              { label: 'Clicks', value: report.current.clicks.toLocaleString(), current: report.current.clicks, previous: report.previous.clicks, inverseGood: false },
              { label: 'CTR', value: report.current.ctr.toFixed(2) + '%', current: report.current.ctr, previous: report.previous.ctr, inverseGood: false },
              { label: 'Average CPC', value: formatMoney(report.current.averageCpc), current: report.current.averageCpc, previous: report.previous.averageCpc, inverseGood: true },
            ].map((metric) => {
              const change = calculateAdsChange(metric.current, metric.previous);
              const positive = change.direction === 'flat' || (metric.inverseGood ? change.direction === 'down' : change.direction === 'up');

              return (
                <div key={metric.label} className="bg-white border border-zinc-200 rounded-2xl p-5">
                  <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
                  <p className="text-2xl font-bold tracking-tight text-zinc-900 mt-3">{metric.value}</p>
                  <div className={'inline-flex items-center gap-1 text-xs font-semibold mt-3 px-2 py-1 rounded-full ' + (positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                    {change.direction === 'down' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {formatChange(metric.current, metric.previous)}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">vs previous period</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900">Campaign comparison</h3>
                <p className="text-sm text-zinc-500 mt-1">Current-period campaigns ranked by spend, with equal-period movement.</p>
              </div>
              <Download className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Campaign</th>
                    <th className="px-5 py-3 font-semibold text-right">Spend</th>
                    <th className="px-5 py-3 font-semibold text-right">Spend change</th>
                    <th className="px-5 py-3 font-semibold text-right">Clicks</th>
                    <th className="px-5 py-3 font-semibold text-right">Click change</th>
                    <th className="px-5 py-3 font-semibold text-right">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {campaignRows.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">No campaign activity in the current period.</td></tr>
                  ) : campaignRows.map(({ campaign, previous }) => (
                    <CampaignRow key={campaign.id} campaign={campaign} previous={previous} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function CampaignRow({
  campaign,
  previous,
}: {
  campaign: AdsReportCampaign;
  previous?: AdsReportCampaign;
}) {
  return (
    <tr className="hover:bg-zinc-50/70 transition-colors">
      <td className="px-5 py-4">
        <p className="font-medium text-zinc-900 max-w-[280px] truncate" title={campaign.name}>{campaign.name}</p>
        <p className="text-xs text-zinc-500 mt-1">{campaign.status}</p>
      </td>
      <td className="px-5 py-4 text-right font-medium text-zinc-900">{formatMoney(campaign.cost)}</td>
      <td className="px-5 py-4 text-right text-sm text-zinc-600">{formatChange(campaign.cost, previous?.cost || 0)}</td>
      <td className="px-5 py-4 text-right text-zinc-700">{campaign.clicks.toLocaleString()}</td>
      <td className="px-5 py-4 text-right text-sm text-zinc-600">{formatChange(campaign.clicks, previous?.clicks || 0)}</td>
      <td className="px-5 py-4 text-right text-zinc-700">{campaign.ctr.toFixed(2)}%</td>
    </tr>
  );
}
