-- ============================================================
-- Lesson Lifecycle — Multi-Agent Authoring Pipeline
-- ============================================================
-- Supports end-to-end lesson development by multiple AI agents:
--   claude-opus      → lesson design, pedagogical structure, narrative
--   gpt-5.5          → problem generation, answer keys, assessments
--   gemini-image-pro → visual assets (illustrations, diagrams)
--   nano-banana      → lightweight image generation (icons, decorations)
--   minimax-m3       → child-facing tutoring prompts, interactive elements
--   human            → parent/educator review and approval
--
-- Lifecycle: draft → spec → generating → reviewing → approved → published → archived
-- ============================================================

-- ============================================================
-- 1. Lessons — top-level lesson entity
-- ============================================================

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hierarchy: course > unit > lesson
    course_code TEXT NOT NULL DEFAULT 'default',
    unit_code TEXT,
    lesson_code TEXT NOT NULL,              -- human-readable slug, e.g. "fractions-intro"
    title TEXT NOT NULL,
    description TEXT,
    lesson_emoji TEXT DEFAULT '📚',

    -- Target audience
    subject TEXT NOT NULL CHECK (subject IN ('math', 'reading', 'writing', 'analytical', 'science', 'cross')),
    age_band TEXT NOT NULL CHECK (age_band IN ('early', 'middle', 'tween')),
    min_grade TEXT,
    max_grade TEXT,
    difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),

    -- Skill mapping
    skill_codes JSONB NOT NULL DEFAULT '[]'::jsonb,     -- ["math.fractions", "math.addition"]
    curriculum_standards JSONB DEFAULT '[]'::jsonb,      -- ["TEKS.3.3.A", "CCSS.3.NF.A.1"]

    -- Lesson structure metadata
    estimated_minutes INTEGER DEFAULT 10,
    prerequisites JSONB DEFAULT '[]'::jsonb,             -- lesson_codes that should come first

    -- Lifecycle
    lifecycle_state TEXT NOT NULL DEFAULT 'draft'
        CHECK (lifecycle_state IN ('draft', 'spec', 'generating', 'reviewing', 'approved', 'published', 'archived')),

    -- Agent orchestration
    lead_agent TEXT,                          -- which agent is driving the current phase
    assigned_agents JSONB DEFAULT '[]'::jsonb, -- ["claude-opus", "gpt-5.5", "gemini-image-pro"]

    -- Design spec (filled during 'spec' phase by claude-opus)
    design_spec JSONB,                        -- { objectives, narrative_arc, visual_style, interaction_types }

    -- Quality gates
    review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'in_review', 'approved', 'rejected', 'revision_requested')),
    safety_review_status TEXT DEFAULT 'pending'
        CHECK (safety_review_status IN ('pending', 'passed', 'failed')),

    -- Link to existing content catalog (populated when published)
    content_item_ids JSONB DEFAULT '[]'::jsonb,  -- references to learning_content_items

    -- Ownership
    created_by TEXT,                          -- parent user id or 'system'
    published_by TEXT,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(course_code, lesson_code)
);

CREATE INDEX IF NOT EXISTS idx_lessons_lifecycle
    ON lessons(lifecycle_state);
CREATE INDEX IF NOT EXISTS idx_lessons_subject_age
    ON lessons(subject, age_band);
CREATE INDEX IF NOT EXISTS idx_lessons_skill_codes
    ON lessons USING GIN (skill_codes);
CREATE INDEX IF NOT EXISTS idx_lessons_assigned_agents
    ON lessons USING GIN (assigned_agents);
CREATE INDEX IF NOT EXISTS idx_lessons_review_status
    ON lessons(review_status, safety_review_status);

