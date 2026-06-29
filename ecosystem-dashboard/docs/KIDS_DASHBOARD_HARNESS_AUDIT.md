# Kids Dashboard — FSD Agentic Harness Alignment Audit

> Status: **Active audit + ordered task backlog.** Phases 6–10 are complete;
> remaining work is Phases 11–12 + Phase D. This document grades the Kid's
> Learning Platform against the canonical vision and sets the order of work to
> close the gaps. **It contains NO code.**
>
> Vision (owner, 2026-06-21): *An agent-first learning platform for children where
> parents monitor/approve/interact via the parent dashboard, and the harness +
> agent get smarter as the child learns. It adapts to each child's learning style,
> measures outcomes against age-based goals, promotes advanced learning, and teaches
> through fun activities (e.g. Pokémon analytics). The agentic loop is hosted by the
> **Pi Code CLI** (the same engine used in the Atlas PiCode IDE) to handle LLM tools,
> peripherals, memory, and the chat interface. The whole platform is multi-tenant,
> multi-agent ready, and aligned with the FSD Agentic Harness.*
>
> Companion docs:
> - `docs/FSD_AGENTIC_HARNESS.md` — canonical harness architecture + contracts
> - `docs/LEARNING_PLATFORM_ROADMAP.md` — learning domain spec + phased delivery
> - `docs/AGENT_CONTEXT_HUB.md` — always-on context spine (focus + long-form)
> - `docs/LEARNING_EXPERIENCE_DESIGN.md` — Brilliant-style child learning experience
> - `docs/KIDS_DASHBOARD_UX_PLATFORM_AUDIT.md` — UI/UX + theming + settings/parent-portal + scaling abstractions (pre-code)
> - `docs/KIDS_PLATFORM_CONTRACTS.md` — ratifiable contracts for the pre-code abstractions (registry/theme/context/companion/tool roster)
> - `docs/FSD_MIGRATION_MATRIX.md` — module → FSD slice mapping
> - `KIDS_DASHBOARD_ASSESSMENT.md` / `KIDS_DASHBOARD_INVENTION_GAP.md` (root) —
>   historical assessments (2026-06-14), now partially superseded (see §10)

---

## 1. Executive Summary

The Kid's Learning Platform is **now agent-first in execution.** The governance
substrate (Policy Gate, Safety Lane, Evaluation Lane, audit envelope, typed
events), the FSD layering, the learner model (kids-pcg), and the adaptive loop
(planner, spaced review, mastery sync, misconceptions, learning paths, content
generation) are all real and wired. **Phases 6–10 are complete**: the tutor runs
a real tool-using cognitive loop via `PiCodeTransport`, parents can approve and
steer via assignments + goals, the harness consolidates overnight via the dream
engine, Pokémon Lab is wired to the learner model, and learning-style signals
adapt the plan.

**Remaining gaps** are Phases 11–12 (Context Hub for every-surface agent
presence; Brilliant-style learning experience) and Phase D (multi-agent
coordination + multi-tenant hardening).

---

## 2. Scope & Method

Reviewed:

- **Child surfaces** — `src/pages/child/*` (home, learn, chat, workspace,
  dictionary, journal, books, planner, art-studio, pokemon-lab, learning-path,
  teams) and `src/components/child/*`.
- **Learning domain** — `src/domains/learning/{entities,features,processes,widgets,shared}`
  and the legacy `src/lib/kids-pic/*` implementations they re-export.
- **Harness runtime** — `src/lib/harness/{types.ts,runtime/pipeline.ts,events/*}`.
- **Agent execution** — `LearningTutorOrchestrator.ts`, `api/learn/tutor/turn.ts`,
  `api/learn/attempt.ts`, `api/learn/plan.ts`.
- **Parent surfaces** — `src/pages/family/[childId]/learning.tsx`,
  `ParentAssignmentManager.tsx`.
- **Ecosystem context** — root `ARCHITECTURE.md`, `AGENTS.md`, `SOUL.md`,
  `.picode/ambient.json`, `services/atlas-agent/*`, Nova references.
- **Canonical docs** — `FSD_AGENTIC_HARNESS.md`, `LEARNING_PLATFORM_ROADMAP.md`,
  `FSD_MIGRATION_MATRIX.md`, and the two root assessments.

---

## 3. Alignment Scorecard

