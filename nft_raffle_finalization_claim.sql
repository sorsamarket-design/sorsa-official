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
begin
  return query
  with campaign_metadata as (
    select
      campaigns.id,
      case
        when nullif(btrim(campaigns.language), '') is not null then campaigns.language::jsonb
        else '{}'::jsonb
      end as metadata
    from public.campaigns as campaigns
    where campaigns.id = p_campaign_id
  )
  update public.campaigns as campaigns
  set language = (
    campaign_metadata.metadata
    || jsonb_build_object(
      'raffle_finalizing_at', now(),
      'raffle_finalizing_source', coalesce(nullif(p_source, ''), 'automatic')
    )
  )::text
  from campaign_metadata
  where campaigns.id = p_campaign_id
    and campaigns.id = campaign_metadata.id
    and campaigns.campaign_type in ('raffle', 'fcfs')
    and not (
      jsonb_typeof(campaign_metadata.metadata -> 'raffle_results') = 'array'
      and jsonb_array_length(campaign_metadata.metadata -> 'raffle_results') > 0
    )
    and (
      not (campaign_metadata.metadata ? 'raffle_finalizing_at')
      or (
        campaign_metadata.metadata ->> 'raffle_finalizing_at'
      )::timestamptz < now() - make_interval(mins => greatest(coalesce(p_claim_timeout_minutes, 15), 1))
    )
  returning campaigns.*;
end;
$$;

revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from public;
revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from anon;
revoke all on function public.claim_nft_raffle_finalization(uuid, text, integer) from authenticated;
grant execute on function public.claim_nft_raffle_finalization(uuid, text, integer) to service_role;

notify pgrst, 'reload schema';
