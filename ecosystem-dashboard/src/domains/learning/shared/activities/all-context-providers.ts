/**
 * Context Providers for all child activity surfaces.
 *
 * Contract: docs/AGENT_CONTEXT_HUB.md §4 (Context Providers)
 *
 * Every child surface registers a ContextProvider that emits a ContextFrame
 * describing what the child sees and does. This is what makes the agent
 * "always in the loop" — there is no child screen without context.
 *
 * Providers are lightweight factories that read from mutable refs or state
 * snapshots. The host component updates the ref on each state change; the
 * Context Hub pulls the frame on demand.
 */

import {
  ContextFrame,
  ContextProvider,
  ContextFocusKind,
} from '../context-hub';
import { KNOWN_ACTIVITY_IDS } from '../activity-types';

// ─── Generic ref-based provider ─────────────────────────────────────────────

/** A mutable ref that the host component updates. */
export interface StateRef<T> {
  current: T;
}

/** Create a generic provider from a state ref + frame builder. */
function createRefProvider<T>(
  activityId: string,
  stateRef: StateRef<T>,
  buildFrame: (state: T) => ContextFrame | null,
): ContextProvider {
  return {
    activityId,
    getFrame: () => {
      const state = stateRef.current;
      if (!state) return null;
      return buildFrame(state);
    },
  };
}

// ─── Home / Dashboard ───────────────────────────────────────────────────────

export interface HomeStateSnapshot {
  childName?: string;
  activeServices?: string[];
}

export function createHomeContextProvider(
  stateRef: StateRef<HomeStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.HOME,
    stateRef,
    (s): ContextFrame => ({
      kind: 'dashboard',
      activityId: KNOWN_ACTIVITY_IDS.HOME,
      title: 'Home',
      summary: s.childName
        ? `${s.childName} is on the home dashboard choosing an activity.`
        : 'The child is on the home dashboard choosing an activity.',
      entities: {
        activeServices: s.activeServices || [],
      },
    }),
  );
}

// ─── Free Chat ──────────────────────────────────────────────────────────────

export interface FreeChatStateSnapshot {
  childName?: string;
  recentMessages?: string[];
  characterId?: string;
  characterName?: string;
}

export function createFreeChatContextProvider(
  stateRef: StateRef<FreeChatStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.FREE_CHAT,
    stateRef,
    (s): ContextFrame => ({
      kind: 'conversation',
      activityId: KNOWN_ACTIVITY_IDS.FREE_CHAT,
      title: 'Chat',
      summary: s.childName
        ? `${s.childName} is in a free-style conversation with ${s.characterName || 'their AI companion'}.`
        : 'The child is in a free-style conversation with their AI companion.',
      entities: {
        characterId: s.characterId || '',
        characterName: s.characterName || '',
        messageCount: s.recentMessages?.length || 0,
      },
    }),
  );
}

// ─── Learn Hub ──────────────────────────────────────────────────────────────

export interface LearnHubStateSnapshot {
  contentItemId?: string;
  contentItemTitle?: string;
  contentItemPrompt?: string;
  skillCode?: string;
  attemptNumber?: number;
  childName?: string;
  sessionId?: string;
}

export function createLearnHubContextProvider(
  stateRef: StateRef<LearnHubStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.LEARN_HUB,
    stateRef,
    (s): ContextFrame | null => {
      if (!s.contentItemId) {
        return {
          kind: 'dashboard',
          activityId: KNOWN_ACTIVITY_IDS.LEARN_HUB,
          title: 'Learn',
          summary: s.childName
            ? `${s.childName} is browsing the lesson catalog.`
            : 'The child is browsing the lesson catalog.',
        };
      }
      return {
        kind: 'lesson',
        activityId: KNOWN_ACTIVITY_IDS.LEARN_HUB,
        title: s.contentItemTitle || `Lesson: ${s.contentItemId}`,
        summary: `The child is working on "${s.contentItemTitle || s.contentItemId}" (attempt ${s.attemptNumber || 1}).`,
        entities: {
          contentItemId: s.contentItemId,
          skillCode: s.skillCode || '',
          attemptNumber: s.attemptNumber || 1,
          lessonId: s.contentItemId,
        },
        payload: {
          prompt: s.contentItemPrompt,
          sessionId: s.sessionId,
        },
      };
    },
  );
}

