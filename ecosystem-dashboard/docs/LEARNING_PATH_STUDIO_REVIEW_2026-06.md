# Learning Path Studio — Alignment Review & Build Plan (2026-06)

> Status: **Review + actionable backlog.** Assesses the Learning Path Studio against
> the kids' FSD Agentic Harness vision and produces (a) findings, (b) new-activity
> outlines for other agents to implement, (c) a UI / audio-visual upgrade plan,
> (d) a studio-articulation map, (e) a dashboard-cohesion + boundaries statement,
> (f) the PI Code CLI convergence plan, (g) the Context Hub enhancement plan, and
> (h) prompt/abstraction refinements.
>
> Reads with: `FSD_AGENTIC_HARNESS.md` (§1.5 Pi Code, §1.6 Context Hub, §4.6 Tool
> Roster), `AGENT_CONTEXT_HUB.md`, `KIDS_PLATFORM_CONTRACTS.md`,
> `LEARNING_EXPERIENCE_DESIGN.md`, `LEARNING_PLATFORM_ROADMAP.md`.
>
> Scope note: the keystone Context Hub wiring for the Learning Path described in §8
> ships **with** this review (see "Shipped in this pass"). Everything else is an
> outline for follow-up agents.

---

## 0. TL;DR — the one-paragraph verdict

The Learning Path **infrastructure** is strong and harness-aligned: a clean
`LearningPathService` (CRUD + adaptive difficulty + spaced step progress), a
typed API (`/api/child/learning-path`), a Brilliant-style trail UI
(`ChildLearningPath.tsx` + `BrilliantTrail`), and a registered activity in the
Activity Registry. The **gaps** are about *agentic integration and depth*, not
plumbing: (1) the Learning Path surface emits an **empty Context Frame** so the
always-present tutor can't see the child's actual path/step; (2) the path "steps"
are **static text-entry modals**, not agent-driven Brilliant cards; (3) steps
**don't launch the other studios** (Pokémon Lab, Books, Art) so the path is a
to-do list, not a router into measured play; (4) **three different chat/agent
backends** coexist (main chat, learn tutor, PiCode companion) so PI Code is not
yet the single loop; (5) the `child-learn` side panel shows **hardcoded mock**
progress/mastery. This review fixes #1 as a keystone and lays out #2–#5.

---

## 1. Learning Path ↔ FSD Agentic Harness alignment

### 1.1 What's already aligned (keep)

- **Activity Registry entry** exists (`builtin-activities.ts` →
  `KNOWN_ACTIVITY_IDS.LEARNING_PATH`) with route, pageType, persona, greeting,
  quick actions. This is the keystone abstraction working as designed.
- **FSD layering is respected**: entity/service (`LearningPathService.ts`),
  feature export (`features/path-generation.ts`), API (`pages/api/child/learning-path.ts`),
  widget (`components/child/ChildLearningPath.tsx`). Widget → API → service; no
  widget→DB calls.
- **Adaptive loop primitive** present: `completeStep()` adjusts `current_difficulty`
  on score (<0.5 down, >0.85 up) — a local instance of §4.5 Harness-Intelligent
  Adaptation.
- **Policy/auth rails**: the API gates on `getServerSession` + ownership checks
  (`path.childUserId !== userId → 403`).

### 1.2 Gaps vs. the vision (the real work)

