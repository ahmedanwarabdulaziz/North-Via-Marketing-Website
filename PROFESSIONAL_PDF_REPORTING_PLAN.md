# Professional PDF Reporting and Client Intelligence Plan

This is the implementation handoff for upgrading `/admin/ads` and `/admin/ads/print` into a premium client-ready Google Ads PDF reporting system.

The goal is not to create a basic Google Ads export. The goal is to generate a professional agency report that tells the client:

- What happened.
- Whether performance improved or declined.
- Which campaigns, searches, cities, devices, and conversion actions drove results.
- What North Via Marketing recommends next.

## Current App Structure

Existing relevant files:

- `app/admin/ads/page.tsx`
  - Loads Google Ads accounts.
  - Loads CRM clients.
  - Supports `?accountId=...` and CRM client selection.

- `app/admin/ads/ads-dashboard-client.tsx`
  - Shows CRM client/account selector.
  - Shows current vs previous period.
  - Fetches metrics, campaigns, and search terms.
  - Supports linked multi-account clients.
  - Has a PDF button currently labeled `Generate Super PDF`.

- `app/admin/ads/print/page.tsx`
  - Generates the print/PDF route.
  - Fetches customer metrics, past metrics, and campaigns.
  - Generates account-specific AI summaries.
  - Generates global AI conclusion for CRM clients or multi-account reports.

- `app/actions/ads-reports.ts`
  - Current actions:
    - `fetchCustomerMetrics`
    - `fetchCampaignMetrics`
    - `fetchSearchTermMetrics`

- `app/actions/generate-report.ts`
  - Generates AI executive summary and overall conclusion.
  - Already uses CRM context:
    - `contactName`
    - `aiBehavioralNotes`
    - `aiAvoidanceWarnings`

- `app/admin/clients`
  - Existing CRM client registry.
  - Links clients to one or more Google Ads accounts.

- `types/database.ts`
  - Defines `ClientProfile`, `GoogleAdsAccount`, and report-related types.

## Report Philosophy

The PDF must prioritize business outcomes, not vanity metrics.

Top-level client questions:

- How much did we spend?
- How many leads did we generate?
- What was the cost per lead?
- Are results improving compared with the previous period?
- Which campaigns, search terms, cities, and devices are worth more budget?
- What should happen next?

Metric priority:

1. Leads / conversions.
2. Cost per lead.
3. Spend.
4. Conversion rate.
5. CTR.
6. Average CPC.
7. Clicks.
8. Impressions.

Use customer-friendly labels:

- `Conversions` -> `Leads`
- `Cost per conversion` -> `Cost per lead`
- `CTR` -> `Click-through rate`
- `Average CPC` -> `Avg. cost per click`

## Non-Negotiable AI Rules

AI can explain the report, but AI must not invent the report.

Rules:

- All numbers must come from deterministic code.
- AI must not invent lead quality, revenue, customer sentiment, calls, bookings, or next steps unless supported by Google Ads data or CRM notes.
- AI must not reveal internal CRM notes or avoidance warnings.
- AI must not mention channels that are not included in the report.
- If only Google Ads data is present, do not call the report "multi-channel" or "multi-network".
- If conversion tracking is missing or suspicious, the report should say tracking needs review.
- AI should receive structured report facts, not a loose blob of raw metrics.

## Phase 1: Rename and Reframe the PDF Feature

Purpose: make the UI client-professional.

Tasks:

- Rename the button in `app/admin/ads/ads-dashboard-client.tsx`.
  - Current: `Generate Super PDF`
  - Recommended: `Generate Client Report` or `Export PDF Report`

- Rename print report headings in `app/admin/ads/print/page.tsx`.
  - If only Google Ads data is used:
    - `Google Ads Executive Report`
    - `Multi-Account Google Ads Report`
  - Do not use `Multi-Network Executive Report` until SEO/social/email data are included.

- Add generated timestamp:
  - `Generated on: YYYY-MM-DD HH:mm`

- Add report period and comparison period clearly:
  - Current period.
  - Previous period.
  - Number of days included.

Acceptance criteria:

- PDF wording feels client-ready.
- The report title accurately describes the data source.
- The button no longer uses internal/hype language.

## Phase 2: Strengthen Client CRM Data

Purpose: give the AI enough client context to write useful, specific, and safe reports.

This phase should happen before the deeper GAQL analytics work. The Google Ads data tells us what happened, but the CRM profile tells us whether that outcome is good for this specific client.

## Phase 2A: Client CRM Intelligence Upgrade