// ─── Art Studio ─────────────────────────────────────────────────────────────

export interface ArtStudioStateSnapshot {
  childName?: string;
  view?: 'canvas' | 'gallery';
  selectedStyle?: string;
  selectedSize?: string;
  currentPrompt?: string;
  hasUnsavedChanges?: boolean;
  imageCount?: number;
  currentImageId?: string | null;
}

export function createArtStudioContextProvider(
  stateRef: StateRef<ArtStudioStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.ART_STUDIO,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.ART_STUDIO,
      title: 'Art Studio',
      summary: s.childName
        ? `${s.childName} is creating ${s.selectedStyle || 'art'} in ${s.view || 'canvas'} view${s.currentPrompt ? ` with prompt: ${s.currentPrompt}` : ''}.`
        : `The child is creating ${s.selectedStyle || 'art'} in ${s.view || 'canvas'} view${s.currentPrompt ? ` with prompt: ${s.currentPrompt}` : ''}.`,
      entities: {
        style: s.selectedStyle || '',
        size: s.selectedSize || '',
        view: s.view || 'canvas',
      },
      payload: {
        currentPrompt: s.currentPrompt,
        currentImageId: s.currentImageId,
        imageCount: s.imageCount || 0,
        hasUnsavedChanges: s.hasUnsavedChanges || false,
      },
    }),
  );
}

// ─── Journal ────────────────────────────────────────────────────────────────

export interface JournalStateSnapshot {
  entryType?: string;
  entryText?: string;
  mood?: string;
  childName?: string;
  /** Live prompt the child is responding to. */
  prompt?: string;
  wordCount?: number;
}

export function createJournalContextProvider(
  stateRef: StateRef<JournalStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.JOURNAL,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.JOURNAL,
      title: 'Journal',
      summary: s.childName
        ? `${s.childName} is writing a ${s.entryType || 'journal'} entry${s.mood ? ` (mood: ${s.mood})` : ''}${s.prompt ? ` about: ${s.prompt}` : ''}.`
        : `The child is writing a ${s.entryType || 'journal'} entry${s.mood ? ` (mood: ${s.mood})` : ''}${s.prompt ? ` about: ${s.prompt}` : ''}.`,
      entities: {
        entryType: s.entryType || '',
        mood: s.mood || '',
        prompt: s.prompt || '',
        wordCount: s.wordCount || 0,
      },
      payload: {
        entryText: s.entryText,
      },
    }),
  );
}

// ─── Books ──────────────────────────────────────────────────────────────────

export interface BooksStateSnapshot {
  bookId?: string;
  bookTitle?: string;
  page?: number;
  totalPages?: number;
  passageText?: string;
  childName?: string;
  /** Live reading state: current passage excerpt, reading time in seconds. */
  passageExcerpt?: string;
  readingTimeSec?: number;
}

export function createBooksContextProvider(
  stateRef: StateRef<BooksStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.BOOKS,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.BOOKS,
      title: s.bookTitle || 'Books',
      summary: s.childName
        ? `${s.childName} is reading "${s.bookTitle || 'a book'}"${s.page ? ` (page ${s.page}${s.totalPages ? ` of ${s.totalPages}` : ''})` : ''}.`
        : `The child is reading "${s.bookTitle || 'a book'}"${s.page ? ` (page ${s.page}${s.totalPages ? ` of ${s.totalPages}` : ''})` : ''}.`,
      entities: {
        bookId: s.bookId || '',
        page: s.page || 1,
        totalPages: s.totalPages || 0,
        passageExcerpt: s.passageExcerpt || '',
      },
      payload: {
        passageText: s.passageText,
        readingTimeSec: s.readingTimeSec || 0,
      },
    }),
  );
}

// ─── Planner ────────────────────────────────────────────────────────────────

export interface PlannerStateSnapshot {
  view?: 'day' | 'week' | 'tasks';
  selectedDate?: string;
  taskCount?: number;
  childName?: string;
  /** Live planner state: next due task title and whether it's overdue. */
  dueTaskTitle?: string;
  dueTaskOverdue?: boolean;
}

