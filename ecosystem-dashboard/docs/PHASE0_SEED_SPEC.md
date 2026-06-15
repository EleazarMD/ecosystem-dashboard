# Phase 0 Seed Spec — Math + Reading (Luca G3 readiness, Sofia G5 readiness)

> Companion to `LEARNING_PLATFORM_ROADMAP.md`. **Contains NO code** — it is the
> data/design artifact codex seeds from in Phase 0 and builds on in Phase 1.
> Skill tables here are *specification data*, not application code.

---

## 1. Purpose

Define the **shared skill graph** (global reference data) and the **per-child
readiness targets** for the pilot, so that:

- kids-pcg (Neo4j) can be seeded with `:Skill` nodes + `:REQUIRES` prerequisite
  edges (authoritative — Decision L1).
- Postgres `skills` / `skill_domains` can be seeded with the matching display
  metadata for dashboards + optional curriculum overlays.
- The adaptive planner (`GET /next-objectives`) immediately returns sensible
  targets per child.

Per L1, **skill_id is the single shared namespace** across both stores.

---

## 2. Pilot Children & Readiness Targets

"Readiness" = mastered the grade **below** the target, i.e. ready to *enter* it.

| Child | Age | Target | Meaning | Age band | `grade` (PIC) | Current level |
|-------|-----|--------|---------|----------|---------------|----------------|
| **Luca** | turning **8** | **Grade 3 readiness** | Master end-of-Grade-2 skills | `middle` | `"3"` (entering) | set by diagnostic |
| **Sofia** | **10** | **Grade 5 readiness** | Master end-of-Grade-4 skills | `tween` | `"5"` (entering) | set by diagnostic |

**Band cutoffs (assumed):** `early` ≈ ages 4–6 (≈K–1), `middle` ≈ ages 7–9
(≈grades 2–4), `tween` ≈ ages 10–12 (≈grades 5–7). Luca (8) → `middle` and
Sofia (10) → `tween` both fit; tune item tone to the specific age.

**Diagnostic-first (important):** This spec does **not** assume either child's
current ability. The seed defines the graph + the *target frontier*. A short
Phase-1 placement diagnostic establishes each child's starting mastery; the tutor
then teaches forward from there toward the readiness frontier.

**One shared graph for both.** Because `:Skill` nodes are global and mastery is
per-owner, a single K–4 graph supports both children. Luca's frontier sits at the
Grade-2 band; Sofia's at the Grade-4 band. No per-child graphs.

> Open confirmations (Section 13): exact ages, kids-pcg `owner_id` for each child,
> and whether to enable the optional TEKS overlay.

---

## 3. Skill-Code Namespace Convention

```
<subject>.<strand>.<skill>      all lowercase, snake_case segments
```

- `subject` ∈ `math | reading | writing | analytical | science | world`
- `strand` groups skills within a subject (e.g. `number`, `fractions`, `comp`).
- `skill` is the specific competency (e.g. `place_value_1000`).
- IDs are **stable and permanent** — never rename; retire instead.
- Prerequisites reference other `skill_id`s exactly.

Band tags used below: `early` (≈K–1), `middle` (≈2–4), `tween` (≈5–7). These align
with PIC `age_band`. Grade ranges (`min_grade`/`max_grade`) give finer placement.

---

## 4. Math Skill Graph (`math.*`)

Seed all of these (global). `prereqs` = `:REQUIRES` edges. `assess` = default
assessment method (Section 11). TEKS column is **illustrative, opt-in, verify
before enabling** — it does nothing until a family turns curriculum on.

