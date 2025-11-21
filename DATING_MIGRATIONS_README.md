# Dating Progressive Unlock Migrations

## Overview
These migrations implement a progressive unlock system for the dating feature where:
1. Users can match **twice without verification** (taste of the feature)
2. Users only need **photo + interests** for their first 2 matches
3. **Verification modal shows only after 2 accepted matches**
4. **Profile completion (50%)** is required only after 2 matches

## Migrations to Apply

### 1. Add Match Count Column
**File:** `supabase/migrations/20251121_add_dating_match_count.sql`

This adds a `dating_accepted_matches_count` column to track how many matches each user has had.

### 2. Auto-increment Match Count Trigger
**File:** `supabase/migrations/20251121_increment_dating_match_count_function.sql`

This creates a trigger that automatically increments the match count for both users when a new match is created in the `dating_matches` table.

## How to Apply

### Option 1: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of each migration file in order
4. Run each migration

### Option 3: Manual SQL Execution
Connect to your database and run:

```sql
-- Migration 1: Add column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dating_accepted_matches_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_dating_match_count
ON profiles(dating_accepted_matches_count);

COMMENT ON COLUMN profiles.dating_accepted_matches_count IS
'Tracks the number of accepted dating matches for progressive feature unlocking';

-- Migration 2: Create trigger
CREATE OR REPLACE FUNCTION increment_dating_match_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET dating_accepted_matches_count = COALESCE(dating_accepted_matches_count, 0) + 1
  WHERE id IN (NEW.user1_id, NEW.user2_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS increment_match_count_on_insert ON dating_matches;

CREATE TRIGGER increment_match_count_on_insert
AFTER INSERT ON dating_matches
FOR EACH ROW
EXECUTE FUNCTION increment_dating_match_count();

COMMENT ON FUNCTION increment_dating_match_count() IS
'Automatically increments dating_accepted_matches_count for both users when a match is created';
```

## Verification

After applying migrations, verify:

1. **Column exists:**
   ```sql
   SELECT dating_accepted_matches_count FROM profiles LIMIT 1;
   ```

2. **Trigger is active:**
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'dating_matches';
   ```

3. **Test the flow:**
   - Create a new user account
   - Enter dating section
   - Match twice (verification should not be required)
   - On third match attempt, verification modal should appear

## What Changed in the Code

### Web (src/app/dating/page.tsx)
- Added `acceptedMatchesCount` state
- Updated `checkVerificationStatus()` to fetch match count
- Modified matching logic to allow first 2 matches without verification
- Verification/pending/rejected screens only show after 2 matches

### Mobile (mobile/app/(tabs)/dating.tsx)
- Same changes as web version for consistency

### Dating Profiles Pages
- Added comments noting that basic fields (name, gender, year, branch) are auto-populated from main profile
- No additional auto-population code needed since they share the same profiles table

## Rollback

If you need to rollback these changes:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS increment_match_count_on_insert ON dating_matches;
DROP FUNCTION IF EXISTS increment_dating_match_count();

-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS dating_accepted_matches_count;
```

## Testing Checklist

- [ ] Migrations applied successfully
- [ ] New users can enter dating without verification
- [ ] Users can match twice without completing verification
- [ ] Match count increments correctly when matches are created
- [ ] Verification modal appears after 2nd match
- [ ] Profile completion check respects match count (50% only after 2 matches)
- [ ] Works on both web and mobile
- [ ] Design and existing functionality remain intact
