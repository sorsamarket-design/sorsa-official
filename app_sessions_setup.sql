-- First-party application sessions for AtlasReach.
-- Run this in Supabase before enabling cookie-based backend auth in production.

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists app_sessions_user_id_idx
  on public.app_sessions (user_id);

create index if not exists app_sessions_expires_at_idx
  on public.app_sessions (expires_at);

alter table public.app_sessions enable row level security;

drop policy if exists "Service role manages app sessions" on public.app_sessions;
create policy "Service role manages app sessions"
  on public.app_sessions
  for all
  to service_role
  using (true)
  with check (true);

notify pgrst, 'reload schema';
