import { enums } from 'google-ads-api';
import { clientAdsAccounts, describeAdsError } from './ads-metrics';
import { getSuggestion, type MatchType, type SuggestionRow } from './ads-suggest';
import { getAdsClient } from './google-ads';
import { supabase } from './supabase';

// Applies an accepted idea to the real Google Ads account, and undoes it. Every change is first
// run with validate_only (Google checks it without saving), so a bad keyword, a policy problem or
// a wrong value is caught before anything is touched.

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
  /** Bid or daily budget, in the account's currency (e.g. 2.4). */
  value?: number;
  /** Ad copy: the lines to add. */
  headlines?: string[];
  descriptions?: string[];
}

const clean = (s: string) => s.replace(/[!"#$%()*+,./:;<=>?@[\]^_`{|}~\\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
const toMicros = (amount: number) => Math.round((amount * 1_000_000) / 10_000) * 10_000; // whole cents

type Customer = Awaited<ReturnType<typeof customerFor>>;

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

const payloadOf = (row: SuggestionRow) => (row.payload || {}) as Record<string, any>;

/** Runs `change` as a dry run first, then for real. */
async function validatedThenReal<T>(change: (options?: { validate_only: boolean }) => Promise<T>): Promise<T> {
  await change({ validate_only: true });
  return change();
}

type Asset = { text?: string; pinned_field?: number };
const assetsOf = (list: Asset[] | undefined) => (list || []).map((a) => ({ text: a.text, ...(a.pinned_field && a.pinned_field > 1 ? { pinned_field: a.pinned_field } : {}) }));

/**
 * Accepts a pending idea (optionally edited) and writes it to Google Ads.
 * Returns the saved row; on a Google error the row is marked failed with a readable reason.
 */
export async function applySuggestion(id: string, edits: SuggestionEdits = {}): Promise<SuggestionRow> {
  const row = await getSuggestion(id);
  if (!row) throw new Error('Suggestion not found.');
  if (row.status !== 'pending' && row.status !== 'failed') throw new Error(`This suggestion is already ${row.status}.`);
  if (row.type === 'advisory') return rejectSuggestion(id); // nothing to apply: "got it"

  const keywordKind = row.type === 'add_keyword' || row.type === 'add_negative';
  const text = keywordKind ? clean(edits.text ?? row.text) : row.text;
  const matchType = keywordKind ? edits.matchType ?? row.match_type : row.match_type;
  let payload = payloadOf(row);
  let edited = row.edited;
  if (keywordKind) {
    if (!text) throw new Error('The keyword can’t be empty.');
    if (text.length > 80 || text.split(' ').length > 10) throw new Error('That keyword is too long for Google Ads.');
    if (!MATCH[matchType]) throw new Error('Match type must be EXACT, PHRASE or BROAD.');
    edited = edited || text !== row.text || matchType !== row.match_type;
  }
  const level = edits.level === 'ad_group' && row.ad_group_id ? 'ad_group' : 'campaign';

  try {
    const customer = await customerFor(row);
    const cid = row.customer_id;
    let resource: string | null = null;

    if (row.type === 'add_keyword') {
      if (!row.ad_group_id) throw new Error('This keyword has no ad group to go into.');
      const op = [{ ad_group: `customers/${cid}/adGroups/${row.ad_group_id}`, status: enums.AdGroupCriterionStatus.ENABLED, keyword: { text, match_type: MATCH[matchType] } }];
      resource = firstResource(await validatedThenReal((o) => customer.adGroupCriteria.create(op, o)));
    } else if (row.type === 'add_negative') {
      if (level === 'ad_group') {
        const op = [{ ad_group: `customers/${cid}/adGroups/${row.ad_group_id}`, negative: true, keyword: { text, match_type: MATCH[matchType] } }];
        resource = firstResource(await validatedThenReal((o) => customer.adGroupCriteria.create(op, o)));
      } else {
        if (!row.campaign_id) throw new Error('This negative keyword has no campaign.');
        const op = [{ campaign: `customers/${cid}/campaigns/${row.campaign_id}`, negative: true, keyword: { text, match_type: MATCH[matchType] } }];
        resource = firstResource(await validatedThenReal((o) => customer.campaignCriteria.create(op, o)));
      }
    } else if (row.type === 'pause_keyword') {
      const op = [{ resource_name: String(payload.resource_name), status: enums.AdGroupCriterionStatus.PAUSED }];
      await validatedThenReal((o) => customer.adGroupCriteria.update(op, o));
      resource = String(payload.resource_name);
    } else if (row.type === 'change_bid') {
      const to = edits.value != null ? toMicros(edits.value) : Number(payload.to_micros);
      const from = Number(payload.from_micros);
      if (!(to > 0) || to > from * 3) throw new Error('That bid looks wrong (it must be above 0 and at most 3× the current bid).');
      const op = [{ resource_name: String(payload.resource_name), cpc_bid_micros: to }];
      await validatedThenReal((o) => customer.adGroupCriteria.update(op, o));
      resource = String(payload.resource_name);
      edited = edited || to !== Number(payload.to_micros);
      payload = { ...payload, to_micros: to };
    } else if (row.type === 'change_budget') {
      const to = edits.value != null ? toMicros(edits.value) : Number(payload.to_micros);
      const from = Number(payload.from_micros);
      if (!(to > 0) || to > from * 3) throw new Error('That budget looks wrong (it must be above 0 and at most 3× the current one).');
      const op = [{ resource_name: String(payload.budget_resource), amount_micros: to }];
      await validatedThenReal((o) => customer.campaignBudgets.update(op, o));
      resource = String(payload.budget_resource);
      edited = edited || to !== Number(payload.to_micros);
      payload = { ...payload, to_micros: to };
    } else if (row.type === 'new_ad_copy') {
      const original = (payload.original || {}) as { headlines?: Asset[]; descriptions?: Asset[] };
      const addH = (edits.headlines ?? (payload.add_headlines as string[]) ?? []).map((t) => t.trim()).filter(Boolean);
      const addD = (edits.descriptions ?? (payload.add_descriptions as string[]) ?? []).map((t) => t.trim()).filter(Boolean);
      if (addH.some((t) => t.length > 30)) throw new Error('A headline is longer than 30 characters.');
      if (addD.some((t) => t.length > 90)) throw new Error('A description is longer than 90 characters.');
      if (addH.some((t) => t.includes('!'))) throw new Error('Google doesn’t allow exclamation marks in headlines.');
      const headlines = [...assetsOf(original.headlines), ...addH.map((text) => ({ text }))];
      const descriptions = [...assetsOf(original.descriptions), ...addD.map((text) => ({ text }))];
      if (headlines.length > 15 || descriptions.length > 4) throw new Error('An ad can have at most 15 headlines and 4 descriptions.');
      if (!addH.length && !addD.length) throw new Error('Nothing to add.');
      const op = [{ resource_name: String(payload.ad_resource), responsive_search_ad: { headlines, descriptions } }];
      await validatedThenReal((o) => customer.ads.update(op as never, o));
      resource = String(payload.ad_resource);
      edited = edited || JSON.stringify(addH) !== JSON.stringify(payload.add_headlines) || JSON.stringify(addD) !== JSON.stringify(payload.add_descriptions);
      payload = { ...payload, add_headlines: addH, add_descriptions: addD };
    } else {
      throw new Error('That kind of idea can’t be applied.');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('ads_suggestions')
      .update({ status: 'applied', text, match_type: matchType, edited, resource_name: resource, payload, error: null, decided_at: now, applied_at: now })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SuggestionRow;
  } catch (error) {
    const message = describeAdsError(error);
    await supabase.from('ads_suggestions').update({ status: 'failed', error: message }).eq('id', id);
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

async function reverse(row: SuggestionRow, customer: Customer) {
  const p = payloadOf(row);
  switch (row.type) {
    case 'add_keyword':
    case 'add_negative':
      if (!row.resource_name) throw new Error('Nothing to undo.');
      if (row.resource_name.includes('/campaignCriteria/')) await customer.campaignCriteria.remove([row.resource_name]);
      else await customer.adGroupCriteria.remove([row.resource_name]);
      return;
    case 'pause_keyword':
      await customer.adGroupCriteria.update([{ resource_name: String(p.resource_name), status: enums.AdGroupCriterionStatus.ENABLED }]);
      return;
    case 'change_bid':
      await customer.adGroupCriteria.update([{ resource_name: String(p.resource_name), cpc_bid_micros: Number(p.from_micros) }]);
      return;
    case 'change_budget':
      await customer.campaignBudgets.update([{ resource_name: String(p.budget_resource), amount_micros: Number(p.from_micros) }]);
      return;
    case 'new_ad_copy': {
      const original = (p.original || {}) as { headlines?: Asset[]; descriptions?: Asset[] };
      await customer.ads.update([{ resource_name: String(p.ad_resource), responsive_search_ad: { headlines: assetsOf(original.headlines), descriptions: assetsOf(original.descriptions) } }] as never);
      return;
    }
    default:
      throw new Error('That can’t be undone.');
  }
}

/** Reverses what an applied idea changed in Google Ads (removes it, or restores the old value). */
export async function undoSuggestion(id: string): Promise<SuggestionRow> {
  const row = await getSuggestion(id);
  if (!row) throw new Error('Suggestion not found.');
  if (row.status !== 'applied') throw new Error('Only an applied change can be undone.');
  try {
    await reverse(row, await customerFor(row));
  } catch (error) {
    throw new Error(describeAdsError(error));
  }
  const { data, error } = await supabase.from('ads_suggestions').update({ status: 'undone', resource_name: null, decided_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as SuggestionRow;
}
