-- Old unanswered reviews found by the on-demand full scan ("Find old unanswered reviews" in
-- Telegram). They're stored as skipped so the hourly runs never draft them; the owner then
-- picks which ones to draft (last 3 months, 12 months, all) or leaves them.
--   backlog = 'waiting'   found by a full scan, waiting for that choice
--   backlog = 'dismissed' the owner chose to leave it unanswered
alter table gbp_reviews add column backlog text check (backlog in ('waiting', 'dismissed'));
update gbp_reviews set backlog = 'waiting', extra = extra - 'backlog' where extra->>'backlog' = 'true';
create index on gbp_reviews (backlog) where backlog is not null;
