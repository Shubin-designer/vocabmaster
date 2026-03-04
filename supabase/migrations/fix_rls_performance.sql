-- Fix RLS policies performance by using (select auth.uid()) instead of auth.uid()
-- This ensures the function is called once per query, not for each row

-- Collections (has user_id)
DROP POLICY IF EXISTS "Users can view own collections" ON collections;
DROP POLICY IF EXISTS "Users can insert own collections" ON collections;
DROP POLICY IF EXISTS "Users can update own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON collections;

CREATE POLICY "Users can view own collections" ON collections
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own collections" ON collections
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own collections" ON collections
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own collections" ON collections
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Sections (linked through collections.user_id)
DROP POLICY IF EXISTS "Users can view own sections" ON sections;
DROP POLICY IF EXISTS "Users can insert own sections" ON sections;
DROP POLICY IF EXISTS "Users can update own sections" ON sections;
DROP POLICY IF EXISTS "Users can delete own sections" ON sections;

CREATE POLICY "Users can view own sections" ON sections
  FOR SELECT USING (
    collection_id IN (SELECT id FROM collections WHERE user_id = (select auth.uid()))
  );
CREATE POLICY "Users can insert own sections" ON sections
  FOR INSERT WITH CHECK (
    collection_id IN (SELECT id FROM collections WHERE user_id = (select auth.uid()))
  );
CREATE POLICY "Users can update own sections" ON sections
  FOR UPDATE USING (
    collection_id IN (SELECT id FROM collections WHERE user_id = (select auth.uid()))
  );
CREATE POLICY "Users can delete own sections" ON sections
  FOR DELETE USING (
    collection_id IN (SELECT id FROM collections WHERE user_id = (select auth.uid()))
  );

-- Words (has user_id)
DROP POLICY IF EXISTS "Users can view own words" ON words;
DROP POLICY IF EXISTS "Users can insert own words" ON words;
DROP POLICY IF EXISTS "Users can update own words" ON words;
DROP POLICY IF EXISTS "Users can delete own words" ON words;

CREATE POLICY "Users can view own words" ON words
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own words" ON words
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own words" ON words
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own words" ON words
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Song folders (has user_id)
DROP POLICY IF EXISTS "Users can view own song folders" ON song_folders;
DROP POLICY IF EXISTS "Users can insert own song folders" ON song_folders;
DROP POLICY IF EXISTS "Users can update own song folders" ON song_folders;
DROP POLICY IF EXISTS "Users can delete own song folders" ON song_folders;

CREATE POLICY "Users can view own song folders" ON song_folders
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own song folders" ON song_folders
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own song folders" ON song_folders
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own song folders" ON song_folders
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Songs (has user_id)
DROP POLICY IF EXISTS "Users can view own songs" ON songs;
DROP POLICY IF EXISTS "Users can insert own songs" ON songs;
DROP POLICY IF EXISTS "Users can update own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;

CREATE POLICY "Users can view own songs" ON songs
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own songs" ON songs
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own songs" ON songs
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own songs" ON songs
  FOR DELETE USING ((select auth.uid()) = user_id);

-- User goals (has user_id)
DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON user_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON user_goals;

CREATE POLICY "Users can view own goals" ON user_goals
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own goals" ON user_goals
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own goals" ON user_goals
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Activity log (has user_id)
DROP POLICY IF EXISTS "Users can view own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity" ON activity_log;
DROP POLICY IF EXISTS "Users can update own activity" ON activity_log;

CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own activity" ON activity_log
  FOR UPDATE USING ((select auth.uid()) = user_id);
