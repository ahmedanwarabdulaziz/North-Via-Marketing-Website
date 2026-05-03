# Phase 9: Client Intelligence Registry & AI Personalization

## Proposed Architecture

---

### Database Upgrades
**[MODIFY] types/database.ts**
We will natively extend the existing `GoogleAdsAccount` interface in Firestore.
- `clientBusinessName` (Overrides the generic Google Ads name)
- `clientContactName` (e.g., "John")
- `aiPromptNotes` (A massive free-text field for storing agency secrets: e.g. *"John keeps complaining that leads are low this month. Reassure him that the algorithm relies on volume, and while quantity dropped, the cost-per-lead is strictly enforced and high-intent traffic is being isolated."*)

---

### The CRM Editor Modal
**[NEW Component] app/admin/ads/client-profile-editor.tsx**
Right on the Ads Dashboard, I will build an elegant **"Edit Client Strategy"** dialog modal.
You can open this modal at any time to update John's specific AI notes. Clicking "Save Strategy" pushes everything securely to Firestore.

---

### Supercharging the AI Context
**[MODIFY] app/actions/generate-report.ts**
We will feed these new CRM metrics natively into the Gemini Flash Prompt Engine!
- The prompt will forcefully dynamically inject: `Address the client directly as ${clientContactName || 'our valued partner'}.`
- We will strictly inject the `aiPromptNotes`. The prompt will say: `The agency owner has provided the following internal context regarding this client's current mindset: ${aiPromptNotes}. You MUST subtly and professionally weave reassurances or explanations regarding this context natively into your report without ever mentioning that you were given notes.` 

### PDF Layout Overhaul
**[MODIFY] app/admin/ads/print/page.tsx**
The hard-locked PDF print document will replace the generic Ads Account ID Header with the overridden `clientBusinessName` for an ultra-premium layout.

---

Does this refined plan perfectly capture your exact vision? Let me know, and we will jump directly into the code!
