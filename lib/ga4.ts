import { google } from 'googleapis';
import { getDoc, updateDoc } from './data/store';
import { decryptString } from './encryption';
import { googleRedirectUri } from './google-oauth';

// Google Analytics 4 through one shared, read-only Google login (like Google Ads).
// Each client points at one GA4 property (clients.ga4PropertyId).

export const GA_CONNECTION = 'analytics_admin_connection';

export interface GaTotals {
  visitors: number; // activeUsers
  sessions: number;
  engagementRate: number; // %
  avgSessionSeconds: number;
  pageViews: number;
  keyEvents: number; // GA4 "key events" (formerly conversions)
}

export interface GaPeriod {
  totals: GaTotals;
  channels: Array<{ name: string; sessions: number }>;
  pages: Array<{ title: string; path: string; views: number }>;
}

async function analyticsAuth() {
  const connection = await getDoc<{ encryptedRefreshToken?: string }>('google_connections', GA_CONNECTION);
  if (!connection?.encryptedRefreshToken) throw new Error('Google Analytics is not connected.');
  const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, googleRedirectUri());
  auth.setCredentials({ refresh_token: decryptString(connection.encryptedRefreshToken) });
  return auth;
}

export async function analyticsConnected() {
  return Boolean(await getDoc('google_connections', GA_CONNECTION));
}

export function describeGaError(error: unknown) {
  const err = error as { message?: string; response?: { data?: { error?: { message?: string } } } };
  const message = err?.response?.data?.error?.message || err?.message || String(error);
  if (/invalid_grant/i.test(message)) return 'Google Analytics access expired. Reconnect it on the client page (Analytics tab).';
  if (/not connected/i.test(message)) return 'Google Analytics is not connected. Connect it on the client page (Analytics tab).';
  if (/permission|PERMISSION_DENIED/i.test(message)) return 'This Google login can’t read that GA4 property. Give it Viewer access in GA4.';
  if (/has not been used|is disabled/i.test(message)) return 'The Google Analytics API is off in Google Cloud. Enable the “Google Analytics Data API” and “Google Analytics Admin API”.';
  return message.slice(0, 200);
}

/** Every GA4 property the login can read, for the picker. */
export async function listGa4Properties() {
  const admin = google.analyticsadmin({ version: 'v1beta', auth: await analyticsAuth() });
  const found: Array<{ propertyId: string; name: string; account: string }> = [];
  let pageToken: string | undefined;
  do {
    const res = await admin.accountSummaries.list({ pageSize: 200, pageToken });
    for (const account of res.data.accountSummaries || []) {
      for (const p of account.propertySummaries || []) {
        found.push({ propertyId: String(p.property).replace('properties/', ''), name: p.displayName || 'Property', account: account.displayName || '' });
      }
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export async function setClientGa4Property(clientId: string, propertyId: string | null) {
  if (propertyId && !/^\d{5,15}$/.test(propertyId)) throw new Error('That is not a GA4 property ID.');
  await updateDoc('clients', clientId, { ga4PropertyId: propertyId || '', updatedAt: new Date().toISOString() });
}

const num = (v: unknown) => Number(v || 0);

/**
 * GA4 numbers for up to three periods (e.g. this period, previous, last year), in
 * the same order as `ranges`. Dates are YYYY-MM-DD in the property's time zone.
 */
export async function fetchGa4(propertyId: string, ranges: Array<{ start: string; end: string }>): Promise<GaPeriod[]> {
  const data = google.analyticsdata({ version: 'v1beta', auth: await analyticsAuth() });
  const property = `properties/${propertyId}`;
  const dateRanges = ranges.map((r, i) => ({ startDate: r.start, endDate: r.end, name: `r${i}` }));

  const [totals, channels, pages] = await Promise.all([
    data.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        metrics: ['activeUsers', 'sessions', 'engagementRate', 'averageSessionDuration', 'screenPageViews', 'keyEvents'].map((name) => ({ name })),
      },
    }),
    data.properties.runReport({
      property,
      requestBody: {
        dateRanges: dateRanges.slice(0, 1),
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: '6',
      },
    }),
    data.properties.runReport({
      property,
      requestBody: {
        dateRanges: dateRanges.slice(0, 1),
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: '5',
      },
    }),
  ]);

  // With several date ranges GA4 adds a "dateRange" dimension to each row.
  const rowFor = (i: number) =>
    (totals.data.rows || []).find((r) => (r.dimensionValues?.[0]?.value || 'r0') === `r${i}`) ||
    (ranges.length === 1 ? totals.data.rows?.[0] : undefined);

  return ranges.map((_, i) => {
    const m = rowFor(i)?.metricValues || [];
    return {
      totals: {
        visitors: num(m[0]?.value),
        sessions: num(m[1]?.value),
        engagementRate: Math.round(num(m[2]?.value) * 1000) / 10,
        avgSessionSeconds: Math.round(num(m[3]?.value)),
        pageViews: num(m[4]?.value),
        keyEvents: Math.round(num(m[5]?.value) * 10) / 10,
      },
      // Breakdowns are for the current period only.
      channels: i === 0 ? (channels.data.rows || []).map((r) => ({ name: r.dimensionValues?.[0]?.value || 'Other', sessions: num(r.metricValues?.[0]?.value) })) : [],
      pages:
        i === 0
          ? (pages.data.rows || []).map((r) => ({ title: r.dimensionValues?.[0]?.value || '', path: r.dimensionValues?.[1]?.value || '/', views: num(r.metricValues?.[0]?.value) }))
          : [],
    };
  });
}
