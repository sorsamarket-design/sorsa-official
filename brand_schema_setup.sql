-- Phase 3 Database Schema & RLS Setup

-- 1. Create the brand_profiles table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  twitter_handle TEXT,
  telegram_handle TEXT,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the campaigns table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  goal TEXT,
  campaign_type TEXT NOT NULL,
  min_sorsa_score INTEGER,
  language TEXT,
  categories TEXT[],
  overview TEXT,
  budget NUMERIC NOT NULL,
  platform_fee NUMERIC,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. If the campaigns table already existed but missed the brand_id column, add it:
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS goal TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_sorsa_score INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS categories TEXT[];
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS overview TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget NUMERIC;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS platform_fee NUMERIC;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';


-- 4. Enable RLS
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Users can create their own brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Users can update their own brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Anyone can view brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Brands can create campaigns" ON campaigns;
DROP POLICY IF EXISTS "Brands can update their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anyone can view live campaigns" ON campaigns;
DROP POLICY IF EXISTS "Brands can view their own campaigns" ON campaigns;

-- 6. Apply RLS Policies for brand_profiles
CREATE POLICY "Users can create their own brand profiles" ON brand_profiles FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own brand profiles" ON brand_profiles FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can view brand profiles" ON brand_profiles FOR SELECT USING (true);

-- 7. Apply RLS Policies for campaigns
CREATE POLICY "Brands can create campaigns" ON campaigns FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM brand_profiles WHERE id = campaigns.brand_id AND owner_id = auth.uid())
);
CREATE POLICY "Brands can update their own campaigns" ON campaigns FOR UPDATE USING (
  EXISTS (SELECT 1 FROM brand_profiles WHERE id = campaigns.brand_id AND owner_id = auth.uid())
);
CREATE POLICY "Anyone can view live campaigns" ON campaigns FOR SELECT USING (status = 'live');
CREATE POLICY "Brands can view their own campaigns" ON campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM brand_profiles WHERE id = campaigns.brand_id AND owner_id = auth.uid())
);


-- 8. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated users to upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of logos" ON storage.objects;

CREATE POLICY "Allow authenticated users to upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Allow public viewing of logos" ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');
