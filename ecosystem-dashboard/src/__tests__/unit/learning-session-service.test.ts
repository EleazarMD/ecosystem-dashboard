import { LearningSessionService } from '../../lib/kids-pic/LearningSessionService';

describe('LearningSessionService', () => {
  it('creates an in-memory session when table is unavailable', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningSessionService({ query } as any);

    const session = await service.createSession({
      childId: '00000000-0000-0000-0000-000000000001',
      ownerId: 'owner-1',
      mode: 'guided',
      status: 'started',
      plan: { objectiveCount: 2 },
      activities: [{ contentItemId: 'phase1.math.word_1step.v1' }],
    });

    expect(session.id).toBeTruthy();
    expect(session.childId).toBe('00000000-0000-0000-0000-000000000001');
    expect(session.status).toBe('started');
    expect(query).toHaveBeenCalledWith('SELECT to_regclass($1) AS exists', ['public.learning_sessions']);
  });

  it('updates an existing in-memory session and marks completion', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const service = new LearningSessionService({ query } as any);

    const created = await service.createSession({
      childId: '00000000-0000-0000-0000-000000000002',
      mode: 'guided',
      status: 'started',
    });

    const updated = await service.updateSession(created.id, {
      status: 'completed',
      durationSeconds: 180,
      outcomes: { masterySignals: 1 },
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('completed');
    expect(updated?.durationSeconds).toBe(180);
    expect(updated?.endedAt).toBeTruthy();
  });
});
