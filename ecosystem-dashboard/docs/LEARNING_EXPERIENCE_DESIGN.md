# Learning Experience Design — Brilliant-Style, Child-First

> Status: **Product + pedagogy spec (design).** Defines the *experience* layer of the
> Kid's Learning Platform: Brilliant.org-style interactive learning cards, narrative
> skill-map pathways, gentle gamification, and ZPD-bounded adaptivity — grounded in
> evidence-based childhood learning principles (ages ~5–10) and delivered through the
> always-present AI tutor companion.
>
> Reads with:
> - `docs/AGENT_CONTEXT_HUB.md` — the spine that makes the tutor always-present and
>   context-aware of every card/activity below
> - `docs/KIDS_PLATFORM_CONTRACTS.md` — the contracts these surfaces implement
>   (`LearningActivity`, `ActivityThemeTokens`, `ContextFrame`, Tutor Companion, Tool Roster)
> - `docs/FSD_AGENTIC_HARNESS.md` §4.6 (Tool Roster), §1.5 (Pi Code engine)
> - `docs/LEARNING_PLATFORM_ROADMAP.md` §19 (this experience layer in the plan)
>
> Sourced from research on Brilliant.org's instructional model + childhood
> learning-science principles (Vygotsky ZPD/scaffolding, Bloom mastery, spaced
> retrieval, Dweck growth mindset, Self-Determination Theory, dual-coding, DAP).

---

## 1. Design North Star

Replicate Brilliant's **core pedagogy** — *problem-first, learn-by-doing, one idea
per screen, immediate feedback, mastery-based pathways, adaptive difficulty* — but
**adapt it for 5–10-year-olds**: simpler UX, lower cognitive load, more narrative and
scaffolding, touch-first manipulatives, gentle non-punitive motivation, and a
Socratic tutor that **never just gives the answer**.

Three non-negotiables:

1. **Active, not passive.** Almost every screen asks the child to *do* something.
2. **Productive struggle, safely.** Tasks sit just beyond solo ability (ZPD), with
   layered hints — challenge is framed as growth, never as evidence of low ability.
3. **Intrinsic motivation protected.** Gamification is *informational* (feedback on
   effort/strategy), never *controlling* — to avoid the overjustification effect.

---

## 2. Learning Cards — one micro-action per screen

The atomic unit is a **card**: a single concept or action, text-light, with at least
one interactive element. A small, predictable set of card templates lets young
children know "what to do" without re-reading instructions.

| Card type | Purpose | Example |
|-----------|---------|---------|
| **Try it** | Problem-first; child attempts before being taught | "Drag apples to make 5" |
| **See it** | Short visual demo / looped animation of the idea | dots grouping into 5 |
| **Explain it** | Kid-level "why", 1–2 sentences + visual | "5 is 3 and 2 together" |
| **Play with it** | Open manipulative / exploration | slider changes number of dots |
| **Check it** | Mastery probe (retrieval, child must produce) | "Make 5 a different way" |

**Card rules (DAP + cognitive load):**

- One micro-action per card; **1–2 simple sentences** of text max.
- The tutor can **read every card aloud** (pre-readers) — text is never a gate.
- **Concrete → Pictorial → Abstract (CPA):** real objects → icons/dots → symbols
  (`3 + 2`). Don't start symbolic.
- Big, touch-friendly targets; chunky draggables; generous spacing.
- Highlight the relevant element in one bright color; dim the rest. Motion only to
  show a relationship, then stop.
- Consistent placement of **Next / Hint / Read-aloud** on every card.

Each card is a **Context Provider** (`AGENT_CONTEXT_HUB.md` §4): it emits a
`lesson_card` frame so "Explain this" always refers to the exact card on screen.

---

## 3. Immediate Feedback + "See Why"

- **Correct:** a short, satisfying celebration + concrete praise tied to the
  *strategy* — "Nice! You made 5 by adding 2 more." A **"See why"** button always
  offers a short visual explanation (stops fast-guessers from skipping the concept).
- **Not-yet:** never "wrong" in a shaming way. "Not yet — let's look closer." Then a
  **path forward** (hint, easier variant, or walkthrough) is always present.
- Explanations **animate the reasoning** (objects combining/splitting); the tutor
  narrates over the animation.
- Always require the child to **produce** an answer (tap/drag/draw/speak) before
  revealing feedback — no passive "click to reveal."

---

## 4. Hint Ladder — scaffolds, never the answer

Hints are **tiered and child-chosen** (never auto-revealed to the solution). The
agent generates them dynamically but the **UI constrains them to clear levels** so
kids don't get lost. This is enforced by the `give_hint` tool's level bounding.

1. **Hint 1 — focus attention / metacognitive cue:** "Re-read the question — what's
   the important word?" / "How many are on the left?"
2. **Hint 2 — strategy / sub-step:** "Let's count them together." / "Try drawing the
   story."
