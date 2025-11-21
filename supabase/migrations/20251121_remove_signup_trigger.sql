-- ============================================
-- REMOVE SIGNUP TRIGGER
-- ============================================
-- The trigger is persistently causing "Database error creating new user"
-- likely due to permission or schema issues that are hard to debug remotely.
--
-- Since we updated the API route to handle profile creation manually (and idempotently),
-- we can safely remove this trigger to unblock signup.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS log_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.log_signup_attempt();

-- Ensure debug_log exists just in case we want to use it later
CREATE TABLE IF NOT EXISTS public.debug_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  event text,
  user_id uuid,
  message text,
  data jsonb
);

GRANT ALL ON public.debug_log TO service_role, postgres, anon, authenticated;
