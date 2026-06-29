/**
 * Pokémon Lab Context Provider — emits ContextFrame from the current
 * PokemonLab view state.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §3 + §6
 */

import { ContextFrame, ContextProvider, ContextFocusKind } from '../context-hub';
import { KNOWN_ACTIVITY_IDS } from '../activity-types';

/** Snapshot of PokemonLab's internal state at a point in time. */
export interface PokemonLabStateSnapshot {
  view: 'home' | 'lesson' | 'explorer' | 'pokemon-detail' | 'card-library';
  activeLessonId?: string | null;
  activeLessonTitle?: string | null;
  activeLessonStep?: number;
  selectedPokemonName?: string | null;
  selectedPokemonTypes?: string[];
  explorerSearchQuery?: string;
}

/**
 * Factory: creates a ContextProvider whose getFrame() reads from a
 * mutable ref. The PokemonLab component updates the ref on each state change.
 */
export function createPokemonLabContextProvider(
  stateRef: { current: PokemonLabStateSnapshot },
): ContextProvider {
  return {
    activityId: KNOWN_ACTIVITY_IDS.POKEMON_LAB,
    getFrame: (): ContextFrame | null => {
      const s = stateRef.current;
      if (!s) return null;

      const kind = mapViewToKind(s.view);
      const title = buildTitle(s);
      const summary = buildSummary(s);
      const entities = buildEntities(s);

      return {
        kind,
        activityId: KNOWN_ACTIVITY_IDS.POKEMON_LAB,
        title,
        summary,
        entities,
        payload: {
          view: s.view,
          activeLessonId: s.activeLessonId ?? undefined,
          activeLessonStep: s.activeLessonStep,
          explorerSearchQuery: s.explorerSearchQuery,
        },
      };
    },
  };
}

function mapViewToKind(view: PokemonLabStateSnapshot['view']): ContextFocusKind {
  switch (view) {
    case 'lesson':
      return 'lesson';
    case 'explorer':
      return 'explorer';
    case 'card-library':
      return 'explorer';
    case 'pokemon-detail':
      return 'explorer';
    case 'home':
    default:
      return 'dashboard';
  }
}

function buildTitle(s: PokemonLabStateSnapshot): string {
  if (s.view === 'lesson' && s.activeLessonTitle) {
    return `Lesson: ${s.activeLessonTitle}`;
  }
  if (s.view === 'pokemon-detail' && s.selectedPokemonName) {
    return `Pokémon: ${s.selectedPokemonName}`;
  }
  if (s.view === 'explorer') {
    return 'Pokémon Explorer';
  }
  if (s.view === 'card-library') {
    return 'Pokémon Card Library';
  }
  return 'Pokémon Lab';
}

function buildSummary(s: PokemonLabStateSnapshot): string {
  if (s.view === 'lesson' && s.activeLessonTitle) {
    const step = s.activeLessonStep != null ? ` (step ${s.activeLessonStep + 1})` : '';
    return `The child is working on the "${s.activeLessonTitle}" lesson${step}.`;
  }
  if (s.view === 'pokemon-detail' && s.selectedPokemonName) {
    const types = s.selectedPokemonTypes?.length
      ? ` (${s.selectedPokemonTypes.join('/')})`
      : '';
    return `The child is viewing ${s.selectedPokemonName}${types} in the Pokédex detail view.`;
  }
  if (s.view === 'explorer') {
    return 'The child is exploring the Pokémon knowledge graph freely.';
  }
  if (s.view === 'card-library') {
    return 'The child is browsing the Pokémon card library, collecting and flipping cards.';
  }
  return 'The child is on the Pokémon Lab home screen choosing a lesson.';
}

function buildEntities(s: PokemonLabStateSnapshot): Record<string, string | number | string[]> {
  const entities: Record<string, string | number | string[]> = {};
  if (s.selectedPokemonName) entities.pokemon = s.selectedPokemonName;
  if (s.selectedPokemonTypes?.length) entities.types = s.selectedPokemonTypes;
  if (s.activeLessonId) entities.lessonId = s.activeLessonId;
  if (s.activeLessonStep != null) entities.step = s.activeLessonStep;
  return entities;
}
