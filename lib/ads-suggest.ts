import crypto from 'crypto';
import { aiJson } from './ai-json';
import { clientAdsAccounts, describeAdsError } from './ads-metrics';
import { getDoc } from './data/store';
import { getAdsClient } from './google-ads';
import { clientFileText } from './memory-files';
import { supabase } from './supabase';

// Looks at a client's Google Ads account (last 30 days of real search terms) and proposes
// improvements: negative keywords for wasted spend, new keywords from searches that converted.
// Proposals are only saved as 'pending' rows (ads_suggestions). Nothing changes in Google Ads until
// Ahmed accepts a card in the Anwarz app (lib/ads-apply.ts).

export type SuggestionType = 'add_keyword' | 'add_negative';
export type MatchType = 'EXACT' | 'PHRASE' | 'BROAD';
export type SuggestionStatus = 'pending' | 'applied' | 'rejected' | 'failed' | 'undone';

export interface SuggestionRow {
  id: string;
  client_id: string;
  customer_id: string;
  type: SuggestionType;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_group_id: string | null;
  ad_group_name: string | null;
  text: string;
  match_type: MatchType;
  reason: string | null;
  evidence: { clicks?: number; cost?: number; conversions?: number; impressions?: number; currency?: string } | null;
  client_line: string | null;
  status: SuggestionStatus;
  edited: boolean;
  error: string | null;
  resource_name: string | null;
  notified_at: string | null;
  created_at: string;
  decided_at: string | null;
  applied_at: string | null;
}

const MAX_NEGATIVES = 15;
const MAX_KEYWORDS = 8;

const norm = (s: string) => s.toLowerCase().replace(/[!"#$%()*+,./:;<=>?@[\]^_`{|}~\\]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s: string) => norm(s).split(' ').filter(Boolean);
const subsetOf = (small: string[], big: string[]) => small.length > 0 && small.every((w) => big.includes(w));

/** Google returns enums as numbers (or names): turn either into the name. */
function enumName(value: unknown, names: Record<number, string>) {
  if (typeof value === 'number') return names[value] || '';
  return String(value ?? '').toUpperCase();
}
const MATCH_NAMES: Record<number, string> = { 2: 'EXACT', 3: 'PHRASE', 4: 'BROAD' };
const TARGETING_NAMES: Record<number, string> = { 2: 'ADDED', 3: 'EXCLUDED', 4: 'ADDED_EXCLUDED', 5: 'NONE' };

interface Term {
  term: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  clicks: number;
  impressions: number;
  cost: number;
  conversions: number;
  targeted: boolean; // already a keyword or already excluded
}

interface Existing {
  keywords: { text: string; campaignId: string }[];
  negatives: { text: string; match: string; campaignId: string }[];
}

type Row = Record<string, Record<string, unknown> | undefined>;

async function readAccount(customerId: string): Promise<{ terms: Term[]; existing: Existing }> {
  const { client, refreshToken } = await getAdsClient();
  const customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });

  const termRows = (await customer.query(`
    SELECT search_term_view.search_term, search_term_view.status, campaign.id, campaign.name, ad_group.id, ad_group.name,
           metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${daysAgo(90)}' AND '${daysAgo(0)}' AND metrics.impressions > 0
  `)) as Row[];

  const terms: Term[] = termRows.map((r) => {
    const m = r.metrics || {};
    const status = enumName(r.search_term_view?.status, TARGETING_NAMES);
    return {
      term: String(r.search_term_view?.search_term || ''),
      campaignId: String(r.campaign?.id ?? ''),
      campaignName: String(r.campaign?.name ?? ''),
      adGroupId: String(r.ad_group?.id ?? ''),
      adGroupName: String(r.ad_group?.name ?? ''),
      clicks: Number(m.clicks || 0),
      impressions: Number(m.impressions || 0),
      cost: Number(m.cost_micros || 0) / 1_000_000,
      conversions: Number(m.conversions || 0),
      targeted: status === 'ADDED' || status === 'EXCLUDED' || status === 'ADDED_EXCLUDED',
    };
  });

  const keywordRows = (await customer.query(`
    SELECT ad_group_criterion.keyword.text, campaign.id
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status != 'REMOVED'
  `)) as Row[];
  const campaignNegRows = (await customer.query(`
    SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign.id
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE
  `)) as Row[];
  const groupNegRows = (await customer.query(`
    SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, campaign.id
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = TRUE AND ad_group_criterion.status != 'REMOVED'
  `)) as Row[];

  const kw = (r: Row, key: 'ad_group_criterion' | 'campaign_criterion') => {
    const k = (r[key]?.keyword || {}) as { text?: string; match_type?: unknown };
    return { text: String(k.text || ''), match: enumName(k.match_type, MATCH_NAMES) };
  };
  return {
    terms,
    existing: {
      keywords: keywordRows.map((r) => ({ text: kw(r, 'ad_group_criterion').text, campaignId: String(r.campaign?.id ?? '') })),
      negatives: [
        ...campaignNegRows.map((r) => ({ ...kw(r, 'campaign_criterion'), campaignId: String(r.campaign?.id ?? '') })),
        ...groupNegRows.map((r) => ({ ...kw(r, 'ad_group_criterion'), campaignId: String(r.campaign?.id ?? '') })),
      ],
    },
  };
}