| skill_id | name | grade | prereqs | assess | TEKS* |
|----------|------|-------|---------|--------|-------|
| `math.number.count_20` | Count & cardinality to 20 | K–1 | — | accuracy | K.2 |
| `math.number.count_120` | Count/read/write to 120 | 1–2 | `math.number.count_20` | accuracy | 1.2 |
| `math.number.place_value_100` | Place value: tens & ones (to 100) | 1–2 | `math.number.count_120` | accuracy | 1.2/2.2 |
| `math.number.compare_order` | Compare & order numbers | 2 | `math.number.place_value_100` | accuracy | 2.2 |
| `math.number.place_value_1000` | Place value to 1,000 | 2–3 | `math.number.place_value_100` | accuracy | 2.2/3.2 |
| `math.number.place_value_10000` | Place value to 10,000+, expanded form | 4 | `math.number.place_value_1000` | accuracy | 4.2 |
| `math.number.round` | Round to 10/100/1,000 | 3–4 | `math.number.place_value_1000` | accuracy | 3.4/4.2 |
| `math.addsub.within_20` | Add/subtract within 20 (fluency) | 1 | `math.number.count_20` | accuracy | 1.3/1.5 |
| `math.addsub.within_100` | Add/subtract within 100 (regrouping) | 2 | `math.addsub.within_20`, `math.number.place_value_100` | accuracy | 2.4 |
| `math.addsub.within_1000` | Add/subtract within 1,000 | 3 | `math.addsub.within_100`, `math.number.place_value_1000` | accuracy | 3.4 |
| `math.addsub.multi_digit` | Multi-digit add/sub (standard algorithm) | 4 | `math.addsub.within_1000` | accuracy | 4.4 |
| `math.muldiv.concept` | Multiplication meaning (groups/arrays) | 2–3 | `math.addsub.within_100` | rubric | 3.4 |
| `math.muldiv.facts_10` | Multiplication facts to 10×10 (fluency) | 3 | `math.muldiv.concept` | accuracy | 3.4 |
| `math.muldiv.division_basic` | Division facts & remainders | 3–4 | `math.muldiv.facts_10` | accuracy | 3.4/4.4 |
| `math.muldiv.multi_digit` | Multi-digit multiplication | 4 | `math.muldiv.facts_10`, `math.number.place_value_1000` | accuracy | 4.4 |
| `math.fractions.concept` | Unit fractions / parts of a whole | 3 | `math.muldiv.concept` | rubric | 3.3 |
| `math.fractions.equivalence` | Equivalent fractions | 3–4 | `math.fractions.concept` | accuracy | 3.3/4.3 |
| `math.fractions.compare` | Compare fractions | 3–4 | `math.fractions.equivalence` | accuracy | 4.3 |
| `math.fractions.addsub_like` | Add/sub fractions, like denominators | 4 | `math.fractions.compare` | accuracy | 4.3 |
| `math.geometry.shapes_attributes` | 2D/3D shapes & attributes | 2–3 | `math.number.count_20` | rubric | 2.8/3.6 |
| `math.geometry.partition` | Partition shapes into equal parts | 2–3 | `math.geometry.shapes_attributes` | rubric | 2.3/3.6 |
| `math.measure.length_time` | Length & time (to the minute) | 2–3 | `math.number.count_120` | accuracy | 2.9/3.7 |
| `math.measure.area_perimeter` | Area & perimeter | 3–4 | `math.muldiv.facts_10` | accuracy | 3.6/4.5 |
| `math.data.picture_bar` | Read picture & bar graphs | 2–3 | `math.number.count_120` | accuracy | 2.10/3.8 |
| `math.reasoning.patterns` | Number & shape patterns | 2–3 | `math.number.count_120` | rubric | 3.5 |
| `math.reasoning.word_1step` | One-step word problems | 2 | `math.addsub.within_100` | rubric | 2.4 |
| `math.reasoning.word_2step` | Two-step / multi-op word problems | 3–4 | `math.reasoning.word_1step`, `math.muldiv.facts_10` | rubric | 3.5/4.5 |

\* TEKS codes illustrative only — verify against the official framework before
enabling the curriculum overlay (off by default per roadmap Principle 1).

---

## 5. Reading Skill Graph (`reading.*`)

