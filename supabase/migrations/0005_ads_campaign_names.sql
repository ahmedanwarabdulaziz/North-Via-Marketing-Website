-- Campaign names per ad account, shown on the client page to tell accounts apart.
alter table google_ads_accounts add column campaign_names text[];
alter table google_ads_accounts add column campaigns_checked_at timestamptz;
