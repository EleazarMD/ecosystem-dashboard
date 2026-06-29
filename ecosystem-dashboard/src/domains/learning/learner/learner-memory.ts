/**
 * Learner Memory — persistent conversation memory across sessions.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §4
 *
 * Stores recent turns per session, consolidates into journal entries on
 * session close, and provides recall for the agent loop.
 */

import type { ConversationTurn } from '../shared/agent-loop-types';
import type { JournalEntry, LearnerReflection } from './learner-types';
import { getEventBus } from '../shared/event-bus';
import type { SessionStats } from '../shared/event-bus';

class LearnerMemoryImpl {
  private sessionTurns = new Map<string, ConversationTurn[]>(); // sessionId → turns
  private journals = new Map<string, JournalEntry[]>();         // childId → entries
  private reflections = new Map<string, LearnerReflection[]>(); // childId → reflections
  private maxTurnsPerSession = 50;
  private maxJournalEntries = 30;
  private maxReflections = 50;

  /** Record a conversation turn for the current session. */
  recordTurn(sessionId: string, turn: ConversationTurn): void {
    const turns = this.sessionTurns.get(sessionId) || [];
    turns.push(turn);
    if (turns.length > this.maxTurnsPerSession) {
      turns.shift();
    }
    this.sessionTurns.set(sessionId, turns);
  }

  /** Get recent conversation turns for a session (for agent context). */
  recallTurns(sessionId: string, lastN: number = 8): ConversationTurn[] {
    const turns = this.sessionTurns.get(sessionId) || [];
    return turns.slice(-lastN);
  }

  /** Consolidate a session into a journal entry and emit session.closed. */
  consolidateSession(
    childId: string,
    sessionId: string,
    stats: SessionStats,
    summary: string,
    mood?: string,
  ): JournalEntry {
    const turns = this.sessionTurns.get(sessionId) || [];
    const toolsUsed = turns
      .filter((t) => t.toolsUsed)
      .flatMap((t) => t.toolsUsed!);

    const entry: JournalEntry = {
      sessionId,
      timestamp: Date.now(),
      summary,
      skillsPracticed: stats.skillsPracticed,
      mood,
      toolsUsed: Array.from(new Set(toolsUsed)),
      correctCount: stats.correctCount,
      totalAttempts: stats.totalAttempts,
      bestStreak: stats.bestStreak ?? 0,
    };

    const entries = this.journals.get(childId) || [];
    entries.push(entry);
    if (entries.length > this.maxJournalEntries) {
      entries.shift();
    }
    this.journals.set(childId, entries);

    // Clean up session turns
    this.sessionTurns.delete(sessionId);

    // Emit event
    getEventBus().emit('session.closed', {
      childId,
      sessionId,
      timestamp: Date.now(),
      stats,
    });

    return entry;
  }

  /** Get journal entries for a child (most recent first). */
  getJournal(childId: string, lastN: number = 10): JournalEntry[] {
    const entries = this.journals.get(childId) || [];
    return entries.slice(-lastN).reverse();
  }

  /** Get a brief summary of recent sessions for agent context. */
  getRecentSummary(childId: string): string {
    const entries = this.getJournal(childId, 3);
    if (entries.length === 0) return 'No recent sessions.';
    return entries
      .map(
        (e) =>
          `${e.summary} (${e.correctCount}/${e.totalAttempts} correct, streak ${e.bestStreak})`,
      )
      .join(' | ');
  }

  /** Record a learner reflection (metacognition check-in after a step). */
  recordReflection(reflection: LearnerReflection): void {
    const entries = this.reflections.get(reflection.childId) || [];
    entries.push(reflection);
    if (entries.length > this.maxReflections) {
      entries.shift();
    }
    this.reflections.set(reflection.childId, entries);
  }

  /** Get recent reflections for a child (most recent first). */
  getReflections(childId: string, lastN: number = 10): LearnerReflection[] {
    const entries = this.reflections.get(childId) || [];
    return entries.slice(-lastN).reverse();
  }

  /** Get the most recent reflection for a skill (for tutor warm-up context). */
  getLatestReflectionForSkill(childId: string, skillCode: string): LearnerReflection | undefined {
    const entries = this.reflections.get(childId) || [];
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].skillCode === skillCode) return entries[i];
    }
    return undefined;
  }

  /** Clear all memory for a child (for testing or GDPR). */
  clear(childId: string): void {
    this.journals.delete(childId);
    this.reflections.delete(childId);
    // Also clean up any session turns for this child
    // (sessionId conventionally starts with childId)
    for (const [sid] of Array.from(this.sessionTurns)) {
      if (sid.startsWith(childId)) {
        this.sessionTurns.delete(sid);
      }
    }
  }

  /** Reset all state (for testing). */
  reset(): void {
    this.sessionTurns.clear();
    this.journals.clear();
    this.reflections.clear();
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _instance: LearnerMemoryImpl | null = null;

export function getLearnerMemory(): LearnerMemoryImpl {
  if (!_instance) {
    _instance = new LearnerMemoryImpl();
  }
  return _instance;
}

export function _resetLearnerMemory(): void {
  _instance?.reset();
  _instance = null;
}