Legend: ✅ aligned · 🟡 partial · ❌ missing.

| # | Vision dimension | Status | Evidence / gap |
|---|------------------|--------|----------------|
| 1 | **FSD layering** | ✅ | `src/domains/learning/*` all five layers, adapters to `kids-pic`. |
| 2 | **Policy Gate** | ✅ | `features/access-control.ts` (parental controls, time/usage limits). |
| 3 | **Safety Lane** | ✅ | content filter + `AIChildSafetyMonitor` on input + output every turn. |
| 4 | **Evaluation Lane** | ✅ | deterministic + rubric grading (`attempt-grading`, writing rubric). |
| 5 | **Memory (PCG)** | ✅ | kids-pcg Neo4j authoritative; Postgres analytics overlay. |
| 6 | **Audit + typed events** | ✅ | `runHarnessPipeline` on attempt/turn/plan; `HarnessEvent`/audit envelope. |
| 7 | **Adaptive loop** | 🟡 | planner + spaced-review + mastery-sync + misconceptions exist, but are **request-driven**, not harness-self-driven (no autonomous next-best-action). |
| 8 | **Agent-first execution** | ✅ | Tutor runs a real tool-using cognitive loop via `PiCodeTransport` + `AgentLoopService`; no longer single-shot. |
| 9 | **Agent Execution Engine (Pi Code CLI)** | ✅ | `PiCodeTransport` (`src/domains/learning/shared/transports/picode-transport.ts`) integrated; full cognitive loop with gated tool selection. |
| 10 | **Child agent tool roster + gating** | ✅ | `CORE_TOOL_ROSTER` with 11 tools + `checkToolGate()` allow-list on every hop; `SkillRegistry` auto-registers tools. |
| 11 | **Adapts to learning style** | ✅ | `LearningStyleSignalCollector` infers pace/modality/fatigue/reading level; `composePlan` adapts plan size based on pace. |
| 12 | **Age-based goals + outcome measurement** | ✅ | `GoalScorecardService` maintains per-child age-based goals; `GoalScorecardCard` surfaces progress to parents. |
| 13 | **Fun activities = measured learning** | ✅ | Pokémon Lab wired to learner model with skill code mapping, mastery routing, and `explore_graph` agent tool. |
| 14 | **Parent monitor** | ✅ | `PCGInsightsDashboard`, `SkillProgressDashboard`, `AISafetyDashboard`. |
| 15 | **Parent approve agent actions** | ✅ | Assignment CRUD + parent goals + goal scorecard; sensitive tools (`draw_image`) are approval-gated in the tool roster. |
| 16 | **Parent interact / steer planner** | ✅ | Parent goals steer the planner's next-best-action via `parent-goal-service.ts`; assignments feed priority skill codes to `composePlan`. |
| 17 | **Harness gets smarter (offline)** | ✅ | `dream-engine.ts` + `dream-consolidator.ts` run nightly consolidation; parent digest via `DreamDigestCard.tsx`. |
| 18 | **Multi-tenant** | 🟡 | per-user PCG DBs + Luca/Sofia as distinct users (root `ARCHITECTURE.md`); verify tenant-scoping + parent-access checks on kids tables. |
| 19 | **Multi-agent ready** | 🟡 | `OrchestrationEngine` exists but is not the harness-level coordinator for learning. |
| 20 | **Agent always-in-the-loop (every surface)** | ❌ | Tutor lives on the chat surface only; lessons/art/journal/books/Pokémon are not agent-aware. Needs the Context Hub + per-surface providers. |
| 21 | **Context Hub (in-focus + long-form anchoring)** | ❌ | No context spine; agent can't "explain what's on screen." Design: `AGENT_CONTEXT_HUB.md`. |
| 22 | **Brilliant-style learning experience** | 🟡 | Learn hub + content + paths exist, but not the card system / narrative skill-map / gentle gamification / ZPD-bounded adaptivity. Design: `LEARNING_EXPERIENCE_DESIGN.md`. |

---

## 4. What's aligned (keep, don't rebuild)

- **Governance substrate is genuine defense-in-depth.** Every tutor turn passes
  auth → parental controls → input filter → (generate) → output filter →
  `AIChildSafetyMonitor` → audit + events. This is the hard part and it's done.
