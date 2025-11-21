-- ============================================
-- REMOVE TRIGGER - Let API handle profile creation
-- ============================================
-- The trigger was causing "Database error creating new user"
-- because it runs during auth.users insert and any error
-- blocks the entire signup process.
--
-- Solution: Remove trigger and let the API create profiles
-- after user creation succeeds. This gives better error
-- handling and doesn't block signup.

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

-- That's it! The API will now handle profile creation directly.
