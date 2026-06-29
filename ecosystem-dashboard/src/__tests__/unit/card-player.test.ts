import {
  buildCardSetFromStep,
} from '@/components/child/learning-kit/card-types';

describe('buildCardSetFromStep', () => {
  const baseStep = {
    title: 'Adding to 5',
    description: 'Practice adding numbers that make 5.',
    customPrompt: 'What pairs of numbers add up to 5?',
    hints: ['1 + ? = 5', '2 + ? = 5', 'Try 3 + ? too!'],
    skillCode: 'math.addition',
  };

  it('builds a try → see → explain → check sequence', () => {
    const cards = buildCardSetFromStep(baseStep);

    expect(cards).toHaveLength(4);
    expect(cards.map((c) => c.type)).toEqual(['try', 'see', 'explain', 'check']);
  });

  it('try card has predict-then-reveal choices', () => {
    const cards = buildCardSetFromStep(baseStep);
    const tryCard = cards[0];

    expect(tryCard.type).toBe('try');
    if (tryCard.type === 'try') {
      expect(tryCard.question).toContain('What pairs');
      expect(tryCard.choices.length).toBeGreaterThanOrEqual(2);
      expect(tryCard.choices.some((c) => c.correct)).toBe(true);
      expect(tryCard.explanation).toBeTruthy();
      expect(tryCard.hint).toBe(baseStep.hints[0]);
    }
  });

  it('see card has worked example steps', () => {
    const cards = buildCardSetFromStep(baseStep);
    const seeCard = cards[1];

    expect(seeCard.type).toBe('see');
    if (seeCard.type === 'see') {
      expect(seeCard.exampleTitle).toBe(baseStep.title);
      expect(seeCard.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('explain card has a passage', () => {
    const cards = buildCardSetFromStep(baseStep);
    const explainCard = cards[2];

    expect(explainCard.type).toBe('explain');
    if (explainCard.type === 'explain') {
      expect(explainCard.passageTitle).toBe(baseStep.title);
      expect(explainCard.passageText).toBeTruthy();
    }
  });

  it('check card uses step prompt when no contentItem', () => {
    const cards = buildCardSetFromStep(baseStep);
    const checkCard = cards[3];

    expect(checkCard.type).toBe('check');
    if (checkCard.type === 'check') {
      expect(checkCard.question).toBe(baseStep.customPrompt);
      expect(checkCard.choices.some((c) => c.correct)).toBe(true);
      expect(checkCard.skillCode).toBe(baseStep.skillCode);
    }
  });

  it('check card generates real MC choices from answerKey', () => {
    const contentItem = {
      prompt: 'What is 3 + 2?',
      answerKey: {
        kind: 'number' as const,
        value: 5,
      },
      hintSet: ['Count on from 3'],
    };

    const cards = buildCardSetFromStep(baseStep, contentItem);
    const checkCard = cards[3];

    expect(checkCard.type).toBe('check');
    if (checkCard.type === 'check') {
      expect(checkCard.question).toBe('What is 3 + 2?');
      expect(checkCard.choices).toHaveLength(4);
      const correct = checkCard.choices.find((c) => c.correct);
      expect(correct?.label).toBe('5');
      expect(checkCard.explanation).toContain('5');
    }
  });

  it('uses contentItem prompt and hintSet when provided', () => {
    const contentItem = {
      prompt: 'Solve: 7 - 3 = ?',
      hintSet: ['Count down from 7'],
    };

    const cards = buildCardSetFromStep(baseStep, contentItem);
    const tryCard = cards[0];

    if (tryCard.type === 'try') {
      expect(tryCard.question).toBe('Solve: 7 - 3 = ?');
      expect(tryCard.hint).toBe('Count down from 7');
    }
  });

  it('all cards have unique ids', () => {
    const cards = buildCardSetFromStep(baseStep);
    const ids = cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('generates plausible numeric distractors', () => {
    const contentItem = {
      prompt: 'What is 10 + 5?',
      answerKey: { kind: 'number' as const, value: 15 },
      hintSet: [],
    };

    const cards = buildCardSetFromStep(baseStep, contentItem);
    const checkCard = cards[3];

    if (checkCard.type === 'check') {
      const labels = checkCard.choices.map((c) => Number(c.label));
      expect(labels).toContain(15);
      // Distractors should be plausible (not wildly off)
      for (const val of labels) {
        expect(Math.abs(val - 15)).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('explicit cardSet from path templates', () => {
  it('PRESET_PATH_TEMPLATES include cardSet on upgraded steps', () => {
    const { PRESET_PATH_TEMPLATES } = require('@/domains/learning/shared/path-templates');
    const math57 = PRESET_PATH_TEMPLATES.find(
      (t: any) => t.id === 'math-5-7-counting-adventure',
    );
    expect(math57).toBeDefined();

    const firstStep = math57.recommendation.steps[0];
    expect(firstStep.cardSet).toBeDefined();
    expect(Array.isArray(firstStep.cardSet)).toBe(true);
    expect(firstStep.cardSet.length).toBe(5);
  });

  it('cardSet produces correct card type sequence (try→see→explain→play→check)', () => {
    const { PRESET_PATH_TEMPLATES } = require('@/domains/learning/shared/path-templates');
    const math57 = PRESET_PATH_TEMPLATES.find(
      (t: any) => t.id === 'math-5-7-counting-adventure',
    );
    const cards = math57.recommendation.steps[0].cardSet;
    const types = cards.map((c: any) => c.type);
    expect(types).toEqual(['try', 'see', 'explain', 'play', 'check']);
  });

  it('each card in explicit cardSet has required fields', () => {
    const { PRESET_PATH_TEMPLATES } = require('@/domains/learning/shared/path-templates');
    const templates = ['math-5-7-counting-adventure', 'math-8-10-multiplication-journey', 'math-11-13-algebra-thinking'];

    for (const tplId of templates) {
      const tpl = PRESET_PATH_TEMPLATES.find((t: any) => t.id === tplId);
      expect(tpl).toBeDefined();
      const stepWithCards = tpl.recommendation.steps.find((s: any) => s.cardSet);
      expect(stepWithCards).toBeDefined();

      for (const card of stepWithCards.cardSet) {
        expect(card.id).toBeTruthy();
        expect(card.type).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.emoji).toBeTruthy();
      }
    }
  });

  it('check card in explicit cardSet has exactly one correct choice', () => {
    const { PRESET_PATH_TEMPLATES } = require('@/domains/learning/shared/path-templates');
    const math810 = PRESET_PATH_TEMPLATES.find(
      (t: any) => t.id === 'math-8-10-multiplication-journey',
    );
    const cards = math810.recommendation.steps[0].cardSet;
    const checkCard = cards.find((c: any) => c.type === 'check');
    const correctCount = checkCard.choices.filter((c: any) => c.correct).length;
    expect(correctCount).toBe(1);
  });

  it('reading template also has explicit cardSet', () => {
    const { PRESET_PATH_TEMPLATES } = require('@/domains/learning/shared/path-templates');
    const reading57 = PRESET_PATH_TEMPLATES.find(
      (t: any) => t.id === 'reading-5-7-story-explorer',
    );
    const pictureCluesStep = reading57.recommendation.steps.find(
      (s: any) => s.title === 'Picture Clues',
    );
    expect(pictureCluesStep.cardSet).toBeDefined();
    expect(pictureCluesStep.cardSet.length).toBe(5);
  });
});
