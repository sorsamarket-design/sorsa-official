-- Backfill admin NFT allocation totals into the main budget column.
-- Older GTD/FCFS raffle drafts could save budget as 0 while the selected total
-- lived only inside the campaign language metadata.
with nft_campaign_metadata as materialized (
  select
    id,
    language::jsonb as metadata
  from public.campaigns
  where campaign_type in ('raffle', 'content', 'fcfs', 'all')
    and language is not null
    and language ~ '^\s*\{'
)
update public.campaigns as campaigns
set
  budget = case
    when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'gtd' then coalesce((nft_campaign_metadata.metadata ->> 'total_gtd')::numeric, campaigns.budget)
    when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'fcfs' then coalesce((nft_campaign_metadata.metadata ->> 'total_fcfs')::numeric, campaigns.budget)
    else campaigns.budget
  end,
  net_budget = case
    when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'gtd' then coalesce((nft_campaign_metadata.metadata ->> 'total_gtd')::numeric, campaigns.net_budget)
    when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'fcfs' then coalesce((nft_campaign_metadata.metadata ->> 'total_fcfs')::numeric, campaigns.net_budget)
    else campaigns.net_budget
  end
from nft_campaign_metadata
where campaigns.id = nft_campaign_metadata.id
  and nft_campaign_metadata.metadata ->> 'nft' = 'true'
  and lower(nft_campaign_metadata.metadata ->> 'allocation_type') in ('gtd', 'fcfs')
  and (
    campaigns.budget is distinct from case
      when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'gtd' then coalesce((nft_campaign_metadata.metadata ->> 'total_gtd')::numeric, campaigns.budget)
      when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'fcfs' then coalesce((nft_campaign_metadata.metadata ->> 'total_fcfs')::numeric, campaigns.budget)
      else campaigns.budget
    end
    or campaigns.net_budget is distinct from case
      when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'gtd' then coalesce((nft_campaign_metadata.metadata ->> 'total_gtd')::numeric, campaigns.net_budget)
      when lower(nft_campaign_metadata.metadata ->> 'allocation_type') = 'fcfs' then coalesce((nft_campaign_metadata.metadata ->> 'total_fcfs')::numeric, campaigns.net_budget)
      else campaigns.net_budget
    end
  );

notify pgrst, 'reload schema';
