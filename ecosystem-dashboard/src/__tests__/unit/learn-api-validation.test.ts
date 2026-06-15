import { asSingleQuery as contentAsSingleQuery, isAgeBand as isContentAgeBand } from '../../pages/api/learn/content';
import { parseBool } from '../../pages/api/learn/attempt';
import { asSingleQuery as planAsSingleQuery, isAgeBand as isPlanAgeBand } from '../../pages/api/learn/plan';
import { validateCreateSessionPayload } from '../../pages/api/learn/session';
import { validateUpdateSessionPayload } from '../../pages/api/learn/session/[id]';
import {
  buildDeterministicTutorMessage,
  validateTutorTurnPayload,
} from '../../pages/api/learn/tutor/turn';

describe('learn API validation helpers', () => {
  it('normalizes single query values for content and plan routes', () => {
    expect(contentAsSingleQuery(undefined)).toBe('');
    expect(contentAsSingleQuery('middle')).toBe('middle');
    expect(contentAsSingleQuery(['early', 'tween'])).toBe('early');

    expect(planAsSingleQuery(undefined)).toBe('');
    expect(planAsSingleQuery(['child-1'])).toBe('child-1');
  });

  it('validates age bands in content and plan routes', () => {
    expect(isContentAgeBand('early')).toBe(true);
    expect(isContentAgeBand('middle')).toBe(true);
    expect(isContentAgeBand('tween')).toBe(true);
    expect(isContentAgeBand('late')).toBe(false);

    expect(isPlanAgeBand('early')).toBe(true);
    expect(isPlanAgeBand('late')).toBe(false);
  });

  it('parses bool-like env values for attempt route', () => {
    expect(parseBool(undefined, true)).toBe(true);
    expect(parseBool(undefined, false)).toBe(false);
    expect(parseBool('true', false)).toBe(true);
    expect(parseBool('yes', false)).toBe(true);
    expect(parseBool('0', true)).toBe(false);
  });

  it('validates create session payload', () => {
    const invalid = validateCreateSessionPayload({ childId: '' });
    expect('error' in invalid && invalid.error).toBe('childId is required');

    const valid = validateCreateSessionPayload({
      childId: 'child-123',
      status: 'started',
      plan: { objectiveCount: 3 },
      activities: [{ kind: 'practice' }],
    });

    expect('value' in valid).toBe(true);
    if ('value' in valid) {
      expect(valid.value.childId).toBe('child-123');
      expect(valid.value.status).toBe('started');
      expect(valid.value.activities?.length).toBe(1);
    }
  });

  it('validates update session payload', () => {
    const invalidStatus = validateUpdateSessionPayload({ status: 'done' });
    expect('error' in invalidStatus).toBe(true);

    const invalidDate = validateUpdateSessionPayload({ endedAt: 'not-a-date' });
    expect('error' in invalidDate).toBe(true);

    const valid = validateUpdateSessionPayload({
      status: 'completed',
      endedAt: '2026-01-01T00:00:00.000Z',
      durationSeconds: 120,
      outcomes: { masterySignals: 1 },
    });

    expect('value' in valid).toBe(true);
    if ('value' in valid) {
      expect(valid.value.status).toBe('completed');
      expect(valid.value.durationSeconds).toBe(120);
    }
  });

  it('validates tutor turn payload', () => {
    const missing = validateTutorTurnPayload({ childId: 'child-1' });
    expect('error' in missing && missing.error).toBe('contentItemId is required');

    const tooLong = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'math.addition.1',
      message: 'a'.repeat(2001),
    });
    expect('error' in tooLong && tooLong.error).toBe('message must be <= 2000 characters');

    const valid = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'math.addition.1',
      message: 'I think it is 9',
      attemptNumber: 3,
      sessionId: 'sess-1',
    });

    expect('value' in valid).toBe(true);
    if ('value' in valid) {
      expect(valid.value.attemptNumber).toBe(3);
      expect(valid.value.sessionId).toBe('sess-1');
    }

    const withResponseAlias = validateTutorTurnPayload({
      childId: 'child-1',
      contentItemId: 'math.addition.1',
      response: 'Maybe it is 9',
    });

    expect('value' in withResponseAlias).toBe(true);
  });

  it('builds deterministic tutor guidance with and without hints', () => {
    const withHint = buildDeterministicTutorMessage({
      prompt: 'What is 4 + 5?',
      attemptNumber: 2,
      hint: 'Try counting from 4 up by five steps.',
      hintLevel: 1,
      hintsAvailable: 3,
    });
    expect(withHint).toContain('Hint 2 of 3:');
    expect(withHint).toContain('Try counting from 4 up by five steps.');

    const withoutHint = buildDeterministicTutorMessage({
      prompt: 'Read the passage and identify the main idea.',
      attemptNumber: 1,
      hintsAvailable: 0,
    });
    expect(withoutHint).toContain('Re-read the problem and focus on the key detail');
  });
});