3. **Hint 3 — worked example minus the last step:** "Watch me do the first one… now
   you finish."

If the full solution is ever shown (after several attempts), **immediately follow
with a new, similar problem** the child completes with lighter support. Track
"scaffold level used" and **fade support** over time ("training wheels" metaphor).

**Productive-struggle window:** allow ~20–60s of active attempts (5–7 yrs), a bit
longer for 8–10, before offering a light hint. After 2–3 wrong attempts on the same
subskill, step difficulty down or switch to guided practice — never a long failure
streak.

---

## 5. Pathways — a narrative skill-map, not an abstract tree

Replace abstract skill trees with an explorable **world map / islands**:

- Skills are **places** with distinct icons: "Counting Island," "Shapes Forest,"
  "Story-Problems Town."
- **Soft prerequisites:** recommend a path, but allow exploration. If a child opens a
  too-hard skill, the tutor offers: "This is a big-kid puzzle — want to warm up with
  [X] first?"
- **Narrative progression:** mastering skills restores color / unlocks scenes for a
  character — light story wrapping, not rank-chasing.
- **Adult-facing view:** parents/educators get the *formal* skill tree (standards-
  aligned where relevant: TEKS via STAAR) with readiness + mastery indicators.

This experience sits on the existing learner model: micro-skills, prerequisite edges,
and `next-objectives` (ZPD) already exist in kids-pcg; the map is their kid-facing
projection. Path data structures: see `LEARNING_PLATFORM_ROADMAP.md` (learning paths).

---

## 6. Mastery + Spaced Review

- **Micro-skills** (e.g. *count to 5 → count to 10 → add within 5 with objects → add
  within 10*), each ~5–10 short cards.
