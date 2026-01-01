-- Add school-related fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level text,
ADD COLUMN IF NOT EXISTS program text,
ADD COLUMN IF NOT EXISTS college text,
ADD COLUMN IF NOT EXISTS matric_number text,
ADD COLUMN IF NOT EXISTS department text;
