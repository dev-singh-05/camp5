-- Create debug_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.debug_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  event text,
  user_id uuid,
  message text,
  data jsonb
);

-- Grant permissions
GRANT ALL ON public.debug_log TO service_role, postgres;
GRANT ALL ON public.debug_log TO anon, authenticated;

-- Drop existing triggers to clean up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS log_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.log_signup_attempt();

-- Re-create the profile creation function
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
  )
  ON CONFLICT (id) DO NOTHING; -- Handle duplicate gracefully

  -- Initialize user tokens balance
  INSERT INTO public.user_tokens (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error safely
    BEGIN
      INSERT INTO public.debug_log (event, user_id, message, data)
      VALUES (
        'profile_creation_error',
        NEW.id,
        SQLERRM,
        jsonb_build_object('email', NEW.email)
      );
    EXCEPTION WHEN OTHERS THEN
      -- If logging fails, just ignore it to not block signup
      NULL;
    END;
    RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();
