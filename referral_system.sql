alter table creator_profiles
  add column if not exists referral_code text;

create unique index if not exists creator_profiles_referral_code_key
  on creator_profiles (lower(referral_code))
  where referral_code is not null;

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references creator_profiles(id) on delete cascade,
  referred_id uuid not null references creator_profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'qualified', 'cancelled')),
  points_awarded integer not null default 0,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_id),
  check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_id_idx on referrals (referrer_id);
create index if not exists referrals_referred_id_idx on referrals (referred_id);
create index if not exists referrals_status_idx on referrals (status);

alter table referrals enable row level security;

drop policy if exists "Creators can view referrals they are part of" on referrals;
create policy "Creators can view referrals they are part of"
  on referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "Creators can accept a referral code during signup" on referrals;
create policy "Creators can accept a referral code during signup"
  on referrals for insert
  with check (auth.uid() = referred_id and auth.uid() <> referrer_id);

drop policy if exists "Creators can view their own points log" on points_log;
create policy "Creators can view their own points log"
  on points_log for select
  using (auth.uid() = creator_id);

notify pgrst, 'reload schema';
