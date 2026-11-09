-- Email inboxes connected from Admin → Email (Gmail now, Outlook later). Every 5 minutes the
-- new mail is read, the AI keeps the important ones (using each inbox's focus rules) and sends
-- a Telegram card. A reply is drafted by the AI from Ahmed's voice note or text and is only
-- sent after he taps ✅ Send in Telegram.

create table email_accounts (
  id text primary key,                    -- short random id
  provider text not null check (provider in ('gmail','outlook')),
  email text not null unique,
  label text,                             -- e.g. "NVM", "Sanad", "JL Comfort"
  focus text,                             -- what matters in this inbox, in Ahmed's words
  enabled boolean not null default true,
  ring_urgent boolean not null default true,
  encrypted_refresh_token text not null,
  ignored_senders text[] not null default '{}',
  last_checked_at timestamptz,            -- mail received after this is new
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

--   status: new        card sent, nothing done yet
--           replying   waiting for Ahmed's voice note / text for the reply
--           draft      AI draft shown, waiting for ✅ Send
--           sent       reply sent from the same inbox and thread
--           done / ignored
--           skipped    not important (kept so it isn't read again)
create table email_items (
  id text primary key,                    -- short random id, fits in Telegram button data
  account_id text not null references email_accounts(id) on delete cascade,
  message_id text not null,               -- provider's message id
  thread_id text,
  rfc_message_id text,                    -- Message-ID header, for In-Reply-To
  from_name text,
  from_email text,
  to_email text,
  subject text,
  received_at timestamptz,
  snippet text,
  body text,                              -- plain text, trimmed
  summary text,
  reason text,                            -- why the AI thinks it matters
  urgent boolean not null default false,
  status text not null default 'new' check (status in ('new','replying','draft','sent','done','ignored','skipped')),
  draft text,
  brief text,                             -- what Ahmed said for the reply, all rounds joined
  chat_id text,
  card_message_id bigint,
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (account_id, message_id)
);
create index on email_items (status, updated_at desc);

alter table email_accounts enable row level security;
alter table email_items enable row level security;
revoke all on email_accounts from anon, authenticated;
revoke all on email_items from anon, authenticated;
