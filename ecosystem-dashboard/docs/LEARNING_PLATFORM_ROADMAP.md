# Agentic Learning Platform — Roadmap & Implementation Spec

> Status: Planning spec for implementation. **This document contains NO code.**
> It is the source of truth for what to build, why, and in what order. Codex
> implements from this. Do not deviate from the principles in Section 14 without
> explicit owner sign-off.

---

## 0. Locked Decisions (owner-approved 2026-06-14)

These are settled. Build to them. (Remaining open items: Section 16.)

- **L1 — Learner Model store:** kids-pcg (Neo4j) is **authoritative** for the skill
  graph, prerequisites, mastery, misconceptions, and `next-objectives` planning.
  Postgres `SkillProgressService` is the **analytics + curriculum-overlay** layer.
  (= Decision D1.)
- **L2 — Pilot scope:** first subjects are **Math + Reading**, two pilot children:
  **Luca = Grade 3 readiness** (band `middle`) and **Sofia = Grade 5 readiness**
  (band `tween`). Seed graph + per-child frontiers defined in `PHASE0_SEED_SPEC.md`.
- **L3 — Content sourcing:** pilot content is **AI-generated-then-reviewed only**
  (no licensed/3rd-party content for pilot).
- **L4 — Content approval:** the **owner approves** every item to `approved` before
  it may be used for graded assessment. Unreviewed items are usable only for clearly
  marked low-stakes practice and may never lower mastery.

---

## 1. Vision & Guiding Principles

Build an **agentic, mastery-based learning platform** for children that teaches
math, reading, writing, science, and cross-cutting critical thinking — delivered
through an AI tutor that adapts to each child, inside the existing
`ecosystem-dashboard` child experience.

The platform is **not** a worksheet generator. It is a tutor that:

- Diagnoses what the child knows, teaches the next right thing, and verifies mastery.
- Promotes **advanced and critical thinking** (reasoning, justification, transfer),
  not rote recall.
- Stays **age-appropriate** and **safe** on every single turn.
- Keeps the **child motivated** (agency, encouragement, visible progress) without
  manipulation, sycophancy, or dark patterns.
- Keeps **parents informed and in control** while protecting child privacy.

### Non-negotiable principles (carried over from existing code)

1. **Platform-native skills first, curriculum second.** Universal developmental
   skills are the default. Curriculum frameworks (TEKS, Common Core, UK NC) are
   **optional opt-in overlays** that MAP TO platform skills — never the reverse.
   (Source: `src/lib/kids-pic/SkillProgressService.ts` header.)
2. **Play vs Learning mode.** Free play (art, journaling, casual chat) is **not**
   silently graded. Skill assessment only happens for activities whose tracking
   mode is `always` or `assigned` (or `optional` when the child qualifies).
   (Source: `trackable_activity_types`, `shouldTrackActivityForSkills`.)
3. **Privacy-first parent insight.** Parents see *what* is happening and aggregate
   signals — **not** raw chat transcripts or journal contents.
   (Source: `src/components/family/PCGInsightsDashboard.tsx` header.)
4. **Safety gates everything.** Every tutor turn passes content filtering + the AI
   child-safety monitor before it reaches the child.
5. **No new secrets in code.** All service creds flow through Infisical
   (`start-with-infisical.sh`). The learning platform adds no plaintext keys.

---

## 2. Current State — What Already Exists (Inventory)

This is the foundation. **Reuse it. Do not rebuild it.**

### 2.1 Child-facing apps — `src/pages/child/`

| Page | Purpose | Reuse for learning as... |
|------|---------|--------------------------|
| `home.tsx` + `components/child/ChildDashboard.tsx` | Service card launcher | Add a **Learn** hub / "Today's plan" entry point |
| `chat.tsx` + `components/child/ChildChatUI.tsx` | AI character chat w/ filtering | Base for the **AI Tutor** conversation surface |
| `workspace.tsx` | Notes/homework workspace | Host for written work + writing feedback |
| `dictionary.tsx` + `HighlightToDefine.tsx` | Word lookup | Reading support tool (tracked: `never`) |
| `journal.tsx` | Journaling | Reflection (tracked: `never`) |
| `books.tsx` / `book-explorer.tsx` / `StoryBooklet*.tsx` | Digital books + read-aloud | Reading passages + comprehension |
| `planner.tsx` | Tasks/planner | Surface assignments + learning sessions |
| `art-studio.tsx` | Image gen (approval-gated) | Creative reinforcement, not graded by default |
| `email.tsx`, `my-requests.tsx`, `time-limit-reached.tsx` | Helper/approvals/limits | Keep as-is |
| `reader/` | (empty) | Candidate home for guided reader module |

Supporting child UI: `ChildThemeProvider`, `ReadAloudButton` (TTS),
`ServiceBlockedModal`, `ChildMessageRenderer`, `ReadAloudButton`.

### 2.2 Parent-facing — `src/pages/family/[childId]/learning.tsx`

Three tabs already wired:
- `PCGInsightsDashboard` — privacy-first progress + wellness.
- `SkillProgressDashboard` — skills + optional TEKS progress.
- `AISafetyDashboard` — AI safety incidents.

### 2.3 Skill / progress infrastructure (dashboard, Postgres)

