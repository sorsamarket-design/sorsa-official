-- Preserve every future creator Sorsa score change before updating the profile score.
create table if not exists public.creator_sorsa_score_history (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  previous_score integer,
  new_score integer not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists creator_sorsa_score_history_creator_id_created_at_idx
  on public.creator_sorsa_score_history (creator_id, created_at desc);

alter table public.creator_sorsa_score_history enable row level security;

drop policy if exists "Admins can view creator Sorsa score history" on public.creator_sorsa_score_history;
create policy "Admins can view creator Sorsa score history"
on public.creator_sorsa_score_history
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Creators can view own Sorsa score history" on public.creator_sorsa_score_history;
create policy "Creators can view own Sorsa score history"
on public.creator_sorsa_score_history
for select
using (creator_id = auth.uid());

create or replace function public.update_creator_sorsa_score_with_history(
  p_creator_id uuid,
  p_new_score integer,
  p_source text,
  p_synced_at timestamptz default now(),
  p_metadata jsonb default '{}'::jsonb
)
returns table(previous_score integer, new_score integer, history_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_score integer;
  v_history_id uuid;
begin
  select cp.sorsa_score
    into v_previous_score
  from public.creator_profiles cp
  where cp.id = p_creator_id
  for update;

  if not found then
    raise exception 'creator profile % not found', p_creator_id;
  end if;

  insert into public.creator_sorsa_score_history (
    creator_id,
    previous_score,
    new_score,
    source,
    metadata
  )
  values (
    p_creator_id,
    v_previous_score,
    p_new_score,
    coalesce(nullif(trim(p_source), ''), 'unknown'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_history_id;

  update public.creator_profiles
  set
    sorsa_score = p_new_score,
    last_profile_sync_at = p_synced_at
  where id = p_creator_id;

  return query select v_previous_score, p_new_score, v_history_id;
end;
$$;

revoke all on function public.update_creator_sorsa_score_with_history(uuid, integer, text, timestamptz, jsonb)
from public;

grant execute on function public.update_creator_sorsa_score_with_history(uuid, integer, text, timestamptz, jsonb)
to service_role;

notify pgrst, 'reload schema';
