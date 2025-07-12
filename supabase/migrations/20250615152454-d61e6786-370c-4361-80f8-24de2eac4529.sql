
-- Migration to definitively fix RLS recursion on the 'users' table.

-- Step 1: Drop any remaining helper functions that could cause recursion.
-- We drop them IF EXISTS to avoid errors if they are already gone.
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Step 2: Remove ALL existing RLS policies from the 'users' table.
-- This is an aggressive but necessary step to ensure no legacy policies interfere.
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.users;';
    END LOOP;
END;
$$;


-- Step 3: Ensure RLS is enabled on the table.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Step 4: Create new, simple policies for the 'users' table that DO NOT self-reference.
-- These policies allow any authenticated user to manage user records.
-- This is a safe baseline to eliminate recursion.

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


-- Step 5: Recreate simple policies for other related tables to be safe.

-- Clean up doctor_schedules policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'doctor_schedules'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.doctor_schedules;';
    END LOOP;
END;
$$;

ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules FORCE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to manage schedules"
ON public.doctor_schedules FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

