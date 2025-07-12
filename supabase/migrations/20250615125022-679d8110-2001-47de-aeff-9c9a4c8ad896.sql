
-- Enable Row Level Security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to view users with the 'Dentist' role
CREATE POLICY "Authenticated users can view dentists"
ON public.users
FOR SELECT
TO authenticated
USING (role_name = 'Dentist');

-- Create a policy that allows authenticated users to add new users with the 'Dentist' role
CREATE POLICY "Authenticated users can add dentists"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (role_name = 'Dentist');

-- Create a policy that allows authenticated users to update users with the 'Dentist' role
CREATE POLICY "Authenticated users can update dentists"
ON public.users
FOR UPDATE
TO authenticated
USING (role_name = 'Dentist')
WITH CHECK (role_name = 'Dentist');

-- Create a policy that allows authenticated users to delete users with the 'Dentist' role
CREATE POLICY "Authenticated users can delete dentists"
ON public.users
FOR DELETE
TO authenticated
USING (role_name = 'Dentist');