`src/lib/kids-pic/SkillProgressService.ts` — mature, two-layer model:
- **Domains**: reading, writing, math, analytical (developmental-psych based).
- **Proficiency levels**: emerging → developing → proficient → advanced (+ mastery flag).
- **Milestones**, **assessments**, weighted **student_skill_progress**.
- **Activity tracking modes**: `always | assigned | optional | never`.
- **Scoring methods**: `completion | accuracy | rubric | ai_analysis | time_based`.
- **Curriculum overlays** (opt-in): `curriculum_frameworks`, `curriculum_standards`,
  `skill_standard_mappings`, `child_curriculum_settings`, `family_curriculum_settings`.
- DB objects referenced: `skill_domains`, `skills`, `proficiency_levels`,
  `skill_milestones`, `skill_assessments`, `student_skill_progress`,
  `student_milestone_achievements`, `activity_skill_mappings`,
  `trackable_activity_types`, plus functions `get_child_skill_summary`,
  `get_proficiency_level`, `should_track_activity_for_skills`.

### 2.4 Learner Model backend (kids-pcg, FastAPI :8771, Neo4j, multi-tenant)

`services/kids-pcg/app/`:
- **PCG**: identity (`age_band` early|middle|tween, `grade`, `reading_level`,
  `persona`, `interests`), preferences, goals, observations.
- **Learner Model** (`learner_routes.py`, `graph_store.py`):
  - Global `:Skill` graph with `:REQUIRES` prerequisite edges (shared reference).
  - Per-owner `:Mastery` updated as an **exponential moving average** (`alpha`)
    of correct/incorrect evidence.
  - Per-owner `:Misconception` tracking (severity, status).
  - **Planner**: `GET /next-objectives` returns skills not yet mastered whose
    prerequisites ARE mastered (the heart of adaptive sequencing).
- Owner-scoped, key-auth (`X-PCG-Key`, `X-PCG-Owner-Id`), reached from the
  dashboard via the `/api/pcg/[...path]` proxy.

### 2.5 AI personalization + safety

- `src/lib/kids-pic/PCGCharacterContext.ts` — injects child PCG (goals, interests,
  achievements, relationship) into AI characters for personalized, motivating chat.
- `src/lib/kids-pic/AIChildSafetyMonitor.ts` — scores AI responses for
  sycophancy, manipulation, bias, and age-appropriateness; raises incidents.
- `src/lib/platform/content-filter-service.ts` + `child-account-types.ts` —
  Llama Guard 3 categories (S1–S14), content-filter levels, full parental controls
  (allowed/blocked services, hours-by-day, daily limits, approval workflows,
  monitoring + daily reports).

### 2.6 The critical gaps (this is what the roadmap delivers)

1. **No instructional content.** Skills/standards exist, but there are **no
   lessons, no problem banks, no reading passages, no writing prompts/rubrics**
   mapped to skills. The system can *measure* but cannot *teach* yet.
2. **No tutor orchestration.** Chat is "character chat," not a structured tutor
   that drives a child to mastery using the Learner Model.
3. **The adaptive loop is not wired to the child UI.** `next-objectives` exists in
   the backend but nothing consumes it to plan a session.
4. **Two skill stores are unreconciled** (Postgres `SkillProgressService` vs Neo4j
   kids-pcg Learner Model). Section 4 resolves this.
5. **No assignment system** (code references `assignmentId` but no tables/UI exist).
6. **No content provenance/review** pipeline for AI-generated learning items.

---

## 3. Target Experience (What "done" feels like)

**Child:** Opens the **Learn** hub → sees "Today's Plan" (3–5 short activities the
tutor chose) → enters a subject session → the AI tutor greets them by name,
references a past win, poses a problem at the right level, coaches with hints
(never just the answer), checks understanding, celebrates progress, and ends with
a one-question reflection. Each session is ~10–20 minutes, age-appropriate, and
feels like a patient mentor.

**Parent:** Opens Family → child → Learning → sees mastery by subject, recent
milestones, what to celebrate, and gentle "areas to support" — without reading
private content. Optionally turns on a curriculum framework and assigns specific
practice.

---

## 4. Key Architectural Decisions (resolve before building)

### D1 — Single source of truth for the Learner Model

**Decision:** The **kids-pcg Neo4j Learner Model is authoritative** for:
the skill graph + prerequisites, per-skill mastery, misconceptions, and
"next objectives" planning.

The **Postgres `SkillProgressService` becomes the read/analytics + curriculum-overlay
layer** for: proficiency display, milestone content, parent dashboards, and
optional framework (TEKS/CCSS) mappings.

**Why:** kids-pcg already models prerequisites and adaptive planning (the hard part)
and is multi-tenant + owner-scoped. Duplicating that in Postgres invites drift.

**Bridge requirement:** Define one **skill code namespace** shared by both stores
(e.g. `math.fractions.equivalence`). Every assessment writes mastery to kids-pcg
(authoritative) and emits a derived proficiency snapshot to Postgres for
dashboards. Specify this sync as an explicit, idempotent step — never two
independent graders.

> **Locked as L1 (Section 0).** Everything in Sections 8–12 assumes D1.

### D2 — Content lives as data, not hardcoded

