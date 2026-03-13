-- =============================================
-- Migration: Homework Content Attachments
-- Purpose: Allow teachers to attach materials, tests, and reading texts to homework
-- =============================================

-- Junction table linking homework to existing content
CREATE TABLE IF NOT EXISTS homework_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('material', 'test', 'reading_text')),
  content_id UUID NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, content_type, content_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_homework_content_homework ON homework_content(homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_content_type ON homework_content(content_type, content_id);

-- RLS
ALTER TABLE homework_content ENABLE ROW LEVEL SECURITY;

-- Teachers can manage content for their own homework
CREATE POLICY "Teachers manage homework content" ON homework_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM homework
      WHERE homework.id = homework_content.homework_id
      AND homework.teacher_id = (SELECT auth.uid())
    )
  );

-- Students can view content for homework assigned to them
CREATE POLICY "Students view homework content" ON homework_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM homework h
      JOIN homework_assignments ha ON ha.homework_id = h.id
      WHERE h.id = homework_content.homework_id
      AND h.is_published = true
      AND (ha.student_id = (SELECT auth.uid()) OR ha.student_id IS NULL)
    )
  );

-- =============================================
-- Student text highlights for theory materials
-- =============================================
CREATE TABLE IF NOT EXISTS student_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('material', 'reading_text')),
  content_id UUID NOT NULL,
  highlight_data JSONB NOT NULL, -- {from: number, to: number, color: string, text: string}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, content_type, content_id, id)
);

CREATE INDEX IF NOT EXISTS idx_student_highlights_student ON student_highlights(student_id);
CREATE INDEX IF NOT EXISTS idx_student_highlights_content ON student_highlights(content_type, content_id);

ALTER TABLE student_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own highlights" ON student_highlights
  FOR ALL USING ((SELECT auth.uid()) = student_id);

-- =============================================
-- Update get_student_homework to include attached content
-- =============================================
-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_student_homework(UUID);

CREATE OR REPLACE FUNCTION get_student_homework(p_student_id UUID)
RETURNS TABLE (
  homework_id UUID,
  title TEXT,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER,
  allow_late_submission BOOLEAN,
  topic_name TEXT,
  submission_status TEXT,
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  feedback TEXT,
  is_late BOOLEAN,
  content_items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id AS homework_id,
    h.title,
    h.description,
    h.instructions,
    h.due_date,
    h.max_score,
    h.allow_late_submission,
    t.name AS topic_name,
    COALESCE(hs.status, 'pending') AS submission_status,
    hs.submitted_at,
    hf.score,
    hf.feedback,
    CASE WHEN h.due_date < NOW() THEN true ELSE false END AS is_late,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', hc.id,
          'content_type', hc.content_type,
          'content_id', hc.content_id,
          'sort_order', hc.sort_order,
          'title', CASE
            WHEN hc.content_type = 'material' THEN (SELECT m.title FROM materials m WHERE m.id = hc.content_id)
            WHEN hc.content_type = 'test' THEN (SELECT tt.title FROM tests tt WHERE tt.id = hc.content_id)
            WHEN hc.content_type = 'reading_text' THEN (SELECT rt.title FROM reading_texts rt WHERE rt.id = hc.content_id)
          END
        ) ORDER BY hc.sort_order
      ) FROM homework_content hc WHERE hc.homework_id = h.id),
      '[]'::jsonb
    ) AS content_items
  FROM homework h
  LEFT JOIN topics t ON t.id = h.topic_id
  LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = p_student_id
  LEFT JOIN homework_feedback hf ON hf.submission_id = hs.id
  JOIN homework_assignments ha ON ha.homework_id = h.id
  WHERE h.is_published = true
    AND (ha.student_id = p_student_id OR ha.student_id IS NULL)
  ORDER BY h.due_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
