-- Add topic_id to grammar_rules (tests and vocabulary_sets already have it from migrations 005/008)
ALTER TABLE grammar_rules ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grammar_rules_topic ON grammar_rules(topic_id);
