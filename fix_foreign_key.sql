-- Fix the incorrect foreign key constraint on brand_profiles

-- 1. Drop the existing foreign key constraint that points to the wrong table (user_profiles)
ALTER TABLE brand_profiles
  DROP CONSTRAINT IF EXISTS brand_profiles_owner_id_fkey;

-- 2. Add the correct foreign key constraint pointing to Supabase's auth.users table
ALTER TABLE brand_profiles
  ADD CONSTRAINT brand_profiles_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- (Optional) If you have a 'profiles' table instead of 'user_profiles' and want to reference that:
-- ALTER TABLE brand_profiles
--   ADD CONSTRAINT brand_profiles_owner_id_fkey
--   FOREIGN KEY (owner_id)
--   REFERENCES profiles(id)
--   ON DELETE CASCADE;

-- 3. Reload schema cache just to be safe
NOTIFY pgrst, 'reload schema';
