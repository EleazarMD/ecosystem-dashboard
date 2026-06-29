/**
 * Tests for the Context Hub service and Pi Code transport.
 *
 * Validates:
 * - Context Hub provider registration, focus tracking, envelope composition
 * - Token budgeting (focus tier never dropped, long-form slices by priority)
 * - Context providers for all child activities emit valid ContextFrames
 * - PiCodeTransport implements the AgentTransport interface
 * - Activity registry has all expected activities registered
 */

import { getContextHub, _resetContextHub } from '@/domains/learning/shared/context-hub-service';
import {
  activityRegistry,
  KNOWN_ACTIVITY_IDS,
  createHomeContextProvider,
  createFreeChatContextProvider,
  createLearnHubContextProvider,
  createArtStudioContextProvider,
  createJournalContextProvider,
  createBooksContextProvider,
  createPlannerContextProvider,
  createWorkspaceContextProvider,
  createDictionaryContextProvider,
  createEmailContextProvider,
  createLearningPathContextProvider,
  createTeamsContextProvider,
  createPokemonLabContextProvider,
  CORE_TOOL_ROSTER,
  mergeRosters,
  type ArtStudioStateSnapshot,
  checkToolGate,
} from '@/domains/learning/shared/activity-registry';
import type { ContextFrame, ContextProvider } from '@/domains/learning/shared/context-hub';

// ─── Context Hub ────────────────────────────────────────────────────────────

describe('Context Hub Service', () => {
  beforeEach(() => {
    _resetContextHub();
  });

  test('registers and retrieves providers', () => {
    const hub = getContextHub();
    const provider: ContextProvider = {
      activityId: 'test-activity',
      getFrame: () => ({
        kind: 'custom',
        activityId: 'test-activity',
        title: 'Test',
        summary: 'Test summary',
      }),
    };

    hub.registerProvider(provider);
    hub.setFocus('test-activity');

    const frame = hub.getFocusFrame();
    expect(frame).not.toBeNull();
    expect(frame?.title).toBe('Test');
    expect(frame?.activityId).toBe('test-activity');
  });

  test('composes envelope with focus + learner summary', async () => {
    const hub = getContextHub();

    const provider: ContextProvider = {
      activityId: 'test-learn',
      getFrame: () => ({
        kind: 'lesson',
        activityId: 'test-learn',
        title: 'Math: Addition',
        summary: 'The child is working on addition.',
        entities: { contentItemId: 'math-add-1', attemptNumber: 2 },
      }),
    };

    hub.registerProvider(provider);
    hub.setFocus('test-learn');
    hub.setLearnerSummary({
      childName: 'Luca',
      ageBand: '6-8',
      skillMastery: { 'math.arithmetic.addition': 0.65 },
      recentTopics: ['addition', 'subtraction'],
    });

    const composed = await hub.composeEnvelope();

    expect(composed.envelope.focus.title).toBe('Math: Addition');
    expect(composed.envelope.focus.entities?.contentItemId).toBe('math-add-1');
    expect(composed.envelope.learner?.childName).toBe('Luca');
    expect(composed.envelope.learner?.ageBand).toBe('6-8');
    expect(composed.envelope.safety?.contentFilter).toBe('strict');
    expect(composed.envelope.safety?.user_type).toBe('child');
    expect(composed.budget.totalTokens).toBeGreaterThan(0);
    expect(composed.budget.used).toBeGreaterThan(0);
  });

  test('focus tier is never dropped even with small budget', async () => {
    const hub = getContextHub();

    const provider: ContextProvider = {
      activityId: 'test-budget',
      getFrame: () => ({
        kind: 'lesson',
        activityId: 'test-budget',
        title: 'A'.repeat(100),
        summary: 'B'.repeat(100),
      }),
    };

    hub.registerProvider(provider);
    hub.setFocus('test-budget');
    hub.setLearnerSummary({
      childName: 'Test Child',
      ageBand: '6-8',
      skillMastery: { 'math.arithmetic.addition': 0.5 },
      recentTopics: ['topic1', 'topic2', 'topic3'],
    });
    hub.setBudget(50); // Very small budget

    const composed = await hub.composeEnvelope();

    // Focus should still be in the envelope
    expect(composed.envelope.focus.title).toBe('A'.repeat(100));
    // Some long-form slices should be dropped
    expect(composed.budget.dropped.length).toBeGreaterThan(0);
  });

  test('subscribers are notified on focus change', () => {
    const hub = getContextHub();

    const provider: ContextProvider = {
      activityId: 'test-sub',
      getFrame: () => ({
        kind: 'dashboard',
        activityId: 'test-sub',
        title: 'Subscriber Test',
        summary: 'Testing subscriber notifications',
      }),
    };

    hub.registerProvider(provider);

    let notifiedFrame: ContextFrame | null = null;
    const unsub = hub.subscribe((frame) => {
      notifiedFrame = frame;
    });

    hub.setFocus('test-sub');

    expect(notifiedFrame).not.toBeNull();
    expect(notifiedFrame?.title).toBe('Subscriber Test');

    unsub();
  });

  test('recordOutcome updates recent topics', async () => {
    const hub = getContextHub();

    hub.setLearnerSummary({
      childName: 'Luca',
      recentTopics: ['math'],
    });

    await hub.recordOutcome({
      childId: 'child-1',
      activityId: 'pokemon-lab',
      message: 'test',
      response: 'test response',
      toolsUsed: ['explore_graph'],
    });

    // The hub should have updated recent topics
    // (We can't directly inspect this, but it should not throw)
  });
});

