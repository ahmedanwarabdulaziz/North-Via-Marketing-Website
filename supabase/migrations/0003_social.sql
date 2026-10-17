-- Facebook & Instagram (Meta) monitoring: followers, latest posts, comments.
-- Same conventions as 0001: snake_case of the app's fields, `_at` = timestamptz,
-- Meta's own timestamps kept as text.

-- One Meta login: the admin's own account, or a client's via a connect link.
create table meta_connections (
  id text primary key,
  connected_via text check (connected_via in ('admin','client_link')),
  client_id text references clients(id) on delete cascade,   -- set for client links
  meta_user_id text,
  meta_user_name text,
  encrypted_user_token text,              -- long-lived (≈60 days); page tokens below don't expire
  token_expires_at timestamptz,
  scopes text[],
  status text check (status in ('connected','error')),
  last_error text,
  extra jsonb not null default '{}',
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One Facebook Page (and its linked Instagram account, if any).
create table social_accounts (
  id text primary key,                    -- Facebook Page id
  connection_id text references meta_connections(id) on delete cascade,
  client_id text references clients(id) on delete set null,  -- null until assigned
  page_name text,
  encrypted_page_token text,
  ig_user_id text,
  ig_username text,
  linked boolean,                         -- monitored for its client
  linked_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  extra jsonb not null default '{}',
  updated_at timestamptz default now()
);
create index on social_accounts (client_id);

-- Daily follower counts (one row per account per Cairo day).
create table social_follower_snapshots (
  id text primary key,                    -- <account id>:<YYYY-MM-DD>
  account_id text references social_accounts(id) on delete cascade,
  client_id text references clients(id) on delete cascade,
  day text,
  fb_followers integer,
  ig_followers integer,
  extra jsonb not null default '{}',
  captured_at timestamptz default now()
);
create index on social_follower_snapshots (account_id, day desc);

-- Recent posts with their latest numbers.
create table social_posts (
  id text primary key,                    -- Meta post / media id
  account_id text references social_accounts(id) on delete cascade,
  client_id text references clients(id) on delete cascade,
  platform text check (platform in ('facebook','instagram')),
  message text,
  permalink text,
  created_time text,
  reach integer,                          -- Instagram reach / Facebook unique media views
  views integer,
  likes integer,
  comments_count integer,
  extra jsonb not null default '{}',
  last_synced_at timestamptz,
  updated_at timestamptz default now()
);
create index on social_posts (account_id, created_time desc);

create table social_comments (
  id text primary key,                    -- Meta comment id
  account_id text references social_accounts(id) on delete cascade,
  client_id text references clients(id) on delete cascade,
  platform text check (platform in ('facebook','instagram')),
  post_id text,
  post_permalink text,
  post_excerpt text,
  author_name text,
  author_id text,
  message text,
  created_time text,
  status text check (status in ('draft_ready','needs_draft','posted','replied','skipped','hidden')),
  risk_level text check (risk_level in ('none','watch','high')),
  risk_category text,
  risk_reason text,
  draft text,
  draft_generated_at timestamptz,
  draft_error text,
  posted_reply text,
  posted_at timestamptz,
  hidden_at timestamptz,
  short_ref text unique,
  telegram_sent_at timestamptz,
  risk_alerted_at timestamptz,
  extra jsonb not null default '{}',
  first_seen_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on social_comments (status);
create index on social_comments (client_id);

do $$
declare t text;
begin
  foreach t in array array['meta_connections','social_accounts','social_posts','social_comments'] loop
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
  foreach t in array array['meta_connections','social_accounts','social_follower_snapshots','social_posts','social_comments'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;
