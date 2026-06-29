# Kids Platform — Design Contracts (pre-code, for ratification)

> Status: **PROPOSED contracts. Pre-implementation.** This is the canonical
> TypeScript contract surface for the Kids Learning Platform abstractions. It turns
> the prose in `AGENT_CONTEXT_HUB.md`, `LEARNING_EXPERIENCE_DESIGN.md`, and
> `KIDS_DASHBOARD_UX_PLATFORM_AUDIT.md` into the interfaces we will implement.
>
> Nothing here is implemented yet — ratify (or amend) the contracts first, then we
> build. Every block marked **OPEN DECISION** needs a call before coding.
>
> Contracts are grounded in the **current** code:
> - `src/lib/child-themes.ts` (`ChildTheme = ThemePreset & { childExtras }`)
> - `src/components/child/PokemonLab.tsx` (`SURFACE`, `Lesson`, `QuizQuestion`)
> - `src/contexts/RightPanelContext.tsx` (`PanelConfig`)
> - `src/components/layout/ChildDashboardLayout.tsx` (nav + contextMap)
> - `.picode/ambient.json` (budgeted ambient context pattern)

---

## 0. The shape of the solution (one diagram)

```
                       ┌──────────────────────────────────────────┐
   ActivityRegistry ──▶│ LearningActivity (one declarative entry)  │
   (single source of   │  • route, title, icon, category           │
    truth, replaces    │  • theme:  ActivityThemeTokens  ──────────┼─▶ ChildThemeProvider (effective = base ⊕ overlay)
    4 hardcoded files) │  • panel:  ActivityPanelConfig  ──────────┼─▶ RightPanelContext (config by route)
                       │  • contextProvider: ContextProviderRef ───┼─▶ ContextHub ─▶ ContextEnvelope ─▶ AgentTransport
                       │  • toolRoster: ToolId[]         ──────────┼─▶ ToolGate (allow-list + safety + approval)
                       │  • skillCodes: string[]         ──────────┼─▶ mastery/PCG
                       │  • load(): Promise<Surface>               │
                       └──────────────────────────────────────────┘
                                          │
                                          ▼
                            <TutorCompanion/> (one component, always present,
                            themed by the activity, fed by the ContextFrame)
```

The registry is the **keystone**: theming, the companion panel, context, tool-gating,
routing, and nav all read from it. Adding a lab = **one entry**, not edits in 4 files.

---

## 1. Contract — Activity / Module Registry

Proposed home: `src/domains/learning/shared/activity-registry.ts` (FSD `shared`),
**OPEN DECISION** (§9.2) on whether legacy `src/lib/kids-pic` co-locates.

```ts
/** Stable, kebab-case activity id. Used in events, tool-gating, analytics. */
export type ActivityId = string; // e.g. 'pokemon-lab' | 'reading' | 'journal' | 'free-chat'

export type ActivityCategory =
  | 'lesson'     // structured learn-by-doing (Learn Hub)
  | 'lab'        // exploratory + measured (Pokémon Lab)
  | 'creative'   // art studio, story
  | 'literacy'   // books, dictionary, journal, writing
  | 'utility'    // planner, email helper
  | 'social'     // teams
  | 'free-chat'; // open companion conversation

/**
 * A child surface the platform can render, theme, contextualize, gate, and measure.
 * ONE entry replaces today's scattering across the PanelContext union, PANEL_CONFIGS,
 * the RightPanelContext route switch, and the ChildDashboardLayout contextMap.
 */
export interface LearningActivity {
  id: ActivityId;
  route: string;                 // '/child/pokemon-lab'
  title: string;
  shortTitle?: string;
  icon: string;                  // react-icons / heroicon name or asset path
  category: ActivityCategory;

  // ── Availability / gating ──────────────────────────────────────────────
  enabled: boolean;              // feature flag; parent/admin can gate
  ageRange?: [number, number];   // soft targeting (e.g. [5, 10])
  requiresApproval?: boolean;    // ties into existing check-page-access / request-page-access

  // ── The five things the registry wires up ───────────────────────────────
  theme: ActivityThemeTokens;    // §2  → re-themes companion + chrome to the activity
  panel: ActivityPanelConfig;    // §1.1 → replaces a PANEL_CONFIGS entry
  contextProvider: ContextProviderRef; // §3 → emits "what's on screen"
  toolRoster: ToolId[];          // §5  → the only tools the agent may call here
  skillCodes?: string[];         // wires completion → mastery/PCG

  // ── Surface component (code-split) ───────────────────────────────────────
  load: () => Promise<{ default: React.ComponentType<ActivitySurfaceProps> }>;
}

export interface ActivitySurfaceProps {
  activity: LearningActivity;
  /** Surfaces report outcomes here; the platform writes mastery + events. */
  onOutcome?: (outcome: ActivityOutcome) => void;
}

/** Normalized result any activity can emit (lesson done, quiz scored, art saved…). */
export interface ActivityOutcome {
  activityId: ActivityId;
  kind: 'completed' | 'progress' | 'attempt' | 'abandoned';
  skillCodes?: string[];
  score?: { correct: number; total: number };
  detail?: Record<string, unknown>;
  at: string; // ISO
}
```

