-- Function to increment dating match count for both users when a match is created
-- This should be called whenever a dating request is accepted and a match is created

CREATE OR REPLACE FUNCTION increment_dating_match_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment the match count for both users involved in the match
  UPDATE profiles
  SET dating_accepted_matches_count = COALESCE(dating_accepted_matches_count, 0) + 1
  WHERE id IN (NEW.user1_id, NEW.user2_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically increment match count when a new match is created
DROP TRIGGER IF EXISTS increment_match_count_on_insert ON dating_matches;

CREATE TRIGGER increment_match_count_on_insert
AFTER INSERT ON dating_matches
FOR EACH ROW
EXECUTE FUNCTION increment_dating_match_count();

-- Add comment
COMMENT ON FUNCTION increment_dating_match_count() IS
'Automatically increments dating_accepted_matches_count for both users when a match is created';
