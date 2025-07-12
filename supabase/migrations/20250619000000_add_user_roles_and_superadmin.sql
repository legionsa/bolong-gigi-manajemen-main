-- Add role_name column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role_name TEXT;

-- Update existing users to have a default role if not set (e.g., 'User')
-- This is optional and depends on your application logic
-- UPDATE public.users
-- SET role_name = 'User'
-- WHERE role_name IS NULL;

-- Assign 'Super Admin' role to legionsaa@gmail.com
-- First, find the user_auth_id for legionsaa@gmail.com from auth.users
-- Then, update the corresponding record in public.users
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

-- You might want to create a roles table and link it via foreign key for better role management
-- CREATE TABLE IF NOT EXISTS public.roles (
--   id SERIAL PRIMARY KEY,
--   name TEXT UNIQUE NOT NULL
-- );

-- INSERT INTO public.roles (name) VALUES ('Super Admin'), ('Admin'), ('Doctor'), ('Staff'), ('Patient')
-- ON CONFLICT (name) DO NOTHING;

-- ALTER TABLE public.users
-- ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES public.roles(id);

-- Example: Update role_id based on role_name
-- UPDATE public.users u
-- SET role_id = r.id
-- FROM public.roles r
-- WHERE u.role_name = r.name AND u.role_id IS NULL;