| skill_id | name | grade | prereqs | assess |
|----------|------|-------|---------|--------|
| `reading.phonics.letter_sounds` | Phonemic awareness & letter-sounds | K | — | accuracy |
| `reading.phonics.cvc` | Decode CVC words | K–1 | `reading.phonics.letter_sounds` | accuracy |
| `reading.phonics.blends_digraphs` | Blends & digraphs | 1 | `reading.phonics.cvc` | accuracy |
| `reading.phonics.vowel_teams` | Long vowels & vowel teams | 2 | `reading.phonics.blends_digraphs` | accuracy |
| `reading.phonics.multisyllable` | Decode multisyllabic words | 3 | `reading.phonics.vowel_teams` | accuracy |
| `reading.fluency.accuracy_rate` | Read grade text accurately & at pace | 2–3 | `reading.phonics.vowel_teams` | ai_analysis |
| `reading.fluency.expression` | Prosody / expression | 3–4 | `reading.fluency.accuracy_rate` | ai_analysis |
| `reading.vocab.context_clues` | Use context clues | 2–3 | `reading.phonics.cvc` | rubric |
| `reading.vocab.affixes_roots` | Prefixes, suffixes, roots | 3–4 | `reading.phonics.multisyllable` | accuracy |
| `reading.vocab.academic` | Academic & domain vocabulary | 4–5 | `reading.vocab.affixes_roots` | rubric |
| `reading.comp.retell_sequence` | Retell & sequence events | 1–2 | `reading.phonics.cvc` | rubric |
| `reading.comp.literal` | Answer literal questions | 2 | `reading.comp.retell_sequence` | accuracy |
| `reading.comp.main_idea` | Main idea & key details | 2–3 | `reading.comp.retell_sequence`, `reading.fluency.accuracy_rate` | rubric |
| `reading.comp.inference` | Make inferences | 3–4 | `reading.comp.main_idea` | ai_analysis |
| `reading.comp.text_structure` | Compare/contrast, cause/effect, problem/solution | 3–4 | `reading.comp.main_idea` | rubric |
| `reading.comp.authors_purpose` | Author's purpose & point of view | 4–5 | `reading.comp.inference` | rubric |
| `reading.comp.evaluate_evidence` | Support claims w/ evidence; fact vs opinion | 4–5 | `reading.comp.inference`, `reading.comp.text_structure` | ai_analysis |
| `reading.comp.theme` | Determine theme / central message | 4–5 | `reading.comp.inference` | ai_analysis |
| `reading.lit.story_elements` | Character, setting, plot | 2–3 | `reading.comp.retell_sequence` | rubric |
| `reading.lit.figurative` | Similes, metaphors, idioms | 4–5 | `reading.lit.story_elements`, `reading.vocab.affixes_roots` | rubric |

---

## 6. Critical-Thinking Layer (`analytical.*`) — cross-cutting

First-class per roadmap §6.4. These are **embedded** in math/reading items (not a
separate subject the child "visits") and are assessed via the reasoning prompts
attached to other activities.

| skill_id | name | embeds in |
|----------|------|-----------|
| `analytical.compare_classify` | Compare, contrast, classify | math shapes/numbers; reading compare/contrast |
| `analytical.cause_effect` | Sequence & cause/effect reasoning | math word problems; reading text structure |
| `analytical.infer_evidence` | Infer & justify with evidence | math "how do you know?"; reading inference/theme |
| `analytical.evaluate` | Evaluate reasoning; spot errors | math spot-the-error; reading fact vs opinion |
| `analytical.patterns` | Detect & extend patterns | math patterns; reading structure |
| `analytical.metacognition` | Reflect on strategy ("how did I solve it?") | end-of-session reflection (all subjects) |

**Rule:** every graded item SHOULD carry at least one `analytical.*` tag so
reasoning quality is tracked alongside correctness.

---

## 7. Per-Child Readiness Frontiers

The **frontier** = the set of skills the child must reach mastery on to be "ready."
The planner targets unmastered frontier skills whose prerequisites are met.

### 7.1 Luca — Grade 3 Readiness (master through end of Grade 2)

**Math frontier:** `count_120`, `place_value_100`, `compare_order`,
`addsub.within_20`, `addsub.within_100`, `muldiv.concept` (intro),
`geometry.shapes_attributes`, `geometry.partition`, `measure.length_time`,
`data.picture_bar`, `reasoning.patterns`, `reasoning.word_1step`.
*Stretch (Grade-3 entry):* `place_value_1000`, `addsub.within_1000`,
`fractions.concept`.

