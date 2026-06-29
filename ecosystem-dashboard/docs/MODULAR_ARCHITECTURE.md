# Kids Dashboard — Modular Agentic Architecture

> Status: PROPOSED — ratify open decisions before implementation.
> Supersedes: ad-hoc growth in `agent-loop.ts` (509 lines), `agent-tools.ts` (407 lines), `learn.tsx` (1706 lines).

## Problem

Current state: the agent loop, tool execution, prompt building, session management,
lesson content, persona, and analytics are all tangled across a few large files.
Adding a persona, retiring a lesson, or wiring a new analytic requires editing 3-5
files with no clean seam. The agent has no persistent memory beyond session scope,
no introspection, no self-recovery, and no way to "dream" (consolidate learning
patterns overnight).

## Design Principles

1. **Single responsibility per module** — each file does one thing, < 200 lines.
2. **Registry pattern** — lessons, personas, tools, and analytics are all
   registry-driven. Adding = one `register()` call. No switch/case, no hardcoded
   lists.
3. **Event bus for decoupling** — modules communicate via typed events, not
   direct imports. The agent loop does not know about analytics; analytics
   subscribes to `turn.complete`.
4. **Pure core, impure shell** — domain logic is pure functions + types. API
   routes, DB calls, and side effects live in the shell layer.
5. **Graceful degradation** — every module has a fallback. AI Gateway down →
   deterministic. Analytics down → skip. Persona missing → default companion.
6. **Child safety is non-negotiable** — every module passes through the Safety
   Lane. No module talks to the AI Gateway without the child-safety key.

## Domain Structure

```
src/domains/learning/
├── shared/              ← contracts, types, registries (already exists)
│   ├── agent-loop-types.ts
│   ├── agent-transport.ts
│   ├── context-hub.ts
│   ├── context-hub-service.ts
│   ├── skill-module.ts
│   ├── tool-roster.ts
│   ├── activity-types.ts
│   └── event-bus.ts          ← NEW: typed pub/sub for cross-module decoupling
│
├── skills/              ← tool implementations (already exists, 13 skills)
│   ├── index.ts
│   ├── ask-socratic.ts
│   ├── celebrate.ts
│   └── ...
│
├── features/            ← use-case orchestration (already exists)
│   ├── agent-loop.ts         ← REFACTOR: slim down to orchestration only
│   ├── agent-tools.ts        ← REFACTOR: split into skill dispatcher
│   ├── tutor-turn.ts
│   └── ...
│
├── processes/           ← async background processes (already exists)
│   ├── session-loop.ts
│   ├── mastery-sync.ts
│   ├── spaced-review.ts
│   └── dream-consolidator.ts ← NEW: overnight memory consolidation
│
├── entities/            ← domain entities (already exists)
│   ├── child-pcg.ts
│   ├── content-catalog.ts
│   ├── session.ts
│   ├── skill-graph.ts
│   └── ...
│
├── curriculum/          ← NEW: lesson lifecycle
│   ├── lesson-registry.ts       ← registry: add, organize, retire, archive
│   ├── lesson-types.ts          ← Lesson, LessonStep, LessonVersion
│   ├── lesson-lifecycle.ts      ← state machine: draft → published → mature → retired
│   ├── lesson-store.ts          ← persistence seam (DB, file, or in-memory)
│   └── lessons/                 ← one file per lesson (or lesson pack)
│       ├── math-word-problems.ts
│       ├── reading-comprehension.ts
│       └── ...
│
├── personas/            ← NEW: character/persona system
│   ├── persona-registry.ts      ← registry: id → PersonaProfile
│   ├── persona-types.ts         ← PersonaProfile, VoiceStyle, PersonalityTraits
│   ├── persona-resolver.ts      ← activity + learner → best persona match
│   └── personas/                ← one file per persona
│       ├── buddy.ts             ← default companion (warm, curious)
│       ├── professor-oak.ts     ← scientific, mentor-like
│       ├── artist-pusheen.ts    ← creative, playful
│       └── ...
│
├── learner/             ← NEW: learner model + memory
│   ├── learner-profile.ts       ← aggregates mastery, preferences, history
│   ├── learner-memory.ts        ← conversation memory + session journal
│   ├── mastery-calculator.ts    ← attempts → mastery score (Bayesian or ELO)
│   ├── adaptation-engine.ts     ← mastery + persona → pacing + difficulty
│   └── learner-events.ts        ← typed events: mastered, struggled, streak
│
├── analytics/           ← NEW: higher-order learning analytics
│   ├── analytics-collector.ts   ← subscribes to events, builds time-series
│   ├── pattern-detector.ts      ← identifies learning patterns + anomalies
│   ├── dream-engine.ts          ← overnight consolidation + insight generation
│   ├── analytics-types.ts       ← LearningSnapshot, Pattern, DreamInsight
│   └── analytics-store.ts       ← persistence seam
│
├── orchestrator/        ← NEW: agent orchestration (stateful, self-recovering)
│   ├── agent-orchestrator.ts    ← top-level: perceives, decides, recovers
│   ├── turn-state-machine.ts    ← per-turn state: perceive → reason → act → reflect
│   ├── recovery-strategies.ts   ← fallback chains: AI → deterministic → static
│   ├── introspection-log.ts     ← agent self-assessment per turn
│   └── budget-manager.ts        ← token/time/hop budgets with escalation
│
└── widgets/             ← UI-facing types (already exists)
    └── index.ts
```

