
-- Step 1: Add a column to link users in your public table to Supabase's auth users.
-- This allows us to securely check a user's role.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_user_auth_id_idx ON public.users (user_auth_id);

-- Step 2: Create a helper function to safely get the current user's role.
-- Using 'SECURITY DEFINER' is key to preventing the recursion error.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- This function runs with elevated privileges to safely check the user's role
  -- from the 'users' table without triggering the policy loop.
  RETURN (
    SELECT role_name
    FROM public.users
    WHERE user_auth_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Step 3: Remove the old, problematic policies.
DROP POLICY IF EXISTS "Authenticated users can view dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can add dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update dentists" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete dentists" ON public.users;

-- Step 4: Add new, safer policies.
-- Policy for Admins: Allows users with the 'Super Admin' role to manage all user records.
CREATE POLICY "Super Admins can manage all users"
ON public.users
FOR ALL
TO authenticated
USING (public.get_current_user_role() = 'Super Admin')
WITH CHECK (public.get_current_user_role() = 'Super Admin');

-- Policy for Viewing: Allows any logged-in user to see the list of dentists.
CREATE POLICY "Authenticated users can view dentists"
ON public.users
FOR SELECT
TO authenticated
USING (role_name = 'Dentist');