**Reading frontier:** `phonics.vowel_teams`, `fluency.accuracy_rate` (developing),
`vocab.context_clues`, `comp.retell_sequence`, `comp.literal`, `comp.main_idea`
(intro), `lit.story_elements`.
*Stretch (Grade-3 entry):* `phonics.multisyllable`, `comp.inference` (intro).

### 7.2 Sofia — Grade 5 Readiness (master through end of Grade 4)

**Math frontier:** `place_value_10000`, `round`, `addsub.multi_digit`,
`muldiv.facts_10` (fluent), `muldiv.multi_digit`, `muldiv.division_basic`,
`fractions.equivalence`, `fractions.compare`, `fractions.addsub_like`,
`measure.area_perimeter`, `reasoning.word_2step`.
*Stretch (Grade-5 entry):* decimals/mixed numbers (add in Phase 3 graph extension).

**Reading frontier:** `phonics.multisyllable` (mastered), `fluency.expression`,
`vocab.affixes_roots`, `vocab.academic` (intro), `comp.inference`,
`comp.text_structure`, `comp.authors_purpose`, `comp.evaluate_evidence` (intro),
`comp.theme` (intro), `lit.figurative` (intro).

> Frontiers are stored as a **readiness target** per child (a tagged skill set +
> mastery threshold), not as hardcoded lists in components.

---

## 8. Seeding Instructions (Phase 0, idempotent)

For codex — described, not code:

1. **kids-pcg (authoritative):** upsert every skill in §4–6 via the existing
   `POST /skills` (admin) using `skill_id`, `name`, `subject`, optional `standard`
   (TEKS), `description`, `prerequisites`. The store already MERGEs on `skill_id`
   and builds `:REQUIRES` edges — re-running must not duplicate.
2. **Postgres mirror:** upsert matching rows into `skill_domains` (math, reading,
   analytical) and `skills` (with `min_grade`, `max_grade`, `skill_level`,
   `assessment_type`, `mastery_threshold`, `sort_order`). Key on `code` = `skill_id`.
3. **Readiness targets:** persist Luca's and Sofia's frontier sets (§7) as data
   (new lightweight table or PIC goal records) so the planner can prioritize them.
4. **PIC identities:** ensure each child's PIC `identity` has `age_band` + `grade`
   per §2 (set `reading_level` from the Phase-1 diagnostic, not assumed).
5. **Verify:** `GET /next-objectives?subject=math` and `?subject=reading` for each
   child returns frontier-aligned skills with prerequisites satisfied.

Seeding order: domains → skills (parents before children via `skill_level`) →
prerequisite edges → readiness targets → PIC identities.

### 8.1 Implemented seed entrypoint (current repo)

- `npm run seed:phase0:learning` (from `ecosystem-dashboard/`) now performs the
  idempotent Phase-0 seed workflow.
- Script path: `scripts/seed-phase0-learning.ts`; canonical data source:
  `src/lib/kids-pic/phase0-seed-data.ts`.
- Required env for full seed:
  - `KIDS_PCG_ADMIN_KEY`
  - `KIDS_PCG_SEED_OWNER_ID` (or fallback `KIDS_PCG_DEFAULT_OWNER_ID`)
  - `LUCA_OWNER_ID`, `SOFIA_OWNER_ID` (for per-child readiness targets)
  - Postgres connection vars (`POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`,
    `POSTGRES_USER`, `POSTGRES_PASSWORD`) when Postgres mirror is enabled.
- Optional toggles:
  - `SEED_PCG=false` to skip kids-pcg writes
  - `SEED_POSTGRES=false` to skip Postgres mirror
  - `REQUIRE_CHILD_OWNER_IDS=true` to fail fast if Luca/Sofia owner IDs are unset.

This implements defaults aligned with open confirmations:
- **C3 default:** curriculum overlay remains off unless explicitly enabled later.
- **C4 default:** reading levels are not preset in seed; source is Phase-1
  diagnostic.

---

## 9. Diagnostic Placement (early Phase 1)

