-- User goals table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_new_words INTEGER DEFAULT 5,
  daily_review_words INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  new_words_learned INTEGER DEFAULT 0,
  words_reviewed INTEGER DEFAULT 0,
  goal_new INTEGER DEFAULT 5,
  goal_review INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS policies
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity" ON activity_log
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to upsert activity
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
  FROM user_goals WHERE user_id = p_user_id;

  -- Default goals if not set
  IF v_goal_new IS NULL THEN v_goal_new := 5; END IF;
  IF v_goal_review IS NULL THEN v_goal_review := 10; END IF;

  -- Upsert activity
  INSERT INTO activity_log (user_id, date, new_words_learned, words_reviewed, goal_new, goal_review)
  VALUES (p_user_id, CURRENT_DATE, p_new_words, p_reviewed_words, v_goal_new, v_goal_review)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    new_words_learned = activity_log.new_words_learned + p_new_words,
    words_reviewed = activity_log.words_reviewed + p_reviewed_words,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
