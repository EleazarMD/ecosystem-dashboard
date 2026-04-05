-- Child Accounts & Parental Controls Schema
-- Run this in PostgreSQL to add child account support
-- Part of the AI Homelab Family Safety System

-- ============================================================
-- Extend Users Table for Child Account Support
-- ============================================================

-- Add child account columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'adult' 
    CHECK (account_type IN ('adult', 'child'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_controls JSONB DEFAULT NULL;

-- Index for finding children by parent
CREATE INDEX IF NOT EXISTS idx_users_parent ON users(parent_user_id) WHERE parent_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- ============================================================
-- Parental Controls Configuration Table
-- ============================================================

CREATE TABLE IF NOT EXISTS parental_controls_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Service Access Controls
    allowed_services JSONB DEFAULT '[]'::jsonb,  -- List of service IDs child can access
    blocked_services JSONB DEFAULT '[]'::jsonb,  -- Explicitly blocked services
    
    -- AI Conversation Guardrails
    content_filter_level VARCHAR(20) DEFAULT 'strict' 
        CHECK (content_filter_level IN ('strict', 'moderate', 'standard')),
    blocked_topics JSONB DEFAULT '["violence", "adult_content", "gambling", "drugs", "weapons"]'::jsonb,
    allowed_topics JSONB DEFAULT '["education", "homework", "creative_writing", "science", "math", "coding"]'::jsonb,
    max_conversation_length INT DEFAULT 50,  -- Max messages per conversation
    
    -- Time Restrictions
    daily_usage_limit_minutes INT DEFAULT 120,  -- 2 hours default
    allowed_hours_start TIME DEFAULT '08:00',
    allowed_hours_end TIME DEFAULT '21:00',
    allowed_days JSONB DEFAULT '["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]'::jsonb,
    
    -- Approval Requirements
    require_approval_for_new_conversations BOOLEAN DEFAULT false,
    require_approval_for_image_generation BOOLEAN DEFAULT true,
    require_approval_for_external_links BOOLEAN DEFAULT true,
    require_approval_for_data_export BOOLEAN DEFAULT true,
    
    -- Monitoring Settings
    log_all_conversations BOOLEAN DEFAULT true,
    send_daily_activity_report BOOLEAN DEFAULT true,
    alert_on_blocked_content BOOLEAN DEFAULT true,
    parent_can_view_conversations BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_parental_controls_child ON parental_controls_config(child_user_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_parent ON parental_controls_config(parent_user_id);

-- ============================================================
-- Child Activity Log (for parental monitoring)
-- ============================================================

CREATE TABLE IF NOT EXISTS child_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type VARCHAR(50) NOT NULL,  -- 'conversation', 'service_access', 'blocked_attempt', 'login', 'logout'
    service_id VARCHAR(100),
    conversation_id UUID,
    
    -- Content (for conversations)
    user_message TEXT,
    ai_response TEXT,
    was_filtered BOOLEAN DEFAULT false,
    filter_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_activity_user ON child_activity_log(child_user_id);
CREATE INDEX IF NOT EXISTS idx_child_activity_type ON child_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_child_activity_date ON child_activity_log(created_at);

-- ============================================================
-- Parental Approval Requests
-- ============================================================

CREATE TABLE IF NOT EXISTS parental_approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Request Details
    request_type VARCHAR(50) NOT NULL,  -- 'service_access', 'conversation', 'image_generation', 'data_export', 'settings_change'
    request_data JSONB NOT NULL,  -- Details of what's being requested
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
    
    -- Response
    responded_at TIMESTAMP WITH TIME ZONE,
    response_note TEXT,
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_child ON parental_approval_requests(child_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_parent ON parental_approval_requests(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON parental_approval_requests(status);

-- ============================================================
-- Content Filter Rules (for AI guardrails)
-- ============================================================

CREATE TABLE IF NOT EXISTS content_filter_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule Definition
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('blocked_phrase', 'blocked_topic', 'blocked_pattern', 'allowed_override')),
    pattern TEXT NOT NULL,  -- Regex pattern or exact phrase
    is_regex BOOLEAN DEFAULT false,
    
    -- Applicability
    filter_level VARCHAR(20)[] DEFAULT ARRAY['strict', 'moderate'],  -- Which levels this applies to
    applies_to VARCHAR(20) DEFAULT 'all' CHECK (applies_to IN ('all', 'input', 'output')),
    
    -- Action
    action VARCHAR(20) DEFAULT 'block' CHECK (action IN ('block', 'warn', 'log', 'replace')),
    replacement_text TEXT,  -- For 'replace' action
    
    -- Metadata
    category VARCHAR(50),  -- 'violence', 'adult', 'profanity', etc.
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,  -- System rules cannot be deleted
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filter_rules_type ON content_filter_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_filter_rules_level ON content_filter_rules USING GIN(filter_level);
CREATE INDEX IF NOT EXISTS idx_filter_rules_active ON content_filter_rules(is_active);

-- ============================================================
-- Insert Default Content Filter Rules
-- ============================================================

INSERT INTO content_filter_rules (rule_name, rule_type, pattern, is_regex, filter_level, category, severity, description, is_system) VALUES
-- Violence
('explicit_violence', 'blocked_topic', 'graphic violence|gore|torture|murder instructions', true, ARRAY['strict', 'moderate'], 'violence', 'high', 'Blocks explicit violence content', true),
('weapons_instructions', 'blocked_topic', 'how to make.*weapon|bomb making|gun assembly', true, ARRAY['strict', 'moderate', 'standard'], 'weapons', 'critical', 'Blocks weapon creation instructions', true),

-- Adult Content
('adult_content', 'blocked_topic', 'sexual content|explicit|pornographic|nsfw', true, ARRAY['strict', 'moderate'], 'adult', 'high', 'Blocks adult/sexual content', true),
('dating_advice', 'blocked_topic', 'dating tips|romantic relationship|flirting', true, ARRAY['strict'], 'adult', 'medium', 'Blocks dating/romance topics for strict mode', true),

-- Drugs & Substances
('drug_use', 'blocked_topic', 'how to use drugs|drug recipes|getting high', true, ARRAY['strict', 'moderate'], 'drugs', 'high', 'Blocks drug use content', true),
('alcohol', 'blocked_topic', 'drinking games|alcohol recipes|getting drunk', true, ARRAY['strict'], 'drugs', 'medium', 'Blocks alcohol content for strict mode', true),

-- Gambling
('gambling', 'blocked_topic', 'betting strategies|casino tips|gambling', true, ARRAY['strict', 'moderate'], 'gambling', 'medium', 'Blocks gambling content', true),

-- Self-Harm
('self_harm', 'blocked_topic', 'self harm|suicide methods|cutting yourself', true, ARRAY['strict', 'moderate', 'standard'], 'self_harm', 'critical', 'Blocks self-harm content', true),

-- Profanity (basic)
('profanity_severe', 'blocked_phrase', 'f**k|s**t|a**hole', true, ARRAY['strict'], 'profanity', 'medium', 'Blocks severe profanity', true),

-- Personal Information
('personal_info_request', 'blocked_pattern', 'what is your (address|phone|social security|credit card)', true, ARRAY['strict', 'moderate'], 'privacy', 'high', 'Blocks requests for personal info', true),

-- Bypassing Restrictions
('jailbreak_attempt', 'blocked_pattern', 'ignore previous instructions|pretend you are|act as if you have no restrictions', true, ARRAY['strict', 'moderate', 'standard'], 'security', 'critical', 'Blocks jailbreak attempts', true)

ON CONFLICT DO NOTHING;

-- ============================================================
-- Child-Specific Role
-- ============================================================

INSERT INTO roles (id, name, description, level, permissions, is_system) VALUES
('child-user', 'Child User', 'Restricted user account for minors with parental controls', 'tenant',
 '["tenant:config:view", "feature:workspace:use", "data:read"]'::jsonb,
 true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Daily Usage Tracking for Children
-- ============================================================

CREATE TABLE IF NOT EXISTS child_daily_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Usage Metrics
    total_minutes INT DEFAULT 0,
    conversation_count INT DEFAULT 0,
    message_count INT DEFAULT 0,
    blocked_attempts INT DEFAULT 0,
    
    -- Service Usage (JSONB for flexibility)
    service_usage JSONB DEFAULT '{}'::jsonb,  -- {"workspace": 30, "goosemind": 45}
    
    -- Timestamps
    first_activity_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(child_user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_child_usage_user_date ON child_daily_usage(child_user_id, usage_date);

-- ============================================================
-- Functions for Child Account Management
-- ============================================================

-- Function to check if user is within allowed hours
CREATE OR REPLACE FUNCTION is_within_allowed_hours(child_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    config_record RECORD;
    current_time_val TIME;
    current_day TEXT;
BEGIN
    SELECT * INTO config_record FROM parental_controls_config WHERE child_user_id = child_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN true;  -- No restrictions if no config
    END IF;
    
    current_time_val := CURRENT_TIME;
    current_day := LOWER(TO_CHAR(CURRENT_DATE, 'day'));
    current_day := TRIM(current_day);
    
    -- Check if current day is allowed
    IF NOT (config_record.allowed_days ? current_day) THEN
        RETURN false;
    END IF;
    
    -- Check if current time is within allowed hours
    IF current_time_val < config_record.allowed_hours_start OR current_time_val > config_record.allowed_hours_end THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to check daily usage limit
CREATE OR REPLACE FUNCTION is_within_daily_limit(child_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    config_record RECORD;
    usage_record RECORD;
BEGIN
    SELECT * INTO config_record FROM parental_controls_config WHERE child_user_id = child_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN true;  -- No restrictions if no config
    END IF;
    
    SELECT * INTO usage_record FROM child_daily_usage 
    WHERE child_user_id = child_id AND usage_date = CURRENT_DATE;
    
    IF NOT FOUND THEN
        RETURN true;  -- No usage yet today
    END IF;
    
    RETURN usage_record.total_minutes < config_record.daily_usage_limit_minutes;
END;
$$ LANGUAGE plpgsql;

-- Function to log child activity
CREATE OR REPLACE FUNCTION log_child_activity(
    p_child_user_id UUID,
    p_activity_type VARCHAR(50),
    p_service_id VARCHAR(100) DEFAULT NULL,
    p_conversation_id UUID DEFAULT NULL,
    p_user_message TEXT DEFAULT NULL,
    p_ai_response TEXT DEFAULT NULL,
    p_was_filtered BOOLEAN DEFAULT false,
    p_filter_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO child_activity_log (
        child_user_id, activity_type, service_id, conversation_id,
        user_message, ai_response, was_filtered, filter_reason, metadata
    ) VALUES (
        p_child_user_id, p_activity_type, p_service_id, p_conversation_id,
        p_user_message, p_ai_response, p_was_filtered, p_filter_reason, p_metadata
    ) RETURNING id INTO new_id;
    
    -- Update daily usage
    INSERT INTO child_daily_usage (child_user_id, usage_date, message_count, last_activity_at)
    VALUES (p_child_user_id, CURRENT_DATE, 1, NOW())
    ON CONFLICT (child_user_id, usage_date) 
    DO UPDATE SET 
        message_count = child_daily_usage.message_count + 1,
        last_activity_at = NOW(),
        blocked_attempts = CASE WHEN p_was_filtered THEN child_daily_usage.blocked_attempts + 1 ELSE child_daily_usage.blocked_attempts END;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Trigger to update parental_controls on users table
-- ============================================================

CREATE OR REPLACE FUNCTION sync_parental_controls_to_user()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET parental_controls = jsonb_build_object(
        'content_filter_level', NEW.content_filter_level,
        'daily_usage_limit_minutes', NEW.daily_usage_limit_minutes,
        'allowed_services', NEW.allowed_services,
        'require_approval_for_image_generation', NEW.require_approval_for_image_generation
    ),
    updated_at = NOW()
    WHERE id = NEW.child_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_parental_controls ON parental_controls_config;
CREATE TRIGGER trigger_sync_parental_controls
    AFTER INSERT OR UPDATE ON parental_controls_config
    FOR EACH ROW
    EXECUTE FUNCTION sync_parental_controls_to_user();

-- ============================================================
-- View for Parent Dashboard
-- ============================================================

CREATE OR REPLACE VIEW child_account_summary AS
SELECT 
    u.id as child_id,
    u.name as child_name,
    u.email as child_email,
    u.date_of_birth,
    u.status,
    u.last_login_at,
    p.name as parent_name,
    p.id as parent_id,
    pc.content_filter_level,
    pc.daily_usage_limit_minutes,
    pc.is_active as controls_active,
    COALESCE(du.total_minutes, 0) as today_usage_minutes,
    COALESCE(du.message_count, 0) as today_message_count,
    COALESCE(du.blocked_attempts, 0) as today_blocked_attempts,
    (SELECT COUNT(*) FROM parental_approval_requests WHERE child_user_id = u.id AND status = 'pending') as pending_approvals
FROM users u
JOIN users p ON u.parent_user_id = p.id
LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
LEFT JOIN child_daily_usage du ON du.child_user_id = u.id AND du.usage_date = CURRENT_DATE
WHERE u.account_type = 'child';

COMMENT ON VIEW child_account_summary IS 'Summary view for parents to monitor their children accounts';

-- ============================================================
-- Push Subscriptions for Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_data JSONB NOT NULL,  -- Web Push subscription object
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, subscription_data)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id) WHERE is_active = true;

-- ============================================================
-- User Notifications (for in-app notification center)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    url VARCHAR(500),
    icon VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_date ON user_notifications(created_at DESC);
