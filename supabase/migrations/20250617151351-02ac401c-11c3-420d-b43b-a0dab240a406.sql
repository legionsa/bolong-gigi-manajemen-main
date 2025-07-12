
-- Add phone_number column to users table for staff management
ALTER TABLE public.users 
ADD COLUMN phone_number text;
