# Agent Context Hub — The Always-On Context Spine

> Status: **Architecture spec (design).** Defines the infrastructure that keeps the
> learning agent *always in the loop* across every child activity, anchoring both
> **in-focus** (what's on screen now) and **long-form** (durable learner) context,
> and gluing lessons, activities, and free-style learning to the **Pi Code CLI**
> agent loop. Contains design contracts (interfaces) — **no implementation code.**
>
> **Canonical contract surface:** the ratifiable TypeScript interfaces
> (`ContextFrame` / `ContextProvider` / `ContextEnvelope`, plus the Activity Registry,
> Activity Theme, Tutor Companion, Agent Transport, and Tool Roster they connect to)
> live in **`docs/KIDS_PLATFORM_CONTRACTS.md`**. This doc is the *architecture
> narrative*; the contract blocks below are illustrative sketches that
> `KIDS_PLATFORM_CONTRACTS.md` supersedes.
>
> Reads with:
> - `docs/KIDS_PLATFORM_CONTRACTS.md` (the contracts this spine is built from)
> - `docs/FSD_AGENTIC_HARNESS.md` §1.5 (Pi Code Agent Execution Engine), §1.6
>   (Context Hub), §4.6 (Tool Roster)
> - `docs/LEARNING_EXPERIENCE_DESIGN.md` (the Brilliant-style surfaces that emit context)
> - `docs/LEARNING_PLATFORM_ROADMAP.md` §18–20
> - `docs/KIDS_DASHBOARD_HARNESS_AUDIT.md` (gaps + ordered backlog)

---

## 1. Principle: Agentic-First Means Always In The Loop

The learning platform is **agent-first**: the AI tutor is not a feature on one page
(the chat) — it is a **companion present in every child activity** (lesson card,
skill-map, art studio, journal, book reader, Pokémon Lab, free-style chat). The
same agent that runs a math turn can **explain whatever is currently on screen**,
because the screen's state is continuously fed to it.

For that to work, the agent needs context that is:

- **In focus** — *what the child is looking at and doing right now* (the active
  card, the current problem, the passage being read, the drawing in progress).
  Ephemeral, high-priority, refreshed every interaction.
- **Long-form** — *who this learner is and where they are* (mastery, misconceptions,
  zone of proximal development, learning style, goals, today's plan, recent
  consolidation insights, streak/mission state). Durable, summarized, always
  available.

The **Agent Context Hub** is the spine that always anchors both tiers and hands
them to the Pi Code agent loop on every turn. It is the **glue** between the
surfaces and the CLI/LLM.

---

## 2. The Spine — Architecture Overview

```
   Child surfaces (Brilliant-style)               Always-present Tutor Companion (UI)
   ┌──────────────────────────────────┐          ┌───────────────────────────────┐
   │ Lesson cards · Skill-map pathways │          │ Read · Explain · Hint · Try   │
   │ Activities (art, journal, books)  │  emit     │ another · Talk · Celebrate    │
   │ Pokémon Lab · Free-style chat     │  frames   └───────────────┬───────────────┘
   └───────────────┬──────────────────┘                           │ child asks /
                   │ ContextFrame (typed, per surface)             │ acts
                   ▼                                               ▼
        ┌─────────────────────────────┐   compose +     ┌──────────────────────────┐
        │       CONTEXT HUB           │   budget +      │   Pi Code CLI agent loop  │
        │  • focus tier (active frame)│   transport     │   (Tool Roster §4.6)      │
        │  • long-form tier (PCG)     │ ───────────────►│   perceive→reason→plan→   │
        │  • token budget + priority  │  ContextEnvelope │   act→reflect             │
        │  • ambient providers        │                 └────────────┬─────────────┘
        └───────────────┬─────────────┘                              │ every tool hop
                        │ read / write-back                          ▼
                        ▼                                  ┌────────────────────────┐
                ┌───────────────────┐                      │      HARNESS RAILS     │
                │   Memory (PCG)     │ ◄─────────────────── │ Policy · Safety · Eval │
                │   learner model    │   evidence + events   │ Audit · Events         │
                └───────────────────┘                       └────────────────────────┘
```

**One sentence:** every surface emits a `ContextFrame`; the Hub composes the active
frame (focus) with a budgeted summary of the learner model (long-form) into a
`ContextEnvelope`; Pi Code runs the agent loop over that envelope using only the
gated Tool Roster; the harness rails bound every hop; evidence is written back to
memory so the next turn is smarter.

This is the **same ambient-context pattern Pi Code already uses**
(`.picode/ambient.json`: providers with `active`/`passive` slots, `priority`, and a
`budgetTokens` ceiling). The Context Hub is the learning domain's set of providers +
the composer that fills that ambient budget.

---

## 3. Context Tiers

### 3.1 Focus tier (in-focus) — "what's on screen now"

The focus tier is the **single active `ContextFrame`** from the surface the child is
currently on. It is what lets the child point at the screen and say *"explain this"*
and have the agent know what *this* is.

- **High priority** — never dropped from the budget.
- **Small + fresh** — re-emitted whenever the on-screen state changes (new card,
  new attempt, new selection, new paragraph read).
- **Safety-screened** — visible content passes the Safety Lane before it enters the
  envelope (the agent never perceives unfiltered content).

### 3.2 Long-form tier — "who this learner is"

The long-form tier is a **budgeted summary** assembled from the PCG learner model
and planning state:

| Long-form slice | Source | Why the agent needs it |
|-----------------|--------|------------------------|
| Persona + voice + reading level | persona-as-data + child profile | speak age-appropriately |
| Mastery summary (mastered / emerging / fragile) | kids-pcg mastery (EMA) | calibrate difficulty (ZPD) |
| Active misconceptions | misconception tracker | target the actual bug, not symptoms |
| Zone of proximal development | next-objectives planner | what they're *ready* to learn next |
| Learning-style signals | learner model (pace/modality/session length) | adapt modality + pacing |
| Goals (parent + child) | assignments + goal-setting | respect what the family is steering toward |
| Today's plan | learning-planner | stay coherent across activities |
| Recent insights | kids Dreaming (offline consolidation) | start the session already informed |
| Engagement state | streak / mission / affect estimate | gentle motivation, detect frustration |

Long-form context is **compacted to fit the budget** (most-relevant-to-current-focus
first). It is *always available* but never crowds out the focus tier.

---

## 4. Context Providers — how every activity plugs in

Each child surface registers a **Context Provider** that can produce a
`ContextFrame` on demand and on change. This is the contract that makes a surface
"agent-aware." Adding the companion to a new activity = implementing this provider.

```ts
// ILLUSTRATIVE SKETCH — canonical contract: KIDS_PLATFORM_CONTRACTS.md §3
type LearningSurface =
  | 'lesson_card' | 'skill_map' | 'free_chat'
  | 'art_studio' | 'journal' | 'book_reader' | 'dictionary'
  | 'pokemon_lab' | 'planner' | 'workspace';

interface ContextFrame {
  surface: LearningSurface;
  activityId: string;            // content item / lesson / lab section id
  skillCodes?: string[];         // skills this activity exercises (for mastery wiring)
  focus: {
    title: string;              // human label of what's on screen
    visibleContent: string;     // the card prompt / passage / problem (SAFETY-SCREENED)
    state: Record<string, unknown>; // current input, selection, attempt #, slider value...
    affordances: string[];      // what the child can do here ("drag", "answer", "draw")
  };
  intentHints?: Array<'practice' | 'explore' | 'reflect' | 'create' | 'read'>;
  timestamp: number;
}

interface ContextProvider {
  surface: LearningSurface;
  getFrame(): ContextFrame | Promise<ContextFrame>; // pull
  subscribe(onChange: (frame: ContextFrame) => void): () => void; // push on change
}
```

**Every surface — including free-style chat and "fun" activities — is a provider.**
That is what guarantees the agent is *always in the loop*: there is no child screen
that produces no context. Pokémon Lab emits a frame describing the current graph
lesson; the journal emits the current entry; the book reader emits the current page.

---

## 5. The Context Hub — the broker

The Hub is the learning domain's context composer + transport. Responsibilities:

1. **Register providers** for the active session's surfaces.
2. **Anchor focus** — track the active surface and its latest `ContextFrame`.
3. **Assemble long-form** — read the PCG learner model + plan + goals + recent Dream
   insights; compact to a summary relevant to the current focus.
4. **Budget + prioritize** — fill a token budget (Pi Code `budgetTokens`): focus
   tier first (never dropped), then long-form slices by priority; drop/trim lowest
   priority when over budget and record what was dropped (mirrors ambient.json's
   `budget.dropped`).
5. **Attach the Tool Roster** — the gated allow-list for *this* surface (§4.6); e.g.
   a book reader exposes `read_with_me`, `define_word`, `show_passage`; a math card
   exposes `give_hint`, `generate_problem`, `check_answer`.
6. **Compose the `ContextEnvelope`** and hand it to Pi Code on every turn.
7. **Write-back** — after the turn, route evidence + insights to Memory (PCG) via the
   Memory Agent and emit harness events; update engagement state.

```ts
// ILLUSTRATIVE SKETCH — canonical contract: KIDS_PLATFORM_CONTRACTS.md §3
interface ContextEnvelope {
  sessionId: string;
  childId: string;
  focus: ContextFrame;                 // in-focus, highest priority
  longForm: LongFormContext;           // budgeted summary (see §3.2)
  toolRoster: string[];                // §4.6 allow-list for this surface
  budget: { totalTokens: number; used: number; dropped: string[] };
  safety: { userType: 'child'; contentFilter: 'strict'; safetyLevel: string };
}

interface ContextHub {
  registerProvider(p: ContextProvider): void;
  setFocus(surface: LearningSurface): void;     // child navigated to a surface
  composeEnvelope(): Promise<ContextEnvelope>;  // called before each agent turn
  recordOutcome(turn: AgentTurnResult): Promise<void>; // write-back to PCG + events
}
```

> **Hard rule.** The Context Hub does not call the model. It *prepares context* and
> hands it to the Pi Code agent loop, which is the only thing that runs the loop —
> and every model/tool hop still passes the harness Policy Gate + Safety Lane
> (`FSD_AGENTIC_HARNESS.md` §1.5, §4.6). The Hub is context plumbing, not a second
> agent runtime.

---

## 6. The Always-Present Tutor Companion (UI)

The companion is the **single, consistent on-screen surface of the agent**, present
on every child activity. It is the front-door to the agent loop and renders the
Brilliant-style affordances (detailed in `LEARNING_EXPERIENCE_DESIGN.md`):

- **Read it** — reads the current card/passage aloud (essential for pre-readers).
- **Explain this** — explains *what's in focus* at a kid level, optionally with a
  "show me" visual.
- **Help me** — triggers the structured **hint ladder** (focus → sub-step →
  worked-example-minus-last-step), never the answer.
- **Try another** — offers a similar-difficulty item if the child is discouraged.
- **Talk to me** — free-form, context-aware Q&A about what's on screen (older end of
  the range).
