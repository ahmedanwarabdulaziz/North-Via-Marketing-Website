# Firebase → Supabase Migration Plan

Status: **approved 17 Oct 2026** — recommendations accepted, except the plan stays on **Supabase Free** for now.
Date: 17 October 2026

This covers step 7 of the ANWARZ master guide ("Create the Supabase project, tables, and RLS"), and moves the whole North Via admin panel off Firebase in one go.

---

## 1. What we have today

- All data lives in **Firestore** and is only touched **from the server** (Next.js server actions and API routes through `firebase-admin`). No browser code talks to Firebase, so there are no client-side security rules to migrate.
- **11 files** import the database: `lib/admin-ops.ts`, `lib/google-business.ts`, `lib/review-engine.ts`, `lib/review-telegram.ts`, `lib/digest-schedule.ts`, `lib/google-ads.ts`, and the actions/routes that call them.
- **n8n and Telegram don't touch the database.** n8n calls the website's endpoints and the Telegram bot goes through the website too. Neither needs changes.
- Firebase Auth is not used. Admin login is our own password and cookie.
- Every date is already stored as an ISO string, and Google tokens are already encrypted by our own code (`lib/encryption.ts`). Both copy across unchanged.

### Collections to move (17)

| Area | Firestore collection | Key | Notes |
|---|---|---|---|
| Clients | `clients` | auto id | Brand, owner, links, GA4/Clarity ids, encrypted Clarity token |
| Google Ads | `google_connections` | `master_admin_connection` | Encrypted Ads OAuth tokens |
| | `google_ads_accounts` | auto id | Filtered by `customerId`, `googleConnectionId` |
| | `ads_reports_snapshots` | auto id | JSON payload |
| Ops | `admin_tasks` | auto id | Ordered list |
| | `admin_followups` | auto id | |
| | `admin_reports` | auto id | |
| | `admin_invoices` | auto id | Nested line items and payments |
| | `admin_metadata/invoices` | single doc | Invoice number counter (transaction) |
| | `admin_audit_logs` | auto id | |
| Reviews | `gbp_connections` | clientId | Encrypted refresh token per client |
| | `gbp_locations` | Google location id | `linked` = monitored |
| | `gbp_reviews` | Google review id | Status, draft, `shortRef` for Telegram |
| | `gbp_reply_settings` | clientId | Tone, length, language… |
| | `gbp_sync_status/latest` | single doc | Last check summary |
| | `gbp_settings/telegram_digest` | single doc | Digest schedule and sent-slot log |
| | `gbp_telegram_batches` | batch id | Approve-all groupings |

---

## 2. Decisions for you

| # | Question | My recommendation |
|---|---|---|
| 1 | **Where Supabase runs**: Supabase Cloud, or self-hosted on the Contabo VPS | **Supabase Cloud.** Self-hosting adds ~10 containers to look after and puts backups on us. The VPS has no backup add-on, and the master guide requires backups before real client data. |
| 2 | **Plan** | **Decided: Free.** Free has no backups, so our own nightly `pg_dump` from the VPS (Phase 4) is required, not optional, and Firestore stays as a second copy until it runs. Free pauses after 7 days without activity; n8n's hourly calls hit the database, so it stays awake. Limits (500 MB database) are far above our size. Upgrade to Pro later if we want Supabase's own backups. |
| 3 | **Region** | **Canada (Central)**. Clients and the Toronto digest are in Canada; Vercel functions sit in North America. |
| 4 | **Admin login**: keep our password login or move to Supabase Auth | **Keep it for now.** It works and isn't part of the data move. Supabase Auth makes sense later, when clients get their own logins. |
| 5 | **Cutover time** | A quiet hour outside the 9 AM digest, e.g. an evening. Reviews pause for about 30 minutes. |

---

## 3. Design

### Access and security
- The website connects with the Supabase **service role key**, server-only, stored in Vercel. It's never sent to the browser, the same as the Firebase key today.
- **Row-level security is ON for every table with no public policies**, so the public `anon` key can read or write nothing. The service role bypasses RLS. When client logins arrive, we add per-client policies on `client_id`.
- Google tokens stay encrypted with our `SESSION_SECRET`. They're copied as ciphertext, so **`SESSION_SECRET` must not change** during the migration.

### Tables
Firestore auto ids are kept as `text` primary keys so existing links, Telegram buttons and n8n calls keep working.

