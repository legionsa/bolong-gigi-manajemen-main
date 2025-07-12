
-- Add avatar_url column to users table
ALTER TABLE public.users ADD COLUMN avatar_url TEXT;

-- Enable Row Level Security on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Allow authenticated users to view users" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.users;

-- Policy: Allow logged-in users to view their own user record
CREATE POLICY "Allow authenticated users to view their own user data"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = user_auth_id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = user_auth_id)
WITH CHECK (auth.uid() = user_auth_id);
