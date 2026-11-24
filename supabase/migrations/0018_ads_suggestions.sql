-- Google Ads improvement ideas found by the weekly check (new keywords, negative keywords).
-- Nothing here touches Google Ads by itself: each row waits as 'pending' until Ahmed accepts it
-- in the Anwarz app (optionally after editing it). Only then is it applied to the real account.

create table ads_suggestions (
  id text primary key,
  client_id text not null,
  customer_id text not null,              -- Google Ads customer id
  type text not null,                     -- add_keyword | add_negative
  campaign_id text,
  campaign_name text,
  ad_group_id text,
  ad_group_name text,
  text text not null,                     -- the keyword / negative keyword
  match_type text not null default 'PHRASE',  -- EXACT | PHRASE | BROAD
  reason text,                            -- why, in plain words
  evidence jsonb,                         -- {clicks, cost, conversions, impressions, currency}
  client_line text,                       -- one plain sentence for the client update
  status text not null default 'pending', -- pending | applied | rejected | failed | undone
  edited boolean not null default false,  -- Ahmed changed it before accepting
  error text,
  resource_name text,                     -- what was created in Google Ads (used for Undo)
  notified_at timestamptz,                -- the client was told about it
  created_at timestamptz default now(),
  decided_at timestamptz,
  applied_at timestamptz
);
create index on ads_suggestions (client_id, status, created_at desc);
create index on ads_suggestions (customer_id, type, text);

alter table ads_suggestions enable row level security;
revoke all on ads_suggestions from anon, authenticated;
