import {
  getEventBus,
  _resetEventBus,
} from '../../domains/learning/shared/event-bus';
import {
  personaRegistry,
  resolvePersona,
  toPersonaRef,
} from '../../domains/learning/personas';
import {
  lessonRegistry,
  evaluateLifecycle,
} from '../../domains/learning/curriculum';
import type { Lesson } from '../../domains/learning/curriculum';
import {
  getLearnerMemory,
  _resetLearnerMemory,
  getMasteryCalculator,
  _resetMasteryCalculator,
  computeAdaptation,
  getLearnerProfileService,
  _resetLearnerProfileService,
  createLearnerProfile,
} from '../../domains/learning/learner';
import {
  getAnalyticsCollector,
  _resetAnalyticsCollector,
  getPatternDetector,
  _resetPatternDetector,
  getDreamEngine,
  _resetDreamEngine,
} from '../../domains/learning/analytics';
import {
  getDreamConsolidator,
  _resetDreamConsolidator,
} from '../../domains/learning/processes/dream-consolidator';
import {
  BudgetManager,
  runRecovery,
  getIntrospectionLog,
  _resetIntrospectionLog,
  autoAssess,
  nextTurnState,
  isTerminal,
} from '../../domains/learning/orchestrator';

// ─── Event Bus ──────────────────────────────────────────────────────────────

describe('Event Bus', () => {
  beforeEach(() => _resetEventBus());

  it('emits and receives typed events', () => {
    const bus = getEventBus();
    const received: string[] = [];

    bus.on('turn.complete', (e) => {
      received.push(e.payload.childId);
    });

    bus.emit('turn.complete', {
      childId: 'child-1',
      toolsUsed: ['ask_socratic'],
      hopsExecuted: 1,
      latencyMs: 100,
      source: 'agent_loop',
      timestamp: Date.now(),
    });

    expect(received).toEqual(['child-1']);
  });

  it('supports multiple subscribers', () => {
    const bus = getEventBus();
    let count = 0;

    bus.on('attempt.graded', () => { count++; });
    bus.on('attempt.graded', () => { count++; });

    bus.emit('attempt.graded', {
      childId: 'c1',
      contentItemId: 'item-1',
      skillCode: 'math.add',
      correct: true,
      attemptNumber: 1,
      timestamp: Date.now(),
    });

    expect(count).toBe(2);
  });

  it('unsubscribe stops receiving', () => {
    const bus = getEventBus();
    let count = 0;

    const unsub = bus.on('mastery.changed', () => { count++; });
    bus.emit('mastery.changed', {
      childId: 'c1',
      skillCode: 'math.add',
      oldMastery: 0.5,
      newMastery: 0.7,
      timestamp: Date.now(),
    });
    expect(count).toBe(1);

    unsub();
    bus.emit('mastery.changed', {
      childId: 'c1',
      skillCode: 'math.add',
      oldMastery: 0.7,
      newMastery: 0.8,
      timestamp: Date.now(),
    });
    expect(count).toBe(1);
  });

  it('stores recent event history', () => {
    const bus = getEventBus();
    bus.emit('session.opened', { childId: 'c1', sessionId: 's1', timestamp: 1 });
    bus.emit('session.closed', {
      childId: 'c1',
      sessionId: 's1',
      timestamp: 2,
      stats: { correctCount: 3, totalAttempts: 5, bestStreak: 2, durationSeconds: 300, skillsPracticed: ['math.add'] },
    });

    expect(bus.recent()).toHaveLength(2);
    expect(bus.recent('session.opened')).toHaveLength(1);
  });
});

// ─── Persona System ─────────────────────────────────────────────────────────

