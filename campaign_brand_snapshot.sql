alter table campaigns
  add column if not exists brand_name text,
  add column if not exists brand_logo_url text,
  add column if not exists brand_twitter_handle text;

update campaigns c
set
  brand_name = coalesce(c.brand_name, bp.company_name),
  brand_logo_url = coalesce(c.brand_logo_url, bp.logo_url),
  brand_twitter_handle = coalesce(c.brand_twitter_handle, bp.twitter_handle)
from brand_profiles bp
where c.brand_profile_id = bp.id
  and (
    c.brand_name is null
    or c.brand_logo_url is null
    or c.brand_twitter_handle is null
  );
