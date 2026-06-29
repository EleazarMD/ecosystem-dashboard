/**
 * Lesson Types — curriculum structure and lifecycle states.
 *
 * Contract: docs/MODULAR_ARCHITECTURE.md §2 (Curriculum / Lesson Lifecycle)
 */

export type LessonStatus =
  | 'draft'        // being authored, not visible to learners
  | 'published'    // live, available to learners
  | 'mature'       // well-established, high engagement + success rates
  | 'retired'      // no longer recommended, but accessible via direct link
  | 'archived';    // cold storage, not accessible

export interface LessonStep {
  id: string;
  title: string;
  /** Content for this step — can be text, a prompt, or a content item id. */
  content: string;
  /** Optional hint set for this step. */
  hints?: string[];
  /** Optional interactive element type. */
  interactionType?: 'multiple-choice' | 'free-response' | 'visual' | 'none';
  /** Optional answer key for grading. */
  answerKey?: string;
  /** Skill code exercised by this step. */
  skillCode?: string;
}

export interface LessonRetirementCriteria {
  /** Auto-retire if engagement rate drops below this threshold over the evaluation window. */
  lowEngagementRate?: number;
  /** Auto-retire if success rate drops below this threshold. */
  lowSuccessRate?: number;
  /** Number of days to evaluate. */
  evaluationWindowDays?: number;
  /** Lesson id that supersedes this one. */
  supersededBy?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  skillCodes: string[];
  difficulty: number;            // 1-5, adaptive
  estimatedMinutes: number;
  version: number;               // bumped on content change
  status: LessonStatus;
  steps: LessonStep[];
  prerequisites: string[];       // lesson ids
  maturityThreshold: number;     // avg mastery across cohort to promote to "mature"
  retirementCriteria?: LessonRetirementCriteria;
  publishedAt?: number;          // timestamp (ms epoch)
  retiredAt?: number;
  archiveLocation?: string;
  /** Activity id this lesson belongs to (e.g. 'learn-hub', 'pokemon-lab'). */
  activityId?: string;
  /** Age range this lesson is designed for. */
  ageRange?: [number, number];
  /** Tags for categorization and search. */
  tags?: string[];
}

// ─── Lifecycle transitions ──────────────────────────────────────────────────

export const LESSON_TRANSITIONS: Record<LessonStatus, LessonStatus[]> = {
  draft: ['published'],
  published: ['mature', 'retired'],
  mature: ['retired'],
  retired: ['archived', 'published'],  // can be reactivated
  archived: ['published'],              // can be restored from archive
};

export function canTransition(from: LessonStatus, to: LessonStatus): boolean {
  return LESSON_TRANSITIONS[from]?.includes(to) ?? false;
}
