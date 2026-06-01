-- Add date columns to the campaigns table to track campaign lifecycle
ALTER TABLE campaigns 
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Reload schema cache so the frontend can read the new columns
NOTIFY pgrst, 'reload schema';
