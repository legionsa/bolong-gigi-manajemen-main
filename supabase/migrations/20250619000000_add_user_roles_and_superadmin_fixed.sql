-- First, ensure user_auth_id exists (it should be added by migration 20250615125625)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_user_auth_id_idx ON public.users (user_auth_id);

-- Add role_name column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_name TEXT;

-- Assign 'Super Admin' role to legionsaa@gmail.com
DO $$
DECLARE
  target_user_auth_id UUID;
BEGIN
  SELECT id INTO target_user_auth_id FROM auth.users WHERE email = 'legionsaa@gmail.com';

  IF target_user_auth_id IS NOT NULL THEN
    UPDATE public.users
    SET role_name = 'Super Admin'
    WHERE user_auth_id = target_user_auth_id;
    RAISE NOTICE 'User legionsaa@gmail.com updated to Super Admin.';
  ELSE
    RAISE NOTICE 'User legionsaa@gmail.com not found in auth.users.';
  END IF;
END $$;
