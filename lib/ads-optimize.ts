import { aiJson } from './ai-json';
import { getAdsClient } from './google-ads';
import { clientFileText } from './memory-files';

// The other kinds of Google Ads ideas, besides keywords and negative keywords:
//   pause_keyword   keywords that spent money and never converted
//   change_bid      raise the bid on a keyword that converts well (manual bidding only)
//   change_budget   raise the daily budget of a campaign that converts but runs out of budget
//   new_ad_copy     extra headlines / descriptions for a responsive search ad (AI written)
//   advisory        a heads-up with nothing to apply: conversions not recorded, a disapproved
//                   ad, low quality scores, hours that burn money
// Numbers come from Google Ads; only the ad copy uses the AI. Everything is a pending card.

export type OptimizeType = 'pause_keyword' | 'change_bid' | 'change_budget' | 'new_ad_copy' | 'advisory';

export interface Idea {
  type: OptimizeType;
  campaign_id: string | null;
  campaign_name: string | null;
  ad_group_id: string | null;
  ad_group_name: string | null;
  text: string; // short title / the keyword or campaign it is about
  reason: string;
  evidence: { clicks?: number; cost?: number; conversions?: number; impressions?: number; currency?: string };
  client_line: string | null;
  payload: Record<string, unknown>;
}

type Row = Record<string, Record<string, unknown> | undefined>;
const num = (v: unknown) => Number(v || 0);
const micros = (v: unknown) => num(v) / 1_000_000;
const money = (n: number) => `$${n.toFixed(2)}`;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}
function enumName(value: unknown, names: Record<number, string>) {
  return typeof value === 'number' ? names[value] || '' : String(value ?? '').toUpperCase();
}
const STRENGTH: Record<number, string> = { 2: 'PENDING', 3: 'NO_ADS', 4: 'POOR', 5: 'AVERAGE', 6: 'GOOD', 7: 'EXCELLENT' };
const APPROVAL: Record<number, string> = { 2: 'DISAPPROVED', 3: 'APPROVED_LIMITED', 4: 'APPROVED' };
const MANUAL_CPC = 3;
const isManualCpc = (v: unknown) => v === MANUAL_CPC || String(v).toUpperCase() === 'MANUAL_CPC';

export interface OptimizeInput {
  clientId: string;
  customerId: string;
  brand: string;
  currency: string;
  notes: string;
  terms: { term: string; adGroupId: string; clicks: number; conversions: number }[];
}

