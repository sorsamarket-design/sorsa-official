-- Make activity point awards atomic, duplicate-safe, and consistent with the
-- live points_log schema.

alter table public.creator_profiles
  add column if not exists activity_points integer not null default 0;

alter table public.points_log
  add column if not exists creator_id uuid references public.creator_profiles(id) on delete cascade,
  add column if not exists points integer,
  add column if not exists event text;

-- creator_id previously referenced user_profiles in production. Point awards
-- belong to creator_profiles, which is also where activity_points is stored.
alter table public.points_log
  drop constraint if exists points_log_creator_id_fkey;

alter table public.points_log
  add constraint points_log_creator_id_fkey
  foreign key (creator_id)
  references public.creator_profiles(id)
  on delete cascade;

create unique index if not exists points_log_creator_event_key
  on public.points_log (creator_id, event);

create or replace function public.award_creator_activity_points(
  p_creator_id uuid,
  p_points integer,
  p_event text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_creator_id is null or p_points <= 0 or nullif(trim(p_event), '') is null then
    raise exception 'Invalid activity point award';
  end if;

  insert into public.points_log (creator_id, points, event)
  values (p_creator_id, p_points, p_event)
  on conflict (creator_id, event) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return false;
  end if;

  update public.creator_profiles
  set activity_points = coalesce(activity_points, 0) + p_points
  where id = p_creator_id;

  if not found then
    raise exception 'Creator profile not found';
  end if;

  return true;
end;
$$;

revoke all on function public.award_creator_activity_points(uuid, integer, text) from public;
revoke all on function public.award_creator_activity_points(uuid, integer, text) from anon;
revoke all on function public.award_creator_activity_points(uuid, integer, text) from authenticated;
grant execute on function public.award_creator_activity_points(uuid, integer, text) to service_role;

drop policy if exists "Creators can view their own points log" on public.points_log;
create policy "Creators can view their own points log"
  on public.points_log for select
  to authenticated
  using (auth.uid() = creator_id);

-- Repair missing awards for submissions and referrals that were completed
-- before the point award path was fixed. Unique event keys make this rerunnable.
do $$
declare
  item record;
begin
  for item in
    select id, creator_id
    from public.campaign_submissions
    where status = 'approved'
      and creator_id is not null
  loop
    perform public.award_creator_activity_points(
      item.creator_id,
      10,
      'submission_approved:' || item.id::text
    );
  end loop;

  for item in
    select id, referrer_id, points_awarded
    from public.referrals
    where status = 'qualified'
      and points_awarded > 0
  loop
    perform public.award_creator_activity_points(
      item.referrer_id,
      item.points_awarded,
      'referral_qualified:' || item.id::text
    );
  end loop;
end;
$$;

notify pgrst, 'reload schema';
