-- Telegram group configuration registry for admin NFT raffle join tasks.
-- Rows are created/updated automatically from Telegram my_chat_member webhook updates.
create table if not exists public.telegram_group_configs (
  chat_id text primary key,
  brand_profile_id uuid references public.brand_profiles(id) on delete set null,
  chat_type text,
  title text,
  public_link text,
  bot_status text,
  bot_permission_status text not null default 'unknown',
  is_active boolean not null default false,
  bot_permissions jsonb not null default '{}'::jsonb,
  last_error text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.telegram_group_configs
  add column if not exists brand_profile_id uuid references public.brand_profiles(id) on delete set null,
  add column if not exists public_link text,
  add column if not exists is_active boolean not null default false;

update public.telegram_group_configs
set is_active = (bot_permission_status = 'configured')
where is_active is distinct from (bot_permission_status = 'configured');

alter table public.telegram_group_configs enable row level security;

drop policy if exists "Admins can view Telegram group configs" on public.telegram_group_configs;
create policy "Admins can view Telegram group configs"
on public.telegram_group_configs
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists "Brands can view own Telegram group configs" on public.telegram_group_configs;
create policy "Brands can view own Telegram group configs"
on public.telegram_group_configs
for select
using (
  exists (
    select 1 from public.brand_profiles
    where brand_profiles.id = telegram_group_configs.brand_profile_id
      and brand_profiles.owner_id = auth.uid()
  )
);

alter table public.campaigns
  add column if not exists additional_requirements jsonb not null default '{}'::jsonb;
