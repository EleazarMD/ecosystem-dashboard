# FSD Migration Matrix — Current Module → Target FSD Slice

> Companion to `docs/FSD_AGENTIC_HARNESS.md`.
>
> This matrix maps every significant module in the current codebase to its
> target location under the FSD Agentic Harness architecture. It is the
> execution plan for Phases A–D of the harness migration.

---

## How to Read This Matrix

- **Current path** — where the code lives today.
- **Harness role** — which part of the Agent Runtime pipeline it serves.
- **Target FSD path** — where it moves under the harness.
- **Migration phase** — when it moves (A=contracts, B=learning domain, C=other
  domains, D=unified runtime).
- **Adapter needed** — whether a compatibility adapter is required during
  migration (to avoid breaking existing imports).

> **Agent-first lens.** FSD layers map onto the agent roster (harness spec
> Section 1.2): `features/` host **agent behaviors** (Tutor, Planner, Evaluator),
> `entities/` host the **Memory Agent's** state (PCG/learner model), and
> `processes/` host the **harness adaptive loop** (session, spaced review). The
> file moves below are also a re-homing of agents into their FSD slices.

---

## 1. Learning Domain (Phase B — reference implementation)

### Entities

| Current path | Target path | Migration phase | Adapter |
|-------------|-------------|----------------|---------|
| `src/lib/kids-pic/KidsPCGService.ts` | `src/domains/learning/entities/child-pcg.ts` | B | Yes (keep `KidsPCGService` re-export) |
| `src/lib/kids-pic/SkillProgressService.ts` | `src/domains/learning/entities/skill-graph.ts` | B | Yes |
| `src/lib/kids-pic/PCGCharacterContext.ts` | `src/domains/learning/entities/agent-context.ts` | B | Yes (keep PIC shim) |
| `src/lib/kids-pic/PCGSafetyService.ts` | `src/domains/learning/entities/safety-service.ts` | B | Yes (keep PIC shim) |
| `src/lib/kids-pic/learning-plan-types.ts` | `src/domains/learning/entities/plan-types.ts` | B | No |
| `src/lib/kids-pic/phase1-starter-content.ts` | `src/domains/learning/entities/starter-content.ts` | B | No |
| `src/lib/kids-pic/phase0-seed-data.ts` | `src/domains/learning/entities/seed-data.ts` | B | No |
| `src/pages/api/pcg/[...path].ts` | `src/domains/learning/entities/pcg-proxy.ts` | B | Yes (keep `/api/pcg` route) |
| `services/kids-pcg/` (FastAPI) | stays in place (external service) | — | No (accessed via proxy) |

### Features

| Current path | Target path | Migration phase | Adapter |
|-------------|-------------|----------------|---------|
| `src/lib/kids-pic/LearningTutorOrchestrator.ts` | `src/domains/learning/features/tutor-turn.ts` | B | Yes (keep import path) |
| `src/lib/kids-pic/LearningPhase1Service.ts` | `src/domains/learning/features/attempt-grading.ts` | B | Yes |
| `src/lib/kids-pic/learning-planner.ts` | `src/domains/learning/features/plan-generation.ts` | B | No |
| `src/lib/kids-pic/learning-access.ts` | `src/domains/learning/features/access-control.ts` | B | No |
| `src/lib/kids-pic/learning-ui-presenter.ts` | `src/domains/learning/features/ui-presenter.ts` | B | No |
| `src/lib/kids-pic/family-learning-presenter.ts` | `src/domains/learning/features/family-presenter.ts` | B | No |

### Processes

| Current path | Target path | Migration phase | Adapter |
|-------------|-------------|----------------|---------|
| `src/lib/kids-pic/LearningSessionService.ts` | `src/domains/learning/processes/session-loop.ts` | B | Yes (keep import path) |
| (new) | `src/domains/learning/processes/spaced-review.ts` | B | — |
| (new) | `src/domains/learning/processes/mastery-sync.ts` | B | — |

### Widgets

| Current path | Target path | Migration phase | Adapter |
|-------------|-------------|----------------|---------|
| `src/pages/child/learn.tsx` | `src/domains/learning/widgets/learn-page.tsx` | B | Yes (keep Next.js route) |
| `src/components/family/PCGInsightsDashboard.tsx` | `src/domains/learning/widgets/insights-dashboard.tsx` | B | Yes (keep PIC shim) |
| `src/components/family/SkillProgressDashboard.tsx` | `src/domains/learning/widgets/skill-progress.tsx` | B | No |
| `src/pages/family/[childId]/learning.tsx` | `src/domains/learning/widgets/family-learning-page.tsx` | B | Yes (keep Next.js route) |

### API routes (stay as Next.js routes, delegate to domain features)

