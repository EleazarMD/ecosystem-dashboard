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

describe('LearningPhase1Service grading edge cases', () => {
  it('grades an incorrect answer with score 0 and provides a hint', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: null }] })
      .mockResolvedValueOnce({ rows: [{ exists: null }] });

    const service = new LearningPhase1Service({ query } as any);

    const result = await service.gradeAttempt({
      childId: '00000000-0000-0000-0000-000000000001',
      contentItemId: 'phase1.math.word_1step.v1',
      learnerResponse: '42',
    });

    expect(result.correct).toBe(false);
    expect(result.score).toBe(0);
    expect(result.masteryEligible).toBe(true);
    expect(result.feedback).toContain('Try again');
    expect(result.hint).toBeDefined();
  });

  it('throws on unknown content item id', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ exists: null }] })
      .mockResolvedValueOnce({ rows: [{ exists: null }] });

    const service = new LearningPhase1Service({ query } as any);

    await expect(
      service.gradeAttempt({
        childId: 'child-1',
        contentItemId: 'nonexistent.item.id',
        learnerResponse: 'whatever',
      }),
    ).rejects.toThrow('Unknown content item');
  });

  it('getContentById returns starter content by id when db table is missing', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningPhase1Service({ query } as any);

    const item = await service.getContentById('phase1.math.word_1step.v1');

    expect(item).not.toBeNull();
    expect(item!.id).toBe('phase1.math.word_1step.v1');
  });

  it('getContentById returns null for an unknown id', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningPhase1Service({ query } as any);

    const item = await service.getContentById('does.not.exist');

    expect(item).toBeNull();
  });

  it('listContent filters by skillCode in starter catalog', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningPhase1Service({ query } as any);

    const items = await service.listContent({ skillCode: 'math.reasoning.word_1step', limit: 50 });

    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.skillCode === 'math.reasoning.word_1step')).toBe(true);
  });
});