Lessons, problems, passages, prompts, rubrics, and hints are **content records**
(authored or AI-generated-then-reviewed), versioned and mapped to skill codes.
No subject content is hardcoded in components.

### D3 — Tutor is an orchestrator over the AI Gateway

The tutor is a server-side orchestration layer that composes: child PCG context +
Learner Model state + selected content + pedagogy policy → prompts to the existing
**AI Gateway**, with **safety gating on input and output**. It is a new capability,
built beside (not inside) `ChildChatUI`.

### D4 — Reuse the existing safety + parental-control stack

No parallel safety system. The tutor calls the existing content filter + AI child
safety monitor. New "critical thinking" content must pass the **same** age-appropriateness checks.

---

## 5. The Learning Model (subjects, structure, progression)

### 5.1 Age bands (preserve existing terms)

`early`, `middle`, `tween` (from PCG `age_band` / profile `ageGroup`), with optional
`grade_level`. All content and tutor behavior is tagged by age band and grade range.

### 5.2 Subject domains

Start by extending the existing four domains; add new ones as overlays:

| Domain code | Name | Status |
|-------------|------|--------|
| `math` | Mathematics | exists (build content) |
| `reading` | Reading & Comprehension | exists (build content) |
| `writing` | Writing & Composition | exists (build content) |
| `analytical` | Critical Thinking & Reasoning | exists (elevate to first-class) |
| `science` | Science & Inquiry | **new** |
| `world` | Social Studies / World Knowledge | **new (later phase)** |

### 5.3 Universal hierarchy (per subject)

```
Domain → Skill (with prerequisites) → Milestones (per proficiency level)
       → Content items (lessons, problems, passages, prompts) mapped to Skill
       → Assessments → Mastery (kids-pcg) → Proficiency snapshot (Postgres)
```

### 5.4 Proficiency + mastery semantics

- Display proficiency: emerging → developing → proficient → advanced (Postgres).
- Authoritative mastery: kids-pcg EMA value vs `mastery_threshold`.
- A skill is "ready to teach" when prerequisites are mastered and it is not
  (this is exactly `next-objectives`).

---

## 6. Subject Modules (scope each as its own deliverable)

Each module defines: skill list (with prerequisites), content types, assessment
method, critical-thinking emphasis, and age-band variations. **Math and Reading are
the pilot modules** (Phase 2). Others follow the same template.

### 6.1 Mathematics (`math`)

- **Strands:** number sense, operations, fractions/decimals, measurement,
  geometry, data, early algebra/patterns, problem solving.
- **Content types:** worked example, guided problem, practice problem (auto-checkable),
  multi-step word problem, "explain your reasoning" prompt.
- **Assessment:** primarily `accuracy`; reasoning prompts use `rubric`/`ai_analysis`.
- **Critical thinking:** require justification ("how do you know?"), multiple
  solution paths, estimate-then-check, spot-the-error tasks, real-world transfer.
- **Age bands:** early = concrete/manipulatives + counting; middle = operations &
  fractions; tween = ratios, pre-algebra, multi-step reasoning.

### 6.2 Reading & Comprehension (`reading`)

- **Strands:** phonics/decoding (early), fluency, vocabulary, literal comprehension,
  inferential comprehension, author's purpose, text structure, evaluation.
- **Content types:** leveled passages (reuse `books`/`StoryBooklet`), comprehension
  question sets (literal → inferential → evaluative), vocabulary-in-context.
- **Assessment:** `accuracy` for closed questions; `rubric`/`ai_analysis` for
  open responses; reading level adapts via `reading_level` in PCG.
- **Critical thinking:** infer beyond the text, compare viewpoints, support claims
  with textual evidence, distinguish fact vs opinion.

### 6.3 Writing & Composition (`writing`)

- **Strands:** sentence construction, paragraph structure, narrative, informational,
  opinion/argument, revision, grammar/mechanics, voice.
- **Content types:** scaffolded prompts, sentence/paragraph frames, model texts,
  revision tasks. Drafting happens in `workspace.tsx`.
- **Assessment:** **rubric-based** (`rubric` + `ai_analysis`) with child-friendly,
  growth-oriented feedback. Never just a grade — always next-step guidance.
- **Critical thinking:** claim + evidence + reasoning, audience awareness,
  counter-arguments (tween), self-revision against a rubric.

### 6.4 Critical Thinking & Reasoning (`analytical`) — cross-cutting

Promote this from a hidden domain to a **first-class, cross-subject layer**:
- **Skills:** classify/compare, sequence/cause-effect, infer, evaluate evidence,
  identify patterns, logical reasoning, metacognition ("how did I figure this out?").
- **Delivery:** embedded as reasoning prompts inside math/reading/writing/science
  PLUS standalone logic/puzzle activities.
- **Assessment:** `ai_analysis` + `rubric`; track reasoning quality, not just answers.

### 6.5 Science & Inquiry (`science`) — new, later phase

- **Strands:** observation, questioning, hypothesis, simple experiments (described,
  safe, no hazardous instructions), explanation, life/earth/physical basics.
- **Critical thinking:** predict-observe-explain, evidence-based claims, "what would
  you change?" — all age-appropriate and safety-screened.

---

## 7. The AI Tutor (pedagogy + behavior spec)

### 7.1 Pedagogical rules (encode as policy, not vibes)

