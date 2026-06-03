-- Enforce: no escrow confirmation, no campaign row.
-- Apply this after the existing campaign schema migration.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS escrow_campaign_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS escrow_contract_address TEXT,
  ADD COLUMN IF NOT EXISTS escrow_tx_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS metadata_hash TEXT,
  ADD COLUMN IF NOT EXISTS brand_wallet TEXT,
  ADD COLUMN IF NOT EXISTS escrowed_budget NUMERIC,
  ADD COLUMN IF NOT EXISTS release_at TIMESTAMPTZ;

ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_live_requires_escrow_confirmation;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_live_requires_escrow_confirmation
  CHECK (
    status <> 'live'
    OR (
      escrow_campaign_id IS NOT NULL
      AND escrow_contract_address IS NOT NULL
      AND escrow_tx_hash IS NOT NULL
      AND metadata_hash IS NOT NULL
      AND brand_wallet IS NOT NULL
    )
  );

-- Browser clients must not insert campaigns directly. The trusted backend or
-- Supabase Edge Function should use the service role after verifying the
-- CampaignCreated event from the escrow contract.
DROP POLICY IF EXISTS "Brands can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Brands can insert escrow-confirmed campaigns" ON campaigns;

NOTIFY pgrst, 'reload schema';
