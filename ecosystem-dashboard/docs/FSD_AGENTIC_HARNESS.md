# FSD Agentic Harness — Canonical Architecture & Contracts

> Status: **Source of truth for harness architecture.** All domains in the
> ecosystem-dashboard migrate toward this contract. The Kid's Learning Platform
> is the first harness-compliant domain (**Phases B + E complete — fully agent-first reference implementation**).
>
> Companion docs:
> - `LEARNING_PLATFORM_ROADMAP.md` — learning domain spec (first harness domain)
> - `KIDS_DASHBOARD_HARNESS_AUDIT.md` — alignment audit + ordered task backlog
> - `AGENT_CONTEXT_HUB.md` — the always-on context spine (focus + long-form) feeding the agent
> - `KIDS_PLATFORM_CONTRACTS.md` — ratifiable TS contracts (activity registry, activity theme, context, companion, transport, tool roster)
> - `LEARNING_EXPERIENCE_DESIGN.md` — Brilliant-style child learning experience (cards/pathways/gamification)
> - `PHASE0_SEED_SPEC.md` — seed data for the learning domain
> - `FSD_MIGRATION_MATRIX.md` — current module → target FSD slice mapping
>
> **Two layers, kept distinct (see §1.5):** the **Harness** is the *governance
> substrate* (rails around agency); the **Agent Execution Engine** is the *thing
> that runs the cognitive loop and calls tools* — the **Pi Code CLI** (the same
> engine used in the Atlas PiCode IDE). The harness is built; the Pi Code-hosted
> agent loop for the child tutor is the current integration target.

---

## 1. What Is the FSD Agentic Harness?

The **FSD Agentic Harness** is the **core architecture of the AIHomelab
Dashboard**. It is an **agent-first, harness-intelligent-driven** runtime: AI
**agents** are the primary actors that perceive, reason, plan, act, and learn —
and the **harness** is the intelligent governance substrate that gives those
agents *safe, bounded, auditable agency*.

It combines two ideas:

- **Feature-Sliced Design (FSD)** — a domain decomposition methodology that
  organizes code into vertically-sliced layers (entities → features → processes
  → widgets → shared).
- **Agentic Runtime** — agents operating a cognitive loop
  (perceive → reason → plan → act → reflect) over persistent **memory**, with
  the harness enforcing governance (policy, safety, evaluation) around every
  agent action.

The **Kid's Learning Platform is the canonical reference implementation** — its
tutor agent loop *is* the cognitive architecture every other domain (email,
calendar, research, knowledge graph, Tesla, podcast, etc.) generalizes from.
Every domain becomes a **Harness Domain**: an instance of the same agent-first
pattern, governed by the same harness contracts.

### 1.1 Core Principles

1. **Agent-First.** Agents are first-class actors with bounded autonomy, not
   functions buried in a request handler. Every meaningful operation is framed
   as *an agent pursuing a goal*. The pipeline exists to *govern* agent agency,
   not to demote the agent to a single step.
2. **Harness-Intelligent-Driven.** The harness is itself intelligent: it
   observes outcomes, updates the learner/world model (memory), schedules
   follow-up work (e.g. spaced review), and selects the next best action. The
   harness *closes the loop* — adaptation is a platform capability, not
   per-domain glue.
3. **Child-First Safety (bounded autonomy).** For a kids platform, agent
   autonomy is **always** bounded by child safety. The Safety Lane and Policy
   Gate are non-negotiable rails: no agent action reaches a child without
   passing them. Autonomy never overrides safety.
4. **Memory-Centric.** Agents reason over persistent memory — the **Personal
   Context Graph (PCG)** is the authoritative learner model and the agent's
   long-term memory. Agents read context from memory and write outcomes back to
   it, which is how the harness gets smarter over time.
5. **Feature-Sliced.** Every domain is decomposed into FSD layers so agent
   logic (features/processes) is cleanly separated from data (entities) and UI
   (widgets), with a single shared governance substrate.
6. **Auditable by Construction.** Every agent action produces an audit envelope
   and typed events. Nothing an agent does is invisible.

### 1.2 The Agent Roster

The harness defines a canonical set of agent roles. Domains instantiate the
roles they need; the Kid's Learning Platform instantiates all of them. Each role
already exists in code today (see Section 6) — the harness *names them as
agents* and standardizes how they collaborate.