## Module Specifications

### 1. Event Bus (`shared/event-bus.ts`)

The backbone of decoupling. All cross-module communication flows through typed
events. No module imports another module's internals — they subscribe to events.

```typescript
type LearningEvent =
  | { type: 'session.opened'; childId: string; sessionId: string }
  | { type: 'session.closed'; childId: string; sessionId: string; stats: SessionStats }
  | { type: 'attempt.graded'; childId: string; skillCode: string; correct: boolean }
  | { type: 'turn.complete'; childId: string; toolsUsed: string[]; latencyMs: number }
  | { type: 'mastery.changed'; childId: string; skillCode: string; oldMastery: number; newMastery: number }
  | { type: 'lesson.published'; lessonId: string; version: number }
  | { type: 'lesson.retired'; lessonId: string }
  | { type: 'pattern.detected'; childId: string; pattern: LearningPattern }
  | { type: 'dream.consolidated'; childId: string; insights: DreamInsight[] };
```

**Consumers:**
- Analytics collector → `turn.complete`, `attempt.graded`, `mastery.changed`
- Dream engine → `session.closed`, `pattern.detected`
- Adaptation engine → `mastery.changed`, `pattern.detected`
- Lesson lifecycle → `lesson.published`, `lesson.retired`

### 2. Curriculum / Lesson Lifecycle (`curriculum/`)

**Problem solved:** Lessons are currently hardcoded in `phase1-starter-content.ts`
and `PokemonLab.tsx`. No versioning, no retirement, no archival.

**Lesson state machine:**
```
draft → published → mature → retired → archived
           ↑                      ↓
           └─── reactivated ←──────┘
```

**Key types:**
```typescript
interface Lesson {
  id: string;
  title: string;
  skillCodes: string[];
  difficulty: number;          // 1-5, adaptive
  estimatedMinutes: number;
  version: number;             // bumped on content change
  status: LessonStatus;        // draft | published | mature | retired | archived
  steps: LessonStep[];
  prerequisites: string[];     // lesson ids
  maturityThreshold: number;   // avg mastery across cohort to promote to "mature"
  retirementCriteria: {        // auto-retire when met
    lowEngagementRate?: number;  // < 0.3 over 30 days
    lowSuccessRate?: number;     // < 0.4 over 30 days
    supersededBy?: string;       // lesson id that replaces this one
  };
  publishedAt?: Date;
  retiredAt?: Date;
  archiveLocation?: string;     // cold storage path
}

type LessonStatus = 'draft' | 'published' | 'mature' | 'retired' | 'archived';
```

