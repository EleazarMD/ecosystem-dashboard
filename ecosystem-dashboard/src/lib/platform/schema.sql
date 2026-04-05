-- Platform Configuration Schema
-- Run this in PostgreSQL to create the platform_config table

-- Platform configuration table
CREATE TABLE IF NOT EXISTS platform_config (
    id SERIAL PRIMARY KEY,
    environment VARCHAR(50) NOT NULL UNIQUE DEFAULT 'development',
    config JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_config_environment ON platform_config(environment);

-- Insert default development config if not exists
INSERT INTO platform_config (environment, config, updated_by)
VALUES ('development', '{
  "id": "homelab-dashboard",
  "name": "AI Homelab Dashboard",
  "version": "2.0.0",
  "environment": "development",
  "services": [],
  "agents": [],
  "llms": [],
  "uiFeatures": [],
  "integrations": [],
  "globalSettings": {
    "maintenanceMode": false,
    "debugMode": false,
    "analyticsEnabled": true,
    "telemetryEnabled": true,
    "maxConcurrentAgents": 5,
    "defaultLLM": "ministral-14b",
    "defaultAgent": "goose-mind"
  }
}'::jsonb, 'system')
ON CONFLICT (environment) DO NOTHING;

-- Platform config history for audit trail
CREATE TABLE IF NOT EXISTS platform_config_history (
    id SERIAL PRIMARY KEY,
    environment VARCHAR(50) NOT NULL,
    config JSONB NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by VARCHAR(100),
    change_type VARCHAR(50), -- 'update', 'reset', 'toggle'
    change_summary TEXT
);

-- Trigger to log config changes
CREATE OR REPLACE FUNCTION log_platform_config_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO platform_config_history (
        environment, config, changed_by, change_type, change_summary
    )
    VALUES (
        NEW.environment,
        NEW.config,
        NEW.updated_by,
        'update',
        'Configuration updated'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS platform_config_audit ON platform_config;
CREATE TRIGGER platform_config_audit
    AFTER UPDATE ON platform_config
    FOR EACH ROW
    EXECUTE FUNCTION log_platform_config_change();

-- Feature flags table (existing, for reference)
CREATE TABLE IF NOT EXISTS feature_flags (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'production',
    flags JSONB NOT NULL DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Service health history
CREATE TABLE IF NOT EXISTS service_health_history (
    id SERIAL PRIMARY KEY,
    service_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latency_ms INTEGER,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_service_health_service ON service_health_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_health_time ON service_health_history(checked_at DESC);

-- Cleanup old health records (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_records()
RETURNS void AS $$
BEGIN
    DELETE FROM service_health_history
    WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