export function createPlannerContextProvider(
  stateRef: StateRef<PlannerStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.PLANNER,
    stateRef,
    (s): ContextFrame => ({
      kind: 'dashboard',
      activityId: KNOWN_ACTIVITY_IDS.PLANNER,
      title: 'Planner',
      summary: s.childName
        ? `${s.childName} is viewing their ${s.view || 'day'} planner${s.taskCount != null ? ` (${s.taskCount} tasks)` : ''}${s.dueTaskTitle ? `. Next due: ${s.dueTaskTitle}${s.dueTaskOverdue ? ' (overdue!)' : ''}` : ''}.`
        : `The child is viewing their ${s.view || 'day'} planner${s.taskCount != null ? ` (${s.taskCount} tasks)` : ''}${s.dueTaskTitle ? `. Next due: ${s.dueTaskTitle}${s.dueTaskOverdue ? ' (overdue!)' : ''}` : ''}.`,
      entities: {
        view: s.view || 'day',
        selectedDate: s.selectedDate || '',
        taskCount: s.taskCount || 0,
        dueTaskTitle: s.dueTaskTitle || '',
      },
      payload: {
        dueTaskOverdue: s.dueTaskOverdue || false,
      },
    }),
  );
}

// ─── Workspace ──────────────────────────────────────────────────────────────

export interface WorkspaceStateSnapshot {
  pageId?: string;
  pageTitle?: string;
  blockType?: string;
  childName?: string;
  /** Live workspace state: current block count, last edited block type. */
  blockCount?: number;
  lastEditedBlock?: string;
}

export function createWorkspaceContextProvider(
  stateRef: StateRef<WorkspaceStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.WORKSPACE,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.WORKSPACE,
      title: s.pageTitle || 'Workspace',
      summary: s.childName
        ? `${s.childName} is working on "${s.pageTitle || 'a page'}" in the workspace.`
        : 'The child is building a page in the workspace.',
      entities: {
        pageId: s.pageId || '',
        blockType: s.blockType || '',
        blockCount: s.blockCount || 0,
        lastEditedBlock: s.lastEditedBlock || '',
      },
    }),
  );
}

// ─── Dictionary ─────────────────────────────────────────────────────────────

export interface DictionaryStateSnapshot {
  searchedWord?: string;
  definition?: string;
  childName?: string;
  /** Live dictionary state: part of speech, pronunciation. */
  partOfSpeech?: string;
  pronunciation?: string;
}

export function createDictionaryContextProvider(
  stateRef: StateRef<DictionaryStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.DICTIONARY,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.DICTIONARY,
      title: s.searchedWord ? `Define: ${s.searchedWord}` : 'Dictionary',
      summary: s.childName
        ? `${s.childName} is ${s.searchedWord ? `looking up "${s.searchedWord}"` : 'browsing the dictionary'}.`
        : `The child is ${s.searchedWord ? `looking up "${s.searchedWord}"` : 'browsing the dictionary'}.`,
      entities: {
        searchedWord: s.searchedWord || '',
        partOfSpeech: s.partOfSpeech || '',
        pronunciation: s.pronunciation || '',
      },
      payload: {
        definition: s.definition,
      },
    }),
  );
}

// ─── Email ──────────────────────────────────────────────────────────────────

export interface EmailStateSnapshot {
  subject?: string;
  sender?: string;
  isReading?: boolean;
  childName?: string;
}

export function createEmailContextProvider(
  stateRef: StateRef<EmailStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.EMAIL,
    stateRef,
    (s): ContextFrame => ({
      kind: 'custom',
      activityId: KNOWN_ACTIVITY_IDS.EMAIL,
      title: s.subject || 'Email',
      summary: s.childName
        ? `${s.childName} is ${s.isReading ? 'reading' : 'composing'} an email${s.subject ? ` about "${s.subject}"` : ''}.`
        : `The child is ${s.isReading ? 'reading' : 'composing'} an email${s.subject ? ` about "${s.subject}"` : ''}.`,
      entities: {
        subject: s.subject || '',
        sender: s.sender || '',
      },
    }),
  );
}

