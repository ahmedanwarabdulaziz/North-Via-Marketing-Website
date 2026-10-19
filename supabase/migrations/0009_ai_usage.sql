-- AI calls per Cairo day, provider, model and feature, for the bot's "AI usage" screen.
-- Gemini has no API to read the remaining quota, so the app counts its own calls; Groq sends
-- its remaining limits in response headers, kept in `limits` from the latest call.
create table ai_usage (
  id text primary key,                    -- <day>|<provider>|<model>|<feature>
  day text not null,                      -- YYYY-MM-DD, Cairo
  provider text not null,                 -- gemini | groq
  model text not null,
  feature text not null,                  -- tasks | reviews | comments | chat …
  calls integer not null default 0,
  failures integer not null default 0,
  rate_limited integer not null default 0,
  tokens bigint not null default 0,
  last_ok_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  limits jsonb,                           -- Groq x-ratelimit-* headers and when they were read
  updated_at timestamptz default now()
);
create index on ai_usage (day desc);
alter table ai_usage enable row level security;
revoke all on ai_usage from anon, authenticated;

-- One atomic +1 per call, so parallel calls don't overwrite each other's counts.
create or replace function ai_usage_bump(
  p_day text, p_provider text, p_model text, p_feature text,
  p_ok boolean, p_rate_limited boolean, p_tokens bigint, p_error text, p_limits jsonb
) returns void language sql as $$
  insert into ai_usage as u (id, day, provider, model, feature, calls, failures, rate_limited, tokens, last_ok_at, last_error, last_error_at, limits, updated_at)
  values (
    p_day || '|' || p_provider || '|' || p_model || '|' || p_feature, p_day, p_provider, p_model, p_feature,
    1, case when p_ok then 0 else 1 end, case when p_rate_limited then 1 else 0 end, coalesce(p_tokens, 0),
    case when p_ok then now() end, p_error, case when p_ok then null else now() end, p_limits, now()
  )
  on conflict (id) do update set
    calls = u.calls + 1,
    failures = u.failures + case when p_ok then 0 else 1 end,
    rate_limited = u.rate_limited + case when p_rate_limited then 1 else 0 end,
    tokens = u.tokens + coalesce(p_tokens, 0),
    last_ok_at = case when p_ok then now() else u.last_ok_at end,
    last_error = case when p_ok then u.last_error else p_error end,
    last_error_at = case when p_ok then u.last_error_at else now() end,
    limits = coalesce(p_limits, u.limits),
    updated_at = now();
$$;
revoke all on function ai_usage_bump from anon, authenticated;
