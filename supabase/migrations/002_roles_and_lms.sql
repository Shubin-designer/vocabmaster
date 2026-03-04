-- =============================================
-- Phase 1: User Roles & Teacher-Student Relations
-- =============================================

-- User profiles with roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  display_name TEXT,
  avatar_url TEXT,
  level TEXT DEFAULT 'A1' CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teacher-Student relationships
CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'archived')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

-- =============================================
-- Phase 2: Content Bundles & Grammar Rules
-- =============================================

-- Content bundles (pre-made sets by teachers)
CREATE TABLE IF NOT EXISTS content_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  type TEXT DEFAULT 'mixed' CHECK (type IN ('vocabulary', 'grammar', 'mixed')),
  icon TEXT DEFAULT '📚',
  icon_color TEXT DEFAULT 'gray',
  is_public BOOLEAN DEFAULT false,
  word_count INTEGER DEFAULT 0,
  rule_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle words (link words to bundles)
CREATE TABLE IF NOT EXISTS bundle_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES content_bundles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  type TEXT DEFAULT 'word',
  level TEXT,
  forms TEXT,
  meaning_en TEXT,
  meaning_ru TEXT,
  example TEXT,
  image_url TEXT,
  audio_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grammar rules
CREATE TABLE IF NOT EXISTS grammar_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES content_bundles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  examples TEXT[],
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  tags TEXT[],
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Phase 3: Tests
-- =============================================

-- Tests
CREATE TABLE IF NOT EXISTS tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES content_bundles(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES grammar_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER, -- in minutes, null = no limit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test questions
CREATE TABLE IF NOT EXISTS test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'fill_blank', 'true_false', 'matching', 'write')),
  question TEXT NOT NULL,
  options JSONB, -- for multiple choice: ["opt1", "opt2", "opt3", "opt4"]
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Phase 4: Assignments & Progress
-- =============================================

-- Assignments (teacher -> student)
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id UUID REFERENCES content_bundles(id) ON DELETE SET NULL,
  test_id UUID REFERENCES tests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'graded')),
  grade INTEGER, -- percentage
  teacher_feedback TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ
);

-- Test attempts (student results)
CREATE TABLE IF NOT EXISTS test_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  answers JSONB NOT NULL, -- { "question_id": "answer", ... }
  score INTEGER, -- percentage
  passed BOOLEAN,
  time_spent INTEGER, -- in seconds
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- Phase 5: Word Media (images for vocabulary)
-- =============================================

-- Add image_url to existing words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- User profiles: users can view all, edit own
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Teacher-Students: involved parties can view
CREATE POLICY "View own teacher-student relations" ON teacher_students
  FOR SELECT USING ((select auth.uid()) IN (teacher_id, student_id));
CREATE POLICY "Teachers can create relations" ON teacher_students
  FOR INSERT WITH CHECK ((select auth.uid()) = teacher_id);
CREATE POLICY "Involved parties can update" ON teacher_students
  FOR UPDATE USING ((select auth.uid()) IN (teacher_id, student_id));
CREATE POLICY "Teachers can delete relations" ON teacher_students
  FOR DELETE USING ((select auth.uid()) = teacher_id);

-- Content bundles: teachers manage own, students see assigned/public
CREATE POLICY "View public or own bundles" ON content_bundles
  FOR SELECT USING (
    is_public = true
    OR (select auth.uid()) = teacher_id
    OR EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.bundle_id = content_bundles.id
      AND assignments.student_id = (select auth.uid())
    )
  );
CREATE POLICY "Teachers manage own bundles" ON content_bundles
  FOR ALL USING ((select auth.uid()) = teacher_id);

-- Bundle words: same as bundles
CREATE POLICY "View bundle words" ON bundle_words
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_bundles
      WHERE content_bundles.id = bundle_words.bundle_id
      AND (
        content_bundles.is_public = true
        OR content_bundles.teacher_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM assignments
          WHERE assignments.bundle_id = content_bundles.id
          AND assignments.student_id = (select auth.uid())
        )
      )
    )
  );
CREATE POLICY "Teachers manage bundle words" ON bundle_words
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content_bundles
      WHERE content_bundles.id = bundle_words.bundle_id
      AND content_bundles.teacher_id = (select auth.uid())
    )
  );

-- Grammar rules: similar to bundles
CREATE POLICY "View grammar rules" ON grammar_rules
  FOR SELECT USING (
    teacher_id = (select auth.uid())
    OR bundle_id IN (
      SELECT id FROM content_bundles WHERE is_public = true
    )
    OR bundle_id IN (
      SELECT bundle_id FROM assignments WHERE student_id = (select auth.uid())
    )
  );
CREATE POLICY "Teachers manage own rules" ON grammar_rules
  FOR ALL USING ((select auth.uid()) = teacher_id);

-- Tests: similar pattern
CREATE POLICY "View tests" ON tests
  FOR SELECT USING (
    teacher_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM assignments WHERE assignments.test_id = tests.id AND assignments.student_id = (select auth.uid()))
  );
CREATE POLICY "Teachers manage own tests" ON tests
  FOR ALL USING ((select auth.uid()) = teacher_id);

-- Test questions: view if can view test
CREATE POLICY "View test questions" ON test_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tests
      WHERE tests.id = test_questions.test_id
      AND (
        tests.teacher_id = (select auth.uid())
        OR EXISTS (SELECT 1 FROM assignments WHERE assignments.test_id = tests.id AND assignments.student_id = (select auth.uid()))
      )
    )
  );
CREATE POLICY "Teachers manage test questions" ON test_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tests WHERE tests.id = test_questions.test_id AND tests.teacher_id = (select auth.uid()))
  );

-- Assignments: teacher and student can view their own
CREATE POLICY "View own assignments" ON assignments
  FOR SELECT USING ((select auth.uid()) IN (teacher_id, student_id));
CREATE POLICY "Teachers create assignments" ON assignments
  FOR INSERT WITH CHECK ((select auth.uid()) = teacher_id);
CREATE POLICY "Teachers and students update assignments" ON assignments
  FOR UPDATE USING ((select auth.uid()) IN (teacher_id, student_id));
CREATE POLICY "Teachers delete assignments" ON assignments
  FOR DELETE USING ((select auth.uid()) = teacher_id);

-- Test attempts: students manage own, teachers view their students'
CREATE POLICY "View own attempts" ON test_attempts
  FOR SELECT USING (
    (select auth.uid()) = student_id
    OR EXISTS (
      SELECT 1 FROM tests WHERE tests.id = test_attempts.test_id AND tests.teacher_id = (select auth.uid())
    )
  );
CREATE POLICY "Students create attempts" ON test_attempts
  FOR INSERT WITH CHECK ((select auth.uid()) = student_id);
CREATE POLICY "Students update own attempts" ON test_attempts
  FOR UPDATE USING ((select auth.uid()) = student_id);

-- =============================================
-- Helper function: create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, display_name)
  VALUES (NEW.id, 'student', COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