**Registry API:**
```typescript
class LessonRegistry {
  register(lesson: Lesson): void;
  get(id: string): Lesson | undefined;
  published(): Lesson[];        // only published + mature
  forSkill(skillCode: string): Lesson[];
  forDifficulty(level: number, tolerance: number): Lesson[];
  retire(id: string, reason: string): void;
  archive(id: string): void;
  reactivate(id: string): void;
  evaluateMaturity(): void;     // promote published → mature based on cohort data
  evaluateRetirement(): void;   // auto-retire lessons meeting criteria
}
```

**Adding a lesson = one file in `curriculum/lessons/`, one `register()` call.**
No edits to agent loop, tool roster, or UI.

### 3. Persona System (`personas/`)

**Problem solved:** Currently one hardcoded `PersonaRef` per activity in
`builtin-activities.ts`. No voice variation, no personality traits, no
artistic/scientific flavor.

**Key types:**
```typescript
interface PersonaProfile {
  id: string;
  name: string;
  avatar: string;               // emoji or URL
  archetype: PersonaArchetype;  // mentor | explorer | artist | scientist | companion
  voice: VoiceStyle;
  personality: PersonalityTraits;
  systemPrompt: string;         // injected into agent system prompt
  greetingStyle: GreetingStyle;
  celebrationStyle: CelebrationStyle;
  coachingStyle: CoachingStyle;
  themeFlavor?: {               // visual personality
    primaryColor?: string;
    fontAccent?: string;
    iconSet?: string;
  };
  skillAffinities?: string[];   // skill codes this persona excels at
  ageRange?: [number, number];  // optimal age band
}

interface VoiceStyle {
  tone: 'warm' | 'energetic' | 'calm' | 'playful' | 'scholarly';
  vocabulary: 'simple' | 'standard' | 'rich';
  sentenceLength: 'short' | 'medium' | 'varied';
  emojiFrequency: 'none' | 'occasional' | 'frequent';
  catchphrases?: string[];
}

interface PersonalityTraits {
  curiosity: number;            // 0-1
  patience: number;
  enthusiasm: number;
  precision: number;
  playfulness: number;
}

type PersonaArchetype = 'mentor' | 'explorer' | 'artist' | 'scientist' | 'companion';
```

**Resolver:**
```typescript
class PersonaResolver {
  // Activity says "I need a persona for math practice, child is 8"
  // Resolver picks the best match from the registry
  resolve(activityId: string, learner: LearnerProfile): PersonaProfile;
  // Falls back to default "Buddy" persona if no match
}
```

**Adding a persona = one file in `personas/personas/`, one `register()` call.**
The resolver automatically picks the best persona for each activity + learner.

### 4. Learner Profile + Memory (`learner/`)

**Problem solved:** Mastery is scattered across `MasteryContext`, `LearnerModelSummary`,
session state in `learn.tsx`, and PCG service. No persistent conversation memory,
no adaptation engine, no learner events.

**LearnerProfile** aggregates everything we know about a child:
```typescript
interface LearnerProfile {
  childId: string;
  displayName: string;
  ageBand: string;
  interests: string[];
  goals: string[];

  // Mastery (synced from PCG)
  skillMastery: Record<string, number>;

  // Preferences (learned over time)
  preferredPersonaId?: string;
  preferredPacing: 'slow' | 'medium' | 'fast';
  preferredDifficulty: number;  // 1-5, auto-adjusted
  responseToCelebration: 'energized' | 'neutral' | 'shy';  // observed

  // Memory
  recentTopics: string[];
  recentStruggles: string[];
  recentStrengths: string[];

  // Session journal (persisted conversation memory)
  sessionJournal: JournalEntry[];
}

interface JournalEntry {
  sessionId: string;
  timestamp: number;
  summary: string;              // 1-2 sentence recap
  skillsPracticed: string[];
  mood?: string;                // observed from language
  toolsUsed: string[];
}
```

