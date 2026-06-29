# Unified Onboarding & Client Registry Architecture

> **Status:** Implemented 2026-06-21 · Security hardening pass applied (multi-tenant isolation + JIT zero-tolerance alignment)
> **Database:** `ecosystem_unified` (PostgreSQL)
> **Migration:** `database/migrations/20260621_unified_onboarding_and_client_registry.sql`
> **See also:** `docs/ONBOARDING_SECURITY_AUDIT_AND_ROADMAP.md` for the full audit, what was fixed, and remaining roadmap.

## Overview

Unifies user onboarding, client registration, subscription tier assignment, and service catalog discovery across all platforms (iOS, Dashboard, Atlas IDE, CLI, service-to-service). Every client — regardless of platform — goes through the same signup → tenant creation → subscription assignment → provisioning pipeline, and receives a unified JWT containing client type, platform, tenant context, and feature flags.

## Data Model

### New Tables

| Table | Purpose |
|-------|---------|
| `client_registrations` | Tracks all connected clients per user (iOS, Dashboard, Atlas, CLI, service) with platform, capabilities, push tokens, and auth method |
| `service_catalog` | Backend services self-register with capabilities, ports, health endpoints, feature flags, dependencies, and provisioning config |
| `onboarding_jobs` | Tracks provisioning pipeline state per user/tenant with form data, target tier, progress, and result |
| `onboarding_steps` | Individual step status within a job (create_tenant, assign_subscription, provision_infisical, enroll_cig, etc.) |

### Existing Tables (unchanged)

- `users` — User accounts (UUID PK, email, name, password_hash, platform_role, account_type)
- `tenants` — Tenant workspaces (UUID PK, name, slug, status)
- `tenant_memberships` — User→tenant mapping with role
- `user_feature_access` — Subscription tier + purchased add-ons + admin granted/revoked features
- `subscription_plans` — Plan definitions with pricing and limits
- `user_devices` / `mobile_devices` — Push notification device registration (backward compat)

### Views

- `v_user_clients` — Active clients per user with email and name
- `v_onboarding_job_summary` — Job status with step counts (completed/failed/pending/in_progress)
- `v_service_catalog_with_deps` — Service catalog with resolved dependency names

## Unified Auth Token

### Schema (TypeScript + Python mirrors)

**TypeScript:** `src/lib/platform/unified-token.ts`
**Python:** `services/cig/unified_token.py`

Every JWT now contains:

```json
{
  "sub": "dfd9379f-a9cd-4241-99e7-140f5e89e3cd",
  "userId": "dfd9379f-a9cd-4241-99e7-140f5e89e3cd",
  "email": "eleazarf@mac.com",
  "name": "Eleazar",
  "platformRole": "platform-admin",
  "accountType": "admin",
  "tenantId": "uuid-here",
  "tenantSlug": "eleazar",
  "tenantRole": "tenant-admin",
  "subscriptionTier": "admin",
  "features": ["email", "calendar", "chat", "ai-research", ...],
  "clientType": "ios",
  "platform": "ios",
  "clientId": "Hyperspace-iOS",
  "authMethod": "jwt",
  "type": "access",
  "iat": 1718900000,
  "exp": 1718903600,
  "iss": "mobile-login"
}
```

### Client Types

| Type | Description | Example |
|------|-------------|---------|
| `ios` | Hyperspace iOS app | `X-Client: Hyperspace-iOS` |
| `dashboard` | Ecosystem Dashboard (Next.js web) | NextAuth session |
| `atlas` | Atlas IDE / PiCode extension | `X-Client: PiCode` |
| `cli` | Command-line tool | CLI auth |
| `service` | Backend service (S2S) | API key auth |
| `android` | Android app (future) | — |
| `macos` | macOS app (future) | `X-Client: Hyperspace-macOS` |

### Auth Methods

| Method | How | Used By |
|--------|-----|---------|
| `jwt` | Bearer token (HS256) | All clients after login |
| `nextauth-session` | NextAuth JWE cookie | Dashboard web UI |
| `api-key` | `X-API-Key` header | Service-to-service |
| `mobile-header` | `X-Client` + `X-User-ID` | iOS trusted client bypass |
| `device-pairing` | OpenClaw device pairing | OpenClaw gateway clients |

### Token Lifecycle

- **Access token:** 1 hour TTL (HS256, signed with `NEXTAUTH_SECRET`)
- **Refresh token:** 30 day TTL, used to obtain new access tokens
- **Service token:** No user context, has `serviceId` and `scopes`

## API Endpoints

### Onboarding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/onboarding/provision` | Start provisioning pipeline |
| `GET` | `/api/onboarding/status?jobId=...` | Get job status |
| `GET` | `/api/onboarding/jobs` | List jobs for user |
| `GET` | `/api/onboarding/services` | Get service catalog |

