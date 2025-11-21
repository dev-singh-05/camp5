-- ============================================
-- NUKE TRIGGERS & ADD DIAGNOSTICS
-- ============================================

-- 1. Aggressively drop all potential triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS log_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_signup ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;

-- 2. Drop related functions
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.log_signup_attempt() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Add a helper function to inspect triggers from the API
-- This allows us to see if any triggers remain
CREATE OR REPLACE FUNCTION public.get_auth_triggers()
RETURNS TABLE (trigger_name text)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT tgname::text FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_triggers() TO anon, authenticated, service_role;