**MasteryCalculator:** Converts raw attempt data into mastery scores.
- Input: attempts over time for a skill
- Output: mastery 0-1 (Bayesian update or ELO-style)
- Emits `mastery.changed` events when score shifts significantly

**AdaptationEngine:** Reads mastery + persona + preferences → produces:
```typescript
interface AdaptationPlan {
  pacing: 'slow' | 'medium' | 'fast';
  difficulty: number;           // 1-5
  hintEscalationSpeed: 'immediate' | 'normal' | 'delayed';
  celebrationIntensity: 'subtle' | 'normal' | 'exuberant';
  stretchChallengeProbability: number;  // 0-1
  recommendedNextSkills: string[];
}
```

**LearnerMemory:** Persistent conversation memory across sessions.
- Stores last N turns per session
- Consolidates into journal entries on session close
- Emits `session.closed` event with journal entry attached

### 5. Analytics + Dreams (`analytics/`)

**Problem solved:** No analytics beyond basic correctCount/streak. No pattern
detection. No overnight consolidation. No "dreaming" (the agent reflecting on
what it learned about the learner).

**AnalyticsCollector:** Subscribes to events, builds time-series snapshots.
```typescript
interface LearningSnapshot {
  childId: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalAttempts: number;
  correctRate: number;
  averageLatencyMs: number;
  skillsTouched: string[];
  masteryDeltas: Record<string, number>;  // how much each skill improved
  engagementScore: number;                // time × attempts × completion
  toolUsage: Record<string, number>;
}
```

**PatternDetector:** Identifies recurring patterns in learning data.
```typescript
interface LearningPattern {
  childId: string;
  type: PatternType;
  confidence: number;
  description: string;
  evidence: Record<string, unknown>;
  detectedAt: Date;
}

type PatternType =
  | 'time_preference'        // learns best at certain hours
  | 'skill_cluster'          // strengths in related skills
  | 'struggle_pattern'       // consistent difficulty with a concept
  | 'engagement_cycle'       // engagement waxes/wanes on a cycle
  | 'tool_preference'        // prefers certain tools/activities
  | 'mastery_plateau'        // stuck at a mastery level
  | 'breakthrough_signal';   // sudden improvement after struggle
```

**DreamEngine:** The "self-learning loop for user and agent."
Runs as a background process (cron, or on `session.closed` after N sessions).
1. Collects recent snapshots + patterns for a child
2. Asks the AI Gateway to synthesize insights (with child-safety key)
3. Generates `DreamInsight` objects
4. Feeds insights back into the AdaptationEngine and LessonRegistry

```typescript
interface DreamInsight {
  childId: string;
  insight: string;              // human-readable, e.g. "Luca struggles with
                               // subtraction when regrouping is needed"
  actionable: boolean;
  suggestedActions: string[];   // e.g. ["increase hint escalation for math.sub_regrouping"]
  confidence: number;
  consolidatedAt: Date;
}
```

The dream engine is the **closed loop**: learner data → patterns → insights →
adaptation → better learner outcomes → new data → new patterns.

### 6. Agent Orchestrator (`orchestrator/`)

**Problem solved:** `agent-loop.ts` is 509 lines doing perception, reasoning,
tool execution, fallback, and budget management all in one function. No
introspection, no self-recovery beyond a single deterministic fallback, no
budget escalation.

**AgentOrchestrator** — top-level coordinator:
```typescript
class AgentOrchestrator {
  // Called per turn. Coordinates all modules.
  async runTurn(input: TurnInput): Promise<TurnResult>;

  // Stateful: tracks session-level state across turns
  private turnHistory: TurnRecord[];
  private budget: BudgetManager;
  private stateMachine: TurnStateMachine;
}
```

**TurnStateMachine** — per-turn lifecycle:
```
perceive → reason → plan → act → observe → reflect → (loop or done)
                ↓                          ↓
            recover                     introspect
```

Each state is a pure function:
- `perceive(input, context)`: gather all context (learner profile, mastery, persona, focus)
- `reason(state)`: ask AI Gateway for next action
- `plan(state, aiResponse)`: validate + prepare tool call
- `act(plan, tools)`: execute gated tool
- `observe(result)`: capture tool output + safety result
- `reflect(trajectory)`: self-assess — did we help? should we loop?
- `recover(error)`: escalation chain (see below)

