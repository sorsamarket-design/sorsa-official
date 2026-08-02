-- Add an atomic claim step for NFT raffle finalization.
-- This prevents multiple backend instances from selecting winners and sending
-- duplicate Telegram notifications for the same ended admin-created NFT raffle.

create or replace function public.claim_nft_raffle_finalization(
  p_campaign_id uuid,
  p_source text default 'automatic',
  p_claim_timeout_minutes integer default 15
)
returns setof public.campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.campaigns%rowtype;
  v_metadata jsonb;
  v_claimed public.campaigns%rowtype;
  v_timeout_minutes integer := greatest(coalesce(p_claim_timeout_minutes, 15), 1);
begin
  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
    and campaign_type in ('raffle', 'fcfs')
  for update;

  if not found then
    return;
  end if;

  v_metadata := case
    when nullif(btrim(v_campaign.language), '') is not null then v_campaign.language::jsonb
    else '{}'::jsonb
  end;

  if jsonb_typeof(v_metadata -> 'raffle_results') = 'array'
     and jsonb_array_length(v_metadata -> 'raffle_results') > 0 then
    return;
  end if;

  if v_metadata ->> 'raffle_finalization_result' = 'no_eligible_participants' then
    return;
  end if;

  if v_metadata ? 'raffle_finalizing_at'
     and (v_metadata ->> 'raffle_finalizing_at')::timestamptz >= now() - make_interval(mins => v_timeout_minutes) then
    return;
  end if;

  update public.campaigns
  set language = (
    v_metadata || jsonb_build_object(
      'raffle_finalizing_at', now(),
      'raffle_finalizing_source', coalesce(nullif(p_source, ''), 'automatic')
    )
  )::text
  where id = p_campaign_id
  returning * into v_claimed;

  return next v_claimed;
end;
$$;

revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from public;
revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from anon;
revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from authenticated;
grant execute on function public.claim_nft_raffle_finalization(uuid, text, integer) to service_role;

notify pgrst, 'reload schema';
