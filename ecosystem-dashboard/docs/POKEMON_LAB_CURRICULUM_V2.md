# Pokémon Lab — Curriculum & Free-Explore Redesign (v2)

> **Status:** Implementation-ready plan. **A new agent should start at §9 (Build
> Order) and work top-to-bottom.** This document is the single source of truth;
> it supersedes the older 9-lesson structure currently in code.
>
> **Single file to change:** `src/components/child/PokemonLab.tsx` (~3,678 lines).
> All lessons, the Explorer, and the Detail view live here.
>
> **Data layer (read-only, already built):** `src/lib/pokedex-client.ts` exposes
> `searchPokemon`, `fuzzySearchPokemon`, `pokemonByName`, `pokemonByDex`,
> `pokemonByType`, `pokemonByDualType`, `pokemonByMove`, `pokemonByAbility`,
> `typeEffectiveness`, `evolutionChain`, `pokemonForms`, `pokemonMoves`,
> `comparePokemon`, `teamSuggest`, `allTypes`, `graphStats`, `dailyPokemon`.
> Image fields per Pokémon: `sprite_dream_world` (SVG — prefer), `official_artwork`
> (PNG fallback), `sprite_front` (pixel, last resort).
>
> **Audience:** one child, Luca, age 7–8 (US 2nd grade).
> **Goal:** teach real data-science / data-analytics / knowledge-graph intuition
> through Pokémon, in a Brilliant.com interactive style, plus a freestyle,
> fully-traversable Pokédex for self-directed exploration and fact-checking.

---

## 1. Research grounding (do not violate these)

Plan is grounded in **CSTA K–2 CS standards**, **Common Core Math Grade 2
(2.MD.D.9 / 2.MD.D.10)**, the early-childhood **"dataying" data-lifecycle
framework**, and **Brilliant.com** interactive-pedagogy principles
(problem-first, predict-then-reveal, one idea per screen, manipulatives, instant
friendly feedback, story-based gamification).

### Age-appropriateness guardrails (HARD RULES)

| Concept | Teach it like this (CAN) | Do NOT (too advanced) |
|---|---|---|
| Classification | Sort by one feature; re-sort by another; "guess my rule"; things can be in 2 groups | Set notation, decision-tree algorithms |
| Counting / compare | Count per group, tallies, "more/less/same", "how many more" | Big numbers, %, formal inference |
| Graphs | Picture & bar graphs, 3–4 categories, **1 picture = 1** | Scaled units (1=5), histograms, line/scatter plots |
| Center | "Most common", "in the middle", fair-sharing with tiny numbers | Formal mean/median/mode, computing averages |
| Patterns | Notice/extend patterns, simple if–then | Symbolic rules, regression/prediction models |
| Data lifecycle | Story cycle: **Ask → Collect → Sort → Graph → Tell** | "cleaning", "sampling bias", pipelines |
| Networks | "Connection webs", count connections, clusters | The words *node/edge/degree*, graph algorithms |

**Language rules everywhere:** sentences ≤ 10 words; use game words
("strong/fast/friends") not jargon ("attribute/cluster"); audio narration ON by
default; ≤ 2 lines of text per screen; every hard word gets a picture/emoji.

**Anything technical** (knowledge graph, node, edge, query, Cypher/GraphQL) lives
ONLY behind an optional **"Curious Trainer 🔎"** expander, never in the main flow.

---

## 2. The narrative spine

One story runs through everything: **"Be a Data Detective — Ask → Collect →
Sort → Graph → Tell."** This 5-stop **Data Journey map** is introduced in Region
1, **stamped** one stop per lesson, and fully practiced in the capstone (§4, L11).

Lessons are grouped into **Regions** (this REPLACES the current `LESSON_SECTIONS`)
and unlock sequentially. Keep the existing `isLessonUnlocked` / `isSectionUnlocked`
*mechanics* — just feed them the new `LESSONS` / `LESSON_SECTIONS` data.

---

## 3. Shared interaction kit — **BUILD THIS FIRST** (Phase 0)

Create these reusable components near the top of the lessons section. Every lesson
and the Explorer are assembled from them. Nothing else should start until these
exist.