### 1.1 Panel config (supersedes the per-context `PanelConfig` literal)

```ts
export interface ActivityPanelConfig {
  width: number;                 // child default 280 (matches RightPanelContext)
  tabs: Array<{ id: string; label: string; icon?: string }>;
  defaultTab: string;
  /** The unified Tutor Companion owns this tab. If omitted, companion is inline-only. */
  companionTab?: string;         // e.g. 'tutor'
}
```

### 1.2 Registry API

```ts
export interface ActivityRegistry {
  get(id: ActivityId): LearningActivity | undefined;
  byRoute(route: string): LearningActivity | undefined;
  list(filter?: {
    category?: ActivityCategory;
    enabledOnly?: boolean;
    age?: number;
  }): LearningActivity[];
  /** Plugin-style extension so new labs self-register (multi-tenant friendly). */
  register(activity: LearningActivity): void;
}
```

**Why this scales:** new activity = one `register(...)` call. Routing, theming, the
companion, tool-gating, nav, and analytics all derive from the registry — no parallel
edits, no drift, no adult-default fallbacks for `/child/pokemon-lab` etc.

---

## 2. Contract — Activity Theme tokens (overlay over the child base theme)

**Motivation (grounded):** `PokemonLab.tsx` hardcodes an opaque `SURFACE` palette with
the comment *"kept opaque so the Lab reads clearly on top of ANY child theme … without
inheriting its wallpaper."* That is a developer hand-rolling activity theming because
no scoped layer exists. This contract promotes `SURFACE` into a first-class token set.

```ts
/** Subset of ChildTheme['colors'] (src/lib/child-themes.ts) we allow an activity to override. */
export type ChildColorToken =
  | 'primary' | 'primaryHover' | 'primaryActive'
  | 'secondary' | 'secondaryHover'
  | 'accent' | 'accentHover'
  | 'background' | 'backgroundSecondary' | 'backgroundTertiary'
  | 'text' | 'textSecondary' | 'textMuted' | 'textInverse'
  | 'border' | 'borderHover'
  | 'glassBackground' | 'glassBorder';

/**
 * Per-activity theme OVERLAY. All fields optional → inherit the child's base theme.
 * Effective theme = base ChildTheme ⊕ overlay (see §2.1).
 */
export interface ActivityThemeTokens {
  id: string;                    // 'pokemon'
  mode?: 'light' | 'dark';

  /** Override a subset of ChildTheme.colors for the duration of the activity. */
  colors?: Partial<Record<ChildColorToken, string>>;

  /**
   * Opaque "surfaces" the activity draws on — the promoted PokemonLab `SURFACE`.
   * The companion + lesson chrome consume these so they MATCH the activity.
   */
  surface?: {
    panel: string;               // section container        (SURFACE.panel)
    card: string;                // active card              (SURFACE.card)
    cardLocked?: string;         //                          (SURFACE.cardLocked)
    border: string;              //                          (SURFACE.border)
    borderLocked?: string;       //                          (SURFACE.borderLocked)
    title: string;               //                          (SURFACE.title)
    body: string;                //                          (SURFACE.body)
    muted: string;               //                          (SURFACE.muted)
  };

  /** Activity-scoped decoration (overrides childExtras.decorations for this surface). */
  decorations?: {
    emoji?: string[];
    wallpaper?: string;          // background image for the surface
    headerBanner?: { background?: string; pattern?: string; texture?: string };
  };

  /**
   * Labs often want a clean canvas. When true the child's base wallpaper is suppressed
   * — exactly what PokemonLab's `SURFACE` comment achieves by hand today.
   */
  isolateFromBaseWallpaper?: boolean;
}
```

