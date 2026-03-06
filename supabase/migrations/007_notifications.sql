-- Notifications system
-- Phase 6: Notifications for assignments and completions

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'assignment_new', 'test_completed', 'material_completed'
  title TEXT NOT NULL,
  message TEXT,
  related_type TEXT, -- 'assignment', 'test_result', 'material_progress'
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role or triggers)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- Function to create notification when content is assigned
CREATE OR REPLACE FUNCTION notify_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  content_title TEXT;
  teacher_name TEXT;
BEGIN
  -- Get content title based on type
  IF NEW.content_type = 'material' THEN
    SELECT title INTO content_title FROM learning_materials WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'test' THEN
    SELECT title INTO content_title FROM tests WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'reading_text' THEN
    SELECT title INTO content_title FROM reading_texts WHERE id = NEW.content_id;
  END IF;

  -- Get teacher name
  SELECT display_name INTO teacher_name FROM user_profiles WHERE user_id = NEW.assigned_by;

  -- Create notification for student
  INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
  VALUES (
    NEW.student_id,
    'assignment_new',
    'New Assignment',
    COALESCE(teacher_name, 'Teacher') || ' assigned: ' || COALESCE(content_title, NEW.content_type),
    'assignment',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new assignments
DROP TRIGGER IF EXISTS trigger_notify_on_assignment ON content_assignments;
CREATE TRIGGER trigger_notify_on_assignment
  AFTER INSERT ON content_assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_assignment();

-- Function to notify teacher when student completes a test
CREATE OR REPLACE FUNCTION notify_on_test_completion()
RETURNS TRIGGER AS $$
DECLARE
  test_title TEXT;
  student_name TEXT;
  teacher_id UUID;
  assigned_by_teacher UUID;
BEGIN
  -- Get test info
  SELECT t.title, t.created_by
  INTO test_title, teacher_id
  FROM tests t
  WHERE t.id = NEW.test_id;

  -- Check if there's an assignment and get that teacher
  SELECT ca.assigned_by
  INTO assigned_by_teacher
  FROM content_assignments ca
  WHERE ca.content_id = NEW.test_id AND ca.student_id = NEW.student_id
  LIMIT 1;

  -- Use assignment's teacher if available, otherwise test creator
  IF assigned_by_teacher IS NOT NULL THEN
    teacher_id := assigned_by_teacher;
  END IF;

  -- Get student name
  SELECT display_name INTO student_name FROM user_profiles WHERE user_id = NEW.student_id;

  -- Create notification for teacher
  IF teacher_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
    VALUES (
      teacher_id,
      'test_completed',
      'Test Completed',
      COALESCE(student_name, 'Student') || ' completed "' || COALESCE(test_title, 'Test') || '" - Score: ' || NEW.score || '%',
      'test_result',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for test completions
DROP TRIGGER IF EXISTS trigger_notify_on_test_completion ON test_results;
CREATE TRIGGER trigger_notify_on_test_completion
  AFTER INSERT ON test_results
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_test_completion();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = auth.uid() AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
