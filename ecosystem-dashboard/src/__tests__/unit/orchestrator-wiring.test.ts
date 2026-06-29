/**
 * Tests for AgentOrchestrator wiring in the tutor turn API.
 *
 * Verifies that the orchestrator produces recovery, introspection, and
 * budget fields that the API route now exposes.
 */

jest.mock('../../domains/learning/features/agent-loop', () => ({
  runAgentLoop: jest.fn(),
  LEARNING_DOMAIN_ROSTER: { id: 'test', tools: [] },
}));

import { runAgentLoop } from '../../domains/learning/features/agent-loop';
import {
  AgentOrchestrator,
} from '../../domains/learning/orchestrator/agent-orchestrator';
import {
  _resetIntrospectionLog,
  getIntrospectionLog,
} from '../../domains/learning/orchestrator/introspection-log';
import {
  _resetEventBus,
  getEventBus,
} from '../../domains/learning/shared/event-bus';
import {
  _resetAnalyticsCollector,
} from '../../domains/learning/analytics/analytics-collector';
import {
  _resetDreamConsolidator,
} from '../../domains/learning/processes/dream-consolidator';
import {
  _resetMasteryCalculator,
} from '../../domains/learning/learner/mastery-calculator';
import {
  _resetLearnerMemory,
} from '../../domains/learning/learner/learner-memory';
import {
  _resetLearnerProfileService,
} from '../../domains/learning/learner/learner-profile';
import {
  _resetPatternDetector,
} from '../../domains/learning/analytics/pattern-detector';
import {
  _resetDreamEngine,
} from '../../domains/learning/analytics/dream-engine';

const mockedRunAgentLoop = runAgentLoop as jest.MockedFunction<typeof runAgentLoop>;

function resetAll() {
  _resetEventBus();
  _resetAnalyticsCollector();
  _resetDreamConsolidator();
  _resetMasteryCalculator();
  _resetLearnerMemory();
  _resetLearnerProfileService();
  _resetPatternDetector();
  _resetDreamEngine();
  _resetIntrospectionLog();
}

function makeMockResult(overrides: Partial<{ message: string; source: string; toolsUsed: string[]; hopsExecuted: number; budgetExhausted: boolean }> = {}) {
  return {
    message: overrides.message || 'Here is a hint: try counting the objects first.',
    source: overrides.source || 'agent_loop',
    toolsUsed: overrides.toolsUsed || ['ask_socratic'],
    hopsExecuted: overrides.hopsExecuted ?? 1,
    budgetExhausted: overrides.budgetExhausted ?? false,
    model: 'minimax-m3',
    contract: 'learn-tutor-v1',
    trajectory: [],
  };
}

