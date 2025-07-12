
-- Complete fix for infinite recursion - properly handle dependencies
-- First drop all dependent policies, then functions, then recreate clean policies

-- Step 1: Drop policies that depend on the functions we need to remove
DROP POLICY IF EXISTS "Allow doctors to insert their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to update their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to delete their own schedules" ON public.doctor_schedules;

-- Step 2: Drop all existing policies on users table
DROP POLICY IF EXISTS "USERS: Allow read for dentists and self" ON public.users;
DROP POLICY IF EXISTS "USERS: Allow insert for dentists" ON public.users;
DROP POLICY IF EXISTS "USERS: Allow update for dentists and self" ON public.users;
DROP POLICY IF EXISTS "USERS: Allow delete for dentists" ON public.users;
DROP POLICY IF EXISTS "Enable read access for dentists and own user profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for new dentists" ON public.users;
DROP POLICY IF EXISTS "Enable update for dentists and own user profile" ON public.users;
DROP POLICY IF EXISTS "Enable delete for dentists" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON public.users;

-- Step 3: Now we can safely drop the problematic functions
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

-- Step 4: Create simple, non-recursive policies for users table
CREATE POLICY "Allow authenticated users to read all users"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update users"
ON public.users FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete users"
ON public.users FOR DELETE
TO authenticated
USING (true);

-- Step 5: Recreate doctor_schedules policies without recursion
-- Allow all authenticated users to manage doctor schedules (simplest approach)
CREATE POLICY "Allow authenticated users to select doctor schedules"
ON public.doctor_schedules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert doctor schedules"
ON public.doctor_schedules FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update doctor schedules"
ON public.doctor_schedules FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete doctor schedules"
ON public.doctor_schedules FOR DELETE
TO authenticated
USING (true);
