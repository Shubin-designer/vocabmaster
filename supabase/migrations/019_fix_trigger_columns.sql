-- Fix triggers that reference wrong column names

-- Fix notify_on_assignment: user_profiles.user_id -> id, NEW.assigned_by -> NEW.teacher_id, learning_materials -> materials
CREATE OR REPLACE FUNCTION notify_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  content_title TEXT;
  teacher_name TEXT;
BEGIN
  -- Get content title based on type
  IF NEW.content_type = 'material' THEN
    SELECT title INTO content_title FROM materials WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'test' THEN
    SELECT title INTO content_title FROM tests WHERE id = NEW.content_id;
  ELSIF NEW.content_type = 'reading_text' THEN
    SELECT title INTO content_title FROM reading_texts WHERE id = NEW.content_id;
  END IF;

  -- Get teacher name
  SELECT display_name INTO teacher_name FROM user_profiles WHERE id = NEW.teacher_id;

  -- Create notification for student
  IF NEW.student_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, related_type, related_id)
    VALUES (
      NEW.student_id,
      'assignment_new',
      'New Assignment',
      COALESCE(teacher_name, 'Teacher') || ' assigned: ' || COALESCE(content_title, NEW.content_type),
      'assignment',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix notify_on_homework_assignment: user_profiles.user_id -> id
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
  SELECT display_name INTO teacher_name FROM user_profiles WHERE id = hw_teacher_id;

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
