-- Library categories, and chat conversations with the bot.

-- Categories for the knowledge library. The AI picks one; when it isn't sure the item goes to
-- "Public" and the bot asks. New categories can be added from Telegram.
create table knowledge_categories (
  id text primary key,                    -- slug for the starter set, short random id for new ones
  name text not null unique,
  emoji text not null default '📁',
  sort integer not null default 100,
  created_at timestamptz default now()
);
insert into knowledge_categories (id, name, emoji, sort) values
  ('public', 'Public', '🌐', 0),
  ('competitors', 'Competitors', '🥊', 10),
  ('content-ideas', 'Content ideas', '💡', 20),
  ('ads', 'Ads', '📣', 30),
  ('seo', 'SEO', '🔎', 40),
  ('design', 'Design', '🎨', 50),
  ('tools', 'Tools', '🧰', 60),
  ('learning', 'Learning', '📚', 70)
on conflict (id) do nothing;

alter table knowledge_items
  add column category_id text not null default 'public' references knowledge_categories(id) on delete set default,
  add column category_confirmed boolean not null default false; -- false = the AI guessed (or wasn't sure)
create index on knowledge_items (category_id);

alter table knowledge_categories enable row level security;
revoke all on knowledge_categories from anon, authenticated;

-- A conversation with the bot: the chosen model and the last messages. A chat stays open
-- while messages keep coming (30 minutes after the last one) or until it's ended.
create table chat_sessions (
  id text primary key,
  chat_id text not null,
  provider text,                          -- groq | gemini (null until a model is picked)
  model text,
  status text not null default 'active' check (status in ('active','ended')),
  pending_question text,                  -- the first question, answered once a model is picked
  messages jsonb not null default '[]',   -- [{role: 'user'|'assistant', content, at}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on chat_sessions (chat_id, updated_at desc);
create trigger set_updated_at before update on chat_sessions for each row execute function set_updated_at();
alter table chat_sessions enable row level security;
revoke all on chat_sessions from anon, authenticated;
