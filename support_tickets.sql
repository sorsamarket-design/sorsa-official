create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creator_profiles(id) on delete cascade,
  issue_type text not null check (issue_type in ('bug', 'payment', 'campaign', 'other')),
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_creator_id_idx on support_tickets (creator_id);
create index if not exists support_tickets_status_idx on support_tickets (status);
create index if not exists support_tickets_created_at_idx on support_tickets (created_at desc);

alter table support_tickets enable row level security;

drop policy if exists "Creators can create support tickets" on support_tickets;
create policy "Creators can create support tickets"
  on support_tickets for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can view their own support tickets" on support_tickets;
create policy "Creators can view their own support tickets"
  on support_tickets for select
  using (auth.uid() = creator_id);

drop policy if exists "Admins can manage support tickets" on support_tickets;
create policy "Admins can manage support tickets"
  on support_tickets for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

notify pgrst, 'reload schema';
