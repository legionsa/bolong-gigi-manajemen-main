
-- Step 1: Remove the overly restrictive policy and the now-unused helper function.
DROP POLICY IF EXISTS "Super Admins can manage all users" ON public.users;
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Step 2: Re-add the simpler policies for managing dentists.
-- This allows any authenticated user to add, update, and delete records as long as the user's role is 'Dentist'.

CREATE POLICY "Authenticated users can add dentists"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (role_name = 'Dentist');

CREATE POLICY "Authenticated users can update dentists"
ON public.users
FOR UPDATE
TO authenticated
USING (role_name = 'Dentist')
WITH CHECK (role_name = 'Dentist');

CREATE POLICY "Authenticated users can delete dentists"
ON public.users
FOR DELETE
TO authenticated
USING (role_name = 'Dentist');
