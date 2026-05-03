# Admin Dashboard and Google Ads Professional Build Plan

This document is a handoff plan for building a professional admin dashboard for the North Via Marketing website.

The app is currently a Next.js project with an existing `/admin` area, password login, Google Business Profile review integration, Gmail contact form email sending, and Google OAuth helper code.

## Goal

Build a secure admin dashboard where the business owner can:

- View customer leads and contact form submissions.
- Track email activity and delivery outcomes.
- Connect Google Ads.
- Pull Google Ads campaign reports.
- Review analytics such as spend, impressions, clicks, CTR, CPC, conversions, and cost per conversion.
- Keep Google Reviews management available inside the same admin area.

The requested admin pass is `1306`, but it must be stored in environment variables, not hard-coded in source code.

## Important Security Rules

- Do not commit real API keys, app passwords, OAuth secrets, refresh tokens, or developer tokens.
- Do not store Google OAuth tokens in regular client-readable storage.
- Prefer database-backed encrypted token storage over long-lived cookies.
- Use `ADMIN_PASSWORD=1306` only as an environment variable for the first version.
- Remove any fallback admin passwords from application code.
- Add rate limiting to admin login and sensitive API routes.
- Keep all Google Ads calls server-side only.
- Rotate any credential that has ever been shared in chat, screenshots, Git history, or logs.

## Google Ads API Requirements

Google Ads reporting is different from Google Business Profile reviews. The current Google integration for reviews is not enough for Google Ads reports.

Required:

- Google Cloud OAuth client ID and client secret.
- OAuth scope: `https://www.googleapis.com/auth/adwords`
- Google Ads API developer token.
- Google Ads customer ID.
- Optional manager account login customer ID if using an MCC/manager account.
- Server-side calls to Google Ads API using GAQL queries.

Useful docs:

- OAuth overview: https://developers.google.com/google-ads/api/docs/oauth/overview
- REST authentication: https://developers.google.com/google-ads/api/rest/auth
- Search and SearchStream: https://developers.google.com/google-ads/api/rest/common/search
- Access levels: https://developers.google.com/google-ads/api/docs/api-policy/access-levels
- Client libraries: https://developers.google.com/google-ads/api/docs/client-libs

## Recommended Architecture

### Tech Stack Enhancements

To build this efficiently within the Next.js ecosystem, consider leveraging the following tools:
- **Database Layer**: Use the **Firebase Admin SDK (Firestore)** to handle data persistence securely from server actions and API routes.
- **Data Fetching & Mutations**: While OAuth callbacks require route handlers (`/api`), leverage **Next.js Server Actions** for dashboard operations (e.g., updating lead status, fetching Ads data) to simplify client-server communication.
- **Validation**: Integrate **Zod** to validate environment variables, parse incoming webhooks, and type-check Google Ads API responses.
- **UI Framework**: Utilize **Tailwind CSS** alongside **shadcn/ui** or a similar component library to rapidly build the `AdminShell`, data tables, and charts with a professional aesthetic.
- **Google SDK**: Leverage the official `google-ads-api` NPM package for Node.js rather than raw REST calls. It provides streamlined GAQL execution and automated TypeScript typings.

### Frontend Routes

- `/admin`
  - Overview dashboard.
- `/admin/ads`
  - Google Ads performance dashboard.
- `/admin/leads`
  - Customer/contact submissions.
- `/admin/emails`
  - Email send log and delivery status.
- `/admin/reviews`
  - Existing Google Reviews manager.
- `/admin/settings`
  - Integrations, connected accounts, API status, selected Google Ads customer ID.

### API Routes & Server Actions

Use standard API routes for external integrations and OAuth callbacks, but lean on Next.js Server Actions for internal admin tasks.

- `/api/admin/google-ads/status`
- `/api/admin/google-ads/auth`
- `/api/admin/google-ads/callback`
- `/api/admin/google-ads/disconnect`
- `/api/admin/google-ads/customers`
- `/api/admin/google-ads/reports/summary`
- `/api/admin/google-ads/reports/campaigns`
- `/api/admin/google-ads/reports/daily`
- `/api/admin/leads`
- `/api/admin/emails`

### Database Tables (Firestore Collections)

Use Firebase (Firestore) through the `firebase-admin` server-side Node.js SDK.

Suggested collections:

- `admin_sessions`
- `google_connections`
- `google_ads_accounts`
- `contact_submissions`
- `email_logs`
- `ads_report_snapshots`
- `admin_audit_logs`

## Environment Variables

Add these to `.env.local` for development and the deployment provider for production.

Do not commit real values.

```env
ADMIN_PASSWORD=1306

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/admin/google-ads/callback

GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_LOGIN_CUSTOMER_ID=
GOOGLE_ADS_DEFAULT_CUSTOMER_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

TOKEN_ENCRYPTION_KEY=

GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_FROM_NAME=
BUSINESS_EMAIL=
```

## Phase 1: Admin Security Cleanup

