-- RLS Policies for Brand Features (Phase 3)

-- 1. Enable RLS on tables (if not already enabled)
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- 2. Policies for brand_profiles
-- Allow users to insert their own brand profiles
CREATE POLICY "Users can create their own brand profiles"
ON brand_profiles FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Allow users to update their own brand profiles
CREATE POLICY "Users can update their own brand profiles"
ON brand_profiles FOR UPDATE
USING (auth.uid() = owner_id);

-- Allow users to select their own brand profiles
CREATE POLICY "Users can view their own brand profiles"
ON brand_profiles FOR SELECT
USING (auth.uid() = owner_id);

-- Allow anyone to view brand profiles (needed for creators to see who made a campaign)
-- You can replace the SELECT policy above with this one if creators need to see profiles
CREATE POLICY "Anyone can view brand profiles"
ON brand_profiles FOR SELECT
USING (true);


-- 3. Policies for campaigns
-- Allow brands to insert campaigns linked to their profiles
CREATE POLICY "Brands can create campaigns"
ON campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM brand_profiles
    WHERE id = brand_id AND owner_id = auth.uid()
  )
);

-- Allow brands to update their own campaigns
CREATE POLICY "Brands can update their own campaigns"
ON campaigns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM brand_profiles
    WHERE id = brand_id AND owner_id = auth.uid()
  )
);

-- Allow anyone to view live campaigns
CREATE POLICY "Anyone can view live campaigns"
ON campaigns FOR SELECT
USING (status = 'live');

-- Allow brands to view all their own campaigns (including drafts/completed)
CREATE POLICY "Brands can view their own campaigns"
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM brand_profiles
    WHERE id = brand_id AND owner_id = auth.uid()
  )
);


-- 4. Storage Bucket Policies for 'brand-logos'
-- (Run these ONLY if you haven't set up the storage bucket properly yet)
-- First, ensure the bucket exists (skip if you made it manually)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos' AND 
  auth.role() = 'authenticated'
);

-- Allow anyone to view logos
CREATE POLICY "Allow public viewing of logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow users to update/delete their own logos
CREATE POLICY "Allow users to update their own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to delete their own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-logos' AND auth.role() = 'authenticated');
