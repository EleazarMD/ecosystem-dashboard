-- Pokedex Gamification Tables
-- Tracks per-child Pokemon exploration, quiz results, type trainer progress, and collections.
-- Extends ecosystem_unified schema.

-- ========================================
-- 1. Pokedex Completion Tracking
-- ========================================
CREATE TABLE IF NOT EXISTS child_pokedex_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pokemon_id INT NOT NULL,  -- Neo4j Pokemon node ID
    pokemon_name TEXT NOT NULL,
    pokedex_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'seen',  -- 'seen', 'caught', 'favorite'
    caught_at TIMESTAMPTZ,
    favorite BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_user_id, pokemon_id)
);

CREATE INDEX IF NOT EXISTS idx_pokedex_entries_child ON child_pokedex_entries(child_user_id);
CREATE INDEX IF NOT EXISTS idx_pokedex_entries_status ON child_pokedex_entries(child_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pokedex_entries_fav ON child_pokedex_entries(child_user_id, favorite) WHERE favorite = true;

-- ========================================
-- 2. Quiz Results
-- ========================================
CREATE TABLE IF NOT EXISTS child_quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_type TEXT NOT NULL,  -- 'type_matchup', 'evolution', 'stats', 'pokemon_id', 'cry_guess'
    question TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    pokemon_id INT,  -- related Pokemon if applicable
    difficulty TEXT DEFAULT 'easy',  -- 'easy', 'medium', 'hard'
    points_earned INT DEFAULT 0,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_child ON child_quiz_results(child_user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_type ON child_quiz_results(child_user_id, quiz_type);
CREATE INDEX IF NOT EXISTS idx_quiz_correct ON child_quiz_results(child_user_id, is_correct);

-- ========================================
-- 3. Type Matchup Trainer Progress
-- ========================================
CREATE TABLE IF NOT EXISTS child_type_trainer_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attacking_type TEXT NOT NULL,
    defending_type TEXT NOT NULL,
    mastery_level INT DEFAULT 0,  -- 0-5, increases with correct answers
    correct_count INT DEFAULT 0,
    incorrect_count INT DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    UNIQUE(child_user_id, attacking_type, defending_type)
);

CREATE INDEX IF NOT EXISTS idx_type_trainer_child ON child_type_trainer_progress(child_user_id);

-- ========================================
-- 4. Pokemon Stat Comparison History
-- ========================================
CREATE TABLE IF NOT EXISTS child_stat_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pokemon1_id INT NOT NULL,
    pokemon2_id INT NOT NULL,
    pokemon1_name TEXT NOT NULL,
    pokemon2_name TEXT NOT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stat_comp_child ON child_stat_comparisons(child_user_id);

-- ========================================
-- 5. Daily Pokemon Tracking
-- ========================================
CREATE TABLE IF NOT EXISTS child_daily_pokemon (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pokemon_id INT NOT NULL,
    pokemon_name TEXT NOT NULL,
    pokedex_number INT NOT NULL,
    viewed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    learned_facts JSONB DEFAULT '[]'::jsonb,  -- facts the child learned
    quiz_completed BOOLEAN DEFAULT FALSE,
    quiz_score INT DEFAULT 0,
    UNIQUE(child_user_id, viewed_at)
);

CREATE INDEX IF NOT EXISTS idx_daily_pokemon_child ON child_daily_pokemon(child_user_id);
CREATE INDEX IF NOT EXISTS idx_daily_pokemon_date ON child_daily_pokemon(viewed_at);

-- ========================================
-- 6. TCG Card Collection
-- ========================================
CREATE TABLE IF NOT EXISTS child_tcg_collection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id TEXT NOT NULL,  -- TCG card ID from Neo4j
    card_name TEXT NOT NULL,
    card_image TEXT,
    card_rarity TEXT,
    set_name TEXT,
    quantity INT DEFAULT 1,
    is_favorite BOOLEAN DEFAULT FALSE,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_tcg_collection_child ON child_tcg_collection(child_user_id);
CREATE INDEX IF NOT EXISTS idx_tcg_collection_fav ON child_tcg_collection(child_user_id, is_favorite) WHERE is_favorite = true;

-- ========================================
-- 7. Pokemon Learning Stats (aggregate)
-- ========================================
CREATE TABLE IF NOT EXISTS child_pokemon_stats (
    child_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_seen INT DEFAULT 0,
    total_caught INT DEFAULT 0,
    total_favorites INT DEFAULT 0,
    total_quiz_correct INT DEFAULT 0,
    total_quiz_attempts INT DEFAULT 0,
    total_points INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 8. Type Flashcard Progress
-- ========================================
CREATE TABLE IF NOT EXISTS child_flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_type TEXT NOT NULL,  -- 'type_effectiveness', 'pokemon_cry', 'pokemon_silhouette'
    card_key TEXT NOT NULL,  -- e.g., "fire_vs_water" or "pokemon_25_cry"
    times_shown INT DEFAULT 0,
    times_correct INT DEFAULT 0,
    last_shown_at TIMESTAMPTZ,
    box_number INT DEFAULT 1,  -- Leitner system: 1-5
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_user_id, card_type, card_key)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_child ON child_flashcard_progress(child_user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_review ON child_flashcard_progress(child_user_id, next_review_at);

-- ========================================
-- Views
-- ========================================
CREATE OR REPLACE VIEW v_child_pokedex_completion AS
SELECT
    e.child_user_id,
    COUNT(*) FILTER (WHERE e.status = 'seen') AS seen_count,
    COUNT(*) FILTER (WHERE e.status = 'caught') AS caught_count,
    COUNT(*) FILTER (WHERE e.favorite = true) AS favorite_count,
    1025 AS total_pokemon,
    ROUND(
        COUNT(*) FILTER (WHERE e.status IN ('seen', 'caught'))::numeric / 1025 * 100, 1
    ) AS completion_pct
FROM child_pokedex_entries e
GROUP BY e.child_user_id;

CREATE OR REPLACE VIEW v_child_quiz_accuracy AS
SELECT
    q.child_user_id,
    q.quiz_type,
    COUNT(*) AS total_attempts,
    COUNT(*) FILTER (WHERE q.is_correct) AS correct_count,
    ROUND(
        COUNT(*) FILTER (WHERE q.is_correct)::numeric / NULLIF(COUNT(*), 0) * 100, 1
    ) AS accuracy_pct,
    SUM(q.points_earned) AS total_points
FROM child_quiz_results q
GROUP BY q.child_user_id, q.quiz_type;
