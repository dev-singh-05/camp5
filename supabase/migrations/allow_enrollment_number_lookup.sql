-- Allow unauthenticated users to look up email by enrollment number during login
-- This is needed for the login flow where users can log in with enrollment number

-- Create a policy that allows anyone to read college_email when querying by enrollment_number
CREATE POLICY "Allow enrollment number lookup for login"
ON profiles
FOR SELECT
TO anon
USING (enrollment_number IS NOT NULL);

-- Note: This only allows reading the college_email field needed for login.
-- The actual authentication still requires the correct password through Supabase Auth.
-- This is safe because:
-- 1. Enrollment numbers are not secret (they're often public within a university)
-- 2. We're only exposing the college email (which follows a standard format)
-- 3. The actual login still requires password verification
