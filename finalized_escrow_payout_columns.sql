-- Persist off-chain base reservations and final payout audit details.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'participant_status'
      AND n.nspname = 'public'
  ) THEN
    ALTER TYPE public.participant_status ADD VALUE IF NOT EXISTS 'paid';
  END IF;
END
$$;

ALTER TABLE campaign_participants
  ADD COLUMN IF NOT EXISTS base_reward NUMERIC(20, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_tx_hash TEXT;

CREATE OR REPLACE VIEW public.campaign_stats
WITH (security_invoker = true)
AS
SELECT
  c.id AS campaign_id,
  c.budget * 0.425 AS max_base_pool,
  COALESCE(
    SUM(cp.base_reward) FILTER (
      WHERE cp.status::text IN (
        'active',
        'submitted',
        'revision',
        'approved',
        'paid'
      )
    ),
    0
  ) AS allocated_base_pool
FROM campaigns c
LEFT JOIN campaign_participants cp
  ON c.id = cp.campaign_id
GROUP BY c.id, c.budget;

NOTIFY pgrst, 'reload schema';