| Agent role | Responsibility | Learning-domain implementation |
|-----------|----------------|-------------------------------|
| **Tutor / Interaction Agent** | Holds the conversation, scaffolds, gives the next step | `LearningTutorOrchestrator.ts` |
| **Planner Agent** | Decides what to work on next (today's plan, focus objectives) | `learning-planner.ts` |
| **Evaluator Agent** | Scores attempts (deterministic / rubric / AI) and judges mastery | `LearningPhase1Service.ts` + `SkillProgressService.ts` |
| **Safety Agent** | Guards input/output; detects manipulation, sycophancy, distress | `AIChildSafetyMonitor.ts` + `SemanticSafetyAnalyzer.ts` |
| **Memory Agent** | Reads/writes the learner model + context | `KidsPCGService.ts` + `PCGCharacterContext.ts` |
| **Orchestrator Agent** | Coordinates multiple agents (series/parallel/hybrid) | `OrchestrationEngine.ts` |

> **Agent vs. Execution Engine.** The roster names *roles*; it does not by itself
> make them autonomous tool-using agents. The learning roles are now hosted in the
> **Pi Code CLI** via `PiCodeTransport` (`src/domains/learning/shared/transports/picode-transport.ts`),
> which runs a real tool-using cognitive loop (perceive → reason → plan → act → reflect)
> with gated tool selection on every hop. The harness rails (Section 4) are identical
> in both cases — they bound whatever runs the loop.

### 1.3 The Cognitive Agent Loop

Every agentic interaction is a turn of a cognitive loop. The harness provides
the governance rails (in **bold**) that wrap each phase:

```
        ┌──────────────────────────────────────────────────────┐
        │                    AGENT (bounded autonomy)            │
        │                                                        │
  PERCEIVE ──► REASON ──► PLAN ──► ACT ──► REFLECT               │
     │           │          │        │         │                 │
     │           │          │        │         └─► writes memory │
     └───────────┴──────────┴────────┴───────────────────────────┘
        ▲                                            │
        │ reads memory (PCG)                         ▼
   ┌─────────────────────────────────────────────────────────────┐
   │   HARNESS GOVERNANCE (intelligent, always-on)                 │
   │   POLICY GATE  •  SAFETY LANE  •  EVALUATION LANE  •  AUDIT    │
   │   + adaptive scheduling (spaced review, next-best-action)     │
   └─────────────────────────────────────────────────────────────┘
```

| Phase | What the agent does | Harness rail |
|-------|--------------------|--------------|
| **Perceive** | Read learner message + PCG memory + current skill state | Policy Gate (may block before perception) |
| **Reason** | Interpret intent, diagnose misconception, choose strategy | Safety Lane (input filter) |
| **Plan** | Select next step / hint level / objective | — |
| **Act** | Generate the tutor message (AI Gateway or deterministic fallback) | Safety Lane (output filter + Safety Agent) |
| **Reflect** | Score the attempt, update mastery, detect misconceptions | Evaluation Lane → events → Audit |
| **(loop)** | Harness schedules follow-up (spaced review, next plan) | Harness-intelligent adaptation |

The **governance** of this loop is implemented today in
`src/pages/api/learn/tutor/turn.ts` (Policy Gate → Safety Lane → generate →
Safety Lane → Evaluation → events → audit). The **agent execution** of the
Reason/Plan/Act phases is currently a *single-shot LLM call* with a deterministic
fallback (`LearningTutorOrchestrator.ts`), orchestrated imperatively — not yet a
tool-using agent loop. Section 1.5 defines the engine (Pi Code CLI) that closes
that gap; the harness formalizes the *pattern* either way.

### 1.4 Why the Kid's Learning Platform Is the Core

The learning domain is not just "first" — it is the **reference cognitive
architecture**. It is the only domain that exercises *every* agent role, the
*full* cognitive loop, memory, the adaptive loop, and the strictest safety rails.
Because a child-safe agent loop is the hardest case, any domain that fits the
learning template will fit the harness. Other domains are *simpler instances* of
the same pattern.

### 1.5 The Agent Execution Engine (Pi Code CLI)

The harness is the **governance substrate**. It does not, by itself, *run* the
cognitive loop — it bounds whatever does. The **Agent Execution Engine** is the
component that actually runs perceive → reason → plan → act → reflect and **calls
tools**. The canonical engine for the AIHomelab Dashboard is the **Pi Code CLI** —
the same agentic engine the owner uses in the **Atlas PiCode IDE**.

Pi Code already provides the four things an agent loop needs, which is why it is
the chosen engine rather than a bespoke build:

| Capability | Pi Code provides | Harness binding |
|-----------|------------------|-----------------|
| **Tool calling** | A loop that selects + invokes tools and observes results | Each tool wrapped by the Safety Lane; gated by an allow-list |
| **Peripherals** | Adapters for external capabilities (editor, graph, research, media) | Exposed to the child agent only via the gated tool roster (§4.6) |
| **Memory / ambient context** | An ambient-context budgeter with priority + token budget (`.picode/ambient.json`) | Reads/writes the PCG learner model (Memory Agent) |
| **Chat interface** | A conversational front-door to the loop | Surfaced to the child through the existing Learn hub / chat UI |

**Separation of concerns:**

```
   Pi Code CLI (Agent Execution Engine)        Harness (Governance Substrate)
   ┌───────────────────────────────┐           ┌────────────────────────────┐
   │ runs the loop, selects tools, │   bounded │ Policy Gate • Safety Lane  │
   │ holds ambient context, chats  │◄─────────►│ Evaluation Lane • Audit    │
   └───────────────────────────────┘    by     │ + adaptive scheduling      │
                                                └────────────────────────────┘
```

**Current state vs. target.** Today the learning domain has the *governance* layer
fully built but runs the Reason/Plan/Act phases as a single-shot LLM call
(`LearningTutorOrchestrator.ts`). The target is to register the **Pi Code CLI as
the learning domain's agent runtime**, so the Tutor Agent can autonomously select
gated tools within a turn while every hop passes the same rails. This integration
is tracked as a first-class migration phase (Section 9, **Phase E**) and detailed
in `KIDS_DASHBOARD_HARNESS_AUDIT.md` (Phase 6) and
`LEARNING_PLATFORM_ROADMAP.md` (Section 18).

**Engine-agnostic rule.** The harness contracts (Section 4) are independent of the
engine. Pi Code is the canonical engine, but any engine that (a) honors the Policy
Gate + Safety Lane on every tool hop, (b) emits the audit envelope + typed events,
and (c) reads/writes memory through the PCG is harness-compliant. No domain may run
an agent loop that bypasses the rails.

### 1.6 The Context Hub (always-on context spine)

An agent loop is only as good as the context it runs on. The **Context Hub** is the
substrate that keeps the agent **always in the loop across every surface** by
continuously anchoring two tiers of context and feeding them to the Execution
Engine's ambient-context budget (Pi Code `.picode/ambient.json`):

- **In-focus context** — what the user is looking at and doing *right now* (the
  active screen/card/problem). Ephemeral, highest priority, safety-screened. This is
  what lets the agent "explain whatever is on screen."
- **Long-form context** — durable identity/state from Memory (PCG): mastery,
  misconceptions, zone of proximal development, learning style, goals, plan, and
  recent offline-consolidation insights. Budgeted + summarized, always available.

Every surface registers a **Context Provider** that emits a typed `ContextFrame`;
the Hub composes the active frame (focus) + a budgeted memory summary (long-form) +
the per-surface **Tool Roster** (§4.6) into a `ContextEnvelope` handed to the engine
on each turn. The Hub **prepares context only** — it never calls the model and is not
a second agent runtime; every hop still passes the rails (§1.5, Section 4).

This is a **first-class harness capability** (like the adaptive loop, §4.5): any
domain gets "agent always present, context always anchored" by implementing
providers, rather than re-wiring context per feature. Full design:
`docs/AGENT_CONTEXT_HUB.md`. The child-facing experience those providers render
(Brilliant-style cards/pathways/gamification) is specified in
`docs/LEARNING_EXPERIENCE_DESIGN.md`.

---

## 2. Canonical Glossary

| Term | Definition |
|------|-----------|
| **Agent** | A first-class actor that runs a cognitive loop (perceive → reason → plan → act → reflect) to pursue a goal, under harness governance. |
| **Agent Roster** | The canonical set of agent roles (Tutor, Planner, Evaluator, Safety, Memory, Orchestrator). See Section 1.2. |
| **Cognitive Loop** | The per-turn agent cycle (perceive → reason → plan → act → reflect) backed by memory. See Section 1.3. |
| **Bounded Autonomy** | Agents act independently *within* harness rails; the Policy Gate and Safety Lane can always override an agent. Autonomy never supersedes child safety. |
| **Memory (PCG)** | The Personal Context Graph — the agent's persistent long-term memory and the authoritative learner model. |
| **Harness** | The platform-wide runtime + architecture. Not a single service; the contract every domain follows. Itself *intelligent* — it adapts and closes the loop. |
| **Harness Domain** | A vertical slice (e.g. `learning`, `email`, `research`) that implements harness contracts as an instance of the agent-first pattern. |
| **Agent Runtime** | The governance substrate that wraps every agent action: Policy Gate → Safety Lane → Agent → Evaluation Lane → Events → Audit. |
| **Agent Execution Engine** | The component that actually *runs* the cognitive loop and *calls tools* (canonical: the **Pi Code CLI**). Distinct from the harness, which only *bounds* it. See Section 1.5. |
| **Tool Roster** | The allow-list of tools an agent may call (child CORE roster in Section 4.6). Everything not on the roster is blocked by default. |
| **Tool Gate** | The pre-tool checkpoint inside the loop: allow-list check + Safety Lane on every tool input/output + approval-service deferral for sensitive tools. |
| **Context Hub** | The always-on context spine that anchors **in-focus** + **long-form** context and feeds it to the Execution Engine's ambient budget every turn. Prepares context only; not an agent runtime. See Section 1.6 + `AGENT_CONTEXT_HUB.md`. |
| **Context Provider** | A per-surface adapter that emits a typed `ContextFrame` describing what the user sees/does on that surface (pull + push-on-change). |
| **Context Frame** | The typed unit a surface emits: focus title, safety-screened visible content, state, affordances, intent hints. |
| **Context Envelope** | The composed bundle the Hub hands the engine: focus frame (high priority) + budgeted long-form summary + per-surface Tool Roster + safety metadata. |
| **Tutor Companion** | The always-present on-screen surface of the agent (Read / Explain / Hint / Try-another / Talk / Celebrate), present on every child activity. |
| **Policy Gate** | Pre-action checkpoint that validates authorization, rate limits, parental controls, and feature flags. Can block before the agent perceives. |
| **Safety Lane** | Input + output filtering wrapped around every agent action (content filter, age-appropriateness, sycophancy detection, manipulation checks). |
| **Evaluation Lane** | Post-action checkpoint that scores agent output (deterministic check, rubric, AI analysis) and emits evidence to memory + events. |
| **Session Loop** | Stateful conversation/activity cycle managed by the harness (warm-up → target → practice → reflection). |
| **Skill Graph** | Authoritative dependency graph of capabilities (pilot: learning skills in Neo4j kids-pcg). |
| **Event Bus** | Internal event stream for cross-domain communication (`attempt_submitted`, `mastery_updated`, `incident_raised`, etc.). |
| **Audit Envelope** | Structured metadata attached to every agent action: agent id, model, contract, latency, safety result, policy decisions. |
| **FSD Slice** | A vertical layer in Feature-Sliced Design: `entities`, `features`, `processes`, `widgets`, `shared`. |
| **Harness-Ready** | A feature/domain that passes the readiness checklist (Section 7). |

---

## 3. FSD Layer Structure (per domain)

Every harness domain is organized into five FSD layers:

```
domain/
  entities/       — typed data models + persistence contracts
  features/       — use-case orchestration (business logic)
  processes/      — long-running/stateful loops (session, adaptive cycle)
  widgets/        — UI components + presentation logic
  shared/         — domain-local utilities, constants, types
```

### 3.1 Layer rules

- **Entities** are pure data shapes + persistence interfaces. No business logic.
- **Features** orchestrate entities + call the Agent Runtime. No UI.
- **Processes** manage stateful cycles (e.g. learning session, spaced-review
  scheduler). They emit events and may span multiple features.
- **Widgets** render data from features/processes. No direct DB or agent calls.
- **Shared** holds domain-local helpers. Cross-domain shared code lives in a
  top-level `shared/` package.

### 3.2 Dependency direction

```
widgets → features → entities
                  ↘ processes ↗
widgets → processes (read-only)
```

Widgets never call entities directly. Features never import widgets. Processes
may call features but not widgets. Shared is importable by all layers.

---

## 4. Agent Runtime Contract

The Agent Runtime is the **governance substrate** that wraps every agent action.
The **agent** is the actor; the runtime is what makes its agency safe, bounded,
and auditable. An agent's cognitive loop (Section 1.3) runs *inside* these rails:

```
Agent goal (e.g. "help this learner take the next step")
  │
  ├─ Policy Gate ........... can the agent act at all? (auth, limits, controls)
  ├─ Safety Lane (input) ... is it safe for the agent to PERCEIVE this?
  ├─► AGENT acts ........... PERCEIVE → REASON → PLAN → ACT
  │     (AI Gateway, deterministic fallback, tools; reads/writes memory)
  ├─ Safety Lane (output) .. is the agent's action safe to deliver?
  ├─ Evaluation Lane ....... REFLECT: score, judge mastery, write to memory
  ├─ Event Emission ........ mastery_updated, incident_raised, ...
  └─ Audit Envelope ........ structured record of the whole action
        │
        └─► Harness adapts: schedules spaced review / next-best-action
```

The rails can **override the agent at any phase** (Child-First Safety, Principle
3). An agent never bypasses the Policy Gate or Safety Lane.

### 4.1 Required interfaces

Every domain that invokes the Agent Runtime must provide:

```typescript
interface HarnessAgentRequest {
  domain: string;              // e.g. "learning", "email", "research"
  agentId: string;             // which agent role is acting (Section 1.2)
  agentRole?:                  // canonical role, for orchestration + audit
    | 'tutor' | 'planner' | 'evaluator' | 'safety' | 'memory' | 'orchestrator';
  sessionId?: string;          // stateful session correlation
  userId: string;              // authenticated user
  goal?: string;               // the goal the agent is pursuing
  payload: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

interface HarnessAgentResponse {
  requestId: string;
  status: 'success' | 'blocked' | 'failed' | 'fallback';
  content: string | Record<string, unknown>;
  // Source values are domain-namespaced. The learning Tutor Agent emits
  // 'ai_gateway_learn_tutor' / 'fallback_deterministic_learn_tutor' today;
  // the canonical shape is `<channel>[_<domain>_<agent>]`.
  source: string;
  channel: 'ai_gateway' | 'deterministic_fallback' | 'blocked';
  model?: string;
  contract?: string;
  evaluation?: HarnessEvaluationResult;
  audit: HarnessAuditEnvelope;
}

interface HarnessEvaluationResult {
  correct?: boolean;
  score?: number;
  feedback?: string;
  confidence?: number;
  method: 'deterministic' | 'rubric' | 'ai_analysis' | 'none';
}

interface HarnessAuditEnvelope {
  agentId: string;
  model: string;
  contract: string;
  latencyMs: number;
  policyDecisions: string[];
  safetyInputResult: 'pass' | 'block' | 'warn';
  safetyOutputResult: 'pass' | 'block' | 'warn';
  timestamp: string;
}
```

### 4.2 Policy Gate contract

The Policy Gate is a pre-execution middleware chain. Every domain must check:

1. **Authentication** — user is authenticated and authorized for the domain.
2. **Rate limiting** — per-user and per-domain throttles.
3. **Parental controls** (child domains) — allowed hours, daily usage limit,
   allowed/blocked services, content filter level.
4. **Feature flags** — domain feature is enabled for this user/tenant.

If any check fails, the runtime returns `status: 'blocked'` with a reason. No
agent execution occurs.

### 4.3 Safety Lane contract

The Safety Lane wraps every agent execution on both input and output:

- **Input:** content filter (Llama Guard 3 categories S1–S14), age-band
  appropriateness check.
- **Output:** content filter + sycophancy detection + manipulation/bias check
  (via `AIChildSafetyMonitor` for child domains; extensible for adult domains).

If input fails: request is blocked, no agent call. If output fails: response is
replaced with a safe fallback, incident is logged, event `incident_raised` is
emitted.

### 4.4 Evaluation Lane contract

Post-execution scoring. Domains declare their evaluation method:

| Method | When to use | Example |
|--------|-------------|---------|
| `deterministic` | Closed items with known answers | Math problem exact match |
| `rubric` | Open items with explicit criteria | Writing prompt, reasoning justification |
| `ai_analysis` | Open items scored by AI against a rubric | Essay, creative response |
| `none` | Non-assessment interactions | Casual chat, journaling |

Evaluation results emit domain-specific events (e.g. `mastery_updated` in
learning, `task_completed` in productivity).

### 4.5 Harness-Intelligent Adaptation (closing the loop)

This is what makes the harness **intelligent-driven** rather than passive
plumbing. After an agent action is evaluated, the harness — not the domain —
decides what should happen next and feeds it back into the next cognitive loop:

1. **Update memory.** Write the outcome to the learner model / PCG so the next
   `Perceive` phase sees fresh state.
2. **Schedule follow-up.** Queue spaced-review reps, remediation, or stretch
   work based on mastery deltas and forgetting curves.
3. **Select next-best-action.** Inform the Planner Agent's next plan (which
   skill, which difficulty, which modality) from accumulated evidence.
