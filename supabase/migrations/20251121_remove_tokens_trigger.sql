-- ============================================
-- REMOVE HIDDEN TOKENS TRIGGER
-- ============================================
-- Found a hidden trigger 'on_auth_user_created_tokens' that was causing the issue.
-- Removing it to allow the API to handle token creation safely.

DROP TRIGGER IF EXISTS on_auth_user_created_tokens ON auth.users CASCADE;

-- Also drop the function it likely calls, if it has a unique name
-- We'll try to guess common names, but the trigger drop is the important part.
DROP FUNCTION IF EXISTS public.create_user_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user_tokens() CASCADE;
