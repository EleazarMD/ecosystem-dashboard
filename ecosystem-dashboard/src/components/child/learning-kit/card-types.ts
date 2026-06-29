/**
 * Card Player types and card set builder — extracted from CardPlayer.tsx
 * so they can be imported in Node tests without pulling in React/Chakra.
 */

import type { ConceptChoice } from './ConceptCheckCard';

// ─── Card types ──────────────────────────────────────────────────────────────

export type CardType = 'try' | 'see' | 'explain' | 'play' | 'check';

export interface BaseCard {
  id: string;
  type: CardType;
  title: string;
  emoji?: string;
}

export interface TryCard extends BaseCard {
  type: 'try';
  question: string;
  choices: ConceptChoice[];
  explanation: string;
  hint?: string;
}

export interface SeeCard extends BaseCard {
  type: 'see';
  exampleTitle: string;
  steps: string[];
}

export interface ExplainCard extends BaseCard {
  type: 'explain';
  passageTitle: string;
  passageText: string;
}

export interface PlayCard extends BaseCard {
  type: 'play';
  prompt: string;
  interaction?: string;
}

export interface CheckCard extends BaseCard {
  type: 'check';
  question: string;
  choices: ConceptChoice[];
  explanation: string;
  hint?: string;
  contentItemId?: string;
  skillCode?: string;
}

export type LearningCard = TryCard | SeeCard | ExplainCard | PlayCard | CheckCard;

export interface CardSet {
  cards: LearningCard[];
}

// ─── Result ──────────────────────────────────────────────────────────────────

export interface CardPlayerResult {
  score: number;
  correct: boolean;
  attemptId?: string;
  skillCode?: string;
  masteryDelta?: number;
  pathCompleted?: boolean;
}

// ─── Card set builder ────────────────────────────────────────────────────────

/**
 * Build a default card set from a path step's properties.
 * Creates a try → see → explain → check sequence when the step
 * doesn't have an explicit card set definition.
 *
 * If a `contentItem` is provided (from the content catalog), the
 * check card generates real multiple-choice options from the answer key
 * instead of placeholder self-assessment choices.
 */
export function buildCardSetFromStep(
  step: {
    title: string;
    description?: string;
    customPrompt?: string;
    hints: string[];
    skillCode?: string;
    contentItemId?: string;
  },
  contentItem?: {
    prompt: string;
    answerKey?: {
      kind: 'number' | 'exact_text';
      value: number | string;
      acceptedForms?: string[];
    };
    hintSet: string[];
    type?: string;
    rubricCriteria?: string[];
  },
): LearningCard[] {
  const cards: LearningCard[] = [];
  const prompt = contentItem?.prompt || step.customPrompt || `Let's explore "${step.title}".`;
  const hints = contentItem?.hintSet?.length ? contentItem.hintSet : step.hints;

  // 1. Try card — predict-then-reveal
  cards.push({
    id: `${step.title}-try`,
    type: 'try',
    title: 'Make a prediction',
    emoji: '🤔',
    question: prompt,
    choices: [
      { id: 'a', label: 'I think I know!', correct: true },
      { id: 'b', label: 'I need a hint first', correct: false },
    ],
    explanation: step.description || `Great thinking! Let's explore "${step.title}" together.`,
    hint: hints[0],
  });

  // 2. See card — worked example
  cards.push({
    id: `${step.title}-see`,
    type: 'see',
    title: 'See how it works',
    emoji: '👁️',
    exampleTitle: step.title,
    steps: [
      step.description || `Let's break down "${step.title}" step by step.`,
      prompt,
      ...hints,
    ],
  });

  // 3. Explain card — short passage explaining the concept
  cards.push({
    id: `${step.title}-explain`,
    type: 'explain',
    title: 'Let\'s understand why',
    emoji: '💡',
    passageTitle: step.title,
    passageText: step.description || `Here's the key idea behind "${step.title}": ${prompt}`,
  });

  // 4. Check card — final assessment
  let checkChoices: ConceptChoice[];
  let checkQuestion: string;
  let checkExplanation: string;

  if (contentItem?.answerKey) {
    checkQuestion = contentItem.prompt;
    checkChoices = generateChoicesFromAnswerKey(contentItem.answerKey);
    checkExplanation = `The answer is ${contentItem.answerKey.value}. ${hints[0] || ''}`.trim();
  } else {
    checkQuestion = step.customPrompt || `What did you learn about "${step.title}"?`;
    checkChoices = [
      { id: 'correct', label: 'I can explain it!', correct: true },
      { id: 'partial', label: 'I kind of get it', correct: true },
      { id: 'unsure', label: 'I need more help', correct: false },
    ];
    checkExplanation = step.description || 'Every step forward is progress!';
  }

  cards.push({
    id: `${step.title}-check`,
    type: 'check',
    title: 'Show what you know!',
    emoji: '✅',
    question: checkQuestion,
    choices: checkChoices,
    explanation: checkExplanation,
    hint: hints[0],
    contentItemId: step.contentItemId,
    skillCode: step.skillCode,
  });

  return cards;
}

/**
 * Generate 3–4 multiple-choice options from a deterministic answer key.
 * The correct answer is always present; distractors are derived from common
 * off-by-one and sign-error patterns for numeric answers, or from plausible
 * text variants for exact_text answers.
 */
function generateChoicesFromAnswerKey(answerKey: {
  kind: 'number' | 'exact_text';
  value: number | string;
  acceptedForms?: string[];
}): ConceptChoice[] {
  if (answerKey.kind === 'number') {
    const correct = answerKey.value as number;
    const distractors = new Set<number>();

    const candidates = [
      correct + 1,
      correct - 1,
      correct + 10,
      correct - 10,
      correct * 2,
      Math.floor(correct / 2),
      correct + 5,
      correct - 5,
    ];

    for (const c of candidates) {
      if (c !== correct && c >= 0 && distractors.size < 3) {
        distractors.add(c);
      }
    }

    let offset = 11;
    while (distractors.size < 3) {
      const d = correct + offset;
      if (d !== correct && !distractors.has(d)) distractors.add(d);
      offset += 7;
    }

    const allOptions = [correct, ...Array.from(distractors)];
    const shuffled = allOptions.sort((a, b) => ((a * 7 + correct) % 3) - ((b * 7 + correct) % 3));

    return shuffled.map((val, i) => ({
      id: String.fromCharCode(97 + i),
      label: String(val),
      correct: val === correct,
    }));
  }

  const correctLabel = String(answerKey.value);
  const accepted = answerKey.acceptedForms || [];
  const allLabels = [correctLabel, ...accepted.filter((f) => f !== correctLabel)];

  const genericDistractors = ['Not sure', 'None of the above'];
  while (allLabels.length < 3) {
    allLabels.push(genericDistractors.shift() || `Option ${allLabels.length}`);
  }

  return allLabels.slice(0, 4).map((label, i) => ({
    id: String.fromCharCode(97 + i),
    label,
    correct: label === correctLabel,
  }));
}
