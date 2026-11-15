-- Every alert sent to the Anwarz app. The ones Ahmed marked urgent (app_settings 'urgent_alerts')
-- stay pinned on the phone and show in a pop-up when he opens the app, until he taps Seen.

create table app_alerts (
  id text primary key,                    -- short random id, also in the push data (alertId)
  kind text not null,                     -- the app's alert channel: site_down, email, review, ...
  title text not null,
  body text,
  data jsonb,                             -- what a tap opens, e.g. {"type":"email","id":"…"}
  urgent boolean not null default false,
  created_at timestamptz default now(),
  seen_at timestamptz                     -- set when he taps Seen / opens it
);
create index on app_alerts (urgent, seen_at, created_at desc);

alter table app_alerts enable row level security;
revoke all on app_alerts from anon, authenticated;
