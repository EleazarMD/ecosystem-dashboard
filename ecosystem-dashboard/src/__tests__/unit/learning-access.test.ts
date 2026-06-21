import type { Pool } from 'pg';

import { getLearningAccessState, recordLearningUsage } from '@/domains/learning/features/access-control';

function poolReturning(row: Record<string, unknown> | null): { pool: Pool; query: jest.Mock } {
  const query = jest.fn(async () => ({ rows: row ? [row] : [] }));
  return { pool: { query } as unknown as Pool, query };
}

describe('getLearningAccessState', () => {
  it('allows a controlled child under the daily limit', async () => {
    const { pool } = poolReturning({
      account_type: 'child',
      controls_active: true,
      daily_limit: 120,
      within_hours: true,
      current_minutes: 30,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state).toMatchObject({
      controlled: true,
      allowed: true,
      currentUsageMinutes: 30,
      dailyLimitMinutes: 120,
      remainingMinutes: 90,
    });
  });

  it('blocks a controlled child at the daily limit', async () => {
    const { pool } = poolReturning({
      account_type: 'child',
      controls_active: true,
      daily_limit: 60,
      within_hours: true,
      current_minutes: 60,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state.controlled).toBe(true);
    expect(state.allowed).toBe(false);
    expect(state.reason).toMatch(/time's up/i);
    expect(state.remainingMinutes).toBe(0);
  });

  it('blocks a controlled child outside allowed hours', async () => {
    const { pool } = poolReturning({
      account_type: 'child',
      controls_active: true,
      daily_limit: 120,
      within_hours: false,
      current_minutes: 0,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state.allowed).toBe(false);
    expect(state.reason).toMatch(/allowed hours/i);
  });

  it('treats uncontrolled / non-child accounts as allowed', async () => {
    const { pool } = poolReturning({
      account_type: 'parent',
      controls_active: false,
      daily_limit: 120,
      within_hours: true,
      current_minutes: 0,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state).toMatchObject({ controlled: false, allowed: true });
  });

  it('fails open when the controls query throws', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const query = jest.fn(async () => {
      throw new Error('relation "parental_controls_config" does not exist');
    });
    const pool = { query } as unknown as Pool;

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state).toMatchObject({ controlled: false, allowed: true });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns uncontrolled for an empty user id without querying', async () => {
    const query = jest.fn();
    const pool = { query } as unknown as Pool;

    const state = await getLearningAccessState(pool, '');

    expect(state.controlled).toBe(false);
    expect(state.allowed).toBe(true);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('recordLearningUsage', () => {
  it('upserts the daily usage ledger by the given minutes', async () => {
    const query = jest.fn(async () => ({ rows: [] }));
    const pool = { query } as unknown as Pool;

    await recordLearningUsage(pool, 'user-1', 2);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as unknown as [string, unknown[]];
    expect(String(sql)).toContain('INSERT INTO child_daily_usage');
    expect(params).toEqual(['user-1', 2]);
  });

  it('is a no-op for empty user id or non-positive minutes', async () => {
    const query = jest.fn();
    const pool = { query } as unknown as Pool;

    await recordLearningUsage(pool, '', 1);
    await recordLearningUsage(pool, 'user-1', 0);

    expect(query).not.toHaveBeenCalled();
  });

  it('swallows errors from the usage upsert (best-effort)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const query = jest.fn(async () => {
      throw new Error('connection refused');
    });
    const pool = { query } as unknown as Pool;

    await expect(recordLearningUsage(pool, 'user-1', 1)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('getLearningAccessState edge cases', () => {
  it('treats a non-child account with controls_active as uncontrolled', async () => {
    const { pool } = poolReturning({
      account_type: 'parent',
      controls_active: true,
      daily_limit: 120,
      within_hours: true,
      current_minutes: 0,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state.controlled).toBe(false);
    expect(state.allowed).toBe(true);
  });

  it('blocks when current usage exactly equals daily limit', async () => {
    const { pool } = poolReturning({
      account_type: 'child',
      controls_active: true,
      daily_limit: 45,
      within_hours: true,
      current_minutes: 45,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state.controlled).toBe(true);
    expect(state.allowed).toBe(false);
    expect(state.reason).toMatch(/time's up/i);
    expect(state.remainingMinutes).toBe(0);
  });

  it('clamps remaining minutes to zero when usage exceeds limit', async () => {
    const { pool } = poolReturning({
      account_type: 'child',
      controls_active: true,
      daily_limit: 30,
      within_hours: true,
      current_minutes: 50,
    });

    const state = await getLearningAccessState(pool, 'user-1');

    expect(state.remainingMinutes).toBe(0);
    expect(state.allowed).toBe(false);
  });

  it('returns uncontrolled when user row is not found', async () => {
    const { pool } = poolReturning(null);

    const state = await getLearningAccessState(pool, 'nonexistent-user');

    expect(state.controlled).toBe(false);
    expect(state.allowed).toBe(true);
  });
});
