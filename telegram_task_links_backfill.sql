-- Backfill public Telegram join links into existing brand campaign requirements.
-- Requires telegram_group_configs.public_link to already contain the verified public group link.
update public.campaigns as campaigns
set additional_requirements = jsonb_set(
  campaigns.additional_requirements,
  '{telegram_tasks}',
  coalesce((
    select jsonb_agg(
      case
        when configs.public_link is not null and configs.public_link <> ''
          then task || jsonb_build_object('public_link', configs.public_link)
        else task
      end
    )
    from jsonb_array_elements(campaigns.additional_requirements->'telegram_tasks') as task
    left join public.telegram_group_configs as configs
      on configs.chat_id = task->>'chat_id'
  ), '[]'::jsonb),
  true
)
where jsonb_typeof(campaigns.additional_requirements->'telegram_tasks') = 'array';

-- Backfill public Telegram join links into existing admin NFT campaign metadata.
update public.campaigns as campaigns
set language = jsonb_set(
  campaigns.language::jsonb,
  '{telegram_tasks}',
  coalesce((
    select jsonb_agg(
      case
        when configs.public_link is not null and configs.public_link <> ''
          then task || jsonb_build_object('public_link', configs.public_link)
        else task
      end
    )
    from jsonb_array_elements(campaigns.language::jsonb->'telegram_tasks') as task
    left join public.telegram_group_configs as configs
      on configs.chat_id = task->>'chat_id'
  ), '[]'::jsonb),
  true
)::text
where campaigns.language is not null
  and campaigns.language <> ''
  and btrim(campaigns.language) like '{%'
  and jsonb_typeof(campaigns.language::jsonb->'telegram_tasks') = 'array';

notify pgrst, 'reload schema';
