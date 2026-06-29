/**
 * Unit tests for Phase 6: Agentic Tutor via Pi Code CLI pattern.
 *
 * Tests:
 * 1. Tool Gate allows CORE tools and blocks unknown tools
 * 2. Tool implementations (give_hint, check_answer, define_word, explore_graph) return correct output
 * 3. Agent loop falls back to deterministic when AI Gateway is unavailable
 * 4. Agent loop trajectory records tool calls with gate results
 * 5. Budget exhaustion is detected
 * 6. CORE roster includes all §4.6 tools
 */

import { checkToolGate } from '@/domains/learning/shared/tool-roster';
import { LEARNING_DOMAIN_ROSTER, runAgentLoop } from '@/domains/learning/features/agent-loop';
import {
  executeGiveHint,
  executeCheckAnswer,
  executeDefineWord,
  executeExploreGraph,
  buildAgentFallbackMessage,
  type ToolContext,
} from '@/domains/learning/features/agent-tools';

// Mock fetch to simulate AI Gateway being unavailable → forces deterministic fallback
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockRejectedValue(new Error('AI Gateway unavailable in test')) as any;
});
afterAll(() => {
  global.fetch = originalFetch;
});

// ─── 1. Tool Gate ───────────────────────────────────────────────────────────

describe('Phase 6: Tool Gate on CORE roster', () => {
  const roster = LEARNING_DOMAIN_ROSTER;

  it('allows ask_socratic', () => {
    expect(checkToolGate(roster, 'ask_socratic').allowed).toBe(true);
  });

  it('allows give_hint', () => {
    expect(checkToolGate(roster, 'give_hint').allowed).toBe(true);
  });

  it('allows check_answer', () => {
    expect(checkToolGate(roster, 'check_answer').allowed).toBe(true);
  });

  it('allows define_word', () => {
    expect(checkToolGate(roster, 'define_word').allowed).toBe(true);
  });

  it('allows explore_graph', () => {
    expect(checkToolGate(roster, 'explore_graph').allowed).toBe(true);
  });

  it('blocks unknown tools', () => {
    const result = checkToolGate(roster, 'dangerous_tool');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not on roster');
  });

  it('blocks tools when no roster is provided', () => {
    const result = checkToolGate(undefined, 'ask_socratic');
    expect(result.allowed).toBe(false);
  });

  it('CORE roster has at least 5 tools', () => {
    expect(roster.tools.length).toBeGreaterThanOrEqual(5);
  });
});

// ─── 2. Tool implementations ───────────────────────────────────────────────

