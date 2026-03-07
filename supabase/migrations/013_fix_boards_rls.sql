-- Fix infinite recursion in lesson_boards RLS policies

-- Drop problematic policies
DROP POLICY IF EXISTS "Teachers manage own boards" ON lesson_boards;
DROP POLICY IF EXISTS "Participants view boards" ON lesson_boards;
DROP POLICY IF EXISTS "Editors update board document" ON lesson_boards;
DROP POLICY IF EXISTS "Teachers manage participants" ON board_participants;
DROP POLICY IF EXISTS "Users view own participation" ON board_participants;

-- Recreate lesson_boards policies without recursion
-- Teachers have full access to their own boards
CREATE POLICY "Teachers full access own boards" ON lesson_boards
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Students can view boards via a security definer function
CREATE OR REPLACE FUNCTION can_access_board(p_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM board_participants
    WHERE board_id = p_board_id
    AND user_id = (SELECT auth.uid())
  );
$$;

CREATE POLICY "Participants view boards" ON lesson_boards
  FOR SELECT USING (
    (SELECT auth.uid()) = teacher_id
    OR can_access_board(id)
  );

-- Students with editor role can update document field only
CREATE POLICY "Editors update document" ON lesson_boards
  FOR UPDATE USING (
    can_access_board(id)
  )
  WITH CHECK (
    can_access_board(id)
  );

-- Recreate board_participants policies
-- Teachers manage participants on their boards
CREATE OR REPLACE FUNCTION is_board_owner(p_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lesson_boards
    WHERE id = p_board_id
    AND teacher_id = (SELECT auth.uid())
  );
$$;

CREATE POLICY "Teachers manage participants" ON board_participants
  FOR ALL USING (is_board_owner(board_id));

-- Users can view their own participation
CREATE POLICY "View own participation" ON board_participants
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- Grant execute
GRANT EXECUTE ON FUNCTION can_access_board(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_board_owner(UUID) TO authenticated;