export async function analyzeOptimizations(input: OptimizeInput): Promise<Idea[]> {
  const { client, refreshToken } = await getAdsClient();
  const customer = client.Customer({ customer_id: input.customerId, refresh_token: refreshToken });
  const range = `segments.date BETWEEN '${daysAgo(90)}' AND '${daysAgo(0)}'`;
  const ideas: Idea[] = [];
  const cur = input.currency;

  // ---------- keywords ----------
  const kwRows = (await customer.query(`
    SELECT ad_group_criterion.resource_name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.quality_info.quality_score, ad_group_criterion.effective_cpc_bid_micros, ad_group_criterion.cpc_bid_micros,
           ad_group.id, ad_group.name, campaign.id, campaign.name, campaign.bidding_strategy_type,
           metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions
    FROM keyword_view
    WHERE ${range} AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status = 'ENABLED'
      AND ad_group.status = 'ENABLED' AND campaign.status = 'ENABLED'
  `).catch(() => [])) as Row[];

  const keywords = kwRows.map((r) => ({
    resource: String(r.ad_group_criterion?.resource_name || ''),
    text: String((r.ad_group_criterion?.keyword as { text?: string })?.text || ''),
    quality: num((r.ad_group_criterion?.quality_info as { quality_score?: number })?.quality_score),
    bid: num(r.ad_group_criterion?.cpc_bid_micros),
    effective: num(r.ad_group_criterion?.effective_cpc_bid_micros),
    adGroupId: String(r.ad_group?.id ?? ''),
    adGroupName: String(r.ad_group?.name ?? ''),
    campaignId: String(r.campaign?.id ?? ''),
    campaignName: String(r.campaign?.name ?? ''),
    manual: isManualCpc(r.campaign?.bidding_strategy_type),
    clicks: num(r.metrics?.clicks),
    impressions: num(r.metrics?.impressions),
    cost: micros(r.metrics?.cost_micros),
    conversions: num(r.metrics?.conversions),
  }));
  const totalConversions = keywords.reduce((s, k) => s + k.conversions, 0);
  const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0);
  const totalCost = keywords.reduce((s, k) => s + k.cost, 0);
  const trackingWorks = totalConversions >= 1;

  // Without recorded conversions, "no conversions" says nothing about a keyword: don't pause or re-bid
  // anything, and tell Ahmed the tracking needs a look instead.
  if (!trackingWorks && totalClicks >= 30) {
    ideas.push({
      type: 'advisory',
      campaign_id: null,
      campaign_name: null,
      ad_group_id: null,
      ad_group_name: null,
      text: 'No conversions are being recorded',
      reason: `${totalClicks} clicks and ${money(totalCost)} spent in 90 days, but Google Ads recorded 0 conversions. If the client does get calls or forms, tracking is probably not set up or is broken, so every ads decision (including these ideas) is flying blind. Fix this first.`,
      evidence: { clicks: totalClicks, cost: Math.round(totalCost * 100) / 100, conversions: 0, currency: cur },
      client_line: 'We are checking that every call and enquiry from your ads is being counted correctly.',
      payload: { advice: 'conversion-tracking' },
    });
  }

  if (trackingWorks) {
    const avgCost = totalCost / Math.max(1, totalConversions);

    // Pause keywords that spent real money and never converted.
    const weak = keywords
      .filter((k) => k.conversions === 0 && k.cost >= Math.max(15, avgCost * 1.5) && k.clicks >= 10)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
    for (const k of weak) {
      ideas.push({
        type: 'pause_keyword',
        campaign_id: k.campaignId,
        campaign_name: k.campaignName,
        ad_group_id: k.adGroupId,
        ad_group_name: k.adGroupName,
        text: k.text,
        reason: `Spent ${money(k.cost)} on ${k.clicks} clicks in 90 days with no conversions, while the account averages ${money(avgCost)} per conversion.`,
        evidence: { clicks: k.clicks, cost: Math.round(k.cost * 100) / 100, conversions: 0, impressions: k.impressions, currency: cur },
        client_line: 'We paused a search phrase that cost money without bringing enquiries.',
        payload: { resource_name: k.resource },
      });
    }

    // Raise the bid on keywords that convert cheaply (manual bidding only: smart bidding has no keyword bids).
    const strong = keywords
      .filter((k) => k.manual && k.bid > 0 && k.conversions >= 2 && k.cost / k.conversions <= avgCost * 0.8)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
    for (const k of strong) {
      const to = Math.round((k.bid * 1.2) / 10_000) * 10_000; // +20%, in whole cents
      if (to <= k.bid) continue;
      ideas.push({
        type: 'change_bid',
        campaign_id: k.campaignId,
        campaign_name: k.campaignName,
        ad_group_id: k.adGroupId,
        ad_group_name: k.adGroupName,
        text: k.text,
        reason: `${k.conversions} conversions at ${money(k.cost / k.conversions)} each, cheaper than the account average of ${money(avgCost)}. Raising the bid from ${money(micros(k.bid))} to ${money(micros(to))} should win more of these searches.`,
        evidence: { clicks: k.clicks, cost: Math.round(k.cost * 100) / 100, conversions: k.conversions, impressions: k.impressions, currency: cur },
        client_line: 'We are putting a little more budget behind a search phrase that brings you the most enquiries.',
        payload: { resource_name: k.resource, from_micros: k.bid, to_micros: to },
      });
    }
  }

  // Low quality score: nothing to apply, but worth knowing.
  const lowQs = keywords.filter((k) => k.quality > 0 && k.quality <= 3 && k.impressions >= 100).sort((a, b) => b.impressions - a.impressions).slice(0, 6);
  if (lowQs.length) {
    ideas.push({
      type: 'advisory',
      campaign_id: null,
      campaign_name: null,
      ad_group_id: null,
      ad_group_name: null,
      text: 'Keywords with a low quality score',
      reason: `${lowQs.map((k) => `“${k.text}” (${k.quality}/10)`).join(', ')}. A low score makes each click cost more. Usually the ad or landing page doesn't match the keyword: tighten the ad group, or make the page mention these words.`,
      evidence: { impressions: lowQs.reduce((s, k) => s + k.impressions, 0), currency: cur },
      client_line: null,
      payload: { advice: 'quality-score' },
    });
  }

  // ---------- budgets ----------
  if (trackingWorks) {
    const budgetRows = (await customer.query(`
      SELECT campaign.id, campaign.name, campaign.bidding_strategy_type, campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.explicitly_shared,
             metrics.cost_micros, metrics.conversions, metrics.clicks, metrics.impressions, metrics.search_budget_lost_impression_share
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS AND campaign.status = 'ENABLED' AND campaign.advertising_channel_type = 'SEARCH'
    `).catch(() => [])) as Row[];
    for (const r of budgetRows) {
      const budget = r.campaign_budget as { resource_name?: string; amount_micros?: number; explicitly_shared?: boolean } | undefined;
      const lost = num(r.metrics?.search_budget_lost_impression_share);
      const conv = num(r.metrics?.conversions);
      const cost = micros(r.metrics?.cost_micros);
      const amount = num(budget?.amount_micros);
      if (!budget?.resource_name || budget.explicitly_shared || amount <= 0 || lost < 0.2 || conv < 2) continue;
      if (cost / conv > (totalCost / Math.max(1, totalConversions)) * 1.2) continue; // not cheaper than usual: more money won't help
      const to = Math.round((amount * 1.25) / 10_000) * 10_000;
      ideas.push({
        type: 'change_budget',
        campaign_id: String(r.campaign?.id ?? ''),
        campaign_name: String(r.campaign?.name ?? ''),
        ad_group_id: null,
        ad_group_name: null,
        text: String(r.campaign?.name ?? 'Campaign'),
        reason: `The ads miss about ${Math.round(lost * 100)}% of possible searches because the daily budget runs out, while this campaign brought ${conv} conversions at ${money(cost / conv)} each. Raising the daily budget from ${money(micros(amount))} to ${money(micros(to))} (+25%) means about ${money(micros(to - amount) * 30)} more spend a month.`,
        evidence: { clicks: num(r.metrics?.clicks), cost: Math.round(cost * 100) / 100, conversions: conv, impressions: num(r.metrics?.impressions), currency: cur },
        client_line: 'We are raising the daily ad budget slightly because your ads are running out of budget on days when they perform well.',
        payload: { budget_resource: budget.resource_name, from_micros: amount, to_micros: to },
      });
    }
  }

  // ---------- ads: copy ideas and problems ----------
  const adRows = (await customer.query(`
    SELECT ad_group_ad.ad.resource_name, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions,
           ad_group_ad.ad.final_urls, ad_group_ad.ad_strength, ad_group_ad.policy_summary.approval_status,
           ad_group.id, ad_group.name, campaign.id, campaign.name, metrics.clicks, metrics.impressions
    FROM ad_group_ad
    WHERE ${range} AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD' AND ad_group_ad.status = 'ENABLED' AND campaign.status = 'ENABLED' AND ad_group.status = 'ENABLED'
  `).catch(() => [])) as Row[];

  type Asset = { text?: string; pinned_field?: number };
  let copyIdeas = 0;
  for (const r of adRows) {
    const ad = r.ad_group_ad?.ad as { resource_name?: string; responsive_search_ad?: { headlines?: Asset[]; descriptions?: Asset[] }; final_urls?: string[] } | undefined;
    const adGroupId = String(r.ad_group?.id ?? '');
    const approval = enumName((r.ad_group_ad?.policy_summary as { approval_status?: unknown } | undefined)?.approval_status, APPROVAL);
    if (approval === 'DISAPPROVED') {
      ideas.push({
        type: 'advisory',
        campaign_id: String(r.campaign?.id ?? ''),
        campaign_name: String(r.campaign?.name ?? ''),
        ad_group_id: adGroupId,
        ad_group_name: String(r.ad_group?.name ?? ''),
        text: `A disapproved ad in ${r.ad_group?.name ?? 'an ad group'}`,
        reason: 'Google disapproved this ad, so it is not showing. Open the ad in Google Ads to see the policy reason and edit it.',
        evidence: { currency: cur },
        client_line: null,
        payload: { advice: 'disapproved-ad' },
      });
      continue;
    }

    const headlines = (ad?.responsive_search_ad?.headlines || []).filter((h) => h.text);
    const descriptions = (ad?.responsive_search_ad?.descriptions || []).filter((d) => d.text);
    const strength = enumName(r.ad_group_ad?.ad_strength, STRENGTH);
    if (!ad?.resource_name || copyIdeas >= 2 || (headlines.length >= 15 && descriptions.length >= 4) || strength === 'EXCELLENT') continue;

    const adTerms = input.terms.filter((t) => t.adGroupId === adGroupId && t.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 12).map((t) => t.term);
    const file = await clientFileText(input.clientId, input.brand).catch(() => '');
    let raw: Record<string, unknown>;
    try {
      raw = await aiJson({
        system: `You write Google Ads responsive search ad text for a small local business. Add NEW headlines and descriptions that differ from the existing ones, in the same language, using only facts that already appear in the existing ads, the notes or the client file (never invent prices, offers, awards, years in business, guarantees or services). Headlines: max 30 characters each, no exclamation marks, no ALL CAPS words, no phone numbers. Descriptions: max 90 characters. Work in what people actually search (the search terms) so the ad matches them. Return ONLY JSON: {"headlines":["..."],"descriptions":["..."]} with up to ${Math.max(0, 15 - headlines.length)} (max 5) headlines and up to ${Math.max(0, 4 - descriptions.length)} (max 2) descriptions.`,
        user: `Business: ${input.brand}\n${input.notes ? `Notes: ${input.notes}\n` : ''}${file ? `${file}\n` : ''}Ad group: ${r.ad_group?.name}\nLanding page: ${(ad.final_urls || [])[0] || 'n/a'}\nCurrent headlines: ${headlines.map((h) => h.text).join(' | ')}\nCurrent descriptions: ${descriptions.map((d) => d.text).join(' | ')}\nTop searches in this ad group: ${adTerms.join(', ') || 'n/a'}\nAd strength: ${strength}`,
        feature: 'check',
        timeBudgetMs: 25_000,
      });
    } catch {
      continue;
    }
    const have = new Set([...headlines, ...descriptions].map((a) => String(a.text).toLowerCase()));
    const clean = (list: unknown, max: number, limit: number) =>
      (Array.isArray(list) ? list : [])
        .map((t) => String(t).trim())
        .filter((t) => t && t.length <= max && !/[!]/.test(t) && !have.has(t.toLowerCase()))
        .filter((t, i, all) => all.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i)
        .slice(0, limit);
    const addHeadlines = clean(raw.headlines, 30, Math.min(5, 15 - headlines.length));
    const addDescriptions = clean(raw.descriptions, 90, Math.min(2, 4 - descriptions.length));
    if (!addHeadlines.length && !addDescriptions.length) continue;
    copyIdeas++;
    ideas.push({
      type: 'new_ad_copy',
      campaign_id: String(r.campaign?.id ?? ''),
      campaign_name: String(r.campaign?.name ?? ''),
      ad_group_id: adGroupId,
      ad_group_name: String(r.ad_group?.name ?? ''),
      text: `New ad text for ${r.ad_group?.name ?? 'the ad'}`,
      reason: `The ad has ${headlines.length} of 15 headlines and ${descriptions.length} of 4 descriptions (strength: ${strength.toLowerCase() || 'unknown'}). More variety lets Google match the ad to more searches. Adding ${addHeadlines.length} headline${addHeadlines.length === 1 ? '' : 's'} and ${addDescriptions.length} description${addDescriptions.length === 1 ? '' : 's'}; the ad is reviewed by Google again after the change.`,
      evidence: { clicks: num(r.metrics?.clicks), impressions: num(r.metrics?.impressions), currency: cur },
      client_line: 'We added new wording to your ad so it matches more of what customers search for.',
      payload: {
        ad_resource: ad.resource_name,
        add_headlines: addHeadlines,
        add_descriptions: addDescriptions,
        original: { headlines, descriptions },
      },
    });
  }

  // ---------- hours that burn money (advice only) ----------
  if (trackingWorks && totalConversions >= 5) {
    const hourRows = (await customer.query(`
      SELECT segments.hour, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE ${range} AND campaign.status = 'ENABLED'
    `).catch(() => [])) as Row[];
    const blocks = [
      { label: '12 AM–6 AM', from: 0, to: 5, cost: 0, conv: 0 },
      { label: '6 AM–12 PM', from: 6, to: 11, cost: 0, conv: 0 },
      { label: '12 PM–6 PM', from: 12, to: 17, cost: 0, conv: 0 },
      { label: '6 PM–12 AM', from: 18, to: 23, cost: 0, conv: 0 },
    ];
    let all = 0;
    for (const r of hourRows) {
      const h = num(r.segments?.hour);
      const b = blocks.find((x) => h >= x.from && h <= x.to);
      const c = micros(r.metrics?.cost_micros);
      all += c;
      if (b) {
        b.cost += c;
        b.conv += num(r.metrics?.conversions);
      }
    }
    for (const b of blocks) {
      if (all > 0 && b.cost / all >= 0.2 && b.conv === 0) {
        ideas.push({
          type: 'advisory',
          campaign_id: null,
          campaign_name: null,
          ad_group_id: null,
          ad_group_name: null,
          text: `Ads run ${b.label} without results`,
          reason: `${Math.round((b.cost / all) * 100)}% of the spend (${money(b.cost)}) went to ${b.label} with no conversions, while the account got ${totalConversions} elsewhere. Consider an ad schedule that lowers or pauses those hours. This needs a decision about the client's business hours, so it is advice only.`,
          evidence: { cost: Math.round(b.cost * 100) / 100, conversions: 0, currency: cur },
          client_line: null,
          payload: { advice: 'ad-schedule', block: b.label },
        });
      }
    }
  }

  return ideas;
}
