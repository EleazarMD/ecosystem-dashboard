-- Learning Platform Persistence Schema (Phase 1 / M4)
-- Run this in PostgreSQL to persist learning catalog, attempts, and sessions.

-- ============================================================
-- Learning Content Catalog
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_content_items (
    id TEXT PRIMARY KEY,
    version INTEGER NOT NULL DEFAULT 1,

    subject TEXT NOT NULL CHECK (subject IN ('math', 'reading', 'writing', 'analytical', 'science')),
    skill_code TEXT NOT NULL,
    analytical_tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    content_type TEXT NOT NULL CHECK (content_type IN ('problem', 'question')),
    age_band TEXT NOT NULL CHECK (age_band IN ('early', 'middle', 'tween')),
    min_grade TEXT NOT NULL,
    max_grade TEXT NOT NULL,
    difficulty INTEGER NOT NULL DEFAULT 1,

    prompt TEXT NOT NULL,
    answer_key JSONB NOT NULL,
    hint_set JSONB NOT NULL DEFAULT '[]'::jsonb,

    provenance TEXT NOT NULL CHECK (provenance IN ('authored', 'ai_generated')),
    review_status TEXT NOT NULL CHECK (review_status IN ('draft', 'approved', 'retired')),
    safety_status TEXT NOT NULL CHECK (safety_status IN ('pending', 'passed', 'failed')),
    low_stakes_only BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE learning_content_items
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS skill_code TEXT,
    ADD COLUMN IF NOT EXISTS analytical_tags JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS content_type TEXT,
    ADD COLUMN IF NOT EXISTS age_band TEXT,
    ADD COLUMN IF NOT EXISTS min_grade TEXT,
    ADD COLUMN IF NOT EXISTS max_grade TEXT,
    ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS prompt TEXT,
    ADD COLUMN IF NOT EXISTS answer_key JSONB,
    ADD COLUMN IF NOT EXISTS hint_set JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS provenance TEXT,
    ADD COLUMN IF NOT EXISTS review_status TEXT,
    ADD COLUMN IF NOT EXISTS safety_status TEXT,
    ADD COLUMN IF NOT EXISTS low_stakes_only BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_learning_content_skill_code
    ON learning_content_items(skill_code);

CREATE INDEX IF NOT EXISTS idx_learning_content_age_band
    ON learning_content_items(age_band);

CREATE INDEX IF NOT EXISTS idx_learning_content_review_safety
    ON learning_content_items(review_status, safety_status);

-- ============================================================
-- Learning Attempts
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_attempts (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL,
    content_item_id TEXT NOT NULL REFERENCES learning_content_items(id) ON DELETE RESTRICT,
    skill_code TEXT NOT NULL,

    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_response TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    score DOUBLE PRECISION NOT NULL DEFAULT 0,
    feedback TEXT,

    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE learning_attempts
    ADD COLUMN IF NOT EXISTS child_id UUID,
    ADD COLUMN IF NOT EXISTS content_item_id TEXT,
    ADD COLUMN IF NOT EXISTS skill_code TEXT,
    ADD COLUMN IF NOT EXISTS response_payload JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS normalized_response TEXT,
    ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION DEFAULT 0,
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS attempted_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_learning_attempts_child_attempted_at
    ON learning_attempts(child_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_skill_code
    ON learning_attempts(skill_code);

CREATE INDEX IF NOT EXISTS idx_learning_attempts_content_item
    ON learning_attempts(content_item_id);

-- ============================================================
-- Learning Sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_sessions (
    id UUID PRIMARY KEY,
    child_id UUID NOT NULL,
    owner_id TEXT,

    mode TEXT NOT NULL DEFAULT 'guided',
    status TEXT NOT NULL DEFAULT 'started'
        CHECK (status IN ('started', 'in_progress', 'completed', 'abandoned')),

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,

    plan_payload JSONB,
    activities_payload JSONB,
    outcomes_payload JSONB,
    metadata JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE learning_sessions
    ADD COLUMN IF NOT EXISTS child_id UUID,
    ADD COLUMN IF NOT EXISTS owner_id TEXT,
    ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'guided',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'started',
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
    ADD COLUMN IF NOT EXISTS plan_payload JSONB,
    ADD COLUMN IF NOT EXISTS activities_payload JSONB,
    ADD COLUMN IF NOT EXISTS outcomes_payload JSONB,
    ADD COLUMN IF NOT EXISTS metadata JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_learning_sessions_child_started_at
    ON learning_sessions(child_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_sessions_status
    ON learning_sessions(status);

-- Keep updated_at fresh on row updates
CREATE OR REPLACE FUNCTION touch_learning_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learning_sessions_touch_updated_at ON learning_sessions;
CREATE TRIGGER learning_sessions_touch_updated_at
    BEFORE UPDATE ON learning_sessions
    FOR EACH ROW
    EXECUTE FUNCTION touch_learning_sessions_updated_at();