Purpose: upgrade the client profile into the source of truth for report goals, lead quality, service areas, and AI context.

Why this matters:

- `targetCostPerLead` lets the report judge whether performance is actually good.
- `targetCities` and `excludedCities` let location reports identify strong and weak service areas.
- `averageJobValue` helps explain whether a higher cost per lead may still be profitable.
- `conversionDefinition` prevents the AI from treating all conversions as equal.
- `mainGoal` keeps the PDF focused on what the client actually cares about.
- `reportTone` controls how the AI communicates with different clients.
- `clientConcerns` and `nextStepNotes` help the report sound strategic without exposing internal agency notes.

Implementation guidance:

- Keep existing clients backward-compatible.
- Make new fields optional in the database type.
- Store structured data as structured data, not one giant text area.
- Use lists/arrays for services, cities, excluded areas, competitors, and offers.
- Use numbers for financial targets.
- Use dropdowns for constrained choices like report tone.
- Pass this CRM context to the AI as structured context, not as a loose paragraph.

Field shape guidance:

- `targetCostPerLead`: number.
- `monthlyAdBudget`: number.
- `averageJobValue`: number.
- `targetCities`: array/list.
- `excludedCities`: array/list.
- `serviceAreas`: array/list.
- `primaryServices`: array/list.
- `priorityOffers`: array/list.
- `competitors`: array/list.
- `reportTone`: dropdown.
- `conversionDefinition`: text.
- `clientConcerns`: text.
- `nextStepNotes`: text.
- `aiBehavioralNotes`: internal text.
- `aiAvoidanceWarnings`: internal text.

Acceptance criteria for Phase 2A:

- Admin can edit these fields in the Client Portfolio page.
- Existing clients still load even if these fields are empty.
- The PDF generation prompt receives these fields as structured context.
- The AI uses these fields only to explain real data, not invent results.
- The AI never reveals internal notes, client concerns, or avoidance warnings directly.

Modify `ClientProfile` in `types/database.ts`.

Recommended new fields:

```ts
industry?: string;
businessDescription?: string;
primaryServices?: string[];
serviceAreas?: string[];
targetCities?: string[];
excludedCities?: string[];
idealCustomerProfile?: string;
averageJobValue?: number;
targetCostPerLead?: number;
monthlyAdBudget?: number;
mainGoal?: string;
conversionDefinition?: string;
leadQualificationRules?: string;
leadQualityNotes?: string;
priorityOffers?: string[];
competitors?: string[];
seasonalityNotes?: string;
reportTone?: 'executive' | 'friendly' | 'technical' | 'reassuring';
clientConcerns?: string;
nextStepNotes?: string;
```

Update:

- `app/admin/clients/edit-client-modal.tsx`
- `app/actions/clients.ts`
- `types/database.ts`

Recommended UI sections in the client editor:

- Business basics:
  - Industry.
  - Description.
  - Main services.
  - Average job value.

- Reporting goals:
  - Main goal.
  - Monthly ad budget.
  - Target cost per lead.
  - What counts as a qualified lead.

- Location strategy:
  - Service areas.
  - Target cities/towns.
  - Excluded cities/towns.

- AI guidance:
  - Behavioral notes.
  - Avoidance warnings.
  - Client concerns.
  - Next step notes.
  - Report tone.

Acceptance criteria:

- Admin can store enough client context for a personalized report.
- AI can compare actual cost per lead against target cost per lead.
- AI can interpret city performance against service areas.
- Internal notes remain admin-only.

## Phase 3: Expand Google Ads Report Data Actions

Purpose: collect all useful datasets for the PDF.

Modify `app/actions/ads-reports.ts`.

Current actions to keep:

- `fetchCustomerMetrics(customerId, startDate, endDate)`
- `fetchCampaignMetrics(customerId, startDate, endDate)`
- `fetchSearchTermMetrics(customerId, startDate, endDate)`

Add these actions:

```ts
fetchDailyMetrics(customerId, startDate, endDate)
fetchDeviceMetrics(customerId, startDate, endDate)
fetchGeographicMetrics(customerId, startDate, endDate)
fetchConversionActionMetrics(customerId, startDate, endDate)
fetchKeywordMetrics(customerId, startDate, endDate)
fetchLandingPageMetrics(customerId, startDate, endDate)
fetchAdScheduleMetrics(customerId, startDate, endDate)
fetchNetworkMetrics(customerId, startDate, endDate)
fetchImpressionShareMetrics(customerId, startDate, endDate)
fetchPmaxSearchTermMetrics(customerId, startDate, endDate)
```