| # | Gap | Vision reference | Severity |
|---|-----|------------------|----------|
| G1 | **Empty Context Frame.** `learning-path.tsx` registers `createLearningPathContextProvider(useRef({ childName: '' }))` and never updates the ref. The agent "sees" nothing about the active path/step. | `AGENT_CONTEXT_HUB.md` §3.1 (focus tier); FSD §1.6 | **High** |
| G2 | **Steps are not Brilliant cards.** `handleOpenStep` opens a `Textarea` modal; completion is a client-side `score: 1.0` stub — no diagnose→explain→practice→check, no hint ladder, no "See why". | `LEARNING_EXPERIENCE_DESIGN.md` §2–4 | **High** |
| G3 | **No mastery write-back.** `completeStep` writes to `child_learning_path_steps` only; it does not emit `attempt_submitted` / `mastery_updated` to kids-pcg. The path doesn't move the learner model. | FSD §4.4–4.5, §5.2 | **High** |
| G4 | **Steps don't route into studios.** A step like "Explore patterns" should *launch Pokémon Lab / Books / Art* and harvest the outcome; today it's an inert prompt. | `AGENT_CONTEXT_HUB.md` §7 (fun-as-measured) | **Med** |
| G5 | **Unscoped tool roster.** The activity registers `toolRoster: { id: 'learning-path', tools: [] }`; because `setFocus` does `mergeRosters(activity, CORE)` and CORE is *every* registered skill, the path companion inherits the **entire** surface (incl. `workspace_*` / `pokedex_*`) rather than a curated path roster. Coaching verbs are present, but scoping is too broad. | FSD §4.6 | **Med** |
| G6 | **Path generation is generic.** `generateAdaptivePath` emits 5 hard-coded steps by domain string; it does not read kids-pcg readiness frontiers / next-objectives (ZPD). | `LEARNING_EXPERIENCE_DESIGN.md` §5, §8 | **Med** |
| G7 | **Side panel is mock.** `ChildLearnPanel` progress/path tabs render hardcoded `FOCUS_SKILLS`, `StreakFlame days={5}`, `LevelChip level={3}`. | — | **Med** |

---

## 2. Activity inventory — planned vs. developed, material depth

### 2.1 Preset path templates (`path-templates.ts`)

**7 templates, ~5 steps each, well-authored** (age band + skillCode + prompt +
hints): Counting Adventure (math 5-7), Multiplication Journey (math 8-10), Story
Explorer (reading 5-7), Comprehension Quest (reading 8-10), Young Scientist
(science 8-10), Curiosity Quest (mixed 5-7), Critical Thinker (mixed 11-13).

**Material verdict: skeleton, not a curriculum.** Enough to demo; not enough for
sustained daily use. Concrete gaps:

- **No `writing` templates** at all (despite `PathDomainFocus` including it).
- **Sparse 11-13** (only one mixed) and **no science 5-7**, **no math/reading 11-13**.
- Steps are **single-prompt**, not multi-card micro-skills (the design calls for
  ~5–10 short cards per micro-skill, `LEARNING_EXPERIENCE_DESIGN.md` §6).

### 2.2 Adaptive generation (`generateAdaptivePath`)

Produces a fixed 5-step arc (Warm Up → Practice → Challenge → Creative → Master)
keyed off a domain string. It is **not** reading the PCG readiness frontier, so
"adaptive" is currently cosmetic.

### 2.3 Recommended depth targets

- Each domain × age band should have **≥1 path** with **3–5 micro-skills**, each
  **5–10 cards** (Try/See/Explain/Play/Check) — see §3 outlines.
- Add **writing** and fill **11-13**; add **science 5-7** ("Backyard Scientist").

---

## 3. New activity recommendations — outlines for other agents

> Format: each is a self-contained brief an implementing agent can pick up. All
> must register in the Activity Registry, emit a `ContextFrame`, declare a gated
> tool roster, and write outcomes back to kids-pcg.

### A. **Card Player** (the missing core runtime) — *highest priority*

- **Why:** This is the Brilliant "one micro-action per screen" engine
  (`LEARNING_EXPERIENCE_DESIGN.md` §2). Path steps and Learn Hub lessons should
  both render through it instead of bespoke modals.
