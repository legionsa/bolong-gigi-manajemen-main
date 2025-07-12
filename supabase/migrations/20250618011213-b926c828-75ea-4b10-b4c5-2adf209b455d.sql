
-- Update the user with email legionsaa@gmail.com to be Super Admin
UPDATE users 
SET role_name = 'Super Admin', role_id = 'super_admin' 
WHERE email = 'legionsaa@gmail.com';

-- If the user doesn't exist yet, we'll need to insert them when they first log in
-- The useUserProfile hook will handle profile creation automatically
