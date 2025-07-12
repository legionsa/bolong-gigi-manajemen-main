
-- Purpose: A more aggressive cleanup of RLS policies on the public.users table to fix recursion.

-- Step 1: Drop all known policies on public.users to ensure a clean slate.
DROP POLICY IF EXISTS "Enable read access for dentists and own user profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for new dentists" ON public.users;
DROP POLICY IF EXISTS "Enable update for dentists and own user profile" ON public.users;
DROP POLICY IF EXISTS "Enable delete for dentists" ON public.users;

DROP POLICY IF EXISTS "Allow read access to dentists and own profile" ON public.users;
DROP POLICY IF EXISTS "Allow inserting new dentists" ON public.users;
DROP POLICY IF EXISTS "Allow updating dentists and own profile" ON public.users;
DROP POLICY IF EXISTS "Allow deleting dentists" ON public.users;

DROP POLICY IF EXISTS "Super Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can add dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete dentists" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read dentists" ON public.users;
DROP POLICY IF EXISTS "Allow user to read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.users;

-- Step 2: Ensure RLS is enabled on the table.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Step 3: Create a new, clean set of policies for the 'users' table.

-- READ Policy: Authenticated users can view all users with the 'Dentist' role and their own user record.
CREATE POLICY "USERS: Allow read for dentists and self"
ON public.users FOR SELECT
TO authenticated
USING ( (role_name = 'Dentist') OR (user_auth_id = auth.uid()) );

-- INSERT Policy: Authenticated users can create new users, but only with the 'Dentist' role.
CREATE POLICY "USERS: Allow insert for dentists"
ON public.users FOR INSERT
TO authenticated
WITH CHECK ( role_name = 'Dentist' );

-- UPDATE Policy: Authenticated users can update 'Dentist' records or their own profile.
-- The WITH CHECK clause prevents changing the role away from 'Dentist'.
CREATE POLICY "USERS: Allow update for dentists and self"
ON public.users FOR UPDATE
TO authenticated
USING ( (role_name = 'Dentist') OR (user_auth_id = auth.uid()) )
WITH CHECK ( (role_name = 'Dentist') );

-- DELETE Policy: Authenticated users can delete users with the 'Dentist' role.
CREATE POLICY "USERS: Allow delete for dentists"
ON public.users FOR DELETE
TO authenticated
USING ( role_name = 'Dentist' );
