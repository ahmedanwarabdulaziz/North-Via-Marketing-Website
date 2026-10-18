-- Tasks and reminders sent to the Telegram bot as text (later voice/screenshots).
-- The AI fills the fields; whatever it can't tell is asked in the chat first
-- (task_drafts), then the finished item is saved here. Times are stored in UTC
-- and shown in Cairo time. Repeats are a rule on one row: Done moves due_at to
-- the next occurrence instead of creating copies. Replaces admin_tasks later.

create table tasks (
  id text primary key,                    -- short random id, fits in Telegram button data
  title text not null,
  notes text,
  kind text not null default 'task' check (kind in ('task','reminder')),
  category text not null default 'personal' check (category in ('work','personal')),
  client_id text references clients(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','done','cancelled')),
  due_at timestamptz,                     -- null = no date
  all_day boolean not null default false,
  remind_before_min integer not null default 0,
  remind_at timestamptz,                  -- due_at minus remind_before_min (all-day: 9 AM Cairo)
  reminded_at timestamptz,                -- last reminder sent for the current due_at
  repeat_rule jsonb,                      -- {freq: daily|weekly|monthly|yearly, interval, weekdays[0-6], monthDay}
  repeat_until date,
  repeat_count integer,                   -- occurrences left including the current one
  source text not null default 'text',
  raw_input text,
  ai_confidence jsonb,
  chat_id text,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  done_at timestamptz
);
create index on tasks (status, due_at);
create index on tasks (status, remind_at);
create index on tasks (client_id);
create trigger set_updated_at before update on tasks for each row execute function set_updated_at();

-- An item the AI couldn't finish: the questions still open for it.
create table task_drafts (
  id text primary key,
  chat_id text not null,
  fields jsonb not null default '{}',
  missing text[] not null default '{}',
  asking text,                            -- field asked in the last question
  raw_input text,
  source text not null default 'text',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index on task_drafts (chat_id, updated_at desc);
create trigger set_updated_at before update on task_drafts for each row execute function set_updated_at();

-- What happened to each task: created, edited, done, undone, reminded, snoozed.
create table task_events (
  id bigint generated always as identity primary key,
  task_id text references tasks(id) on delete cascade,
  event text not null,
  detail jsonb,
  created_at timestamptz default now()
);
create index on task_events (task_id, created_at desc);

alter table tasks enable row level security;
alter table task_drafts enable row level security;
alter table task_events enable row level security;
revoke all on tasks, task_drafts, task_events from anon, authenticated;