4. **Escalate when needed.** On repeated misconception or a safety signal,
   raise an event for human-in-the-loop review (parent/owner).

| Adaptation | Trigger | Harness mechanism | Implementation |
|-----------|---------|-------------------|----------------|
| Mastery update | `attempt_submitted` | Write proficiency to learner model | `SkillProgressService.ts` + kids-pcg |
| Spaced review | Mastery decay / time elapsed | Schedule review pick | `processes/spaced-review.ts` (planned) |
| Next-best-action | `mastery_updated` | Recompute today's plan | `learning-planner.ts` |
| Misconception loop | `misconception_detected` | Inject targeted remediation | Tutor + Planner agents |
| Human escalation | `incident_raised` | Approval / parent notification | `ApprovalService.ts` + notifications |

The adaptive loop is a **first-class harness capability**: every domain inherits
it, rather than re-implementing adaptation per feature.

### 4.6 Tool Roster + Tool Gate contract

When an agent loop runs in an Execution Engine (Section 1.5), it may only call
tools on an explicit **Tool Roster**. Everything else is **blocked by default**
(bounded autonomy). This is the loop-internal analog of the Policy Gate.

**Gating model (every tool call):**

1. **Allow-list check** — the requested tool is on the agent's roster for this
   domain + user + intent. If not, deny (no execution).
