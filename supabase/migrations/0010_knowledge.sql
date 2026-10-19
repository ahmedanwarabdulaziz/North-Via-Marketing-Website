-- Knowledge library: screenshots, links and notes sent to the Telegram bot, read and tagged
-- by the AI, found later with /find. Search combines meaning (pgvector embeddings from
-- gemini-embedding-001, 768 dims) with plain keyword matching, so it still works when the
-- embedding model is unavailable.

create extension if not exists vector with schema extensions;

create table knowledge_items (
  id text primary key,                    -- short random id, fits in Telegram button data
  chat_id text,
  type text not null check (type in ('screenshot','link','note')),
  title text not null,
  summary text,
  content text,                           -- text read from the screenshot / page, or the note itself
  url text,
  domain text,
  tags text[] not null default '{}',
  client_id text references clients(id) on delete set null,
  category text check (category in ('work','personal')),
  telegram_file_id text,                  -- screenshots: resend from Telegram without downloading
  file_path text,                         -- screenshots: copy in the private "knowledge" bucket
  source_text text,                       -- the caption or message as sent
  status text not null default 'active' check (status in ('active','removed')),
  embedding extensions.vector(768),
  search tsvector,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on knowledge_items (status, created_at desc);
create index on knowledge_items (client_id);
create index on knowledge_items using gin (search);
create index on knowledge_items using hnsw (embedding extensions.vector_cosine_ops);
create trigger set_updated_at before update on knowledge_items for each row execute function set_updated_at();

-- 'simple' keeps Arabic and English words as they are (no English-only stemming).
create or replace function knowledge_search_text() returns trigger language plpgsql as $$
begin
  new.search := to_tsvector('simple',
    coalesce(new.title, '') || ' ' || coalesce(new.summary, '') || ' ' || coalesce(new.content, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '') || ' ' || coalesce(new.domain, ''));
  return new;
end $$;
create trigger knowledge_search_text before insert or update of title, summary, content, tags, domain
  on knowledge_items for each row execute function knowledge_search_text();

-- Ids of the best matches: similar meaning (when an embedding is given) or matching words.
create or replace function search_knowledge(q_embedding extensions.vector(768), q_text text, match_count int default 10, min_similarity float default 0.6)
returns table (id text, similarity float, word_match boolean)
language sql stable as $$
  with scored as (
    select k.id,
      case when q_embedding is not null and k.embedding is not null
        then 1 - (k.embedding operator(extensions.<=>) q_embedding) else 0 end as similarity,
      (k.search @@ websearch_to_tsquery('simple', q_text) or k.title ilike '%' || q_text || '%') as word_match,
      k.created_at
    from knowledge_items k
    where k.status = 'active'
  )
  select id, similarity, word_match from scored
  where similarity >= min_similarity or word_match
  order by similarity + case when word_match then 0.15 else 0 end desc, created_at desc
  limit match_count;
$$;

alter table knowledge_items enable row level security;
revoke all on knowledge_items from anon, authenticated;
revoke all on function search_knowledge from anon, authenticated;

-- Private bucket for the screenshots (only the server's service key can read it).
insert into storage.buckets (id, name, public) values ('knowledge', 'knowledge', false) on conflict (id) do nothing;