Before tutoring, run a short adaptive placement per subject:

- Start at the band floor (Luca: early/Grade-1 skills; Sofia: Grade-3 skills).
- Use a handful of items per candidate skill; record correct/incorrect as mastery
  evidence (kids-pcg EMA). Stop a strand when the child misses consistently.
- Result: an initial mastery profile → planner computes the true starting frontier.
- Keep it short and encouraging (it is not a "test"; frame as "let's find your
  starting point"). Safety + age-appropriateness apply as always.

---

## 10. Content Item Templates (per type)

Author/AI-generate these as catalog records (roadmap §8.1), each mapped to one or
more `skill_id` + at least one `analytical.*` tag, with age band + grade range,
difficulty, and (for closed items) an answer key + accepted forms.

| Type | Fields (beyond common) | Checking |
|------|------------------------|----------|
| `worked_example` | steps[], narration | none (instruction) |
| `problem` (closed) | prompt, answer, accepted_forms, tolerance | deterministic |
| `passage` | text, lexile/level, source | none |
| `question` (on passage) | stem, type (literal/inferential/evaluative), answer/rubric | deterministic or rubric |
| `prompt` (open) | task, audience, length target | rubric + ai_analysis |
| `rubric` | criteria[], levels[], descriptors | — |
| `hint_set` | ordered hints (nudge→leading→partial→worked step) | — |

### 10.1 Example — Math, Luca level (Grade-2, `math.reasoning.word_1step` + `analytical.infer_evidence`)

- **problem:** "Maya has 38 stickers. She gives 19 to her friend. How many does she
  have now?" answer `19`; accepted_forms `["19","19 stickers"]`.
- **hint_set:** (1) "What's happening — are stickers being added or taken away?"
  (2) "Try subtracting: 38 − 19." (3) "Break it up: 38 − 10 = 28, then 28 − 9 = ?"
  (4) worked step.
- **reasoning check:** "How do you know it's subtraction?" (scored on justification).

### 10.2 Example — Reading, Sofia level (Grade-4, `reading.comp.inference` + `analytical.infer_evidence`)

- **passage:** short grade-4 narrative (age-appropriate, safety-screened).
- **question (inferential):** "How does Mia probably feel at the end? Use evidence
  from the story." rubric scores: claim + at least one text-based detail + reasoning.
- **hint_set:** (1) "Find a sentence that shows what Mia did." (2) "What does that
  action suggest about her feelings?" (3) "Match a feeling word to the clue."
- **critical thinking:** require the child to quote/point to the evidence.

---

## 11. Assessment Defaults

- `accuracy` → deterministic auto-check (preferred for closed math + closed reading).
- `rubric` → explicit criteria; child gets growth-oriented feedback + a level.
- `ai_analysis` → AI scores open responses against a rubric with `ai_confidence`;
  low confidence = lighter feedback, never a hard mastery drop.
- Every checked attempt writes mastery evidence to kids-pcg and a proficiency
  snapshot to Postgres (roadmap §9.3).

---

## 12. Phase 0 Acceptance Criteria

- All §4–6 skills exist in kids-pcg with correct `:REQUIRES` edges (no dupes on
  re-seed) and mirrored in Postgres `skills`/`skill_domains`.
- Luca and Sofia have PIC identities with correct band/grade and stored readiness
  targets (§7).
- `GET /next-objectives` returns frontier-aligned, prerequisite-satisfied skills for
  each child in both subjects.
- A re-run of seeding is idempotent.
- No secrets added outside Infisical; no graded content exists yet (content is
  Phase 1, owner-approved per L4).

---

## 13. Open Confirmations (quick answers unblock seeding)

- **C1. [RESOLVED]** Luca turning **8** → band `middle` confirmed; Sofia **10** →
  band `tween` confirmed.
- **C2.** Each child's kids-pcg `owner_id` (for per-child mastery scoping).
- **C3.** Enable the optional **TEKS overlay** for the pilot, or leave curriculum
  off by default (recommended for now)?
- **C4.** Reading levels — confirm we set these from the Phase-1 diagnostic
  (recommended) rather than presetting them.
