-- Persist creator task verification state for admin NFT campaigns.
create table if not exists public.nft_task_verifications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  task_type text not null check (task_type in ('follow', 'retweet', 'comment', 'engagement', 'telegram')),
  task_value text not null,
  verification_details jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (campaign_id, creator_id, task_type, task_value)
);

alter table public.nft_task_verifications enable row level security;

drop policy if exists "Creators can view own NFT task verifications" on public.nft_task_verifications;
create policy "Creators can view own NFT task verifications"
on public.nft_task_verifications
for select
using (creator_id = auth.uid());

drop policy if exists "Admins can view NFT task verifications" on public.nft_task_verifications;
create policy "Admins can view NFT task verifications"
on public.nft_task_verifications
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

notify pgrst, 'reload schema';
