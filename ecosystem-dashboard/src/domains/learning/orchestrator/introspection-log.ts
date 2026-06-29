/**
 * Introspection Log — agent self-assessment per turn.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §6
 *
 * After each turn, the agent rates itself on:
 * - didIHelp: did the response move the learner forward?
 * - wasIClear: was the guidance understandable?
 * - wasIConcise: did I stay under 80 words?
 * - stayedInBounds: did I avoid revealing the answer?
 *
 * This feeds back into the DreamEngine for agent self-improvement.
 */

export interface IntrospectionEntry {
  turnId: string;
  childId: string;
  timestamp: number;
  selfAssessment: {
    didIHelp: boolean;
    wasIClear: boolean;
    wasIConcise: boolean;
    stayedInBounds: boolean;
  };
  toolsUsed: string[];
  hopsTaken: number;
  budgetUsed: number;          // 0-1 fraction of budget
  learnerEngagement: 'high' | 'medium' | 'low';
  source: string;
  notes?: string;
}

class IntrospectionLogImpl {
  private entries = new Map<string, IntrospectionEntry[]>();
  private maxEntries = 50;

  /** Record an introspection entry for a turn. */
  record(entry: IntrospectionEntry): void {
    const entries = this.entries.get(entry.childId) || [];
    entries.push(entry);
    if (entries.length > this.maxEntries) entries.shift();
    this.entries.set(entry.childId, entries);
  }

  /** Get recent introspection entries for a child. */
  getEntries(childId: string, lastN: number = 10): IntrospectionEntry[] {
    const entries = this.entries.get(childId) || [];
    return entries.slice(-lastN);
  }

  /** Compute aggregate self-assessment scores. */
  getAggregate(childId: string): {
    totalTurns: number;
    helpRate: number;
    clarityRate: number;
    concisenessRate: number;
    inBoundsRate: number;
    avgHops: number;
    avgBudgetUsed: number;
  } {
    const entries = this.getEntries(childId, 50);
    if (entries.length === 0) {
      return {
        totalTurns: 0,
        helpRate: 0,
        clarityRate: 0,
        concisenessRate: 0,
        inBoundsRate: 0,
        avgHops: 0,
        avgBudgetUsed: 0,
      };
    }

    return {
      totalTurns: entries.length,
      helpRate: entries.filter((e) => e.selfAssessment.didIHelp).length / entries.length,
      clarityRate: entries.filter((e) => e.selfAssessment.wasIClear).length / entries.length,
      concisenessRate: entries.filter((e) => e.selfAssessment.wasIConcise).length / entries.length,
      inBoundsRate: entries.filter((e) => e.selfAssessment.stayedInBounds).length / entries.length,
      avgHops: entries.reduce((s, e) => s + e.hopsTaken, 0) / entries.length,
      avgBudgetUsed: entries.reduce((s, e) => s + e.budgetUsed, 0) / entries.length,
    };
  }

  reset(): void {
    this.entries.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: IntrospectionLogImpl | null = null;

export function getIntrospectionLog(): IntrospectionLogImpl {
  if (!_instance) {
    _instance = new IntrospectionLogImpl();
  }
  return _instance;
}

export function _resetIntrospectionLog(): void {
  _instance?.reset();
  _instance = null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Auto-assess a turn based on observable signals. */
export function autoAssess(params: {
  message: string;
  source: string;
  hopsTaken: number;
  maxHops: number;
  toolsUsed: string[];
  contentPrompt: string;
}): IntrospectionEntry['selfAssessment'] {
  const { message, source, hopsTaken, maxHops } = params;

  return {
    didIHelp: source === 'agent_loop' && message.length > 20,
    wasIClear: message.length > 10 && message.length < 500,
    wasIConcise: message.split(/\s+/).length <= 80,
    stayedInBounds: !params.contentPrompt ||
      !message.toLowerCase().includes(params.contentPrompt.toLowerCase().split('=')[0]?.trim() || '__NO_MATCH__'),
  };
}
