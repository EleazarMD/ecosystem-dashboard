/**
 * Activity Registry barrel — importing this module registers all built-in
 * activities.  Import from '@/domains/learning/shared/activity-registry'
 * to ensure the registry is populated.
 */

export * from './activity-types';
export * from './activity-theme';
export * from './context-hub';
export * from './agent-transport';
export * from './tool-roster';

// Side-effect: register built-in activities.
import './activities/pokemon-lab';
import './activities/learn-hub';
import './activities/builtin-activities';

// Re-export activity-specific context providers and transports.
export { createPokemonLabContextProvider } from './activities/pokemon-lab-context';
export type { PokemonLabStateSnapshot } from './activities/pokemon-lab-context';
export {
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
} from './activities/all-context-providers';
export type {
  HomeStateSnapshot,
  FreeChatStateSnapshot,
  LearnHubStateSnapshot,
  ArtStudioStateSnapshot,
  JournalStateSnapshot,
  BooksStateSnapshot,
  PlannerStateSnapshot,
  WorkspaceStateSnapshot,
  DictionaryStateSnapshot,
  EmailStateSnapshot,
  LearningPathStateSnapshot,
  TeamsStateSnapshot,
} from './activities/all-context-providers';
export { LearningTransport, learningTransport, buildContextEnvelope } from './transports/learning-transport';
export { PiCodeTransport, getPiCodeTransport, runAgentTurn, getPiCodeRuntimeMode } from './transports/picode-transport';
export type { PiCodeRuntimeMode } from './transports/picode-transport';
export { getContextHub, ContextHubService, _resetContextHub } from './context-hub-service';
export type { ComposedEnvelope } from './context-hub-service';
export { useActivityContext } from './useActivityContext';
export { useContextHeader } from './useContextHeader';
export type { ContextHeaderInfo } from './useContextHeader';
export { useLiveContext } from './useLiveContext';
