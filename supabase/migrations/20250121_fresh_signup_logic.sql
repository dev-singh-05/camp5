-- ============================================
-- FRESH SIGNUP LOGIC - Clean Start
-- ============================================
-- This migration drops all old signup-related functions/triggers
-- and creates a new, clean signup flow

-- Drop old function if exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- NEW FUNCTION: Create profile for new user
-- ============================================
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    id,
    full_name,
    enrollment_number,
    college_email,
    profile_completed
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'enrollment_number', ''),
    NEW.email,
    false
  );

  -- Initialize user tokens balance
  INSERT INTO public.user_tokens (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    INSERT INTO public.debug_log (event, user_id, message, data)
    VALUES (
      'profile_creation_error',
      NEW.id,
      SQLERRM,
      jsonb_build_object('email', NEW.email)
    );
    RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- ============================================
-- DROP ALL EXISTING RLS POLICIES ON PROFILES
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on profiles table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
  END LOOP;
END $$;

-- ============================================
-- DROP ALL EXISTING RLS POLICIES ON USER_TOKENS
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on user_tokens table
  FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_tokens' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_tokens';
  END LOOP;
END $$;

-- ============================================
-- RLS POLICIES FOR PROFILES
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can view all profiles (needed for ratings, clubs, dating)
CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Policy 2: Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES FOR USER_TOKENS
-- ============================================

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON public.user_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON public.user_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage tokens"
  ON public.user_tokens
  FOR ALL
  USING (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.user_tokens TO anon, authenticated;
GRANT ALL ON public.debug_log TO anon, authenticated;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the setup:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';
