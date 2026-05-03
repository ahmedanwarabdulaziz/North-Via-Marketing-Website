'use server';

import { getAdsClient } from '@/lib/google-ads';

export async function fetchCustomerMetrics(customerId: string, startDate: string, endDate: string) {
  try {
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
    });

    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM customer
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    `;

    const res = await customer.query(query);
    
    if (!res || res.length === 0) {
      return { success: true, data: null };
    }

    const row = res[0].metrics;
    if (!row) return { success: true, data: null };

    return {
      success: true,
      data: {
        cost: (row.cost_micros || 0) / 1_000_000,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        averageCpc: (row.average_cpc || 0) / 1_000_000,
        conversions: row.conversions || 0,
        costPerConversion: (row.cost_per_conversion || 0) / 1_000_000,
      }
    };
  } catch (error: any) {
    console.warn(`fetchCustomerMetrics fail for ${customerId}:`, error.message || error);
    return { success: false, error: 'Failed to retrieve metrics' };
  }
}

export async function fetchCampaignMetrics(customerId: string, startDate: string, endDate: string) {
  try {
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
    });

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.cost_micros DESC
    `;

    const res = await customer.query(query);
    
    const campaigns = res.map((row: any) => ({
      id: row.campaign?.id?.toString() || 'unknown',
      name: row.campaign?.name || 'Unknown Campaign',
      status: row.campaign?.status || 'UNKNOWN',
      cost: (row.metrics?.cost_micros || 0) / 1_000_000,
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      conversions: row.metrics?.conversions || 0,
    }));

    return { success: true, campaigns };
  } catch (error: any) {
    console.warn(`fetchCampaignMetrics fail for ${customerId}:`, error.message || error);
    return { success: false, error: 'Failed to retrieve campaign data' };
  }
}

