-- Fix RLS policies to allow anon users to create their profile during signup
-- This is needed because during signup, the user is not yet authenticated
-- until they verify their email, but the upsert operation requires both INSERT and UPDATE

-- Drop the existing insert and update policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Allow both authenticated AND anon users to insert their own profile
-- anon users can only insert if the ID matches the newly created auth user
CREATE POLICY "Users can insert their own profile"
ON profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (auth.uid() = id);

-- Allow both authenticated AND anon users to update their own profile
-- This is needed for the upsert operation during signup
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated, anon
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
