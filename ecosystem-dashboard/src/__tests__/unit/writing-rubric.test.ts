import {
  evaluateWriting,
  getRubricDimensions,
} from '@/domains/learning/features/writing-rubric';

describe('evaluateWriting', () => {
  it('returns a rubric result with dimension scores', () => {
    const text = 'My favorite place is the beach. I love the warm sand between my toes. The waves crash loudly. It smells like salt and sunshine.';
    const result = evaluateWriting(text, 'middle');

    expect(result.dimensionScores.length).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.maxScore).toBeGreaterThan(0);
    expect(result.percentage).toBeGreaterThanOrEqual(0);
    expect(result.percentage).toBeLessThanOrEqual(100);
    expect(result.encouragement).toBeTruthy();
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.method).toBe('deterministic');
  });

  it('scores short text lower on ideas dimension', () => {
    const result = evaluateWriting('I like dogs.', 'middle');
    const ideasScore = result.dimensionScores.find((d) => d.dimension === 'ideas');
    expect(ideasScore).toBeDefined();
    expect(ideasScore!.score).toBeLessThanOrEqual(3);
  });

  it('scores well-structured text higher on organization', () => {
    const text = 'First, I went to the park. Next, I played on the swings. Then, I met my friends. Finally, we all went home for dinner.';
    const result = evaluateWriting(text, 'middle');
    const orgScore = result.dimensionScores.find((d) => d.dimension === 'organization');
    expect(orgScore).toBeDefined();
    expect(orgScore!.score).toBeGreaterThanOrEqual(3);
  });

  it('detects missing capitalization in conventions', () => {
    const text = 'my favorite place is the beach. i love the warm sand between my toes.';
    const result = evaluateWriting(text, 'middle');
    const convScore = result.dimensionScores.find((d) => d.dimension === 'conventions');
    expect(convScore).toBeDefined();
    expect(convScore!.score).toBeLessThan(5);
  });

  it('uses early band dimensions for early age', () => {
    const result = evaluateWriting('I like the park. It is fun.', 'early');
    expect(result.dimensionScores.length).toBe(3);
    expect(result.dimensionScores.some((d) => d.dimension === 'ideas')).toBe(true);
    expect(result.dimensionScores.some((d) => d.dimension === 'organization')).toBe(true);
    expect(result.dimensionScores.some((d) => d.dimension === 'conventions')).toBe(true);
  });

  it('uses tween band dimensions for tween age', () => {
    const text = 'Should kids have homework every night? I think they should not. First, kids need time to play. For example, playing helps you be creative. Also, kids need rest. Because rest helps your brain grow. In conclusion, no homework means happier kids.';
    const result = evaluateWriting(text, 'tween');
    expect(result.dimensionScores.length).toBe(5);
    expect(result.dimensionScores.some((d) => d.dimension === 'voice')).toBe(true);
  });

  it('falls back to middle band for unknown age', () => {
    const result = evaluateWriting('Test text.', 'unknown' as any);
    expect(result.dimensionScores.length).toBe(4);
  });
});

describe('getRubricDimensions', () => {
  it('returns 3 dimensions for early', () => {
    const dims = getRubricDimensions('early');
    expect(dims).toHaveLength(3);
  });

  it('returns 4 dimensions for middle', () => {
    const dims = getRubricDimensions('middle');
    expect(dims).toHaveLength(4);
  });

  it('returns 5 dimensions for tween', () => {
    const dims = getRubricDimensions('tween');
    expect(dims).toHaveLength(5);
  });
});
