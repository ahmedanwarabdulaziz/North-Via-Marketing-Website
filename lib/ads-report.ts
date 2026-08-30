export type AdsReportPeriod = 7 | 15 | 30;

export interface AdsReportDateWindow {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  lastYearStart: string;
  lastYearEnd: string;
}

export interface AdsReportMetricTotals {
  cost: number;
  impressions: number;
  clicks: number;
  averageCpc: number;
  ctr: number;
}

export interface AdsReportCampaign {
  id: string;
  name: string;
  status: string;
  cost: number;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AdsReportData {
  customerId: string;
  periodDays: AdsReportPeriod;
  window: AdsReportDateWindow;
  current: AdsReportMetricTotals;
  previous: AdsReportMetricTotals;
  lastYear: AdsReportMetricTotals | null;
  campaigns: AdsReportCampaign[];
  previousCampaigns: AdsReportCampaign[];
  generatedAt: string;
}

export function calculateAdsMetricTotals(data: {
  cost?: number;
  impressions?: number;
  clicks?: number;
} | null | undefined): AdsReportMetricTotals {
  const cost = data?.cost || 0;
  const impressions = data?.impressions || 0;
  const clicks = data?.clicks || 0;

  return {
    cost,
    impressions,
    clicks,
    averageCpc: clicks > 0 ? cost / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
  };
}

export function calculateAdsChange(current: number, previous: number) {
  if (previous === 0) {
    return { percentage: null, direction: current === 0 ? 'flat' : 'new' as const };
  }

  const percentage = ((current - previous) / previous) * 100;
  return {
    percentage,
    direction: percentage > 0 ? 'up' as const : percentage < 0 ? 'down' as const : 'flat' as const,
  };
}

export function formatAdsDateRange(start: string, end: string) {
  const format = (value: string) =>
    new Date(value + 'T12:00:00').toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return format(start) + ' - ' + format(end);
}

