-- Learning Teams & Individualized Learning Paths
-- Enables small-group learning (2-3 children) with controlled information flow
-- and personalized learning path generation based on child profile + progress.
-- NOTE: Uses child_ prefix to avoid conflict with existing learning_paths table (book-based).

-- ============================================================
-- Learning Teams
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    team_emoji TEXT DEFAULT '🏆',

    -- Owner (parent who created the team)
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID,

    -- Team settings
    max_members INTEGER NOT NULL DEFAULT 3 CHECK (max_members BETWEEN 2 AND 3),

    -- Information flow controls: what team members can see about each other
    -- 'full' = see teammate progress, achievements, name
    -- 'limited' = see teammate first name + completion status only
    -- 'anonymous' = see only team aggregate progress, no individual data
    info_flow_level TEXT NOT NULL DEFAULT 'limited'
        CHECK (info_flow_level IN ('full', 'limited', 'anonymous')),

    -- Feature toggles for team activities
    shared_activities_enabled BOOLEAN DEFAULT true,
    peer_comparison_enabled BOOLEAN DEFAULT false,
    team_challenges_enabled BOOLEAN DEFAULT true,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_teams_parent
    ON learning_teams(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_learning_teams_tenant
    ON learning_teams(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_learning_teams_active
    ON learning_teams(is_active) WHERE is_active = true;

-- ============================================================
-- Learning Team Members
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES learning_teams(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role within the team
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('member', 'captain')),

    -- Display name visible to teammates (controlled by info_flow_level)
    -- For 'anonymous' mode, this is a pseudonym like "Explorer A"
    display_name_to_team TEXT,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    UNIQUE(team_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team
    ON learning_team_members(team_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_team_members_child
    ON learning_team_members(child_user_id) WHERE is_active = true;

-- ============================================================
-- Individualized Child Learning Paths
-- ============================================================

CREATE TABLE IF NOT EXISTS child_learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Path metadata
    title TEXT NOT NULL,
    description TEXT,
    path_emoji TEXT DEFAULT '🗺️',

    -- What generated this path
    source TEXT NOT NULL DEFAULT 'adaptive'
        CHECK (source IN ('adaptive', 'parent_assigned', 'curriculum_aligned', 'interest_based')),

    -- Target skill domain(s) this path focuses on
    focus_domains JSONB DEFAULT '[]'::jsonb,

    -- Path configuration
    total_steps INTEGER NOT NULL DEFAULT 5,
    current_step INTEGER NOT NULL DEFAULT 0,

    -- Adaptive difficulty: adjusts based on performance
    current_difficulty INTEGER NOT NULL DEFAULT 1 CHECK (current_difficulty BETWEEN 1 AND 5),

    -- Status
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'paused', 'archived')),

    -- Links to team if this is a team-shared path
    team_id UUID REFERENCES learning_teams(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_child_learning_paths_child
    ON child_learning_paths(child_user_id, status);
CREATE INDEX IF NOT EXISTS idx_child_learning_paths_team
    ON child_learning_paths(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_child_learning_paths_status
    ON child_learning_paths(status);

-- ============================================================
-- Child Learning Path Steps (individual steps in a path)
-- ============================================================

CREATE TABLE IF NOT EXISTS child_learning_path_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID NOT NULL REFERENCES child_learning_paths(id) ON DELETE CASCADE,

    -- Step ordering
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    step_emoji TEXT DEFAULT '⭐',

    -- Content reference (links to existing content catalog)
    content_item_id TEXT REFERENCES learning_content_items(id) ON DELETE SET NULL,

    -- Or custom content for this specific path step
    custom_prompt TEXT,
    custom_content_type TEXT CHECK (custom_content_type IN ('problem', 'question', 'writing', 'reasoning', 'interactive', 'quiz')),

    -- Skill this step targets
    skill_code TEXT,
    target_difficulty INTEGER CHECK (target_difficulty BETWEEN 1 AND 5),

    -- Hints available for this step
    hints JSONB DEFAULT '[]'::jsonb,

    -- Completion tracking
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    score DOUBLE PRECISION,
    time_spent_seconds INTEGER,

    -- Adaptive: if child struggles, redirect to this easier step
    remediation_step_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_learning_path_steps_path
    ON child_learning_path_steps(path_id, step_number);
CREATE INDEX IF NOT EXISTS idx_child_learning_path_steps_completed
    ON child_learning_path_steps(path_id) WHERE is_completed = false;

-- ============================================================
-- Team Activities (shared challenges for 2-3 children)
-- ============================================================

CREATE TABLE IF NOT EXISTS team_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES learning_teams(id) ON DELETE CASCADE,

    title TEXT NOT NULL,
    description TEXT,
    activity_emoji TEXT DEFAULT '🎯',

    -- Activity type
    activity_type TEXT NOT NULL DEFAULT 'challenge'
        CHECK (activity_type IN ('challenge', 'collaborative', 'discussion', 'quiz_battle', 'team_quest')),

    -- Content reference
    content_item_id TEXT REFERENCES learning_content_items(id) ON DELETE SET NULL,

    -- Skill focus
    skill_code TEXT,
    subject TEXT,

    -- Difficulty
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

    -- Timing
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Results (per-child results stored in team_activity_participants)
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_activities_team
    ON team_activities(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_activities_due
    ON team_activities(due_at) WHERE due_at IS NOT NULL;

-- ============================================================
-- Team Activity Participants (per-child participation + results)
-- ============================================================

CREATE TABLE IF NOT EXISTS team_activity_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES team_activities(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Individual result
    status TEXT NOT NULL DEFAULT 'not_started'
        CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
    score DOUBLE PRECISION,
    response_payload JSONB DEFAULT '{}'::jsonb,
    feedback TEXT,

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,

    UNIQUE(activity_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_activity_participants_activity
    ON team_activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_team_activity_participants_child
    ON team_activity_participants(child_user_id, status);

-- ============================================================
-- Updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS learning_teams_touch_updated_at ON learning_teams;
CREATE TRIGGER learning_teams_touch_updated_at
    BEFORE UPDATE ON learning_teams
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS child_learning_paths_touch_updated_at ON child_learning_paths;
CREATE TRIGGER child_learning_paths_touch_updated_at
    BEFORE UPDATE ON child_learning_paths
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- Views
-- ============================================================

-- Team summary for parent dashboard
CREATE OR REPLACE VIEW learning_team_summary AS
SELECT
    t.id as team_id,
    t.name as team_name,
    t.team_emoji,
    t.info_flow_level,
    t.max_members,
    t.is_active,
    t.parent_user_id,
    COUNT(tm.id) FILTER (WHERE tm.is_active = true) as active_members,
    COUNT(ta.id) FILTER (WHERE ta.status = 'pending') as pending_activities,
    COUNT(ta.id) FILTER (WHERE ta.status = 'completed') as completed_activities,
    COUNT(lp.id) FILTER (WHERE lp.status = 'active') as active_paths
FROM learning_teams t
LEFT JOIN learning_team_members tm ON tm.team_id = t.id AND tm.is_active = true
LEFT JOIN team_activities ta ON ta.team_id = t.id
LEFT JOIN child_learning_paths lp ON lp.team_id = t.id AND lp.status = 'active'
GROUP BY t.id;

-- Child's active learning path summary
CREATE OR REPLACE VIEW child_active_path_summary AS
SELECT
    lp.id as path_id,
    lp.child_user_id,
    lp.title,
    lp.path_emoji,
    lp.source,
    lp.total_steps,
    lp.current_step,
    lp.current_difficulty,
    lp.status,
    lp.focus_domains,
    ROUND(
        COUNT(lpi.id) FILTER (WHERE lpi.is_completed = true)::NUMERIC /
        NULLIF(COUNT(lpi.id), 0) * 100, 1
    ) as completion_pct,
    lp.created_at,
    lp.completed_at
FROM child_learning_paths lp
LEFT JOIN child_learning_path_steps lpi ON lpi.path_id = lp.id
GROUP BY lp.id;

COMMENT ON TABLE learning_teams IS 'Small learning groups of 2-3 children with controlled information flow';
COMMENT ON TABLE learning_team_members IS 'Team membership with role and info-flow-controlled display name';
COMMENT ON TABLE child_learning_paths IS 'Individualized learning paths tailored to each childs profile and progress';
COMMENT ON TABLE child_learning_path_steps IS 'Steps within a child learning path, linked to content catalog or custom content';
COMMENT ON TABLE team_activities IS 'Shared activities for learning teams (challenges, collaborative tasks, discussions)';
COMMENT ON TABLE team_activity_participants IS 'Per-child participation and results for team activities';
