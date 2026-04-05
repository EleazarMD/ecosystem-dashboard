# Hermes Core API Client

## MANDATORY USAGE PATTERN

**All server-side API routes that call Hermes Core MUST use `hermesFetch()`.**

```typescript
// ✅ CORRECT
import { hermesFetch } from '@/lib/hermes-client';

const response = await hermesFetch('/v1/calendar/events');
const response = await hermesFetch('/v1/emails/search', {
  method: 'POST',
  body: JSON.stringify({ query: 'test' }),
});

// ❌ WRONG - Will fail with "Authentication required"
const response = await fetch(`${HERMES_CORE_URL}/v1/calendar/events`);
const response = await fetch('http://localhost:8780/v1/emails/search', {...});
```

## Why This Matters

Hermes Core requires JWT authentication on all endpoints (except `/health`). The `hermesFetch()` wrapper:

1. Generates short-lived JWT tokens using the shared `NEXTAUTH_SECRET`
2. Automatically includes `Authorization: Bearer <token>` header
3. Sets `Content-Type: application/json`
4. Uses the correct `HERMES_URL` from environment

## Audit Command

Run this to find any unauthenticated Hermes calls:

```bash
grep -rn "fetch.*HERMES_CORE_URL\|fetch.*8780\|fetch.*localhost:8780" \
  src/pages/api/ --include="*.ts" | grep -v "hermesFetch"
```

## Files That Should Use hermesFetch

- `src/pages/api/calendar/*.ts` — Calendar endpoints
- `src/pages/api/email/*.ts` — Email endpoints  
- `src/pages/api/email-graphrag/*.ts` — Email GraphRAG endpoints
- Any file importing `HERMES_CORE_URL` or `EMAIL_GRAPHRAG_URL`

## Exception

The `/health` endpoint can be called without auth for infrastructure health checks:
```typescript
// This is OK for health checks only
await fetch(`${HERMES_CORE_URL}/health`);
```

## Related Files

- `src/lib/hermes-client.ts` — The authenticated fetch wrapper
- `/etc/ai-homelab/hermes-jwt.env` — Canonical JWT token (for reference)
