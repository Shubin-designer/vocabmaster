-- =============================================
-- Migration: Learning Materials System
-- Purpose: Structure for books, topics, materials, and enhanced tests
-- =============================================

-- =============================================
-- SOURCES (Books/Brochures)
-- =============================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ru', 'both')),
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TOPICS (Prepositions, Tenses, Articles, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ru TEXT, -- Russian name
  description TEXT,
  icon TEXT DEFAULT 'book',
  icon_color TEXT DEFAULT 'blue',
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MATERIALS (Rules/Content with examples)
-- =============================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Main rule/explanation text
  examples TEXT[], -- Array of example sentences
  notes TEXT, -- Additional notes
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ru', 'both')),
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MATERIAL_SOURCES (Many-to-many: material can be from multiple sources)
-- =============================================
CREATE TABLE IF NOT EXISTS material_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  page_reference TEXT, -- e.g., "p. 45-48"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(material_id, source_id)
);

-- =============================================
-- Update TESTS table to link to materials
-- =============================================
ALTER TABLE tests ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE SET NULL;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

-- =============================================
-- Update TEST_QUESTIONS with explanation field
-- =============================================
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS explanation_correct TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS explanation_wrong TEXT;
ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS hint TEXT;

-- =============================================
-- INTERACTIVE TEXTS (for reading with word selection)
-- =============================================
CREATE TABLE IF NOT EXISTS reading_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- The full text
  translation TEXT, -- Optional translation
  vocabulary_hints JSONB, -- {word: translation} for difficult words
  level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'ru')),
  sort_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_texts ENABLE ROW LEVEL SECURITY;

-- Sources policies
CREATE POLICY "View public or own sources" ON sources
  FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = teacher_id);
CREATE POLICY "Teachers manage own sources" ON sources
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Topics policies
CREATE POLICY "View public or own topics" ON topics
  FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = teacher_id);
CREATE POLICY "Teachers manage own topics" ON topics
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Materials policies
CREATE POLICY "View public or own materials" ON materials
  FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = teacher_id);
CREATE POLICY "Teachers manage own materials" ON materials
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- Material sources policies
CREATE POLICY "View material sources" ON material_sources
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_sources.material_id
      AND (materials.is_public = true OR materials.teacher_id = (SELECT auth.uid()))
    )
  );
CREATE POLICY "Teachers manage material sources" ON material_sources
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_sources.material_id
      AND materials.teacher_id = (SELECT auth.uid())
    )
  );

-- Reading texts policies
CREATE POLICY "View public or own reading texts" ON reading_texts
  FOR SELECT USING (is_public = true OR (SELECT auth.uid()) = teacher_id);
CREATE POLICY "Teachers manage own reading texts" ON reading_texts
  FOR ALL USING ((SELECT auth.uid()) = teacher_id);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_materials_topic ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_source ON materials(source_id);
CREATE INDEX IF NOT EXISTS idx_materials_teacher ON materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_reading_texts_topic ON reading_texts(topic_id);
CREATE INDEX IF NOT EXISTS idx_reading_texts_source ON reading_texts(source_id);
CREATE INDEX IF NOT EXISTS idx_tests_material ON tests(material_id);
CREATE INDEX IF NOT EXISTS idx_tests_topic ON tests(topic_id);