**RecoveryStrategies** — graceful degradation chain:
```
1. AI Gateway available → use agent loop (normal path)
2. AI Gateway timeout → retry once with shorter prompt
3. AI Gateway down → deterministic fallback (hint-based coaching)
4. Deterministic fails → static encouragement message
5. Everything fails → "I'm having trouble right now. Try again in a moment."
```

Each recovery strategy is a separate function, composable via chain.

**IntrospectionLog** — agent self-assessment per turn:
```typescript
interface IntrospectionEntry {
  turnId: string;
  timestamp: number;
  selfAssessment: {
    didIHelp: boolean;
    wasIClear: boolean;
    wasIConcise: boolean;
    stayedInBounds: boolean;     // didn't reveal answer, stayed Socratic
  };
  toolsUsed: string[];
  hopsTaken: number;
  budgetUsed: number;
  learnerEngagement: 'high' | 'medium' | 'low';  // inferred from response
  notes?: string;
}
```

The introspection log feeds back into the DreamEngine for agent self-improvement.

**BudgetManager** — token/time/hop budgets with escalation:
```typescript
class BudgetManager {
  // Per-turn budgets
  maxHops: number;              // default 3, can escalate to 5
  maxTokens: number;            // per AI Gateway call
  maxLatencyMs: number;         // total turn time budget

  // Escalation: if first hop fails, allow more hops
  escalate(): void;
  remaining(): { hops: number; tokens: number; latencyMs: number };
  exhausted(): boolean;
}
```

## Interplay Diagram

```
                    ┌────────────────────────────────────────────────┐
                    │                  Event Bus                      │
                    │  (session.opened, attempt.graded, turn.complete,│
                    │   mastery.changed, pattern.detected, dream.done)│
                    └───────────────────────┬────────────────────────┘
                                            │
          ┌─────────────────────────────────┼─────────────────────────┐
          │                                 │                         │
          ▼                                 ▼                         ▼
  ┌──────────────┐              ┌──────────────────┐        ┌────────────────┐
  │  Analytics   │              │  Adaptation      │        │  Dream Engine  │
  │  Collector   │              │  Engine          │        │  (overnight)   │
  │  (snapshots) │              │  (pacing/diff)   │        │  (insights)    │
  └──────┬───────┘              └────────┬─────────┘        └───────┬────────┘
         │                               │                          │
         ▼                               ▼                          ▼
  ┌──────────────┐              ┌──────────────────┐        ┌────────────────┐
  │  Pattern     │              │  Learner         │        │  Lesson        │
  │  Detector    │─────────────▶│  Profile +       │◀───────│  Registry      │
  │  (patterns)  │              │  Memory          │        │  (lifecycle)   │
  └──────────────┘              └────────┬─────────┘        └────────────────┘
                                         │
                                         ▼
                               ┌──────────────────┐
                               │  Persona         │
                               │  Resolver        │
                               │  (voice/style)   │
                               └────────┬─────────┘
                                        │
                                        ▼
              ┌─────────────────────────────────────────────┐
              │          Agent Orchestrator                  │
              │  (perceive → reason → plan → act → reflect)  │
              │  + Recovery + Introspection + Budget         │
              └────────────────────┬────────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Skill Registry  │
                          │  (13+ tools)     │
                          │  + Tool Gate     │
                          └──────────────────┘
```

## Data Flow: One Turn

