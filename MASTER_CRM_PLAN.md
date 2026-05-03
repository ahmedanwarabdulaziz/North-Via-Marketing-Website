# Phase 10: Master Client Registry (Global CRM)

You are seeing the grand vision now! Locking the AI rules strictly to the Google Ads account is a temporary fix. Since you plan on expanding this agency dashboard to generate multi-channel reports (Google Ads + Social Media + SEO), the AI needs to belong to the **Client Object**, not the Ad Account Object!

Here is how we will completely detach the AI behavior into a highly scalable Global Agency CRM:

## Proposed Architecture

---

### 1. Global Database Construction
**[NEW] types/database.ts** 
We will create a brand new master Firebase Collection called `clients`.
Fields will include:
- `businessName`
- `contactName` & `email`
- `aiBehavioralNotes` (What to push and enforce)
- **`aiAvoidanceWarnings`** (Strict rules on what the AI MUST NEVER mention, e.g., "Do not mention Facebook Ad Spend this month", "Do not use the word 'cheap'")
- `linkedGoogleAdsId` (Maps directly to an existing Google Ads account)
- `linkedSocialMediaAccounts` (Placeholder array for future Phase expansion)

---

### 2. Client Portfolio Manager UI
**[NEW] app/admin/clients/page.tsx**
I will build a brand new page on your main Admin Sidebar called **"Client Portfolio"**.
This page will function as your master control hub:
- It will list every client your agency manages.
- It will feature a powerful "Create Client" wizard where you input their names, their strict AI instructions/warnings, and use a dropdown to **"Link"** their Google Ads Account from your system API to their specific profile.

---

### 3. Rewiring the Ads Dashboard
**[MODIFY] app/admin/ads/ads-dashboard-client.tsx**
- The "AI Strategy Profile" modal we just built will be elegantly removed from the Ads dashboard, because configuring a client's core personality should be done securely on the `Client Portfolio` page.
- However, when you click **Generate PDF** on the Ads page, it will now lookup the Master Client Profile linked to the selected Ad Account, grab their `aiBehavioralNotes` and the new `aiAvoidanceWarnings`, and feed them natively into Gemini!

---

### 4. Injecting Strict Avoidance Prompts
**[MODIFY] app/actions/generate-report.ts**
We will add a secondary `CRITICAL WARNINGS` block to the system prompt. Gemini is incredible at following negative constraints if formulated correctly. We will program it to aggressively avoid any topics or keywords listed in the `aiAvoidanceWarnings` string.

## Open Questions
1. Does this overarching Central CRM architecture perfectly align with your massive agency vision?
2. Do you want the new **"Client Portfolio"** tab to be positioned directly below the main "Dashboard" link on the left-hand sidebar?
