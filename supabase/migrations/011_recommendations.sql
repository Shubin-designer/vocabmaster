-- =============================================
-- Migration: Recommendation System for Weak Areas
-- Purpose: Analyze test results and vocabulary progress to identify weak areas
-- =============================================

-- =============================================
-- FUNCTION: Get Weak Topics
-- Returns topics where students perform below 70% threshold
-- =============================================
CREATE OR REPLACE FUNCTION get_weak_topics(
  p_student_ids UUID[],
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  test_count BIGINT,
  avg_score NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.topic_id,
    COALESCE(top.name, 'No Topic') as topic_name,
    COUNT(tr.id) as test_count,
    ROUND(AVG(tr.percentage), 1) as avg_score,
    MIN(tr.percentage) as min_score,
    MAX(tr.percentage) as max_score
  FROM test_results tr
  JOIN tests t ON t.id = tr.test_id
  LEFT JOIN topics top ON top.id = t.topic_id
  WHERE tr.student_id = ANY(p_student_ids)
    AND tr.completed_at >= p_start_date
    AND tr.status = 'completed'
  GROUP BY t.topic_id, top.name
  HAVING AVG(tr.percentage) < 70
  ORDER BY AVG(tr.percentage) ASC
  LIMIT 10;
$$;

-- =============================================
-- FUNCTION: Get Weak Question Types
-- Parses test_results.answers JSONB to find question types with high error rates
-- =============================================
CREATE OR REPLACE FUNCTION get_weak_question_types(
  p_student_ids UUID[],
  p_start_date TIMESTAMPTZ
)
RETURNS TABLE (
  question_type TEXT,
  total_questions BIGINT,
  incorrect_count BIGINT,
  error_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH answer_details AS (
    SELECT
      tq.type as question_type,
      (ans.value->>'is_correct')::boolean as is_correct
    FROM test_results tr
    CROSS JOIN LATERAL jsonb_each(tr.answers) ans
    JOIN test_questions tq ON tq.id = ans.key::uuid
    WHERE tr.student_id = ANY(p_student_ids)
      AND tr.completed_at >= p_start_date
      AND tr.status = 'completed'
      AND tr.answers IS NOT NULL
  )
  SELECT
    ad.question_type,
    COUNT(*) as total_questions,
    COUNT(*) FILTER (WHERE NOT ad.is_correct) as incorrect_count,
    ROUND(
      (COUNT(*) FILTER (WHERE NOT ad.is_correct)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      1
    ) as error_rate
  FROM answer_details ad
  GROUP BY ad.question_type
  HAVING COUNT(*) >= 3  -- Minimum sample size
  ORDER BY error_rate DESC;
END;
$$;

-- =============================================
-- FUNCTION: Get Struggling Words
-- Finds vocabulary words that students practice frequently but haven't mastered
-- =============================================
CREATE OR REPLACE FUNCTION get_struggling_words(
  p_student_ids UUID[],
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  word_id UUID,
  word TEXT,
  meaning_ru TEXT,
  level TEXT,
  practice_count INTEGER,
  student_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.id as word_id,
    w.word,
    w.meaning_ru,
    w.level,
    MAX(vap.practice_count) as practice_count,
    COUNT(DISTINCT va.student_id) as student_count
  FROM vocabulary_assignment_progress vap
  JOIN vocabulary_assignments va ON va.id = vap.assignment_id
  JOIN words w ON w.id = vap.word_id
  WHERE va.student_id = ANY(p_student_ids)
    AND vap.current_status = 'learning'
    AND vap.practice_count >= 3
  GROUP BY w.id, w.word, w.meaning_ru, w.level
  ORDER BY MAX(vap.practice_count) DESC, COUNT(DISTINCT va.student_id) DESC
  LIMIT p_limit;
$$;

-- =============================================
-- FUNCTION: Get Weak Area Recommendations (Main Function)
-- Returns comprehensive JSONB with all recommendations
-- =============================================
CREATE OR REPLACE FUNCTION get_weak_area_recommendations(
  p_teacher_id UUID,
  p_student_id UUID DEFAULT NULL,  -- NULL means all students
  p_days_back INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_ids UUID[];
  v_start_date TIMESTAMPTZ;
  v_result JSONB;
  v_weak_topics JSONB;
  v_weak_question_types JSONB;
  v_struggling_words JSONB;
BEGIN
  -- Calculate start date
  v_start_date := NOW() - (p_days_back || ' days')::INTERVAL;

  -- Get student IDs
  IF p_student_id IS NOT NULL THEN
    -- Single student
    v_student_ids := ARRAY[p_student_id];
  ELSE
    -- All students of this teacher
    SELECT ARRAY_AGG(student_id)
    INTO v_student_ids
    FROM teacher_students
    WHERE teacher_id = p_teacher_id
      AND status = 'active';
  END IF;

  -- Return empty result if no students
  IF v_student_ids IS NULL OR array_length(v_student_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'weak_topics', '[]'::jsonb,
      'weak_question_types', '[]'::jsonb,
      'struggling_words', '[]'::jsonb,
      'summary', jsonb_build_object(
        'student_count', 0,
        'period_days', p_days_back,
        'generated_at', NOW()
      )
    );
  END IF;

  -- Get weak topics
  SELECT COALESCE(jsonb_agg(row_to_json(wt)), '[]'::jsonb)
  INTO v_weak_topics
  FROM get_weak_topics(v_student_ids, v_start_date) wt;

  -- Get weak question types
  SELECT COALESCE(jsonb_agg(row_to_json(wq)), '[]'::jsonb)
  INTO v_weak_question_types
  FROM get_weak_question_types(v_student_ids, v_start_date) wq;

  -- Get struggling words
  SELECT COALESCE(jsonb_agg(row_to_json(sw)), '[]'::jsonb)
  INTO v_struggling_words
  FROM get_struggling_words(v_student_ids, 20) sw;

  -- Build result
  v_result := jsonb_build_object(
    'weak_topics', v_weak_topics,
    'weak_question_types', v_weak_question_types,
    'struggling_words', v_struggling_words,
    'summary', jsonb_build_object(
      'student_count', array_length(v_student_ids, 1),
      'period_days', p_days_back,
      'generated_at', NOW()
    )
  );

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_weak_topics(UUID[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weak_question_types(UUID[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_struggling_words(UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_weak_area_recommendations(UUID, UUID, INTEGER) TO authenticated;
