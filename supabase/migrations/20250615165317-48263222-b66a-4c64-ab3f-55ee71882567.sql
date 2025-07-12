
-- Add a policy to allow users to insert their own profile data
CREATE POLICY "Allow users to insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_auth_id);

-- Add a unique constraint to user_auth_id to prevent duplicate profiles for the same user
ALTER TABLE public.users
ADD CONSTRAINT users_user_auth_id_key UNIQUE (user_auth_id);