- **Build:**
  - `src/domains/learning/widgets/CardPlayer.tsx` rendering card templates
    `try | see | explain | play | check` (reuse `learning-kit` `ConceptCheckCard`,
    `InteractiveLessonCard`, `BigChoiceButton`).
  - Each card is a Context Provider emitting a `lesson_card` frame (title, visible
    content [safety-screened], state, affordances).
  - Wire `give_hint` / `check_answer` (server-authoritative) / `read_with_me`.
  - On `check`, POST `/api/learn/attempt` → emits `attempt_submitted` →
    `mastery_updated`.
- **Acceptance:** a path step of type `card_set` plays N cards, grades server-side,
  advances mastery, exits-on-a-win.
- **Files to touch:** new widget; `ChildLearningPath.handleOpenStep` routes
  `customContentType === 'card_set'` here; `LearningPathService.completeStep` reads
  the real score.

### B. **Narrative Skill-Map** (pathway as world map)

- **Why:** `LEARNING_EXPERIENCE_DESIGN.md` §5 — replace the linear trail with an
  explorable island map; soft prerequisites; mastery restores color/scenes.
- **Build:** `SkillMap.tsx` projecting kids-pcg skills + prerequisite edges +
  `next-objectives` (ZPD) into islands ("Counting Island", "Shapes Forest").
  Adult-facing formal tree behind a parent toggle.
- **Articulation:** tapping an island launches the relevant path or studio.
- **Data:** already in kids-pcg (readiness frontiers seeded in Phase 0).

### C. **Daily Mission** (session shell)

- **Why:** §6 spaced review + §10 session shape. One mission = ~1–2 skills / ~10
  cards, opens with a 3–5 item **review burst**, ends on a win.
- **Build:** `processes/daily-mission.ts` composes: spaced-review picks (from the
  scheduler) → today's-plan ZPD step → reflection. Surfaces as a "Start today's
  adventure" card on Home and the top of the Learning Path.

### D. **Reflection / Metacognition card** (close the loop)