export async function fetchSearchTermMetrics(customerId: string, startDate: string, endDate: string) {
  try {
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
    });

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        search_term_view.search_term,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM search_term_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.clicks DESC
      LIMIT 50
    `;

    const res = await customer.query(query);

    const searchTerms = res.map((row: any) => ({
      searchTerm: row.search_term_view?.search_term || 'Unknown search term',
      campaignId: row.campaign?.id?.toString() || 'unknown',
      campaignName: row.campaign?.name || 'Unknown Campaign',
      adGroupId: row.ad_group?.id?.toString() || 'unknown',
      adGroupName: row.ad_group?.name || 'Unknown Ad Group',
      cost: (row.metrics?.cost_micros || 0) / 1_000_000,
      impressions: row.metrics?.impressions || 0,
      clicks: row.metrics?.clicks || 0,
      ctr: row.metrics?.ctr || 0,
      averageCpc: (row.metrics?.average_cpc || 0) / 1_000_000,
      conversions: row.metrics?.conversions || 0,
      costPerConversion: (row.metrics?.cost_per_conversion || 0) / 1_000_000,
    }));

    return { success: true, searchTerms };
  } catch (error: any) {
    console.warn(`fetchSearchTermMetrics fail for ${customerId}:`, error.message || error);
    return { success: false, error: 'Failed to retrieve search term data' };
  }
}

export async function fetchDeviceMetrics(customerId: string, startDate: string, endDate: string) {
  try {
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });

    const query = `
      SELECT
        segments.device,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.impressions > 0
    `;

    const res = await customer.query(query);

    const deviceMap: Record<string, any> = {
      DESKTOP: { device: 'Desktop PCs', cost: 0, impressions: 0, clicks: 0, conversions: 0 },
      MOBILE: { device: 'Mobile Phones', cost: 0, impressions: 0, clicks: 0, conversions: 0 },
      TABLET: { device: 'Tablets', cost: 0, impressions: 0, clicks: 0, conversions: 0 },
      OTHER: { device: 'Other/Smart-TVs', cost: 0, impressions: 0, clicks: 0, conversions: 0 }
    };

    res.forEach((row: any) => {
      let deviceRaw = 'OTHER';
      if (row.segments?.device === 2 || row.segments?.device === 'MOBILE') deviceRaw = 'MOBILE';
      else if (row.segments?.device === 3 || row.segments?.device === 'TABLET') deviceRaw = 'TABLET';
      else if (row.segments?.device === 4 || row.segments?.device === 'DESKTOP') deviceRaw = 'DESKTOP';
      
      const key = deviceRaw;
      
      deviceMap[key].cost += (row.metrics?.cost_micros || 0) / 1_000_000;
      deviceMap[key].impressions += row.metrics?.impressions || 0;
      deviceMap[key].clicks += row.metrics?.clicks || 0;
      deviceMap[key].conversions += row.metrics?.conversions || 0;
    });

    const devices = Object.values(deviceMap).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
      costPerConversion: d.conversions > 0 ? d.cost / d.conversions : 0
    })).filter(d => d.impressions > 0).sort((a, b) => b.cost - a.cost);

    return { success: true, devices };
  } catch (error: any) {
    console.warn(`fetchDeviceMetrics fail for ${customerId}:`, error.message || error);
    return { success: false, error: 'Failed to retrieve device data' };
  }
}

export async function fetchGeographicMetrics(customerId: string, startDate: string, endDate: string) {
  try {
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });

    // We query campaign while segmenting by geo_target_city map
    const query = `
      SELECT
        segments.geo_target_city,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions
      FROM geographic_view
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.impressions > 0
    `;

    const res = await customer.query(query);

    // Segment mappings return constants like: 'geoTargetConstants/1001280'
    const constantIds = [...new Set(res.map((r: any) => r.segments?.geo_target_city).filter((c: any) => c && c.length > 5))];
    
    let constantMap: Record<string, string> = {};
    if (constantIds.length > 0) {
      // Chunking to avoid GAQL url length issues
      const chunks = [];
      for (let i = 0; i < constantIds.length; i += 50) {
        chunks.push(constantIds.slice(i, i + 50));
      }
      
      for (const chunk of chunks) {
        try {
          const gSql = `SELECT geo_target_constant.resource_name, geo_target_constant.name FROM geo_target_constant WHERE geo_target_constant.resource_name IN (${chunk.map((id:string) => `'${id}'`).join(', ')})`;
          const gRes = await customer.query(gSql);
          gRes.forEach((r: any) => {
            if (r.geo_target_constant?.resource_name) {
              constantMap[r.geo_target_constant.resource_name] = r.geo_target_constant.name;
            }
          });
        } catch (e) {
          console.warn('Silent skip constraint map chunk');
        }
      }
    }

    const locMap: Record<string, any> = {};

    res.forEach((row: any) => {
      const resName = row.segments?.geo_target_city;
      // If we don't have a city mapped, gracefully handle it
      const cityName = resName ? (constantMap[resName] || 'Local Region') : 'National / Wide Area';
      
      if (!locMap[cityName]) locMap[cityName] = { city: cityName, cost: 0, impressions: 0, clicks: 0, conversions: 0 };
      
      locMap[cityName].cost += (row.metrics?.cost_micros || 0) / 1_000_000;
      locMap[cityName].impressions += row.metrics?.impressions || 0;
      locMap[cityName].clicks += row.metrics?.clicks || 0;
      locMap[cityName].conversions += row.metrics?.conversions || 0;
    });

    const locations = Object.values(locMap).map(l => ({
      ...l,
      ctr: l.impressions > 0 ? l.clicks / l.impressions : 0,
      costPerConversion: l.conversions > 0 ? l.cost / l.conversions : 0
    })).sort((a, b) => b.cost - a.cost);

    // Limit to Top 15 rigidly 
    return { success: true, locations: locations.slice(0, 15) };
  } catch (error: any) {
    console.warn(`fetchGeographicMetrics fail for ${customerId}:`, error.message || error);
    return { success: false, error: 'Failed to retrieve geographic data' };
  }
}
