-- Multi-Tenant Database Schema
-- Run this in PostgreSQL to create tenant management tables

-- ============================================================
-- Tenants Table
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'archived')),
    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
    
    -- Owner reference
    owner_id UUID,
    owner_email VARCHAR(255) NOT NULL,
    
    -- Limits (JSONB for flexibility)
    limits JSONB DEFAULT '{
        "maxUsers": 1,
        "maxAgents": 2,
        "maxWorkspacePages": 10,
        "maxStorageGB": 1,
        "maxApiCallsPerDay": 100,
        "maxTokensPerMonth": 100000,
        "allowedLLMs": ["ministral-14b"],
        "allowedFeatures": ["workspace", "basic-agents"]
    }'::jsonb,
    
    -- Usage tracking
    usage JSONB DEFAULT '{
        "currentUsers": 0,
        "currentAgents": 0,
        "currentPages": 0,
        "storageUsedGB": 0,
        "apiCallsToday": 0,
        "tokensThisMonth": 0
    }'::jsonb,
    
    -- Tenant configuration
    config JSONB DEFAULT '{
        "enabledServices": [],
        "enabledAgents": [],
        "enabledLLMs": [],
        "enabledFeatures": [],
        "customSettings": {}
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);

-- ============================================================
-- Users Table
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    
    -- Platform-level role (null for non-platform admins)
    platform_role VARCHAR(100),
    
    -- User preferences
    preferences JSONB DEFAULT '{
        "theme": "system"
    }'::jsonb,
    
    -- Auth info
    password_hash TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_platform_role ON users(platform_role);

-- ============================================================
-- Roles Table
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(50) NOT NULL CHECK (level IN ('platform', 'tenant')),
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert system roles
INSERT INTO roles (id, name, description, level, permissions, is_system) VALUES
('platform-admin', 'Platform Administrator', 'Full control over the entire platform', 'platform', 
 '["platform:manage", "platform:tenants:create", "platform:tenants:delete", "platform:tenants:manage", "platform:services:manage", "platform:llms:manage", "platform:billing:view", "platform:billing:manage", "tenant:manage", "tenant:users:invite", "tenant:users:remove", "tenant:users:manage", "tenant:config:view", "tenant:config:edit", "tenant:agents:manage", "tenant:integrations:manage", "feature:workspace:use", "feature:agents:use", "feature:voice:use", "feature:knowledge-graph:use", "feature:approvals:manage", "feature:api:access", "data:read", "data:write", "data:delete", "data:export"]'::jsonb, 
 true),
('tenant-admin', 'Tenant Administrator', 'Full control over a specific tenant', 'tenant',
 '["tenant:manage", "tenant:users:invite", "tenant:users:remove", "tenant:users:manage", "tenant:config:view", "tenant:config:edit", "tenant:agents:manage", "tenant:integrations:manage", "feature:workspace:use", "feature:agents:use", "feature:voice:use", "feature:knowledge-graph:use", "feature:approvals:manage", "feature:api:access", "data:read", "data:write", "data:delete", "data:export"]'::jsonb,
 true),
('tenant-member', 'Tenant Member', 'Standard user within a tenant', 'tenant',
 '["tenant:config:view", "feature:workspace:use", "feature:agents:use", "feature:voice:use", "feature:knowledge-graph:use", "data:read", "data:write"]'::jsonb,
 true),
('tenant-viewer', 'Tenant Viewer', 'Read-only access within a tenant', 'tenant',
 '["tenant:config:view", "feature:workspace:use", "data:read"]'::jsonb,
 true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Tenant Memberships (User <-> Tenant relationship)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id),
    
    invited_by UUID REFERENCES users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON tenant_memberships(user_id);

-- ============================================================
-- Invitations
-- ============================================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_id VARCHAR(100) NOT NULL REFERENCES roles(id),
    invited_by UUID NOT NULL REFERENCES users(id),
    
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- ============================================================
-- API Keys (for programmatic access)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,  -- For display: "ahd_abc..."
    
    permissions JSONB DEFAULT '[]'::jsonb,
    
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================
-- Audit Log
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_log(created_at DESC);

-- ============================================================
-- Usage Tracking (daily aggregates)
-- ============================================================

CREATE TABLE IF NOT EXISTS usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    api_calls INTEGER DEFAULT 0,
    tokens_used BIGINT DEFAULT 0,
    storage_delta_bytes BIGINT DEFAULT 0,
    
    breakdown JSONB DEFAULT '{}'::jsonb,  -- Per-service/agent breakdown
    
    UNIQUE(tenant_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_tenant_date ON usage_daily(tenant_id, date);

-- ============================================================
-- Triggers
-- ============================================================

-- Update tenant updated_at on change
CREATE OR REPLACE FUNCTION update_tenant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tenant_updated ON tenants;
CREATE TRIGGER tenant_updated
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_timestamp();

-- Update user updated_at on change
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_updated ON users;
CREATE TRIGGER user_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_timestamp();

-- Update tenant user count on membership change
CREATE OR REPLACE FUNCTION update_tenant_user_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tenants 
        SET usage = jsonb_set(usage, '{currentUsers}', to_jsonb(COALESCE((usage->>'currentUsers')::int, 0) + 1))
        WHERE id = NEW.tenant_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tenants 
        SET usage = jsonb_set(usage, '{currentUsers}', to_jsonb(GREATEST(0, COALESCE((usage->>'currentUsers')::int, 0) - 1)))
        WHERE id = OLD.tenant_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS membership_count ON tenant_memberships;
CREATE TRIGGER membership_count
    AFTER INSERT OR DELETE ON tenant_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_user_count();

-- ============================================================
-- Initial Data: Create default homelab tenant and admin user
-- ============================================================

-- Create platform admin user (eleazar)
INSERT INTO users (id, email, name, platform_role, status)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'eleazar@homelab.local',
    'Eleazar',
    'platform-admin',
    'active'
)
ON CONFLICT (email) DO UPDATE SET platform_role = 'platform-admin';

-- Create homelab tenant
INSERT INTO tenants (id, slug, name, description, owner_id, owner_email, tier, status, limits, config)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'homelab',
    'AI Homelab',
    'Primary homelab environment',
    'a0000000-0000-0000-0000-000000000001',
    'eleazar@homelab.local',
    'enterprise',
    'active',
    '{
        "maxUsers": -1,
        "maxAgents": -1,
        "maxWorkspacePages": -1,
        "maxStorageGB": -1,
        "maxApiCallsPerDay": -1,
        "maxTokensPerMonth": -1,
        "allowedLLMs": ["*"],
        "allowedFeatures": ["*"]
    }'::jsonb,
    '{
        "enabledServices": ["*"],
        "enabledAgents": ["*"],
        "enabledLLMs": ["*"],
        "enabledFeatures": ["*"],
        "customSettings": {}
    }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Add eleazar as tenant admin of homelab
INSERT INTO tenant_memberships (tenant_id, user_id, role_id)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'tenant-admin'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;
