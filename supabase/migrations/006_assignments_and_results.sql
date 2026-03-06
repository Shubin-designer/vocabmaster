-- =============================================
-- Migration: Assignments and Test Results
-- Purpose: Track content assigned to students and their test performance
-- =============================================

-- =============================================
-- CONTENT ASSIGNMENTS
-- Teachers assign materials/tests to students
-- =============================================
CREATE TABLE IF NOT EXISTS content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means all students
  content_type TEXT NOT NULL CHECK (content_type IN ('material', 'test', 'reading_text')),
  content_id UUID NOT NULL, -- References materials.id, tests.id, or reading_texts.id
  due_date TIMESTAMPTZ,
  notes TEXT, -- Teacher's notes for the assignment
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON content_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON content_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_content ON content_assignments(content_type, content_id);

-- =============================================
-- TEST RESULTS
-- Track student test attempts and scores
-- =============================================
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES content_assignments(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0, -- Number of correct answers
  total_questions INTEGER NOT NULL DEFAULT 0,
  percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_questions > 0 THEN (score::NUMERIC / total_questions * 100) ELSE 0 END
  ) STORED,
  time_spent_seconds INTEGER, -- How long the test took
  answers JSONB, -- {question_id: {answer: "...", is_correct: bool}}
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_test_results_student ON test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test ON test_results(test_id);

-- =============================================
-- MATERIAL PROGRESS
-- Track which materials student has viewed
-- =============================================
CREATE TABLE IF NOT EXISTS material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT, -- Student's personal notes
  UNIQUE(material_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_material_progress_student ON material_progress(student_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE content_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;

-- Content assignments policies
-- Teachers can manage assignments they created
CREATE POLICY "Teachers manage own assignments" ON content_assignments
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Students can view assignments for them (or for all students = student_id IS NULL)
CREATE POLICY "Students view their assignments" ON content_assignments
  FOR SELECT USING (
    (SELECT auth.uid()) = student_id
    OR (
      student_id IS NULL
      AND EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = content_assignments.teacher_id
        AND ts.student_id = (SELECT auth.uid())
        AND ts.status = 'active'
      )
    )
  );

-- Test results policies
-- Students can manage their own results
CREATE POLICY "Students manage own test results" ON test_results
  FOR ALL USING ((SELECT auth.uid()) = student_id);

-- Teachers can view results of their students
CREATE POLICY "Teachers view student results" ON test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students ts
      WHERE ts.student_id = test_results.student_id
      AND ts.teacher_id = (SELECT auth.uid())
    )
  );

-- Material progress policies
-- Students manage their own progress
CREATE POLICY "Students manage own material progress" ON material_progress
  FOR ALL USING ((SELECT auth.uid()) = student_id);

-- Teachers can view student progress
CREATE POLICY "Teachers view student material progress" ON material_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teacher_students ts
      WHERE ts.student_id = material_progress.student_id
      AND ts.teacher_id = (SELECT auth.uid())
    )
  );

-- =============================================
-- FUNCTION: Get student's assigned content
-- =============================================
CREATE OR REPLACE FUNCTION get_student_assignments(p_student_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  content_type TEXT,
  content_id UUID,
  teacher_id UUID,
  due_date TIMESTAMPTZ,
  notes TEXT,
  is_required BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    ca.id as assignment_id,
    ca.content_type,
    ca.content_id,
    ca.teacher_id,
    ca.due_date,
    ca.notes,
    ca.is_required,
    ca.created_at
  FROM content_assignments ca
  WHERE ca.student_id = p_student_id
     OR (ca.student_id IS NULL AND EXISTS (
       SELECT 1 FROM teacher_students ts
       WHERE ts.teacher_id = ca.teacher_id
       AND ts.student_id = p_student_id
       AND ts.status = 'active'
     ))
  ORDER BY ca.created_at DESC;
$$;
