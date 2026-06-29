-- ============================================================================
-- Unified Onboarding & Client Registry
-- ----------------------------------------------------------------------------
-- Extends the platform data model to support:
--   1. Client registry — tracks all connected clients (iOS, Dashboard, Atlas,
--      CLI, service) per user with platform, capabilities, and auth method
--   2. Service catalog — backend services self-register with capabilities,
--      ports, health endpoints, feature flags, and dependencies
--   3. Onboarding jobs — tracks provisioning pipeline state per user/tenant
--   4. Onboarding steps — individual step status within a job
--   5. Feature-to-service mapping — connects FeatureFlag enum values to
--      actual backend service endpoints in the catalog
--
-- All tables are tenant-scoped where applicable. Existing tables (users,
-- tenants, tenant_memberships, user_feature_access, user_devices,
-- mobile_devices, subscription_plans) are NOT modified — this migration
-- only adds new tables and views.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CLIENT REGISTRY
-- ============================================================================
-- Replaces the fragmented user_devices + mobile_devices + X-Client header
-- approach with a unified registry. Existing tables remain for backward
-- compatibility; a trigger syncs from client_registrations to mobile_devices
-- for push notification routing.

CREATE TABLE IF NOT EXISTS client_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,

    -- Client identity
    client_type     VARCHAR(50) NOT NULL,
    -- Values: 'ios' | 'dashboard' | 'atlas' | 'cli' | 'service' | 'android' | 'macos'
    client_id       VARCHAR(100) NOT NULL,
    -- Stable identifier per client type (e.g. bundle ID, hostname, service name)
    client_name     VARCHAR(255),
    -- Human-readable name (e.g. "Claudia's iPhone 15 Pro")

    -- Platform details
    platform        VARCHAR(50) NOT NULL,
    -- Values: 'ios' | 'android' | 'web' | 'macos' | 'linux' | 'windows' | 'service'
    platform_version VARCHAR(100),
    -- OS/browser version (e.g. "iOS 18.2", "Chrome 126", "Ubuntu 24.04")
    app_version     VARCHAR(50),
    -- App/version the client is running (e.g. "Hyperspace 1.2.0", "dashboard 2.0")

    -- Auth method used by this client
    auth_method     VARCHAR(50) NOT NULL DEFAULT 'jwt',
    -- Values: 'jwt' | 'nextauth-session' | 'api-key' | 'mobile-header' | 'device-pairing'

    -- Capabilities (what the client can do)
    capabilities    JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array of capability strings: 'push-notifications', 'voice', 'webrtc',
    -- 'background-sync', 'file-access', 'camera', 'location'

    -- Push notification token (if applicable)
    push_token      TEXT,
    push_token_type VARCHAR(20),
    -- 'apns' | 'fcm' | 'web-push' | NULL

    -- Device info (optional, for hardware clients)
    device_model    VARCHAR(255),
    device_family   VARCHAR(100),
    -- e.g. 'iPhone', 'iPad', 'MacBook Pro', 'server'

    -- State
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at  TIMESTAMPTZ,
    deactivation_reason TEXT,

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_reg_user ON client_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_client_reg_tenant ON client_registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_reg_type ON client_registrations(client_type);
CREATE INDEX IF NOT EXISTS idx_client_reg_active ON client_registrations(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_reg_push ON client_registrations(push_token) WHERE push_token IS NOT NULL;

-- Unique constraint: one active registration per client_id per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_reg_user_client_active
    ON client_registrations(user_id, client_id) WHERE is_active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_client_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_client_reg_updated_at ON client_registrations;
CREATE TRIGGER trigger_client_reg_updated_at
    BEFORE UPDATE ON client_registrations
    FOR EACH ROW EXECUTE FUNCTION update_client_registrations_updated_at();

-- ============================================================================
-- 2. SERVICE CATALOG
-- ============================================================================
-- Backend services register themselves here on startup. The dashboard,
-- onboarding wizard, and agents query this to discover available services,
-- their endpoints, and what features they implement.

CREATE TABLE IF NOT EXISTS service_catalog (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name    VARCHAR(100) NOT NULL UNIQUE,
    -- e.g. 'cig', 'nova-agent', 'pi-workspace', 'pcg', 'research-lab'

    display_name    VARCHAR(255) NOT NULL,
    description     TEXT,

    -- Network
    host            VARCHAR(255) NOT NULL DEFAULT 'localhost',
    port            INTEGER NOT NULL,
    health_endpoint VARCHAR(255) DEFAULT '/health',
    api_prefix      VARCHAR(50) DEFAULT '/v1',

    -- Service type
    service_type    VARCHAR(50) NOT NULL,
    -- 'rest-api' | 'websocket' | 'grpc' | 'cli' | 'worker'

    -- Capabilities this service provides
    capabilities    JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array of capability objects: {"name": "email-sync", "version": "2.0"}

    -- Feature flags this service implements (maps to FeatureFlag enum in TS)
    feature_flags   JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array of FeatureFlag strings: ['email', 'calendar', 'chat']

    -- Dependencies (other service_name values)
    dependencies    JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array of service names this service depends on

    -- Auth requirements
    auth_required   BOOLEAN NOT NULL DEFAULT true,
    auth_methods    JSONB NOT NULL DEFAULT '["jwt"]'::jsonb,
    -- Array of accepted auth methods: 'jwt', 'api-key', 'nextauth-session'

    -- Onboarding provisioning
    provisioning_enabled BOOLEAN NOT NULL DEFAULT false,
    -- If true, this service can be provisioned during onboarding
    provisioning_order   INTEGER NOT NULL DEFAULT 100,
    -- Lower = provisioned first (dependencies before dependents)
    provisioning_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Service-specific provisioning params (e.g. {"neo4j_port": 7720, "infisical_path": "/users/claudia"})

    -- State
    status          VARCHAR(50) NOT NULL DEFAULT 'registered',
    -- 'registered' | 'active' | 'degraded' | 'maintenance' | 'offline'
    last_heartbeat  TIMESTAMPTZ,
    version         VARCHAR(50),

    -- Metadata
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_name ON service_catalog(service_name);
CREATE INDEX IF NOT EXISTS idx_service_catalog_type ON service_catalog(service_type);
CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON service_catalog(status) WHERE status IN ('active', 'registered');
CREATE INDEX IF NOT EXISTS idx_service_catalog_provisioning ON service_catalog(provisioning_enabled, provisioning_order);

CREATE OR REPLACE FUNCTION update_service_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_service_catalog_updated_at ON service_catalog;
CREATE TRIGGER trigger_service_catalog_updated_at
    BEFORE UPDATE ON service_catalog
    FOR EACH ROW EXECUTE FUNCTION update_service_catalog_updated_at();

-- ============================================================================
-- 3. ONBOARDING JOBS
-- ============================================================================
-- Tracks the provisioning pipeline for a user/tenant. Created by the
-- POST /api/onboarding/provision endpoint. Each job has multiple steps
-- that execute in order (or in parallel batches).

CREATE TABLE IF NOT EXISTS onboarding_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,

    -- Job type
    job_type        VARCHAR(50) NOT NULL DEFAULT 'full_provisioning',
    -- 'full_provisioning' | 'service_enrollment' | 'tier_upgrade' | 'client_registration'

    -- Triggered by
    triggered_by    VARCHAR(50) NOT NULL DEFAULT 'dashboard',
    -- 'dashboard' | 'ios' | 'atlas' | 'cli' | 'admin' | 'system'
    triggered_by_client_id UUID REFERENCES client_registrations(id) ON DELETE SET NULL,

    -- Onboarding form data (from the wizard)
    form_data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Full OnboardingState from the wizard: identity, email, infrastructure, etc.

    -- Subscription
    target_tier     VARCHAR(50) NOT NULL DEFAULT 'free',
    -- Subscription tier to assign after provisioning

    -- State
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
    current_step    VARCHAR(100),
    -- Current step name being executed
    progress        INTEGER NOT NULL DEFAULT 0,
    -- 0-100 percentage
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    expired_at      TIMESTAMPTZ,

    -- Result
    result          JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Summary of what was provisioned: {tenant_id, neo4j_port, infisical_path, services: [...]}

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_jobs_user ON onboarding_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_jobs_tenant ON onboarding_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_jobs_status ON onboarding_jobs(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_jobs_type ON onboarding_jobs(job_type);

CREATE OR REPLACE FUNCTION update_onboarding_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_jobs_updated_at ON onboarding_jobs;
CREATE TRIGGER trigger_onboarding_jobs_updated_at
    BEFORE UPDATE ON onboarding_jobs
    FOR EACH ROW EXECUTE FUNCTION update_onboarding_jobs_updated_at();

-- ============================================================================
-- 4. ONBOARDING STEPS
-- ============================================================================
-- Individual steps within an onboarding job. Each step maps to a provisioning
-- action (create tenant, provision Neo4j, create Infisical folders, enroll
-- services, etc.)

CREATE TABLE IF NOT EXISTS onboarding_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES onboarding_jobs(id) ON DELETE CASCADE,

    -- Step identity
    step_name       VARCHAR(100) NOT NULL,
    -- 'create_tenant' | 'assign_subscription' | 'provision_neo4j' |
    -- 'create_infisical_folders' | 'enroll_cig' | 'enroll_nova' |
    -- 'register_client' | 'configure_email' | 'security_validation'
    step_order      INTEGER NOT NULL DEFAULT 0,

    -- Service this step provisions (if applicable)
    service_name    VARCHAR(100) REFERENCES service_catalog(service_name) ON DELETE SET NULL,

    -- State
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,

    -- Step-specific config and result
    config          JSONB NOT NULL DEFAULT '{}'::jsonb,
    result          JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timing
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_steps_job ON onboarding_steps(job_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_status ON onboarding_steps(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_order ON onboarding_steps(job_id, step_order);

CREATE OR REPLACE FUNCTION update_onboarding_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_steps_updated_at ON onboarding_steps;
CREATE TRIGGER trigger_onboarding_steps_updated_at
    BEFORE UPDATE ON onboarding_steps
    FOR EACH ROW EXECUTE FUNCTION update_onboarding_steps_updated_at();

-- ============================================================================
-- 5. SEED SERVICE CATALOG
-- ============================================================================
-- Pre-populate with known homelab services

INSERT INTO service_catalog (service_name, display_name, description, host, port, service_type, feature_flags, dependencies, auth_methods, provisioning_enabled, provisioning_order, provisioning_config, status)
VALUES
    ('cig', 'Communications Intelligence Graph', 'Email/calendar/contact intelligence with Neo4j graph store',
     'localhost', 8780, 'rest-api',
     '["email", "calendar", "chat"]'::jsonb,
     '["infisical"]'::jsonb,
     '["jwt", "api-key"]'::jsonb,
     true, 20,
     '{"neo4j_required": true, "infisical_path_template": "/users/{user_folder}", "jwt_secret_env": "CIG_JWT_SECRET"}'::jsonb,
     'active'),
    ('nova-agent', 'Nova Voice Assistant', 'Voice + text assistant with grounding and tool routing',
     'localhost', 18803, 'rest-api',
     '["chat", "ai-research", "personal-context"]'::jsonb,
     '["cig", "pcg"]'::jsonb,
     '["jwt", "api-key"]'::jsonb,
     true, 40,
     '{"jwt_secret_env": "NOVA_JWT_SECRET"}'::jsonb,
     'active'),
    ('pcg', 'Personal Context Graph', 'Identity, goals, preferences, personal memory',
     'localhost', 8765, 'rest-api',
     '["personal-context"]'::jsonb,
     '[]'::jsonb,
     '["jwt", "api-key"]'::jsonb,
     true, 15,
     '{"neo4j_required": true, "neo4j_label_prefix": "pcg"}'::jsonb,
     'active'),
    ('pi-workspace', 'Pi Workspace', 'Notion-like workspace with pages, blocks, databases, planner',
     'localhost', 8762, 'rest-api',
     '["workspace"]'::jsonb,
     '[]'::jsonb,
     '["api-key"]'::jsonb,
     true, 10,
     '{"db_name_template": "pi_workspace_{tenant_slug}"}'::jsonb,
     'active'),
    ('infisical', 'Infisical Secrets Manager', 'Secrets management with per-user folder isolation',
     'localhost', 8791, 'rest-api',
     '[]'::jsonb,
     '[]'::jsonb,
     '["api-key"]'::jsonb,
     true, 5,
     '{"project_id": "b37bc708-a1a1-471e-9b67-6485a792b271", "folder_template": "/users/{user_folder}"}'::jsonb,
     'active'),
    ('research-lab', 'Research Lab', 'AI-powered research with Perplexity integration',
     'localhost', 8790, 'rest-api',
     '["ai-research"]'::jsonb,
     '["cig"]'::jsonb,
     '["api-key"]'::jsonb,
     false, 50,
     '{}'::jsonb,
     'active'),
    ('podcast-studio', 'Podcast Studio', 'AI-powered podcast generation',
     'localhost', 8793, 'rest-api',
     '["podcast-studio"]'::jsonb,
     '["cig"]'::jsonb,
     '["api-key"]'::jsonb,
     false, 60,
     '{}'::jsonb,
     'active'),
    ('approval-service', 'Approval Service', 'Approval gate with NextAuth + mobile client auth',
     'localhost', 8810, 'rest-api',
     '["approvals"]'::jsonb,
     '[]'::jsonb,
     '["nextauth-session", "api-key", "mobile-header"]'::jsonb,
     false, 30,
     '{}'::jsonb,
     'active'),
    ('tesla-relay', 'Tesla Relay', 'Tesla vehicle control via OAuth + virtual key',
     'localhost', 18810, 'rest-api',
     '[]'::jsonb,
     '[]'::jsonb,
     '["api-key"]'::jsonb,
     false, 70,
     '{}'::jsonb,
     'active'),
    ('homelab-monitor', 'Homelab Monitor', 'System health monitoring and alerting',
     'localhost', 8797, 'rest-api',
     '["monitoring", "infrastructure"]'::jsonb,
     '[]'::jsonb,
     '["api-key"]'::jsonb,
     false, 80,
     '{}'::jsonb,
     'active')
ON CONFLICT (service_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    feature_flags = EXCLUDED.feature_flags,
    dependencies = EXCLUDED.dependencies,
    auth_methods = EXCLUDED.auth_methods,
    provisioning_config = EXCLUDED.provisioning_config,
    updated_at = now();

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- Active clients per user (joins users + client_registrations)
CREATE OR REPLACE VIEW v_user_clients AS
SELECT
    u.id AS user_id,
    u.email,
    u.name AS user_name,
    cr.id AS client_registration_id,
    cr.client_type,
    cr.client_id,
    cr.client_name,
    cr.platform,
    cr.app_version,
    cr.auth_method,
    cr.capabilities,
    cr.is_active,
    cr.last_seen_at,
    cr.registered_at
FROM users u
LEFT JOIN client_registrations cr ON cr.user_id = u.id AND cr.is_active = true
ORDER BY u.email, cr.last_seen_at DESC;

-- Onboarding job summary with step counts
CREATE OR REPLACE VIEW v_onboarding_job_summary AS
SELECT
    j.id AS job_id,
    j.user_id,
    j.tenant_id,
    j.job_type,
    j.status AS job_status,
    j.progress,
    j.target_tier,
    j.triggered_by,
    j.current_step,
    j.error_message,
    j.created_at,
    j.started_at,
    j.completed_at,
    COUNT(s.id) AS total_steps,
    COUNT(s.id) FILTER (WHERE s.status = 'completed') AS completed_steps,
    COUNT(s.id) FILTER (WHERE s.status = 'failed') AS failed_steps,
    COUNT(s.id) FILTER (WHERE s.status = 'pending') AS pending_steps,
    COUNT(s.id) FILTER (WHERE s.status = 'in_progress') AS in_progress_steps
FROM onboarding_jobs j
LEFT JOIN onboarding_steps s ON s.job_id = j.id
GROUP BY j.id
ORDER BY j.created_at DESC;

-- Service catalog with dependency names resolved
CREATE OR REPLACE VIEW v_service_catalog_with_deps AS
SELECT
    sc.*,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'service_name', dep.service_name,
                'display_name', dep.display_name,
                'status', dep.status
            )
        )
        FROM jsonb_array_elements_text(sc.dependencies) AS dep_name
        JOIN service_catalog dep ON dep.service_name = dep_name
    ) AS resolved_dependencies
FROM service_catalog sc
ORDER BY sc.provisioning_order, sc.service_name;

COMMIT;
