/**
 * Math Word Problems — starter lesson pack.
 *
 * Registers basic 1-step and 2-step word problem lessons.
 */

import { lessonRegistry } from '../lesson-registry';
import type { Lesson } from '../lesson-types';

const mathWord1Step: Lesson = {
  id: 'math.word_1step.v1',
  title: 'One-Step Word Problems',
  description: 'Solve simple word problems with addition and subtraction.',
  skillCodes: ['math.word_1step', 'math.add', 'math.sub'],
  difficulty: 2,
  estimatedMinutes: 10,
  version: 1,
  status: 'published',
  activityId: 'learn-hub',
  ageRange: [6, 9],
  tags: ['math', 'word-problems', 'addition', 'subtraction'],
  maturityThreshold: 0.75,
  retirementCriteria: {
    lowEngagementRate: 0.2,
    lowSuccessRate: 0.3,
    evaluationWindowDays: 30,
  },
  prerequisites: [],
  publishedAt: Date.now(),
  steps: [
    {
      id: 'step-1',
      title: 'Read the Problem',
      content: 'Mia has 4 apples and gets 5 more. How many apples does she have?',
      hints: [
        'Start with the number Mia had first.',
        'Now count on 5 more from that starting number.',
        'You can also do 4 + 5.',
      ],
      interactionType: 'free-response',
      answerKey: '9',
      skillCode: 'math.word_1step',
    },
    {
      id: 'step-2',
      title: 'Try Another',
      content: 'Tom had 10 cookies. He ate 3. How many are left?',
      hints: [
        'Start with what Tom had.',
        'Subtract what he ate.',
        '10 - 3 = ?',
      ],
      interactionType: 'free-response',
      answerKey: '7',
      skillCode: 'math.word_1step',
    },
  ],
};

lessonRegistry.register(mathWord1Step);

const mathWord2Step: Lesson = {
  id: 'math.word_2step.v1',
  title: 'Two-Step Word Problems',
  description: 'Solve word problems that need two operations.',
  skillCodes: ['math.word_2step', 'math.add', 'math.sub', 'math.multiply'],
  difficulty: 3,
  estimatedMinutes: 15,
  version: 1,
  status: 'published',
  activityId: 'learn-hub',
  ageRange: [8, 11],
  tags: ['math', 'word-problems', 'multi-step'],
  maturityThreshold: 0.7,
  retirementCriteria: {
    lowEngagementRate: 0.25,
    lowSuccessRate: 0.35,
    evaluationWindowDays: 30,
  },
  prerequisites: ['math.word_1step.v1'],
  publishedAt: Date.now(),
  steps: [
    {
      id: 'step-1',
      title: 'Two Steps',
      content: 'A store has 12 balloons. 4 pop and then 6 more arrive. How many balloons now?',
      hints: [
        'First, subtract the ones that popped.',
        'Then add the new ones that arrived.',
        '12 - 4 = 8, then 8 + 6 = ?',
      ],
      interactionType: 'free-response',
      answerKey: '14',
      skillCode: 'math.word_2step',
    },
  ],
};

lessonRegistry.register(mathWord2Step);
