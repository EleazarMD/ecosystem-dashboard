/**
 * Event Bus — typed pub/sub for cross-module decoupling.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §1 (Event Bus)
 *
 * All cross-module communication flows through typed events. No module imports
 * another module's internals — they subscribe to events.
 *
 * HARD RULE: The bus is in-process only. No persistence, no replay. If a
 * subscriber is not registered when an event fires, it misses it. This is
 * intentional — modules must be self-contained and idempotent.
 */

// ─── Event types ────────────────────────────────────────────────────────────

export interface SessionStats {
  correctCount: number;
  totalAttempts: number;
  bestStreak: number;
  durationSeconds: number;
  skillsPracticed: string[];
}

export interface LearningEventMap {
  'session.opened': { childId: string; sessionId: string; timestamp: number };
  'session.closed': {
    childId: string;
    sessionId: string;
    timestamp: number;
    stats: SessionStats;
  };
  'attempt.graded': {
    childId: string;
    contentItemId: string;
    skillCode: string;
    correct: boolean;
    attemptNumber: number;
    timestamp: number;
  };
  'turn.complete': {
    childId: string;
    sessionId?: string;
    toolsUsed: string[];
    hopsExecuted: number;
    latencyMs: number;
    source: 'agent_loop' | 'fallback_deterministic' | 'recovery';
    timestamp: number;
  };
  'mastery.changed': {
    childId: string;
    skillCode: string;
    oldMastery: number;
    newMastery: number;
    timestamp: number;
  };
  'lesson.published': { lessonId: string; version: number; timestamp: number };
  'lesson.retired': { lessonId: string; reason: string; timestamp: number };
  'pattern.detected': {
    childId: string;
    patternType: string;
    description: string;
    confidence: number;
    timestamp: number;
  };
  'dream.consolidated': {
    childId: string;
    insightCount: number;
    insights: Array<{ insight: string; confidence: number }>;
    timestamp: number;
  };
  'tool.approval.requested': {
    requestId: string;
    childId: string;
    toolId: string;
    summary: string;
  };
  'tool.approval.decided': {
    requestId: string;
    childId: string;
    toolId: string;
    status: 'approved' | 'denied';
  };
}

export type LearningEvent = {
  [K in keyof LearningEventMap]: { type: K; payload: LearningEventMap[K] };
}[keyof LearningEventMap];

export type EventHandler<E = LearningEvent> = (event: E) => void | Promise<void>;

// Helper type: the concrete event shape for a given key
type EventFor<K extends keyof LearningEventMap> = { type: K; payload: LearningEventMap[K] };

// ─── Event Bus implementation ───────────────────────────────────────────────

type HandlerSet = Set<EventHandler<any>>;

class EventBusImpl {
  private handlers = new Map<string, HandlerSet>();
  private history: LearningEvent[] = [];
  private maxHistory = 100;

  on<K extends keyof LearningEventMap>(
    eventType: K,
    handler: EventHandler<EventFor<K>>,
  ): () => void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler as EventHandler<any>);
    return () => {
      set?.delete(handler as EventHandler<any>);
    };
  }

  emit<K extends keyof LearningEventMap>(eventType: K, payload: LearningEventMap[K]): void {
    const event = { type: eventType, payload } as unknown as LearningEvent;
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    const set = this.handlers.get(eventType);
    if (!set) return;

    for (const handler of Array.from(set)) {
      try {
        void handler(event);
      } catch (err) {
        console.warn(`[EventBus] handler error for "${eventType}":`, err);
      }
    }
  }

  /** Get recent events (for debugging / introspection). */
  recent(filter?: string): LearningEvent[] {
    return filter
      ? this.history.filter((e) => e.type === filter)
      : [...this.history];
  }

  /** Clear all handlers + history (for testing). */
  reset(): void {
    this.handlers.clear();
    this.history = [];
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: EventBusImpl | null = null;

export function getEventBus(): EventBusImpl {
  if (!_instance) {
    _instance = new EventBusImpl();
  }
  return _instance;
}

export function _resetEventBus(): void {
  _instance?.reset();
  _instance = null;
}