2. **Safety Lane (input)** — the tool's arguments pass the content filter +
   age-appropriateness check (child domains).
3. **Execute** — the tool runs (which may itself call the AI Gateway, a service,
   or a UI affordance).
4. **Safety Lane (output)** — the tool's result passes the output filter + the
   domain safety monitor before the agent observes it.
5. **Approval deferral** — sensitive/irreversible tools (e.g. image generation,
   anything financial/external) defer to the JIT `approval-service` (parent/owner).
6. **Budget** — a per-turn tool-call budget bounds loop length.

**Child CORE tool roster (learning domain).** Each tool maps to an existing
dashboard surface; the roster is the contract the Pi Code loop is given:

| Tool | Maps to | Tier |
|------|---------|------|
| `ask_socratic` | tutor prompt generation | CORE |
| `give_hint` | `hintSet` escalation (`attempt.ts`) | CORE |
| `generate_problem` | `/api/learn/content/generate` + STAAR Tutor | CORE (verified items only) |
| `check_answer` | `attempt-grading` (deterministic + rubric) | CORE (grading stays server-side) |
| `define_word` | `dictionary` / `HighlightToDefine` | CORE |
| `read_with_me` | `ReadAloudButton` / TTS | CORE |
| `show_passage` | `books` / `StoryBooklet` | CORE |
| `explore_graph` | Pokémon Lab | CORE (fun activity → measured) |
| `journal_write` | `journal` | CORE (tracked `never`) |
| `draw_image` | `art-studio` | **approval-gated** |
| `celebrate` | UI affordance | CORE (anti-sycophancy monitored) |