1. **Diagnose before teaching** — pick the skill from `next-objectives`.
2. **Socratic scaffolding** — hints escalate: nudge → leading question → partial →
   worked step. **Never lead with the answer.** Reveal full solutions only after
   genuine attempts or on explicit "show me how."
3. **Productive struggle, then support** — allow wrestling; intervene before frustration.
4. **Check for understanding** — after a solve, ask the child to explain/justify.
5. **Spaced review** — periodically re-surface previously mastered skills.
6. **Growth mindset language** — praise effort/strategy, not "smartness." No empty
   flattery (the safety monitor flags sycophancy).
7. **One concept at a time**; short turns; age-appropriate vocabulary and length.

### 7.2 Tutor inputs (context assembly, server-side)

- Child PCG + relationship/persona (`PCGCharacterContext`).
- Learner Model: current skill, mastery, known misconceptions (kids-pcg).
- Selected content item(s) for the target skill.
- Pedagogy policy for subject + age band.
- Parental controls (allowed topics, filter level, time remaining).

### 7.3 Tutor outputs (every turn)

- Child-facing message (filtered + safety-checked).
- Structured signals: attempt correctness, hint level used, misconception
  detected, skill evidence (correct/incorrect) → written to Learner Model.
- Never writes raw transcripts to parent-visible surfaces.

### 7.4 Item generation + checking

- For closed items (math, closed reading Qs): prefer **deterministic checking**
  (exact/numeric/tolerance) over AI judgment.
- For open items (writing, reasoning): AI scores against an explicit **rubric**,
  returns `ai_confidence`; low confidence routes to lighter-weight feedback, not a
  hard grade.
- AI-generated items must be **reviewed/validated** before being graded-on (D2,
  Section 8.3) — no ungrounded "the AI said you're wrong."

---

## 8. Content Architecture

### 8.1 Content record (described, not schema)

Each content item carries: stable id + version; subject/domain; mapped **skill
code(s)**; type (lesson | worked_example | problem | passage | question | prompt |
rubric | hint_set); age band + grade range; difficulty; the body (text/media refs);
for closed items the answer key + accepted forms; for open items the rubric;
optional curriculum-standard tags; provenance (`authored` | `ai_generated`);
review status (`draft` | `approved` | `retired`); safety-screen status.

### 8.2 Storage

Author/catalog content in **Postgres** (alongside skills/milestones it maps to).
Mastery evidence still flows to kids-pcg (D1). Media reuses existing book/image stores.

### 8.3 Generation + review pipeline

1. Generate candidate items via AI Gateway from skill + milestone + age band.
2. **Auto safety screen** (content filter + age-appropriateness) — reject on fail.
3. **Human/parent or owner review** to `approved` before items are used for graded
   assessment. Unreviewed items may be used only for low-stakes practice, clearly
   marked, never for mastery downgrades.
4. Version on edit; never mutate an item that has assessment history.

---

## 9. The Adaptive Learning Loop (wire the backend to the UI)

### 9.1 Session structure (child)

```
Warm-up (review 1 spaced skill)
  → Today's target skill (from next-objectives)
    → Instruction (worked example / mini-lesson)
    → Guided practice (tutor scaffolds)
    → Independent practice (auto/rubric checked)
  → Reflection (1 metacognitive question)
  → Celebrate progress + preview next time
```

### 9.2 "Today's Plan" generation

A planner endpoint composes 3–5 activities from: `next-objectives` (kids-pcg),
spaced-review picks, any **parent assignments**, and child interests (motivation).
Respects time limits and allowed hours. Surfaced on the **Learn** hub and `planner.tsx`.

### 9.3 Mastery + progression

- Each checked attempt → mastery evidence to kids-pcg (EMA) → proficiency snapshot
  to Postgres → milestone checks → achievements.
- Skill "completes" at mastery threshold; unlocks dependent skills automatically
  (graph already supports this).
- Misconceptions detected by the tutor are recorded and **targeted** in later sessions.

---

## 10. Safety & Age-Appropriateness (must wrap the whole platform)

1. **Every tutor input and output** runs through `content-filter-service` +
   `AIChildSafetyMonitor`. Block/replace on violation; log incident; surface to
   `AISafetyDashboard`.
2. **Critical thinking without unsafe content:** reasoning tasks must use
   age-appropriate contexts. The existing age-appropriateness checker already
   penalizes violence, adult themes, politics, etc. — keep that bar; do not create
   "debate" prompts on inappropriate topics for the band.
3. **Honest, non-manipulative tutoring:** no sycophancy, no fabricated praise, no
   pressure tactics (monitored). Tutor admits uncertainty rather than bluffing.
4. **Parental controls respected:** allowed topics/services, daily limits, allowed
   hours, approval requirements all gate sessions (reuse `canAccessService`,
   `isWithinAllowedHours`, daily usage).
5. **Privacy:** raw responses/transcripts stay child-side; parents get aggregates,
   milestones, and "support" suggestions only.
6. **Data minimization:** store the least needed to drive learning; respect existing
   logging flags (`logAllConversations`, `parentCanViewConversations`).

---

## 11. Parent Experience (extend existing surfaces)