1. **Client** fires `POST /api/learn/tutor/turn` with `sessionPhase`, `conversationHistory`, `mastery`
2. **API route** validates, fetches PCG context, resolves persona via `PersonaResolver`
3. **AgentOrchestrator.runTurn()** is called with all context
4. **Perceive**: orchestrator reads `LearnerProfile` (mastery, memory, preferences), `AdaptationPlan` (pacing, difficulty), `PersonaProfile` (voice, style), `ContextEnvelope` (focus frame)
5. **Reason**: orchestrator calls AI Gateway with composed prompt (persona voice + mastery context + conversation history + session phase guidance)
6. **Plan**: AI returns tool selection → validated by Tool Gate
7. **Act**: Skill dispatched via `skillRegistry.execute()` → tool runs (e.g., `ask_socratic`)
8. **Observe**: tool output captured, safety-filtered
9. **Reflect**: orchestrator self-assesses (introspection log), decides if another hop is needed
10. **Loop or done**: if `final_answer`, compose final message with persona voice; if budget exhausted, run recovery strategy
11. **Emit**: `turn.complete` event published to Event Bus
12. **Analytics** collector captures the event → updates snapshots
13. **PatternDetector** checks for new patterns → emits `pattern.detected` if found
14. **AdaptationEngine** adjusts pacing/difficulty for next turn
15. **Response** returned to client with tutor message + harness metadata

## Data Flow: Overnight Dream

1. **DreamEngine** wakes (cron or `session.closed` after N sessions)
2. Collects recent `LearningSnapshot`s + `LearningPattern`s for a child
3. Composes a "dream prompt": "Here is what Luca did this week. What patterns do you see? What should we adjust?"
4. Calls AI Gateway (child-safety key, strict filter) with the dream prompt
5. Parses AI response into `DreamInsight[]`
6. Emits `dream.consolidated` event
7. **AdaptationEngine** receives insights → adjusts `AdaptationPlan` for next session
8. **LessonRegistry** receives insights → may auto-retire underperforming lessons or promote mature ones
9. **LearnerProfile** updated with consolidated memory (journal entries compressed)

## Migration Path

This is designed as an **incremental migration**, not a rewrite:

1. **Phase 1**: Create the new directories + type files. No behavior change.
2. **Phase 2**: Implement Event Bus. Wire existing events (session.opened, attempt.graded) as emission points. Existing code still works.
3. **Phase 3**: Extract prompt builders from `agent-loop.ts` into `orchestrator/`. Agent loop becomes a thin caller.
4. **Phase 4**: Implement Persona registry. Replace hardcoded `PersonaRef` in `builtin-activities.ts` with registry lookups.
5. **Phase 5**: Implement Lesson registry. Move `phase1-starter-content.ts` lessons into `curriculum/lessons/`.
6. **Phase 6**: Implement Learner Profile + Memory. Wire `mastery` and `conversationHistory` through `LearnerProfile` instead of ad-hoc client state.
7. **Phase 7**: Implement Analytics + Pattern Detector. Subscribe to existing events.
8. **Phase 8**: Implement Dream Engine. Start with simple consolidation, add AI-powered insights later.
9. **Phase 9**: Implement full Orchestrator with recovery + introspection. Replace `runAgentLoop()` with `AgentOrchestrator.runTurn()`.

Each phase is independently shippable. No phase breaks existing tests.

## Open Decisions

1. **Event Bus implementation**: Use a simple in-process EventEmitter, or a more robust solution (e.g., Redis pub/sub for multi-process)? → Start in-process, add Redis when needed.

2. **Dream Engine scheduling**: Cron job, or triggered by `session.closed` after N sessions per child? → Start with trigger-based, add cron for batch processing.

3. **Lesson store**: Database table, file-based, or hybrid? → Start with file-based (like current `phase1-starter-content.ts`), add DB when lesson count > 50.

4. **Mastery calculation algorithm**: Bayesian, ELO, or simple rolling average? → Start with exponential moving average (simple, no dependencies), upgrade to Bayesian when we have enough data.

5. **Persona resolution**: Static mapping (activity → persona), or dynamic (activity + learner traits → persona)? → Start with static, add dynamic when we have learner preference data.

6. **Introspection storage**: In-memory (lost on restart), or persisted? → Start with in-memory + log to console, persist when analytics store is ready.

7. **Budget escalation**: Fixed per-turn, or adaptive based on session phase? → Start with fixed, add adaptive when we have latency benchmarks.