/** True when an existing negative keyword already blocks this search term in that campaign. */
function alreadyBlocked(term: string, campaignId: string, negatives: Existing['negatives']) {
  const t = words(term);
  return negatives.some((n) => {
    if (n.campaignId !== campaignId) return false;
    const nw = words(n.text);
    return n.match === 'EXACT' ? norm(n.text) === norm(term) : subsetOf(nw, t);
  });
}

interface Candidate {
  kind: 'negative' | 'keyword';
  term: Term;
}

/** Picks what's worth asking the AI about, from facts only (no guessing). */
function candidates(terms: Term[], existing: Existing): Candidate[] {
  // Same search in several ad groups of one campaign: one row.
  const merged = new Map<string, Term>();
  for (const t of terms) {
    const key = `${t.campaignId}|${norm(t.term)}`;
    const m = merged.get(key);
    if (!m) merged.set(key, { ...t });
    else {
      m.clicks += t.clicks;
      m.impressions += t.impressions;
      m.cost += t.cost;
      m.conversions += t.conversions;
      m.targeted = m.targeted || t.targeted;
    }
  }
  const all = [...merged.values()];
  const wasted = all
    .filter((t) => t.conversions === 0 && t.clicks >= 2 && t.cost > 0 && !t.targeted && !alreadyBlocked(t.term, t.campaignId, existing.negatives))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 40)
    .map((term): Candidate => ({ kind: 'negative', term }));
  const winners = all
    .filter((t) => t.conversions >= 1 && !t.targeted && !existing.keywords.some((k) => norm(k.text) === norm(t.term)))
    .sort((a, b) => b.conversions - a.conversions || a.cost - b.cost)
    .slice(0, 20)
    .map((term): Candidate => ({ kind: 'keyword', term }));
  return [...wasted, ...winners];
}

interface Verdict {
  i: number;
  action: 'negative' | 'keyword' | 'skip';
  text?: string;
  match?: string;
  reason?: string;
  client_line?: string;
}

async function askAi(clientId: string, brand: string, notes: string, campaigns: string[], list: Candidate[], currency: string): Promise<Verdict[]> {
  const file = await clientFileText(clientId, brand).catch(() => '');
  const lines = list.map(
    (c, i) =>
      `${i}. [${c.kind === 'negative' ? 'WASTED' : 'CONVERTED'}] "${c.term.term}" campaign="${c.term.campaignName}" clicks=${c.term.clicks} cost=${c.term.cost.toFixed(2)} ${currency} conversions=${c.term.conversions}`,
  );
  const raw = await aiJson({
    system: `You are a careful Google Ads specialist reviewing real search terms for a small-business client. Decide for each numbered search term:
- WASTED terms (spent money, 0 conversions): "negative" ONLY if the search clearly shows the wrong intent for this business (free/DIY/jobs/unrelated product/other city or service). If it could plausibly be a customer, or you're unsure, "skip". For "negative" you may suggest a shorter "text" (one or two words that capture the bad intent, e.g. "free") only if that word would never appear in a good search for this business; otherwise use the full term. Prefer match "PHRASE", use "EXACT" for a single bad full term.
- CONVERTED terms (got conversions): "keyword" if it is a relevant, specific search worth bidding on directly. Use "EXACT" for the term as is, or "PHRASE" if a broader phrase makes sense. Otherwise "skip".
- A WASTED term may ALSO be "keyword" (instead of negative) when it is clearly the core service the business sells, has real clicks, and a dedicated keyword would give control over its bid and ad. Otherwise "skip".
Never suggest negatives that contain the brand name, the main service words, or the business location. "reason" is one short plain sentence for the owner of the account (mention the numbers). "client_line" is one plain, non-technical sentence the client would understand (no jargon like "negative keyword" or "match type"). Return ONLY JSON: {"items":[{"i":0,"action":"negative|keyword|skip","text":"...","match":"EXACT|PHRASE","reason":"...","client_line":"..."}]}`,
    user: `Business: ${brand}\n${notes ? `Notes: ${notes}\n` : ''}Campaigns: ${campaigns.join(', ') || 'n/a'}\n${file ? `${file}\n` : ''}\nSearch terms (last 90 days):\n${lines.join('\n')}`,
    feature: 'check',
    timeBudgetMs: 40_000,
  });
  return Array.isArray(raw.items) ? (raw.items as Verdict[]) : [];
}

