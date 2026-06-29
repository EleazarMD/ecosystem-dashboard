/**
 * Reading Comprehension — starter lesson pack.
 */

import { lessonRegistry } from '../lesson-registry';
import type { Lesson } from '../lesson-types';

const readingComprehension1: Lesson = {
  id: 'reading.comprehension_1.v1',
  title: 'Reading Comprehension: Level 1',
  description: 'Read a short passage and answer questions about it.',
  skillCodes: ['reading.comprehension', 'reading.detail'],
  difficulty: 2,
  estimatedMinutes: 12,
  version: 1,
  status: 'published',
  activityId: 'learn-hub',
  ageRange: [6, 9],
  tags: ['reading', 'comprehension'],
  maturityThreshold: 0.8,
  prerequisites: [],
  publishedAt: Date.now(),
  steps: [
    {
      id: 'step-1',
      title: 'Read the Story',
      content: 'Sara went to the park with her dog, Max. Max chased a ball and barked happily. Then they sat under a tree and shared a snack.',
      interactionType: 'none',
      skillCode: 'reading.comprehension',
    },
    {
      id: 'step-2',
      title: 'Who went to the park?',
      content: 'Who went to the park with their dog?',
      hints: ['Look at the first sentence.'],
      interactionType: 'free-response',
      answerKey: 'sara',
      skillCode: 'reading.detail',
    },
    {
      id: 'step-3',
      title: 'What did Max do?',
      content: 'What did Max chase at the park?',
      hints: ['Look for what Max did after they arrived.'],
      interactionType: 'free-response',
      answerKey: 'ball',
      skillCode: 'reading.detail',
    },
  ],
};

lessonRegistry.register(readingComprehension1);
