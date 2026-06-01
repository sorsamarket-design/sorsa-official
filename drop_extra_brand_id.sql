-- Fix multiple foreign keys issue on campaigns table
-- Drop the extra 'brand_id' column that was accidentally added, 
-- leaving your original 'brand_profile_id' intact.
ALTER TABLE campaigns DROP COLUMN IF EXISTS brand_id;

-- Ensure schema cache is updated
NOTIFY pgrst, 'reload schema';
