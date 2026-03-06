-- Homework System
-- Phase 10: Homework assignments with submissions and grading

-- Homework assignments created by teachers
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score INTEGER DEFAULT 100,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT TRUE,
  allow_late_submission BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Homework assigned to specific students (NULL = all students)
CREATE TABLE IF NOT EXISTS homework_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means all students
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(homework_id, student_id)
);

-- Student submissions
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT, -- Text submission
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'submitted', -- 'draft', 'submitted', 'graded', 'returned'
  UNIQUE(homework_id, student_id)
);

-- Teacher feedback/grading
CREATE TABLE IF NOT EXISTS homework_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES homework_submissions(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id)
);

-- Indexes
CREATE INDEX idx_homework_teacher ON homework(teacher_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);
CREATE INDEX idx_homework_assignments_student ON homework_assignments(student_id);
CREATE INDEX idx_homework_submissions_student ON homework_submissions(student_id);
CREATE INDEX idx_homework_submissions_homework ON homework_submissions(homework_id);

-- RLS
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_feedback ENABLE ROW LEVEL SECURITY;

-- Homework policies
CREATE POLICY "Teachers can manage own homework"
  ON homework FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view assigned homework"
  ON homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homework_assignments ha
      WHERE ha.homework_id = homework.id
      AND (ha.student_id = auth.uid() OR ha.student_id IS NULL)
    )
    OR
    EXISTS (
      SELECT 1 FROM teacher_students ts
      WHERE ts.student_id = auth.uid()
      AND ts.teacher_id = homework.teacher_id
      AND ts.status = 'active'
    )
  );

-- Homework assignments policies
CREATE POLICY "Teachers can manage homework assignments"
  ON homework_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM homework h WHERE h.id = homework_assignments.homework_id AND h.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own assignments"
  ON homework_assignments FOR SELECT
  USING (student_id = auth.uid() OR student_id IS NULL);

-- Submissions policies
CREATE POLICY "Students can manage own submissions"
  ON homework_submissions FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view submissions for their homework"
  ON homework_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homework h WHERE h.id = homework_submissions.homework_id AND h.teacher_id = auth.uid()
    )
  );

-- Feedback policies
CREATE POLICY "Teachers can manage feedback"
  ON homework_feedback FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view own feedback"
  ON homework_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM homework_submissions hs
      WHERE hs.id = homework_feedback.submission_id AND hs.student_id = auth.uid()
    )
  );

-- Function to get student's homework
CREATE OR REPLACE FUNCTION get_student_homework(p_student_id UUID)
RETURNS TABLE (
  homework_id UUID,
  title TEXT,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  max_score INTEGER,
  is_late BOOLEAN,
  submission_status TEXT,
  score INTEGER,
  feedback TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id as homework_id,
    h.title,
    h.description,
    h.instructions,
    h.due_date,
    h.max_score,
    (NOW() > h.due_date) as is_late,
    COALESCE(hs.status, 'pending') as submission_status,
    hf.score,
    hf.feedback
  FROM homework h
  LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = p_student_id
  LEFT JOIN homework_feedback hf ON hf.submission_id = hs.id
  WHERE h.is_published = TRUE
  AND (
    EXISTS (
      SELECT 1 FROM homework_assignments ha
      WHERE ha.homework_id = h.id AND (ha.student_id = p_student_id OR ha.student_id IS NULL)
    )
    OR
    EXISTS (
      SELECT 1 FROM teacher_students ts
      WHERE ts.student_id = p_student_id AND ts.teacher_id = h.teacher_id AND ts.status = 'active'
    )
  )
  ORDER BY h.due_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify student when homework is assigned
CREATE OR REPLACE FUNCTION notify_on_homework_assignment()
RETURNS TRIGGER AS $$
DECLARE
  hw_title TEXT;
  teacher_name TEXT;
  hw_teacher_id UUID;
BEGIN
  -- Get homework info
  SELECT title, teacher_id INTO hw_title, hw_teacher_id FROM homework WHERE id = NEW.homework_id;

  -- Get teacher name
  SELECT display_name INTO teacher_name FROM user_profiles WHERE user_id = hw_teacher_id;

  -- Create notification for student (if specific student)
  IF NEW.student_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
    VALUES (
      NEW.student_id,
      'assignment_new',
      'New Homework',
      COALESCE(teacher_name, 'Teacher') || ' assigned: ' || COALESCE(hw_title, 'Homework'),
      'homework',
      NEW.homework_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_homework_assignment ON homework_assignments;
CREATE TRIGGER trigger_notify_homework_assignment
  AFTER INSERT ON homework_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_homework_assignment();

-- Notify student when homework is graded
CREATE OR REPLACE FUNCTION notify_on_homework_graded()
RETURNS TRIGGER AS $$
DECLARE
  hw_title TEXT;
  student_id_val UUID;
BEGIN
  -- Get homework title and student
  SELECT h.title, hs.student_id
  INTO hw_title, student_id_val
  FROM homework_submissions hs
  JOIN homework h ON h.id = hs.homework_id
  WHERE hs.id = NEW.submission_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
  VALUES (
    student_id_val,
    'homework_graded',
    'Homework Graded',
    'Your homework "' || COALESCE(hw_title, 'Homework') || '" has been graded: ' || NEW.score || ' points',
    'homework_feedback',
    NEW.id
  );

  -- Update submission status
  UPDATE homework_submissions SET status = 'graded' WHERE id = NEW.submission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_homework_graded ON homework_feedback;
CREATE TRIGGER trigger_notify_homework_graded
  AFTER INSERT ON homework_feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_homework_graded();