describe('Persona System', () => {
  it('has Buddy as default persona', () => {
    const buddy = personaRegistry.get('buddy');
    expect(buddy).toBeDefined();
    expect(buddy!.name).toBe('Buddy');
    expect(buddy!.universal).toBe(true);
  });

  it('has Professor Oak with scientific archetype', () => {
    const oak = personaRegistry.get('professor-oak');
    expect(oak).toBeDefined();
    expect(oak!.archetype).toBe('scientist');
    expect(oak!.skillAffinities).toContain('math.word_1step');
  });

  it('resolves to learner preferred persona when compatible', () => {
    const result = resolvePersona({
      activityId: 'learn-hub',
      skillCodes: ['math.add'],
      learnerPreferredPersonaId: 'professor-oak',
      learnerAge: 9,
    });
    expect(result.id).toBe('professor-oak');
  });

  it('falls back to Buddy when no match', () => {
    const result = resolvePersona({
      activityId: 'unknown-activity',
      skillCodes: ['unknown.skill'],
    });
    expect(result.id).toBe('buddy');
  });

  it('converts to legacy PersonaRef', () => {
    const buddy = personaRegistry.get('buddy')!;
    const ref = toPersonaRef(buddy);
    expect(ref.id).toBe('buddy');
    expect(ref.name).toBe('Buddy');
    expect(ref.systemPrompt).toBeDefined();
  });

  it('registers multiple personas', () => {
    expect(personaRegistry.all().length).toBeGreaterThanOrEqual(4);
    expect(personaRegistry.byArchetype('companion').length).toBeGreaterThanOrEqual(1);
    expect(personaRegistry.byArchetype('scientist').length).toBeGreaterThanOrEqual(1);
    expect(personaRegistry.byArchetype('artist').length).toBeGreaterThanOrEqual(1);
    expect(personaRegistry.byArchetype('explorer').length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Curriculum / Lesson Lifecycle ──────────────────────────────────────────

describe('Curriculum / Lesson Lifecycle', () => {
  it('has registered lessons', () => {
    const published = lessonRegistry.published();
    expect(published.length).toBeGreaterThanOrEqual(2);
    expect(published.some((l) => l.id === 'math.word_1step.v1')).toBe(true);
  });

  it('filters by skill', () => {
    const mathLessons = lessonRegistry.bySkill('math.word_1step');
    expect(mathLessons.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by difficulty', () => {
    const easy = lessonRegistry.byDifficulty(2, 1);
    expect(easy.some((l) => l.difficulty === 2)).toBe(true);
  });

  it('transitions lesson through lifecycle', () => {
    const testLesson: Lesson = {
      id: 'test.lesson.v1',
      title: 'Test Lesson',
      description: 'Test',
      skillCodes: ['test.skill'],
      difficulty: 1,
      estimatedMinutes: 5,
      version: 1,
      status: 'draft',
      steps: [],
      prerequisites: [],
      maturityThreshold: 0.8,
    };
    lessonRegistry.register(testLesson);

    expect(lessonRegistry.transition('test.lesson.v1', 'published')).toBe(true);
    expect(lessonRegistry.get('test.lesson.v1')!.status).toBe('published');

    // Invalid transition
    expect(lessonRegistry.transition('test.lesson.v1', 'draft')).toBe(false);
  });

  it('retires and archives lessons', () => {
    lessonRegistry.register({
      id: 'lifecycle.test.v1',
      title: 'Lifecycle Test',
      description: 'Test',
      skillCodes: ['test'],
      difficulty: 1,
      estimatedMinutes: 5,
      version: 1,
      status: 'published',
      steps: [],
      prerequisites: [],
      maturityThreshold: 0.8,
    });

    expect(lessonRegistry.retire('lifecycle.test.v1', 'test retirement')).toBe(true);
    expect(lessonRegistry.get('lifecycle.test.v1')!.status).toBe('retired');
    expect(lessonRegistry.get('lifecycle.test.v1')!.retiredAt).toBeDefined();

    expect(lessonRegistry.archive('lifecycle.test.v1')).toBe(true);
    expect(lessonRegistry.get('lifecycle.test.v1')!.status).toBe('archived');
  });

  it('evaluates lifecycle transitions', () => {
    const lesson: Lesson = {
      id: 'eval.test.v1',
      title: 'Eval Test',
      description: 'Test',
      skillCodes: ['test'],
      difficulty: 1,
      estimatedMinutes: 5,
      version: 1,
      status: 'published',
      steps: [],
      prerequisites: [],
      maturityThreshold: 0.75,
    };

    // Should promote to mature
    const promote = evaluateLifecycle(lesson, { cohortMastery: 0.8 });
    expect(promote).not.toBeNull();
    expect(promote!.to).toBe('mature');

    // Should not promote
    const noPromote = evaluateLifecycle(lesson, { cohortMastery: 0.5 });
    expect(noPromote).toBeNull();
  });
});

// ─── Learner Profile + Memory ───────────────────────────────────────────────

describe('Learner Profile + Memory', () => {
  beforeEach(() => {
    _resetLearnerMemory();
    _resetMasteryCalculator();
    _resetLearnerProfileService();
  });

  it('creates learner profiles', () => {
    const profile = createLearnerProfile('c1', 'Luca', 'middle');
    expect(profile.childId).toBe('c1');
    expect(profile.displayName).toBe('Luca');
    expect(profile.skillMastery).toEqual({});
  });

  it('records and recalls conversation turns', () => {
    const memory = getLearnerMemory();
    memory.recordTurn('s1', { role: 'user', content: 'What is 2+2?' });
    memory.recordTurn('s1', { role: 'assistant', content: 'Let us count together.' });

    const turns = memory.recallTurns('s1');
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe('user');
    expect(turns[1].role).toBe('assistant');
  });

  it('consolidates sessions into journal entries', () => {
    const memory = getLearnerMemory();
    memory.recordTurn('s1', { role: 'user', content: 'hi', toolsUsed: [] });

    const entry = memory.consolidateSession(
      'c1',
      's1',
      { correctCount: 3, totalAttempts: 5, bestStreak: 2, durationSeconds: 300, skillsPracticed: ['math.add'] },
      'Practiced addition, got 3/5 right',
    );

    expect(entry.sessionId).toBe('s1');
    expect(entry.correctCount).toBe(3);
    expect(entry.skillsPracticed).toContain('math.add');

    // Turns should be cleared after consolidation
    expect(memory.recallTurns('s1')).toHaveLength(0);

    // Journal should have the entry
    const journal = memory.getJournal('c1');
    expect(journal).toHaveLength(1);
  });

  it('updates mastery with EMA', () => {
    const calc = getMasteryCalculator();
    const m1 = calc.update({ childId: 'c1', skillCode: 'math.add', correct: true, timestamp: 1, attemptNumber: 1 });
    expect(m1).toBeGreaterThan(0.5);

    const m2 = calc.update({ childId: 'c1', skillCode: 'math.add', correct: false, timestamp: 2, attemptNumber: 2 });
    expect(m2).toBeLessThan(m1);
  });

  it('computes adaptation plans', () => {
    const profile = createLearnerProfile('c1', 'Luca', 'middle', {
      skillMastery: { 'math.add': 0.9 },
      preferredDifficulty: 3,
    });

    const plan = computeAdaptation(profile, {
      skillMastery: { 'math.add': 0.9 },
      currentSkill: 'math.add',
      sessionCorrect: 5,
      sessionAttempts: 5,
      currentStreak: 4,
    });

    expect(plan.pacing).toBe('fast');
    expect(plan.difficulty).toBeGreaterThanOrEqual(3);
    expect(plan.hintEscalationSpeed).toBe('delayed');
    expect(plan.stretchChallengeProbability).toBeGreaterThan(0);
  });

  it('adapts for struggling learners', () => {
    const profile = createLearnerProfile('c1', 'Luca', 'middle', {
      skillMastery: { 'math.sub': 0.2 },
      preferredDifficulty: 3,
    });

    const plan = computeAdaptation(profile, {
      skillMastery: { 'math.sub': 0.2 },
      currentSkill: 'math.sub',
      sessionCorrect: 1,
      sessionAttempts: 5,
      currentStreak: 0,
    });

    expect(plan.pacing).toBe('slow');
    expect(plan.hintEscalationSpeed).toBe('immediate');
    expect(plan.stretchChallengeProbability).toBe(0);
  });
});

// ─── Analytics + Dreams ─────────────────────────────────────────────────────

describe('Analytics + Dreams', () => {
  beforeEach(() => {
    _resetAnalyticsCollector();
    _resetPatternDetector();
    _resetDreamEngine();
    _resetEventBus();
  });

  it('collects analytics from events', () => {
    const collector = getAnalyticsCollector();
    collector.start();

    const bus = getEventBus();
    bus.emit('attempt.graded', {
      childId: 'c1',
      contentItemId: 'item-1',
      skillCode: 'math.add',
      correct: true,
      attemptNumber: 1,
      timestamp: Date.now(),
    });
    bus.emit('turn.complete', {
      childId: 'c1',
      toolsUsed: ['ask_socratic'],
      hopsExecuted: 1,
      latencyMs: 200,
      source: 'agent_loop',
      timestamp: Date.now(),
    });

    const snap = collector.snapshot('c1');
    expect(snap.totalAttempts).toBe(1);
    expect(snap.correctRate).toBe(1);
    expect(snap.toolUsage['ask_socratic']).toBe(1);

    collector.stop();
  });

  it('detects struggle patterns', () => {
    const detector = getPatternDetector();
    const snapshots = Array.from({ length: 5 }, () => ({
      childId: 'c1',
      period: 'daily' as const,
      periodStart: 0,
      periodEnd: 0,
      totalAttempts: 10,
      correctRate: 0.2,
      averageLatencyMs: 1000,
      skillsTouched: ['math.sub'],
      masteryDeltas: {},
      engagementScore: 0.5,
      toolUsage: {},
      bestStreak: 0,
      totalSessions: 1,
    }));

    const patterns = detector.detect('c1', snapshots);
    expect(patterns.some((p) => p.type === 'struggle_pattern')).toBe(true);
  });

  it('generates dream insights from snapshots + patterns', () => {
    const dreamEngine = getDreamEngine();
    const snapshots = Array.from({ length: 5 }, (_, i) => ({
      childId: 'c1',
      period: 'daily' as const,
      periodStart: i,
      periodEnd: i + 1,
      totalAttempts: 10,
      correctRate: 0.3,
      averageLatencyMs: 800,
      skillsTouched: ['math.sub'],
      masteryDeltas: { 'math.sub': -0.1 },
      engagementScore: 0.4,
      toolUsage: { ask_socratic: 5 },
      bestStreak: 1,
      totalSessions: 1,
    }));

    const patterns = [
      {
        id: 'p1',
        childId: 'c1',
        type: 'struggle_pattern' as const,
        confidence: 0.8,
        description: 'Struggling with math.sub',
        evidence: {},
        detectedAt: Date.now(),
      },
    ];

    const insights = dreamEngine.consolidate({ childId: 'c1', snapshots, patterns });
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((i) => i.actionable)).toBe(true);
  });
});

// ─── Dream Consolidator ─────────────────────────────────────────────────────

describe('Dream Consolidator', () => {
  beforeEach(() => {
    _resetDreamConsolidator();
    _resetEventBus();
    _resetAnalyticsCollector();
    _resetPatternDetector();
    _resetDreamEngine();
  });

  it('starts and stops listening', () => {
    const consolidator = getDreamConsolidator();
    consolidator.start();
    consolidator.stop();
    // Should not throw
    expect(true).toBe(true);
  });
});

// ─── Orchestrator ───────────────────────────────────────────────────────────

describe('Orchestrator: Turn State Machine', () => {
  it('transitions through the cognitive loop', () => {
    expect(nextTurnState({
      currentState: 'perceive', hopCount: 0, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('reason');

    expect(nextTurnState({
      currentState: 'reason', hopCount: 0, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('plan');

    expect(nextTurnState({
      currentState: 'plan', hopCount: 0, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('act');

    expect(nextTurnState({
      currentState: 'act', hopCount: 0, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('observe');

    expect(nextTurnState({
      currentState: 'observe', hopCount: 0, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('reflect');
  });

  it('loops back to reason when no final message and budget remains', () => {
    expect(nextTurnState({
      currentState: 'reflect', hopCount: 1, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('reason');
  });

  it('goes to done when final message exists', () => {
    expect(nextTurnState({
      currentState: 'reflect', hopCount: 1, maxHops: 3, hasFinalMessage: true, recoveryAttempts: 0,
    })).toBe('done');
  });

  it('goes to done when budget exhausted', () => {
    expect(nextTurnState({
      currentState: 'reflect', hopCount: 3, maxHops: 3, hasFinalMessage: false, recoveryAttempts: 0,
    })).toBe('done');
  });

  it('identifies terminal states', () => {
    expect(isTerminal('done')).toBe(true);
    expect(isTerminal('failed')).toBe(true);
    expect(isTerminal('perceive')).toBe(false);
  });
});

describe('Orchestrator: Budget Manager', () => {
  it('tracks hop usage', () => {
    const budget = new BudgetManager({ maxHops: 3 });
    expect(budget.remaining().hops).toBe(3);

    budget.recordHop(100, 500);
    expect(budget.remaining().hops).toBe(2);
    expect(budget.fractionUsed()).toBeGreaterThan(0);
  });

  it('escalates to allow more hops', () => {
    const budget = new BudgetManager({ maxHops: 3, maxTokens: 1000, maxLatencyMs: 10000, escalationStep: 2 });
    budget.recordHop(100, 500);
    budget.recordHop(100, 500);
    budget.recordHop(100, 500);
    expect(budget.exhausted()).toBe(true);

    budget.escalate();
    expect(budget.remaining().hops).toBe(2);
    expect(budget.exhausted()).toBe(false);
  });

  it('resets', () => {
    const budget = new BudgetManager({ maxHops: 3 });
    budget.recordHop(100, 500);
    budget.reset();
    expect(budget.remaining().hops).toBe(3);
  });
});

describe('Orchestrator: Recovery Strategies', () => {
  it('produces deterministic fallback at level 2', () => {
    const result = runRecovery({
      level: 2,
      contentPrompt: 'What is 4 + 5?',
      attemptNumber: 2,
      hintSet: ['Start with 4', 'Count on 5 more', '4 + 5 = ?'],
    });
    expect(result.recovered).toBe(true);
    expect(result.source).toBe('deterministic');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('produces static encouragement at level 3', () => {
    const result = runRecovery({
      level: 3,
      contentPrompt: 'What is 4 + 5?',
      attemptNumber: 1,
      hintSet: [],
      childName: 'Luca',
    });
    expect(result.recovered).toBe(true);
    expect(result.source).toBe('static');
    expect(result.message).toContain('Luca');
  });

  it('produces emergency message at level 4', () => {
    const result = runRecovery({
      level: 4,
      contentPrompt: 'test',
      attemptNumber: 1,
      hintSet: [],
    });
    expect(result.recovered).toBe(false);
    expect(result.source).toBe('emergency');
  });
});

describe('Orchestrator: Introspection', () => {
  beforeEach(() => _resetIntrospectionLog());

  it('records and retrieves introspection entries', () => {
    const log = getIntrospectionLog();
    log.record({
      turnId: 't1',
      childId: 'c1',
      timestamp: Date.now(),
      selfAssessment: {
        didIHelp: true,
        wasIClear: true,
        wasIConcise: true,
        stayedInBounds: true,
      },
      toolsUsed: ['ask_socratic'],
      hopsTaken: 1,
      budgetUsed: 0.3,
      learnerEngagement: 'high',
      source: 'agent_loop',
    });

    const entries = log.getEntries('c1');
    expect(entries).toHaveLength(1);
    expect(entries[0].selfAssessment.didIHelp).toBe(true);
  });

  it('computes aggregate scores', () => {
    const log = getIntrospectionLog();
    for (let i = 0; i < 5; i++) {
      log.record({
        turnId: `t${i}`,
        childId: 'c1',
        timestamp: Date.now(),
        selfAssessment: {
          didIHelp: i < 4,
          wasIClear: true,
          wasIConcise: i < 3,
          stayedInBounds: true,
        },
        toolsUsed: [],
        hopsTaken: 1,
        budgetUsed: 0.3,
        learnerEngagement: 'medium',
        source: 'agent_loop',
      });
    }

    const agg = log.getAggregate('c1');
    expect(agg.totalTurns).toBe(5);
    expect(agg.helpRate).toBe(0.8);
    expect(agg.concisenessRate).toBe(0.6);
  });

  it('auto-assesses turn quality', () => {
    const assessment = autoAssess({
      message: 'Great job! Try counting from 4 onward.',
      source: 'agent_loop',
      hopsTaken: 1,
      maxHops: 3,
      toolsUsed: ['give_hint'],
      contentPrompt: 'What is 4 + 5?',
    });

    expect(assessment.didIHelp).toBe(true);
    expect(assessment.wasIClear).toBe(true);
    expect(assessment.wasIConcise).toBe(true);
  });
});
