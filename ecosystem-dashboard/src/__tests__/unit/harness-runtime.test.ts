import { harnessEventBus } from '@/lib/harness/events/bus';
import { createHarnessEvent, HARNESS_EVENT_TYPES } from '@/lib/harness/events/types';
import {
  buildHarnessAgentResponse,
  buildHarnessAuditEnvelope,
  runHarnessPipeline,
  resolveHarnessChannel,
} from '@/lib/harness/runtime/pipeline';

describe('harness runtime helpers', () => {
  it('maps channel from source naming', () => {
    expect(resolveHarnessChannel('ai_gateway_learn_tutor')).toBe('ai_gateway');
    expect(resolveHarnessChannel('fallback_deterministic_learn_tutor')).toBe('deterministic_fallback');
    expect(resolveHarnessChannel('blocked')).toBe('blocked');
  });

  it('builds audit and response envelopes', () => {
    const startedAt = Date.now() - 10;

    const audit = buildHarnessAuditEnvelope({
      agentId: 'learn_tutor',
      model: 'qwen3-8b',
      contract: 'minor-restricted',
      startedAt,
      policyDecisions: ['auth:allow', 'payload:valid'],
      safetyInputResult: 'pass',
      safetyOutputResult: 'warn',
    });

    expect(audit.auditId).toBeTruthy();
    expect(audit.agentId).toBe('learn_tutor');
    expect(audit.safetyOutputResult).toBe('warn');
    expect(audit.latencyMs).toBeGreaterThanOrEqual(0);

    const response = buildHarnessAgentResponse({
      request: {
        requestId: 'req-1',
        domain: 'learning',
        agentId: 'learn_tutor',
        agentRole: 'tutor',
        userId: 'child-1',
        payload: {},
        priority: 'normal',
      },
      status: 'fallback',
      content: 'Try one more step.',
      source: 'fallback_deterministic_learn_tutor',
      model: 'qwen3-8b',
      contract: 'minor-restricted',
      audit,
    });

    expect(response.requestId).toBe('req-1');
    expect(response.status).toBe('fallback');
    expect(response.channel).toBe('deterministic_fallback');
    expect(response.audit.auditId).toBe(audit.auditId);
  });

  it('emits and receives harness events', async () => {
    const listener = jest.fn();
    const unsubscribe = harnessEventBus.subscribe(HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED, listener);

    const event = createHarnessEvent({
      domain: 'learning',
      type: HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED,
      userId: 'child-1',
      sessionId: 'sess-1',
      payload: {
        attemptNumber: 2,
      },
    });

    await harnessEventBus.emit(event);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        domain: 'learning',
        type: HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED,
        userId: 'child-1',
      }),
    );

    unsubscribe();
  });

  it('runs pipeline and emits events with audit refs', async () => {
    const attemptListener = jest.fn();
    const masteryListener = jest.fn();

    const unsubscribeAttempt = harnessEventBus.subscribe(HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED, attemptListener);
    const unsubscribeMastery = harnessEventBus.subscribe(HARNESS_EVENT_TYPES.MASTERY_UPDATED, masteryListener);

    const { audit, response } = await runHarnessPipeline({
      request: {
        requestId: 'req-2',
        domain: 'learning',
        agentId: 'learn_attempt',
        agentRole: 'evaluator',
        userId: 'child-1',
        payload: {},
        priority: 'normal',
      },
      startedAt: Date.now() - 5,
      policyDecisions: ['auth:allow', 'payload:valid'],
      safetyInputResult: 'pass',
      safetyOutputResult: 'pass',
      status: 'success',
      content: { score: 1 },
      source: 'deterministic_learn_attempt',
      model: 'deterministic_grade_engine',
      contract: 'learn-attempt-v1',
      events: [
        {
          type: HARNESS_EVENT_TYPES.ATTEMPT_SUBMITTED,
          payload: { requestId: 'req-2' },
        },
        {
          type: HARNESS_EVENT_TYPES.MASTERY_UPDATED,
          payload: { requestId: 'req-2' },
        },
      ],
    });

    expect(response.channel).toBe('deterministic_fallback');
    expect(audit.auditId).toBeTruthy();
    expect(attemptListener).toHaveBeenCalledWith(expect.objectContaining({ auditRef: audit.auditId }));
    expect(masteryListener).toHaveBeenCalledWith(expect.objectContaining({ auditRef: audit.auditId }));

    unsubscribeAttempt();
    unsubscribeMastery();
  });
});
