-- Allow fast direct Supabase reads for admin-created NFT campaigns while
-- keeping writes and privileged actions on the trusted backend.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.is_admin_nft_campaign(
  campaign_status text,
  campaign_type text,
  campaign_categories text[]
)
returns boolean
language sql
immutable
as $$
  select campaign_status in ('draft', 'completed')
    and (
      campaign_type in ('raffle', 'fcfs', 'all')
      or (
        campaign_type = 'content'
        and coalesce(campaign_categories, '{}'::text[]) @> array['NFT']::text[]
      )
    );
$$;

grant execute on function public.is_admin_nft_campaign(text, text, text[]) to authenticated;

drop policy if exists "Authenticated users can view admin NFT campaigns" on public.campaigns;
create policy "Authenticated users can view admin NFT campaigns"
on public.campaigns
for select
to authenticated
using (
  public.is_admin_nft_campaign(status::text, campaign_type, categories)
  and exists (
    select 1
    from public.profiles p
    where p.id = campaigns.owner_id
      and p.role = 'admin'
  )
);

drop policy if exists "Admins can view NFT campaign participants" on public.campaign_participants;
create policy "Admins can view NFT campaign participants"
on public.campaign_participants
for select
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.campaigns c
    join public.profiles p on p.id = c.owner_id
    where c.id = campaign_participants.campaign_id
      and public.is_admin_nft_campaign(c.status::text, c.campaign_type, c.categories)
      and p.role = 'admin'
  )
);

drop policy if exists "Creators can view own campaign participants" on public.campaign_participants;
create policy "Creators can view own campaign participants"
on public.campaign_participants
for select
to authenticated
using (auth.uid() = creator_id);

drop policy if exists "Admins can view NFT campaign submissions" on public.campaign_submissions;
create policy "Admins can view NFT campaign submissions"
on public.campaign_submissions
for select
to authenticated
using (
  public.is_admin()
  and exists (
    select 1
    from public.campaigns c
    join public.profiles p on p.id = c.owner_id
    where c.id = campaign_submissions.campaign_id
      and public.is_admin_nft_campaign(c.status::text, c.campaign_type, c.categories)
      and p.role = 'admin'
  )
);

drop policy if exists "Creators can view own campaign submissions" on public.campaign_submissions;
create policy "Creators can view own campaign submissions"
on public.campaign_submissions
for select
to authenticated
using (auth.uid() = creator_id);

drop policy if exists "Admins can view creator profiles" on public.creator_profiles;
create policy "Admins can view creator profiles"
on public.creator_profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Creators can view own profile" on public.creator_profiles;
create policy "Creators can view own profile"
on public.creator_profiles
for select
to authenticated
using (auth.uid() = id);

create or replace function public.get_nft_campaign_stats(campaign_ids uuid[])
returns table (
  campaign_id uuid,
  joined_count bigint,
  approved_count bigint,
  rejected_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as campaign_id,
    count(cp.id) as joined_count,
    count(cp.id) filter (where cp.status = 'approved') as approved_count,
    count(cp.id) filter (where cp.status = 'rejected') as rejected_count
  from public.campaigns c
  join public.profiles p on p.id = c.owner_id
  left join public.campaign_participants cp on cp.campaign_id = c.id
  where c.id = any(campaign_ids)
    and public.is_admin_nft_campaign(c.status::text, c.campaign_type, c.categories)
    and p.role = 'admin'
  group by c.id;
$$;

grant execute on function public.get_nft_campaign_stats(uuid[]) to authenticated;
