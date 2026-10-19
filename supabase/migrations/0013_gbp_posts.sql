-- Google Business Profile posts made from the Telegram bot: pick a location, send a photo and
-- a voice note or text, the AI writes the post (with the client's top Google Ads keywords),
-- and nothing goes to Google until the owner taps Publish.
--   status: collecting  waiting for the photo and/or what the post is about
--           revising    waiting for what to change in the draft
--           draft       preview shown, waiting for Publish
--           published   sent to Google (google_name set); google_state is Google's review state
--           cancelled / deleted
create table gbp_posts (
  id text primary key,                    -- short random id, fits in Telegram button data
  chat_id text not null,
  client_id text references clients(id) on delete set null,
  location_id text not null,              -- gbp_locations.id
  status text not null default 'collecting' check (status in ('collecting','revising','draft','published','cancelled','deleted')),
  telegram_file_id text,                  -- the photo, to show it again in the preview
  image_path text,                        -- copy in the private "gbp-posts" bucket (Google downloads it from a signed link)
  brief text,                             -- what the owner said or typed, all rounds joined
  post jsonb not null default '{}',       -- the AI's draft: summary, topicType, event/offer, cta, keywords
  google_name text,                       -- accounts/x/locations/y/localPosts/z
  google_state text,                      -- PROCESSING | LIVE | REJECTED
  search_url text,
  preview_message_id bigint,
  extra jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on gbp_posts (chat_id, updated_at desc);

insert into storage.buckets (id, name, public) values ('gbp-posts', 'gbp-posts', false) on conflict (id) do nothing;