describe('AgentOrchestrator wiring', () => {
  beforeEach(() => {
    resetAll();
    mockedRunAgentLoop.mockReset();
  });

  it('runTurn returns introspection entry with self-assessment', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'I need help with this problem',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: ['Try counting on your fingers'],
    });

    expect(result.introspection).toBeDefined();
    expect(result.introspection.selfAssessment).toBeDefined();
    expect(result.introspection.childId).toBe('child-1');
    expect(result.introspection.turnId).toBeTruthy();
    expect(typeof result.introspection.selfAssessment.didIHelp).toBe('boolean');
    expect(typeof result.introspection.selfAssessment.wasIClear).toBe('boolean');
    expect(typeof result.introspection.selfAssessment.wasIConcise).toBe('boolean');
  });

  it('runTurn returns recovery level 0 for normal agent_loop source', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult({ source: 'agent_loop' }) as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help me',
      contentItemId: 'item-1',
      contentPrompt: 'What is 3 + 5?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(result.recoveryLevel).toBe(0);
    expect(result.source).toBe('agent_loop');
  });

  it('runTurn returns recovery level 2 for fallback_deterministic source', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult({ source: 'fallback_deterministic' }) as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help me',
      contentItemId: 'item-1',
      contentPrompt: 'What is 3 + 5?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(result.recoveryLevel).toBe(2);
    expect(result.source).toBe('fallback_deterministic');
  });

  it('runTurn enters recovery when runAgentLoop throws', async () => {
    mockedRunAgentLoop.mockRejectedValue(new Error('AI Gateway down'));

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help me',
      contentItemId: 'item-1',
      contentPrompt: 'What is 3 + 5?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: ['Try counting'],
    });

    expect(result.source).toBe('recovery');
    expect(result.recoveryLevel).toBeGreaterThanOrEqual(2);
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(10);
  });

  it('runTurn emits turn.complete event on the Event Bus', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const bus = getEventBus();
    const events: Array<{ childId: string; source: string }> = [];

    bus.on('turn.complete', (e) => {
      events.push({ childId: e.payload.childId, source: e.payload.source });
    });

    const orchestrator = new AgentOrchestrator();
    await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(events).toHaveLength(1);
    expect(events[0].childId).toBe('child-1');
    expect(events[0].source).toBe('agent_loop');
  });

  it('runTurn records introspection entry in the log', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help me',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    const log = getIntrospectionLog();
    const entries = log.getEntries('child-1', 5);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].childId).toBe('child-1');
  });

  it('runTurn returns latency in milliseconds', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.latencyMs).toBeLessThan(10000);
  });

  it('runTurn returns toolsUsed and hopsExecuted', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult({
      toolsUsed: ['ask_socratic', 'give_hint'],
      hopsExecuted: 2,
    }) as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-1',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(Array.isArray(result.toolsUsed)).toBe(true);
    expect(result.toolsUsed).toEqual(['ask_socratic', 'give_hint']);
    expect(result.hopsExecuted).toBe(2);
  });

  it('runTurn with sessionId passes it through to the event', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const bus = getEventBus();
    const sessionIds: string[] = [];

    bus.on('turn.complete', (e) => {
      sessionIds.push(e.payload.sessionId || '');
    });

    const orchestrator = new AgentOrchestrator();
    await orchestrator.runTurn({
      childId: 'child-1',
      sessionId: 'sess-123',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
    });

    expect(sessionIds).toContain('sess-123');
  });

  it('runTurn returns an adaptation plan with pacing and difficulty', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-adapt',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
      mastery: {
        currentSkill: 'math.add',
        skillMastery: { 'math.add': 0.2 },
        sessionCorrect: 1,
        sessionAttempts: 5,
        currentStreak: 0,
      },
    });

    expect(result.adaptationPlan).toBeDefined();
    expect(result.adaptationPlan!.pacing).toBe('slow');
    expect(result.adaptationPlan!.difficulty).toBeGreaterThanOrEqual(1);
    expect(result.adaptationPlan!.hintEscalationSpeed).toBe('immediate');
  });

  it('runTurn resolves persona based on activityId', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-persona',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'Draw a cat',
      skillCode: 'creative.drawing',
      attemptNumber: 1,
      hintSet: [],
      activityId: 'art-studio',
    });

    expect(result.personaId).toBeDefined();
    expect(result.personaName).toBeDefined();
    // art-studio has Artist Pusheen affinity
    expect(result.personaId).toBe('artist-pusheen');
  });

  it('runTurn resolves persona for learn-hub activity', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-persona-2',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
      activityId: 'learn-hub',
    });

    expect(result.personaId).toBe('professor-oak');
  });

  it('runTurn passes resolved persona to the agent loop', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    await orchestrator.runTurn({
      childId: 'child-persona-3',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'Draw a cat',
      skillCode: 'creative.drawing',
      attemptNumber: 1,
      hintSet: [],
      activityId: 'art-studio',
    });

    expect(mockedRunAgentLoop).toHaveBeenCalledTimes(1);
    const callArg = mockedRunAgentLoop.mock.calls[0][0] as any;
    expect(callArg.persona).toBeDefined();
    expect(callArg.persona.id).toBe('artist-pusheen');
  });

  it('runTurn adaptation plan adjusts for high mastery', async () => {
    mockedRunAgentLoop.mockResolvedValue(makeMockResult() as any);

    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.runTurn({
      childId: 'child-high-mastery',
      message: 'Help',
      contentItemId: 'item-1',
      contentPrompt: 'What is 2 + 2?',
      skillCode: 'math.add',
      attemptNumber: 1,
      hintSet: [],
      mastery: {
        currentSkill: 'math.add',
        skillMastery: { 'math.add': 0.9 },
        sessionCorrect: 8,
        sessionAttempts: 10,
        currentStreak: 5,
      },
    });

    expect(result.adaptationPlan).toBeDefined();
    expect(result.adaptationPlan!.pacing).toBe('fast');
    expect(result.adaptationPlan!.hintEscalationSpeed).toBe('delayed');
    expect(result.adaptationPlan!.stretchChallengeProbability).toBeGreaterThan(0);
  });
});