| Current path | Delegates to | Migration phase |
|-------------|-------------|----------------|
| `src/pages/api/learn/plan.ts` | `features/plan-generation` | B |
| `src/pages/api/learn/attempt.ts` | `features/attempt-grading` | B |
| `src/pages/api/learn/content.ts` | `features/attempt-grading` (content query) | B |
| `src/pages/api/learn/session.ts` | `processes/session-loop` | B |
| `src/pages/api/learn/session/[id].ts` | `processes/session-loop` | B |
| `src/pages/api/learn/tutor/turn.ts` | `features/tutor-turn` | B |
| `src/pages/api/child/pcg.ts` | `entities/child-pcg` | B |
| `src/pages/api/family/pcg-insights.ts` | `entities/safety-service` | B |

### Shared (domain-local)

| Current path | Target path | Migration phase |
|-------------|-------------|----------------|
| `src/lib/kids-pic/SemanticSafetyAnalyzer.ts` | `src/domains/learning/shared/semantic-safety.ts` | B |
| `src/lib/kids-pic/AIChildSafetyMonitor.ts` | `src/domains/learning/shared/ai-safety-monitor.ts` | B |

---

## 2. Platform / Cross-Domain Shared (Phase A)

These are infrastructure shared across ALL domains. They move to a top-level
`src/lib/harness/` package.

| Current path | Target path | Harness role | Migration phase |
|-------------|-------------|-------------|----------------|
| `src/lib/platform/content-filter-service.ts` | `src/lib/harness/safety/content-filter.ts` | Safety Lane | A |
| `src/lib/platform/child-service-middleware.ts` | `src/lib/harness/policy/child-service-gate.ts` | Policy Gate | A |
| `src/lib/platform/child-account-types.ts` | `src/lib/harness/shared/child-account-types.ts` | Shared types | A |
| `src/lib/platform/child-account-middleware.ts` | `src/lib/harness/policy/child-account-gate.ts` | Policy Gate | A |
| `src/lib/platform/child-conversation-history.ts` | `src/lib/harness/shared/conversation-history.ts` | Shared | A |
| `src/lib/platform/conversation-logger.ts` | `src/lib/harness/shared/conversation-logger.ts` | Audit | A |
| `src/lib/platform/safety-presets.ts` | `src/lib/harness/safety/safety-presets.ts` | Safety Lane | A |
| `src/lib/safety/llm-safety-filter.ts` | `src/lib/harness/safety/llm-filter.ts` | Safety Lane | A |
| `src/lib/agent/AIAgentRuntime.ts` | `src/lib/harness/runtime/agent-runtime.ts` | Agent Runtime | A |
| `src/agents/OrchestrationEngine.ts` | `src/lib/harness/runtime/orchestration-engine.ts` | Agent Runtime | A |
| `src/lib/agent/AgentRegistrationService.ts` | `src/lib/harness/runtime/agent-registry.ts` | Agent Runtime | A |
| `src/services/ApprovalService.ts` | `src/lib/harness/policy/approval-service.ts` | Policy Gate | A |
| `src/lib/approvalIntegration.ts` | `src/lib/harness/policy/approval-integration.ts` | Policy Gate | A |
| `src/lib/db/client.ts` | `src/lib/harness/shared/db-client.ts` | Shared | A |
| `src/lib/logger.ts` | `src/lib/harness/shared/logger.ts` | Audit | A |
| `src/lib/error-logger.ts` | `src/lib/harness/shared/error-logger.ts` | Audit | A |
| `src/lib/telemetry-logger.ts` | `src/lib/harness/shared/telemetry.ts` | Audit | A |

### New harness types (Phase A — create fresh)

| Target path | Purpose |
|-------------|---------|
| `src/lib/harness/types.ts` | `HarnessAgentRequest`, `HarnessAgentResponse`, `HarnessEvaluationResult`, `HarnessAuditEnvelope`, `HarnessEvent` |
| `src/lib/harness/runtime/pipeline.ts` | Unified pipeline: Policy Gate → Safety → Agent → Evaluation → Events → Audit |
| `src/lib/harness/events/bus.ts` | Typed event bus for cross-domain communication |
| `src/lib/harness/events/types.ts` | Standard + domain event type registry |

---

## 3. Other Dashboard Domains (Phase C — follow learning template)

Each domain follows the same FSD structure: `entities/`, `features/`,
`processes/`, `widgets/`, `shared/`.

### Email domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/email.ts` | Entity | `src/domains/email/entities/` | C |
| `src/pages/api/email/` | Features (API) | `src/domains/email/features/` | C |
| `src/pages/email-management.tsx` | Widget | `src/domains/email/widgets/` | C |

### Calendar domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/calendar/` | Entity + Features | `src/domains/calendar/` | C |
| `src/pages/api/calendar/` | Features (API) | `src/domains/calendar/features/` | C |