No workspace/email/system/financial tools are on the child roster. Adult domains
define their own rosters under the same gating model.

---

## 5. Event Schema

All cross-domain communication uses typed events:

```typescript
interface HarnessEvent {
  id: string;
  domain: string;
  type: string;                // e.g. "attempt_submitted", "mastery_updated"
  userId: string;
  sessionId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
  auditRef?: string;           // links to audit envelope
}
```

### 5.1 Standard event types (cross-domain)

| Event | Emitted by | Consumed by |
|-------|-----------|-------------|
| `session_started` | Any domain with sessions | Monitoring, time-limit enforcement |
| `session_completed` | Same | Insights, achievements |
| `incident_raised` | Safety Lane | Safety dashboard, notifications |
| `policy_blocked` | Policy Gate | Monitoring, audit log |
| `agent_fallback` | Agent Runtime | Monitoring, reliability metrics |

### 5.2 Domain-specific events (learning)

| Event | Emitted by | Consumed by |
|-------|-----------|-------------|
| `attempt_submitted` | Evaluation Lane | Learner Model (kids-pcg), Postgres snapshot |
| `mastery_updated` | Learner Model sync | SkillProgressService, parent dashboards |
| `plan_generated` | Learning planner | Learn hub UI, planner |
| `misconception_detected` | Tutor orchestrator | Spaced-review scheduler |