Purpose: make the current admin gate production-safe enough before adding more business data.

Tasks:

- Move the admin password to `ADMIN_PASSWORD=1306` in env only.
- Remove fallback hard-coded passwords from `app/actions/auth.ts`.
- Add constant-time password comparison if practical.
- Improve admin cookie value from static `authenticated` to a signed/random session token.
- Store admin session metadata in a database or signed server-only cookie.
- Add login rate limiting by IP and user agent.
- Make `/admin/login` copy honest. Avoid saying "end-to-end encrypted session" unless that is actually implemented.
- Confirm middleware protects every `/admin/*` route except `/admin/login`.
- Add a logout flow that invalidates the current session.

Acceptance criteria:

- Admin login works with `ADMIN_PASSWORD=1306`.
- No password fallback exists in code.
- Failed login attempts are rate limited.
- Protected pages redirect unauthenticated visitors to `/admin/login`.

## Phase 2: Shared Admin Layout

Purpose: avoid duplicating sidebar/header code across every admin page.

Tasks:

- Create reusable admin shell components:
  - `AdminShell`
  - `AdminSidebar`
  - `AdminHeader`
  - `AdminNavLink`
  - `AdminStatCard`
- Move repeated admin navigation from `/admin` and `/admin/reviews` into shared components.
- Add nav items for Dashboard, Ads, Leads, Emails, Reviews, and Settings.
- Keep the current Google Reviews feature working.
- Make the layout responsive for mobile and desktop.

Acceptance criteria:

- All admin pages share one consistent layout.
- Existing `/admin/reviews` functionality still works.
- New empty routes can be added without duplicating the whole sidebar.

## Phase 3: Database Foundation

Purpose: store leads, emails, tokens, reports, and audit data properly.

Tasks:

- Choose a database provider.
- Add Firebase Admin SDK setup (`lib/firebase.ts`).
- Create Typescript interfaces/models for:
  - Contact submissions.
  - Email logs.
  - Google OAuth token storage.
  - Google Ads accounts.
  - Google Ads report snapshots.
  - Admin audit logs.
- Add encryption helpers for refresh tokens.
- Add server-only data access functions using Firestore references.

Acceptance criteria:

- Contact form submissions can be saved.
- Email sending can be logged.
- Google token data can be stored encrypted.
- Report snapshots can be cached.

## Phase 4: Leads and Email Tracking

Purpose: make customer reports and emails visible in admin.

Tasks:

- Update `app/api/contact/route.ts` to save every contact form submission before sending email.
- Save email send attempts in `email_logs`.
- Add `/admin/leads` page:
  - Table of submissions.
  - Status filter: new, contacted, won, lost, archived.
  - Service filter.
  - Search by name, email, company, or message.
  - Lead detail panel.
- Add `/admin/emails` page:
  - Sent email log.
  - Success/failure status.
  - Error details for failed sends.
- Add admin actions to update lead status.

Acceptance criteria:

- New contact form submissions appear in admin.
- Admin can change lead status.
- Email delivery attempts are visible.
- Failed email sends do not erase the lead.

## Phase 5: Google Ads OAuth Connection

Purpose: connect a Google Ads account securely.

Tasks:

- Add the `https://www.googleapis.com/auth/adwords` scope.
- Decide whether to reuse the existing Google OAuth helper or create a dedicated Google Ads OAuth helper.
- Add `/api/admin/google-ads/auth`.
- Add `/api/admin/google-ads/callback`.
- Exchange authorization code for tokens.
- Store refresh token encrypted in the database.
- Add `/api/admin/google-ads/status`.
- Add `/api/admin/google-ads/disconnect`.
- Show connection state in `/admin/settings` and `/admin/ads`.

Important:

- Google may return a refresh token only on first consent or when `prompt=consent` is used.
- Keep OAuth callbacks server-side.
- Do not store Ads refresh tokens in plain cookies.

Acceptance criteria:

- Admin can connect Google Ads.
- Connection status appears in admin.
- Refresh token is stored encrypted.
- Admin can disconnect Google Ads.

## Phase 6: Google Ads Customer Account Selection

Purpose: let the admin choose which Google Ads customer account to report on.

Tasks:

- Add a server-side Google Ads API client helper.
- Use Google Ads API customer listing to discover accessible customers.
- Store customer IDs and names in `google_ads_accounts`.
- Add `/api/admin/google-ads/customers`.
- Add account selector in `/admin/settings` or `/admin/ads`.
- Save selected default customer ID.

Headers needed for REST calls:

- `Authorization: Bearer ACCESS_TOKEN`
- `developer-token: GOOGLE_ADS_DEVELOPER_TOKEN`
- `login-customer-id: GOOGLE_ADS_LOGIN_CUSTOMER_ID` when using a manager account

Acceptance criteria:

- Admin can see accessible Google Ads accounts.
- Admin can select one account for reporting.
- Selected account persists.

## Phase 7: Google Ads Reporting API

