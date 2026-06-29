# Kids Platform — Post-Contracts Gap Audit (2026-06)

> Status: **Code-grounded audit + prioritized backlog.** Verifies the *actual wired
> state* of the Kid's Learning Platform after the `KIDS_PLATFORM_CONTRACTS.md`
> abstractions landed (Activity Registry, Activity Theme, Context Hub types, Tutor
> Companion, Agent Transport seam, Tool Roster). Distinguishes **declared** contracts
> from **enforced** behavior. Grounded in the codebase, not aspiration.
>
> Reads with:
> - `docs/KIDS_PLATFORM_CONTRACTS.md` — the ratified contracts being implemented
> - `docs/KIDS_DASHBOARD_HARNESS_AUDIT.md` — the agent-execution gap analysis (still valid)
> - `docs/KIDS_DASHBOARD_UX_PLATFORM_AUDIT.md` — UI/UX + scaling abstractions (pre-code)
> - `docs/LEARNING_EXPERIENCE_DESIGN.md` — Brilliant-style pedagogy spec (target)
> - `docs/FSD_AGENTIC_HARNESS.md` — canonical harness architecture

---

## 1. Verdict

The **governance harness** (safety, policy, audit, learner model) is strong and the
**platform seams** from the contracts work are clean. But the platform is **not yet
agentic-first**, and the new abstractions are largely **declared, not enforced**. The
highest-leverage work is connecting three load-bearing wires that already have both
ends built, then giving the tutor a real agent loop and the learner a Brilliant-style
card experience.

---

## 2. What is actually built (verified)

| Area | State | Evidence |
|------|-------|----------|
| Harness rails (auth→filter→safety→audit) | ✅ enforced | `api/learn/tutor/turn.ts`, `AIChildSafetyMonitor` |
| Learner model (kids-pcg + Postgres mirror) | ✅ enforced | mastery EMA, prerequisites, misconceptions |
| Activity Registry + Activity Theme | ✅ built | `domains/learning/shared/activity-types.ts`, `activity-theme.ts` |
| Pokémon Lab theming via SurfaceContext | ✅ wired | `PokemonLab.tsx` `DEFAULT_SURFACE`/`useSurface()` |
| Pokémon Lab → measured learning | ✅ wired | `LESSON_SKILL_CODES` → `/api/learn/attempt` + `pathId`/`pathStepNumber` |
| Context Hub / Transport / Tool Roster types | ✅ declared | `context-hub.ts`, `agent-transport.ts`, `tool-roster.ts` |
| Tutor Companion UI | 🟡 one surface | rendered only on `pages/child/pokemon-lab.tsx` |

---

## 3. Critical gaps — three disconnected wires

Both ends exist; the connection does not. These are the cheapest, highest-impact fixes.

### 3.1 Context Envelope assembled, then discarded
`pages/child/pokemon-lab.tsx` builds a rich `ContextEnvelope`, but
`GooseMindTransport.buildTutorBody()` forwards only
`childId/contentItemId/message/attemptNumber/sessionId`. The on-screen focus frame —
the entire point of "explain *this*" — never reaches the backend. **The tutor is
context-blind despite full plumbing.** (`transports/goosemind-transport.ts`)

### 3.2 Tool Gate tested, never enforced
`checkToolGate()` is referenced only in `__tests__/unit/pokemon-lab-mastery.test.ts`.
No runtime path calls it because no agent selects tools. Bounded autonomy is a type,
not a behavior. (`tool-roster.ts`)

### 3.3 Companion is a one-off, not unified
`TutorCompanion` renders only on the Pokémon Lab page (side-by-side). `RightPanelContext`
defines `tutor` tabs for `child-learn`/`child-pokemon-lab`, but `usePanelResolver.ts`
has no mapping that renders `TutorCompanion` in the panel slot — other surfaces still
use bespoke helpers. "Always-present companion on every surface" is unmet.

---

## 4. Gaps by pillar

### 4.1 Agentic-first (largest gap)
- **Tutor is a single-shot LLM call** (`generateTutorMessageViaOrchestrator`) with a
  deterministic fallback — no perceive→reason→act→reflect loop, no tool selection.
- **No Pi Code CLI integration** — `PiCodeTransport` swap-point exists but unimplemented.
- **Opportunity:** a real loop behind the `AgentTransport` seam that calls gated tools
  (`ask_socratic`, `give_hint`, `generate_problem`, `check_answer`) with `checkToolGate`
  enforced per hop, keeping the deterministic path as `agent_fallback`.

### 4.2 Brilliant-inspired pedagogy (~0% built vs `LEARNING_EXPERIENCE_DESIGN.md`)
- No card system (Try/See/Explain/Play/Check, CPA ordering, read-aloud per card).
- No tiered hint ladder UI (`give_hint` level-bounding unenforced).
- No narrative skill-map; paths are data only.
- No mastery visuals / spaced-review burst; no gentle gamification; no ZPD-bounded
  adaptive difficulty (70–85% target band).

### 4.3 Harnessed (strong, two holes)
- **No AI-content review queue** — `content/generate.ts` stamps `reviewStatus: 'draft'`
  but nothing routes drafts to a human; no parent approve UI.
- **No "kids Dreaming"** nightly consolidation job.

### 4.4 Platform / scale
- **No Child Profile/Settings entity** — identity/persona/reading-level/learning-style/
  accessibility/limits scattered; not agent-readable.
- **Parent portal is a monitor, not a control plane** — no goals→planner steering, no
  per-child bounds, no agent-action approval.
- **No learning-style/affect model** — pace/modality/fatigue/frustration uncaptured.

---

## 5. Minor issues
- `TutorCompanion.tsx` header uses invalid Chakra `shrink={0}` (should be `flexShrink`).
- Companion quick-actions send a concatenated string instead of a structured intent
  payload — brittle once a real agent parses intents.

---

## 6. Prioritized backlog (highest leverage first)

1. **Connect the 3 wires** (§3) — context through transport; companion in panel slot;
   enforce `checkToolGate`. Small, makes the abstractions real.
2. **Real agent loop** (§4.1) — tool-using tutor behind the transport seam.
3. **Brilliant card system + hint ladder** (§4.2) — on Pokémon Lab as reference surface.
4. **Parent control plane** (§4.3/§4.4) — content review queue + goals→planner.
5. **Kids Dreaming** (§4.3) — nightly consolidation → plan + parent digest.

---

## 7. Quick reference — key files
- Transport (drops context): `src/domains/learning/shared/transports/goosemind-transport.ts`
- Tool gate (unenforced): `src/domains/learning/shared/tool-roster.ts`
- Companion (one surface): `src/components/child/TutorCompanion.tsx`
- Panel resolver (no tutor mapping): `src/components/layout/panels/resolver/usePanelResolver.ts`
- Single-shot tutor: `src/lib/kids-pic/LearningTutorOrchestrator.ts`, `src/pages/api/learn/tutor/turn.ts`
- Content gen (no review queue): `src/pages/api/learn/content/generate.ts`
- Pedagogy target: `docs/LEARNING_EXPERIENCE_DESIGN.md`
