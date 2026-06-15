export type LearnAgeBand = 'early' | 'middle' | 'tween';

export type LearnContentType = 'problem' | 'question';

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
  subject: 'math' | 'reading';
  skillCode: string;
  analyticalTags: string[];
  type: LearnContentType;
  ageBand: LearnAgeBand;
  minGrade: string;
  maxGrade: string;
  difficulty: number;
  prompt: string;
  answerKey: DeterministicAnswerKey;
  hintSet: string[];
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
];