- **Celebrate** — growth-mindset, effort-praising acknowledgement (anti-sycophancy
  monitored).

Because the companion reads the **focus frame**, "Explain this" always refers to the
exact thing on screen — the same agent, everywhere.

---

## 7. Free-style learning + fun activities (the glue)

The Hub treats *all three* learning modes uniformly, because all three emit frames:

- **Guided lessons** — `lesson_card` frames drive `diagnose → explain → practice →
  check`; mastery written back.
- **Free-style learning** — `free_chat` frames let the child explore a topic; the
  agent stays Socratic and can *pull* the conversation toward a ZPD objective and log
  emergent interests to the learner model.
- **Fun activities** — `pokemon_lab`, `art_studio`, etc. emit frames so play is
  *measured*: the agent can relate the activity to a skill, and completion advances
  mastery (e.g. Pokémon Lab → `explore_graph` tool → `analytical` skill). This is how
  "fun" becomes outcome-bearing rather than a side-show.

---

## 8. How the spine binds to the rest of the harness

| Concern | Owned by | Spine's role |
|--------|----------|--------------|
| Running the loop + tool calls | **Pi Code CLI** (§1.5) | Hub feeds it the envelope |
| Bounding every hop | **Harness rails** (§4) | Hub passes safety-screened content only |
| What tools are allowed | **Tool Roster** (§4.6) | Hub attaches per-surface roster |
| Durable learner model | **Memory / PCG** | Hub reads long-form, writes outcomes |
| Offline consolidation | **Kids Dreaming** (§18.3) | feeds long-form `recentInsights` |
| Adaptive next-best-action | **Planner** | supplies `plan` + ZPD to long-form |