### Client Registry

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/onboarding/clients` | Register a client |
| `GET` | `/api/onboarding/clients` | List clients for user |
| `DELETE` | `/api/onboarding/clients?id=...` | Deactivate a client |

### Auth (updated)

| Method | Path | Changes |
|--------|------|---------|
| `POST` | `/api/auth/signup` | Now creates tenant + assigns tier + registers client + issues unified tokens |
| `POST` | `/api/auth/mobile-login` | Now issues unified tokens with clientType, platform, tenant, features |

## Security & Multi-Tenant Isolation (JIT Zero-Tolerance)

All onboarding, job, and client endpoints enforce per-user/per-tenant isolation and least-privilege by default. The table below is the authoritative list of controls (enforced as of the 2026 security hardening pass).

### Enforcement Matrix

| Control | Where | Behavior |
|---------|-------|----------|
| **Job isolation (IDOR fix)** | `onboarding-service.getJobStatus(jobId, userId)`, `GET /status` | A caller can only read **their own** jobs. Cross-user reads return `404`. |
| **Tenant-spoofing guard** | `POST /provision` (`handleProvision`) | A supplied `tenantId` is honored only if the caller is an active member (or platform admin); otherwise `403`. |
| **Tier privilege guard** | `resolveGrantableTier()` in `subscription-tiers.ts`, used by `/provision` + `/signup` | Privileged tiers (`admin`) require platform-admin authority; unknown tiers fall back to `free`; unauthorized requests return `403`. |
| **triggeredBy anti-spoof** | `POST /provision` | `triggeredBy` is derived from client type; only platform admins may override it. |
| **Client revocation** | `POST /api/auth/refresh` | Refresh is rejected (`401`) if the token's bound `clientId` has no active `client_registrations` row. Deactivating a device stops new tokens. |
| **Secrets-at-rest redaction** | `deepRedactSecrets()` in `onboarding-service.ts` | `form_data`, step results, and job results are deep-redacted (passwords/app-passwords/api-keys/secrets/tokens) before any Postgres write. Real secrets stay in-memory for step execution and live only in Infisical. |
| **Zero-tolerance ack** | `executeSecurityValidation()` | `security.zeroToleranceAck` is recorded to `audit_log` (`security:zero_tolerance_ack`) and surfaced on the step result. |
| **Unified JWT everywhere** | `clients.ts`, `index.ts` | Both onboarding and client-registry routes accept the unified Bearer JWT (not just NextAuth/API-key/trusted-header), so iOS/Atlas/CLI use the strong path. |

### Mapping to the JIT Zero-Tolerance Tier Model

The provisioning pipeline performs several actions that correspond to high approval tiers in the hub's `approval` engine (`services/pi-agent-hub/src/security/approval.ts`). Today these run inline under the authenticated user's authority. The intended end-state (see roadmap) gates them behind Just-In-Time approvals:

| Pipeline step | Equivalent tier | Current | Target |
|---------------|-----------------|---------|--------|
| `create_tenant` | Tier 3 (state mutation) | Inline, membership-checked | JIT approval when admin provisions for **another** user |
| `assign_subscription` | Tier 3 (privilege change) | Tier-authority guard | JIT approval for paid/privileged grants |
| `provision_infisical` / credential storage | Tier 3 (secret handling) | Secrets redacted at rest | Short-lived, scoped secret tokens |
| `enroll_*` (read health) | Tier 0 (read) | Inline | Unchanged |

### Token Lifecycle & Revocation

- **Access token:** 1h TTL — short by design; cannot be revoked mid-life (mitigated by the short TTL + refresh-time revocation).
- **Refresh token:** 30d TTL, rotated on every use, carries a `jti`. Bound to `clientId`; rejected once the client registration is deactivated.
- **Revocation:** `DELETE /api/onboarding/clients` is the revocation point — it flips `is_active=false`, which the refresh endpoint enforces.

## Provisioning Pipeline

Steps execute sequentially. Failed steps halt the pipeline. Unreachable services are marked `skipped` (non-fatal).

| Order | Step | Service | Description |
|-------|------|---------|-------------|
| 1 | `create_tenant` | — | Create tenant if user doesn't have one |
| 2 | `assign_subscription` | — | Upsert `user_feature_access` with target tier |
| 3 | `provision_infisical` | infisical | Create Infisical folders at `/users/{folder}` |
| 4 | `enroll_cig` | cig | Verify CIG reachable + user can authenticate |
| 5 | `enroll_nova` | nova-agent | Verify Nova reachable |
| 6 | `enroll_pcg` | pcg | Verify PCG reachable |
| 7 | `enroll_pi_workspace` | pi-workspace | Verify Pi Workspace reachable |
| 8 | `register_client` | — | Register calling client in `client_registrations` |
| 9 | `security_validation` | — | Health-check all enrolled services |

## Service Catalog

Pre-seeded with 10 services. Each service declares:
- `feature_flags` — which FeatureFlag enum values it implements
- `dependencies` — other service names it depends on
- `auth_methods` — accepted auth methods
- `provisioning_enabled` + `provisioning_order` — whether/on what order to provision during onboarding
- `provisioning_config` — service-specific params (Neo4j port, Infisical path template, etc.)

### Feature-to-Service Mapping

| Feature Flag | Service(s) |
|-------------|------------|
| `email` | CIG |
| `calendar` | CIG |
| `chat` | CIG, Nova Agent |
| `ai-research` | Nova Agent, Research Lab |
| `personal-context` | Nova Agent, PCG |
| `workspace` | Pi Workspace |
| `podcast-studio` | Podcast Studio |
| `approvals` | Approval Service |
| `monitoring` | Homelab Monitor |
| `infrastructure` | Homelab Monitor |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Clients                                   │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ iOS App  │  │ Dashboard│  │ Atlas IDE│  │   CLI    │        │
│  │Hyperspace│  │ Next.js  │  │ PiCode   │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │              │              │              │              │
│       │  X-Client    │ NextAuth     │ X-Client    │ API Key      │
│       │  + JWT       │ Session      │ + JWT       │              │
└───────┼──────────────┼──────────────┼──────────────┼─────────────┘
        │              │              │              │
        v              v              v              v
┌───────────────────────────────────────────────────────────────────┐
│              Unified Auth Token (HS256 JWT)                       │
│                                                                   │
│  { sub, userId, email, tenantId, tenantSlug, tenantRole,          │
│    subscriptionTier, features[], clientType, platform,             │
│    clientId, authMethod, type, iat, exp, iss }                    │
└───────────────────────────┬───────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         v                  v                  v
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Onboarding API │ │ Client Registry │ │ Service Catalog │
│                 │ │                 │ │                 │
│ POST /provision │ │ POST /clients   │ │ GET /services   │
│ GET  /status    │ │ GET  /clients   │ │ Feature→Service │
│ GET  /jobs      │ │ DEL  /clients   │ │ Dependency graph│
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         v                   v                   v
┌───────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (ecosystem_unified)                 │
│                                                                   │
│  users │ tenants │ tenant_memberships │ user_feature_access      │
│  client_registrations │ service_catalog │ onboarding_jobs        │
│  onboarding_steps │ subscription_plans │ audit_log               │
└───────────────────────────────────────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         v                  v                  v
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   CIG (8780)    │ │  Nova (18803)   │ │  PCG (8765)     │
│  Email/Calendar │ │  Voice/Chat     │ │  Personal Ctx   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Pi Workspace    │ │  Infisical      │ │  Approval Svc   │
│  (8762)         │ │  (8791)         │ │  (8810)         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Migration Path for Runtime Services

Backend Python services (CIG, Nova, PCG) currently use static API keys and hardcoded `DEFAULT_USER_ID`. To consume unified tokens:

1. **CIG** (`security.py`): Import `unified_token.py`, replace `verify_api_key()` to also accept unified JWTs. Extract `user_id`, `tenant_id`, `features` from the token instead of returning `DEFAULT_USER_ID`.

2. **Nova** (`user_resolver.py`): Replace hardcoded UUID with token-based user resolution. The `bot.py` WebRTC handshake should verify unified JWTs instead of the `# TODO: Validate token if needed` placeholder.

