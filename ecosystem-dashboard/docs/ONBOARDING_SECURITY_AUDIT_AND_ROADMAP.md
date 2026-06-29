# Onboarding & Auth — Security Audit, Fixes, and Roadmap

> **Scope:** Multi-tenant / multi-user isolation and JIT zero-tolerance alignment
> across the unified onboarding pipeline, auth endpoints, unified token layer,
> and client registry — spanning Dashboard (web), Hyperspace iOS, Atlas IDE, and
> CLI/service clients.
>
> **Audience:** The next engineer/agent picking this up. Everything in
> **§3 Roadmap** is actionable and prioritized.

---

## 1. Audit Findings

Severity: **C** critical · **H** high · **M** medium.

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| 1 | C | **IDOR on job status** — `getJobStatus(jobId)` had no user scope; any authed user could read any job's data by enumerating `jobId`. | `onboarding-service.ts`, `api/onboarding/index.ts` |
| 2 | C | **Plaintext secrets at rest** — `onboarding_jobs.form_data` persisted IMAP app passwords + API keys in cleartext. | `onboarding-service.ts` |
| 3 | C | **Tenant spoofing** — `body.tenantId` was trusted with no membership check; provisioning could be attached to another tenant. | `api/onboarding/index.ts` |
| 4 | C | **Privilege escalation via `targetTier`** — `signup`/`provision` accepted arbitrary tier; a free user could self-grant `admin`. | `api/auth/signup.ts`, `api/onboarding/index.ts` |
| 5 | H | **Revoked clients could still refresh** — `refresh.ts` never checked `client_registrations.is_active`. | `api/auth/refresh.ts` |
| 6 | H | **`zeroToleranceAck` never enforced/recorded** — collected then dropped. | `onboarding-service.ts` |
| 7 | H | **Provisioning bypasses the approval engine** — tenant/subscription/credential actions (Tier 3 equiv.) had no JIT gate. | pipeline + `pi-agent-hub/src/security/approval.ts` |
| 8 | M | **`clients.ts` didn't accept unified JWT** — iOS/Atlas forced onto weaker `X-Client`+`X-User-ID` path; also had dead/broken `resolveUserId` referencing out-of-scope `res`. | `api/onboarding/clients.ts` |
| 9 | M | **Atlas IDE has no documented auth flow** — `clientType: 'atlas'` + `device-pairing` exist with no endpoint/docs. | unified-token + missing endpoint |
| 10 | M | **No access-token revocation** — access tokens have no `jti`/deny-list; revocation only bites at refresh time (≤1h window). | `unified-token.ts`, `refresh.ts` |

---

## 2. What This Pass Fixed (Done)

All deny-by-default; verified against existing call sites.

