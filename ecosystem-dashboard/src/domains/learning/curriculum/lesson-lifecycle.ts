/**
 * Lesson Lifecycle — state machine helpers for lesson status transitions.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §2
 */

import type { Lesson, LessonStatus } from './lesson-types';
import { canTransition } from './lesson-types';

export interface LifecycleDecision {
  from: LessonStatus;
  to: LessonStatus;
  reason: string;
  timestamp: number;
}

export function evaluateLifecycle(
  lesson: Lesson,
  signals: {
    cohortMastery?: number;
    engagementRate?: number;
    successRate?: number;
    supersededBy?: string;
  },
): LifecycleDecision | null {
  const { status, retirementCriteria, maturityThreshold } = lesson;

  // Check retirement first (higher priority)
  if (status === 'published' || status === 'mature') {
    if (retirementCriteria) {
      if (
        retirementCriteria.lowEngagementRate !== undefined &&
        signals.engagementRate !== undefined &&
        signals.engagementRate < retirementCriteria.lowEngagementRate
      ) {
        return {
          from: status,
          to: 'retired',
          reason: `Engagement rate ${signals.engagementRate.toFixed(2)} below threshold ${retirementCriteria.lowEngagementRate}`,
          timestamp: Date.now(),
        };
      }
      if (
        retirementCriteria.lowSuccessRate !== undefined &&
        signals.successRate !== undefined &&
        signals.successRate < retirementCriteria.lowSuccessRate
      ) {
        return {
          from: status,
          to: 'retired',
          reason: `Success rate ${signals.successRate.toFixed(2)} below threshold ${retirementCriteria.lowSuccessRate}`,
          timestamp: Date.now(),
        };
      }
      if (signals.supersededBy && retirementCriteria.supersededBy === signals.supersededBy) {
        return {
          from: status,
          to: 'retired',
          reason: `Superseded by ${signals.supersededBy}`,
          timestamp: Date.now(),
        };
      }
    }
  }

  // Check maturity promotion
  if (status === 'published' && signals.cohortMastery !== undefined) {
    if (signals.cohortMastery >= maturityThreshold) {
      return {
        from: 'published',
        to: 'mature',
        reason: `Cohort mastery ${signals.cohortMastery.toFixed(2)} reached threshold ${maturityThreshold}`,
        timestamp: Date.now(),
      };
    }
  }

  return null;
}

export function assertTransition(lesson: Lesson, to: LessonStatus): void {
  if (!canTransition(lesson.status, to)) {
    throw new Error(
      `Invalid lesson transition: "${lesson.id}" cannot go from ${lesson.status} → ${to}`,
    );
  }
}