### Research domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/research/` | Entity + Features | `src/domains/research/` | C |
| `src/pages/api/research-lab/` | Features (API) | `src/domains/research/features/` | C |

### Knowledge Graph domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/kg-gateway.ts` | Entity | `src/domains/knowledge-graph/entities/` | C |
| `src/lib/kg-mcp-client.ts` | Features | `src/domains/knowledge-graph/features/` | C |
| `src/pages/api/knowledge-graph/` | Features (API) | `src/domains/knowledge-graph/features/` | C |

### Podcast domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/podcast-studio/` | Entity + Features | `src/domains/podcast/` | C |
| `src/pages/api/podcast-studio/` | Features (API) | `src/domains/podcast/features/` | C |

### Tesla domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/tesla-command-signer.ts` | Entity | `src/domains/tesla/entities/` | C |
| `src/pages/api/tesla/` | Features (API) | `src/domains/tesla/features/` | C |

### News domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/news/` | Entity + Features | `src/domains/news/` | C |
| `src/pages/api/news/` | Features (API) | `src/domains/news/features/` | C |

### Nova / AI Safety domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/lib/nova/` | Entity + Features | `src/domains/nova/` | C |
| `src/pages/api/nova/` | Features (API) | `src/domains/nova/features/` | C |
| `src/lib/ahis-service.ts` | Safety Lane (adult) | `src/lib/harness/safety/ahis.ts` | C |

### Agent management domain

| Current path | Harness role | Target path | Phase |
|-------------|-------------|-------------|-------|
| `src/agents/ADKAgent.ts` | Entity | `src/domains/agent-mgmt/entities/` | D |
| `src/agents/DashboardAIAgent.ts` | Features | `src/domains/agent-mgmt/features/` | D |
| `src/pages/api/agent/` | Features (API) | `src/domains/agent-mgmt/features/` | D |
| `src/pages/api/agentic-control/` | Features (API) | `src/domains/agent-mgmt/features/` | D |

---

## 4. Migration Priority Order

| Priority | Domain | Rationale |
|----------|--------|-----------|
| 1 | **Learning** (Phase B) | Reference implementation; most infrastructure already in place |
| 2 | **Platform shared** (Phase A) | Harness types + runtime pipeline needed by all domains |
| 3 | **Email** | High usage; straightforward Policy Gate + Safety Lane mapping |
| 4 | **Calendar** | Similar to email; shares approval pipeline |
| 5 | **Research** | Complex but self-contained; good for validating cross-domain events |
| 6 | **Knowledge Graph** | Central to agent intelligence; benefits from unified runtime |
| 7 | **Podcast** | Self-contained media pipeline |
| 8 | **Tesla** | Safety-critical; needs robust Policy Gate + approval flow |
| 9 | **News** | Content generation; benefits from Safety Lane formalization |
| 10 | **Nova / AI Safety** | Cross-cutting; may partially live in `harness/safety/` |
| 11 | **Agent management** (Phase D) | Last — becomes the harness-level coordinator |

---

## 5. Compatibility Strategy

During migration, existing imports continue to work via adapters:

1. **Re-export shims** — old paths re-export from new locations (same pattern as
   the PIC→PCG migration).
2. **Next.js routes stay** — API routes and pages keep their URLs; they
   delegate to domain features internally.
3. **No big-bang rewrite** — each domain migrates independently; the system
   works at every intermediate state.
4. **Adapter lifecycle** — adapters are marked `@deprecated` and removed only
   when all consumers have migrated to the new path.

---

## 6. Acceptance Criteria per Phase

### Phase A (contracts)
- [ ] `src/lib/harness/types.ts` defines all harness interfaces.
- [ ] `src/lib/harness/runtime/pipeline.ts` implements the unified pipeline.
- [ ] `src/lib/harness/events/bus.ts` implements the typed event bus.
- [ ] No existing runtime behavior changes; all current code works as-is.
- [ ] Harness types are used in at least one learning domain feature (pilot).

### Phase B (learning domain)
- [ ] `src/domains/learning/` exists with all five FSD layers.
- [ ] All learning features route through the harness pipeline.
- [ ] Tutor turns emit `HarnessEvent` + `HarnessAuditEnvelope`.
- [ ] Learning domain passes the Harness-Ready checklist.
- [ ] All existing API routes and pages still work (via adapters).

### Phase C (other domains)
- [ ] At least 3 additional domains migrated and harness-ready.
- [ ] Cross-domain events flow correctly (e.g. learning session → time limit
  enforcement).
- [ ] No domain imports another domain's internals (only via shared/ or events).

### Phase D (unified runtime)
- [ ] Single `AgentRuntime` entry point serves all domains.
- [ ] `OrchestrationEngine` coordinates cross-domain agent execution.
- [ ] All adapters removed; old paths are gone.
- [ ] Full audit trail across all domains via `HarnessAuditEnvelope`.