Important:

- Validate exact GAQL fields against the active Google Ads API version before coding.
- Some fields are not compatible together in the same GAQL query.
- Split queries instead of forcing incompatible fields into one query.

## Phase 4: Add Core KPI Calculations

Purpose: make the report explain efficiency, not only activity.

For every summary, campaign, search term, location, device, and landing page row, calculate:

```ts
cost = costMicros / 1_000_000
ctr = clicks / impressions
averageCpc = cost / clicks
conversionRate = conversions / clicks
costPerLead = conversions > 0 ? cost / conversions : null
```

Use Google-provided metrics where reliable:

- `metrics.ctr`
- `metrics.average_cpc`
- `metrics.cost_per_conversion`
- `metrics.conversions_from_interactions_rate`

But still guard against missing values.

Display rules:

- If `conversions === 0`, show `-` for cost per lead instead of `$0`.
- If `clicks === 0`, show `-` for conversion rate.
- If `impressions === 0`, show `-` for CTR.
- Always use the account currency code, not hard-coded `$`, when possible.

Acceptance criteria:

- PDF includes spend, leads, cost per lead, conversion rate, CTR, average CPC, clicks, and impressions.
- Bad or empty denominators do not create misleading numbers.

## Phase 5: Add Search Terms Section

Purpose: show what customers actually typed before clicking or seeing ads.

Current function:

- `fetchSearchTermMetrics`

Improve it:

- Keep top search terms by clicks.
- Add top search terms by leads.
- Add search terms with spend but zero leads.
- Add potential negative keyword recommendations.

Recommended PDF section:

Title: `Customer Search Demand`

Tables:

- Top Search Terms by Leads
- Top Search Terms by Clicks
- Wasted Spend Search Terms
- Negative Keyword Candidates

Columns:

- Search term
- Campaign
- Ad group
- Spend
- Impressions
- Clicks
- CTR
- Avg. CPC
- Leads
- Cost per lead

Performance Max note:

- Standard `search_term_view` may not cover all Performance Max search term insight data.
- Add a separate `fetchPmaxSearchTermMetrics` using the appropriate Performance Max search term resource for the active Google Ads API version.
- Merge normal search terms and PMax search terms in the PDF, but mark the source clearly if needed.

Acceptance criteria:

- Client can see real customer searches.
- Report identifies valuable searches and wasteful searches.
- Recommendations can mention specific terms only when the data supports it.

## Phase 6: Add Location Performance

Purpose: show countries, regions, towns, and cities that produce traffic and leads.

Add:

```ts
fetchGeographicMetrics(customerId, startDate, endDate)
```

Recommended report levels:

- Country.
- Region/province/state.
- City/town.
- Most specific location when available.

Recommended Google Ads resources/segments to evaluate:

- `geographic_view`
- `user_location_view`
- `segments.geo_target_country`
- `segments.geo_target_region`
- `segments.geo_target_city`
- `segments.geo_target_most_specific_location`
- `segments.geo_target_postal_code`, optional

Important distinction:

- `geographic_view` can represent user location or area of interest.
- `user_location_view` is better for physical user location.
- For local-service clients, physical location is usually more actionable.

Need location name resolution:

- Google may return geo target resource names instead of friendly city names.
- Add a helper to resolve geo target constants to:
  - name
  - country code
  - target type
  - canonical name, if available

Recommended PDF sections:

- `Top Cities by Leads`
- `Top Cities by Spend`
- `Cities Spending Without Leads`
- `Best Cost per Lead by City`
- `Performance Outside Target Service Area`

Use CRM data:

- Compare returned city/town data against `client.targetCities`.
- Flag spend in `client.excludedCities`.
- Highlight wins in `client.serviceAreas`.

Acceptance criteria:

- PDF shows city/town performance where Google Ads provides enough data.
- Report can identify service areas that are working and areas wasting spend.
- AI does not claim physical location if the query uses interest-based geography.

## Phase 7: Add Device Performance

Purpose: explain how mobile, desktop, and tablet users behave.

Add:

```ts
fetchDeviceMetrics(customerId, startDate, endDate)
```

Recommended GAQL structure:

```sql
SELECT
  segments.device,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.conversions,
  metrics.cost_per_conversion
FROM customer
WHERE segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
ORDER BY metrics.cost_micros DESC
```

PDF section:

Title: `Device Performance`

Columns:

