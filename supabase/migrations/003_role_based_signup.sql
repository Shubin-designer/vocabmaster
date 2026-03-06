-- =============================================
-- Migration: Role-based signup
-- Purpose: Update trigger to read role from signup metadata
-- =============================================

-- Drop and recreate the trigger function to handle role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from metadata, default to 'student'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Validate role
  IF user_role NOT IN ('student', 'teacher', 'admin') THEN
    user_role := 'student';
  END IF;

  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