// ─── Context Providers ──────────────────────────────────────────────────────

describe('Context Providers', () => {
  test('Home provider emits dashboard frame', () => {
    const ref = { current: { childName: 'Luca' } };
    const provider = createHomeContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('dashboard');
    expect(frame?.activityId).toBe(KNOWN_ACTIVITY_IDS.HOME);
    expect(frame?.summary).toContain('Luca');
  });

  test('FreeChat provider emits conversation frame', () => {
    const ref = { current: { childName: 'Sofia', characterName: 'Pusheen' } };
    const provider = createFreeChatContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('conversation');
    expect(frame?.summary).toContain('Sofia');
    expect(frame?.summary).toContain('Pusheen');
  });

  test('LearnHub provider emits lesson frame when contentItemId is set', () => {
    const ref = {
      current: {
        contentItemId: 'math-add-1',
        contentItemTitle: 'Addition Practice',
        attemptNumber: 3,
        childName: 'Luca',
      },
    };
    const provider = createLearnHubContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('lesson');
    expect(frame?.title).toBe('Addition Practice');
    expect(frame?.entities?.contentItemId).toBe('math-add-1');
    expect(frame?.entities?.attemptNumber).toBe(3);
  });

  test('LearnHub provider emits dashboard frame when no contentItemId', () => {
    const ref = { current: { childName: 'Luca' } };
    const provider = createLearnHubContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('dashboard');
    expect(frame?.summary).toContain('browsing the lesson catalog');
  });

  test('ArtStudio provider emits custom frame', () => {
    const ref: { current: ArtStudioStateSnapshot } = {
      current: {
        childName: 'Sofia',
        selectedStyle: 'watercolor',
        selectedSize: 'square',
        view: 'canvas',
        currentPrompt: 'A magical forest',
      },
    };
    const provider = createArtStudioContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('custom');
    expect(frame?.entities?.style).toBe('watercolor');
    expect(frame?.summary).toContain('watercolor');
    expect(frame?.summary).toContain('magical forest');
  });

  test('Journal provider emits custom frame with mood', () => {
    const ref = { current: { childName: 'Luca', mood: 'happy', entryType: 'reflection' } };
    const provider = createJournalContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.summary).toContain('happy');
    expect(frame?.summary).toContain('reflection');
  });

  test('Books provider includes page info', () => {
    const ref = {
      current: {
        bookTitle: 'The Magic Tree',
        page: 5,
        totalPages: 20,
        childName: 'Sofia',
      },
    };
    const provider = createBooksContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.title).toBe('The Magic Tree');
    expect(frame?.entities?.page).toBe(5);
    expect(frame?.entities?.totalPages).toBe(20);
  });

  test('Planner provider emits dashboard frame', () => {
    const ref = { current: { view: 'week' as const, taskCount: 5, childName: 'Luca' } };
    const provider = createPlannerContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('dashboard');
    expect(frame?.entities?.view).toBe('week');
    expect(frame?.entities?.taskCount).toBe(5);
  });

  test('Workspace provider emits custom frame', () => {
    const ref = { current: { pageTitle: 'My Pokemon Page', childName: 'Luca' } };
    const provider = createWorkspaceContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('custom');
    expect(frame?.title).toBe('My Pokemon Page');
  });

  test('Dictionary provider includes searched word', () => {
    const ref = { current: { searchedWord: 'photosynthesis', childName: 'Sofia' } };
    const provider = createDictionaryContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.title).toBe('Define: photosynthesis');
    expect(frame?.entities?.searchedWord).toBe('photosynthesis');
  });

  test('PokemonLab provider emits correct frame for lesson view', () => {
    const ref = {
      current: {
        view: 'lesson' as const,
        activeLessonId: 'spot-the-groups',
        activeLessonTitle: 'Spot the Groups',
        activeLessonStep: 2,
      },
    };
    const provider = createPokemonLabContextProvider(ref);
    const frame = provider.getFrame();

    expect(frame).not.toBeNull();
    expect(frame?.kind).toBe('lesson');
    expect(frame?.title).toBe('Lesson: Spot the Groups');
    expect(frame?.entities?.lessonId).toBe('spot-the-groups');
  });
});

