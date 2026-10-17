-- North Via admin panel: initial schema (Firebase → Supabase).
-- Server-only access with the service role key. RLS is on everywhere with no
-- public policies, so the anon key can read or write nothing.
--
-- Conventions (relied on by lib/data/store.ts):
-- * Columns are the snake_case form of the app's camelCase fields.
-- * Firestore document ids are kept as text primary keys, so existing links,
--   Telegram buttons and n8n calls keep working.
-- * Columns ending in `_at` are timestamptz; everything the app compares as
--   text (Google's create/update times, user-entered dates) stays text.
-- * Like Firestore, fields are optional: only keys and `extra` are NOT NULL.
-- * `extra jsonb` keeps any legacy field that isn't modelled as a column.

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  -- Only when the caller didn't set it, so re-running the copy keeps Firestore's dates.
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at = now();
  end if;
  return new;
end $$;

-- ───────────── Clients ─────────────
create table clients (
  id text primary key,
  brand_name text,
  owner_name text,
  email text,
  mobile_number text,
  website_url text,
  facebook_link text,
  instagram_link text,
  tiktok_link text,
  google_link text,
  ga4_property_id text,
  clarity_project_id text,
  clarity_api_token_encrypted text,
  linked_google_ads_ids text[],
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ───────────── Google Ads ─────────────
create table google_connections (
  id text primary key,                    -- 'master_admin_connection'
  provider text,
  account_email text,
  encrypted_access_token text,
  encrypted_refresh_token text,
  token_expiry bigint,                    -- unix ms
  scopes text[],
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table google_ads_accounts (
  id text primary key,                    -- customer id
  google_connection_id text,
  customer_id text,
  descriptive_name text,
  currency_code text,
  time_zone text,
  is_selected boolean,
  brand_name text,
  owner_name text,
  client_business_name text,
  client_contact_name text,
  ai_prompt_notes text,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on google_ads_accounts (customer_id);
create index on google_ads_accounts (google_connection_id);

create table ads_reports_snapshots (
  id text primary key,
  customer_id text,
  date_range_key text,
  report_type text,
  payload_json text,
  extra jsonb not null default '{}',
  fetched_at timestamptz default now()
);

-- ───────────── Ops ─────────────
create table admin_tasks (
  id text primary key,
  title text,
  details text,
  client text,
  type text check (type in ('focus','idea','admin','client','system')),
  priority text check (priority in ('low','medium','high')),
  status text check (status in ('top_3','doing','waiting','done')),
  due_date text,
  owner_note text,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table admin_followups (
  id text primary key,
  client_name text,
  contact_person text,
  channel text check (channel in ('whatsapp','call','email','meeting')),
  reason text,
  last_contact_date text,
  next_follow_up_date text,
  cadence_style text,
  current_issue text,
  promised_next_step text,
  notes text,
  owner_note text,
  status text check (status in ('okay','due_soon','overdue','waiting_on_client','done')),
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table admin_reports (
  id text primary key,
  client_name text,
  report_type text check (report_type in ('weekly','monthly','ads','analysis','custom')),
  reporting_period text,
  due_date text,
  key_focus text,
  notes text,
  owner_note text,
  sent_date text,
  status text check (status in ('not_started','gathering_data','drafting','ready','sent')),
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table admin_invoices (
  id text primary key,
  client_id text references clients(id) on delete set null,
  client_name text,
  client_brand text,
  recipient_email text,
  invoice_number text,
  description text,
  line_items jsonb,
  payments jsonb,
  standard_amount numeric,
  discount_amount numeric,
  subtotal_amount numeric,
  total_amount numeric,
  amount numeric,
  currency text,
  service_month text,
  service_month_key text,
  billing_period_from text,
  billing_period_to text,
  service_summary text,
  issue_date text,
  due_date text,
  sent_date text,
  paid_date text,
  payment_note text,
  owner_note text,
  is_template_generated boolean,
  status text check (status in ('draft','ready_to_send','sent','paid','overdue','partially_paid')),
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on admin_invoices (client_id, service_month_key);

-- Replaces the Firestore transaction on admin_metadata/invoices.
-- The copy script sets it to the current lastInvoiceSequence.
create sequence invoice_number_seq start 1;
create or replace function next_invoice_number() returns text
language sql as $$
  select lpad(nextval('invoice_number_seq')::text, 6, '0');
$$;

create table admin_audit_logs (
  id text primary key,
  action text,
  metadata_json text,
  ip_address text,
  extra jsonb not null default '{}',
  created_at timestamptz default now()
);

-- ───────────── Google Business Profile reviews ─────────────
create table gbp_connections (
  client_id text primary key references clients(id) on delete cascade,
  google_email text,
  encrypted_refresh_token text,
  scopes text[],
  status text check (status in ('connected','error')),
  last_error text,
  connected_via text check (connected_via in ('admin','client_link')),
  extra jsonb not null default '{}',
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table gbp_locations (
  id text primary key,                    -- Google location id
  client_id text references clients(id) on delete cascade,
  account_name text,
  location_name text,
  title text,
  address text,
  linked boolean,
  reply_mode text,
  extra jsonb not null default '{}',
  last_synced_at timestamptz,
  updated_at timestamptz default now()
);
create index on gbp_locations (client_id);
create index on gbp_locations (linked) where linked;

create table gbp_reply_settings (
  client_id text primary key references clients(id) on delete cascade,
  tone text check (tone in ('warm_friendly','professional','upbeat_casual','refined_luxury')),
  length text check (length in ('short','medium','detailed')),
  language text check (language in ('match_reviewer','english','arabic','french')),
  sign_off text,
  use_reviewer_name boolean,
  mention_business_name boolean,
  allow_emojis boolean,
  negative_contact text,
  highlights text,
  avoid text,
  extra_instructions text,
  extra jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table gbp_reviews (
  id text primary key,                    -- Google review id
  client_id text references clients(id) on delete cascade,
  location_id text,
  location_title text,
  review_name text,
  reviewer_name text,
  rating smallint,
  comment text,
  create_time text,                       -- Google's exact string; compared as text
  update_time text,
  status text check (status in ('draft_ready','needs_draft','posted','replied','skipped')),
  draft text,
  draft_generated_at timestamptz,
  draft_error text,
  existing_reply text,
  posted_reply text,
  posted_at timestamptz,
  short_ref text unique,
  telegram_sent_at timestamptz,
  extra jsonb not null default '{}',
  first_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on gbp_reviews (status);
create index on gbp_reviews (client_id);

create table gbp_telegram_batches (
  id text primary key,
  client_name text,
  review_ids text[],
  last_part_ids text[],
  parts integer,
  extra jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Single documents, e.g. 'gbp_sync_status', 'telegram_digest'.
create table app_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- Shallow-merges into a setting atomically (Firestore's set with merge).
create or replace function merge_setting(setting_key text, patch jsonb) returns jsonb
language sql as $$
  insert into app_settings (key, value) values (setting_key, patch)
  on conflict (key) do update set value = app_settings.value || excluded.value, updated_at = now()
  returning value;
$$;

-- Chat ids allowed to use the Telegram bot (master guide step 8).
create table telegram_authorized_users (
  chat_id text primary key,
  label text,
  created_at timestamptz default now()
);

-- ───────────── updated_at triggers ─────────────
do $$
declare t text;
begin
  foreach t in array array[
    'clients','google_connections','google_ads_accounts','admin_tasks','admin_followups',
    'admin_reports','admin_invoices','gbp_connections','gbp_locations','gbp_reply_settings',
    'gbp_reviews','app_settings'
  ] loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ───────────── Row-level security: on, no public policies ─────────────
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;
revoke all on sequence invoice_number_seq from anon, authenticated;
revoke execute on function next_invoice_number() from public, anon, authenticated;
revoke execute on function merge_setting(text, jsonb) from public, anon, authenticated;
grant execute on function next_invoice_number() to service_role;
grant execute on function merge_setting(text, jsonb) to service_role;