---

## 6. Existing Infrastructure → Harness Mapping

The ecosystem-dashboard already has significant infrastructure. The harness
formalizes and unifies it rather than replacing it.

| Existing component | Harness role |
|-------------------|-------------|
| `src/lib/agent/AIAgentRuntime.ts` | Agent Runtime (general-purpose) |
| `src/agents/OrchestrationEngine.ts` | Multi-agent orchestration patterns |
| `src/lib/kids-pic/LearningTutorOrchestrator.ts` | Legacy single-shot tutor (superseded by `PiCodeTransport` + `AgentLoopService`) |
| `src/lib/platform/content-filter-service.ts` | Safety Lane: input + output filtering |
| `src/lib/kids-pic/AIChildSafetyMonitor.ts` | Safety Lane: child-specific output checks |
| `src/lib/platform/child-service-middleware.ts` | Policy Gate: child parental controls |
| `src/lib/kids-pic/learning-access.ts` | Policy Gate: learning-specific access enforcement |
| `src/lib/kids-pic/SkillProgressService.ts` | Evaluation Lane: proficiency + analytics (Postgres) |
| `src/lib/kids-pic/LearningPhase1Service.ts` | Evaluation Lane: content catalog + attempt grading |
| `src/lib/kids-pic/LearningSessionService.ts` | Session Loop: learning session lifecycle |
| `src/lib/kids-pic/learning-planner.ts` | Process: plan generation (adaptive) |
| `src/lib/kids-pic/KidsPCGService.ts` | Entity: child PCG profile + knowledge |
| `src/lib/kids-pic/PCGCharacterContext.ts` | Entity: child context for agent personalization |
| `src/lib/kids-pic/PCGSafetyService.ts` | Entity: privacy-first parent insights + safety checks |
| `services/kids-pcg/` (FastAPI + Neo4j) | Skill Graph: authoritative learner model |
| `src/pages/api/pcg/[...path].ts` | Entity proxy: kids-pcg access from dashboard |
| `src/services/ApprovalService.ts` | Policy Gate: human-in-the-loop approval pipeline |
| `src/lib/platform/child-account-types.ts` | Shared: child account config + controls types |

