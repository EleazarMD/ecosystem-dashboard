/**
 * Curriculum barrel — imports all lesson packs to register them.
 *
 * To add a new lesson pack:
 * 1. Create `curriculum/lessons/<your-pack>.ts` with Lesson objects.
 * 2. Import it here.
 * 3. That's it — the registry updates automatically.
 */

import './lessons/math-word-problems';
import './lessons/reading-comprehension';

export { lessonRegistry } from './lesson-registry';
export type { LessonStore } from './lesson-store';
export { createInMemoryLessonStore } from './lesson-store';
export type {
  Lesson,
  LessonStep,
  LessonStatus,
  LessonRetirementCriteria,
} from './lesson-types';
export { canTransition, LESSON_TRANSITIONS } from './lesson-types';
export { evaluateLifecycle, assertTransition } from './lesson-lifecycle';
export type { LifecycleDecision } from './lesson-lifecycle';
