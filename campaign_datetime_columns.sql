-- Preserve campaign hours for admin NFT raffles.
-- The original date columns truncate time-of-day, which makes hour-based raffles
-- fall back to each viewer's local end-of-day countdown.
alter table public.campaigns
  alter column start_date type timestamptz
    using case
      when start_date is null then null
      else (start_date::date::timestamp at time zone 'UTC')
    end,
  alter column end_date type timestamptz
    using case
      when end_date is null then null
      else ((end_date::date + time '23:59:59')::timestamp at time zone 'UTC')
    end;

notify pgrst, 'reload schema';