---

## 7. Harness-Ready Checklist

A feature or domain is **Harness-Ready** when ALL of the following are true:

The **Kid's Learning Platform** passes all checks (Phase B complete):

- [x] **Agent-defined** — the operation is modeled as one or more agents from
      the roster (Section 1.2) pursuing an explicit goal, running the cognitive
      loop (Section 1.3).
- [x] **Bounded autonomy** — the agent cannot bypass the Policy Gate or Safety
      Lane; rails can override the agent at any phase.
- [x] **Memory-backed** — the agent reads from and writes to persistent memory
      (PCG / learner model), so the harness gets smarter over time.
- [x] **Adaptive loop wired** — evaluation feeds back into next-best-action /
      scheduling via the harness (Section 4.5): spaced-review scheduler +
      mastery-sync process close the loop.
- [x] **Policy Gate present** — request passes through auth + rate limit +
      parental controls (if child) + feature flags before agent execution.
- [x] **Safety Lane present** — input and output pass through content filter +
      domain-specific safety checks (age-appropriateness for child domains).
- [x] **Evaluation Lane present** — agent output is scored via deterministic,
      rubric, or AI analysis method; result emits the correct event.
- [x] **Event emission** — domain emits typed events for key state transitions.
- [x] **Audit envelope** — every agent execution produces a structured audit
      record (agent id, model, contract, latency, safety results).
- [x] **Typed contracts** — request/response interfaces match the harness
      contract (Section 4.1).
- [x] **FSD layer compliance** — code is organized into entities/features/
      processes/widgets/shared with correct dependency direction.
- [x] **Tests** — policy gate, safety lane, and evaluation lane have unit tests.
- [x] **Fallback** — agent execution has a deterministic fallback path.
- [x] **No hardcoded secrets** — all credentials flow through Infisical.
- [x] **Agent-loop hosted** *(Phase E ✅ complete)* — Reason/Plan/Act runs in an Agent
      Execution Engine (Pi Code CLI) that selects gated tools (Section 4.6). The
      `PiCodeTransport` implements the full cognitive loop with AI Gateway tool
      selection, per-hop Tool Gate checks, per-turn budget, deterministic fallback,
      and trajectory audit. The learning domain now passes **all** checklist items.

---

## 8. Domain Onboarding Process

When a new domain (or an existing domain being migrated) joins the harness:

1. **Define entities** — data models + persistence contracts.
2. **Define features** — use-case orchestration that calls the Agent Runtime.
3. **Wire Policy Gate** — auth, rate limit, parental controls, feature flags.
4. **Wire Safety Lane** — input + output filtering using existing services.
5. **Wire Evaluation Lane** — scoring method + event emission.
6. **Define events** — domain-specific events + subscribe to cross-domain events.
7. **Build widgets** — UI components that consume features/processes.
8. **Pass Harness-Ready checklist** (Section 7).
9. **Register domain** in the harness domain registry.

---

## 9. Migration Strategy

### Phase A — Architecture + contracts (no behavior changes)
- Ratify this document as the canonical harness spec.
- Create `FSD_MIGRATION_MATRIX.md` mapping every current module to its target
  FSD slice.
- Define shared types (`HarnessAgentRequest`, `HarnessAgentResponse`, etc.) in
  `src/lib/harness/`.
- No runtime changes; existing code continues to work as-is.

