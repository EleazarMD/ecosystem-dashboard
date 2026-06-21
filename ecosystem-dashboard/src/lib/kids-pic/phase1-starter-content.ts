export type LearnAgeBand = 'early' | 'middle' | 'tween';

export type LearnContentType = 'problem' | 'question' | 'writing' | 'reasoning';

export type LearnReviewStatus = 'draft' | 'approved' | 'retired';

export type LearnSafetyStatus = 'pending' | 'passed' | 'failed';

export interface DeterministicAnswerKey {
  kind: 'number' | 'exact_text';
  value: number | string;
  acceptedForms?: string[];
  tolerance?: number;
  caseSensitive?: boolean;
}

export interface LearnContentItem {
  id: string;
  version: number;
  subject: 'math' | 'reading' | 'writing' | 'analytical' | 'science';
  skillCode: string;
  analyticalTags: string[];
  type: LearnContentType;
  ageBand: LearnAgeBand;
  minGrade: string;
  maxGrade: string;
  difficulty: number;
  prompt: string;
  answerKey?: DeterministicAnswerKey;
  hintSet: string[];
  /** For writing/reasoning items: rubric criteria or expected reasoning steps. */
  rubricCriteria?: string[];
  /** Expected reasoning steps for reasoning activities (for AI evaluation). */
  expectedReasoning?: string[];
  provenance: 'authored' | 'ai_generated';
  reviewStatus: LearnReviewStatus;
  safetyStatus: LearnSafetyStatus;
  lowStakesOnly: boolean;
}

