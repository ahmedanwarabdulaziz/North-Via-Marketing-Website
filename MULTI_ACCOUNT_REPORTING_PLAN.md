# Phase 11: Multi-Account Reporting Architecture

I understand exactly what you need. Blending multiple different businesses/accounts into one giant mathematical pool is confusing. We need to generate **One Unified Report Document**, but each linked Ads Account gets its own isolated section!

## The Architecture Plan

### 1. Unified Dropdown Selector
**[MODIFY] app/admin/ads/page.tsx & ads-dashboard-client.tsx** 
We will pass both the Master `clients` array AND the `google_ads_accounts` array into the dashboard.
The main selector dropdown will group things perfectly:
```
--- ACTIVE CLIENTS ---
✅ Client: JL Upholstery (Has 2 linked accounts)
✅ Client: Anwar Corporate (Has 1 linked account)
--- UNLINKED ACCOUNTS ---
⚠️ Account: John Doe's Bakery
⚠️ Account: Random Test Account
```

### 2. Multi-Account Visual Stacking
**[MODIFY] app/admin/ads/ads-dashboard-client.tsx**
When you select a Client with multiple accounts, the UI will NOT mix the math. 
Instead, it will visually stack them. You will see:
- **Account 1 Breakdown**: Its KPIs, its Campaigns, its Search Terms.
- **Account 2 Breakdown**: Its KPIs, its Campaigns, its Search Terms.

### 3. Advanced PDF Generation Logic
**[MODIFY] app/admin/ads/print/page.tsx**
This is where the magic happens. When you hit **Generate PDF** for a Client with 2 linked accounts:
1. **Section 1 (Account A)**: We print the data for Account A. We tell Gemini to generate an executive summary *specifically* analyzing the performance of Account A.
2. **Section 2 (Account B)**: We print the data for Account B. We tell Gemini to generate a separate summary *specifically* analyzing Account B.
3. **Section 3 (Overall Conclusion)**: We tell Gemini to look at the combined total performance across *both* pipelines, use the Master CRM's AI behavioral notes, and write a high-level closing statement summarizing the holistic strategy.

*(Note: If you just print a single Unlinked Account, it simply generates the standard 1-page report we already built).*

## Open Questions
There are no open questions remaining! This architecture perfectly solves the multi-account separation while guaranteeing an overarching strategic AI conclusion. 

If this blueprint looks perfect to you, approve it and I will immediately begin rewriting the massive dashboard loop and AI pipelines to support it!
