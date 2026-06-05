alter table creator_profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_connected_at timestamptz,
  add column if not exists telegram_connect_code text,
  add column if not exists telegram_connect_expires_at timestamptz,
  add column if not exists notify_new_campaigns boolean not null default true,
  add column if not exists notify_campaign_updates boolean not null default true,
  add column if not exists notify_payments boolean not null default true;

create unique index if not exists creator_profiles_telegram_chat_id_key
  on creator_profiles (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index if not exists creator_profiles_telegram_connect_code_key
  on creator_profiles (telegram_connect_code)
  where telegram_connect_code is not null;
