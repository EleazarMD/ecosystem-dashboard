-- Learning Platform Phase 4: Parent Assignments
-- Run this in PostgreSQL to enable parent-assigned practice.

-- ============================================================
-- Learning Assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL,
    parent_user_id TEXT NOT NULL,

    skill_code TEXT NOT NULL,
    title TEXT,
    notes TEXT,

    status TEXT NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'completed', 'archived', 'cancelled')),

    due_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE learning_assignments
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS child_id UUID,
    ADD COLUMN IF NOT EXISTS parent_user_id TEXT,
    ADD COLUMN IF NOT EXISTS skill_code TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'assigned',
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_learning_assignments_child_status
    ON learning_assignments(child_id, status);

CREATE INDEX IF NOT EXISTS idx_learning_assignments_parent
    ON learning_assignments(parent_user_id);

CREATE INDEX IF NOT EXISTS idx_learning_assignments_due_date
    ON learning_assignments(due_date);

-- Keep updated_at fresh on row updates
CREATE OR REPLACE FUNCTION touch_learning_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learning_assignments_touch_updated_at ON learning_assignments;
CREATE TRIGGER learning_assignments_touch_updated_at
    BEFORE UPDATE ON learning_assignments
    FOR EACH ROW
    EXECUTE FUNCTION touch_learning_assignments_updated_at();

-- ============================================================
-- Extend content catalog for writing/analytical (Phase 3)
-- ============================================================

ALTER TABLE learning_content_items
    DROP CONSTRAINT IF EXISTS learning_content_items_subject_check;
ALTER TABLE learning_content_items
    ADD CONSTRAINT learning_content_items_subject_check
    CHECK (subject IN ('math', 'reading', 'writing', 'analytical'));

ALTER TABLE learning_content_items
    DROP CONSTRAINT IF EXISTS learning_content_items_content_type_check;
ALTER TABLE learning_content_items
    ADD CONSTRAINT learning_content_items_content_type_check
    CHECK (content_type IN ('problem', 'question', 'writing', 'reasoning'));

-- Make answer_key nullable for rubric-evaluated items (writing/reasoning)
ALTER TABLE learning_content_items
    ALTER COLUMN answer_key DROP NOT NULL;

-- Add rubric criteria and expected reasoning columns
ALTER TABLE learning_content_items
    ADD COLUMN IF NOT EXISTS rubric_criteria JSONB,
    ADD COLUMN IF NOT EXISTS expected_reasoning JSONB;
