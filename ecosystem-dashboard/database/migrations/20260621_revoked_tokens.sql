-- ============================================================================
-- Revoked Tokens Table (P1.4 — Access-token jti deny-list)
-- ----------------------------------------------------------------------------
-- Access tokens now carry a `jti` (unique token ID). When a client is
-- deactivated (DELETE /api/onboarding/clients) or a user logs out, the
-- token's jti is inserted here so that verifyTokenWithRevocation() can
-- reject it immediately — closing the ≤1h window where a stolen access
-- token would still be valid.
--
-- Rows are cleaned up automatically after `exp` passes (see cleanup
-- function at the bottom) to keep the table small.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti         TEXT PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id   TEXT,
    exp         TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason      TEXT NOT NULL DEFAULT 'client_deactivated'
);

CREATE INDEX IF NOT EXISTS idx_revoked_tokens_user ON revoked_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_client ON revoked_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_revoked_tokens_exp ON revoked_tokens(exp);

-- Cleanup function: delete expired revocation records (safe to cron)
CREATE OR REPLACE FUNCTION cleanup_revoked_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM revoked_tokens WHERE exp < now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