export const PHASE1_STARTER_CONTENT: LearnContentItem[] = [
  {
    id: 'phase1.math.word_1step.v1',
    version: 1,
    subject: 'math',
    skillCode: 'math.reasoning.word_1step',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'problem',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '3',
    difficulty: 2,
    prompt:
      'Maya has 38 stickers. She gives 19 to her friend. How many stickers does she have now?',
    answerKey: {
      kind: 'number',
      value: 19,
      acceptedForms: ['19', '19 stickers'],
      tolerance: 0,
    },
    hintSet: [
      'Is this an adding story or a taking away story?',
      'Try subtracting 38 - 19.',
      'Break it up: 38 - 10 = 28, then 28 - 9 = ?',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase1.math.fractions_compare.v1',
    version: 1,
    subject: 'math',
    skillCode: 'math.fractions.compare',
    analyticalTags: ['analytical.compare_classify'],
    type: 'problem',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt: 'Which fraction is greater: 3/4 or 5/8? Reply with just one fraction.',
    answerKey: {
      kind: 'exact_text',
      value: '3/4',
      acceptedForms: ['3/4', 'three fourths', 'three-fourths'],
      caseSensitive: false,
    },
    hintSet: [
      'Try comparing both fractions with a common denominator of 8.',
      '3/4 can be rewritten as 6/8.',
      'Now compare 6/8 and 5/8.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase1.reading.literal.v1',
    version: 1,
    subject: 'reading',
    skillCode: 'reading.comp.literal',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'question',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '3',
    difficulty: 2,
    prompt:
      'Passage: Leo packed an umbrella because the sky was dark and cloudy. Question: What did Leo pack?',
    answerKey: {
      kind: 'exact_text',
      value: 'umbrella',
      acceptedForms: ['umbrella', 'an umbrella', 'he packed an umbrella'],
      caseSensitive: false,
    },
    hintSet: [
      'Look for the noun directly after the verb "packed".',
      'The passage says Leo packed one specific item.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase1.reading.affixes.v1',
    version: 1,
    subject: 'reading',
    skillCode: 'reading.vocab.affixes_roots',
    analyticalTags: ['analytical.patterns'],
    type: 'question',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt:
      'What does the prefix "un-" usually mean in words like "unhappy" and "unfinished"?',
    answerKey: {
      kind: 'exact_text',
      value: 'not',
      acceptedForms: ['not', 'opposite', 'the opposite of', 'without'],
      caseSensitive: false,
    },
    hintSet: [
      'Think about how the word changes when "un-" is added.',
      'happy becomes unhappy. finished becomes unfinished.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase3.writing.describe_favorite.v1',
    version: 1,
    subject: 'writing',
    skillCode: 'writing.narrative.describe',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'writing',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '4',
    difficulty: 2,
    prompt:
      'Write a short paragraph (4-6 sentences) describing your favorite place to go. Use describing words so the reader can picture it.',
    hintSet: [
      'Start with a topic sentence: "My favorite place is..."',
      'Add what you see, hear, or feel there.',
      'Use at least two describing words (adjectives).',
    ],
    rubricCriteria: [
      'Clear topic sentence about the favorite place',
      'At least 2 descriptive adjectives',
      'Complete sentences with capital letters and end marks',
      'Stays on topic throughout',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase3.writing.opinion_why.v1',
    version: 1,
    subject: 'writing',
    skillCode: 'writing.opinion.reasons',
    analyticalTags: ['analytical.cause_effect'],
    type: 'writing',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt:
      'Should kids have homework every night? Write 5-8 sentences stating your opinion and give at least two reasons to support it.',
    hintSet: [
      'Start with your opinion: "I think kids should/should not have homework because..."',
      'Give your first reason with an example.',
      'Give a second reason with an example.',
      'End with a sentence that wraps up your argument.',
    ],
    rubricCriteria: [
      'Clear opinion statement in the first sentence',
      'At least two distinct reasons with support',
      'Logical organization with transitions',
      'Varied sentence structure and word choice',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase3.analytical.inference_picture.v1',
    version: 1,
    subject: 'analytical',
    skillCode: 'analytical.infer_evidence',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'reasoning',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '4',
    difficulty: 2,
    prompt:
      'Sam saw muddy footprints leading from the garden to the back door. The dog was sleeping inside. What do you think happened? Explain your reasoning.',
    hintSet: [
      'What do the muddy footprints tell you?',
      'Who could have made the footprints?',
      'How do you know it was not the dog?',
    ],
    expectedReasoning: [
      'Identify that footprints indicate someone walked from garden to door',
      'Rule out the dog because it was sleeping inside',
      'Conclude a person (family member or visitor) walked in from the garden',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase3.analytical.patterns_number.v1',
    version: 1,
    subject: 'analytical',
    skillCode: 'analytical.patterns',
    analyticalTags: ['analytical.patterns'],
    type: 'reasoning',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt:
      'Look at this pattern: 2, 6, 18, 54, ... What are the next two numbers? Explain the rule you found.',
    hintSet: [
      'Look at how each number relates to the one before it.',
      'Try multiplying: 2 x 3 = 6. Does the same rule work for 6 to 18?',
      'Apply the rule to 54 to find the next number.',
    ],
    expectedReasoning: [
      'Identify the multiplicative rule (x3)',
      'Verify the rule across all given terms',
      'Apply the rule to get 162 and 486',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.living_nonliving.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.classification.living',
    analyticalTags: ['analytical.compare_classify'],
    type: 'question',
    ageBand: 'early',
    minGrade: 'K',
    maxGrade: '1',
    difficulty: 1,
    prompt:
      'A rock does not grow, eat, or have babies. A plant grows, needs water, and makes seeds. Which one is living — the rock or the plant?',
    answerKey: {
      kind: 'exact_text',
      value: 'plant',
      acceptedForms: ['plant', 'the plant', 'a plant'],
      caseSensitive: false,
    },
    hintSet: [
      'Living things grow and need food or water.',
      'Does a rock grow? Does a plant grow?',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.weather_observations.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.earth.weather',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'question',
    ageBand: 'early',
    minGrade: 'K',
    maxGrade: '1',
    difficulty: 1,
    prompt:
      'You look outside and see dark clouds, hear thunder, and feel wind. What kind of weather is happening?',
    answerKey: {
      kind: 'exact_text',
      value: 'storm',
      acceptedForms: ['storm', 'a storm', 'thunderstorm', 'rainstorm', 'stormy'],
      caseSensitive: false,
    },
    hintSet: [
      'Dark clouds and thunder are signs of a certain kind of weather.',
      'Wind and rain often come with this kind of weather.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.states_of_matter.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.physical.matter',
    analyticalTags: ['analytical.compare_classify'],
    type: 'problem',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '3',
    difficulty: 2,
    prompt:
      'Ice is solid water. When ice melts it becomes liquid water. When water gets very hot it becomes a gas called water vapor. What do we call it when a liquid turns into a gas?',
    answerKey: {
      kind: 'exact_text',
      value: 'evaporation',
      acceptedForms: ['evaporation', 'evaporate', 'evaporating'],
      caseSensitive: false,
    },
    hintSet: [
      'The word starts with "ev-".',
      'Think about what happens to a puddle on a sunny day.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.plant_parts.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.life.plant_parts',
    analyticalTags: ['analytical.patterns'],
    type: 'question',
    ageBand: 'middle',
    minGrade: '2',
    maxGrade: '3',
    difficulty: 2,
    prompt:
      'A plant has roots, a stem, leaves, and flowers. The roots take in water from the soil. The leaves use sunlight to make food. What part of the plant carries water from the roots to the leaves?',
    answerKey: {
      kind: 'exact_text',
      value: 'stem',
      acceptedForms: ['stem', 'the stem'],
      caseSensitive: false,
    },
    hintSet: [
      'It is the part that holds the plant up.',
      'It connects the roots below to the leaves above.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.forces_motion.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.physical.forces',
    analyticalTags: ['analytical.cause_effect'],
    type: 'problem',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt:
      'A ball rolls across the floor and slows down until it stops. A force is pushing against the ball to slow it down. What is the name of this force?',
    answerKey: {
      kind: 'exact_text',
      value: 'friction',
      acceptedForms: ['friction', 'friction force'],
      caseSensitive: false,
    },
    hintSet: [
      'It happens when two surfaces rub against each other.',
      'It is the same force that makes your hands warm when you rub them together.',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
  {
    id: 'phase5.science.ecosystems.v1',
    version: 1,
    subject: 'science',
    skillCode: 'science.life.ecosystems',
    analyticalTags: ['analytical.infer_evidence'],
    type: 'reasoning',
    ageBand: 'tween',
    minGrade: '4',
    maxGrade: '5',
    difficulty: 3,
    prompt:
      'In a forest ecosystem, rabbits eat grass and foxes eat rabbits. If all the rabbits suddenly disappeared, what would happen to the grass and the foxes? Explain your reasoning.',
    hintSet: [
      'Think about what eats the grass and what eats the rabbits.',
      'If rabbits are gone, who eats the grass? Who do foxes eat?',
      'More grass might grow, but foxes would have less food.',
    ],
    expectedReasoning: [
      'Identify that rabbits are the food source for foxes',
      'Predict foxes would decline without their food source',
      'Predict grass would grow more without rabbits eating it',
      'Recognize the interconnectedness of the food chain',
    ],
    provenance: 'ai_generated',
    reviewStatus: 'approved',
    safetyStatus: 'passed',
    lowStakesOnly: false,
  },
];
