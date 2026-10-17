-- Website monitoring (ANWARZ plan phase 5). Each row is one URL to watch:
-- a client's homepage or an important page (contact, booking…).
-- Same conventions as 0001: snake_case of the app's fields, `_at` = timestamptz.

create table websites (
  id text primary key,
  client_id text references clients(id) on delete cascade,
  url text,
  label text,
  must_contain text,                      -- optional text the page must show (catches error pages that return 200)
  enabled boolean,
  status text check (status in ('up','down','unknown')),
  last_status_code integer,
  last_response_ms integer,
  last_error text,
  down_since timestamptz,
  ssl_expires_at timestamptz,
  ssl_alerted_days integer,               -- smallest expiry warning already sent; cleared after renewal
  last_checked_at timestamptz,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on websites (client_id);

-- History of every check, kept 30 days.
create table website_checks (
  id text primary key,
  website_id text references websites(id) on delete cascade,
  client_id text references clients(id) on delete cascade,
  ok boolean,
  status_code integer,
  response_ms integer,
  error text,
  extra jsonb not null default '{}',
  checked_at timestamptz default now()
);
create index on website_checks (website_id, checked_at desc);

create trigger set_updated_at before update on websites for each row execute function set_updated_at();

alter table websites enable row level security;
alter table website_checks enable row level security;
revoke all on websites, website_checks from anon, authenticated;