- **Assignments (new):** parent assigns a skill/module/content set to a child with
  an optional due date; assignment becomes `assigned`-mode (graded) and appears in
  the child's plan + `planner.tsx`. Resolves the dangling `assignmentId`.
- **Insights (extend `PCGInsightsDashboard` / `SkillProgressDashboard`):** mastery
  by subject, milestones, "celebrate / support" guidance, spaced-review status.
- **Curriculum opt-in (exists):** keep TEKS/CCSS overlays optional and off by default.
- **Controls (exists):** ensure new learning services are represented in
  allowed/blocked lists and approval flows.

---

## 12. Data Model & API Additions (described — codex authors the actual schema/code)

### 12.1 New/extended data (described)

- **Content catalog** (Postgres): items per Section 8.1, versioned, skill-mapped,
  review + safety status.
- **Assignments** (Postgres): parent → child, skill/content refs, status, due date.
- **Learning sessions** (Postgres): session id, child, plan, activities, outcomes,
  duration; feeds insights and time limits.
- **Spaced-review schedule** (Postgres or derived): per child per skill, next-review.
- **kids-pcg additions (Neo4j):** confirm/extend skill `:REQUIRES` graph coverage
  for all six domains; ensure skill codes match the shared namespace (D1).

### 12.2 New API surface (described; child routes auth via session, PCG via proxy)

- `GET /api/learn/plan` — today's plan for the child.
- `POST /api/learn/session` / `PATCH /api/learn/session/:id` — start/update a session.
- `POST /api/learn/tutor/turn` — one tutor exchange (server orchestrates Gateway +
  safety + Learner Model writes).
- `POST /api/learn/attempt` — submit an item attempt; returns check result + feedback;
  writes mastery evidence.
- `GET /api/learn/content?skill=…&ageBand=…` — fetch approved items for a skill.
- `GET/POST /api/family/assignments` — parent assignment CRUD.
- Reuse existing `/api/pcg/[...path]` proxy for all kids-pcg Learner Model calls.

---

## 13. Phased Delivery Plan

Each phase ends with working, demoable, safety-verified functionality.

### Phase 0 — Foundations & decisions (small)
- Confirm D1–D4 (Section 4) and open questions (Section 16).
- Define the **shared skill-code namespace** and seed the kids-pcg skill graph +
  prerequisites for `math` and `reading`.
- Acceptance: namespace doc agreed; `next-objectives` returns sane targets for a
  seeded test child in math + reading.

### Phase 1 — Content catalog + assessment plumbing
- Build the content catalog (Section 8) + generation/review pipeline (8.3).
- Wire `POST /api/learn/attempt` → deterministic checking → mastery to kids-pcg →
  proficiency snapshot to Postgres → milestone/achievement checks.
- Acceptance: an approved math item can be attempted; mastery + proficiency update;
  parent dashboard reflects it; all content passed safety screen.

### Phase 2 — Pilot tutor + adaptive loop (Math + Reading) ✅
- Build the tutor orchestrator (Section 7) with safety gating on every turn.
- Build the **Learn** hub + "Today's Plan" (9.2) + session loop (9.1).
- Critical-thinking prompts embedded in both pilot subjects.
- Acceptance: a child completes an end-to-end session in math AND reading; hints
  scaffold (no answer-leaking); reflection captured; mastery advances; safety
  incidents (if any) appear in `AISafetyDashboard`; time limits respected.
- **Status: complete.** Session loop implements warm-up → instruction → guided
  practice → independent practice → reflection → celebrate + preview. Age-band
  session timer (O5) enforces time limits. Critical-thinking tags surfaced in
  instruction step. Safety incidents render in `AISafetyDashboard`. All open
  decisions O1–O7 resolved. 13 suites, 118 tests passing.

### Phase 3 — Writing + Critical Thinking (rubric/AI assessment) ✅
- Rubric-based writing feedback in `workspace.tsx`; standalone reasoning activities.
- Misconception capture + targeted follow-up.
- Acceptance: a writing piece receives growth-oriented rubric feedback with
  next steps; reasoning quality tracked; misconceptions re-surface in later plans.

**Completed:**
- **Writing rubric service** (`src/lib/kids-pic/writing-rubric.ts`): Age-band-aware
  rubric with 3/4/5 dimensions (early/middle/tween). Deterministic scoring based on
  text statistics (word count, sentence structure, capitalization, vocabulary ratio,
  transition words, paragraph count). Growth-oriented feedback per dimension with
  strengths and next-step recommendations.
- **Writing content items**: 2 writing prompts (narrative describe, opinion with
  reasons) and 2 reasoning activities (inference with evidence, pattern detection)
  added to `phase1-starter-content.ts`.
- **Content type extensions**: `LearnContentItem` now supports `subject: 'writing' |
  'analytical'`, `type: 'writing' | 'reasoning'`, optional `answerKey` (absent for
  rubric-evaluated items), `rubricCriteria`, and `expectedReasoning` fields.
- **Rubric evaluation in grading**: `LearningPhase1Service.gradeAttempt` detects
  items without `answerKey` and routes to `evaluateWriting()` instead of
  deterministic scoring. Returns `rubricResult` with dimension scores, percentage,
  strengths, and recommendations.
- **Attempt API integration**: `/api/learn/attempt` includes `rubricResult` in
  response body and sets harness evaluation method to `'rubric'` for writing items.
