import {
  captureMisconception,
  getMisconceptions,
  getUnaddressedMisconceptions,
  getMisconceptionsBySkill,
  getSkillsNeedingReview,
  markMisconceptionAddressed,
  classifyMisconception,
  clearAllMisconceptions,
  clearMisconceptions,
} from '@/domains/learning/features/misconception-tracker';

describe('classifyMisconception', () => {
  it('classifies math calculation errors', () => {
    const type = classifyMisconception('21', '19', 'math.reasoning.word_1step');
    expect(type).toBe('calculation_error');
  });

  it('classifies wrong operation in math', () => {
    // 38 + 19 = 57, but correct is 38 - 19 = 19
    const type = classifyMisconception('57', '19', 'math.reasoning.word_1step');
    expect(type).toBe('wrong_operation');
  });

  it('classifies incomplete answers in reading', () => {
    // 'umbrel' includes 'umbrella'[0]='umbrella' but is shorter than half → incomplete
    // Actually 'umbrel' doesn't include 'umbrella'. Use a response that includes the first word.
    // For single-word answers, the first word IS the whole answer, so incomplete_answer
    // can only trigger if the response contains the correct word but is shorter — impossible.
    // Instead test with a longer correct answer.
    const type = classifyMisconception('he packed', 'he packed an umbrella', 'reading.comp.literal');
    expect(type).toBe('incomplete_answer');
  });

  it('classifies misread questions in reading', () => {
    const type = classifyMisconception('hat', 'umbrella', 'reading.comp.literal');
    expect(type).toBe('misread_question');
  });

  it('classifies very short responses as incomplete (generic)', () => {
    const type = classifyMisconception('a', 'correct answer here', 'analytical.infer_evidence');
    expect(type).toBe('incomplete_answer');
  });

  it('classifies conceptual gaps for non-math/reading', () => {
    const type = classifyMisconception('something wrong', 'correct answer', 'analytical.infer_evidence');
    expect(type).toBe('conceptual_gap');
  });
});

describe('captureMisconception', () => {
  beforeEach(() => {
    clearAllMisconceptions();
  });

  it('captures a new misconception', () => {
    const record = captureMisconception({
      childId: 'child-1',
      skillCode: 'math.reasoning.word_1step',
      incorrectResponse: '21',
      correctApproach: '19',
    });

    expect(record.childId).toBe('child-1');
    expect(record.skillCode).toBe('math.reasoning.word_1step');
    expect(record.addressed).toBe(false);
    expect(record.resurfaceCount).toBe(0);
  });

  it('increments resurface count for same skill', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '5/8',
      correctApproach: '3/4',
    });

    const second = captureMisconception({
      childId: 'child-1',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '5/8',
      correctApproach: '3/4',
    });

    expect(second.resurfaceCount).toBe(1);
  });

  it('stores separate misconceptions for different children', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '5/8',
      correctApproach: '3/4',
    });

    captureMisconception({
      childId: 'child-2',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '1/2',
      correctApproach: '3/4',
    });

    expect(getMisconceptions('child-1')).toHaveLength(1);
    expect(getMisconceptions('child-2')).toHaveLength(1);
  });
});

describe('getSkillsNeedingReview', () => {
  beforeEach(() => {
    clearAllMisconceptions();
  });

  it('returns skills sorted by priority', () => {
    // First skill with 1 misconception
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.addsub.within_100',
      incorrectResponse: '50',
      correctApproach: '40',
    });

    // Second skill with 2 misconceptions (higher priority)
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '5/8',
      correctApproach: '3/4',
    });
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.fractions.compare',
      incorrectResponse: '1/2',
      correctApproach: '3/4',
    });

    const skills = getSkillsNeedingReview('child-1');
    expect(skills).toHaveLength(2);
    expect(skills[0].skillCode).toBe('math.fractions.compare');
    expect(skills[0].priority).toBeGreaterThan(skills[1].priority);
  });

  it('excludes addressed misconceptions', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.addsub.within_100',
      incorrectResponse: '50',
      correctApproach: '40',
    });

    markMisconceptionAddressed('child-1', 'math.addsub.within_100');

    expect(getSkillsNeedingReview('child-1')).toHaveLength(0);
    expect(getUnaddressedMisconceptions('child-1')).toHaveLength(0);
  });
});

describe('markMisconceptionAddressed', () => {
  beforeEach(() => {
    clearAllMisconceptions();
  });

  it('marks the misconception as addressed', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.addsub.within_100',
      incorrectResponse: '50',
      correctApproach: '40',
    });

    markMisconceptionAddressed('child-1', 'math.addsub.within_100');

    const records = getMisconceptions('child-1');
    expect(records[0].addressed).toBe(true);
  });
});

describe('getMisconceptionsBySkill', () => {
  beforeEach(() => {
    clearAllMisconceptions();
  });

  it('filters by skill code', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.addsub.within_100',
      incorrectResponse: '50',
      correctApproach: '40',
    });
    captureMisconception({
      childId: 'child-1',
      skillCode: 'reading.comp.literal',
      incorrectResponse: 'hat',
      correctApproach: 'umbrella',
    });

    const mathRecords = getMisconceptionsBySkill('child-1', 'math.addsub.within_100');
    expect(mathRecords).toHaveLength(1);
    expect(mathRecords[0].skillCode).toBe('math.addsub.within_100');
  });
});

describe('clearMisconceptions', () => {
  it('clears all misconceptions for a child', () => {
    captureMisconception({
      childId: 'child-1',
      skillCode: 'math.addsub.within_100',
      incorrectResponse: '50',
      correctApproach: '40',
    });

    clearMisconceptions('child-1');
    expect(getMisconceptions('child-1')).toHaveLength(0);
  });
});
