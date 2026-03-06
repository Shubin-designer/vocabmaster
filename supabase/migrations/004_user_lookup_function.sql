-- =============================================
-- Migration: User lookup function for teacher invitations
-- Purpose: Allow teachers to find students by email
-- =============================================

-- Function to find user by email (for teacher invitations)
-- Returns user profile info without exposing sensitive data
CREATE OR REPLACE FUNCTION public.find_user_by_email(email_address TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  display_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    au.email::TEXT,
    up.role,
    up.display_name
  FROM auth.users au
  JOIN public.user_profiles up ON up.id = au.id
  WHERE LOWER(au.email) = LOWER(email_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
