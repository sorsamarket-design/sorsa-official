-- Add missing columns to brand_profiles (if they don't exist)
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS telegram_handle TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Refresh the Supabase schema cache
NOTIFY pgrst, 'reload schema';
