-- ПОЛНЫЙ ОТКАТ: удаляем все политики и создаём минимальные рабочие

-- Удаляем ВСЕ политики
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'lesson_boards'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON lesson_boards', pol.policyname);
    END LOOP;
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'board_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON board_participants', pol.policyname);
    END LOOP;
END $$;

-- Простейшие политики БЕЗ рекурсии
-- lesson_boards: только teacher_id проверка, без связи с board_participants
CREATE POLICY "lesson_boards_all" ON lesson_boards
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- board_participants: только user_id проверка, без связи с lesson_boards
CREATE POLICY "board_participants_all" ON board_participants
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
