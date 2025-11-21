-- Add dating_accepted_matches_count column to profiles table
-- This tracks how many times a user's dating requests have been accepted
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dating_accepted_matches_count INTEGER DEFAULT 0;

-- Add an index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_dating_match_count
ON profiles(dating_accepted_matches_count);

-- Comment on the column
COMMENT ON COLUMN profiles.dating_accepted_matches_count IS
'Tracks the number of accepted dating matches for progressive feature unlocking';