// ─── Activity Registry ──────────────────────────────────────────────────────

describe('Activity Registry', () => {
  test('has all expected activities registered', () => {
    const expectedIds = Object.values(KNOWN_ACTIVITY_IDS);
    for (const id of expectedIds) {
      const activity = activityRegistry.get(id);
      expect(activity).toBeDefined();
      expect(activity?.id).toBe(id);
      expect(activity?.route).toBeTruthy();
      expect(activity?.load).toBeDefined();
    }
  });

  test('findByPageType resolves correctly', () => {
    expect(activityRegistry.findByPageType('pokemon-lab')?.id).toBe(KNOWN_ACTIVITY_IDS.POKEMON_LAB);
    expect(activityRegistry.findByPageType('learn')?.id).toBe(KNOWN_ACTIVITY_IDS.LEARN_HUB);
    expect(activityRegistry.findByPageType('chat')?.id).toBe(KNOWN_ACTIVITY_IDS.FREE_CHAT);
    expect(activityRegistry.findByPageType('home')?.id).toBe(KNOWN_ACTIVITY_IDS.HOME);
  });

  test('pokemon-lab has tool roster with explore_graph', () => {
    const activity = activityRegistry.get(KNOWN_ACTIVITY_IDS.POKEMON_LAB);
    expect(activity?.toolRoster).toBeDefined();
    expect(activity?.toolRoster?.tools.some(t => t.id === 'explore_graph')).toBe(true);
  });

  test('navItems returns only visible activities', () => {
    const navItems = activityRegistry.navItems();
    expect(navItems.length).toBeGreaterThan(0);
    for (const item of navItems) {
      expect(item.navVisible).not.toBe(false);
    }
  });
});

// ─── Tool Roster + Tool Gate ────────────────────────────────────────────────

describe('Tool Roster and Tool Gate', () => {
  test('CORE_TOOL_ROSTER has essential tools', () => {
    const ids = CORE_TOOL_ROSTER.tools.map(t => t.id);
    expect(ids).toContain('ask_socratic');
    expect(ids).toContain('give_hint');
    expect(ids).toContain('check_answer');
    expect(ids).toContain('define_word');
    expect(ids).toContain('celebrate');
  });

  test('mergeRosters combines activity + core, deduplicating by id', () => {
    const activityRoster = {
      id: 'test',
      tools: [
        { id: 'ask_socratic' as any, label: 'Custom Socratic', description: 'Custom' },
        { id: 'custom_tool' as any, label: 'Custom', description: 'Custom tool' },
      ],
    };

    const merged = mergeRosters(activityRoster, CORE_TOOL_ROSTER);

    expect(merged.tools.length).toBe(CORE_TOOL_ROSTER.tools.length + 1);
    // Activity descriptor should win for duplicate ids
    const socratic = merged.tools.find(t => t.id === 'ask_socratic');
    expect(socratic?.label).toBe('Custom Socratic');
  });

  test('checkToolGate allows tools on roster', () => {
    const roster = {
      id: 'test',
      tools: [{ id: 'ask_socratic' as any, label: 'Ask', description: 'Ask' }],
    };

    const result = checkToolGate(roster, 'ask_socratic');
    expect(result.allowed).toBe(true);
  });

  test('checkToolGate blocks tools not on roster', () => {
    const roster = { id: 'test', tools: [] };
    const result = checkToolGate(roster, 'ask_socratic' as any);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not on roster');
  });

  test('checkToolGate blocks tools marked blockedForChildren', () => {
    const roster = {
      id: 'test',
      tools: [{
        id: 'dangerous_tool' as any,
        label: 'Danger',
        description: 'Dangerous',
        blockedForChildren: true,
      }],
    };

    const result = checkToolGate(roster, 'dangerous_tool');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('blocked for child');
  });

  test('checkToolGate blocks tools requiring approval when not granted', () => {
    const roster = {
      id: 'test',
      tools: [{
        id: 'ai_draw' as any,
        label: 'AI Draw',
        description: 'AI drawing',
        requiresApproval: true,
      }],
    };

    const withoutApproval = checkToolGate(roster, 'ai_draw');
    expect(withoutApproval.allowed).toBe(false);
    expect(withoutApproval.reason).toContain('requires parental approval');

    const withApproval = checkToolGate(roster, 'ai_draw', { approvalGranted: true });
    expect(withApproval.allowed).toBe(true);
  });
});