### 2.1 Resolution model + provider extension

```ts
/** Pure merge: activity overlay wins; missing tokens fall back to the child base. */
export function resolveEffectiveTheme(
  base: ChildTheme,
  overlay?: ActivityThemeTokens,
): EffectiveChildTheme; // = base with colors/decorations merged + a `.surface` block

// ChildThemeProvider gains an activity scope (non-breaking — overlay defaults to none):
//   const { setActiveActivity } = useChildTheme();   // called by the layout on route change
//   const { surface, colors } = useEffectiveTheme();  // consumed by companion + surfaces
```

Components stop importing a local `SURFACE` const and read `useEffectiveTheme().surface`.
The chat/companion finally re-themes to the activity in view (e.g. Pokémon palette in
Pokémon Lab) regardless of the child's chosen base theme.

---

## 3. Contract — Context (Frame / Provider / Envelope)

Canonical here; this **supersedes the inline sketches in `AGENT_CONTEXT_HUB.md`**
(that doc stays the architecture narrative and will point here).

```ts
/** A snapshot of what is on screen right now, emitted by the active surface. */
export interface ContextFrame {
  activityId: ActivityId;
  surface: string;               // 'lesson-step' | 'card' | 'quiz-question' | 'passage' | 'artwork'
  title: string;                 // human label powering "Explain this"
  focus: {
    kind: string;                // 'picture-graph' | 'math-card' | 'reading-passage' | 'image'
    text?: string;               // the visible prompt/question/passage (safety-screenable)
    data?: Record<string, unknown>; // structured payload (counts, options, ids…)
  };
  /** What the child can do right now → maps to companion actions + tool roster. */
  affordances?: CompanionIntent[]; // ['hint','check-answer','read-aloud','try-another']
  skillCodes?: string[];
  revision: number;              // monotonic; lets the Hub dedupe/coalesce
  capturedAt: string;            // ISO
}

/** Every surface implements this so the agent always knows the on-screen context. */
export interface ContextProvider {
  id: string;                    // matches LearningActivity.contextProvider
  getFrame(): ContextFrame | null;                       // pull
  subscribe(cb: (frame: ContextFrame) => void): () => void; // push; returns unsubscribe
}

/** Indirection so the registry references a provider by id (instances live at runtime). */
export type ContextProviderRef = string;

/** Budgeted PCG learner-model summary (tier 2). Composed, never raw-dumped. */
export interface LearnerModelSummary {
  childId: string;
  masteryHighlights: Array<{ skillCode: string; level: number }>;
  activeMisconceptions?: string[];
  zpdTargets?: string[];         // skills in the productive-struggle band
  learningStyle?: { pace?: string; modality?: string; readingLevel?: string };
  goals?: string[];
  recentInsights?: string[];     // from Kids Dreaming
  tokenEstimate: number;         // for budgeting
}

/** What the Context Hub composes per turn and hands to the AgentTransport. */
export interface ContextEnvelope {
  childId: string;
  activity: { id: ActivityId; title: string };
  inFocus: ContextFrame | null;  // tier 1 — highest priority, safety-screened
  longForm: LearnerModelSummary; // tier 2 — budgeted PCG summary
  persona: PersonaRef;           // active character/personality (see §4.2)
  toolRoster: ToolDescriptor[];  // §5 — gated for this surface
  budget: { maxTokens: number }; // mirrors .picode/ambient.json priorities
}
```

