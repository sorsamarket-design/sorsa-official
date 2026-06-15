alter table creator_profiles
  add column if not exists x_provider_id text;

create index if not exists creator_profiles_x_provider_id_idx
  on creator_profiles (x_provider_id)
  where x_provider_id is not null;