---

## 9. Delivery (maps to roadmap phases)

The spine underpins the agentic-first vision and is sequenced with the Pi Code work:

1. **Context contracts** — ratify `ContextFrame` / `ContextEnvelope` / `ContextProvider`.
2. **Hub v1 (focus + long-form)** — compose envelope from the active frame + a PCG
   summary; token budget; attach per-surface tool roster.
3. **Provider rollout** — implement providers for lesson cards + free chat first, then
   art studio, journal, book reader, Pokémon Lab.
4. **Companion UI** — always-present tutor with Read/Explain/Hint/Try-another/Talk.
5. **Write-back + always-in-the-loop** — outcomes to PCG + events from every surface.

Tracked as **roadmap Phase 11** (Context Hub) alongside **Phase 6** (Pi Code loop);
acceptance + ordered detail in `KIDS_DASHBOARD_HARNESS_AUDIT.md`.

---

## 10. Guardrails

**DO**
- Make every child surface a Context Provider — no screen without context.
- Keep the focus tier highest-priority and always safety-screened before it reaches
  the agent.
- Budget long-form context like Pi Code ambient context (priority + token ceiling).
- Keep authoritative grading + mastery writes server-side, triggered via tools.

**DON'T**
- Don't let the Hub call the model directly — it prepares context; Pi Code runs the loop.
- Don't feed unfiltered on-screen content into the envelope.
- Don't bypass the Tool Roster because context "knows" what the child wants.
- Don't let long-form context crowd out the in-focus frame.
