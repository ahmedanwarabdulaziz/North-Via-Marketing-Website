-- Microsoft Clarity keeps only the last 1–3 days in its API (10 calls a day per
-- project), so one snapshot of the last 24 hours is saved each morning and the
-- weekly/monthly numbers are built from these.
create table clarity_daily (
  id text primary key,                    -- <client id>:<YYYY-MM-DD> (Cairo day the snapshot was taken)
  client_id text references clients(id) on delete cascade,
  day text,
  sessions integer,
  bot_sessions integer,
  pages_per_session numeric,
  scroll_depth numeric,                   -- average %
  active_seconds numeric,                 -- average active engagement time
  rage_click_pct numeric,                 -- % of sessions with the signal
  dead_click_pct numeric,
  quickback_pct numeric,
  script_error_pct numeric,
  raw jsonb,
  extra jsonb not null default '{}',
  captured_at timestamptz default now()
);
create index on clarity_daily (client_id, day desc);
alter table clarity_daily enable row level security;
revoke all on clarity_daily from anon, authenticated;
