import { enums } from 'google-ads-api';
import { clientAdsAccounts } from './ads-metrics';
import { getAdsClient } from './google-ads';
import { MetaApiError, graph } from './meta';
import { clientMetaAdAccounts, tokenFor } from './meta-ads';

// Pausing and resuming a client's campaigns from the Anwarz app chat ("pause Patriva's Meta ads").
// The chat only proposes it; it runs after Ahmed taps ✅ Confirm. Google uses the Ads API (adwords
// scope, already granted); Meta needs the ads_management permission, so the Facebook login has to be
// reconnected once (More → Connections) before Meta campaigns can be paused.

export interface ControllableCampaign {
  platform: 'google' | 'meta';
  account: string; // Google customer id, or Meta ad account id
  id: string;
  name: string;
  status: 'active' | 'paused';
}

const GOOGLE_STATUS: Record<string, 'active' | 'paused'> = { '2': 'active', ENABLED: 'active', '3': 'paused', PAUSED: 'paused' };

/** A client's Google and Meta campaigns that can be paused or resumed (removed / deleted ones left out). */
export async function clientCampaigns(clientId: string): Promise<ControllableCampaign[]> {
  const out: ControllableCampaign[] = [];
  const [google, meta] = await Promise.all([clientAdsAccounts(clientId).catch(() => []), clientMetaAdAccounts(clientId).catch(() => [])]);
  if (google.length) {
    const { client, refreshToken } = await getAdsClient();
    for (const a of google) {
      const customer = client.Customer({ customer_id: a.customerId, refresh_token: refreshToken });
      const rows = (await customer.query(`SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'`)) as Array<{
        campaign?: { id?: number | string; name?: string; status?: number | string };
      }>;
      for (const r of rows) {
        const status = GOOGLE_STATUS[String(r.campaign?.status ?? '')];
        if (status && r.campaign?.id) out.push({ platform: 'google', account: a.customerId, id: String(r.campaign.id), name: r.campaign.name || 'Campaign', status });
      }
    }
  }
  for (const a of meta) {
    const token = await tokenFor(a.connectionId);
    const res = await graph<{ data?: Array<{ id: string; name?: string; status?: string }> }>(`act_${a.id}/campaigns`, {
      token,
      params: { fields: 'id,name,status', limit: 100 },
    });
    for (const c of res.data || []) {
      if (c.status === 'ACTIVE' || c.status === 'PAUSED') out.push({ platform: 'meta', account: a.id, id: c.id, name: c.name || 'Campaign', status: c.status === 'ACTIVE' ? 'active' : 'paused' });
    }
  }
  return out;
}

/** Pauses or resumes one campaign. Throws a readable error. */
export async function setCampaignStatus(clientId: string, c: Pick<ControllableCampaign, 'platform' | 'account' | 'id'>, pause: boolean) {
  if (c.platform === 'google') {
    const accounts = await clientAdsAccounts(clientId);
    if (!accounts.some((a) => a.customerId === c.account)) throw new Error('That Google Ads account isn’t linked to this client.');
    const { client, refreshToken } = await getAdsClient();
    const customer = client.Customer({ customer_id: c.account, refresh_token: refreshToken });
    await customer.campaigns.update([
      { resource_name: `customers/${c.account}/campaigns/${c.id}`, status: pause ? enums.CampaignStatus.PAUSED : enums.CampaignStatus.ENABLED },
    ]);
    return;
  }
  const account = (await clientMetaAdAccounts(clientId)).find((a) => a.id === c.account);
  if (!account) throw new Error('That Meta ad account isn’t linked to this client.');
  try {
    await graph(c.id, { token: await tokenFor(account.connectionId), method: 'POST', params: { status: pause ? 'PAUSED' : 'ACTIVE' } });
  } catch (error) {
    if (error instanceof MetaApiError && /permission|ads_management|\(#(10|200|294)\)/i.test(error.message)) {
      throw new Error('Facebook needs one more permission to change ads. Reconnect Facebook in More → Connections, then try again.');
    }
    throw error;
  }
}