- **Learner model is real.** kids-pcg holds per-skill mastery (EMA), prerequisites,
  misconceptions, and `next-objectives` planning; Postgres mirrors proficiency for
  parent dashboards. This is the "education PCG" the 2026-06-14 invention-gap doc
  called the keystone — it now exists.
- **Adaptive content pipeline is forming.** Planner composes plans from
  next-objectives + assignments + spaced review + misconceptions + (new) learning
  paths; the new `/api/learn/content/generate` endpoint produces safety-screened
  candidate items.
- **FSD reorganization is consistent** and uses re-export adapters, so the
  agentic-execution work can land behind the same domain boundaries.

---

## 5. Keystone gap — CLOSED (Phase 6 complete)

### 5.1 What the code does now

`src/domains/learning/shared/transports/picode-transport.ts` →
`PiCodeTransport` + `src/domains/learning/features/agent-loop.ts` →
`AgentLoopService`:

1. Builds context from learner state (mastery, misconception, plan) + ambient
   context budget.
2. Calls AI Gateway to select which tool to call next (JSON response:
   `{nextAction, arguments, finalMessage}`).
3. Each tool hop passes `checkToolGate()` (allow-list) before execution.
4. Loop runs up to `maxHops` (default 3), then does a final reasoning call.
5. On any failure, returns a **deterministic templated string** (`agent_fallback`).
6. Full tool trajectory is recorded in the audit envelope.

The cognitive loop (perceive → reason → plan → act → reflect) is now run by a
**real agent** with autonomous tool selection, not hand-coded imperative orchestration.
The harness rails wrap every hop — Policy Gate, Safety Lane, Evaluation Lane, audit.

### 5.2 What was required (now delivered)

A **real agent loop** that can, within a single child turn, autonomously:

- read learner state (mastery, misconception, plan) from memory,
- choose a **tool** (ask Socratic question, fetch/generate a problem, give a
  laddered hint, narrate, draw, define a word, read-aloud, check an answer,
  celebrate),
- observe the result, and decide the next step — all under the Safety Lane.

**Status: ✅ delivered.** The `PiCodeTransport` hosts the loop; the `CORE_TOOL_ROSTER`
defines the allow-list; `checkToolGate()` enforces it on every hop.

### 5.3 Why this was integration, not invention

The harness rails (Policy Gate, Safety Lane, Evaluation Lane, audit) already existed
to **bound** an agent. The tools already existed as **surfaces**. The missing piece
was a loop engine that calls gated tools — which Pi Code provides. The work was: (a)
expose surfaces as tools, (b) host the loop in Pi Code, (c) keep every hop inside
the existing rails. **All three are now done.**

---

## 6. Proposed child agent tool roster (CORE allow-list)

Everything else is **blocked by default** (bounded autonomy, Principle 3). Each
tool maps to an existing surface and is wrapped by the Safety Lane.

| Tool | Maps to existing surface | Notes |
|------|--------------------------|-------|
| `ask_socratic` | tutor prompt generation | hint-laddered, never the answer |
| `give_hint` | `hintSet` escalation in `attempt.ts` | level bounded by attempt # |
| `generate_problem` | `/api/learn/content/generate` + STAAR Tutor (:8790) | verified/checkable items only |
| `check_answer` | `attempt-grading` (deterministic + rubric) | authoritative grading stays server-side |
| `define_word` | `dictionary.tsx` / `HighlightToDefine` | tracked `never` |
| `read_with_me` | `ReadAloudButton` / TTS | reading support |
| `show_passage` | `books` / `StoryBooklet` | leveled by `reading_level` |
| `draw_image` | `art-studio` (approval-gated) | reinforcement, not graded |
| `journal_write` | `journal.tsx` | reflection, tracked `never` |
| `explore_graph` | **Pokémon Lab** | fun activity → measured (see §8) |
| `celebrate` | UI affordance | growth-mindset, anti-sycophancy monitored |

**Gating model (borrow from Nova `turn_tool_policy.py`):** a tiny always-on CORE
set + per-intent unlocks + per-turn tool budget; pre-tool allow-list check; Llama
Guard on every hop; post-response `AIChildSafetyMonitor`; approval-service deferral
for sensitive/irreversible actions (e.g. image generation).

---

## 7. Parent-in-the-loop gaps

The vision is **monitor + approve + interact**. Today:

- **Monitor** ✅ — three dashboards (insights, skills, safety).
- **Approve** 🟡 — assignment CRUD + per-page book-content approval exist, but the
  new AI **content-generation** output has **no parent/owner review queue** (roadmap
  L4 requires owner approval before graded use). Generated items are returned with a
  `safetyPassed` flag and `reviewStatus: 'draft'` but nothing routes them to a human.
- **Approve agent actions** ❌ — no surface to approve a tool/action the agent wants
  to take (defer to the JIT `approval-service`).
- **Interact / steer** ❌ — parent goal-setting ("focus Sofia on sight words this
  week") does not yet feed the planner's next-best-action.

---

## 8. Fun activities as measured learning (Pokémon Lab)

`PokemonLab.tsx` teaches knowledge-graph concepts (nodes, edges, queries) through a
lesson/section progression with local completion state. It is **not** connected to
the learner model, mastery, skill codes, or age-based goals — so it's "fun" but not
"measured." To align: map its lessons to `analytical`/`science` skill codes, route
completion through `attempt`/mastery, and expose it to the agent as the
`explore_graph` tool so the tutor can *assign* it as a plan activity (like a learning
path step) and measure outcomes.

---

## 9. Multi-tenant / multi-agent readiness

- Root `ARCHITECTURE.md` now shows **per-user PCG/CIG databases** and Luca/Sofia as
  distinct platform users — a real improvement over the single-user PCG flagged in
  the 2026-06-14 assessment. **Verify** that kids tables carry `tenant_id` scoping
  and that the parent-access check validates the parent→child relationship (the
  earlier `/api/child/pic.ts` isolation bug).
- **Multi-agent:** `OrchestrationEngine` exists but is not yet the harness-level
  coordinator for the learning domain (harness Phase D). The Pi Code loop should
  register as the learning domain's agent runtime so cross-domain orchestration
  (e.g. Infra/Nova/Dream) can coordinate it.

---

## 10. Documentation reconciliation

- `FSD_AGENTIC_HARNESS.md` and `LEARNING_PLATFORM_ROADMAP.md` are the **canonical**
  docs; they are patched (this change set) to add the Agent Execution Engine
  (Pi Code), the child tool roster, and kids Dreaming, and to correct the
  single-shot-vs-agentic-loop description.
- Root `KIDS_DASHBOARD_ASSESSMENT.md` + `KIDS_DASHBOARD_INVENTION_GAP.md`
  (2026-06-14) are **historical**. Much of their "invention gap" is now built
  (learner model, tutor orchestration, planner, safety lane, assignments). They are
  marked superseded and point here + to the canonical docs. Their still-relevant
  ideas — **child tool allow-list, kids Dreaming, persona-as-data, verified
  generation, parent learning-loop** — are carried forward into the backlog below.

---

## 11. Ordered Task Backlog (the order to tackle)

Each task is independently demoable and keeps the system working at every step.
Phases continue the roadmap's numbering (Phases 0–5 done).

### Phase 6 — Agentic Tutor via Pi Code CLI *(keystone)* ✅ complete
1. **Pi Code integration** — `PiCodeTransport`
   (`src/domains/learning/shared/transports/picode-transport.ts`) implements the
   full cognitive loop with AI Gateway tool selection, ambient-context budget, and
   gateway-mediated inference.
2. **Child tool roster + gating contract** (§6) — `CORE_TOOL_ROSTER` with 11 tools,
   `checkToolGate()` allow-list, per-turn hop budget, Safety Lane on every hop.
3. **Replaced single-shot tutor** — `tutor-turn` route delegates to `AgentLoopService`;
   deterministic fallback is the `agent_fallback` path; harness pipeline + audit +
   events preserved.
4. **Acceptance** — ✅ A child completes a math/reading turn where the agent
   autonomously selects ≥1 tool, every hop is rail-checked, and the audit envelope
   records the tool trajectory.

### Phase 7 — Parent approval + steer ✅ complete
5. **Assignment CRUD + parent goals** — `ParentAssignmentManager`, `assignment-service`,
   `parent-goal-service`, and `goal-scorecard-service` give parents full control.
6. **Goal-setting → planner** — parent goals steer the planner's next-best-action;
   assignments feed priority skill codes to `composePlan`.
7. **Acceptance** — ✅ A parent assigns skills + sets goals; the child's next plan
   reflects them; goal progress is visible via `GoalScorecardCard`.

### Phase 8 — Kids Dreaming ✅ complete
8. **`kids_dream` consolidation job** — `dream-engine.ts` + `dream-consolidator.ts`
   run nightly: compact the day → extract insight → update learner model +
   spaced-review schedule → generate tomorrow's plan + parent digest.
9. **Acceptance** — ✅ After a session day, the next plan is informed by consolidated
   insight and the parent receives a digest via `DreamDigestCard`.

### Phase 9 — Fun-activities-as-measured-learning ✅ complete
10. **Pokémon Lab wired to learner model** — lessons mapped to skill codes, completion
    routed through mastery, exposed as `explore_graph` agent tool, surfaced in plans.
11. **Acceptance** — ✅ Completing a Pokémon Lab lesson advances a tracked skill and
    appears in parent insights via `PokemonLabProgressCard`.

### Phase 10 — Learning-style adaptation + outcome goals ✅ complete
12. **Learning-style signals** — `LearningStyleSignalCollector` infers pace/modality/
    fatigue/reading level; `composePlan` adapts plan size based on pace.
13. **Age-based goal scorecard** — `GoalScorecardService` maintains per-child goals;
    `GoalScorecardCard` surfaces progress to parents.
14. **Acceptance** — ✅ Two learners with different styles receive measurably different
    pacing; goal progress is visible to parents.

### Phase 11 — Agent Context Hub (always-on context spine) *(do with Phase 6)*
15. **Context contracts + Hub v1** — `ContextFrame`/`ContextEnvelope`/`ContextProvider`;
    compose in-focus (active surface) + budgeted long-form (PCG summary) + per-surface
    Tool Roster into the Pi Code ambient budget. Roll out providers (lessons + free
    chat first), then the always-present **Tutor Companion** UI.
16. **Acceptance** — on any child surface, "Explain this" resolves to the on-screen
    focus frame; every hop is rail-checked. (Pairs naturally with Phase 6 — the loop
    needs context; the context needs a loop.)

### Phase 12 — Brilliant-style learning experience
17. **Card system + hint ladder + narrative skill-map + mastery visuals + gentle
    gamification + ZPD-bounded adaptivity + growth-mindset feedback**, grounded in
    childhood learning science. Design: `LEARNING_EXPERIENCE_DESIGN.md`.
18. **Acceptance** — a child completes a problem-first card → hint ladder → mastery
    visual end-to-end with the always-present Socratic tutor and no answer-giving.

### Phase D (harness-level) — Multi-agent coordination + multi-tenant hardening
19. **Register Pi Code loop as the learning agent runtime** in the harness; let
    `OrchestrationEngine` coordinate it cross-domain.
20. **Verify tenant scoping** on kids tables + parent-access relationship checks;
    reconcile dual tenant schemas if still split.

---

## 12. Quick reference — key files

- Single-shot tutor (superseded): `src/lib/kids-pic/LearningTutorOrchestrator.ts`
- Agent loop (current): `src/domains/learning/features/agent-loop.ts`
- Pi Code transport: `src/domains/learning/shared/transports/picode-transport.ts`
- Tool roster + gate: `src/domains/learning/shared/tool-roster.ts`
- Tutor turn route: `src/pages/api/learn/tutor/turn.ts`
- Attempt + path/assignment completion: `src/pages/api/learn/attempt.ts`
- Planner + path injection + learning-style: `src/pages/api/learn/plan.ts`
- Dream engine: `src/domains/learning/analytics/dream-engine.ts`
- Dream consolidator: `src/domains/learning/processes/dream-consolidator.ts`
- Learning-style signals: `src/domains/learning/analytics/learning-style-signals.ts`
- Goal scorecard: `src/domains/learning/parent/goal-scorecard-service.ts`
- Parent goals: `src/domains/learning/parent/parent-goal-service.ts`
- Content generation (needs review queue): `src/pages/api/learn/content/generate.ts`
- Harness pipeline/types/events: `src/lib/harness/{runtime/pipeline.ts,types.ts,events/*}`
- Learner model: kids-pcg (Neo4j) via `src/pages/api/pcg/[...path].ts`
- Fun activity (wired to mastery): `src/components/child/PokemonLab.tsx`
- Pi Code ambient config: `.picode/ambient.json` (repo root)