**Visual / data primitives**
- `<PokemonSprite pokemon|src size alt float?>` — SVG-first
  (`sprite_dream_world` → `official_artwork` → `sprite_front` → Pokéball SVG
  `/themes/pokemon/Icons/pokeball.png.svg`). Uses `<Image>`, never `<Avatar>`.
  **Replace ALL existing `<Avatar src={sprite_front}>` usages with this.**
- `<CountUpStatBar value color label>` — animated count-up bar (replaces static
  `<Progress>` stat bars).
- `<PictureGraph data>` — drop sprites into columns; **1 picture = 1 unit**.
- `<TallyCounter>` — live count with tally marks.
- `<DataJourneyMap stampedStops>` — 5-stop map (Ask/Collect/Sort/Graph/Tell).
- `<DataStoryCard>` — capstone output ("I found that ___!").

**Interaction primitives (Brilliant-style)**
- `<PredictThenReveal question choices answer why>` — predict, then animated reveal.
- `<TapCard>` / `<FlipCard>` — tap to reveal a fact.
- `<SortIntoBuckets items buckets>` — **tap-to-assign** (tap item, tap bucket;
  easier than drag for this age, works on touch).
- `<BigChoiceButton>` — ≥ 56px tall, icon + word; used by all quizzes.
- `<MascotTip>` — Pikachu (`/themes/pokemon/Widgets/pikachu.png.svg`) speech bubble,
  one friendly hint per step.
- `<CuriousTrainerExpander>` — collapsible that reveals the optional technical
  term/code for curious kids/parents.

**Upgrades to existing shared components**
- `LessonStepView` — add "Step N of M", a Pikachu that walks the progress bar, and
  a "🎉 +1 badge" micro-celebration on step complete.
- `QuizView` — switch to `<BigChoiceButton>`, keep the one-question-at-a-time +
  explanation pattern.

**Design system:** use the solid `SURFACE` palette already added to
`PokemonLabHome` (opaque panels/cards — NO transparency, so the Lab reads on any
child theme). Reuse the same tokens for every new surface.

---

## 4. Revised curriculum (REPLACES the current 9 lessons)

Target **5–8 short steps** per lesson; **one interaction per step**; each step
solvable in < 60s; each lesson names exactly **one** data concept and stamps its
Data Journey stop. Priority tags: **P1** = build first (data-science core),
**P2** = next, **P3 / bonus** = last.

Old→new mapping summary: *Sorting, Count/Graph, Typical, and the Capstone are
ADDED; `what-is-kg`+`nodes-edges` MERGE; `stats-analytics` SPLITS; `forms`
→ bonus; Cypher/GraphQL/Euler/scatter REMOVED from the child path.*

### Region 1 — 🗂️ Sorting Town (Classification)
**L1 "Spot the Groups & Sort Again"** — **ADD.** **P1.**
1. Hook: a pile of mixed Pokémon.
2. `<SortIntoBuckets>`: tap all Fire into a bucket.
3. Re-sort the SAME Pokémon by a new feature (big/small or heavy/light) →
   "things fit in more than one group."
4. **Guess-my-rule:** app secretly sorts 4 Pokémon; child guesses the rule.
5. Reveal Data Journey map; stamp **"Sort."**
6. Two picture-quiz checks.
Concept: classification + re-classification. Data: `searchPokemon`/`pokemonByType`.

### Region 2 — 🔢 Counting Meadow (Counts & graphs)
**L2 "Count & Graph"** — **ADD. Most standards-aligned (2.MD.D.10).** **P1.**
1. "How many Fire Pokémon?" tap-and-count with `<TallyCounter>`.
2. Repeat for Water & Grass (≤ 4 categories).
3. `<PictureGraph>`: each sprite grows a column (1 = 1).
4. Read it: "most? least?"
5. "How many MORE Fire than Water?" (compare).
6. Predict: "Add 1 Water — who wins now?" Stamp **"Graph."**
Concept: counting, tallies, picture/bar graph, compare. Data: `pokemonByType`.

