-- Fix function search_path security issue
-- Set search_path to empty to prevent search_path injection attacks

CREATE OR REPLACE FUNCTION upsert_activity(
  p_user_id UUID,
  p_new_words INTEGER DEFAULT 0,
  p_reviewed_words INTEGER DEFAULT 0
) RETURNS void AS $$
DECLARE
  v_goal_new INTEGER;
  v_goal_review INTEGER;
BEGIN
  -- Get user goals
  SELECT COALESCE(daily_new_words, 5), COALESCE(daily_review_words, 10)
  INTO v_goal_new, v_goal_review
  FROM public.user_goals WHERE user_id = p_user_id;

  -- Default goals if not set
  IF v_goal_new IS NULL THEN v_goal_new := 5; END IF;
  IF v_goal_review IS NULL THEN v_goal_review := 10; END IF;

  -- Upsert activity
  INSERT INTO public.activity_log (user_id, date, new_words_learned, words_reviewed, goal_new, goal_review)
  VALUES (p_user_id, CURRENT_DATE, p_new_words, p_reviewed_words, v_goal_new, v_goal_review)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    new_words_learned = public.activity_log.new_words_learned + p_new_words,
    words_reviewed = public.activity_log.words_reviewed + p_reviewed_words,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