- `clients`: one column per profile field, plus `extra jsonb` for any field the copy finds that isn't in the type.
- `google_connections`, `google_ads_accounts`, `ads_reports_snapshots` (`payload jsonb`).
- `admin_tasks`, `admin_followups`, `admin_reports`, `admin_audit_logs` (`metadata jsonb`).
- `admin_invoices`: `line_items jsonb`, `payments jsonb`, unique on `(client_id, service_month_key)` where generated from a template.
- **Invoice numbers**: the Firestore transaction becomes a Postgres function `next_invoice_number()` on a sequence. It's atomic and needs no read-then-write.
- `gbp_connections` (pk `client_id` → `clients.id`), `gbp_locations`, `gbp_reply_settings` (pk `client_id`).
- `gbp_reviews`: indexed on `status`, `client_id`, unique `short_ref`.
- `app_settings (key text pk, value jsonb)` holds the single documents: `gbp_sync_status`, `telegram_digest`.
- `gbp_telegram_batches` (`review_ids text[]`, `parts jsonb`).
- **New, for master-guide step 8:** `telegram_authorized_users`, the chat ids allowed to use the bot. It's currently a single env setting.
- Every date column is `timestamptz`, with `updated_at` kept by a trigger.

Foreign keys go from `client_id` to `clients(id)`, so deleting a client cleans up its Google data in one place.

### Code changes
1. Add `@supabase/supabase-js` and `lib/supabase.ts` (server-only client).
2. Move every database call into a small data layer, `lib/data/*.ts` (clients, ads, ops, invoices, reviews, settings). Pages and actions call these functions instead of `db.collection(...)`.
3. Map Firestore patterns:
   - `.where().get()` → `.select().eq()/.in()`
   - `batch` → one `upsert([...])`
   - `getAll(refs)` → `.in('id', ids)`
   - `set(..., {merge:true})` → `upsert`
   - the transaction → the RPC function
4. Fields map from camelCase in the code to snake_case columns inside the data layer, so the rest of the app keeps its current types.
5. Remove `firebase-admin` and `lib/firebase.ts` after cutover.

---

## 4. Phases

**Phase 1: Set up.** Create the project in your chosen region, apply the schema and RLS as a versioned SQL migration (`supabase/migrations/`), and add the Supabase variables to Vercel and `.env.local`.

**Phase 2: Build and rehearse.** ✅ Done 17 Oct 2026: data layer in `lib/data/store.ts`, copy script `scripts/migrate-firestore-to-supabase.ts`, trial copy verified record-for-record, smoke test and production build passed.
- Write the data layer against Supabase.
- Write `scripts/migrate-firestore-to-supabase.ts`. It reads every collection and upserts into Supabase, so it's safe to run again. It prints per-collection counts and lists unknown fields.
- Run it into the trial project and check the panel locally: clients, invoices, reviews inbox, digest settings.
- Test that an encrypted Google token decrypts and a review list loads. Read-only: nothing gets posted.

**Phase 3: Cutover (about 30 minutes).**
1. Pause the n8n hourly workflow so nothing writes during the copy.
2. Run the copy script for the final time, and check counts match Firestore one for one.
3. Deploy the Supabase version to Vercel.
4. Smoke test: login, client page, Choose locations, reviews page, Telegram **x** menu and `/reviews`, invoice PDF.
5. Resume n8n and watch the next hourly run.

**Phase 4: Settle.**
- Keep Firestore untouched for 30 days as a rollback. Rolling back means redeploying the previous commit.
- Then export Firestore one last time to off-server storage and close it.
- Add a **nightly** `pg_dump` from the VPS to off-server storage (master-guide backup item 1), and do one restore test. On the Free plan this is our only backup, so Firestore is not closed until it has run and a restore has worked.

---

## 5. Risks and how they're handled

| Risk | Handling |
|---|---|
| Lost or double writes during the switch | n8n paused; the copy is repeatable; counts are checked before deploy |
| Encrypted tokens unreadable | Same `SESSION_SECRET`; decrypt test in Phase 2 |
| Fields that exist in Firestore but not in our types | The copy script reports them; they go in `extra jsonb` |
| Telegram buttons pointing at old ids | ids and `short_ref` are kept exactly |
| Something breaks after go-live | Firestore stays intact for 30 days; redeploy the previous commit |
| Service role key leaking | Server-only module, never `NEXT_PUBLIC_`; RLS blocks the anon key anyway |

---

## 6. What I need from you to start
1. Answers to the five decisions in section 2 (or "go with your recommendations").
2. Create the Supabase project yourself in the dashboard; account creation and billing stay with you. Then put the **Project URL** and **service role key** into Vercel and `.env.local`. Don't paste them in chat.