**Hub responsibility:** compose + budget + safety-screen the envelope. It **prepares
context only** — it never calls the model. The `AgentTransport` (§4.1) runs the loop.

---

## 4. Contract — Tutor Companion + Agent Transport

One component replaces the bespoke helpers (Art Helper, Reading Buddy, Study Buddy…);
those become *configurations* (intents + roster + theme) of the same companion.

```ts
export type CompanionIntent =
  | 'explain-this'   // resolve to inFocus frame and scaffold (never give the answer)
  | 'help' | 'hint'  // hint-ladder step (LEARNING_EXPERIENCE_DESIGN.md)
  | 'try-another'
  | 'read-aloud'
  | 'talk'           // open conversation
  | 'celebrate';     // mastery moment

export interface CompanionProps {
  activity: LearningActivity;
  frame: ContextFrame | null;    // live, from the activity's ContextProvider
  transport: AgentTransport;     // OPEN DECISION §9.1 (GooseMind now ↔ Pi Code later)
}
```

### 4.1 Agent Transport (the swap-point; **OPEN DECISION §9.1**)

```ts
/**
 * Abstracts the agent backend so GooseMind ↔ Pi Code is a config swap, not a rewrite.
 * Implementations:
 *   - GooseMindTransport  → POST /api/child/goosemind/chat   (today)
 *   - PiCodeTransport     → Pi Code CLI loop                  (target; FSD §1.5)
 * Both must call the AI Gateway as a CHILD: Bearer child-safety-key,
 * model minimax-m3, metadata { user_type:'child', content_filter:'strict' }.
 */
export interface AgentTransport {
  send(input: {
    message?: string;
    intent?: CompanionIntent;
    envelope: ContextEnvelope;
  }): AsyncIterable<AgentEvent>;
}

export type AgentEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; toolId: ToolId; args: Record<string, unknown> } // → ToolGate
  | { type: 'safety'; verdict: 'allow' | 'block'; reason?: string }
  | { type: 'done' };
```

### 4.2 Persona reference (personality module = `PCGCharacterContext`)

```ts
/** Persona-as-data. The active character (Buddy / Pusheen / Professor…) per child. */
export interface PersonaRef {
  id: string;                    // 'professor-oak' | 'buddy'
  name: string;
  emoji?: string;
  /** System-prompt fragment / voice; sourced from PCGCharacterContext. */
  voiceProfile?: string;
}
```

---

## 5. Contract — Tool Roster + Tool Gate (FSD harness §4.6)

```ts
export type ToolId = string; // 'check_answer' | 'give_hint' | 'lookup_pokemon' | 'read_aloud' | …

export interface ToolDescriptor {
  id: ToolId;
  title: string;
  input: Record<string, unknown>;   // JSON-schema-ish contract
  gate: {
    safetyTier: 'core' | 'sensitive'; // strict child filter ALWAYS on
    requiresApproval?: boolean;        // routes through existing request-approval
    rateKey?: string;
  };
}

/** Enforced before any tool runs: the agent on activity X may only call X's roster. */
export interface ToolGate {
  authorize(input: {
    activityId: ActivityId;
    toolId: ToolId;
    args: Record<string, unknown>;
    childId: string;
  }): Promise<{ allow: boolean; reason?: string; needsApproval?: boolean }>;
}
```

Each `LearningActivity.toolRoster` is the allow-list; the Gate denies anything off-list
even if the model hallucinates a tool. Tools wrap **existing** surfaces/APIs
(dictionary lookup, pokedex search, TTS, image gen) rather than new capabilities.

