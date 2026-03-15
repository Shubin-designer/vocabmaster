-- Add sort_order to homework and pdf_library tables for drag reordering

ALTER TABLE homework ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE pdf_library ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_homework_sort_order ON homework(sort_order);
CREATE INDEX IF NOT EXISTS idx_pdf_library_sort_order ON pdf_library(sort_order);