- **Misconception tracker** (`src/lib/kids-pic/misconception-tracker.ts`): Captures
  incorrect attempt patterns keyed by child + skill. Classifies misconception type
  (calculation_error, wrong_operation, misread_question, incomplete_answer,
  conceptual_gap). Tracks resurface count and addressed status.
- **Misconception surfacing in planner**: `/api/learn/plan` queries
  `getSkillsNeedingReview()` and injects unaddressed misconception skills as
  priority focus objectives (capped at 2 per plan). Marks them addressed after
  inclusion so they don't repeat every plan.
- **Learn hub UI**: Writing/reasoning activities get larger textarea (6 rows),
  subject-specific instruction prompts, and a rich rubric feedback panel with
  per-dimension score bars, strengths, and growth recommendations. Button labels
  adapt ("Submit writing" / "Submit answer" / "Check answer").
- **Tests**: 14 suites, 136 tests passing (writing-rubric: 8 tests,
  misconception-tracker: 14 tests, all pre-existing suites still green).

### Phase 4 — Assignments + parent depth + curriculum overlays ✅
- Parent assignment system (11) end-to-end; extend insights; verify TEKS opt-in.
- Acceptance: parent assigns practice; it appears in the child's plan and is graded
  as `assigned`; optional TEKS view shows alignment without changing defaults.

**Completed:**
- **DB migration** (`database/migrations/20260620_learning_assignments_and_phase3_content.sql`):
  Creates `learning_assignments` table (id, child_id, parent_user_id, skill_code, title,
  notes, status, due_date, timestamps) with indexes and updated_at trigger. Also extends
  `learning_content_items` to support writing/analytical subjects, writing/reasoning content
  types, nullable answer_key for rubric items, and rubric_criteria/expected_reasoning columns.
- **Assignment service** (`src/lib/kids-pic/assignment-service.ts`): Full CRUD with
  `AssignmentService` class — create, list (filtered by status/parent), update, cancel,
  and auto-complete on correct answer. Falls back to in-memory store when DB table absent.
  `getActiveSkillCodes()` provides the planner with priority assignment skill codes.
- **Assignments API** (`src/pages/api/learn/assignments.ts`): `POST` create, `GET` list,
  `PATCH` update. Verifies parent-child relationship via `users.parent_user_id` before
  any operation. Only the assignment's owning parent can modify it.
- **Attempt API integration**: `/api/learn/attempt` now calls
  `completeOnCorrectAnswer()` after grading — auto-completes any active assignment
  matching the skill when the child answers correctly. Returns `assignmentCompleted`
  boolean in the response body.
- **Parent assignment UI** (`src/components/family/ParentAssignmentManager.tsx`): Full
  management interface with skill picker (12 skills across math/reading/writing/analytical),
  optional title/notes/due date, active/completed/cancelled sections, cancel button, and
  create-assignment modal. Integrated as "Assignments" tab in family learning insights page.
- **Child-side celebration**: Learn hub shows "Parent assignment complete! 🎉" banner
  in the understanding step when `assignmentCompleted` is true.
- **TEKS opt-in API** (`src/pages/api/family/skill-progress.ts`): `GET ?action=summary`
  returns child skill summary with optional curriculum alignment; `GET ?action=teks`
  returns TEKS standards progress for a given grade. Parent-child verified. Powers the
  existing `SkillProgressDashboard` component's Curriculum tab.
- **Tests**: 15 suites, 145 tests passing (9 new tests for assignment service,
  all pre-existing suites still green).

### Phase 5 — Science & World, polish, spaced repetition at scale (Science ✅)
- Add `science` (and later `world`) using the module template.
- Mature spaced-review scheduling; performance + content-library growth.
- Acceptance: science sessions run with safe, age-appropriate inquiry content;
  spaced review measurably re-tests old skills.

**Science subject — Completed:**
- **Subject type**: Added `'science'` to the `LearnContentItem.subject` union and
  `Phase0Subject` type. Updated DB schema CHECK constraints in both
  `learning-schema.sql` and the Phase 4 migration.
- **Starter content** (6 items): Living vs non-living (early), weather observations
  (early), states of matter (middle), plant parts (middle), forces & motion (tween),
  ecosystems reasoning (tween). Covers all three age bands with deterministic and
  reasoning assessment types.
- **Phase 0 seed data**: Added science domain (🔬, purple), 7 science skills with
  prerequisites (classification → plant parts → ecosystems), and science readiness/
  stretch skills for both Luca and Sofia.
