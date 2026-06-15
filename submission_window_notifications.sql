alter table campaign_participants
  add column if not exists submission_window_notified_at timestamptz;

create index if not exists campaign_participants_submission_window_notified_idx
  on campaign_participants (submission_window_notified_at)
  where submission_window_notified_at is null;
