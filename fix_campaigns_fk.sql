-- Fix the incorrect foreign key constraint on the campaigns table

-- 1. Drop the existing foreign key constraint that points to the wrong table (user_profiles)
ALTER TABLE campaigns
  DROP CONSTRAINT IF EXISTS campaigns_owner_id_fkey;

-- 2. Add the correct foreign key constraint pointing to Supabase's auth.users table
ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
