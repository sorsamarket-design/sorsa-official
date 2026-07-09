-- Telegram group configuration registry for admin NFT raffle join tasks.
-- Rows are created/updated automatically from Telegram my_chat_member webhook updates.
create table if not exists public.telegram_group_configs (
  chat_id text primary key,
  chat_type text,
  title text,
  bot_status text,
  bot_permission_status text not null default 'unknown',
  bot_permissions jsonb not null default '{}'::jsonb,
  last_error text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
