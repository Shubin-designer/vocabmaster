-- Fix homework RLS policies
-- The original policy was too complex and caused 500 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage own homework" ON homework;
DROP POLICY IF EXISTS "Students can view assigned homework" ON homework;

-- Recreate simpler policies
CREATE POLICY "Teachers can manage own homework"
  ON homework FOR ALL
  USING (auth.uid() = teacher_id);

-- Simpler student policy - just check if they're a student of the teacher
CREATE POLICY "Students can view teacher homework"
  ON homework FOR SELECT
  USING (
    is_published = TRUE
    AND EXISTS (
      SELECT 1 FROM teacher_students ts
      WHERE ts.student_id = auth.uid()
      AND ts.teacher_id = homework.teacher_id
      AND ts.status = 'active'
    )
  );