- **Learn hub UI**: Science instruction prompt added ("Observe carefully. What do
  you notice?"). `SUBJECT_LABELS` already included science. Science activities flow
  through the plan API automatically via skill code matching.
- **Parent assignments**: 6 science skill options added to `ParentAssignmentManager`
  skill picker.
- **Tests**: 12 new tests for science content items and seed data. All 110 learning
  platform tests pass across 10 suites.
- **Remaining**: Spaced repetition maturation, `world` subject, content library growth.

---

## 14. Guardrails for Codex (do / don't — prevent scope drift)

**DO**
- Build on the existing services, schemas, and components inventoried in Section 2.
- Keep curriculum optional + platform-skills-first (Principle 1).
- Route all secrets through Infisical; add none in code.
- Gate every tutor turn through the existing safety stack.
- Prefer deterministic checking; use AI scoring only with rubrics + confidence.
- Treat content as reviewed, versioned data.
- Keep parent views privacy-first (aggregates, not transcripts).

**DON'T**
- Don't create a second safety system or a second authoritative skill store.
- Don't hardcode lessons/problems in components.
- Don't let the tutor reveal answers first or flatter/manipulate.
- Don't grade free-play activities (respect tracking modes).
- Don't expose age-inappropriate content under the banner of "critical thinking."
- Don't enable any curriculum framework by default.
- Don't write child raw content to parent-facing surfaces.

---

## 15. Cross-References (where to look in the repo)

- Skills/curriculum/assessment: `src/lib/kids-pic/SkillProgressService.ts`
- PCG profile/knowledge/progress: `src/lib/kids-pic/KidsPCGService.ts`,
  `src/hooks/useKidsPCG.ts`, `src/pages/api/child/pcg.ts`
- Tutor personalization base: `src/lib/kids-pic/PCGCharacterContext.ts`,
  `src/components/child/ChildChatUI.tsx`
- Safety: `src/lib/kids-pic/AIChildSafetyMonitor.ts`,
  `src/lib/platform/content-filter-service.ts`, `src/lib/platform/child-account-types.ts`
- Parent surfaces: `src/pages/family/[childId]/learning.tsx`,
  `src/components/family/PCGInsightsDashboard.tsx`,
  `src/components/family/SkillProgressDashboard.tsx`
- Learner Model backend: `services/kids-pcg/app/learner_routes.py`,
  `services/kids-pcg/app/graph_store.py`, `services/kids-pcg/app/models.py`
- PCG proxy: `src/pages/api/pcg/[...path].ts`

---

## 16. Open Decisions for the Owner (answer before/at Phase 0)

- **O1. [RESOLVED -> L1]** Learner Model store = kids-pcg authoritative + Postgres overlays.
- **O2. [RESOLVED -> L2]** Pilot = Math + Reading; Luca G3 readiness (`middle`),
  Sofia G5 readiness (`tween`). See `PHASE0_SEED_SPEC.md`. Remaining minor confirms:
  ages + kids-pcg `owner_id`s (seed spec C1/C2).
- **O3. [RESOLVED -> L3]** Pilot content = AI-generated-then-reviewed only.
- **O4. [RESOLVED -> L4]** Owner approves content before graded use.
- **O5. [RESOLVED]** Default session length + daily learning target per age band.
  Codified in `learning-config.ts`:
  | Band | Ages | Session | Daily Target | Daily Limit | Break | Max Activities |
  |------|------|---------|-------------|------------|-------|---------------|
  | `early` | 5–7 | 15 min | 30 min | 45 min | 10 min | 3 |
  | `middle` | 8–10 | 20 min | 45 min | 60 min | 5 min | 4 |
  | `tween` | 11–12 | 25 min | 60 min | 90 min | 5 min | 5 |
  Research basis: AAP guidelines (quality + balance for school-age), pediatric
  practice benchmarks (≤2h/day recreational for 5–17), educational research on
  attention spans. Parents can override via parental controls.
- **O6. [RESOLVED]** Local AI Gateway only for the pilot. No external/3rd-party
  tutoring APIs. The Agent Runtime adapter pattern allows adding external
  adapters post-pilot without pipeline changes. See `learning-config.ts`.
- **O7. [RESOLVED]** TEKS is the priority framework when curriculum alignment
  is enabled. Curriculum remains opt-in and off by default (Principle 1).
  CCSS and UK_NC available as alternatives. See `learning-config.ts`.

---

## 17. Harness Alignment (FSD Agentic Harness)

> Canonical harness spec: `docs/FSD_AGENTIC_HARNESS.md`.
> Migration matrix: `docs/FSD_MIGRATION_MATRIX.md`.

The Kid's Learning Platform is the **canonical reference cognitive architecture**
for the entire AIHomelab Dashboard. It is **agent-first** (agents are the primary
actors) and **harness-intelligent-driven** (the harness closes the adaptive
loop). Because the child-safe tutor loop is the hardest case — full agent roster,
full cognitive loop, persistent memory, strictest safety rails — every other
dashboard domain is a *simpler instance* of this same pattern.

### 17.0 Agent roster (learning domain)

The learning platform instantiates every agent role in the harness roster
(harness spec Section 1.2). These already exist in code; the harness names them
as agents and standardizes their collaboration:

| Agent role | Goal | Implementation |
|-----------|------|----------------|
| **Tutor Agent** | Scaffold the learner to the next step (Socratic, no answer-reveal) | `LearningTutorOrchestrator.ts` |
| **Planner Agent** | Choose today's plan: warm-up + focus objectives | `learning-planner.ts` |
| **Evaluator Agent** | Grade attempts, judge mastery | `LearningPhase1Service.ts` + `SkillProgressService.ts` |
| **Safety Agent** | Bound the Tutor Agent: filter, detect manipulation/distress | `AIChildSafetyMonitor.ts` + `SemanticSafetyAnalyzer.ts` |
| **Memory Agent** | Read/write learner model + personalization context | `KidsPCGService.ts` + `PCGCharacterContext.ts` |
| **Orchestrator Agent** | Coordinate the above across a session | `OrchestrationEngine.ts` (harness-level) |

The cognitive loop these agents run (perceive → reason → plan → act → reflect)
is exactly what `src/pages/api/learn/tutor/turn.ts` executes today.

### 17.1 What changes under the harness

The learning platform's existing architecture already implements most harness
contracts. The harness formalizes and standardizes them:

| Current component | Harness role | Status |
|-------------------|-------------|--------|
| `learning-access.ts` | **Policy Gate** — auth, parental controls, time limits | Implemented |
| `content-filter-service.ts` + `AIChildSafetyMonitor.ts` | **Safety Lane** — input + output filtering | Implemented |
| `LearningTutorOrchestrator.ts` | **Agent Runtime adapter** — AI Gateway + fallback | Implemented (first adapter) |
| `LearningPhase1Service.ts` | **Evaluation Lane** — deterministic + content catalog | Implemented |
| `SkillProgressService.ts` | **Evaluation Lane** — proficiency + analytics layer | Implemented |
| `LearningSessionService.ts` | **Session Loop** — session lifecycle + persistence | Implemented |
| `learning-planner.ts` | **Process** — adaptive plan generation | Implemented |
| `KidsPCGService.ts` | **Entity** — child PCG profile + knowledge | Implemented |
| `PCGCharacterContext.ts` | **Entity** — agent personalization context | Implemented |
| `PCGSafetyService.ts` | **Entity** — privacy-first parent insights | Implemented |
| kids-pcg (Neo4j) | **Skill Graph** — authoritative learner model | Implemented |
| `/api/pcg/[...path].ts` | **Entity proxy** — kids-pcg access from dashboard | Implemented |

### 17.2 What's new under the harness

The following are **additive** — they formalize existing behavior into typed
contracts without changing runtime behavior:

- **Typed `HarnessAgentRequest` / `HarnessAgentResponse`** — standard request/
  response envelope for all agent executions (see harness spec Section 4.1).
- **Event emission** — learning domain emits typed events
  (`attempt_submitted`, `mastery_updated`, `plan_generated`,
  `misconception_detected`) instead of ad-hoc logging.
- **Audit envelope** — every tutor turn produces a structured audit record
  (agent id, model, contract, latency, safety results).
- **FSD layer reorganization** — `src/lib/kids-pic/` files are reorganized into
  `entities/`, `features/`, `processes/` subdirectories (Phase B migration).

### 17.3 Learning domain FSD target structure

```
src/domains/learning/
  entities/
    child-pcg.ts          (from KidsPCGService.ts)
    skill-graph.ts        (from SkillProgressService.ts + kids-pcg proxy)
    content-catalog.ts    (from LearningPhase1Service.ts content types)
    session.ts            (from LearningSessionService.ts types)
  features/
    tutor-turn.ts         (from LearningTutorOrchestrator.ts)
    attempt-grading.ts    (from LearningPhase1Service.ts grading)
    plan-generation.ts    (from learning-planner.ts)
    access-control.ts     (from learning-access.ts)
  processes/
    session-loop.ts       (from LearningSessionService.ts lifecycle)
    spaced-review.ts      (new — spaced-review scheduler) ✅
    mastery-sync.ts       (new — kids-pcg ↔ Postgres sync) ✅
  widgets/
    (from src/pages/child/learn.tsx + components)
  shared/
    (domain-local types, constants, helpers)
```

### 17.4 Harness readiness for the learning domain

The learning domain passes the Harness-Ready checklist (harness spec Section 7)
when:

- [x] Agent-defined (full roster instantiated; see 17.0)
- [x] Bounded autonomy (Tutor Agent cannot bypass Policy Gate / Safety Lane)
- [x] Memory-backed (reads/writes PCG via `KidsPCGService`)
- [x] Policy Gate present (`learning-access.ts`)
- [x] Safety Lane present (content filter + AIChildSafetyMonitor)
- [x] Evaluation Lane present (deterministic + rubric + ai_analysis)
- [x] Fallback path present (deterministic tutor message)
- [x] No hardcoded secrets (Infisical)
- [x] Adaptive loop wired (planner + mastery + spaced-review scheduler)
- [x] Typed harness contracts (Phase A deliverable)
- [x] Event emission via typed `HarnessEvent` (Phase A deliverable)
- [x] Audit envelope on every tutor turn — `HarnessAuditEnvelope` emitted via
      `runHarnessPipeline` on `attempt.ts`, `tutor/turn.ts`, and `plan.ts` (Phase A)
- [x] FSD layer reorganization (Phase B deliverable)
- [x] Unit tests for policy gate, safety lane, evaluation lane (Phase B)

### 17.5 Phase alignment

| Roadmap phase | Harness phase | What happens |
|--------------|--------------|-------------|
| Phase 0 (foundations) | Phase A (contracts) | Define shared harness types; no runtime changes |
| Phase 1 (content + assessment) | Phase A → B transition | Wrap existing services in harness contracts; begin FSD reorganization |
| Phase 2 (tutor + adaptive loop) | Phase B (reference impl) | Learning domain fully harness-compliant; template for other domains |
| Phase 3+ (writing, science, etc.) | Phase C (domain migration) | Other dashboard domains follow the learning template |
