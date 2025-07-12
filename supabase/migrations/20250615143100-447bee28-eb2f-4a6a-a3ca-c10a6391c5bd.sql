
-- File: supabase/migrations/YYYYMMDDHHMMSS_fix_users_rls.sql
-- Purpose: Consolidate and fix RLS policies for the public.users table to prevent recursion.

-- Step 1: Drop all existing policies on public.users to ensure a clean slate.
DROP POLICY IF EXISTS "Super Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can add dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete dentists" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read dentists" ON public.users;
DROP POLICY IF EXISTS "Allow user to read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.users;

-- Step 2: Drop the helper function that was part of the recursive policy.
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Step 3: Ensure RLS is enabled.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Step 4: Create a new, consolidated set of policies for the 'users' table.

-- Read Policy: Allow authenticated users to view all dentists and their own profile.
CREATE POLICY "Enable read access for dentists and own user profile"
ON public.users
FOR SELECT
TO authenticated
USING (
  (role_name = 'Dentist') OR (user_auth_id = auth.uid())
);

-- Insert Policy: Allow authenticated users to create new users with the 'Dentist' role.
CREATE POLICY "Enable insert for new dentists"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (role_name = 'Dentist');

-- Update Policy: Allow users to update their own profile, and any authenticated user to update dentists.
CREATE POLICY "Enable update for dentists and own user profile"
ON public.users
FOR UPDATE
TO authenticated
USING (
  (role_name = 'Dentist') OR (user_auth_id = auth.uid())
)
WITH CHECK (
  (role_name = 'Dentist')
);

-- Delete Policy: Allow authenticated users to delete users with the 'Dentist' role.
CREATE POLICY "Enable delete for dentists"
ON public.users
FOR DELETE
TO authenticated
USING (role_name = 'Dentist');

