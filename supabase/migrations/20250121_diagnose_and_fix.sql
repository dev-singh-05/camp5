-- ============================================
-- DIAGNOSE AND FIX SIGNUP ISSUES
-- ============================================

-- Step 1: Remove the problematic trigger completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Check for any other triggers on auth.users that might be interfering
-- Run this query to see all triggers:
-- SELECT tgname, tgtype, tgenabled FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;

-- Step 3: Disable RLS on profiles and user_tokens to allow service_role to insert
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens DISABLE ROW LEVEL SECURITY;

-- Step 4: Ensure proper grants for service_role
GRANT ALL ON public.profiles TO service_role, postgres;
GRANT ALL ON public.user_tokens TO service_role, postgres;
GRANT ALL ON public.debug_log TO service_role, postgres;
GRANT ALL ON auth.users TO service_role, postgres;

-- Step 5: Make sure the profiles table columns allow NULL or have defaults
-- Check current structure:
-- SELECT column_name, column_default, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND table_schema = 'public';

-- Step 6: Add default values for any columns that might be causing issues
ALTER TABLE public.profiles ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN enrollment_number DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN college_email DROP NOT NULL;

-- Step 7: Log all attempts
CREATE OR REPLACE FUNCTION public.log_signup_attempt()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.debug_log (event, user_id, message, data)
  VALUES (
    'auth_user_created',
    NEW.id,
    'User created in auth.users',
    jsonb_build_object('email', NEW.email, 'created_at', NEW.created_at)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- Create a non-blocking logging trigger
CREATE TRIGGER log_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_signup_attempt();

-- Verification: Check if trigger was created
-- SELECT * FROM pg_trigger WHERE tgname = 'log_auth_user_created';