- Device
- Spend
- Clicks
- Leads
- Cost per lead
- Conversion rate
- CTR

Insight examples:

- Mobile gets more calls.
- Desktop converts better on form submissions.
- Tablet traffic may be low volume.

Acceptance criteria:

- PDF shows whether mobile, desktop, or tablet is producing the best lead efficiency.
- AI recommendations can mention device strategy only when data supports it.

## Phase 8: Add Conversion Action Breakdown

Purpose: explain what "leads" actually means.

Add:

```ts
fetchConversionActionMetrics(customerId, startDate, endDate)
```

Recommended GAQL approach:

```sql
SELECT
  segments.conversion_action,
  segments.conversion_action_name,
  segments.conversion_action_category,
  metrics.conversions,
  metrics.conversions_value,
  metrics.cost_micros
FROM customer
WHERE segments.date BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'
ORDER BY metrics.conversions DESC
```

PDF section:

Title: `Lead Type Breakdown`

Rows:

- Form submissions.
- Calls.
- Bookings.
- WhatsApp/messages, if tracked.
- Other conversion actions.

Important:

- If the account has conversions but no clear conversion action names, add a tracking review warning.
- If conversions are zero but clicks are healthy, recommend conversion tracking audit or landing page audit.

Acceptance criteria:

- Client understands what counted as a lead.
- Report can separate calls from forms/bookings when tracking supports it.

## Phase 9: Add Campaign Efficiency Metrics

Purpose: make campaign tables actionable.

Upgrade `fetchCampaignMetrics`.

Add fields:

- `metrics.ctr`
- `metrics.average_cpc`
- `metrics.cost_per_conversion`
- `metrics.conversions_from_interactions_rate`
- `campaign.advertising_channel_type`
- `campaign.advertising_channel_sub_type`

PDF columns:

- Campaign
- Type
- Status
- Spend
- Leads
- Cost per lead
- Conversion rate
- CTR
- Avg. CPC
- Clicks
- Impressions

Add code-generated labels:

- `Scale Candidate`
  - Strong leads and efficient cost per lead.

- `Needs Review`
  - Spend is significant but leads are low.

- `Learning / Low Volume`
  - Too little data to judge.

Acceptance criteria:

- Campaign table explains which campaigns deserve attention.
- PDF does not require the client to interpret raw Ads metrics alone.

## Phase 10: Add Keyword and Landing Page Sections

Purpose: give deeper optimization insights when space allows.

Add:

```ts
fetchKeywordMetrics(customerId, startDate, endDate)
fetchLandingPageMetrics(customerId, startDate, endDate)
```

Keyword report:

- Use `keyword_view`.
- Show targeted keywords, match type, spend, clicks, leads, cost per lead.
- Do not confuse targeted keywords with customer search terms.

Landing page report:

- Use landing page or expanded landing page data available for the active API version.
- Show final URL, clicks, leads, conversion rate, cost per lead.

PDF sections:

- `Targeted Keyword Performance`
- `Landing Page Performance`

Acceptance criteria:

- Report can show whether the problem is targeting, traffic quality, or landing page conversion.

## Phase 11: Add Time and Network Insights

Purpose: help scheduling and traffic-source decisions.

Add:

```ts
fetchAdScheduleMetrics(customerId, startDate, endDate)
fetchNetworkMetrics(customerId, startDate, endDate)
fetchDailyMetrics(customerId, startDate, endDate)
```

Daily trend:

- Use `segments.date`.
- Show spend and leads by day.
- Use a print-friendly table or simple SVG/CSS chart.

Day/hour performance:

- Use `segments.day_of_week`.
- Use `segments.hour` only if volume is high enough.

Network performance:

- Use `segments.ad_network_type`.
- Show Search vs Search Partners vs Display/YouTube where applicable.

PDF sections:

- `Daily Trend`
- `Best Days and Times`
- `Network Breakdown`

Acceptance criteria:

- Report can identify whether performance swings are isolated to specific days or networks.

## Phase 12: Add Impression Share and Growth Limits

Purpose: explain whether the account is limited by budget, rank, or demand.

Add:

```ts
fetchImpressionShareMetrics(customerId, startDate, endDate)
```

Useful metrics where available:

- `metrics.search_impression_share`
- `metrics.search_budget_lost_impression_share`
- `metrics.search_rank_lost_impression_share`
- `metrics.search_top_impression_share`
- `metrics.search_absolute_top_impression_share`
- `metrics.search_click_share`

PDF section:

Title: `Growth Constraints`