### Phase B — Learning domain as reference implementation ✅
- Reorganize `src/lib/kids-pic/` into FSD layers (entities/features/processes).
- Wrap existing tutor orchestrator + safety + evaluation in the harness contract.
- Validate the full pipeline: Policy Gate → Safety Lane → Agent → Evaluation →
  Events → Audit.
- Build spaced-review scheduler (`processes/spaced-review.ts`) and mastery-sync
  process (`processes/mastery-sync.ts`) to close the adaptive loop.
- Wire spaced-review schedule into the plan API and Learn hub UI.
- Unit tests for all lanes (policy gate, safety lane, evaluation lane, spaced
  review, mastery sync) — 15 suites, 116 tests passing.
- **Status: complete.** This is now the template for all other domains.

### Phase C — Migrate remaining dashboard domains
- One domain at a time, following the Phase B template.
- Priority order (proposed): email → calendar → research → knowledge graph →
  podcast → Tesla → remaining.
- Compatibility adapters keep existing API routes working during migration.

### Phase D — Unified runtime + cross-domain orchestration
- Single Agent Runtime entry point for all domains.
- Cross-domain event bus fully wired.
- OrchestrationEngine becomes the harness-level multi-agent coordinator.

### Phase E — Agent Execution Engine (Pi Code CLI) ✅ complete
- Integrated the **Pi Code CLI** as the learning domain's agent runtime (Section
  1.5): `PiCodeTransport` (`src/domains/learning/shared/transports/picode-transport.ts`)
  implements the full cognitive loop with AI Gateway tool selection, ambient-context
  budget, and gateway-mediated inference.
- Defined + enforced the **child CORE tool roster** and **Tool Gate** (Section 4.6):
  `CORE_TOOL_ROSTER` in `src/domains/learning/shared/tool-roster.ts`, per-turn hop
  budget, `checkToolGate()` allow-list on every hop, Safety Lane on every hop,
  approval-service deferral for sensitive tools.
- Replaced the single-shot tutor with the Pi Code-hosted tool-using loop
  (`src/domains/learning/features/agent-loop.ts`); the deterministic message is the
  `agent_fallback` path; harness pipeline + audit + events preserved.
- The **agent-loop-hosted** checklist item (Section 7) is checked; the audit trail
  records the full tool trajectory.
- **Status: complete.** The reference domain is now a governed agent loop, not a
  governed single-shot. See `LEARNING_PLATFORM_ROADMAP.md` Phase 6 +
  `KIDS_DASHBOARD_HARNESS_AUDIT.md` Phase 6 for details.

---

## 10. Guardrails

**DO**
- Model operations as **agents pursuing goals** (roster, Section 1.2), not as
  bare request handlers.
- Keep agent autonomy **bounded** — the Policy Gate and Safety Lane always win.
- Route adaptation through the **harness** (Section 4.5), so it gets smarter for
  every domain at once.
- Reuse existing safety, policy, and evaluation infrastructure.
- Keep each domain's FSD layers independent (no cross-domain imports except via
  shared/ or events).
- Maintain backward compatibility during migration (adapters, not rewrites).
- Treat the learning domain as the reference — other domains follow its pattern.
- Run the agent loop in the **Agent Execution Engine** (Pi Code CLI, Section 1.5)
  and give it only a **gated Tool Roster** (Section 4.6).
- Keep authoritative grading + mastery writes **server-side**, even when a tool
  triggers them.
- Make every user-facing surface a **Context Provider** (Section 1.6) so the agent
  is always in the loop and can explain what's on screen; safety-screen focus
  content before it enters the envelope.

**DON'T**
- Don't let an agent reach a child without passing the Safety Lane — autonomy
  never overrides child safety.
- Don't re-implement adaptation per feature — use the harness adaptive loop.
- Don't create a second safety system or a second agent runtime.
- Don't skip the Policy Gate or Safety Lane for any agent execution.
- Don't allow widgets to call entities or agent runtimes directly.
- Don't hardcode domain logic in shared/ — shared is for cross-domain utilities
  only.
- Don't emit untyped events — all events must implement `HarnessEvent`.
- Don't let an agent loop call a tool that is not on its roster, or skip the Tool
  Gate (allow-list + Safety Lane + approval deferral) on any hop.
- Don't build a second agent execution engine — Pi Code is canonical; any
  alternative must honor the same rails (Section 1.5).
- Don't let the Context Hub call the model or act as a second agent runtime — it
  prepares context only; the engine runs the loop.
- Don't let long-form context crowd out the in-focus frame, and never put
  unfiltered on-screen content into the envelope.
