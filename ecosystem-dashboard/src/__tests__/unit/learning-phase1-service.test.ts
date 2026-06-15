import { LearningPhase1Service } from '../../lib/kids-pic/LearningPhase1Service';

describe('LearningPhase1Service', () => {
  it('falls back to starter catalog when content table is missing', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningPhase1Service({ query } as any);

    const items = await service.listContent({ ageBand: 'middle', limit: 10 });

    expect(query).toHaveBeenCalledWith('SELECT to_regclass($1) AS exists', ['public.learning_content_items']);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.ageBand === 'middle')).toBe(true);
  });

  it('grades deterministic starter content even when attempts table is missing', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: null }] })
      .mockResolvedValueOnce({ rows: [{ exists: null }] });

    const service = new LearningPhase1Service({ query } as any);

    const result = await service.gradeAttempt({
      childId: '00000000-0000-0000-0000-000000000001',
      contentItemId: 'phase1.math.word_1step.v1',
      learnerResponse: '19',
    });

    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.masteryEligible).toBe(true);
    expect(result.feedback).toContain('correct');
    expect(query).toHaveBeenCalledTimes(2);
  });
});
