-- ============================================
-- FIX RLS POLICIES - Allow service role to bypass RLS
-- ============================================
-- The service role should be able to insert profiles
-- during signup without being blocked by RLS

-- First, let's check current policies
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Drop all existing policies on profiles
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
  END LOOP;
END $$;

-- Drop all existing policies on user_tokens
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_tokens' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_tokens';
  END LOOP;
END $$;

-- ============================================
-- DISABLE RLS TEMPORARILY FOR TESTING
-- ============================================
-- This allows the service role to insert without restrictions
-- We'll re-enable with proper policies after confirming signup works

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANT FULL ACCESS TO SERVICE ROLE
-- ============================================
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_tokens TO service_role;
GRANT ALL ON public.debug_log TO service_role;

-- Note: We'll add back RLS policies once signup is working
-- For now, this allows us to test if RLS was the problem
