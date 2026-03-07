-- =============================================
-- Migration: Live Collaborative Boards
-- Purpose: Real-time whiteboard for teacher-student lessons
-- =============================================

-- =============================================
-- LESSON BOARDS
-- Stores whiteboard sessions for lessons
-- =============================================
CREATE TABLE IF NOT EXISTS lesson_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Board',
  -- tldraw document state stored as JSONB
  document JSONB DEFAULT '{}',
  -- Active session info
  is_live BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BOARD PARTICIPANTS
-- Track who can access which board
-- =============================================
CREATE TABLE IF NOT EXISTS board_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES lesson_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_lesson_boards_teacher ON lesson_boards(teacher_id);
CREATE INDEX idx_lesson_boards_live ON lesson_boards(is_live) WHERE is_live = true;
CREATE INDEX idx_board_participants_board ON board_participants(board_id);
CREATE INDEX idx_board_participants_user ON board_participants(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE lesson_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_participants ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own boards
CREATE POLICY "Teachers manage own boards" ON lesson_boards
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Participants can view boards they're part of
CREATE POLICY "Participants view boards" ON lesson_boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_participants bp
      WHERE bp.board_id = lesson_boards.id
      AND bp.user_id = (SELECT auth.uid())
    )
  );

-- Participants with editor role can update board document
CREATE POLICY "Editors update board document" ON lesson_boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM board_participants bp
      WHERE bp.board_id = lesson_boards.id
      AND bp.user_id = (SELECT auth.uid())
      AND bp.role = 'editor'
    )
  );

-- Board participants policies
CREATE POLICY "Teachers manage participants" ON board_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lesson_boards lb
      WHERE lb.id = board_participants.board_id
      AND lb.teacher_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users view own participation" ON board_participants
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- =============================================
-- FUNCTION: Start live session
-- =============================================
CREATE OR REPLACE FUNCTION start_board_session(p_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lesson_boards
  SET is_live = true,
      started_at = NOW(),
      ended_at = NULL,
      updated_at = NOW()
  WHERE id = p_board_id
    AND teacher_id = (SELECT auth.uid());

  RETURN FOUND;
END;
$$;

-- =============================================
-- FUNCTION: End live session
-- =============================================
CREATE OR REPLACE FUNCTION end_board_session(p_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lesson_boards
  SET is_live = false,
      ended_at = NOW(),
      updated_at = NOW()
  WHERE id = p_board_id
    AND teacher_id = (SELECT auth.uid());

  RETURN FOUND;
END;
$$;

-- =============================================
-- FUNCTION: Add student to board as editor
-- =============================================
CREATE OR REPLACE FUNCTION add_board_participant(
  p_board_id UUID,
  p_student_id UUID,
  p_role TEXT DEFAULT 'editor'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is the board owner
  IF NOT EXISTS (
    SELECT 1 FROM lesson_boards
    WHERE id = p_board_id AND teacher_id = (SELECT auth.uid())
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO board_participants (board_id, user_id, role)
  VALUES (p_board_id, p_student_id, p_role)
  ON CONFLICT (board_id, user_id)
  DO UPDATE SET role = p_role;

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_board_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_board_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_board_participant(UUID, UUID, TEXT) TO authenticated;
