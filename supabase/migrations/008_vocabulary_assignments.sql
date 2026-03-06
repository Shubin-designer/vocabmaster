-- Vocabulary Integration with LMS
-- Phase 7: Assign vocabulary sets to students

-- Vocabulary sets created by teachers
CREATE TABLE IF NOT EXISTS vocabulary_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  level TEXT, -- A1, A2, B1, B2, C1, C2
  word_ids UUID[] DEFAULT '{}', -- Array of word IDs from vocabulary table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary assignments (teacher assigns set to student)
CREATE TABLE IF NOT EXISTS vocabulary_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id UUID NOT NULL REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  due_date TIMESTAMPTZ,
  target_status TEXT DEFAULT 'learned', -- target: 'learning' or 'learned'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(set_id, student_id)
);

-- Track student progress on assigned vocabulary
CREATE TABLE IF NOT EXISTS vocabulary_assignment_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES vocabulary_assignments(id) ON DELETE CASCADE,
  word_id UUID NOT NULL,
  current_status TEXT DEFAULT 'new', -- 'new', 'learning', 'learned'
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, word_id)
);

-- Indexes
CREATE INDEX idx_vocab_sets_teacher ON vocabulary_sets(teacher_id);
CREATE INDEX idx_vocab_assignments_student ON vocabulary_assignments(student_id);
CREATE INDEX idx_vocab_assignments_set ON vocabulary_assignments(set_id);
CREATE INDEX idx_vocab_progress_assignment ON vocabulary_assignment_progress(assignment_id);

-- RLS
ALTER TABLE vocabulary_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_assignment_progress ENABLE ROW LEVEL SECURITY;

-- Vocabulary sets policies
CREATE POLICY "Teachers can manage own vocabulary sets"
  ON vocabulary_sets FOR ALL
  USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view assigned sets"
  ON vocabulary_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_assignments va
      WHERE va.set_id = vocabulary_sets.id AND va.student_id = auth.uid()
    )
  );

-- Vocabulary assignments policies
CREATE POLICY "Teachers can manage own assignments"
  ON vocabulary_assignments FOR ALL
  USING (auth.uid() = assigned_by);

CREATE POLICY "Students can view own assignments"
  ON vocabulary_assignments FOR SELECT
  USING (auth.uid() = student_id);

-- Progress policies
CREATE POLICY "Students can manage own progress"
  ON vocabulary_assignment_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_assignments va
      WHERE va.id = vocabulary_assignment_progress.assignment_id
      AND va.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view student progress"
  ON vocabulary_assignment_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vocabulary_assignments va
      WHERE va.id = vocabulary_assignment_progress.assignment_id
      AND va.assigned_by = auth.uid()
    )
  );

-- Function to get vocabulary assignment stats for a student
CREATE OR REPLACE FUNCTION get_vocab_assignment_stats(p_student_id UUID)
RETURNS TABLE (
  total_sets BIGINT,
  total_words BIGINT,
  words_learned BIGINT,
  words_learning BIGINT,
  completion_percent INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT va.id)::BIGINT as total_sets,
    COUNT(vap.id)::BIGINT as total_words,
    COUNT(CASE WHEN vap.current_status = 'learned' THEN 1 END)::BIGINT as words_learned,
    COUNT(CASE WHEN vap.current_status = 'learning' THEN 1 END)::BIGINT as words_learning,
    CASE
      WHEN COUNT(vap.id) > 0
      THEN (COUNT(CASE WHEN vap.current_status = 'learned' THEN 1 END) * 100 / COUNT(vap.id))::INTEGER
      ELSE 0
    END as completion_percent
  FROM vocabulary_assignments va
  LEFT JOIN vocabulary_assignment_progress vap ON vap.assignment_id = va.id
  WHERE va.student_id = p_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify student when vocabulary is assigned
CREATE OR REPLACE FUNCTION notify_on_vocab_assignment()
RETURNS TRIGGER AS $$
DECLARE
  set_title TEXT;
  teacher_name TEXT;
BEGIN
  -- Get set title
  SELECT title INTO set_title FROM vocabulary_sets WHERE id = NEW.set_id;

  -- Get teacher name
  SELECT display_name INTO teacher_name FROM user_profiles WHERE user_id = NEW.assigned_by;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
  VALUES (
    NEW.student_id,
    'assignment_new',
    'New Vocabulary Set',
    COALESCE(teacher_name, 'Teacher') || ' assigned vocabulary: ' || COALESCE(set_title, 'Vocabulary Set'),
    'vocabulary_assignment',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_vocab_assignment ON vocabulary_assignments;
CREATE TRIGGER trigger_notify_vocab_assignment
  AFTER INSERT ON vocabulary_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_vocab_assignment();
