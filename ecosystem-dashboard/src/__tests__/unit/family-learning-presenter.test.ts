import { buildFamilyLearningSnapshot } from '@/domains/learning/shared/family-presenter';

describe('family-learning-presenter', () => {
  it('ranks strongest and support subjects from by-subject stats', () => {
    const snapshot = buildFamilyLearningSnapshot({
      sessionsCompleted: 2,
      bySubject: [
        { subject: 'math', attempts: 6, correct: 5 },
        { subject: 'reading', attempts: 3, correct: 1 },
        { subject: 'science', attempts: 4, correct: 3 },
      ],
    });

    expect(snapshot.strongest).toMatchObject({ subject: 'math', accuracy: 83 });
    expect(snapshot.support).toMatchObject({ subject: 'reading', accuracy: 33 });
    expect(snapshot.sessionGoal).toBe(3);
    expect(snapshot.consistencyProgress).toBe(67);
    expect(snapshot.recommendations.length).toBe(3);
    expect(snapshot.recommendations[0]).toContain('weekly rhythm');
    expect(snapshot.recommendations.some((line) => line.includes('reading'))).toBe(true);
    expect(snapshot.recommendations.some((line) => line.includes('math'))).toBe(true);
  });

  it('handles no-attempt subjects and caps progress at 100', () => {
    const snapshot = buildFamilyLearningSnapshot(
      {
        sessionsCompleted: 9,
        bySubject: [
          { subject: 'math', attempts: 0, correct: 0 },
          { subject: 'reading', attempts: 0, correct: 0 },
        ],
      },
      3,
    );

    expect(snapshot.strongest).toBeNull();
    expect(snapshot.support).toBeNull();
    expect(snapshot.consistencyProgress).toBe(100);
    expect(snapshot.recommendations[0]).toContain('Celebrate consistency');
  });

  it('respects a custom session goal', () => {
    const snapshot = buildFamilyLearningSnapshot(
      {
        sessionsCompleted: 2,
        bySubject: [{ subject: 'analytical', attempts: 2, correct: 2 }],
      },
      4,
    );

    expect(snapshot.sessionGoal).toBe(4);
    expect(snapshot.consistencyProgress).toBe(50);
    expect(snapshot.recommendations[0]).toContain('weekly rhythm');
    expect(snapshot.recommendations.some((line) => line.includes('analytical'))).toBe(true);
  });
});