### Region 3 — 🕸️ Connection Cave (Graph thinking, taught as "webs")
**L3 "Everything Connects"** — **KEEP-REWORK: merge `what-is-kg` + `nodes-edges`.** **P2.**
1. Pikachu with strings to ⚡ / Thunder / its evolution — "everything connects."
2. Relatable "friend web."
3. `<TapCard>`: tap a dot to reveal its facts.
4. Build a connection: tap Pokémon → tap type → string snaps in.
5. Bridge: "Now we can ask: show me all Water Pokémon!" Stamp **"Connect."**
REMOVE: Euler/Königsberg, `:Pokemon` colon syntax, Cypher (move "it's called a
knowledge graph" into Curious Trainer).

**L4 "Follow the Strings"** — **KEEP-REWORK `graph-viz`.** **P2.**
- Pick a starter (SVG cards) → guided `PokemonGraphViz` w/ coach marks →
  **scavenger hunt** ("find its type / what it grows into") with checkmarks → recap.

### Region 4 — ⚔️ Battle Arena (Relationships & rules)
**L5 "Strong & Weak"** — **KEEP-REWORK `type-chart`.** **P2.**
1. Rock-paper-scissors with Fire/Grass/Water icons.
2. `<PredictThenReveal>` "Fire vs Grass: strong or weak?"
3. Explore-a-type picker; relabel `EffectivenessBox` to "Beats 💪 / Weak to 🛡️ /
   Can't hurt 🚫".
4. Battle mini-game: pick the attacker that beats the defender.
5. Mini-quiz.

**L6 "Build Your Team"** — **KEEP-REWORK `team-builder`.** **P3.**
- Pick 6 (SVG cards) → **type-coverage donut** (categorical viz) → weakness check
  ("you have no Water!") → celebrate. Data: `teamSuggest`.

### Region 5 — 📊 Number Lab (Statistics & visualization)
**L7 "Stat Bars"** — **KEEP-REWORK; split from `stats-analytics`.** **P1.**
1. Six stat cards with kid definitions.
2. Analyze one Pokémon with `<CountUpStatBar>` ("taller = bigger").
3. Auto-highlight its **biggest & smallest** stat.
4. **Compare two** (`comparePokemon`) side-by-side; ⭐ the winner per stat.
   Stamp **"Tell."**

**L8 "Who's Typical?"** — **ADD.** **P2.**
1. Five HP bars — "Who's the **most common** size?" (mode, informal).
2. "Who's **in the middle**?" (median intuition, tiny set).
3. **Odd one out:** one giant HP bar — "who is **far from the rest**?" (outlier).
4. Recap: "Data has a usual… and surprises."
- Optional final step **"Fair Share":** share 12 berries among 3 Pokémon → 4 each.
  Frame as fair-sharing ONLY; never say "the mean/average."

### Region 6 — 💬 Ask Anything (Queries & the full cycle)
**L9 "Ask the Pokédex"** — **KEEP-REWORK `query-pokemon`.** **P2.**
- Librarian analogy (no code) → **estimate-then-search** ("a few or lots of Fire?")
  → live search with SVG cards → tap a result to peek at its connections →
  optional Curious-Trainer code peek.

**L10 "Talk to the Computer"** — **KEEP-REWORK `nl-queries`.** **P3.**
- 4-step relay (icons) → tap ready-made questions first → live `NLQueryPlayground`
  → graduation card (restyled SVG).

**L11 "Data Detective" — CAPSTONE** — **ADD. The payoff lesson.** **P1.**
- Run the WHOLE lifecycle on a chosen question:
  1. **Ask** (pick from 3 kid questions, e.g. "Are Water Pokémon faster than Fire?").
  2. **Collect** (search pulls the data).
  3. **Sort** into groups.
  4. **Graph** (auto bar chart).
  5. **Tell** via `<DataStoryCard>` → diploma. Stamps all 5 map stops.
- Should be able to **launch Free Explore** (§5) for deeper digging.

### Bonus — ✨ Amazing Forms (was `forms-lesson`) — **P3 / optional**
- Reworked as identity-vs-variant ("same Pokémon, different costume"):
  before→after SVG morph, gallery, spot-the-difference. Demoted from core to bonus.

---

## 5. Free-Explore Pokédex & Traversable Knowledge Graph

**KEEP and ENHANCE — never remove.** Today this is `PokemonExplorer`
(search + type chips + grid) and `PokemonDetailView` (the "card"), reached from the
home "Free Explore" button (`view='explorer'`) and from the L11 capstone.
**Current gap:** concepts are displayed but NOT traversable (type/ability tags,
move rows, evolution sprites don't link). Fix that.

### 5.1 Core new pattern: `<ConceptLens>`
ONE reusable slide-in drawer/modal, opened when Luca taps ANY selectable concept.
Always the same 3 zones so it feels predictable:
1. **What is it?** — kid-friendly ≤ 2-sentence explanation + big icon/SVG.
2. **See it on the web** — a focused `PokemonGraphViz` snippet showing this concept
   connected to the current Pokémon.
3. **Jump to connected things** — a row of tappable SVG cards of related entities;
   tapping one **traverses** (opens that entity's Lens or full card).

### 5.2 Every concept → Lens + traversal (use existing client methods)

| Tappable concept | "What is it?" source | "Jump to" | Method |
|---|---|---|---|
| **Type** chip | local glossary + `typeEffectiveness` (Beats/Weak to/Can't hurt) | "Other Fire Pokémon"; tap a weakness → that Type Lens | `typeEffectiveness`, `pokemonByType` |
| **Ability** tag | local generic explanation | "Other Pokémon with this ability" | `pokemonByAbility` |
| **Move** row | local glossary by `damage_class` + power/level | "Other Pokémon that learn this move" | `pokemonByMove` |
| **Evolution** sprite | explain via `evolve_trigger`/`evolve_min_level` | tap family member → its card | `evolutionChain` (already loaded) |
| **Stat** bar | "what this number means" + big/small highlight | "Compare with another Pokémon" | `comparePokemon` |
| **Species / Legendary·Mythical** | one-line species description | info-only | on `pokemon.species` |
| **Forms** | "same Pokémon, different costume" | tap form → its card | `pokemonForms` |

> No move/ability *description* endpoint exists — author a small local
> **`CONCEPT_GLOSSARY`** (types, stats, damage-classes, abilities-generic,
> evolution triggers, legendary/mythical) with short friendly strings. Types also
> get live data via `typeEffectiveness`.

### 5.3 Traversal UX (make wandering safe & friendly)
- **Back-stack + breadcrumb:** add `historyStack: PokemonDetail[]` to `PokemonLab`
  state. Each traversal **pushes**; show a persistent "← Back" + trail
  ("Pikachu › Electric › Raichu"). Replaces the current single-level back.
- **"Home base"** button → Explorer, always visible.
- **Recently viewed** strip (last 5).
- Gentle animations: strings draw in on Lens open; related-cards row slides.

### 5.4 Enhance the Explorer (browse-by-anything, no typing required)
- Restyle existing type chips with SVG type icons.
- Add **"Surprise me"** (random via `dailyPokemon`/random dex #).
- Add **browse-by-concept tiles**: "By Type", "Legendaries ⭐", "By Generation".
- Result cards' type chips are themselves tappable → open Type Lens (traversal
  begins before opening a Pokémon).

### 5.5 Fact-check framing
- Each Lens has a small **"Is this true? 🔎"** affordance that highlights the source
  connection in the mini-graph ("Pikachu —is— Electric") — age-appropriate
  "who told us this?" data-literacy, no jargon.

### 5.6 Reuse, don't duplicate
- Zone-2 mini-graph is the SAME `PokemonGraphViz`, focused on one node; tapping a
  node calls the SAME traversal handler as chips.
- Uses `<PokemonSprite>`, solid `SURFACE`, `<MascotTip>`, `<CuriousTrainerExpander>`.

---

## 6. UX & gamification rules (apply throughout)
- 5–10 min quests, ~6–8 micro-steps, one interaction per step, < 60s each.
- Friendly feedback tied to the visual feature ("look at the running-shoe number"),
  never a dry score.
- Story rewards: each lesson grants a typed badge + fills a "Pokédex page"
  summarizing the concept; show badges on the home **Trainer Journey** strip.
- Audio narration for all text; solid surfaces; SVG art everywhere.

---

## 7. What this changes in code (orientation for the new agent)
- `LESSONS` and `LESSON_SECTIONS` arrays — **rewritten** to the 6-region structure
  in §4 (the prior "do not change these" rule is now LIFTED).
- `LessonId` / `SectionId` types — updated to new ids.
- `LessonView` switch (currently maps `lesson.id` → component) — updated to new
  lessons; old lesson components are reworked or removed per §4.
- `PokemonLab` parent state — add `historyStack` for traversal (§5.3).
- `PokemonExplorer` + `PokemonDetailView` — enhanced per §5 (kept, not replaced).
- New shared components from §3 added once and reused.
- **Do NOT touch:** routing into the Lab, the page background work already done,
  or `pokedex-client.ts` (read-only).

---

## 8. Acceptance criteria (definition of done)

**Per lesson**
- 5–8 steps; every step has one interaction (tap/predict/sort/compare).
- Pokémon shown via SVG (`<PokemonSprite>`), never pixel `<Avatar>`.
- No jargon/code by default (Curious-Trainer expander only).
- Sentences ≤ 10 words; one named data concept; stamps its Data Journey stop.
- Respects §1 guardrails (NO scatter/correlation, scaled graphs, or formal average).
- Solid surfaces; unlock mechanics intact.

**Free Explore**
- Reachable from home AND the capstone; never removed.
- EVERY concept on a card is tappable → opens `<ConceptLens>` with all 3 zones.
- From any Lens, jump to ≥ 1 related entity AND return via breadcrumb.
- No dead-ends: each related list either traverses or clearly says "(just info)".
- Back-stack works ≥ 5 levels deep without losing state.

**Global**
- `npx tsc --noEmit` passes; no console errors.
- Lab readable on any child theme (solid surfaces, no wallpaper bleed).

---

## 9. BUILD ORDER — **START HERE. Work top to bottom.**

> A lesson/feature is "done" only when it meets the §8 criteria. Run
> `npx tsc --noEmit` after each phase. Commit per phase.

**Phase 0 — Foundation (do first, blocks everything)**
1. Build the shared interaction kit (§3): `<PokemonSprite>` first, then the rest.
2. Replace ALL `<Avatar src={sprite_front}>` across the file with `<PokemonSprite>`.
3. Upgrade `LessonStepView` and `QuizView` to the new kit.
4. Rewrite `LESSONS` / `LESSON_SECTIONS` / `LessonId` / `SectionId` to the §4
   6-region structure (lessons can render a "coming soon" placeholder until built).

**Phase 1 — Data-science core (P1 lessons)**
5. L1 "Spot the Groups & Sort Again" (Region 1).
6. L2 "Count & Graph" (Region 2).
7. L7 "Stat Bars" (Region 5).
8. L11 "Data Detective" capstone (Region 6).

**Phase 2 — Free-Explore traversal (§5)**
9. `<ConceptLens>` + `CONCEPT_GLOSSARY`; make every concept on
   `PokemonDetailView` tappable; wire all traversals.
10. Add `historyStack` + breadcrumb + "Home base" + recently-viewed.
11. Enhance `PokemonExplorer` (SVG chips, Surprise me, browse-by-concept tiles).

**Phase 3 — Remaining lessons (P2)**
12. L3 "Everything Connects", L4 "Follow the Strings" (Region 3).
13. L5 "Strong & Weak" (Region 4).
14. L8 "Who's Typical?" (Region 5).
15. L9 "Ask the Pokédex" (Region 6).

**Phase 4 — Polish & optional (P3 / bonus)**
16. L6 "Build Your Team", L10 "Talk to the Computer".
17. Bonus "Amazing Forms".
18. Gamification pass (§6): badges, Pokédex pages, Trainer Journey strip.

**END.** When Phase 4 is complete and all §8 acceptance criteria pass, the redesign
is done. Anything beyond this (new regions, more lessons) is out of scope for this
plan and should be proposed separately.
