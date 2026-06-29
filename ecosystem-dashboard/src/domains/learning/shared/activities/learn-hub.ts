/**
 * Learn Hub — LearningActivity registry entry.
 *
 * Structured lessons, quizzes, and learning paths.
 */

import { activityRegistry, KNOWN_ACTIVITY_IDS } from '../activity-types';
import { ToolRoster } from '../tool-roster';
import { resolvePersona, toPersonaRef } from '../../personas';
import '../../personas'; // ensure all personas are registered

const learnHubRoster: ToolRoster = {
  id: 'learn-hub',
  tools: [
    {
      id: 'tutor-turn',
      label: 'Tutor',
      description: 'Ask the learning tutor for an explanation, hint, or next step.',
      endpoint: '/api/child/companion/agent-turn',
    },
    {
      id: 'learn-attempt',
      label: 'Submit Answer',
      description: 'Submit an answer attempt for grading.',
      endpoint: '/api/learn/attempt',
    },
    {
      id: 'learn-plan',
      label: 'View Plan',
      description: 'See the recommended next learning objective.',
      endpoint: '/api/learn/plan',
    },
    {
      id: 'ask_socratic',
      label: 'Ask Socratic',
      description: 'Generate a Socratic tutoring prompt that guides the learner to the next step.',
    },
    {
      id: 'give_hint',
      label: 'Give Hint',
      description: 'Return the next hint from the hint set for this content item.',
    },
    {
      id: 'check_answer',
      label: 'Check Answer',
      description: 'Reason about a learner-proposed answer without revealing the correct answer.',
    },
    {
      id: 'define_word',
      label: 'Define Word',
      description: 'Look up a kid-friendly definition for a word.',
    },
    {
      id: 'explore_graph',
      label: 'Explore Graph',
      description: 'Suggest a Pokémon Lab lesson for interactive exploration.',
    },
  ],
};

const learnHubSkillCodes = [
  'math.arithmetic.addition',
  'math.arithmetic.subtraction',
  'reading.comprehension',
  'reading.vocabulary',
];

const learnHubPersona = toPersonaRef(resolvePersona({
  activityId: 'learn-hub',
  skillCodes: learnHubSkillCodes,
}));

activityRegistry.register({
  id: KNOWN_ACTIVITY_IDS.LEARN_HUB,
  name: 'Learn',
  description: 'Lessons, quizzes, and learning paths',
  icon: '📚',
  category: 'learning',
  route: '/child/learn',
  pageType: 'learn',
  toolRoster: learnHubRoster,
  skillCodes: learnHubSkillCodes,
  persona: learnHubPersona,
  greeting: "Ready to learn something new? 🎓 What are you working on?",
  quickActions: [
    { label: 'Explain this', intent: 'explain-this', emoji: '💡', prompt: 'Explain this concept to me' },
    { label: 'Give me a hint', intent: 'hint', emoji: '🤔', prompt: 'Give me a hint' },
    { label: 'Check my answer', intent: 'check-answer', emoji: '✅', prompt: 'Check my answer' },
  ],
  load: () => import('@/pages/child/learn').then((m) => ({ default: m.default })),
  navVisible: true,
  minAge: 5,
});