---

## 6. Reference mapping — Pokémon Lab as a `LearningActivity`

Concrete entry, using the real values from `PokemonLab.tsx` + `child-themes.ts`:

```ts
export const pokemonLab: LearningActivity = {
  id: 'pokemon-lab',
  route: '/child/pokemon-lab',
  title: 'Pokémon Lab',
  icon: 'AcademicCapIcon',
  category: 'lab',
  enabled: true,
  ageRange: [5, 12],

  theme: {
    id: 'pokemon',
    mode: 'dark',
    colors: {                                   // from pokemonTheme.colors
      primary: '#3b7dd8', secondary: '#ee1515', accent: '#f7d02c',
      background: '#1a1a2e',
    },
    surface: {                                  // ← promoted verbatim from `SURFACE`
      panel: '#16213E', card: '#243B6B', cardLocked: '#1B2A4A',
      border: 'rgba(99,144,240,0.35)', borderLocked: 'rgba(255,255,255,0.08)',
      title: '#FFFFFF', body: '#C9D4F0', muted: '#8B97BC',
    },
    isolateFromBaseWallpaper: true,             // ← what the SURFACE comment does by hand
    decorations: {
      emoji: ['🔴', '⚡', '🔥', '💧', '🌿', '⚔️', '🏆'],
      wallpaper: '/themes/pokemon/Wallpapers/pokeball-pattern.svg',
    },
  },

  panel: {
    width: 280,
    tabs: [
      { id: 'tutor', label: 'Professor', icon: 'FiZap' },     // unified companion
      { id: 'pokedex', label: 'Pokédex', icon: 'FiSearch' },
      { id: 'badges', label: 'Badges', icon: 'FiTrendingUp' },
    ],
    defaultTab: 'tutor',
    companionTab: 'tutor',
  },

  contextProvider: 'pokemon-lab',
  toolRoster: ['check_answer', 'give_hint', 'lookup_pokemon', 'search_pokedex', 'read_aloud', 'celebrate'],
  skillCodes: ['DATA.SORT', 'DATA.PICTOGRAPH', 'MATH.K.CC', 'MATH.1.MD'],

  load: () => import('@/components/child/PokemonLab'),
};
```

### 6.1 The `ContextFrame` Pokémon Lab emits (grounded in `CountAndGraphLesson`)

When the child reaches the picture-graph step of the just-built `CountAndGraphLesson`:

```ts
const frame: ContextFrame = {
  activityId: 'pokemon-lab',
  surface: 'lesson-step',
  title: 'Count & Graph — Picture Graph',
  focus: {
    kind: 'picture-graph',
    text: 'Which group has the MOST Pokémon?',
    data: { counts: { fire: 4, water: 3, grass: 2 }, options: ['Fire', 'Water', 'Grass'] },
  },
  affordances: ['hint', 'check-answer', 'read-aloud', 'try-another'],
  skillCodes: ['DATA.PICTOGRAPH'],
  revision: 7,
  capturedAt: new Date().toISOString(),
};
```

The Pokémon Lab `ContextProvider` derives this from existing state: the routed `lesson`
(`Lesson.id`/`section`), the `LessonStepView` `step` index, and the step's
`QuizQuestion` (`question`, `options`, `answer`). So **"Explain this" works without
giving the answer** — the companion scaffolds ("Let's count the 🟡 dots in each bar…").

### 6.2 A lesson → activity adapter (so monolith decomposition is incremental)

```ts
/** Bridges today's in-file Lesson/LessonView to the registry without a big-bang rewrite. */
export interface LessonModule {
  lessonId: string;                      // PokemonLab LessonId, e.g. 'count-and-graph'
  sectionId: string;
  skillCodes: string[];
  toFrame(state: { step: number; question?: QuizQuestion }): ContextFrame;
  Component: React.ComponentType<{ onComplete: () => void }>; // existing CountAndGraphLesson
}
```

