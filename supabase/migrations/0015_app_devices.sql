-- Phones signed in to the Anwarz mobile app. Each sign-in is one row: the app's token names
-- the row, so revoking a row signs that phone out. push_token is the phone's Firebase (FCM)
-- token; alerts that ring through ntfy are also sent as push notifications to these phones.

create table app_devices (
  id text primary key,                    -- short random id, inside the app's token
  name text,                              -- e.g. "Ahmed's Samsung"
  platform text not null default 'android',
  push_token text,                        -- FCM device token, null until the app registers one
  app_version text,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  revoked_at timestamptz                  -- set = signed out
);
create index on app_devices (revoked_at);
create unique index on app_devices (push_token) where push_token is not null;

alter table app_devices enable row level security;
revoke all on app_devices from anon, authenticated;
