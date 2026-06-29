/**
 * Lesson Registry — central registry for all lessons with lifecycle management.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §2
 *
 * Adding a lesson = create one file in `curriculum/lessons/`, export a Lesson,
 * and call `lessonRegistry.register(...)`.
 */

import type { Lesson, LessonStatus } from './lesson-types';
import { canTransition } from './lesson-types';
import { getEventBus } from '../shared/event-bus';

class LessonRegistryImpl {
  private lessons = new Map<string, Lesson>();
  private versions = new Map<string, number>(); // id → latest version seen

  register(lesson: Lesson): void {
    const existing = this.lessons.get(lesson.id);
    if (existing && existing.version >= lesson.version) {
      console.warn(
        `[LessonRegistry] Ignoring older version of "${lesson.id}" ` +
        `(existing v${existing.version}, new v${lesson.version})`,
      );
      return;
    }

    this.lessons.set(lesson.id, lesson);
    this.versions.set(lesson.id, lesson.version);

    if (lesson.status === 'published' && !existing) {
      getEventBus().emit('lesson.published', {
        lessonId: lesson.id,
        version: lesson.version,
        timestamp: Date.now(),
      });
    }
  }

  get(id: string): Lesson | undefined {
    return this.lessons.get(id);
  }

  all(): Lesson[] {
    return Array.from(this.lessons.values());
  }

  /** Only published and mature lessons are shown to learners. */
  published(): Lesson[] {
    return this.all().filter(
      (l) => l.status === 'published' || l.status === 'mature',
    );
  }

  bySkill(skillCode: string): Lesson[] {
    return this.published().filter((l) => l.skillCodes.includes(skillCode));
  }

  byActivity(activityId: string): Lesson[] {
    return this.published().filter((l) => l.activityId === activityId);
  }

  byDifficulty(level: number, tolerance: number = 1): Lesson[] {
    return this.published().filter(
      (l) => Math.abs(l.difficulty - level) <= tolerance,
    );
  }

  byTag(tag: string): Lesson[] {
    return this.published().filter((l) => l.tags?.includes(tag));
  }

  byStatus(status: LessonStatus): Lesson[] {
    return this.all().filter((l) => l.status === status);
  }

  /** Transition a lesson to a new lifecycle state. */
  transition(id: string, to: LessonStatus, reason?: string): boolean {
    const lesson = this.lessons.get(id);
    if (!lesson) return false;

    if (!canTransition(lesson.status, to)) {
      console.warn(
        `[LessonRegistry] Invalid transition: ${lesson.status} → ${to} for "${id}"`,
      );
      return false;
    }

    const updated: Lesson = {
      ...lesson,
      status: to,
      publishedAt: to === 'published' ? Date.now() : lesson.publishedAt,
      retiredAt: to === 'retired' ? Date.now() : lesson.retiredAt,
    };

    this.lessons.set(id, updated);

    if (to === 'retired') {
      getEventBus().emit('lesson.retired', {
        lessonId: id,
        reason: reason || 'manual retirement',
        timestamp: Date.now(),
      });
    }

    if (to === 'published' && lesson.status !== 'draft') {
      getEventBus().emit('lesson.published', {
        lessonId: id,
        version: lesson.version,
        timestamp: Date.now(),
      });
    }

    return true;
  }

  retire(id: string, reason: string): boolean {
    return this.transition(id, 'retired', reason);
  }

  archive(id: string): boolean {
    return this.transition(id, 'archived');
  }

  reactivate(id: string): boolean {
    return this.transition(id, 'published');
  }

  promoteToMature(id: string): boolean {
    return this.transition(id, 'mature');
  }

  /**
   * Evaluate all published lessons for maturity promotion.
   * A lesson is promoted to "mature" when its cohort average mastery
   * exceeds the maturityThreshold.
   *
   * @param cohortMastery Map of lessonId → average mastery across cohort
   */
  evaluateMaturity(cohortMastery: Map<string, number>): string[] {
    const promoted: string[] = [];
    for (const lesson of this.all()) {
      if (lesson.status !== 'published') continue;
      const avgMastery = cohortMastery.get(lesson.id);
      if (avgMastery !== undefined && avgMastery >= lesson.maturityThreshold) {
        if (this.promoteToMature(lesson.id)) {
          promoted.push(lesson.id);
        }
      }
    }
    return promoted;
  }

  /**
   * Evaluate all published/mature lessons for retirement.
   * Auto-retires lessons meeting their retirementCriteria.
   *
   * @param metrics Map of lessonId → { engagementRate, successRate }
   */
  evaluateRetirement(
    metrics: Map<string, { engagementRate: number; successRate: number }>,
  ): string[] {
    const retired: string[] = [];
    for (const lesson of this.all()) {
      if (lesson.status !== 'published' && lesson.status !== 'mature') continue;
      const criteria = lesson.retirementCriteria;
      if (!criteria) continue;

      const m = metrics.get(lesson.id);
      if (!m) continue;

      let shouldRetire = false;
      if (criteria.lowEngagementRate !== undefined && m.engagementRate < criteria.lowEngagementRate) {
        shouldRetire = true;
      }
      if (criteria.lowSuccessRate !== undefined && m.successRate < criteria.lowSuccessRate) {
        shouldRetire = true;
      }

      if (shouldRetire) {
        const reason = criteria.supersededBy
          ? `Superseded by ${criteria.supersededBy}`
          : 'Low engagement/success rate';
        if (this.retire(lesson.id, reason)) {
          retired.push(lesson.id);
        }
      }
    }
    return retired;
  }
}

export const lessonRegistry = new LessonRegistryImpl();