---

## 7. How this wires into existing code (non-breaking seams)

| Existing | Change | Result |
|---|---|---|
| `RightPanelContext.tsx` `PANEL_CONFIGS` + route switch | derive from `registry.byRoute(path)?.panel` | one source of truth; pokemon-lab/learn/teams stop falling back to adult `default` |
| `ChildDashboardLayout.tsx` `childNavItems` + `contextMap` | build from `registry.list({enabledOnly:true})` | nav + context auto-cover every activity |
| `ChildThemeProvider.tsx` | add `activeActivityId` → `resolveEffectiveTheme(base, activity.theme)` | companion + chrome re-theme per activity |
| `PokemonLab.tsx` `const SURFACE` | read `useEffectiveTheme().surface` | the workaround becomes the contract; delete the const |
| bespoke `Child*Panel` helpers | replace incrementally with `<TutorCompanion>` in `companionTab` | one always-present, context-aware agent |
| `/api/child/goosemind/chat` | wrap behind `GooseMindTransport: AgentTransport` | swap to `PiCodeTransport` later with no UI change |

Migration order (matches roadmap Phase 11/12): registry + theme overlay → companion on
**Pokémon Lab** (reference) → roll out to other activities → retire bespoke helpers.

---

## 8. What this explicitly does NOT change yet

- No business logic moves; `kids-pic` services keep working behind adapters.
- No new agent capabilities — tools wrap existing APIs only.
- GooseMind stays the live transport until §9.1 is decided.
- The child's base theme selection (`/api/child/theme`) is unchanged; activity themes
  *overlay* it.

---

## 9. OPEN DECISIONS — RESOLVED (2026-06-21)

### 9.1 Agent transport default — RESOLVED: intent-routed interim
Route the `AgentTransport` seam by **intent**: learning affordances (`explain-this`,
`hint`, `check-answer`) → existing `/api/learn/tutor/turn` (AI-Gateway-backed,
safety-gated, learning-aware); `talk` / free-chat → GooseMind. Both interim behind the
`AgentTransport` interface. Cut to `PiCodeTransport` in Phase 6.

### 9.2 Registry / single-home location — RESOLVED: FSD home
`src/domains/learning/shared/activity-registry.ts` is the single home. `kids-pic`
consumed via adapters. Registry entries live in `domains/learning`; surfaces stay in
`components/child` and are pulled via lazy `load: () => import(...)`.

### 9.3 `ActivityId` source of truth — RESOLVED: both
`type ActivityId = string` for the registry's `register()`, plus a `KNOWN_ACTIVITY_IDS`
const (`as const`) that derives a `KnownActivityId` union for first-party
autocomplete/switch-safety. Multi-tenant friendly without losing type safety.

### 9.4 Is free-chat just another activity? — RESOLVED: yes
Register `/child/chat` as a `free-chat` activity. Resolves the `goosemind/chat` vs
`chat.ts` duplication. Its `ContextFrame.focus.kind` is `'conversation'`.

### 9.5 Persona scope — RESOLVED: keep here
`PersonaRef` stays in this doc (§4.2); maps to existing `PCGCharacterContext`. Defer a
separate persona contract until selection UI is specced.

### 9.6 CIG for kids — RESOLVED: exclude
Children never touch the CIG. No email/calendar tools on child rosters. The `ToolGate`
enforces this by default.

---

## 10. Ratification checklist

- [x] §1 Activity Registry shape approved
- [x] §2 Activity Theme overlay + `surface` tokens approved (promote `PokemonLab.SURFACE`)
- [x] §3 Context Frame/Provider/Envelope approved (and `AGENT_CONTEXT_HUB.md` points here)
- [x] §4 Tutor Companion + `AgentTransport` seam approved
- [x] §5 Tool Roster + Tool Gate approved
- [x] §6 Pokémon Lab reference mapping accepted as the build target
- [x] §9 OPEN DECISIONS resolved (9.1–9.6)