3. **PCG** (`pic_routes.py`): Add `user_id` property to all Cypher MERGE/CREATE/MATCH. Use `tenant_id` from token for multi-tenant isolation.

4. **Pi Workspace**: Accept unified JWTs in addition to API keys. Map `tenantId` to workspace isolation.

5. **Approval Service**: Already verifies NextAuth JWTs — extend to also accept unified JWTs (same HS256 secret, different payload shape).

## Files Created/Modified

### Created
- `database/migrations/20260621_unified_onboarding_and_client_registry.sql`
- `src/lib/platform/unified-token.ts`
- `src/lib/platform/onboarding-service.ts`
- `src/lib/platform/service-catalog.ts`
- `src/pages/api/onboarding/index.ts`
- `src/pages/api/onboarding/clients.ts`
- `services/cig/unified_token.py`
- `docs/UNIFIED_ONBOARDING_ARCHITECTURE.md` (this file)

### Modified
- `src/pages/api/auth/signup.ts` — Now creates tenant, assigns tier, registers client, issues unified tokens; **rejects self-assigned privileged tiers (`resolveGrantableTier`)**
- `src/pages/api/auth/mobile-login.ts` — Now issues unified tokens with clientType, platform, tenant, features; registers client in `client_registrations`

### Modified (security hardening pass)
- `src/lib/platform/onboarding-service.ts` — `deepRedactSecrets()` for all persisted form/step/job data; `getJobStatus(jobId, userId)` scoping; records `zeroToleranceAck`
- `src/pages/api/onboarding/index.ts` — tenant-membership guard, tier-authority guard, `triggeredBy` anti-spoof, user-scoped status
- `src/pages/api/onboarding/clients.ts` — accepts unified JWT; removed dead/broken `resolveUserId` + stray import
- `src/pages/api/auth/refresh.ts` — rejects refresh for deactivated client registrations
- `src/lib/subscription-tiers.ts` — `resolveGrantableTier()` / `isPrivilegedTier()` tier-authority helpers
