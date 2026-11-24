-- More kinds of Google Ads ideas besides add_keyword / add_negative:
--   pause_keyword, change_bid, change_budget, new_ad_copy (applied to Google Ads after approval)
--   advisory (a heads-up such as broken conversion tracking or a disapproved ad: nothing to apply)
-- `payload` holds what that kind needs: resource names, the before and after values.

alter table ads_suggestions add column if not exists payload jsonb;