Explain:

- Lost impression share due to budget.
- Lost impression share due to rank.
- Whether scaling requires more budget or better quality/rank.

Acceptance criteria:

- Report can explain why the account may not be capturing more demand.
- AI can distinguish "limited by budget" from "limited by ad rank."

## Phase 13: Generate Code-Based Recommendations

Purpose: give AI a safe, factual recommendation list.

Do not ask AI to invent recommendations from raw metrics alone.

Create a deterministic helper:

```ts
buildReportInsights(reportData, clientProfile)
```

It should return structured facts:

```ts
{
  wins: string[];
  risks: string[];
  opportunities: string[];
  trackingWarnings: string[];
  recommendedActions: string[];
}
```

Examples:

- Campaign has spend greater than X and zero leads.
- City has strong cost per lead below client target.
- Search term has spend but zero leads.
- Mobile conversion rate is better than desktop.
- Cost per lead is above target.
- Spend occurred in an excluded city.
- Conversions are missing despite meaningful clicks.

Then pass this structured object into Gemini.

Acceptance criteria:

- AI recommendations are anchored to code-generated facts.
- Recommendations are specific, but not hallucinated.

## Phase 14: Upgrade AI Prompting

Purpose: make AI summaries more reliable and more professional.

Modify:

- `app/actions/generate-report.ts`

Recommended functions:

```ts
generateExecutiveSummary(reportFacts)
generateSearchTermInsight(reportFacts)
generateLocationInsight(reportFacts)
generateOptimizationPlan(reportFacts)
generateOverallConclusion(reportFacts)
```

Prompt inputs should include:

- Client profile.
- Current period.
- Previous period.
- Exact number of days.
- KPI summary.
- Top wins.
- Top risks.
- Recommended next actions.
- CRM behavioral notes.
- CRM avoidance warnings.

Prompt rules:

- Maximum 3 to 4 sentences per summary block.
- No bullet points unless the section is explicitly an action plan.
- No hype words.
- No internal notes.
- No unsupported claims.
- Use the client contact name only when appropriate.
- Mention exact dates.
- Mention cost per lead when leads exist.
- If leads are zero, focus on traffic quality, tracking, and next optimizations.

Acceptance criteria:

- AI output is concise and client-safe.
- AI uses the client profile without revealing internal context.
- AI sections remain stable even when data is missing.

## Phase 15: Final PDF Layout

Purpose: make the PDF easy to read and premium enough to send directly to clients.

Recommended report order:

1. Cover/header.
2. Executive summary.
3. Performance scorecard.
4. Current vs previous period.
5. Growth constraints/impression share.
6. Campaign performance.
7. Customer search demand.
8. Location performance.
9. Device performance.
10. Lead type breakdown.
11. Daily trend.
12. Keyword and landing page details.
13. Recommendations and next steps.
14. Appendix/data notes.

Print design requirements:

- Use clean black/white/blue accents.
- Use stable tables with `break-inside-avoid`.
- Avoid giant paragraphs.
- Use page breaks between major sections.
- Use deterministic table sorting.
- Include data notes for hidden/limited Google data.
- Include "Confidential" footer.

Suggested page lengths:

- Small account: 3 to 5 pages.
- Normal account: 5 to 8 pages.
- Multi-account client: one summary plus 2 to 4 pages per account.

Acceptance criteria:

- PDF can be sent to a customer without manual explanation.
- Multi-account reports keep account sections separate.
- Global summary only combines high-level totals.

## Phase 16: Print and Export Implementation

Current:

- `app/admin/ads/print/page.tsx`
- `PrintTrigger` calls `window.print()`.

MVP:

- Keep browser print for now.
- Add a preview route option:
  - `/admin/ads/print?targetId=...&timeframe=...&autoprint=1`
  - If `autoprint` is missing, show preview without auto-printing.

Later production upgrade:

- Generate PDF server-side with Playwright or a PDF rendering service.
- Store generated report snapshots in Firestore or cloud storage.
- Add email-to-client flow.
- Add report history under each CRM client.

Acceptance criteria:

- Admin can preview before printing.
- Admin can export the PDF.
- Later path exists for automated PDF generation and delivery.

## Phase 17: Dashboard Preview Improvements

Purpose: make `/admin/ads` match the report logic.

Update `app/admin/ads/ads-dashboard-client.tsx` to include:

- Cost per lead KPI.
- Conversion rate KPI.
- CTR KPI.
- Average CPC KPI.
- Currency code support.
- Report readiness checklist:
  - CRM profile complete.
  - Google Ads account linked.
  - Conversion tracking has data.
  - Search terms available.
  - Location data available.

Optional UI:

- "Report Preview" panel showing which sections will appear in the PDF.
- Warning when the selected client has no target CPL, service area, or conversion definition.

Acceptance criteria:

- Admin can see whether the client profile is strong enough for a good report.
- Dashboard and PDF use consistent numbers.

## Phase 18: Validation and Safety

Purpose: prevent bad reports.

Add validation:

- Validate dates are `YYYY-MM-DD`.
- Validate `customerId` contains only digits.
- Validate target ID exists in Firestore.
- Validate CRM profile fields before sending to AI.
- Validate Google Ads API responses before rendering.

Recommended:

- Add Zod schemas for report inputs and normalized report outputs.

Error handling:

- If one linked account fails, still render other account sections.
- Show a clear data unavailable block for the failed account.
- Do not let AI summarize missing data as if it exists.

Acceptance criteria:

- One API failure does not break the whole PDF.
- Missing data creates honest report notes.

## Phase 19: Data Notes and Client Transparency

Purpose: protect trust.

Add a short appendix called `Data Notes`.

Include:

- Google Ads may hide some low-volume search terms.
- Some location rows may represent user interest depending on the selected report resource.
- Conversion accuracy depends on tracking setup.
- Cost and conversion data may adjust slightly after the report is generated.
- Performance Max search term coverage can differ from standard Search campaigns.

Acceptance criteria:

- Report is transparent without sounding defensive.

## Phase 20: Security Cleanup

Purpose: prevent credential leaks while building reporting.

Current IDE shows a Firebase Admin SDK JSON file:

- `n-v-m-4b472-firebase-adminsdk-fbsvc-8180d98d97.json`

Tasks:

- Ensure service account JSON files are not committed.
- Add a `.gitignore` rule:

```gitignore
*-firebase-adminsdk-*.json
```

- Prefer env vars as already used in `lib/firebase.ts`.
- Rotate any credential that was ever committed or shared.

Acceptance criteria:

- Firebase private keys are not in source control.
- Report generation uses server-only credentials.

## Suggested Implementation Order

1. Rename PDF button and report title.
2. Complete Phase 2A Client CRM Intelligence Upgrade.
3. Pass structured CRM context into PDF and AI report generation.
4. Add KPI calculations and display cost per lead, conversion rate, CTR, and average CPC.
5. Add search terms to the print/PDF page.
6. Add geographic metrics.
7. Add device metrics.
8. Add conversion action breakdown.
9. Add campaign efficiency metrics.
10. Add deterministic recommendation builder.
11. Upgrade AI prompt to use structured report facts.
12. Add final PDF layout sections.
13. Add validation and missing-data handling.
14. Add report preview and optional autoprint behavior.
15. Add server-side PDF generation later.

## First Professional MVP

The first useful client-ready version is complete when:

- `/admin/ads` shows client/account/timeframe selection.
- `/admin/ads` shows spend, leads, cost per lead, conversion rate, CTR, average CPC, clicks, and impressions.
- `/admin/ads/print` includes:
  - Executive summary.
  - Performance scorecard.
  - Current vs previous comparison.
  - Campaign performance.
  - Search terms.
  - Location/city performance.
  - Device performance.
  - Conversion action breakdown.
  - Recommendations and next steps.
- CRM client page stores:
  - Industry.
  - Services.
  - Service areas.
  - Target cities.
  - Target cost per lead.
  - Main goal.
  - Conversion definition.
  - Client concerns.
  - AI notes and avoidance warnings.
- AI summaries do not invent unsupported information.
- PDF can be exported and sent to the client.

## Useful Google Ads Docs

- Search and SearchStream:
  - https://developers.google.com/google-ads/api/rest/common/search

- Search term view:
  - https://developers.google.com/google-ads/api/fields/v21/search_term_view

- Campaign search term view:
  - https://developers.google.com/google-ads/api/fields/v21/campaign_search_term_view

- Geographic view:
  - https://developers.google.com/google-ads/api/fields/v21/geographic_view

- User location view:
  - https://developers.google.com/google-ads/api/fields/v21/user_location_view

- Segments:
  - https://developers.google.com/google-ads/api/fields/v21/segments

- Customer metrics:
  - https://developers.google.com/google-ads/api/fields/v21/customer

- Conversion action:
  - https://developers.google.com/google-ads/api/fields/v21/conversion_action