Purpose: pull real Ads performance data into the admin dashboard.

We highly recommend using the official Google Ads API Node.js SDK to execute these queries safely and with type-safety.

Initial reports:

- Summary report.
- Campaign report.
- Daily trend report.

Core metrics:

- Cost.
- Impressions.
- Clicks.
- CTR.
- Average CPC.
- Conversions.
- Conversion rate.
- Cost per conversion.

Suggested GAQL summary query:

```sql
SELECT
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.conversions,
  metrics.conversions_value,
  metrics.cost_per_conversion
FROM customer
WHERE segments.date DURING LAST_30_DAYS
```

Suggested GAQL campaign query:

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.ctr,
  metrics.average_cpc,
  metrics.conversions,
  metrics.cost_per_conversion
FROM campaign
WHERE segments.date DURING LAST_30_DAYS
ORDER BY metrics.cost_micros DESC
```

Suggested GAQL daily query:

```sql
SELECT
  segments.date,
  metrics.cost_micros,
  metrics.impressions,
  metrics.clicks,
  metrics.conversions
FROM customer
WHERE segments.date DURING LAST_30_DAYS
ORDER BY segments.date ASC
```

Implementation notes:

- Convert `cost_micros` to currency by dividing by `1,000,000`.
- Use the selected account currency when displaying money.
- Add date range support:
  - Last 7 days.
  - Last 30 days.
  - This month.
  - Last month.
  - Custom range.
- Cache responses in `ads_report_snapshots`.
- Handle Google Ads API errors clearly.

Acceptance criteria:

- `/admin/ads` displays real report data.
- Admin can switch date ranges.
- Campaign table is sortable.
- Empty states and API errors are readable.

## Phase 8: Admin Ads Dashboard UI

Purpose: make the reports useful for decision-making.

Sections:

- Connection banner.
- Date range selector.
- Account selector.
- KPI cards:
  - Spend.
  - Impressions.
  - Clicks.
  - CTR.
  - Average CPC.
  - Conversions.
  - Cost per conversion.
- Daily trend chart.
- Campaign performance table.
- Last refreshed timestamp.
- Manual refresh button.

Design expectations:

- Professional and clean.
- No fake placeholder metrics once API is connected.
- Clear loading states.
- Clear empty state before Google Ads is connected.
- Responsive on desktop and mobile.

Acceptance criteria:

- Admin can understand Ads performance in under 30 seconds.
- UI does not show fake numbers as real data.
- All states are handled: disconnected, loading, connected, no data, error.

## Phase 9: Analytics and Report Snapshots

Purpose: make the dashboard faster, more reliable, and useful over time.

Tasks:

- Cache Google Ads reports by customer ID, date range, and report type.
- Add background refresh strategy if the deployment platform supports it.
- Add "last fetched" timestamps.
- Add manual refresh.
- Store daily snapshots for historical comparison.
- Add trend comparison:
  - Current period vs previous period.
  - Spend change.
  - Click change.
  - Conversion change.
  - Cost per conversion change.

Acceptance criteria:

- Dashboard loads quickly after first fetch.
- Refreshing does not spam the Google Ads API.
- Admin can see whether performance improved or declined.

## Phase 10: Production Hardening

Purpose: prepare the admin system for real business use.

Tasks:

- Add error logging.
- Add audit logs for admin actions.
- Add route-level authorization checks inside API routes, not only middleware.
- Validate all request inputs.
- Add CSRF protection for state-changing admin actions.
- Add security headers.
- Add tests for:
  - Admin login.
  - Protected route redirect.
  - Contact submission saving.
  - Email logging.
  - Google Ads report transformation.
- Add deployment env variable checklist.

Acceptance criteria:

- Admin data is protected.
- API routes reject unauthenticated access.
- Sensitive secrets are not exposed to the browser.
- Build passes.
- Basic tests pass.

## Phase 11: Optional Future Upgrades

Good later improvements:

- Replace password login with Google Workspace admin login.
- Add 2FA.
- Add role-based access if more admins join.
- Add Google Analytics 4 reporting.
- Add Search Console reporting.
- Add downloadable PDF monthly reports.
- Add automated weekly report emails.
- Add lead notes and follow-up reminders.
- Add CRM integration.

## Suggested Implementation Order

1. Admin security cleanup.
2. Shared admin layout.
3. Database foundation.
4. Leads and email tracking.
5. Google Ads OAuth.
6. Google Ads customer selection.
7. Google Ads report endpoints.
8. Ads dashboard UI.
9. Report caching and comparisons.
10. Production hardening.

## First MVP Definition

The first professional MVP is complete when:

- `/admin/login` works with env password `1306`.
- `/admin` is protected.
- `/admin/leads` shows real contact submissions.
- `/admin/emails` shows email send logs.
- `/admin/ads` can connect Google Ads.
- `/admin/ads` shows real last-30-days campaign performance.
- Tokens are not stored in plain cookies.
- No real secrets are committed.