-- ============================================================
-- 2. Lesson Steps — ordered interactive steps within a lesson
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    step_number INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'intro',             -- narrative intro / hook
        'concept',           -- teach a concept with text + visuals
        'example',           -- worked example
        'interactive',       -- hands-on interaction (drag, build, explore)
        'concept_check',     -- predict-then-reveal multiple choice
        'practice',          -- problem to solve
        'quiz',              -- multi-question assessment
        'passage',           -- reading passage
        'celebration',       -- milestone / badge unlock
        'summary'            -- recap
    )),

    title TEXT NOT NULL,
    description TEXT,
    step_emoji TEXT DEFAULT '⭐',

    -- Content (filled during 'generating' phase)
    content JSONB,                            -- { body_text, prompt, choices, answer_key, hint_set, ... }
    visual_spec JSONB,                        -- { illustration_prompt, diagram_type, animation_spec }

    -- Agent attribution — which agent produced this step's content
    content_agent TEXT,                       -- e.g. "claude-opus"
    visual_agent TEXT,                        -- e.g. "gemini-image-pro"

    -- Quality
    review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'revision_requested')),

    -- Link to generated assets
    asset_ids JSONB DEFAULT '[]'::jsonb,      -- references to lesson_assets

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(lesson_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_lesson_steps_lesson
    ON lesson_steps(lesson_id, step_number);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_type
    ON lesson_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_lesson_steps_review
    ON lesson_steps(review_status);

-- ============================================================
-- 3. Lesson Assets — visual/audio/interactive assets generated by agents
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    step_id UUID REFERENCES lesson_steps(id) ON DELETE SET NULL,

    asset_type TEXT NOT NULL CHECK (asset_type IN (
        'illustration',    -- full-color scene illustration
        'diagram',         -- conceptual diagram (bar chart, number line, etc.)
        'icon',            -- small icon or emoji-style graphic
        'animation',       -- animated SVG or Lottie spec
        'audio_narration', -- TTS narration track
        'background',      -- scene background
        'character',       -- character sprite or avatar
        'interactive_spec' -- JSON spec for an interactive widget
    )),

    -- Generation
    generating_agent TEXT NOT NULL,           -- "gemini-image-pro", "nano-banana", "minimax-m3"
    generation_prompt TEXT,                   -- the prompt sent to the agent
    generation_params JSONB,                  -- { style, size, format, ... }

    -- Result
    asset_url TEXT,                           -- CDN or local path to generated asset
    asset_data JSONB,                         -- inline data (base64, SVG source, JSON spec)
    thumbnail_url TEXT,

    -- Quality
    review_status TEXT DEFAULT 'pending'
        CHECK (review_status IN ('pending', 'approved', 'rejected', 'revision_requested')),

    -- Metadata
    file_size_bytes INTEGER,
    mime_type TEXT,
    alt_text TEXT,                            -- accessibility description

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_assets_lesson
    ON lesson_assets(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_step
    ON lesson_assets(step_id) WHERE step_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lesson_assets_type
    ON lesson_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_agent
    ON lesson_assets(generating_agent);
CREATE INDEX IF NOT EXISTS idx_lesson_assets_review
    ON lesson_assets(review_status);

-- ============================================================
-- 4. Agent Tasks — work assignments in the lesson pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    step_id UUID REFERENCES lesson_steps(id) ON DELETE CASCADE,

    -- Which agent and what role
    agent_id TEXT NOT NULL CHECK (agent_id IN (
        'claude-opus',       -- lesson design, pedagogy, narrative
        'gpt-5.5',           -- problem generation, assessments
        'gemini-image-pro',  -- high-quality illustrations, diagrams
        'nano-banana',       -- lightweight images, icons, decorations
        'minimax-m3',        -- child-facing prompts, interactive elements
        'local-llm',         -- fallback local generation
        'human'              -- human review or manual content
    )),

    task_type TEXT NOT NULL CHECK (task_type IN (
        'design_spec',       -- create the lesson design document
        'write_content',     -- write step text, prompts, narratives
        'generate_problem',  -- create practice problems + answer keys
        'create_assessment', -- build quiz / concept check
        'generate_image',    -- produce visual asset
        'generate_audio',    -- produce TTS narration
        'review_content',    -- review for pedagogical quality
        'review_safety',     -- review for child safety
        'assemble',          -- assemble final lesson package
        'manual_review',     -- human review gate
        'manual_edit'        -- human content edit
    )),

    -- Task input/output
    input_payload JSONB,                      -- { prompt, context, references, ... }
    output_payload JSONB,                     -- { result, content, asset_id, ... }

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),

    -- Dependencies
    depends_on UUID[],                        -- other task IDs that must complete first

    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Quality
    quality_score DOUBLE PRECISION,           -- 0-1, set by reviewer
    review_notes TEXT,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_lesson
    ON lesson_agent_tasks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent
    ON lesson_agent_tasks(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status
    ON lesson_agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_step
    ON lesson_agent_tasks(step_id) WHERE step_id IS NOT NULL;

-- ============================================================
-- 5. Lesson Reviews — feedback from humans or agents
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    step_id UUID REFERENCES lesson_steps(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES lesson_assets(id) ON DELETE CASCADE,

    -- Reviewer
    reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('human', 'agent')),
    reviewer_id TEXT NOT NULL,                -- user id or agent_id
    reviewer_name TEXT,                       -- "Dad" or "claude-opus"

    -- Review content
    review_kind TEXT NOT NULL CHECK (review_kind IN (
        'pedagogical',    -- is it educationally sound?
        'safety',         -- is it child-safe?
        'visual',         -- do the visuals look good?
        'engagement',     -- will kids find it engaging?
        'accuracy',       -- is the content correct?
        'age_appropriate' -- is it right for the target age?
    )),

    verdict TEXT NOT NULL CHECK (verdict IN ('approved', 'rejected', 'revision_requested')),
    score DOUBLE PRECISION CHECK (score BETWEEN 0 AND 1),
    notes TEXT,
    suggested_changes JSONB DEFAULT '[]'::jsonb,  -- [{ field, current, suggested }]

    -- Round (reviews can iterate)
    review_round INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_reviews_lesson
    ON lesson_reviews(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reviews_verdict
    ON lesson_reviews(verdict);
CREATE INDEX IF NOT EXISTS idx_lesson_reviews_reviewer
    ON lesson_reviews(reviewer_id);

-- ============================================================
-- 6. Lifecycle Events — audit trail of state transitions
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

    -- Transition
    from_state TEXT,
    to_state TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'state_change',      -- lifecycle state transition
        'agent_assigned',    -- agent assigned to lesson
        'agent_completed',   -- agent finished its task
        'review_submitted',  -- review feedback added
        'asset_generated',   -- visual/audio asset produced
        'step_created',      -- new step added to lesson
        'step_updated',      -- step content modified
        'published',         -- lesson went live
        'archived',          -- lesson retired
        'comment'            -- general comment/note
    )),

    -- Who triggered it
    triggered_by TEXT,                       -- agent_id or user id
    triggered_by_type TEXT CHECK (triggered_by_type IN ('agent', 'human', 'system')),

    -- Details
    event_payload JSONB,                      -- { task_id, step_id, asset_id, notes, ... }
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_lesson
    ON lesson_lifecycle_events(lesson_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_type
    ON lesson_lifecycle_events(event_type);

-- ============================================================
-- 7. Lesson Assignments — assign lessons to specific children
-- ============================================================

CREATE TABLE IF NOT EXISTS lesson_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Assignment metadata
    assigned_by TEXT NOT NULL,                -- parent user id
    due_date DATE,
    priority INTEGER DEFAULT 0,

    -- Progress
    status TEXT NOT NULL DEFAULT 'assigned'
        CHECK (status IN ('assigned', 'in_progress', 'completed', 'skipped')),
    current_step INTEGER DEFAULT 0,
    score DOUBLE PRECISION,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Adaptive data
    difficulty_override INTEGER CHECK (difficulty_override BETWEEN 1 AND 5),
    adaptations JSONB DEFAULT '{}'::jsonb,    -- { skip_steps: [], extra_hints: true }

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(lesson_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_assignments_child
    ON lesson_assignments(child_user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_assignments_lesson
    ON lesson_assignments(lesson_id);

-- ============================================================
-- Triggers — keep updated_at fresh
-- ============================================================

CREATE OR REPLACE FUNCTION touch_lessons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lessons_touch_updated_at ON lessons;
CREATE TRIGGER lessons_touch_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION touch_lessons_updated_at();

DROP TRIGGER IF EXISTS lesson_steps_touch_updated_at ON lesson_steps;
CREATE TRIGGER lesson_steps_touch_updated_at
    BEFORE UPDATE ON lesson_steps
    FOR EACH ROW EXECUTE FUNCTION touch_lessons_updated_at();

DROP TRIGGER IF EXISTS lesson_assets_touch_updated_at ON lesson_assets;
CREATE TRIGGER lesson_assets_touch_updated_at
    BEFORE UPDATE ON lesson_assets
    FOR EACH ROW EXECUTE FUNCTION touch_lessons_updated_at();

DROP TRIGGER IF EXISTS lesson_agent_tasks_touch_updated_at ON lesson_agent_tasks;
CREATE TRIGGER lesson_agent_tasks_touch_updated_at
    BEFORE UPDATE ON lesson_agent_tasks
    FOR EACH ROW EXECUTE FUNCTION touch_lessons_updated_at();

DROP TRIGGER IF EXISTS lesson_assignments_touch_updated_at ON lesson_assignments;
CREATE TRIGGER lesson_assignments_touch_updated_at
    BEFORE UPDATE ON lesson_assignments
    FOR EACH ROW EXECUTE FUNCTION touch_lessons_updated_at();

-- ============================================================
-- Auto-log lifecycle events on lesson state changes
-- ============================================================

CREATE OR REPLACE FUNCTION log_lesson_state_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lifecycle_state IS DISTINCT FROM OLD.lifecycle_state THEN
        INSERT INTO lesson_lifecycle_events (lesson_id, from_state, to_state, event_type, triggered_by_type)
        VALUES (NEW.id, OLD.lifecycle_state, NEW.lifecycle_state, 'state_change', 'system');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lessons_log_state_change ON lessons;
CREATE TRIGGER lessons_log_state_change
    AFTER UPDATE OF lifecycle_state ON lessons
    FOR EACH ROW EXECUTE FUNCTION log_lesson_state_change();