// ─── Learning Path ──────────────────────────────────────────────────────────

export interface LearningPathStateSnapshot {
  pathId?: string;
  pathName?: string;
  currentObjective?: string;
  /** Completion fraction 0–1. */
  progress?: number;
  childName?: string;
  /** Path lifecycle status. */
  status?: 'active' | 'completed' | 'paused' | 'archived';
  totalSteps?: number;
  /** The next not-yet-completed step (what's in focus). */
  currentStepNumber?: number;
  currentStepTitle?: string;
  currentStepSkillCode?: string;
  currentStepDifficulty?: number;
  currentStepPrompt?: string;
  /** Distinct skill codes across the whole path (for mastery wiring). */
  skillCodes?: string[];
  /** Card Player state — when a card set is open, these fields describe the
   * current card so the tutor companion can coach on exactly what the child sees. */
  currentCardIndex?: number;
  currentCardTotal?: number;
  currentCardType?: 'try' | 'see' | 'explain' | 'play' | 'check';
  currentCardTitle?: string;
  currentCardQuestion?: string;
}

export function createLearningPathContextProvider(
  stateRef: StateRef<LearningPathStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.LEARNING_PATH,
    stateRef,
    (s): ContextFrame => {
      const who = s.childName || 'The child';
      const pct = s.progress != null ? ` (${Math.round(s.progress * 100)}% complete)` : '';
      const hasStep = !!s.currentStepTitle;
      const stepClause = hasStep
        ? ` Their current step is ${s.currentStepNumber ? `#${s.currentStepNumber} ` : ''}"${s.currentStepTitle}"${s.currentStepSkillCode ? ` (skill: ${s.currentStepSkillCode})` : ''}.`
        : '';

      return {
        // A path with an active step is a lesson-shaped focus; otherwise it's an overview.
        kind: hasStep ? 'lesson' : 'dashboard',
        activityId: KNOWN_ACTIVITY_IDS.LEARNING_PATH,
        title: s.pathName || 'Learning Path',
        summary: `${who} is on their learning path${s.pathName ? ` "${s.pathName}"` : ''}${pct}${s.status && s.status !== 'active' ? ` [${s.status}]` : ''}.${stepClause}`,
        entities: {
          pathId: s.pathId || '',
          status: s.status || 'active',
          progress: s.progress || 0,
          totalSteps: s.totalSteps || 0,
          currentObjective: s.currentObjective || s.currentStepTitle || '',
          currentStepNumber: s.currentStepNumber || 0,
          currentStepTitle: s.currentStepTitle || '',
          skillCode: s.currentStepSkillCode || '',
          currentStepDifficulty: s.currentStepDifficulty || 0,
          skillCodes: s.skillCodes || [],
        },
        payload: {
          prompt: s.currentStepPrompt || '',
          cardIndex: s.currentCardIndex,
          cardTotal: s.currentCardTotal,
          cardType: s.currentCardType,
          cardTitle: s.currentCardTitle,
          cardQuestion: s.currentCardQuestion,
        },
      };
    },
  );
}

// ─── Teams ──────────────────────────────────────────────────────────────────

export interface TeamsStateSnapshot {
  teamName?: string;
  activity?: string;
  childName?: string;
}

export function createTeamsContextProvider(
  stateRef: StateRef<TeamsStateSnapshot>,
): ContextProvider {
  return createRefProvider(
    KNOWN_ACTIVITY_IDS.TEAMS,
    stateRef,
    (s): ContextFrame => ({
      kind: 'dashboard',
      activityId: KNOWN_ACTIVITY_IDS.TEAMS,
      title: s.teamName || 'Teams',
      summary: s.childName
        ? `${s.childName} is in the teams area${s.teamName ? ` (team: ${s.teamName})` : ''}.`
        : 'The child is in the teams area.',
      entities: {
        teamName: s.teamName || '',
        activity: s.activity || '',
      },
    }),
  );
}

// ─── Barrel export ──────────────────────────────────────────────────────────

export { createPokemonLabContextProvider } from './pokemon-lab-context';
export type { PokemonLabStateSnapshot } from './pokemon-lab-context';