- **Why:** §10 "Reflect" stage + §11 metacognition check-ins ("easy / just right /
  very hard?"). Feeds the affect/engagement long-form slice.
- **Build:** lightweight end-of-step card writing a `learner_reflection` event;
  the tutor uses it next session ("last time this felt tricky — let's warm up").

### E. **Writing Studio path-type** (fills the curriculum gap)

- **Why:** no writing templates exist. Pair with the existing Journal + Books
  studios.
- **Build:** 3 writing paths (5-7 "Sentence Builder", 8-10 "Paragraph Power",
  11-13 "Story Architect"); steps use `journal_write` + rubric `check_answer`.

---

## 4. UI review — Brilliant-style & engagement

### 4.1 Strong today

- `BrilliantTrail` (spine, 3D alternating cards, floating guide mascot, section
  banners, start bar) is genuinely Brilliant-flavored and themable.
- `learning-kit` has the right vocabulary: `MasteryBar`, `StreakFlame`,
  `DailyGoalRing`, `LevelChip`, `XPBurst`, `ConceptCheckCard`,
  `InteractiveLessonCard`.

### 4.2 Upgrade backlog (more dynamic / inspiring)

| Item | Change | Where |
|------|--------|-------|
| U1 | **Animate the spine on progress** — the dotted path "fills" as steps complete (SVG stroke-dashoffset transition); current step pulses. | `BrilliantTrail.TrailPath` |
| U2 | **Predict-then-reveal everywhere** — replace the answer `Textarea` modal with `ConceptCheckCard` / `CardPlayer`. No passive text entry. | `ChildLearningPath` modal |
| U3 | **"See why" after every step** — a short animated explanation; gates fast-guessers (`LEARNING_EXPERIENCE_DESIGN.md` §3). | CardPlayer |
| U4 | **Live mastery, not mock** — feed `ChildLearnPanel` from real kids-pcg mastery; remove `FOCUS_SKILLS` constant. | `ChildLearnPanel`, new `/api/child/learning-path?action=mastery` |
| U5 | **Character-themed paths** — path emoji/colors adopt the active companion skin (Steve/Pusheen/Pokémon) via `useChildTheme`. | trail accent tokens |
| U6 | **Celebration with control** — `XPBurst` + confetti on step complete, with a "calm mode" toggle for sensory-sensitive kids (§7). | step-complete handler |

---

## 5. Visual-audio feedback

### 5.1 What exists

- **Read-aloud / voice is solid**: `useVoiceIO`, `useQwenTTS`, `useTTS` power the
  companion's read-aloud + STT voice input (`TutorCompanion`).

### 5.2 Gap: no gameplay SFX layer

There is **no lightweight sound-effect system** for learning feedback (correct
chime, gentle "not yet", level-up, XP ding). `sound-library.ts` is podcast-studio
oriented.

**Outline — `useLearningSounds` hook:**

- `src/hooks/useLearningSounds.ts` exposing `play('correct' | 'tryAgain' |
  'levelUp' | 'xp' | 'celebrate' | 'step')`.
- Tiny WebAudio-synthesized tones (no asset downloads) OR a small `/audio/learn/`
  set; respect a **mute / calm-mode** preference (persisted) and prefers-reduced.
- Wire into `ConceptCheckCard.onOutcome`, `XPBurst`, and step-complete.
- Pair every sound with its visual (dual-coding); never sound-only.

---

## 6. Studio articulation map

The Learning Path should be the **router + ledger** for the other studios — a step
launches a studio, the studio reports an outcome, the path advances.

```
                       ┌──────────────────────────────────────────┐
                       │             LEARNING PATH (router)         │
                       │  step.skillCode + step.customContentType   │
                       └───────┬───────────┬───────────┬──────────-┘
        card_set ▼        explore ▼     read ▼     create ▼
   ┌──────────────┐  ┌──────────────┐ ┌─────────┐ ┌──────────────┐
   │  Card Player │  │ Pokémon Lab  │ │  Books  │ │ Art / Journal│
   │ (A, §3)      │  │ explore_graph│ │show_pass│ │ draw/journal │
   └──────┬───────┘  └──────┬───────┘ └────┬────┘ └──────┬───────┘
          │ attempt         │ outcome      │ reading      │ artifact
          ▼                 ▼              ▼              ▼
   ┌─────────────────────────────────────────────────────────────┐
   │   kids-pcg mastery  ◄── attempt_submitted / mastery_updated   │
   │   + Context Hub long-form (recentTopics, mastery, ZPD)        │
   └─────────────────────────────────────────────────────────────┘
```

**Concrete articulation rules (outline):**

- Add `studioLaunch?: { activityId; params }` to `PathStep`. When a step has it,
  `handleOpenStep` navigates to that studio with a `returnTo=learning-path&step=N`
  query; the studio calls back `complete-step` with a real score on finish.
- Map `customContentType` → studio: `explore → pokemon-lab`, `read → books`,
  `writing → journal`, `art → art-studio`, `problem/question → card-player`.
- The **companion is the connective tissue**: because every studio is a Context
  Provider, the same PiCode loop can say "this Pokémon hunt practices *sorting* —
  the same skill as your path step."

---

## 7. Dashboard cohesion — boundaries, modules, dependencies

The Kids Dashboard already **is** a coherent unit inside the AI Homelab Dashboard;
this codifies the boundary so it stays one.

### 7.1 Module boundary (the kids unit)

```
src/domains/learning/        ← the kids learning DOMAIN (entities/features/
  ├─ shared/                    processes/widgets/shared per FSD §3)
  │   ├─ activity-types.ts      ← Activity Registry (keystone)
  │   ├─ context-hub*.ts        ← the spine
  │   ├─ tool-roster.ts         ← gated allow-list
  │   ├─ transports/picode-*    ← Agent Execution Engine (Pi Code)
  │   └─ activities/*           ← per-surface context providers
  ├─ features/  processes/  learner/  personas/  analytics/  orchestrator/
src/components/child/         ← kids WIDGETS (UI only)
src/pages/child/*             ← kids ROUTES
src/pages/api/child/*         ← kids API (Policy Gate + Safety Lane)
src/lib/kids-pic/*            ← kids ENTITIES + services (PCG, safety, progress)
services/kids-pcg/            ← authoritative learner model (FastAPI + Neo4j)
```

### 7.2 Dependency rules (enforce)

- **Inbound only at the seam:** the kids unit depends on shared platform
  services (`content-filter-service`, `ApprovalService`, AI Gateway) but **the rest
  of the dashboard must not import** `src/domains/learning/*` internals. Expose a
  single barrel (`activity-registry.ts`) if cross-unit access is ever needed.
- **No child surface talks to the desktop agent**: `ChildLearnPanel`'s header note
  already documents this rule (no `ws://localhost:8888`). Keep child panels
  self-contained.
- **One safety system, one runtime**: child generation always routes through the
  AI Gateway as a minor (`Bearer child-safety-key`, `minimax-m3`,
  `metadata.user_type='child'`). No second runtime (FSD §10).

### 7.3 Cohesion checklist (for the kids unit to "stand on its own")

- [x] Single nav + layout (`ChildDashboardLayout`) with theme system.
- [x] Single Activity Registry as source of truth for surfaces.
- [x] Single Context Hub spine.
- [ ] Single agent loop (see §8 — currently three).
- [ ] Single learner-model read path for all panels (remove mock data, §4 U4).

---

## 8. PI Code CLI integration — status & convergence plan

### 8.1 Current reality: **three agent/chat backends**

| Path | Backend | Used by | Harness-compliant? |
|------|---------|---------|--------------------|
| `/api/child/companion/agent-turn` | **PiCodeTransport** (Context Hub + Tool Gate + cognitive loop) | `TutorCompanion` / `ChildTutorTab` (right panel) | ✅ **Yes — this is the target** |
| `/api/learn/tutor/turn` | `runAgentLoop` (separate agent loop) | Learn tutor turn | ⚠️ partial (own loop) |
| `/api/child/chat` | Companion AI (Goose) + AI Gateway fallback | **`ChildChatUI` (main chat)** + `ChildHomePanel` | ❌ no Context Hub / no Tool Roster |

So PI Code is **correctly integrated for the companion** but is **not yet the single
loop** — the main chat UI and home panel bypass it.

### 8.2 Convergence plan (outline)

1. **Make `agent-turn` the one front door.** Re-point `ChildChatUI.handleSend` and
   `ChildHomePanel` at `/api/child/companion/agent-turn` (activityId `free-chat` /
   `home`). Keep `/api/child/chat` as a thin compatibility shim that forwards to it.
2. **Fold the learn tutor into the same transport.** `/api/learn/tutor/turn`
   should construct a `lesson_card` envelope and call `getPiCodeTransport()` rather
   than its own `runAgentLoop`, preserving the harness rails it already runs.
3. **Single audit + events.** One `agent_fallback` / `incident_raised` emitter so
   reliability metrics are unified.
4. **Keep deterministic fallback** in the transport (already present:
   `buildFallbackMessage`).

Net: every studio + the chat UI runs the **same** perceive→reason→plan→act→reflect
loop over the **same** Context Envelope, with the **same** gated Tool Roster.

---

## 9. Context Hub enhancement — the spine

### 9.1 The spine is built and good

`context-hub-service.ts` correctly implements provider registration, focus
tracking, token-budgeted long-form composition (focus tier never dropped),
roster/persona resolution from the registry, and a `notifyFrameUpdate` live-update
path. `ChildDashboardLayout` calls `hub.setFocus(activity.id)` on navigation. This
is faithful to `AGENT_CONTEXT_HUB.md`.

### 9.2 The weak link: surfaces emit thin/empty frames

The spine is only as good as the frames. Today the **Learning Path frame is empty**
(G1) and several providers carry only a one-line summary. The fix is per-surface:
push *live* state into the provider ref and `notifyFrameUpdate`.

**Shipped in this pass (keystone):** the Learning Path now feeds a **live, rich
frame** — current path title, current step (number/title/skillCode/difficulty),
progress %, and `skillCodes` — and notifies the hub on every change. See the
"Shipped" section below.

### 9.3 Remaining enhancements (outline)

- **`recordOutcome` → real write-back.** Today it only updates `recentTopics`
  in-memory. It should emit `attempt_submitted` to the kids-pcg sync so play on any
  surface advances mastery (FSD §4.5).
- **Long-form from kids-pcg, not just the dev profile.** Add the mastery summary,
  active misconceptions, and ZPD next-objectives slices
  (`AGENT_CONTEXT_HUB.md` §3.2 table) to `setLearnerSummary`.
- **`recentInsights` from Kids Dreaming** as a long-form slice (offline
  consolidation), so a session starts already informed.
- **Budget telemetry surfaced** — `ComposedEnvelope.budget.dropped` should log so we
  can tune `budgetTokens`.

---

## 10. Prompt / context / abstraction refinements

- **Add a `learning-path` branch to `buildSystemPrompt`** (picode-transport):
  coach the *journey* — reference the current step from the focus frame, use
  `get_child_stats` for "how am I doing", `recommend_activity` for "what's next",
  and route into studios. *(Shipped in this pass.)*
- **Centralize activity rules.** `buildSystemPrompt` currently `if`-branches on
  `pokemon-lab` / `workspace` / default with inlined rule strings. Promote these to
  an `activity.agentRules?: string[]` field on `LearningActivity` so each registry
  entry owns its prompt — removes the growing `if/else` and lets new studios ship
  their own coaching without editing the transport.
- **Persona + safety ordering.** Keep the safety system prompt first (already done),
  persona last; ensure growth-mindset / anti-sycophancy language is in the shared
  base prompt, not per-branch, so it can't be forgotten.
- **Tighten the JSON contract.** The loop already sanitizes `conceptCheck` etc.
  Add a one-line "If unsure, return `final_answer` with a warm question" so a
  confused model degrades to chat instead of an invalid tool.

---

## 11. Prioritized backlog (suggested order)

1. **(Shipped)** Context Hub: live Learning Path frame + roster + greeting + prompt
   branch.
2. **Card Player (§3.A)** — the core Brilliant runtime; unblocks U2/U3 and real
   grading.
3. **Mastery write-back (G3/§9.3)** — make the path move the learner model.
4. **Studio articulation (§6)** — steps launch studios and harvest outcomes.
5. **Remove mock panel data (U4)** + live mastery API.
6. **PI Code convergence (§8.2)** — one loop for chat + tutor + companion.
7. **Curriculum depth (§2.3)** — writing paths, 11-13, science 5-7, multi-card skills.
8. **Narrative skill-map (§3.B)** + Daily Mission (§3.C) + Reflection (§3.D).
9. **Audio SFX layer (§5.2)** + spine animation (U1).

---

## Shipped in this pass

- **Live Learning Path Context Frame** — `ChildLearningPath.tsx` now registers and
  continuously updates a rich `learning-path` provider (current path, current step,
  progress, skillCodes); removed the empty page-level registration that masked it.
- **Richer provider** — `createLearningPathContextProvider` frame upgraded to carry
  the current step, progress, and skill codes the companion can coach on.
- **Verified tool inheritance** — confirmed the path companion already receives the
  coaching verbs (`recommend_activity`, `get_child_stats`, `generate_problem`,
  `give_hint`, `celebrate`) via the CORE roster merge in `setFocus`; the new prompt
  branch now actually *uses* them. (Scoping the roster down is left as G5 follow-up.)
- **Prompt branch** — `picode-transport.buildSystemPrompt` gained a `learning-path`
  coaching branch that references the current step and routes the journey.

All changes are `tsc --noEmit` clean. Everything else above is an outline for
follow-up agents.