- **[#1] Job isolation** — `getJobStatus(jobId, userId?)` filters by `user_id`; `GET /status` passes the caller's id → cross-user reads return `404`.
- **[#2] Secret redaction at rest** — `deepRedactSecrets()` deep-redacts keys matching `password|app_password|api_key|secret|token|credential|client_secret` before **every** Postgres write (`form_data`, step `result`, job `result`). The original object is untouched, so steps still get real secrets in-memory; secrets persist only in Infisical.
- **[#3] Tenant-membership guard** — `/provision` honors a supplied `tenantId` only if the caller is an active member (or platform admin), else `403`.
- **[#4] Tier-authority guard** — new `resolveGrantableTier()` / `isPrivilegedTier()` in `subscription-tiers.ts`. `admin` requires platform-admin authority (verified from `users.platform_role` in DB, not the token). Used by `/provision` and `/signup` → `403` on violation. Also blocks `triggeredBy` spoofing.
- **[#5] Refresh revocation** — `refresh.ts` rejects (`401 Client revoked or not registered`) when the token's `clientId` has no active `client_registrations` row.
- **[#6] Zero-tolerance ack** — recorded to `audit_log` as `security:zero_tolerance_ack` and surfaced on the `security_validation` step result.
- **[#8] Unified JWT in `clients.ts`** — now accepts the Bearer JWT; removed the dead/broken `resolveUserId` and the stray mid-file import.

Docs updated: `UNIFIED_ONBOARDING_ARCHITECTURE.md` (new **Security & Multi-Tenant Isolation** section), `cig/docs/IOS_INTEGRATION_CONTRACT.md` (error contracts + security notes).

---

## 3. Roadmap (Next Agent)

### P0 — Do First (data exposure / correctness)

1. **Scrub already-stored secrets (backfill migration).**
   Redaction only applies going forward. Rows written **before** this pass may still contain cleartext secrets.
   - Add `database/migrations/<date>_redact_onboarding_secrets.sql`.
   - For each row in `onboarding_jobs` (and `onboarding_steps.result`), JSON-walk `form_data`/`result` and null/redact sensitive keys (`*password*`, `*api*key*`, `*secret*`, `*token*`, `*credential*`).
   - Do it in a transaction; snapshot row count before/after; log to `audit_log`.
   - **Verify:** `SELECT count(*) FROM onboarding_jobs WHERE form_data::text ~* '(app[_-]?password|api[_-]?key)"\s*:\s*"[^"]+"';` returns 0 (excluding `[REDACTED]`).

2. **Regression tests for the fixes in §2.** None exist yet. Add API-level tests:
   - IDOR: user B gets `404` for user A's `jobId`.
   - Tenant spoof: non-member `tenantId` → `403`.
   - Tier escalation: `targetTier: 'admin'` from non-admin → `403` (both signup + provision).
   - Refresh revocation: deactivate client → refresh → `401`.
   - Redaction: provision with an app password → assert `onboarding_jobs.form_data` contains `[REDACTED]`, not the secret.
   - Suggested home: `ecosystem-dashboard/__tests__/api/onboarding/*.test.ts` (check for an existing test runner first; wire one up if absent).

### P1 — JIT Zero-Tolerance Integration ✅ COMPLETED

3. **Approval-gate cross-user / privileged provisioning.** ✅
   Integrated via `src/lib/platform/approval-client.ts` — a dashboard-side bridge to the approval-service (port 8810).
   - `needsProvisioningApproval()` returns true when a platform admin provisions for another user (cross-user) or grants a privileged tier (admin).
   - `requestProvisioningApproval()` submits to approval-service; returns 202 with `approvalId` when pending, 403 on denial.
   - `GET /api/onboarding?action=approval&approvalId=...` polls approval status.
   - Self-service provisioning (own account, standard tier) stays inline — no approval needed.
   - Files: `src/lib/platform/approval-client.ts`, `src/pages/api/onboarding/index.ts`.

4. **Access-token revocation (deny-list).** ✅
   - `issueAccessToken()` now includes a `jti` (unique token ID), matching refresh tokens.
   - New `revoked_tokens` table (migration: `database/migrations/20260621_revoked_tokens.sql`).
   - `verifyTokenWithRevocation()` in `unified-token.ts` checks the deny-list via a callback.
   - Onboarding API now uses `verifyTokenWithRevocation` for Bearer token auth.
   - `DELETE /api/onboarding/clients` inserts the client's jti into `revoked_tokens` on deactivation.
   - New `POST /api/auth/revoke` endpoint for explicit token/client revocation (logout).
   - Files: `src/lib/platform/unified-token.ts`, `src/pages/api/onboarding/index.ts`, `src/pages/api/onboarding/clients.ts`, `src/pages/api/auth/revoke.ts`.

5. **Short-lived, scoped secrets instead of long-lived app passwords.** ✅
   - New `src/lib/platform/scoped-secrets.ts`: `issueScopedSecretToken()`, `verifyScopedSecretToken()`, `hasScope()`, `deriveSecretPath()`, `deriveScopes()`.
   - Scoped tokens are JWTs with `type: 'scoped_secret'`, 1h TTL, and scoped permissions (e.g. `imap:read`, `llm:infer`).
   - `executeProvisionInfisical` now issues a scoped token and passes `imap_scoped_token` to CIG instead of the raw `imap_app_password` when available.
   - Real secrets stay in Infisical; CIG fetches them at runtime using the scoped token.
   - Files: `src/lib/platform/scoped-secrets.ts`, `src/lib/platform/onboarding-service.ts`.

6. **Enforce `zeroToleranceAck`.** ✅
   - `executeSecurityValidation` now fails provisioning when `zeroToleranceAck !== true` and `REQUIRE_ZERO_TOLERANCE_ACK` env is not `'false'` (fail-closed by default).
   - Audit log records `enforced: true/false` alongside the acknowledgment.
   - Set `REQUIRE_ZERO_TOLERANCE_ACK=false` for dev/test environments to opt out.
   - Files: `src/lib/platform/onboarding-service.ts`.

**P1 Regression tests:** `src/__tests__/unit/onboarding-p1-security.test.ts` — 32 tests covering all P1 items (approval gating, revocation, scoped secrets, zeroToleranceAck). P0 tests updated and passing (57 total).

### P2 — Defense-in-Depth & Platform Coverage (COMPLETED)

7. **Postgres Row-Level Security (RLS)** — ✅ Completed.
   - Migration: `database/migrations/20260621_rls_policies.sql` — enables RLS on `onboarding_jobs`, `onboarding_steps`, `client_registrations`, `user_feature_access`, `tenant_memberships`, `revoked_tokens`.
   - Policies use `current_setting('app.current_user_id')` for user-scoped tables and `bypass_rls` for platform-admin.
   - Helper: `src/lib/platform/rls-helper.ts` — `setRLSContext()` and `withRLS()` for setting session variables per DB connection/transaction.

8. **Atlas IDE device-pairing endpoint** — ✅ Completed.
   - New endpoint: `src/pages/api/auth/device-pairing.ts` — implements 4-step flow: `request` (IDE gets 6-char code), `approve` (user approves in Dashboard), `exchange` (IDE exchanges approved code for unified JWT with `clientType: 'atlas'`), `status` (check pairing state).
   - 5-minute TTL on pairing codes, rate-limited (5 requests/IP/15min).
   - Auto-creates `device_pairing_codes` table with status tracking.
   - Registers Atlas client in `client_registrations` on exchange.

9. **Migrate Python services to verify unified JWT + enforce tenant_id** — ✅ Completed.
   - **CIG** (`services/cig/security.py`): Already verifies unified JWT via `unified_token.py`. Added `make_jti_revocation_checker()` for DB-backed JTI deny-list. Added `require_tenant` FastAPI dependency for tenant-scoped endpoints.
   - **CIG** (`services/cig/unified_token.py`): `verify_token()` now accepts optional `revocation_checker` callback for JTI deny-list checking.
   - **Nova** (`services/nova-agent/.../nova/user_context.py`): Already verifies unified JWT. Added `_make_jti_checker()` for JTI revocation checking. `resolve_user()` now passes revocation checker to `verify_token()`.
   - **PCG** (`services/personal-kg/.../pic_routes.py`): Already verifies unified JWT. Added `_make_jti_checker()` and wired into `_resolve_user_id()`.
   - **Pi Workspace** (`services/pi-workspace/src/server/unified-jwt.ts`): Added `jti` field to payload interface and optional `revocationChecker` parameter to `verifyUnifiedToken()`. `index.ts` preHandler uses in-memory cached JTI deny-list (refreshed every 60s) for revocation checking.

10. **Rate limiting on signup, mobile-login, refresh** — ✅ Completed.
    - New module: `src/lib/platform/rate-limiter.ts` — in-memory rate limiter with per-IP and per-key tracking, automatic cleanup of expired entries.
    - Limits: signup 5/IP/15min, mobile-login 10/IP/15min, refresh 30/IP/15min, device-pairing 5/IP/15min.
    - Applied to: `src/pages/api/auth/signup.ts`, `src/pages/api/auth/mobile-login.ts`, `src/pages/api/auth/refresh.ts`, `src/pages/api/auth/device-pairing.ts`.

11. **CORS tightening** — ✅ Completed.
    - `src/pages/api/auth/refresh.ts`: Replaced `Access-Control-Allow-Origin: *` with allowlist based on `ALLOWED_ORIGINS` env var. Dev fallback allows localhost. Adds `Vary: Origin` header.
    - `src/pages/api/auth/mobile-login.ts`: Same CORS tightening applied.

**P2 Regression tests:** `src/__tests__/unit/onboarding-p2-security.test.ts` — 20 tests covering rate limiter (7), CORS tightening (3), device-pairing endpoint (6), and RLS helper (4). All 77 tests (P0+P1+P2) passing.

---

## 4. Verification Cheatsheet

```bash
# Type-check the dashboard (run from the dashboard project root)
npx tsc --noEmit

# After P0.1 migration — confirm no cleartext secrets remain
psql "$DATABASE_URL" -c "SELECT count(*) FROM onboarding_jobs \
  WHERE form_data::text ~* '(app[_-]?password|api[_-]?key|client[_-]?secret)\"\\s*:\\s*\"(?!\\[REDACTED\\])[^\"]+\"';"

# Smoke: cross-user job read should 404 (replace tokens/jobId)
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $USER_B_TOKEN" \
  "$BASE/api/onboarding?action=status&jobId=$USER_A_JOB"   # expect 404

# Smoke: self-assign admin should 403
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"name":"x","email":"x@y.z","password":"password123","targetTier":"admin"}'  # expect 403
```

---

## 5. Touchpoints (file index)

| File | Role |
|------|------|
| `src/lib/platform/onboarding-service.ts` | Pipeline, `deepRedactSecrets`, `getJobStatus(jobId,userId)`, ack recording |
| `src/lib/platform/unified-token.ts` | Token schema/issue/verify (add `jti` + deny-list here for P1.4) |
| `src/lib/subscription-tiers.ts` | `resolveGrantableTier`, `isPrivilegedTier`, `PRIVILEGED_TIERS` |
| `src/pages/api/onboarding/index.ts` | Provision/status/jobs/services; membership + tier guards |
| `src/pages/api/onboarding/clients.ts` | Client registry; unified-JWT auth; revocation point (DELETE) |
| `src/pages/api/auth/signup.ts` | Signup; tier guard |
| `src/pages/api/auth/refresh.ts` | Refresh; revocation enforcement; CORS allowlist (P2.11); rate limiting (P2.10) |
| `src/pages/api/auth/mobile-login.ts` | Mobile login; CORS allowlist (P2.11); rate limiting (P2.10) |
| `src/pages/api/auth/signup.ts` | Signup; tier guard; rate limiting (P2.10) |
| `src/pages/api/auth/device-pairing.ts` | Atlas IDE device-pairing flow (P2.8) |
| `src/lib/platform/rate-limiter.ts` | In-memory rate limiter module (P2.10) |
| `src/lib/platform/rls-helper.ts` | RLS session variable helpers (P2.7) |
| `database/migrations/20260621_rls_policies.sql` | RLS policies migration (P2.7) |
| `services/cig/unified_token.py` | Python unified JWT — revocation_checker support (P2.9) |
| `services/cig/security.py` | CIG auth — JTI revocation + require_tenant (P2.9) |
| `services/nova-agent/.../nova/user_context.py` | Nova user resolution — JTI revocation (P2.9) |
| `services/personal-kg/.../pic_routes.py` | PCG auth — JTI revocation (P2.9) |
| `services/pi-workspace/src/server/unified-jwt.ts` | Pi Workspace JWT — revocationChecker (P2.9) |
| `src/__tests__/unit/onboarding-p2-security.test.ts` | P2 regression tests (20 tests) |
| `services/pi-agent-hub/src/security/approval.ts` | JIT approval engine to integrate (P1.3) |
| `services/cig/docs/IOS_INTEGRATION_CONTRACT.md` | iOS client contract (error/security sections updated) |
| `docs/UNIFIED_ONBOARDING_ARCHITECTURE.md` | Architecture + security model |