/** Hard safety rules that don't depend on what the AI said. */
function negativeIsSafe(text: string, campaignId: string, terms: Term[], existing: Existing, brandWords: string[]) {
  const nw = words(text);
  if (!nw.length || nw.length > 4 || text.length > 80) return false;
  if (nw.some((w) => brandWords.includes(w))) return false;
  // It must never block a search that already brought a conversion in this campaign...
  if (terms.some((t) => t.campaignId === campaignId && t.conversions > 0 && subsetOf(nw, words(t.term)))) return false;
  // ...nor one of the account's own keywords.
  if (existing.keywords.some((k) => k.campaignId === campaignId && subsetOf(nw, words(k.text)))) return false;
  return true;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

function newId() {
  return crypto.randomBytes(6).toString('base64url');
}

/**
 * Checks one client's Google Ads account(s) and saves new pending suggestions.
 * Search terms already proposed (any status but failed) are not proposed twice.
 */
export async function generateSuggestions(clientId: string): Promise<{ created: SuggestionRow[]; scanned: number; problems: string[] }> {
  const accounts = await clientAdsAccounts(clientId);
  if (!accounts.length) throw new Error('This client has no Google Ads account linked.');
  const clientDoc = await getDoc<{ brandName?: string }>('clients', clientId);
  const brand = clientDoc?.brandName || 'the client';
  const brandWords = words(brand).filter((w) => w.length > 2);

  const created: SuggestionRow[] = [];
  const problems: string[] = [];
  let scanned = 0;

  for (const account of accounts) {
    try {
      const { terms, existing } = await readAccount(account.customerId);
      scanned += terms.length;
      const picked = candidates(terms, existing);
      if (!picked.length) continue;

      const accountDoc = await getDoc<{ aiPromptNotes?: string }>('google_ads_accounts', account.customerId).catch(() => null);
      const campaigns = [...new Set(terms.map((t) => t.campaignName).filter(Boolean))];
      const verdicts = await askAi(clientId, brand, accountDoc?.aiPromptNotes || '', campaigns, picked, account.currency);

      const { data: prior } = await supabase.from('ads_suggestions').select('type,text,campaign_id').eq('customer_id', account.customerId).neq('status', 'failed');
      const seen = new Set((prior || []).map((p) => `${p.type}|${p.campaign_id || ''}|${norm(String(p.text))}`));

      let negatives = 0;
      let keywords = 0;
      for (const v of verdicts) {
        const c = picked[Number(v.i)];
        if (!c || v.action === 'skip') continue;
        const match: MatchType = v.match === 'EXACT' ? 'EXACT' : 'PHRASE';
        const t = c.term;
        let type: SuggestionType;
        let text: string;
        if (c.kind === 'negative' && v.action === 'negative') {
          type = 'add_negative';
          text = norm(v.text || t.term);
          if (negatives >= MAX_NEGATIVES || !negativeIsSafe(text, t.campaignId, terms, existing, brandWords)) continue;
        } else if (v.action === 'keyword' && (c.kind === 'keyword' || (c.kind === 'negative' && t.clicks >= 3))) {
          type = 'add_keyword';
          text = norm(v.text || t.term);
          if (keywords >= MAX_KEYWORDS || !text || text.length > 80 || words(text).length > 6) continue;
          if (existing.keywords.some((k) => k.campaignId === t.campaignId && norm(k.text) === text)) continue;
        } else continue;

        const key = `${type}|${t.campaignId}|${text}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const row = {
          id: newId(),
          client_id: clientId,
          customer_id: account.customerId,
          type,
          campaign_id: t.campaignId,
          campaign_name: t.campaignName,
          ad_group_id: type === 'add_keyword' ? t.adGroupId : null,
          ad_group_name: type === 'add_keyword' ? t.adGroupName : null,
          text,
          match_type: type === 'add_negative' && text === norm(t.term) && v.match === 'EXACT' ? 'EXACT' : match,
          reason: (v.reason || '').slice(0, 300) || null,
          evidence: { clicks: t.clicks, cost: Math.round(t.cost * 100) / 100, conversions: t.conversions, impressions: t.impressions, currency: account.currency },
          client_line: (v.client_line || '').slice(0, 300) || null,
        };
        const { data, error } = await supabase.from('ads_suggestions').insert(row).select().single();
        if (error) throw new Error(error.message);
        created.push(data as SuggestionRow);
        if (type === 'add_negative') negatives++;
        else keywords++;
      }
    } catch (error) {
      problems.push(`${account.name}: ${describeAdsError(error)}`);
    }
  }
  return { created, scanned, problems };
}

export async function listSuggestions(opts: { clientId?: string | null; status?: SuggestionStatus | 'all' } = {}): Promise<SuggestionRow[]> {
  let q = supabase.from('ads_suggestions').select().order('created_at', { ascending: false }).limit(300);
  if (opts.clientId) q = q.eq('client_id', opts.clientId);
  if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []) as SuggestionRow[];
}

export async function getSuggestion(id: string): Promise<SuggestionRow | null> {
  const { data, error } = await supabase.from('ads_suggestions').select().eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SuggestionRow) || null;
}
