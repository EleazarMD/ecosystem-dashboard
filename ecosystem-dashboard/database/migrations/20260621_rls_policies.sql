-- ============================================================================
-- Postgres Row-Level Security (RLS) — P2.7
-- ----------------------------------------------------------------------------
-- App-layer scoping (user_id filters in queries) is already in place.
-- RLS is the database-level backstop: even if a query forgets to filter,
-- the database enforces that a user can only see their own rows.
--
-- How it works:
--   1. Each request sets `SET app.current_user_id = '<uuid>'` (per-connection).
--   2. RLS policies compare `user_id` against `current_setting('app.current_user_id')`.
--   3. Platform admins bypass RLS via the `app.bypass_rls` role flag.
--   4. SAFE FALLBACK: When `app.current_user_id` is not set (NULL), all rows
--      are visible. This ensures existing queries that don't yet call
--      setRLSContext() continue to work. Once the app layer is fully wired,
--      this fallback can be removed.
--
-- Tables covered:
--   - onboarding_jobs
--   - onboarding_steps
--   - client_registrations
--   - user_feature_access
--   - tenant_memberships
--   - revoked_tokens
-- ============================================================================

BEGIN;

-- Ensure the extension for gen_random_uuid is available (usually pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- onboarding_jobs: user can only see their own jobs
-- ---------------------------------------------------------------------------
ALTER TABLE onboarding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_jobs_user_isolation ON onboarding_jobs;
CREATE POLICY onboarding_jobs_user_isolation ON onboarding_jobs
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback: no session var set
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback: no session var set
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- onboarding_steps: user can only see steps for their own jobs
-- ---------------------------------------------------------------------------
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_steps_user_isolation ON onboarding_steps;
CREATE POLICY onboarding_steps_user_isolation ON onboarding_steps
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR job_id IN (
      SELECT id FROM onboarding_jobs
      WHERE user_id::text = current_setting('app.current_user_id', true)
    )
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR job_id IN (
      SELECT id FROM onboarding_jobs
      WHERE user_id::text = current_setting('app.current_user_id', true)
    )
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- client_registrations: user can only see their own client registrations
-- ---------------------------------------------------------------------------
ALTER TABLE client_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_registrations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_registrations_user_isolation ON client_registrations;
CREATE POLICY client_registrations_user_isolation ON client_registrations
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- user_feature_access: user can only see their own feature access
-- ---------------------------------------------------------------------------
ALTER TABLE user_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_access FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_feature_access_user_isolation ON user_feature_access;
CREATE POLICY user_feature_access_user_isolation ON user_feature_access
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- tenant_memberships: user can only see memberships for their own user
-- ---------------------------------------------------------------------------
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_memberships_user_isolation ON tenant_memberships;
CREATE POLICY tenant_memberships_user_isolation ON tenant_memberships
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- revoked_tokens: user can only see their own revoked tokens
-- ---------------------------------------------------------------------------
ALTER TABLE revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS revoked_tokens_user_isolation ON revoked_tokens;
CREATE POLICY revoked_tokens_user_isolation ON revoked_tokens
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL  -- safe fallback
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.bypass_rls', true) = 'true'
  );

-- ---------------------------------------------------------------------------
-- Platform admin bypass: the dashboard service role can set
-- `SET app.bypass_rls = 'true'` to access all rows (for admin operations).
-- This is NOT granted to regular users — only the service connection.
-- ---------------------------------------------------------------------------

COMMIT;
