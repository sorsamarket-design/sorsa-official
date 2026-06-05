create or replace function enforce_brand_profile_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*)
    from brand_profiles
    where owner_id = new.owner_id
  ) >= 3 then
    raise exception 'You can create up to 3 brand profiles per account.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists brand_profiles_max_3_per_owner on brand_profiles;

create trigger brand_profiles_max_3_per_owner
before insert on brand_profiles
for each row
execute function enforce_brand_profile_limit();

notify pgrst, 'reload schema';
