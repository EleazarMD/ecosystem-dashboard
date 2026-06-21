/**
 * Content catalog entity — content item types, query shapes, and grading
 * result types for the learning domain.
 *
 * Re-exports from:
 * - phase1-starter-content.ts (LearnContentItem, LearnAgeBand, etc.)
 * - LearningPhase1Service.ts (LearnContentQuery, GradeAttemptInput/Result)
 */
export type {
  LearnAgeBand,
  LearnContentType,
  LearnReviewStatus,
  LearnSafetyStatus,
  DeterministicAnswerKey,
  LearnContentItem,
} from '@/lib/kids-pic/phase1-starter-content';

export type {
  LearnContentQuery,
  GradeAttemptInput,
  GradeAttemptResult,
} from '@/lib/kids-pic/LearningPhase1Service';
