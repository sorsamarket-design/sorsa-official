-- Create table for tracking campaign participation
CREATE TABLE IF NOT EXISTS campaign_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'submitted', 'revision', 'approved', 'rejected'
  proof_url TEXT,
  proof_screenshot_url TEXT,
  total_impressions INTEGER DEFAULT 0,
  calculated_reward NUMERIC(20, 2) DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, creator_id)
);

-- Create table for backend Activity Points ledger
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- e.g., 'campaign_completion', 'referral', etc.
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add activity_points to profiles/creator_profiles if not exists
-- (Assuming your main profiles table is called 'profiles' or we use 'creator_profiles')
-- If you use a unified 'profiles' table, we add it there.
ALTER TABLE IF EXISTS creator_profiles 
  ADD COLUMN IF NOT EXISTS activity_points INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_participants
CREATE POLICY "Users can view their own participation" 
  ON campaign_participants FOR SELECT 
  USING (auth.uid() = creator_id);

CREATE POLICY "Users can join campaigns" 
  ON campaign_participants FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Reload schema
NOTIFY pgrst, 'reload schema';