- **Clear mastery thresholds** that span *days*, not one session (e.g. "80% on a mixed
  set of 10" or "3 correct across two days"). Show mastery as a filling **star / growing
  plant**, not a number.
- **Gentle ramp within a skill:** 2–3 confidence-builders → 3–4 core → 1–2 stretch
  (auto-skip stretch if frustration is high).
- **Spaced retrieval:** each session opens with a 3–5 item **review burst** from older
  skills (retrieval practice, labeled "Let's see what you remember!"), spaced 1d → 4–7d
  → periodic. Powered by the spaced-review scheduler + kids Dreaming consolidation.
- **Interleaving** of problem types once a skill is stable; **varied contexts** (same
  skill as number-line, word-problem, and game).

---

## 7. Gentle Gamification (protect intrinsic motivation)

Use **informational** rewards tied to effort/strategy; avoid controlling rewards and
competition. Allow adults to tune gamification down.

**DO**
- **Soft, repairable streaks:** "You helped your buddy 3 days in a row!" A broken
  streak is downplayed ("Let's start a new adventure!"), repairable with a help token —
  never red/punitive.
- **Short daily missions:** one mission = ~1–2 skills / ~10 cards, framed as helping a
  character.
- **Levels as narrative milestones:** new hat/costume/scene, not abstract rank.
- **Effort/behavior badges:** "Persistence" (tried again after a hint), "Curious
  questioner" (used Explain more), "Strategy finder."
- **Competence made visible via mastery**, not raw points: "You're becoming a fractions
  master"; feedback on *improvement* ("2 more word problems than yesterday").
- **Autonomy via bounded choice:** 2–4 options for what/how to learn next.
- **Celebrations with control:** option to shorten/skip effects (sensory-sensitive kids).

**DON'T**
- No leaderboards or peer comparison for this age.
- No rewards for merely opening the app or minimal engagement.
- No big prize economies that make kids work only for points.
- No "you're so smart" praise (fixed-ability framing).

---

## 8. Adaptive Difficulty (ZPD-bounded)

- **Target success ~70–85%.** >90% → increase challenge; <60% → step down or add
  scaffolds. Adapt at the **subskill** level.
- **Signals:** accuracy (with/without hints), time-on-task, frustration patterns (rapid
  guesses, repeated errors).
- **In-card adaptation:** if stuck, surface visual scaffolds (number line, counters) and
  let the tutor step in after a short delay.
- **Transparency:** the tutor explains changes in plain language — "Those were tricky, so
  I picked easier ones to warm up" / "You're flying — want a challenge puzzle?"
- **Guardrails:** hard caps on problem length/complexity for the age band; checkpoints +
  saved progress on anything multi-step.

The model feeding this is the long-form context tier (`AGENT_CONTEXT_HUB.md` §3.2);
difficulty selection is the Planner's next-best-action plus in-turn agent judgment.

---

## 9. Growth-Mindset Feedback (tutor language)

- Praise **effort, strategy, persistence** — "You tried three different ways — great
  problem-solving!" / "You kept going when it was tricky — that's how your brain grows."
- **Mistakes as data:** "This isn't right *yet* — let's see what it teaches us."
  Show before/after growth ("Last week you needed hints here; today you did it alone").
- **No ability labels**, no pity, no group/peer comparison. The tutor models its own
  self-talk: "When I'm stuck, I break it into smaller parts — let's do that."

This is enforced by the existing anti-sycophancy `AIChildSafetyMonitor` (honest grading,
no false praise) re-aimed at feedback quality.

---

## 10. Session Shape (attention + well-being)

*(Minute ranges reflect common developmental practice, not a single formal standard —
tune per child via learning-style signals.)*

- **Ages 5–7:** ~5–10 min per focused activity; ~10–20 min total with 1–2 brain breaks.
- **Ages 8–10:** ~10–15 min per activity; ~20–30 min total with one break.
- **Micro-breaks:** 20–30s movement cues ("stretch like a star") between task types.
- **Vary task types** (read → choose → explain → game) to re-engage attention.
- **Exit on a win:** end after a success (even hint-supported), and offer "You did
  great — time for a break?" rather than pushing longer.

---

## 11. The Always-Present Tutor (behavior)

The companion (UI affordances in `AGENT_CONTEXT_HUB.md` §6) behaves as a **learning
coach, not an answer machine**:

- **Persona:** friendly, calm, never scolding/sarcastic; short concrete sentences;
  analogies from kid life (toys, pets, playground). Persona-as-data per character
  (Buddy/Steve/Pusheen) + per-child voice & reading level.
- **Co-present:** reacts to actions, highlights what it refers to, allows silence to
  think; doesn't over-talk (short turn-taking).
- **Refuses to just answer:** "I won't give the answer because I'd take away your chance
  to grow — want a hint or to break it into parts?"
- **Metacognition + autonomy:** check-ins ("easy / just right / very hard?") that adjust
  difficulty *and explain why*; goal prompts ("what's your goal today?").
- **Relatedness:** remembers preferences ("last time you liked animal stories"),
  encourages real-world + family connection ("show a grown-up how you solved it";
  "count the pieces on your plate at dinner").
- **Multimodal:** read-aloud, speech-to-text for emergent writers, drawing/manipulatives
  as answer channels; tutor paraphrases back ("You drew 3 groups of 4 — that's 12.
  Nice strategy.").

---

## 12. Tool ↔ Experience map

The Brilliant-style affordances are powered by the gated Tool Roster
(`FSD_AGENTIC_HARNESS.md` §4.6):

| Experience affordance | Tool |
|-----------------------|------|
| Read a card/passage aloud | `read_with_me` |
| Explain what's on screen | `ask_socratic` (+ `show_passage`) |
| Hint ladder | `give_hint` |
| New similar problem / "Try another" | `generate_problem` |
| Grade an answer | `check_answer` (server-side authority) |
| Define a word | `define_word` |
| Creative reinforcement | `draw_image` (approval-gated), `journal_write` |
| Fun-as-measured exploration | `explore_graph` (Pokémon Lab) |
| Effort celebration | `celebrate` (anti-sycophancy monitored) |

---

## 13. Build order (maps to roadmap Phase 19)

1. **Card system + templates** (Try/See/Explain/Play/Check) + CPA + read-aloud.
2. **Hint ladder + immediate feedback + "See why"** wired to `give_hint` / `check_answer`.
3. **Narrative skill-map** projection over existing skills + soft prerequisites.
4. **Mastery visuals + spaced review burst** at session start.
5. **Gentle gamification** (soft streaks, daily missions, effort badges, cosmetic
   rewards) with adult tuning.
6. **Adaptive difficulty** (ZPD target band) + transparency.
7. **Companion behavior polish** (growth-mindset language, metacognition check-ins,
   session-shape + exit-on-a-win).

---

## 14. Design Checklist

- **Cards** — one micro-action; ≤2 sentences; read-aloud available; ≥1 interactive
  element; CPA ordering.
- **Feedback** — immediate; always a path forward; "See why" after every problem;
  child must produce an answer.
- **Hints** — tiered, child-chosen, never the answer; new similar problem after a
  full reveal; fading support.
- **Pathways** — narrative map; soft prerequisites; adult skill view behind it.
- **Mastery** — micro-skills; multi-day thresholds; visible kid progress + detailed
  adult view; spaced review bursts.
- **Motivation** — soft repairable streaks; effort/strategy badges; mastery-as-
  competence; bounded choice; no leaderboards; adult tuning.
- **Adaptivity** — 70–85% target; subskill-level; in-card scaffolds; transparent;
  age-band caps.
- **Feedback language** — effort/strategy praise; mistakes-as-data; no ability labels.
- **Sessions** — age-appropriate length; micro-breaks; varied tasks; exit on a win.
- **Tutor** — coach not answer-machine; co-present; Socratic; metacognitive; multimodal.
