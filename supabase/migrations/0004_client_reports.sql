-- Frozen client reports shared by link (/r/<id>). The id is random and unguessable;
-- the numbers are computed once at creation so a sent link never changes.
create table client_reports (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  period_days integer,
  language text check (language in ('en','ar')),
  period_start text,                      -- YYYY-MM-DD (Cairo)
  period_end text,
  data jsonb,
  extra jsonb not null default '{}',
  created_at timestamptz default now()
);
create index on client_reports (client_id, created_at desc);
alter table client_reports enable row level security;
revoke all on client_reports from anon, authenticated;
