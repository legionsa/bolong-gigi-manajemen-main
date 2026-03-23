-- Complete fix: Ensure user_auth_id exists, then add role_name and assign Super Admin

-- Step 1: Add user_auth_id column if it doesn't exist
-- This is a common column linking public.users to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'user_auth_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN user_auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS users_user_auth_id_idx ON public.users (user_auth_id);
  END IF;
END $$;

-- Step 2: Add role_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'role_name'
  ) THEN
    ALTER TABLE public.users ADD COLUMN role_name TEXT;
  END IF;
END $$;

-- Step 3: Create get_current_user_role function if it doesn't exist
-- This helps avoid recursion issues in RLS policies
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role_name
    FROM public.users
    WHERE user_auth_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Step 4: Assign 'Super Admin' role to legionsaa@gmail.com
DO $$
DECLARE
  target_user_auth_id UUID;
BEGIN
  SELECT id INTO target_user_auth_id FROM auth.users WHERE email = 'legionsaa@gmail.com';

  IF target_user_auth_id IS NOT NULL THEN
    UPDATE public.users
    SET role_name = 'Super Admin'
    WHERE user_auth_id = target_user_auth_id;
    
    -- If no record exists with this user_auth_id, try to update by email or insert
    IF NOT FOUND THEN
      -- Check if there's a record with matching email
      UPDATE public.users
      SET role_name = 'Super Admin'
      WHERE email = 'legionsaa@gmail.com';
      
      RAISE NOTICE 'User legionsaa@gmail.com updated to Super Admin (by email match).';
    ELSE
      RAISE NOTICE 'User legionsaa@gmail.com updated to Super Admin.';
    END IF;
  ELSE
    RAISE NOTICE 'User legionsaa@gmail.com not found in auth.users.';
  END IF;
END $$;

-- Step 5: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create helpful policies for role-based access
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record"
ON public.users FOR SELECT
TO authenticated
USING (user_auth_id = auth.uid() OR role_name IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
ON public.users FOR ALL
TO authenticated
USING (role_name IN ('Super Admin', 'Admin'));

DROP POLICY IF EXISTS "Dentists can view dentists" ON public.users;
CREATE POLICY "Dentists can view dentists"
ON public.users FOR SELECT
TO authenticated
USING (role_name = 'Dentist' OR user_auth_id = auth.uid());
