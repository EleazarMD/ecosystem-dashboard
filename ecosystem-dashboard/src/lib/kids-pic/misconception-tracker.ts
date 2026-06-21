/**
 * Misconception tracker — captures incorrect attempt patterns and surfaces
 * them in later learning plans for targeted review.
 *
 * Phase 3 acceptance: "misconceptions re-surface in later plans."
 *
 * In-memory store for pilot; designed to be backed by Postgres/PCG when
 * available. Keyed by childId + skillCode.
 */

import type { LearnAgeBand } from './phase1-starter-content';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MisconceptionRecord {
  id: string;
  childId: string;
  skillCode: string;
  /** The response the child gave that was incorrect. */
  incorrectResponse: string;
  /** What the correct answer or approach was. */
  correctApproach: string;
  /** Categorization of the misconception type. */
  misconceptionType: MisconceptionType;
  /** When the misconception was captured. */
  capturedAt: string;
  /** Whether it has been addressed in a subsequent plan. */
  addressed: boolean;
  /** Number of times this misconception has re-surfaced. */
  resurfaceCount: number;
}

export type MisconceptionType =
  | 'calculation_error'
  | 'conceptual_gap'
  | 'misread_question'
  | 'wrong_operation'
  | 'incomplete_answer'
  | 'generic';

// ---------------------------------------------------------------------------
// In-memory store (pilot)
// ---------------------------------------------------------------------------

const store = new Map<string, MisconceptionRecord[]>();

function key(childId: string): string {
  return childId;
}

function nextId(): string {
  return `mc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Misconception classification
// ---------------------------------------------------------------------------

export function classifyMisconception(
  incorrectResponse: string,
  correctAnswer: string,
  skillCode: string,
): MisconceptionType {
  const subject = skillCode.split('.')[0];
  const response = incorrectResponse.toLowerCase().trim();
  const correct = correctAnswer.toLowerCase().trim();

  // Math-specific classification
  if (subject === 'math') {
    const responseNum = parseFloat(response);
    const correctNum = parseFloat(correct);

    if (!isNaN(responseNum) && !isNaN(correctNum)) {
      // Check for wrong operation (e.g., added instead of subtracted)
      if (responseNum > correctNum * 2 && correctNum > 0) {
        return 'wrong_operation';
      }
      const diff = Math.abs(responseNum - correctNum);
      if (diff > Math.abs(correctNum) * 0.5) return 'calculation_error';
      return 'calculation_error';
    }
  }

  // Reading-specific classification
  if (subject === 'reading') {
    if (!response.includes(correct.split(' ')[0])) return 'misread_question';
    if (response.length < correct.length * 0.5) return 'incomplete_answer';
  }

  // Generic heuristics
  if (response.length < 3) return 'incomplete_answer';
  return 'conceptual_gap';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function captureMisconception(input: {
  childId: string;
  skillCode: string;
  incorrectResponse: string;
  correctApproach: string;
}): MisconceptionRecord {
  const misconceptionType = classifyMisconception(
    input.incorrectResponse,
    input.correctApproach,
    input.skillCode,
  );

  const existing = store.get(key(input.childId)) || [];

  // Check if there's an unaddressed misconception for the same skill
  const existingIdx = existing.findIndex(
    (m) => m.skillCode === input.skillCode && !m.addressed,
  );

  if (existingIdx >= 0) {
    // Update existing — increment resurface count
    existing[existingIdx] = {
      ...existing[existingIdx],
      resurfaceCount: existing[existingIdx].resurfaceCount + 1,
      capturedAt: new Date().toISOString(),
    };
    store.set(key(input.childId), existing);
    return existing[existingIdx];
  }

  const record: MisconceptionRecord = {
    id: nextId(),
    childId: input.childId,
    skillCode: input.skillCode,
    incorrectResponse: input.incorrectResponse,
    correctApproach: input.correctApproach,
    misconceptionType,
    capturedAt: new Date().toISOString(),
    addressed: false,
    resurfaceCount: 0,
  };

  existing.push(record);
  store.set(key(input.childId), existing);
  return record;
}

export function getMisconceptions(childId: string): MisconceptionRecord[] {
  return store.get(key(childId)) || [];
}

export function getUnaddressedMisconceptions(childId: string): MisconceptionRecord[] {
  return (store.get(key(childId)) || []).filter((m) => !m.addressed);
}

export function getMisconceptionsBySkill(childId: string, skillCode: string): MisconceptionRecord[] {
  return (store.get(key(childId)) || []).filter((m) => m.skillCode === skillCode);
}

/**
 * Get skills that have unaddressed misconceptions, sorted by recency and
 * resurface count. Used by the planner to prioritize review.
 */
export function getSkillsNeedingReview(childId: string): { skillCode: string; priority: number; misconceptionType: MisconceptionType }[] {
  const unaddressed = getUnaddressedMisconceptions(childId);
  const bySkill = new Map<string, MisconceptionRecord[]>();

  for (const m of unaddressed) {
    const list = bySkill.get(m.skillCode) || [];
    list.push(m);
    bySkill.set(m.skillCode, list);
  }

  return Array.from(bySkill.entries())
    .map(([skillCode, records]) => ({
      skillCode,
      priority: records.reduce((sum, r) => sum + 1 + r.resurfaceCount, 0),
      misconceptionType: records[0].misconceptionType,
    }))
    .sort((a, b) => b.priority - a.priority);
}

export function markMisconceptionAddressed(childId: string, skillCode: string): void {
  const existing = store.get(key(childId)) || [];
  const updated = existing.map((m) =>
    m.skillCode === skillCode && !m.addressed
      ? { ...m, addressed: true }
      : m,
  );
  store.set(key(childId), updated);
}

/**
 * Clear all misconceptions for a child (used in tests or reset).
 */
export function clearMisconceptions(childId: string): void {
  store.delete(key(childId));
}

/**
 * Clear all misconceptions (test utility).
 */
export function clearAllMisconceptions(): void {
  store.clear();
}