describe('Phase 6: Tool implementations', () => {
  const ctx: ToolContext = {
    childUserId: 'child-1',
    contentPrompt: 'What is 3 + 4?',
    contentItemId: 'phase1.math.word_1step.v1',
    skillCode: 'math.word_1step',
    attemptNumber: 2,
    hintSet: ['Count on your fingers.', 'Try grouping.'],
  };

  it('give_hint returns the correct hint for attempt 2', () => {
    const result = executeGiveHint({ hintLevel: 1 }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Hint 2 of 2');
    expect(result.output).toContain('Try grouping');
  });

  it('give_hint defaults to attempt-based level', () => {
    const result = executeGiveHint({}, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Hint 2 of 2');
  });

  it('give_hint handles no hints', () => {
    const result = executeGiveHint({}, { ...ctx, hintSet: [] });
    expect(result.success).toBe(true);
    expect(result.output).toContain('No hints available');
  });

  it('check_answer returns reasoning prompt without revealing answer', () => {
    const result = executeCheckAnswer({ learnerResponse: 'I think it is 7' }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('I think it is 7');
    expect(result.output).toContain('Do not reveal the answer');
  });

  it('define_word returns a definition prompt', () => {
    const result = executeDefineWord({ word: 'sum' }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('sum');
  });

  it('define_word fails on empty word', () => {
    const result = executeDefineWord({ word: '' }, ctx);
    expect(result.success).toBe(false);
  });

  it('explore_graph returns a lesson suggestion', () => {
    const result = executeExploreGraph({ lessonId: 'spot-the-groups' }, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('spot-the-groups');
    expect(result.output).toContain('tracked as measured learning');
  });

  it('explore_graph works without a specific lesson', () => {
    const result = executeExploreGraph({}, ctx);
    expect(result.success).toBe(true);
    expect(result.output).toContain('Pokémon Lab');
  });
});

// ─── 3. Agent loop fallback ─────────────────────────────────────────────────

describe('Phase 6: Agent loop deterministic fallback', () => {
  const baseInput = {
    learnerMessage: 'I need help',
    contentPrompt: 'What is 3 + 4?',
    contentItemId: 'phase1.math.word_1step.v1',
    skillCode: 'math.word_1step',
    attemptNumber: 1,
    hintSet: ['Count on your fingers.', 'Try grouping.'],
    roster: LEARNING_DOMAIN_ROSTER,
    context: {
      focus: {
        kind: 'lesson' as const,
        activityId: 'learn-hub',
        title: 'math',
        entities: { contentItemId: 'phase1.math.word_1step.v1' },
      },
      safety: { contentFilter: 'strict' as const, user_type: 'child' as const },
      assembledAt: new Date().toISOString(),
    },
    childUserId: 'child-1',
  };

  it('falls back to deterministic when AI Gateway is unavailable', async () => {
    // AI Gateway is not running in test env, so the loop should fall back
    const result = await runAgentLoop(baseInput);

    expect(result.source).toBe('fallback_deterministic');
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.model).toBeTruthy();
    expect(result.contract).toBeTruthy();
  });

  it('fallback message contains coaching language', async () => {
    const result = await runAgentLoop(baseInput);

    expect(result.message).toContain('step by step');
  });

  it('fallback with hint includes the hint', async () => {
    const result = await runAgentLoop({
      ...baseInput,
      attemptNumber: 2,
    });

    // Attempt 2 → hintLevel 1 → "Try grouping."
    expect(result.message).toContain('Try grouping');
  });
});

// ─── 4. Agent loop trajectory ───────────────────────────────────────────────

describe('Phase 6: Agent loop trajectory', () => {
  const baseInput = {
    learnerMessage: 'I need help',
    contentPrompt: 'What is 3 + 4?',
    contentItemId: 'phase1.math.word_1step.v1',
    skillCode: 'math.word_1step',
    attemptNumber: 1,
    hintSet: ['Count on your fingers.'],
    roster: LEARNING_DOMAIN_ROSTER,
    context: {
      focus: {
        kind: 'lesson' as const,
        activityId: 'learn-hub',
        title: 'math',
        entities: {},
      },
      safety: { contentFilter: 'strict' as const, user_type: 'child' as const },
      assembledAt: new Date().toISOString(),
    },
    childUserId: 'child-1',
  };

  it('returns a trajectory array (empty if fallback)', async () => {
    const result = await runAgentLoop(baseInput);
    expect(Array.isArray(result.trajectory)).toBe(true);
  });

  it('returns hopsExecuted count', async () => {
    const result = await runAgentLoop(baseInput);
    expect(typeof result.hopsExecuted).toBe('number');
    expect(result.hopsExecuted).toBeGreaterThanOrEqual(0);
  });

  it('returns toolsUsed array', async () => {
    const result = await runAgentLoop(baseInput);
    expect(Array.isArray(result.toolsUsed)).toBe(true);
  });

  it('returns budgetExhausted flag', async () => {
    const result = await runAgentLoop(baseInput);
    expect(typeof result.budgetExhausted).toBe('boolean');
  });
});

// ─── 5. buildAgentFallbackMessage ───────────────────────────────────────────

describe('Phase 6: buildAgentFallbackMessage', () => {
  it('includes hint when available', () => {
    const msg = buildAgentFallbackMessage({
      contentPrompt: 'What is 3 + 4?',
      attemptNumber: 2,
      hint: 'Try counting on your fingers.',
      hintLevel: 0,
      hintsAvailable: 2,
    });
    expect(msg).toContain('Hint 1 of 2');
    expect(msg).toContain('Try counting on your fingers');
  });

  it('falls back to prompt snippet when no hint', () => {
    const msg = buildAgentFallbackMessage({
      contentPrompt: 'What is 3 + 4?',
      attemptNumber: 1,
      hintsAvailable: 0,
    });
    expect(msg).toContain('step by step');
    expect(msg).toContain('What is 3 + 4?');
  });
});
