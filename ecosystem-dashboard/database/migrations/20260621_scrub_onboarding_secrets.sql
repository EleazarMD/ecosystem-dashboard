-- ============================================================================
-- Scrub pre-existing cleartext secrets from onboarding job/step data
-- ----------------------------------------------------------------------------
-- The security hardening pass added deepRedactSecrets() to the provisioning
-- pipeline so that NEW writes redact sensitive keys before persistence. Rows
-- written BEFORE that pass may still contain cleartext IMAP app passwords,
-- API keys, and other credentials in:
--
--   onboarding_jobs.form_data  (JSONB)
--   onboarding_jobs.result      (JSONB)
--   onboarding_steps.result     (JSONB)
--
-- This migration walks every existing row, recursively redacts sensitive keys
-- (matching the same pattern as the TypeScript helper), and updates the rows
-- in place. It also records the scrub to audit_log.
--
-- SAFE TO RE-RUN: idempotent — already-redacted values are not re-touched.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: recursively redact sensitive keys in a JSONB value.
-- Matches keys case-insensitively against:
--   password | app_password | app-password | apiKey | api_key | api-key
--   secret | token | credential | client_secret | client-secret
-- String values at those keys are replaced with '[REDACTED]'.
-- Non-string values (booleans, numbers, nulls) are left as-is.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION redact_jsonb_secrets(input jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb := '{}'::jsonb;
    key text;
    val jsonb;
    key_lower text;
BEGIN
    IF input IS NULL THEN
        RETURN NULL;
    END IF;

    IF jsonb_typeof(input) = 'object' THEN
        FOR key, val IN SELECT * FROM jsonb_each(input) LOOP
            key_lower := lower(key);
            -- Check if the key matches sensitive patterns
            IF jsonb_typeof(val) = 'string'
               AND (
                   key_lower LIKE '%password%'
                   OR key_lower LIKE '%app_password%'
                   OR key_lower LIKE '%app-password%'
                   OR key_lower LIKE '%api_key%'
                   OR key_lower LIKE '%api-key%'
                   OR key_lower LIKE '%apikey%'
                   OR key_lower LIKE '%secret%'
                   OR key_lower LIKE '%token%'
                   OR key_lower LIKE '%credential%'
                   OR key_lower LIKE '%client_secret%'
                   OR key_lower LIKE '%client-secret%'
               )
               AND val #>> '{}' != '[REDACTED]'
            THEN
                result := result || jsonb_build_object(key, '[REDACTED]'::jsonb);
            ELSE
                -- Recurse into nested objects and arrays
                result := result || jsonb_build_object(key, redact_jsonb_secrets(val));
            END IF;
        END LOOP;
        RETURN result;

    ELSIF jsonb_typeof(input) = 'array' THEN
        SELECT jsonb_agg(redact_jsonb_secrets(elem)) INTO result
        FROM jsonb_array_elements(input) AS elem;
        RETURN COALESCE(result, '[]'::jsonb);

    ELSE
        -- Scalar (string, number, boolean, null) — return as-is
        RETURN input;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 1. Scrub onboarding_jobs.form_data
-- ---------------------------------------------------------------------------

UPDATE onboarding_jobs
SET form_data = redact_jsonb_secrets(form_data),
    updated_at = now()
WHERE form_data::text != redact_jsonb_secrets(form_data)::text;

-- ---------------------------------------------------------------------------
-- 2. Scrub onboarding_jobs.result
-- ---------------------------------------------------------------------------

UPDATE onboarding_jobs
SET result = redact_jsonb_secrets(result),
    updated_at = now()
WHERE result::text != redact_jsonb_secrets(result)::text;

-- ---------------------------------------------------------------------------
-- 3. Scrub onboarding_steps.result
-- ---------------------------------------------------------------------------

UPDATE onboarding_steps
SET result = redact_jsonb_secrets(result),
    updated_at = now()
WHERE result::text != redact_jsonb_secrets(result)::text;

-- ---------------------------------------------------------------------------
-- 4. Record the scrub in audit_log
-- ---------------------------------------------------------------------------

INSERT INTO audit_log (action, user_id, metadata, created_at)
VALUES (
    'security:secrets_scrubbed',
    NULL,
    jsonb_build_object(
        'migration', '20260621_scrub_onboarding_secrets',
        'description', 'Backfill migration: redacted cleartext secrets from onboarding_jobs.form_data, onboarding_jobs.result, and onboarding_steps.result',
        'timestamp', now()
    ),
    now()
);

-- ---------------------------------------------------------------------------
-- 5. Verification helper (run manually after migration to confirm)
-- ---------------------------------------------------------------------------
-- This query should return 0 after the migration:
--
-- SELECT count(*) FROM onboarding_jobs
-- WHERE form_data::text ~* '(app[_-]?password|api[_-]?key|apikey|secret|credential|client[_-]?secret)"\s*:\s*"(?!\[REDACTED\])[^"]+"';
--
-- SELECT count(*) FROM onboarding_steps
-- WHERE result::text ~* '(app[_-]?password|api[_-]?key|apikey|secret|credential|client[_-]?secret)"\s*:\s*"(?!\[REDACTED\])[^"]+"';

COMMIT;
