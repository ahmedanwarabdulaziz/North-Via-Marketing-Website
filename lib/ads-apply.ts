import { enums } from 'google-ads-api';
import { clientAdsAccounts, describeAdsError } from './ads-metrics';
import { getSuggestion, type MatchType, type SuggestionRow } from './ads-suggest';
import { getAdsClient } from './google-ads';
import { supabase } from './supabase';

// Applies an accepted suggestion to the real Google Ads account, and undoes it. Every change is
// first run with validate_only (Google checks it without saving), so a bad keyword (policy
// problem, duplicate, wrong format) is caught before anything is touched.

const MATCH: Record<MatchType, number> = {
  EXACT: enums.KeywordMatchType.EXACT,
  PHRASE: enums.KeywordMatchType.PHRASE,
  BROAD: enums.KeywordMatchType.BROAD,
};

export interface SuggestionEdits {
  text?: string;
  matchType?: MatchType;
  /** Negatives only: 'campaign' (default) or 'ad_group'. */
  level?: 'campaign' | 'ad_group';
}

const clean = (s: string) => s.replace(/[!"#$%()*+,./:;<=>?@[\]^_`{|}~\\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

async function customerFor(row: SuggestionRow) {
  // The account must still be linked to this client: never change an account by id alone.
  const accounts = await clientAdsAccounts(row.client_id);
  if (!accounts.some((a) => a.customerId === row.customer_id)) throw new Error('That Google Ads account isn’t linked to this client any more.');
  const { client, refreshToken } = await getAdsClient();
  return client.Customer({ customer_id: row.customer_id, refresh_token: refreshToken });
}

function firstResource(res: unknown): string | null {
  const results = (res as { results?: Array<{ resource_name?: string }> })?.results;
  return results?.[0]?.resource_name || null;
}

/**
 * Accepts a pending suggestion (optionally edited) and writes it to Google Ads.
 * Returns the saved row; on a Google error the row is marked failed with a readable reason.
 */
export async function applySuggestion(id: string, edits: SuggestionEdits = {}): Promise<SuggestionRow> {
  const row = await getSuggestion(id);
  if (!row) throw new Error('Suggestion not found.');
  if (row.status !== 'pending' && row.status !== 'failed') throw new Error(`This suggestion is already ${row.status}.`);

  const text = clean(edits.text ?? row.text);
  const matchType = edits.matchType ?? row.match_type;
  if (!text) throw new Error('The keyword can’t be empty.');
  if (text.length > 80 || text.split(' ').length > 10) throw new Error('That keyword is too long for Google Ads.');
  if (!MATCH[matchType]) throw new Error('Match type must be EXACT, PHRASE or BROAD.');
  const edited = row.edited || text !== row.text || matchType !== row.match_type;
  const level = edits.level === 'ad_group' && row.ad_group_id ? 'ad_group' : 'campaign';

  try {
    const customer = await customerFor(row);
    const cid = row.customer_id;
    let resource: string | null;

    if (row.type === 'add_keyword') {
      if (!row.ad_group_id) throw new Error('This keyword has no ad group to go into.');
      const op = [
        {
          ad_group: `customers/${cid}/adGroups/${row.ad_group_id}`,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: { text, match_type: MATCH[matchType] },
        },
      ];
      await customer.adGroupCriteria.create(op, { validate_only: true });
      resource = firstResource(await customer.adGroupCriteria.create(op));
    } else if (level === 'ad_group') {
      const op = [{ ad_group: `customers/${cid}/adGroups/${row.ad_group_id}`, negative: true, keyword: { text, match_type: MATCH[matchType] } }];
      await customer.adGroupCriteria.create(op, { validate_only: true });
      resource = firstResource(await customer.adGroupCriteria.create(op));
    } else {
      if (!row.campaign_id) throw new Error('This negative keyword has no campaign.');
      const op = [{ campaign: `customers/${cid}/campaigns/${row.campaign_id}`, negative: true, keyword: { text, match_type: MATCH[matchType] } }];
      await customer.campaignCriteria.create(op, { validate_only: true });
      resource = firstResource(await customer.campaignCriteria.create(op));
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('ads_suggestions')
      .update({ status: 'applied', text, match_type: matchType, edited, resource_name: resource, error: null, decided_at: now, applied_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SuggestionRow;
  } catch (error) {
    const message = describeAdsError(error);
    await supabase.from('ads_suggestions').update({ status: 'failed', error: message, text, match_type: matchType, edited }).eq('id', id);
    throw new Error(message);
  }
}

export async function rejectSuggestion(id: string): Promise<SuggestionRow> {
  const row = await getSuggestion(id);
  if (!row) throw new Error('Suggestion not found.');
  if (row.status === 'applied') throw new Error('It’s already applied. Use Undo instead.');
  const { data, error } = await supabase.from('ads_suggestions').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as SuggestionRow;
}

/** Removes what an applied suggestion created in Google Ads. */
export async function undoSuggestion(id: string): Promise<SuggestionRow> {
  const row = await getSuggestion(id);
  if (!row) throw new Error('Suggestion not found.');
  if (row.status !== 'applied' || !row.resource_name) throw new Error('Only an applied change can be undone.');
  try {
    const customer = await customerFor(row);
    if (row.resource_name.includes('/campaignCriteria/')) await customer.campaignCriteria.remove([row.resource_name]);
    else await customer.adGroupCriteria.remove([row.resource_name]);
  } catch (error) {
    throw new Error(describeAdsError(error));
  }
  const { data, error } = await supabase.from('ads_suggestions').update({ status: 'undone', resource_name: null, decided_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as SuggestionRow;
}
