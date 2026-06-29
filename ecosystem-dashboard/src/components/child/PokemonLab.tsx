/**
 * Pokemon Lab — Brilliant.com-style interactive learning interface
 *
 * Teaches kids about knowledge graphs using Pokemon data. Features:
 * - Interactive lessons about what knowledge graphs are
 * - Pokemon explorer with search and filtering
 * - Type effectiveness visualizer
 * - Stats & analytics dashboard
 * - Natural language query playground
 * - Evolution chain visualizer
 */

import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  Progress,
  Spinner,
  SimpleGrid,
  Tooltip,
  Circle,
  Flex,
  Divider,
  useToast,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  IconButton,
  Collapse,
  useDisclosure,
  Image,
} from '@chakra-ui/react';
import {
  SearchIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  QuestionIcon,
  StarIcon,
} from '@chakra-ui/icons';
import { keyframes } from '@emotion/react';
import { useKidsPCG } from '@/hooks/useKidsPCG';
import { PokemonGraphViz } from './PokemonGraphViz';
import { PokemonCardLibrary } from './PokemonCardLibrary';
import {
  pokedexClient,
  getTypeColor,
  getTypeEmoji,
  statColor,
  statLabel,
  formatHeight,
  formatWeight,
  kidDamageClass,
  kidEvolutionTrigger,
  titleCase,
  PokemonDetail,
  PokemonSearchResult,
  TypeEffectiveness,
  GraphStats,
  EvolutionNode,
  PokemonMove,
  PokemonForm,
  TeamSuggestion,
  WeaknessCalc,
  TypeCoverage,
} from '@/lib/pokedex-client';
import { useChildTheme } from './ChildThemeProvider';
import { useSound, type SoundType } from './learning-kit/useSound';
import type { PokemonLabStateSnapshot } from '@/domains/learning/shared/activities/pokemon-lab-context';

// ─── Animation keyframes ──────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

type PokemonSpriteSize = 'sm' | 'md' | 'lg' | 'xl';

const POKEMON_SPRITE_SIZE: Record<PokemonSpriteSize, string> = {
  sm: '32px',
  md: '48px',
  lg: '64px',
  xl: '96px',
};

function PokemonSprite({
  name,
  spriteDreamWorld,
  officialArtwork,
  animeArtwork,
  spriteFront,
  size = 'md',
  bg = 'whiteAlpha.100',
}: {
  name?: string;
  spriteDreamWorld?: string | null;
  officialArtwork?: string | null;
  animeArtwork?: string | null;
  spriteFront?: string | null;
  size?: PokemonSpriteSize;
  bg?: string;
}) {
  const src = animeArtwork || spriteDreamWorld || officialArtwork || spriteFront;
  const boxSize = POKEMON_SPRITE_SIZE[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={`${name || 'Pokemon'} sprite`}
        boxSize={boxSize}
        objectFit="contain"
        bg={bg}
        borderRadius="full"
        p={2}
        filter="drop-shadow(0 4px 8px rgba(0,0,0,0.25))"
        transition="transform 0.2s ease"
        _hover={{ transform: 'scale(1.08)' }}
      />
    );
  }

  return (
    <Circle size={boxSize} bg={bg} transition="transform 0.2s ease" _hover={{ transform: 'scale(1.08)' }}>
      <Image
        src="/themes/pokemon/Icons/pokeball.png.svg"
        alt="Pokeball"
        boxSize="70%"
        objectFit="contain"
      />
    </Circle>
  );
}

// ─── Lesson definitions ───────────────────────────────────────────────────

type LessonId =
  | 'spot-the-groups'
  | 'count-and-graph'
  | 'everything-connects'
  | 'follow-the-strings'
  | 'strong-and-weak'
  | 'build-your-team'
  | 'stat-bars'
  | 'whos-typical'
  | 'ask-the-pokedex'
  | 'talk-to-computer'
  | 'data-detective'
  | 'amazing-forms';

type SectionId =
  | 'sorting-town'
  | 'counting-meadow'
  | 'connection-cave'
  | 'battle-arena'
  | 'number-lab'
  | 'ask-anything'
  | 'bonus-zone';

interface Lesson {
  id: LessonId;
  title: string;
  emoji: string;
  description: string;
  color: string;
  section: SectionId;
}

interface LessonSection {
  id: SectionId;
  title: string;
  emoji: string;
  description: string;
  color: string;
  lessonIds: LessonId[];
}

const LESSON_SECTIONS: LessonSection[] = [
  {
    id: 'sorting-town',
    title: 'Sorting Town',
    emoji: '🗂️',
    description: 'Practice grouping and sorting Pokemon in fun new ways.',
    color: '#4C9F70',
    lessonIds: ['spot-the-groups'],
  },
  {
    id: 'counting-meadow',
    title: 'Counting Meadow',
    emoji: '🔢',
    description: 'Count, compare, and build simple picture graphs.',
    color: '#F6B73C',
    lessonIds: ['count-and-graph'],
  },
  {
    id: 'connection-cave',
    title: 'Connection Cave',
    emoji: '🕸️',
    description: 'Learn how Pokemon facts connect like a giant web.',
    color: '#5A67D8',
    lessonIds: ['everything-connects', 'follow-the-strings'],
  },
  {
    id: 'battle-arena',
    title: 'Battle Arena',
    emoji: '⚔️',
    description: 'Use type relationships and build a balanced team.',
    color: '#E53E3E',
    lessonIds: ['strong-and-weak', 'build-your-team'],
  },
  {
    id: 'number-lab',
    title: 'Number Lab',
    emoji: '📊',
    description: 'Read stat bars and decide what looks typical.',
    color: '#2F855A',
    lessonIds: ['stat-bars', 'whos-typical'],
  },
  {
    id: 'ask-anything',
    title: 'Ask Anything',
    emoji: '💬',
    description: 'Ask questions, talk to the Pokedex, and solve a capstone case.',
    color: '#D53F8C',
    lessonIds: ['ask-the-pokedex', 'talk-to-computer', 'data-detective'],
  },
  {
    id: 'bonus-zone',
    title: 'Bonus Zone',
    emoji: '✨',
    description: 'Extra fun lessons for curious trainers!',
    color: '#ED64A6',
    lessonIds: ['amazing-forms'],
  },
];

const LESSONS: Lesson[] = [
  {
    id: 'spot-the-groups',
    title: 'Spot the Groups & Sort Again',
    emoji: '🗂️',
    description: 'Sort Pokemon into buckets and discover new grouping rules.',
    color: '#4C9F70',
    section: 'sorting-town',
  },
  {
    id: 'count-and-graph',
    title: 'Count & Graph',
    emoji: '🔢',
    description: 'Count type groups and compare them using picture graphs.',
    color: '#F6B73C',
    section: 'counting-meadow',
  },
  {
    id: 'everything-connects',
    title: 'Everything Connects',
    emoji: '🕸️',
    description: 'See how Pokemon, types, moves, and evolutions connect.',
    color: '#5A67D8',
    section: 'connection-cave',
  },
  {
    id: 'follow-the-strings',
    title: 'Follow the Strings',
    emoji: '🧭',
    description: 'Trace a Pokemon graph and find clues by following links.',
    color: '#7F9CF5',
    section: 'connection-cave',
  },
  {
    id: 'strong-and-weak',
    title: 'Strong & Weak',
    emoji: '⚔️',
    description: 'Predict which type matchups are strong or weak.',
    color: '#E53E3E',
    section: 'battle-arena',
  },
  {
    id: 'build-your-team',
    title: 'Build Your Team',
    emoji: '🏆',
    description: 'Pick a team of six and check your type coverage.',
    color: '#F6AD55',
    section: 'battle-arena',
  },
  {
    id: 'stat-bars',
    title: 'Stat Bars',
    emoji: '📊',
    description: 'Read stat bars and compare Pokemon strengths.',
    color: '#2F855A',
    section: 'number-lab',
  },
  {
    id: 'whos-typical',
    title: "Who's Typical?",
    emoji: '📈',
    description: 'Find which Pokemon is most typical in a small group.',
    color: '#38A169',
    section: 'number-lab',
  },
  {
    id: 'ask-the-pokedex',
    title: 'Ask the Pokedex',
    emoji: '🔍',
    description: 'Ask a question, search, and explore what you find.',
    color: '#4C51BF',
    section: 'ask-anything',
  },
  {
    id: 'talk-to-computer',
    title: 'Talk to the Computer',
    emoji: '🗣️',
    description: 'Use everyday words to ask smart data questions.',
    color: '#D53F8C',
    section: 'ask-anything',
  },
  {
    id: 'data-detective',
    title: 'Data Detective',
    emoji: '🕵️',
    description: 'Run the full Ask → Collect → Sort → Graph → Tell mission.',
    color: '#805AD5',
    section: 'ask-anything',
  },
  {
    id: 'amazing-forms',
    title: 'Amazing Forms',
    emoji: '✨',
    description: 'Discover how the same Pokemon can wear different costumes!',
    color: '#ED64A6',
    section: 'bonus-zone',
  },
];

const LESSON_BADGES: Record<LessonId, { badgeName: string; concept: string; badgeEmoji: string }> = {
  'spot-the-groups': { badgeName: 'Sorting Star', concept: 'You learned to sort things into groups and re-sort them different ways!', badgeEmoji: '🗂️' },
  'count-and-graph': { badgeName: 'Graph Grower', concept: 'You counted groups and made picture graphs to compare them!', badgeEmoji: '📊' },
  'everything-connects': { badgeName: 'Web Weaver', concept: 'You discovered that everything connects in a giant web of facts!', badgeEmoji: '🕸️' },
  'follow-the-strings': { badgeName: 'String Tracker', concept: 'You followed the strings in a knowledge web to find hidden clues!', badgeEmoji: '🧭' },
  'strong-and-weak': { badgeName: 'Type Master', concept: 'You learned which types are strong or weak against each other!', badgeEmoji: '⚔️' },
  'build-your-team': { badgeName: 'Team Builder', concept: 'You built a team and checked its type coverage like a real trainer!', badgeEmoji: '🏆' },
  'stat-bars': { badgeName: 'Stat Reader', concept: 'You read stat bars and compared Pokemon strengths side by side!', badgeEmoji: '📈' },
  'whos-typical': { badgeName: 'Data Detective', concept: 'You found the most common, the middle, and the odd one out!', badgeEmoji: '🔍' },
  'ask-the-pokedex': { badgeName: 'Pokedex Searcher', concept: 'You asked the Pokedex questions and it found Pokemon for you!', badgeEmoji: '🔎' },
  'talk-to-computer': { badgeName: 'Computer Talker', concept: 'You talked to the computer using your own words and it understood!', badgeEmoji: '🗣️' },
  'data-detective': { badgeName: 'Graph Master', concept: 'You ran the whole Data Journey: Ask, Collect, Sort, Graph, Tell!', badgeEmoji: '🕵️' },
  'amazing-forms': { badgeName: 'Form Finder', concept: 'You discovered that the same Pokemon can have different forms with different types and powers!', badgeEmoji: '✨' },
};

const LESSON_SKILL_CODES: Record<LessonId, { skillCode: string; contentItemId: string }> = {
  'spot-the-groups':      { skillCode: 'analytical.compare_classify',   contentItemId: 'pokemon-lab.spot-the-groups.v1' },
  'count-and-graph':      { skillCode: 'math.data.picture_bar',         contentItemId: 'pokemon-lab.count-and-graph.v1' },
  'everything-connects':  { skillCode: 'analytical.cause_effect',       contentItemId: 'pokemon-lab.everything-connects.v1' },
  'follow-the-strings':   { skillCode: 'analytical.infer_evidence',     contentItemId: 'pokemon-lab.follow-the-strings.v1' },
  'strong-and-weak':      { skillCode: 'analytical.patterns',           contentItemId: 'pokemon-lab.strong-and-weak.v1' },
  'build-your-team':      { skillCode: 'analytical.evaluate',           contentItemId: 'pokemon-lab.build-your-team.v1' },
  'stat-bars':            { skillCode: 'math.data.picture_bar',         contentItemId: 'pokemon-lab.stat-bars.v1' },
  'whos-typical':         { skillCode: 'analytical.patterns',           contentItemId: 'pokemon-lab.whos-typical.v1' },
  'ask-the-pokedex':      { skillCode: 'analytical.infer_evidence',     contentItemId: 'pokemon-lab.ask-the-pokedex.v1' },
  'talk-to-computer':     { skillCode: 'analytical.infer_evidence',     contentItemId: 'pokemon-lab.talk-to-computer.v1' },
  'data-detective':       { skillCode: 'analytical.metacognition',      contentItemId: 'pokemon-lab.data-detective.v1' },
  'amazing-forms':        { skillCode: 'analytical.compare_classify',   contentItemId: 'pokemon-lab.amazing-forms.v1' },
};

/** Check if a lesson is unlocked based on completed lessons and section ordering. */
function isLessonUnlocked(
  lessonId: LessonId,
  completedLessons: Set<LessonId>,
): boolean {
  const sectionIdx = LESSON_SECTIONS.findIndex((s) =>
    s.lessonIds.includes(lessonId),
  );
  const section = LESSON_SECTIONS[sectionIdx];
  const lessonIdxInSection = section.lessonIds.indexOf(lessonId);

  // First lesson in first section is always unlocked
  if (sectionIdx === 0 && lessonIdxInSection === 0) return true;

  // Within the same section: previous lesson must be completed
  if (lessonIdxInSection > 0) {
    const prevLessonId = section.lessonIds[lessonIdxInSection - 1];
    return completedLessons.has(prevLessonId);
  }

  // First lesson of a later section: all lessons in previous section must be completed
  const prevSection = LESSON_SECTIONS[sectionIdx - 1];
  return prevSection.lessonIds.every((id) => completedLessons.has(id));
}

/** Check if a section is unlocked. */
function isSectionUnlocked(
  sectionId: SectionId,
  completedLessons: Set<LessonId>,
): boolean {
  const sectionIdx = LESSON_SECTIONS.findIndex((s) => s.id === sectionId);
  if (sectionIdx === 0) return true;
  const prevSection = LESSON_SECTIONS[sectionIdx - 1];
  return prevSection.lessonIds.every((id) => completedLessons.has(id));
}

/** Check if all lessons in a section are completed. */
function isSectionComplete(
  sectionId: SectionId,
  completedLessons: Set<LessonId>,
): boolean {
  const section = LESSON_SECTIONS.find((s) => s.id === sectionId)!;
  return section.lessonIds.every((id) => completedLessons.has(id));
}

// ─── Interactive quiz content ─────────────────────────────────────────────

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const KG_QUIZ: QuizQuestion[] = [
  {
    question: 'What is a node in a knowledge graph?',
    options: ['A line connecting things', 'A dot that represents a thing', 'A type of Pokemon', 'A number'],
    answer: 1,
    explanation: 'A node is a dot that represents a thing — like a Pokemon, a Type, or a Move!',
  },
  {
    question: 'What is an edge in a knowledge graph?',
    options: ['A dot', 'A line showing a relationship', 'A Pokemon attack', 'A type of data'],
    answer: 1,
    explanation: 'An edge is a line that shows how two nodes are related — like "HAS_TYPE" connecting a Pokemon to its Type!',
  },
  {
    question: 'In our Pokemon graph, what does "HAS_TYPE" connect?',
    options: [
      'Two Pokemon',
      'A Pokemon and its Type',
      'A Type and a Move',
      'An item and a Pokemon',
    ],
    answer: 1,
    explanation: 'The "HAS_TYPE" edge connects a Pokemon node to a Type node — like Pikachu to Electric!',
  },
  {
    question: 'Why are knowledge graphs useful?',
    options: [
      'They look pretty',
      'They help computers understand relationships',
      'They store images',
      'They make websites faster',
    ],
    answer: 1,
    explanation: 'Knowledge graphs help computers understand how things are related, so they can answer complex questions!',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────

type View = 'home' | 'lesson' | 'explorer' | 'pokemon-detail' | 'card-library';

export function PokemonLab({
  stateRef,
  onStateChange,
  pathId,
  pathStepNumber,
}: {
  stateRef?: React.MutableRefObject<PokemonLabStateSnapshot>;
  onStateChange?: () => void;
  pathId?: string;
  pathStepNumber?: number;
}) {
  const { profile } = useKidsPCG();
  const { effectiveTheme } = useChildTheme();
  const { play: playSound } = useSound();
  const [view, setView] = useState<View>('home');

  // Play a soft click sound for any real button press anywhere in the lab surface.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, [role="button"], input[type="submit"]')) {
        playSound('click');
      }
    };
    document.addEventListener('click', handleButtonClick, true);
    return () => document.removeEventListener('click', handleButtonClick, true);
  }, [playSound]);
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<LessonId>>(new Set());
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetail | null>(null);
  const [historyStack, setHistoryStack] = useState<PokemonDetail[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<PokemonDetail[]>([]);

  const progress = (completedLessons.size / LESSONS.length) * 100;

  // ─── Lesson progress persistence ────────────────────────────────────────
  // Load completed lessons from the server (or localStorage fallback) on mount
  // so children don't restart from zero every session.
  const childId = profile?.id;
  const storageKey = `pokemon-lab-completed-${childId || 'guest'}`;

  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    (async () => {
      // Try server first
      try {
        const res = await fetch('/api/child/activity-progress?activity=pokemon-lab');
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.completedLessons?.length) {
            setCompletedLessons(new Set(data.completedLessons as LessonId[]));
            return;
          }
        }
      } catch {
        // server unavailable — fall through to localStorage
      }
      // Fallback: localStorage
      if (!cancelled) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const ids = JSON.parse(stored) as string[];
            setCompletedLessons(new Set(ids as LessonId[]));
          }
        } catch {
          // localStorage unavailable — start fresh
        }
      }
    })();
    return () => { cancelled = true; };
  }, [childId, storageKey]);

  // Persist to localStorage whenever completedLessons changes (instant, offline-friendly)
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(completedLessons)));
    } catch {
      // ignore storage errors
    }
  }, [completedLessons, storageKey]);

  // Compute surface tokens from the activity theme overlay (§2), falling back to DEFAULT_SURFACE.
  const surface = useMemo(() => {
    const overlay = effectiveTheme.surface;
    if (!overlay) return DEFAULT_SURFACE;
    return {
      panel: overlay.panel ?? DEFAULT_SURFACE.panel,
      card: overlay.card ?? DEFAULT_SURFACE.card,
      cardLocked: overlay.cardLocked ?? DEFAULT_SURFACE.cardLocked,
      border: overlay.border ?? DEFAULT_SURFACE.border,
      borderLocked: overlay.borderLocked ?? DEFAULT_SURFACE.borderLocked,
      title: overlay.title ?? DEFAULT_SURFACE.title,
      body: overlay.body ?? DEFAULT_SURFACE.body,
      muted: overlay.muted ?? DEFAULT_SURFACE.muted,
    };
  }, [effectiveTheme.surface]);

  // Sync context state ref for the Tutor Companion / Context Hub (§3).
  useEffect(() => {
    if (!stateRef) return;
    const lesson = activeLesson ? LESSONS.find((l) => l.id === activeLesson) : null;
    stateRef.current = {
      view,
      activeLessonId: activeLesson,
      activeLessonTitle: lesson?.title ?? null,
      selectedPokemonName: selectedPokemon?.name ?? null,
      selectedPokemonTypes: selectedPokemon?.types ?? undefined,
    };
    onStateChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, activeLesson, selectedPokemon, stateRef]);

  const handleLessonClick = (lesson: Lesson) => {
    if (!isLessonUnlocked(lesson.id, completedLessons)) return;
    playSound('click');
    setActiveLesson(lesson.id);
    setView('lesson');
  };

  const handleLessonComplete = (id: LessonId) => {
    const nextCompleted = new Set(completedLessons).add(id);

    const section = LESSON_SECTIONS.find((s) => s.lessonIds.includes(id));
    const wasSectionComplete = section?.lessonIds.every((lid) => completedLessons.has(lid)) ?? false;
    const isSectionCompleteNow = section?.lessonIds.every((lid) => nextCompleted.has(lid)) ?? false;
    const isSectionMilestone = !wasSectionComplete && isSectionCompleteNow;
    const isAllDone = nextCompleted.size === LESSONS.length;

    const sound: SoundType = isAllDone
      ? 'complete'
      : isSectionMilestone
        ? 'streak'
        : 'achievement';
    playSound(sound);

    setCompletedLessons(nextCompleted);
    setView('home');

    // Persist lesson completion to the server (best-effort, never blocks UX)
    try {
      fetch('/api/child/activity-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'pokemon-lab', lessonId: id }),
      }).catch(() => {});
    } catch {
      // ignore
    }

    // Phase 9: route completion through the harness attempt pipeline so
    // mastery evidence is written (Postgres + kids-pcg) and events fire.
    // Best-effort — never blocks the UX.
    const cId = profile?.id;
    const mapping = LESSON_SKILL_CODES[id];
    if (cId && mapping) {
      const payload: Record<string, unknown> = {
        childId,
        contentItemId: mapping.contentItemId,
        response: 'completed',
        attemptNumber: 1,
      };
      if (pathId) payload.pathId = pathId;
      if (pathStepNumber != null) payload.pathStepNumber = pathStepNumber;
      void fetch('/api/learn/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.warn('[pokemon-lab] mastery write failed for', id, err);
      });
    }
  };

  const handlePokemonSelect = (pokemon: PokemonDetail) => {
    setSelectedPokemon((prev) => {
      if (prev) {
        setHistoryStack((stack) => [...stack, prev]);
      }
      return pokemon;
    });
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== pokemon.id);
      return [pokemon, ...filtered].slice(0, 5);
    });
    setView('pokemon-detail');
  };

  const handleDetailBack = () => {
    setHistoryStack((stack) => {
      if (stack.length === 0) {
        setView('explorer');
        return stack;
      }
      const prev = stack[stack.length - 1];
      setSelectedPokemon(prev);
      return stack.slice(0, -1);
    });
  };

  const handleHomeBase = () => {
    setHistoryStack([]);
    setSelectedPokemon(null);
    setView('explorer');
  };

  // ─── Home View ──────────────────────────────────────────────────────────

  if (view === 'home') {
    return (
      <SurfaceContext.Provider value={surface}>
        <PokemonLabHome
          lessons={LESSONS}
          completedLessons={completedLessons}
          progress={progress}
          onLessonClick={handleLessonClick}
          onExplorerOpen={() => setView('explorer')}
          onCardLibraryOpen={() => setView('card-library')}
        />
      </SurfaceContext.Provider>
    );
  }

  // ─── Lesson View ────────────────────────────────────────────────────────

  if (view === 'lesson' && activeLesson) {
    const lesson = LESSONS.find((l) => l.id === activeLesson)!;
    return (
      <SurfaceContext.Provider value={surface}>
        <LessonView
          lesson={lesson}
          onComplete={() => handleLessonComplete(activeLesson)}
          onBack={() => setView('home')}
          onPokemonSelect={handlePokemonSelect}
          onExplorerOpen={() => setView('explorer')}
        />
      </SurfaceContext.Provider>
    );
  }

  // ─── Card Library View ─────────────────────────────────────────────────

  if (view === 'card-library') {
    return (
      <SurfaceContext.Provider value={surface}>
        <PokemonCardLibrary
          onBack={() => setView('home')}
          onPokemonSelect={handlePokemonSelect}
        />
      </SurfaceContext.Provider>
    );
  }

  // ─── Explorer View ──────────────────────────────────────────────────────

  if (view === 'explorer') {
    return (
      <SurfaceContext.Provider value={surface}>
        <PokemonExplorer
          onBack={() => setView('home')}
          onPokemonSelect={handlePokemonSelect}
        />
      </SurfaceContext.Provider>
    );
  }

  // ─── Pokemon Detail View ────────────────────────────────────────────────

  if (view === 'pokemon-detail' && selectedPokemon) {
    return (
      <SurfaceContext.Provider value={surface}>
        <PokemonDetailView
          pokemon={selectedPokemon}
          onBack={handleDetailBack}
          onHomeBase={handleHomeBase}
          historyStack={historyStack}
          recentlyViewed={recentlyViewed}
          onPokemonSelect={handlePokemonSelect}
        />
      </SurfaceContext.Provider>
    );
  }

  return null;
}

// ─── Home View ────────────────────────────────────────────────────────────

// Solid surface palette — kept opaque so the Lab reads clearly on top of ANY
// child theme (Minecraft, Pusheen, etc.) without inheriting its wallpaper.
// Now fed from the Activity Theme overlay (§2) via SurfaceContext.
const DEFAULT_SURFACE = {
  panel: '#16213E',        // section container
  card: '#243B6B',         // unlocked lesson card
  cardLocked: '#1B2A4A',   // locked lesson card
  border: 'rgba(99,144,240,0.35)',
  borderLocked: 'rgba(255,255,255,0.08)',
  title: '#FFFFFF',
  body: '#C9D4F0',
  muted: '#8B97BC',
};

// Context: allows the theme overlay to flow surface tokens into every sub-component
// without changing their signatures. Falls back to DEFAULT_SURFACE when no overlay.
const SurfaceContext = createContext(DEFAULT_SURFACE);
function useSurface() { return useContext(SurfaceContext); }

function TrailCard({
  lesson,
  badge,
  isCompleted,
  isUnlocked,
  isCurrent,
  isLeft,
  onClick,
  onHover,
  onLeave,
}: {
  lesson: Lesson;
  badge: { badgeName: string; concept: string; badgeEmoji: string };
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  isLeft: boolean;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const SURFACE = useSurface();
  const { play: playSound } = useSound();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 10 });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const status = isCompleted
    ? { label: 'DONE', color: '#48BB78', scheme: 'green' as const }
    : isCurrent
      ? { label: 'START', color: lesson.color, scheme: 'yellow' as const }
      : isUnlocked
        ? { label: 'NEW', color: '#3b7dd8', scheme: 'blue' as const }
        : { label: 'LOCKED', color: SURFACE.muted, scheme: 'gray' as const };

  return (
    <Box
      w={{ base: 'full', md: '48%' }}
      alignSelf={isLeft ? 'flex-start' : 'flex-end'}
      position="relative"
      pl={{ base: 0, md: isLeft ? 0 : 8 }}
      pr={{ base: 0, md: isLeft ? 8 : 0 }}
      onClick={() => {
        if (!isUnlocked) return;
        playSound('click');
        onClick();
      }}
      onMouseEnter={() => {
        onHover();
      }}
      onMouseLeave={() => {
        resetTilt();
        onLeave();
      }}
      onMouseMove={handleMouseMove}
      cursor={isUnlocked ? 'pointer' : 'not-allowed'}
      opacity={isUnlocked ? 1 : 0.7}
      transition="opacity 0.2s ease"
    >
      {/* Connector dot to the central spine */}
      <Box
        display={{ base: 'none', md: 'block' }}
        position="absolute"
        top="50%"
        transform="translateY(-50%)"
        left={isLeft ? 'auto' : undefined}
        right={isLeft ? undefined : 'auto'}
        {...(isLeft ? { right: '12px' } : { left: '12px' })}
        w="20px"
        h="20px"
        borderRadius="full"
        bg={isCompleted ? '#48BB78' : isUnlocked ? lesson.color : SURFACE.borderLocked}
        border="3px solid"
        borderColor="whiteAlpha.800"
        boxShadow={isCurrent ? `0 0 16px ${lesson.color}` : 'none'}
        zIndex={2}
      />

      <Box
        bg={isUnlocked ? SURFACE.card : SURFACE.cardLocked}
        borderRadius="2xl"
        p={{ base: 4, md: 5 }}
        borderWidth="3px"
        borderColor={isCompleted ? '#48BB78' : isUnlocked ? lesson.color : SURFACE.borderLocked}
        boxShadow={isCurrent ? `0 0 30px ${lesson.color}55, 0 10px 30px rgba(0,0,0,0.35)` : '0 10px 30px rgba(0,0,0,0.35)'}
        transform={`perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isUnlocked ? 'scale(1)' : 'scale(0.98)'}`}
        transition="transform 0.15s ease-out, box-shadow 0.2s ease"
        _hover={isUnlocked ? {
          boxShadow: `0 20px 50px ${lesson.color}55, 0 12px 40px rgba(0,0,0,0.4)`,
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.03)`,
        } : {}}
        position="relative"
        overflow="hidden"
      >
        {/* Status badge */}
        <Box position="absolute" top={3} right={3}>
          <Badge
            colorScheme={status.scheme}
            borderRadius="full"
            px={2.5}
            py={0.5}
            fontSize="2xs"
            fontWeight="bold"
            boxShadow="md"
            textTransform="uppercase"
          >
            {status.label}
          </Badge>
        </Box>

        {/* Subtle gradient splash */}
        <Box
          position="absolute"
          top="-30px"
          right="-30px"
          w="100px"
          h="100px"
          borderRadius="full"
          bg={isUnlocked ? `${lesson.color}22` : 'transparent'}
          pointerEvents="none"
        />

        <HStack spacing={4} align="start">
          <Circle
            size="64px"
            bg={isCompleted ? '#48BB78' : `${lesson.color}30`}
            border="3px solid"
            borderColor={isCompleted ? '#48BB78' : lesson.color}
            flexShrink={0}
            boxShadow={isCurrent ? `0 0 20px ${lesson.color}66` : 'none'}
            transition="all 0.2s ease"
          >
            {isCompleted ? (
              <CheckCircleIcon color="white" boxSize={6} />
            ) : (
              <Text fontSize="3xl">{lesson.emoji}</Text>
            )}
          </Circle>
          <Box flex={1} minW={0}>
            <Text fontWeight="bold" fontSize="md" color={isUnlocked ? SURFACE.title : SURFACE.muted} noOfLines={1}>
              {lesson.title}
            </Text>
            <Text fontSize="xs" color={SURFACE.body} mt={1} noOfLines={2}>
              {isUnlocked ? lesson.description : `Complete the previous lesson to unlock ${badge.badgeName}.`}
            </Text>
            <HStack mt={2} spacing={2} flexWrap="wrap">
              <Badge variant="subtle" colorScheme="purple" borderRadius="full" fontSize="2xs">
                {badge.badgeEmoji} {badge.badgeName}
              </Badge>
              {isCompleted && (
                <Badge variant="outline" colorScheme="green" borderRadius="full" fontSize="2xs">
                  ✓ Mastered
                </Badge>
              )}
            </HStack>
          </Box>
        </HStack>
      </Box>
    </Box>
  );
}

function PikachuGuide({
  nextLesson,
  hoveredLesson,
  lessons,
  allDone,
}: {
  nextLesson: Lesson | null;
  hoveredLesson: LessonId | null;
  lessons: Lesson[];
  allDone: boolean;
}) {
  const [tipIndex, setTipIndex] = useState(0);
  const SURFACE = useSurface();

  const activeLesson = hoveredLesson
    ? lessons.find((l) => l.id === hoveredLesson) ?? nextLesson
    : nextLesson;

  const tips = useMemo(() => {
    const base = allDone
      ? ['You completed the whole trail! You are a true Graph Master! 🏆']
      : activeLesson
        ? [
            `Ready to learn? Try "${activeLesson.title}" next!`,
            `Tap the ${activeLesson.emoji} card to start your next lesson.`,
            'Every lesson earns you a badge. Keep going!',
            'Hover over any card to see what you will learn.',
          ]
        : ['Hover over a card to see what you will learn!', 'Tap any unlocked card to start a lesson.'];
    return base;
  }, [activeLesson, allDone]);

  const currentTip = tips[tipIndex % tips.length];

  return (
    <Box
      position="absolute"
      bottom={4}
      right={{ base: 2, md: 6 }}
      zIndex={10}
      display="flex"
      flexDirection="column"
      alignItems="center"
      maxW="200px"
      onClick={() => setTipIndex((i) => i + 1)}
      cursor="pointer"
    >
      <Box
        bg="linear-gradient(135deg, #1a1a2e 0%, #162447 100%)"
        borderRadius="xl"
        p={3}
        mb={2}
        border="2px solid"
        borderColor="rgba(247,208,44,0.6)"
        boxShadow="0 8px 30px rgba(0,0,0,0.35)"
        position="relative"
        animation={`${popIn} 0.3s ease both`}
        _after={{
          content: '""',
          position: 'absolute',
          bottom: '-8px',
          right: '28px',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(247,208,44,0.6)',
        }}
      >
        <Text fontSize="xs" color={SURFACE.title} fontWeight="semibold" textAlign="center">
          {currentTip}
        </Text>
      </Box>
      <Image
        src="/themes/pokemon/Widgets/pikachu.png.svg"
        alt="Pikachu guide"
        boxSize={{ base: '64px', md: '80px' }}
        animation={`${float} 2.5s ease-in-out infinite`}
        filter="drop-shadow(0 8px 16px rgba(0,0,0,0.35))"
        transition="transform 0.2s ease"
        _hover={{ transform: 'scale(1.1) rotate(-5deg)' }}
      />
    </Box>
  );
}

function PokemonLabHome({
  lessons,
  completedLessons,
  progress,
  onLessonClick,
  onExplorerOpen,
  onCardLibraryOpen,
}: {
  lessons: Lesson[];
  completedLessons: Set<LessonId>;
  progress: number;
  onLessonClick: (lesson: Lesson) => void;
  onExplorerOpen: () => void;
  onCardLibraryOpen: () => void;
}) {
  const SURFACE = useSurface();
  const toast = useToast();
  const { play: playSound } = useSound();
  const [selectedBadge, setSelectedBadge] = useState<LessonId | null>(null);
  const [hoveredLesson, setHoveredLesson] = useState<LessonId | null>(null);

  // First unlocked-but-incomplete lesson, in section order, for the "Next up" CTA.
  const nextLesson = useMemo<Lesson | null>(() => {
    for (const section of LESSON_SECTIONS) {
      for (const id of section.lessonIds) {
        if (!completedLessons.has(id) && isLessonUnlocked(id, completedLessons)) {
          return lessons.find((l) => l.id === id) ?? null;
        }
      }
    }
    return null;
  }, [completedLessons, lessons]);

  const allDone = completedLessons.size === lessons.length;

  const handleNodeClick = (lesson: Lesson) => {
    if (!isLessonUnlocked(lesson.id, completedLessons)) {
      toast({
        title: '🔒 Locked lesson',
        description: 'Complete the lessons before this one to unlock it!',
        status: 'info',
        duration: 2500,
        isClosable: true,
        variant: 'solid',
      });
      return;
    }
    onLessonClick(lesson);
  };

  return (
    <VStack spacing={6} align="stretch" maxW="1100px" mx="auto" w="full" position="relative" pb={{ base: 28, md: 24 }}>
      {/* ─── Compact module header ─────────────────────────────── */}
      <Box
        bgGradient="linear(135deg, #1a1a2e 0%, #162447 50%, #0f3460 100%)"
        borderRadius="2xl"
        p={{ base: 4, md: 5 }}
        borderWidth="2px"
        borderColor="rgba(99,144,240,0.4)"
        boxShadow="0 10px 40px rgba(15,52,96,0.5)"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="-30px"
          right="-20px"
          fontSize="140px"
          opacity={0.08}
          animation={`${float} 3s ease-in-out infinite`}
          userSelect="none"
          pointerEvents="none"
        >
          🔴
        </Box>
        <HStack spacing={4} position="relative" align="center">
          <Image
            src="/themes/pokemon/Widgets/pikachu.png.svg"
            alt="Pikachu mascot"
            boxSize={{ base: '56px', md: '72px' }}
            animation={`${float} 3s ease-in-out infinite`}
            filter="drop-shadow(0 6px 12px rgba(0,0,0,0.35))"
          />
          <Box flex={1}>
            <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="extrabold" color="white" lineHeight={1.1}>
              Pokémon Knowledge Lab
            </Text>
            <Text color="whiteAlpha.900" fontSize={{ base: 'xs', md: 'sm' }}>
              {completedLessons.size} / {lessons.length} badges earned • follow the trail to mastery
            </Text>
          </Box>
          <Box w={{ base: '100px', md: '160px' }}>
            <Progress value={progress} colorScheme="yellow" borderRadius="full" size="sm" bg="whiteAlpha.200" />
          </Box>
          <Button
            display={{ base: 'none', md: 'flex' }}
            size="sm"
            variant="outline"
            leftIcon={<SearchIcon />}
            onClick={onExplorerOpen}
            borderColor="rgba(255,255,255,0.3)"
            color="white"
            _hover={{ bg: 'whiteAlpha.200' }}
            flexShrink={0}
          >
            Explore
          </Button>
          <Button
            display={{ base: 'none', md: 'flex' }}
            size="sm"
            variant="solid"
            colorScheme="purple"
            onClick={onCardLibraryOpen}
            flexShrink={0}
          >
            🃏 Cards
          </Button>
        </HStack>
      </Box>

      {/* ─── Interconnected Pokémon Trail ────────────────────────── */}
      <Box
        bg={SURFACE.panel}
        borderRadius="2xl"
        p={{ base: 3, md: 6 }}
        borderWidth="2px"
        borderColor={SURFACE.border}
        boxShadow="0 10px 40px rgba(0,0,0,0.35)"
        position="relative"
        overflow="hidden"
        minH="600px"
      >
        {/* Decorative trail background */}
        <Box
          position="absolute"
          top={0}
          left="50%"
          transform="translateX(-50%)"
          h="full"
          w={{ base: '4px', md: '6px' }}
          bgGradient="linear(to-b, #3b7dd8 0%, #ee1515 50%, #f7d02c 100%)"
          opacity={0.25}
          borderRadius="full"
          zIndex={0}
        />

        {/* Wandering dotted path overlay */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}
        >
          <path
            d="M 50 0 C 30 15, 70 25, 50 40 C 30 55, 70 65, 50 80 C 30 90, 70 95, 50 100"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
          />
        </svg>

        {/* Section + trail cards */}
        <VStack spacing={8} align="stretch" position="relative" zIndex={1}>
          {LESSON_SECTIONS.map((section, sectionIdx) => {
            const sectionUnlocked = isSectionUnlocked(section.id, completedLessons);
            const sectionDone = isSectionComplete(section.id, completedLessons);

            return (
              <Box key={section.id} position="relative">
                {/* Section banner */}
                <Box
                  mx="auto"
                  maxW={{ base: 'full', md: '60%' }}
                  bg={sectionUnlocked ? `${section.color}20` : SURFACE.cardLocked}
                  borderRadius="full"
                  p={3}
                  mb={4}
                  borderWidth="2px"
                  borderColor={sectionUnlocked ? section.color : SURFACE.borderLocked}
                  boxShadow={sectionUnlocked ? `0 0 20px ${section.color}33` : 'none'}
                  textAlign="center"
                  opacity={sectionUnlocked ? 1 : 0.75}
                >
                  <HStack justify="center" spacing={2} flexWrap="wrap">
                    <Text fontSize="lg">{section.emoji}</Text>
                    <Text fontWeight="bold" fontSize="sm" color={sectionUnlocked ? section.color : SURFACE.muted}>
                      {section.title}
                    </Text>
                    {sectionDone && (
                      <Badge colorScheme="green" borderRadius="full" px={2} fontSize="2xs">
                        ✓ Complete
                      </Badge>
                    )}
                    {!sectionUnlocked && (
                      <Badge colorScheme="gray" borderRadius="full" px={2} fontSize="2xs">
                        🔒 Locked
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color={SURFACE.body} noOfLines={1} mt={1}>
                    {sectionUnlocked ? section.description : `Complete previous section to unlock`}
                  </Text>
                </Box>

                {/* Trail cards for this section */}
                <VStack spacing={6} align="stretch" position="relative">
                  {section.lessonIds.map((lessonId, lIdx) => {
                    const lesson = lessons.find((l) => l.id === lessonId)!;
                    const isCompleted = completedLessons.has(lessonId);
                    const isUnlocked = isLessonUnlocked(lessonId, completedLessons);
                    const isCurrent = nextLesson?.id === lessonId;
                    const isLeft = lIdx % 2 === 0;
                    const badge = LESSON_BADGES[lessonId];

                    return (
                      <TrailCard
                        key={lessonId}
                        lesson={lesson}
                        badge={badge}
                        isCompleted={isCompleted}
                        isUnlocked={isUnlocked}
                        isCurrent={isCurrent}
                        isLeft={isLeft}
                        onClick={() => handleNodeClick(lesson)}
                        onHover={() => setHoveredLesson(lessonId)}
                        onLeave={() => setHoveredLesson((prev) => (prev === lessonId ? null : prev))}
                      />
                    );
                  })}
                </VStack>
              </Box>
            );
          })}
        </VStack>

        {/* Interactive Pikachu guide */}
        <PikachuGuide
          nextLesson={nextLesson}
          hoveredLesson={hoveredLesson}
          lessons={lessons}
          allDone={allDone}
        />
      </Box>

      {/* ─── Badge Strip ─────────────────────────────────────────── */}
      {completedLessons.size > 0 && (
        <Box
          bg={SURFACE.panel}
          borderRadius="2xl"
          p={5}
          borderWidth="1px"
          borderColor={SURFACE.border}
          boxShadow="0 6px 20px rgba(0,0,0,0.35)"
        >
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" color={SURFACE.muted} fontWeight="bold" textTransform="uppercase">
                Badges Earned
              </Text>
              <Text fontSize="xs" color={SURFACE.body}>
                Click a badge to see your Pokedex page
              </Text>
            </HStack>
            <Wrap spacing={2}>
              {lessons.filter((l) => completedLessons.has(l.id)).map((lesson) => {
                const badge = LESSON_BADGES[lesson.id];
                const isSelected = selectedBadge === lesson.id;
                return (
                  <WrapItem key={lesson.id}>
                    <VStack
                      spacing={1}
                      cursor="pointer"
                      onClick={() => {
                        playSound('click');
                        setSelectedBadge(isSelected ? null : lesson.id);
                      }}
                      transition="all 0.15s ease"
                      _hover={{ transform: 'scale(1.1)' }}
                    >
                      <Circle
                        size="48px"
                        bg={`${lesson.color}33`}
                        border={isSelected ? '3px solid' : '2px solid'}
                        borderColor={lesson.color}
                        boxShadow={isSelected ? `0 0 12px ${lesson.color}88` : 'none'}
                      >
                        <Text fontSize="xl">{badge.badgeEmoji}</Text>
                      </Circle>
                      <Text fontSize="2xs" color={SURFACE.muted} fontWeight="semibold" textAlign="center" maxW="60px" noOfLines={1}>
                        {badge.badgeName}
                      </Text>
                    </VStack>
                  </WrapItem>
                );
              })}
            </Wrap>
          </VStack>

          {/* Pokédex Page — shows when a badge is selected */}
          {selectedBadge && LESSON_BADGES[selectedBadge] && (
            <Box
              mt={4}
              bg="linear-gradient(135deg, #1a1a2e 0%, #162447 100%)"
              borderRadius="xl"
              p={4}
              border="2px solid"
              borderColor={lessons.find((l) => l.id === selectedBadge)?.color ?? SURFACE.border}
              animation={`${popIn} 0.2s ease both`}
            >
              <HStack spacing={3} justify="space-between">
                <HStack spacing={3}>
                  <Circle size="40px" bg="whiteAlpha.200" border="2px solid" borderColor="yellow.400">
                    <Text fontSize="lg">{LESSON_BADGES[selectedBadge].badgeEmoji}</Text>
                  </Circle>
                  <Box>
                    <Text fontSize="xs" color="yellow.300" fontWeight="bold" textTransform="uppercase">
                      Pokedex Page
                    </Text>
                    <Text fontWeight="bold" color="white" fontSize="sm">
                      {LESSON_BADGES[selectedBadge].badgeName}
                    </Text>
                  </Box>
                </HStack>
                <Button size="xs" variant="ghost" color="whiteAlpha.700" onClick={() => setSelectedBadge(null)}>
                  ✕
                </Button>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.900" mt={3}>
                {LESSON_BADGES[selectedBadge].concept}
              </Text>
              <HStack spacing={2} mt={3}>
                <Button
                  size="xs"
                  colorScheme="yellow"
                  variant="outline"
                  onClick={() => {
                    const lesson = lessons.find((l) => l.id === selectedBadge);
                    if (lesson) onLessonClick(lesson);
                  }}
                >
                  Play Again
                </Button>
              </HStack>
            </Box>
          )}
        </Box>
      )}

      {/* ─── Floating Start bar (mobile + desktop) ─────────────── */}
      {nextLesson && (
        <Box
          position="fixed"
          bottom={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 6 }}
          left={{ base: 3, md: '50%' }}
          right={{ base: 3, md: undefined }}
          transform={{ base: 'none', md: 'translateX(-50%)' }}
          w={{ base: 'auto', md: '420px' }}
          zIndex={1100}
          bg={`linear-gradient(135deg, ${nextLesson.color} 0%, ${adjustColor(nextLesson.color, -20)} 100%)`}
          borderRadius="2xl"
          p={3}
          boxShadow={`0 12px 40px ${nextLesson.color}55`}
          border="2px solid"
          borderColor="rgba(255,255,255,0.25)"
          cursor="pointer"
          onClick={() => handleNodeClick(nextLesson)}
          _hover={{ transform: { md: 'translateX(-50%) translateY(-3px)' }, boxShadow: `0 16px 50px ${nextLesson.color}66` }}
          transition="all 0.2s ease"
          animation={`${popIn} 0.4s ease both`}
        >
          <HStack spacing={3}>
            <Circle size="44px" bg="whiteAlpha.300" border="2px solid" borderColor="whiteAlpha.400" flexShrink={0}>
              <Text fontSize="xl">{nextLesson.emoji}</Text>
            </Circle>
            <Box flex={1}>
              <Text fontSize="xs" color="whiteAlpha.900" fontWeight="bold" textTransform="uppercase">
                Continue your journey
              </Text>
              <Text fontWeight="bold" color="white" fontSize="sm">
                {nextLesson.title}
              </Text>
            </Box>
            <Button
              size="sm"
              bg="white"
              color={nextLesson.color}
              fontWeight="bold"
              borderRadius="xl"
              rightIcon={<ChevronRightIcon />}
              _hover={{ bg: 'whiteAlpha.900' }}
            >
              Start
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
}

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function LessonPathNode({
  lesson,
  isCompleted,
  isUnlocked,
  isCurrent,
  isLastNode,
  surface,
  onClick,
  onHover,
  onLeave,
}: {
  lesson: Lesson;
  isCompleted: boolean;
  isUnlocked: boolean;
  isCurrent: boolean;
  isLastNode: boolean;
  surface: typeof DEFAULT_SURFACE;
  onClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const nodeSize = isCurrent ? '56px' : '48px';
  const iconSize = isCurrent ? '24px' : '20px';
  const badge = LESSON_BADGES[lesson.id];

  const bgColor = isCompleted
    ? '#F6AD55' // gold/orange for completed
    : isCurrent
      ? `${lesson.color}50`
      : isUnlocked
        ? `${lesson.color}30`
        : surface.cardLocked;

  const borderColor = isCompleted
    ? '#F6AD55'
    : isCurrent
      ? lesson.color
      : isUnlocked
        ? lesson.color
        : surface.borderLocked;

  const glow = isCurrent ? `0 0 20px ${lesson.color}88, 0 0 8px ${lesson.color}55` : 'none';

  return (
    <HStack
      spacing={4}
      py={3}
      cursor={isUnlocked ? 'pointer' : 'not-allowed'}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onTouchStart={onHover}
      opacity={isUnlocked ? 1 : 0.65}
      transition="all 0.2s ease"
      _hover={isUnlocked ? { transform: 'translateX(6px)' } : {}}
    >
      <Tooltip
        label={isUnlocked ? lesson.description : 'Complete previous lessons to unlock'}
        placement="right"
        hasArrow
        bg="gray.800"
        color="white"
        fontSize="xs"
        borderRadius="lg"
        px={3}
        py={2}
      >
        <Circle
          size={nodeSize}
          bg={bgColor}
          border="3px solid"
          borderColor={borderColor}
          boxShadow={glow}
          zIndex={1}
          flexShrink={0}
          transition="all 0.2s ease"
          position="relative"
        >
          {isCompleted ? (
            <CheckCircleIcon color="white" boxSize={iconSize} />
          ) : (
            <Text fontSize={isCurrent ? '2xl' : 'xl'}>{lesson.emoji}</Text>
          )}
          {isCurrent && (
            <Badge
              position="absolute"
              top="-8px"
              right="-14px"
              colorScheme="yellow"
              borderRadius="full"
              px={2}
              py={0.5}
              fontSize="2xs"
              fontWeight="bold"
              boxShadow="md"
            >
              START
            </Badge>
          )}
        </Circle>
      </Tooltip>

      <Box flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap">
          <Text fontWeight={isCurrent ? 'bold' : 'semibold'} fontSize="sm" color={isUnlocked ? surface.title : surface.muted} noOfLines={1}>
            {lesson.title}
          </Text>
          {isCompleted && (
            <Badge colorScheme="green" borderRadius="full" px={2} fontSize="2xs">
              ✓
            </Badge>
          )}
        </HStack>
        <Text fontSize="xs" color={isUnlocked ? surface.body : surface.muted} noOfLines={2}>
          {isUnlocked ? lesson.description : `Finish the previous lesson to unlock ${badge.badgeName}`}
        </Text>
      </Box>

      {isUnlocked && !isCompleted && (
        <ChevronRightIcon color={isCurrent ? lesson.color : surface.muted} boxSize={5} flexShrink={0} />
      )}
      {!isUnlocked && (
        <Text fontSize="sm" flexShrink={0}>🔒</Text>
      )}
    </HStack>
  );
}

function StatBadge({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <HStack
      bg="whiteAlpha.200"
      borderRadius="lg"
      px={3}
      py={1}
      spacing={1}
    >
      <Text fontSize="sm">{emoji}</Text>
      <Text color="white" fontWeight="bold" fontSize="sm">
        {value.toLocaleString()}
      </Text>
      <Text color="whiteAlpha.700" fontSize="xs">
        {label}
      </Text>
    </HStack>
  );
}

// ─── Lesson View ──────────────────────────────────────────────────────────

function LessonView({
  lesson,
  onComplete,
  onBack,
  onPokemonSelect,
  onExplorerOpen,
}: {
  lesson: Lesson;
  onComplete: () => void;
  onBack: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
  onExplorerOpen: () => void;
}) {
  const ComingSoonLesson = ({ concept }: { concept: string }) => {
    const surface = useSurface();
    return (
      <VStack spacing={4} align="stretch">
        <Box
          bg="rgba(79,172,254,0.15)"
          borderRadius="xl"
          p={5}
          border="1px solid"
          borderColor="rgba(79,172,254,0.4)"
        >
          <VStack spacing={3} align="stretch">
            <Text fontWeight="bold" fontSize="lg" color="white">
              🧪 This lesson is being rebuilt
            </Text>
            <Text color={surface.body} fontSize="sm">
              Next up: <strong>{concept}</strong> with kid-friendly interactive steps.
            </Text>
            <Text color={surface.body} fontSize="sm">
              You can still mark it done for now and keep your Trainer Journey moving.
            </Text>
          </VStack>
        </Box>
        <Button colorScheme="green" onClick={onComplete} rightIcon={<CheckCircleIcon />}>
          Mark Lesson Complete
        </Button>
      </VStack>
    );
  };

  return (
    <VStack spacing={6} align="stretch" maxW="800px" mx="auto" w="full">
      {/* Header */}
      <HStack justify="space-between">
        <Button
          leftIcon={<ChevronLeftIcon />}
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          Back to Lab
        </Button>
        <Badge colorScheme="purple" fontSize="xs">
          {lesson.emoji} {lesson.title}
        </Badge>
      </HStack>

      {/* Lesson content based on type */}
      {lesson.id === 'spot-the-groups' && <SpotTheGroupsLesson onComplete={onComplete} />}
      {lesson.id === 'count-and-graph' && <CountAndGraphLesson onComplete={onComplete} />}
      {lesson.id === 'everything-connects' && <WhatIsKGLesson onComplete={onComplete} />}
      {lesson.id === 'follow-the-strings' && <GraphVizLesson onComplete={onComplete} onPokemonSelect={onPokemonSelect} />}
      {lesson.id === 'strong-and-weak' && <TypeChartLesson onComplete={onComplete} />}
      {lesson.id === 'build-your-team' && <TeamBuilderLesson onComplete={onComplete} />}
      {lesson.id === 'stat-bars' && <StatBarsLesson onComplete={onComplete} />}
      {lesson.id === 'whos-typical' && <WhosTypicalLesson onComplete={onComplete} />}
      {lesson.id === 'ask-the-pokedex' && <QueryPokemonLesson onComplete={onComplete} onPokemonSelect={onPokemonSelect} />}
      {lesson.id === 'talk-to-computer' && <NLQueriesLesson onComplete={onComplete} />}
      {lesson.id === 'data-detective' && <DataDetectiveLesson onComplete={onComplete} onExplorerOpen={onExplorerOpen} />}
      {lesson.id === 'amazing-forms' && <FormsLesson onComplete={onComplete} onPokemonSelect={onPokemonSelect} />}
    </VStack>
  );
}

// ─── Lesson: Spot the Groups & Sort Again ─────────────────────────────────

function SpotTheGroupsLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const [step, setStep] = useState(0);
  const [pokemonCards, setPokemonCards] = useState<PokemonDetail[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [firePick, setFirePick] = useState<Set<string>>(new Set());
  const [fireChecked, setFireChecked] = useState(false);

  const [flyPick, setFlyPick] = useState<Set<string>>(new Set());
  const [flyChecked, setFlyChecked] = useState(false);

  const [ruleChoice, setRuleChoice] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const FIRE_TARGET = useMemo(() => new Set(['charmander', 'charizard', 'vulpix']), []);
  const FLY_TARGET = useMemo(() => new Set(['charizard', 'pidgey']), []);

  const quiz: QuizQuestion[] = [
    {
      question: 'Can one Pokemon fit in more than one group?',
      options: ['No, only one group', 'Yes, groups can overlap', 'Only legendary Pokemon can'],
      answer: 1,
      explanation: 'Yes! Charizard can be in Fire and in Can Fly.',
    },
    {
      question: 'What did you practice in this lesson?',
      options: ['Sorting and re-sorting data', 'Only battling', 'Only drawing Pokemon'],
      answer: 0,
      explanation: 'Great detectives sort data in different ways to learn new things.',
    },
  ];

  useEffect(() => {
    const names = ['charmander', 'charizard', 'vulpix', 'squirtle', 'pidgey', 'oddish'];
    setLoadingCards(true);
    Promise.all(names.map((name) => pokedexClient.pokemonByName(name).catch(() => null)))
      .then((results) => {
        setPokemonCards(results.filter((p): p is PokemonDetail => Boolean(p)));
      })
      .finally(() => setLoadingCards(false));
  }, []);

  const togglePick = (value: string, setter: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const isExactMatch = (picked: Set<string>, target: Set<string>) => (
    picked.size === target.size && Array.from(target).every((name) => picked.has(name))
  );

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    return <LessonResult correct={correct} total={quiz.length} onComplete={onComplete} />;
  }

  const steps = [
    {
      title: 'A Big Pile of Pokemon',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Data detectives start with a mixed pile.</Text>
          <Text>Tap cards in the next steps to make groups.</Text>
          {loadingCards ? (
            <HStack justify="center" py={6}>
              <Spinner color="yellow.300" />
              <Text color={SURFACE.body}>Loading Pokemon cards...</Text>
            </HStack>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
              {pokemonCards.map((p) => (
                <Box
                  key={p.id}
                  bg={SURFACE.card}
                  border="1px solid"
                  borderColor={SURFACE.border}
                  borderRadius="lg"
                  p={3}
                >
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="md"
                    />
                    <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title}>
                      {p.name}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </VStack>
      ),
    },
    {
      title: 'Sort: Fire Pokemon',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Tap every Fire Pokemon card.</Text>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
            {pokemonCards.map((p) => {
              const selected = firePick.has(p.name);
              return (
                <Box
                  key={`fire-${p.id}`}
                  bg={selected ? 'rgba(239,68,68,0.25)' : SURFACE.card}
                  border="2px solid"
                  borderColor={selected ? 'red.300' : SURFACE.border}
                  borderRadius="lg"
                  p={3}
                  cursor="pointer"
                  onClick={() => {
                    setFireChecked(false);
                    togglePick(p.name, setFirePick);
                  }}
                >
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="md"
                    />
                    <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title}>
                      {p.name}
                    </Text>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
          <HStack justify="space-between">
            <Text fontSize="sm" color={SURFACE.body}>Picked: {firePick.size}</Text>
            <Button size="sm" colorScheme="red" onClick={() => { setFireChecked(true); playSound(isExactMatch(firePick, FIRE_TARGET) ? 'success' : 'error'); }}>
              Check my sort
            </Button>
          </HStack>
          {fireChecked && (
            <Box
              bg={isExactMatch(firePick, FIRE_TARGET) ? 'rgba(34,197,94,0.18)' : 'rgba(245,87,108,0.18)'}
              border="1px solid"
              borderColor={isExactMatch(firePick, FIRE_TARGET) ? 'green.300' : 'red.300'}
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="sm" color={SURFACE.title}>
                {isExactMatch(firePick, FIRE_TARGET)
                  ? 'Nice! You found all Fire Pokemon.'
                  : 'Almost! Fire group here is Charmander, Charizard, and Vulpix.'}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Sort Again: Can Fly',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Now sort by a new rule: can fly.</Text>
          <Text fontSize="sm" color={SURFACE.body}>Same cards, new group. Data can be sorted many ways.</Text>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
            {pokemonCards.map((p) => {
              const selected = flyPick.has(p.name);
              return (
                <Box
                  key={`fly-${p.id}`}
                  bg={selected ? 'rgba(59,130,246,0.25)' : SURFACE.card}
                  border="2px solid"
                  borderColor={selected ? 'blue.300' : SURFACE.border}
                  borderRadius="lg"
                  p={3}
                  cursor="pointer"
                  onClick={() => {
                    setFlyChecked(false);
                    togglePick(p.name, setFlyPick);
                  }}
                >
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="md"
                    />
                    <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title}>
                      {p.name}
                    </Text>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
          <HStack justify="space-between">
            <Text fontSize="sm" color={SURFACE.body}>Picked: {flyPick.size}</Text>
            <Button size="sm" colorScheme="blue" onClick={() => { setFlyChecked(true); playSound(isExactMatch(flyPick, FLY_TARGET) ? 'success' : 'error'); }}>
              Check my sort
            </Button>
          </HStack>
          {flyChecked && (
            <Box
              bg={isExactMatch(flyPick, FLY_TARGET) ? 'rgba(34,197,94,0.18)' : 'rgba(245,87,108,0.18)'}
              border="1px solid"
              borderColor={isExactMatch(flyPick, FLY_TARGET) ? 'green.300' : 'red.300'}
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="sm" color={SURFACE.title}>
                {isExactMatch(flyPick, FLY_TARGET)
                  ? 'Great! Charizard and Pidgey fit this rule.'
                  : 'Try again! The flying group here is Charizard and Pidgey.'}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Guess My Rule',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>I grouped <strong>Charizard</strong> and <strong>Pidgey</strong>.</Text>
          <Text fontSize="sm" color={SURFACE.body}>What rule did I use?</Text>
          <VStack spacing={2} align="stretch">
            {['Fire type', 'Can fly', 'Water type', 'Legendary'].map((option, idx) => {
              let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
              if (ruleChoice !== null) {
                if (idx === 1) state = 'correct';
                else if (idx === ruleChoice) state = 'incorrect';
              } else if (idx === ruleChoice) {
                state = 'selected';
              }

              return (
                <BigChoiceButton
                  key={option}
                  label={String.fromCharCode(65 + idx)}
                  option={option}
                  state={state}
                  onClick={() => setRuleChoice(idx)}
                  showCheck={ruleChoice !== null && idx === 1}
                />
              );
            })}
          </VStack>
          {ruleChoice !== null && (
            <Box bg="rgba(79,172,254,0.15)" border="1px solid" borderColor="rgba(79,172,254,0.4)" borderRadius="lg" p={3}>
              <Text fontSize="sm" color={SURFACE.title}>
                Nice detective work! Same cards can be sorted by different rules.
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Quick Check',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

function TallyCounter({
  label,
  colorScheme,
  value,
  onChange,
}: {
  label: string;
  colorScheme: 'red' | 'blue' | 'green';
  value: number;
  onChange: (next: number) => void;
}) {
  const SURFACE = useSurface();
  return (
    <Box bg={SURFACE.card} border="1px solid" borderColor={SURFACE.border} borderRadius="lg" p={3}>
      <HStack justify="space-between" align="center">
        <Text fontWeight="bold" color={SURFACE.title}>{label}</Text>
        <HStack>
          <Button
            size="xs"
            onClick={() => onChange(Math.max(0, value - 1))}
            colorScheme={colorScheme}
            variant="outline"
          >
            -
          </Button>
          <Badge colorScheme={colorScheme} fontSize="md" px={3} py={1} borderRadius="full">
            {value}
          </Badge>
          <Button
            size="xs"
            onClick={() => onChange(value + 1)}
            colorScheme={colorScheme}
          >
            +
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}

// ─── Lesson: Count & Graph ────────────────────────────────────────────────

function CountAndGraphLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  type CountGroup = 'fire' | 'water' | 'grass';

  const sampleCards = useMemo(
    () => [
      { name: 'charmander', group: 'fire' as CountGroup },
      { name: 'vulpix', group: 'fire' as CountGroup },
      { name: 'ponyta', group: 'fire' as CountGroup },
      { name: 'growlithe', group: 'fire' as CountGroup },
      { name: 'squirtle', group: 'water' as CountGroup },
      { name: 'psyduck', group: 'water' as CountGroup },
      { name: 'poliwag', group: 'water' as CountGroup },
      { name: 'bulbasaur', group: 'grass' as CountGroup },
      { name: 'oddish', group: 'grass' as CountGroup },
    ],
    [],
  );

  const [step, setStep] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardDetails, setCardDetails] = useState<Record<string, PokemonDetail | null>>({});

  const [fireTally, setFireTally] = useState(0);
  const [waterTally, setWaterTally] = useState(0);
  const [grassTally, setGrassTally] = useState(0);
  const [fireChecked, setFireChecked] = useState(false);
  const [otherChecked, setOtherChecked] = useState(false);

  const [highlightedGroup, setHighlightedGroup] = useState<CountGroup | null>(null);
  const [biggestChoice, setBiggestChoice] = useState<number | null>(null);

  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setLoadingCards(true);
    Promise.all(
      sampleCards.map((card) => pokedexClient.pokemonByName(card.name).catch(() => null)),
    )
      .then((details) => {
        const next: Record<string, PokemonDetail | null> = {};
        for (let i = 0; i < sampleCards.length; i += 1) {
          next[sampleCards[i].name] = details[i];
        }
        setCardDetails(next);
      })
      .finally(() => setLoadingCards(false));
  }, [sampleCards]);

  const actualCounts = useMemo(
    () => ({ fire: 4, water: 3, grass: 2 }),
    [],
  );

  const quiz: QuizQuestion[] = [
    {
      question: 'How many MORE Fire Pokemon than Water Pokemon?',
      options: ['0 more', '1 more', '2 more', '3 more'],
      answer: 1,
      explanation: 'There are 4 Fire and 3 Water, so Fire has 1 more.',
    },
    {
      question: 'If we add 1 Water Pokemon, who has the most?',
      options: ['Fire', 'Water', 'Grass', 'Fire and Water tie'],
      answer: 3,
      explanation: 'Then Fire = 4 and Water = 4, so it is a tie.',
    },
  ];

  if (showResult) {
    const quizCorrect = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    const biggestCorrect = biggestChoice === 0 ? 1 : 0;
    return (
      <LessonResult
        correct={quizCorrect + biggestCorrect}
        total={quiz.length + 1}
        onComplete={onComplete}
      />
    );
  }

  const steps = [
    {
      title: 'Count the Fire Team',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Look at this Pokemon set. How many are Fire?</Text>
          {loadingCards ? (
            <HStack justify="center" py={6}>
              <Spinner color="orange.300" />
              <Text color={SURFACE.body}>Loading cards...</Text>
            </HStack>
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
              {sampleCards.map((card) => {
                const detail = cardDetails[card.name];
                return (
                  <Box
                    key={card.name}
                    bg={card.group === 'fire' ? 'rgba(239,68,68,0.18)' : SURFACE.card}
                    border="1px solid"
                    borderColor={card.group === 'fire' ? 'red.300' : SURFACE.border}
                    borderRadius="lg"
                    p={3}
                  >
                    <VStack spacing={1}>
                      <PokemonSprite
                        name={card.name}
                        spriteDreamWorld={detail?.sprite_dream_world}
                        officialArtwork={detail?.official_artwork}
                        animeArtwork={detail?.anime_artwork}
                        spriteFront={detail?.sprite_front}
                        size="md"
                      />
                      <Text textTransform="capitalize" fontSize="sm" fontWeight="bold" color={SURFACE.title}>
                        {card.name}
                      </Text>
                    </VStack>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
          <TallyCounter
            label="Fire Tally"
            colorScheme="red"
            value={fireTally}
            onChange={(next) => {
              setFireChecked(false);
              setFireTally(next);
            }}
          />
          <Button size="sm" colorScheme="red" onClick={() => { setFireChecked(true); playSound(fireTally === actualCounts.fire ? 'success' : 'error'); }}>
            Check Fire Count
          </Button>
          {fireChecked && (
            <Box
              bg={fireTally === actualCounts.fire ? 'rgba(34,197,94,0.18)' : 'rgba(245,87,108,0.18)'}
              border="1px solid"
              borderColor={fireTally === actualCounts.fire ? 'green.300' : 'red.300'}
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="sm" color={SURFACE.title}>
                {fireTally === actualCounts.fire
                  ? 'Great count! There are 4 Fire Pokemon.'
                  : `Good try! The Fire count is ${actualCounts.fire}.`}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Now Count Water and Grass',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Use tallies again for Water and Grass.</Text>
          <TallyCounter
            label="Water Tally"
            colorScheme="blue"
            value={waterTally}
            onChange={(next) => {
              setOtherChecked(false);
              setWaterTally(next);
            }}
          />
          <TallyCounter
            label="Grass Tally"
            colorScheme="green"
            value={grassTally}
            onChange={(next) => {
              setOtherChecked(false);
              setGrassTally(next);
            }}
          />
          <Button size="sm" colorScheme="blue" onClick={() => { setOtherChecked(true); playSound(waterTally === actualCounts.water && grassTally === actualCounts.grass ? 'success' : 'error'); }}>
            Check Water + Grass
          </Button>
          {otherChecked && (
            <Box
              bg={waterTally === actualCounts.water && grassTally === actualCounts.grass ? 'rgba(34,197,94,0.18)' : 'rgba(245,87,108,0.18)'}
              border="1px solid"
              borderColor={waterTally === actualCounts.water && grassTally === actualCounts.grass ? 'green.300' : 'red.300'}
              borderRadius="lg"
              p={3}
            >
              <Text fontSize="sm" color={SURFACE.title}>
                {waterTally === actualCounts.water && grassTally === actualCounts.grass
                  ? 'Awesome! Water is 3 and Grass is 2.'
                  : `Check again: Water is ${actualCounts.water} and Grass is ${actualCounts.grass}.`}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Picture Graph Time',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Each dot is 1 Pokemon. Tap a type to spotlight its bar.</Text>
          <HStack spacing={2}>
            <Button size="xs" colorScheme="red" onClick={() => setHighlightedGroup('fire')}>🔥 Fire</Button>
            <Button size="xs" colorScheme="blue" onClick={() => setHighlightedGroup('water')}>💧 Water</Button>
            <Button size="xs" colorScheme="green" onClick={() => setHighlightedGroup('grass')}>🌿 Grass</Button>
          </HStack>
          <HStack align="end" spacing={4} minH="180px">
            {(['fire', 'water', 'grass'] as CountGroup[]).map((group) => {
              const count = actualCounts[group];
              const active = highlightedGroup === group;
              return (
                <Box
                  key={group}
                  flex={1}
                  bg={active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}
                  border="1px solid"
                  borderColor={active ? 'yellow.300' : SURFACE.border}
                  borderRadius="lg"
                  p={3}
                >
                  <VStack spacing={1} justify="flex-end" minH="130px">
                    {Array.from({ length: count }).map((_, idx) => (
                      <Circle key={`${group}-${idx}`} size="18px" bg="yellow.300" />
                    ))}
                  </VStack>
                  <Text textAlign="center" fontSize="xs" mt={2} color={SURFACE.title}>
                    {group.toUpperCase()} ({count})
                  </Text>
                </Box>
              );
            })}
          </HStack>

          <Text fontSize="sm" color={SURFACE.body}>Which group has the MOST Pokemon?</Text>
          <VStack spacing={2} align="stretch">
            {['Fire', 'Water', 'Grass'].map((option, idx) => {
              let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
              if (biggestChoice !== null) {
                if (idx === 0) state = 'correct';
                else if (idx === biggestChoice) state = 'incorrect';
              }

              return (
                <BigChoiceButton
                  key={option}
                  label={String.fromCharCode(65 + idx)}
                  option={option}
                  state={state}
                  onClick={() => setBiggestChoice(idx)}
                  showCheck={biggestChoice !== null && idx === 0}
                />
              );
            })}
          </VStack>
        </VStack>
      ),
    },
    {
      title: 'Quick Compare Check',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

// ─── Lesson: Everything Connects (L3) ──────────────────────────────────────

function WhatIsKGLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [tappedCards, setTappedCards] = useState<Set<number>>(new Set());
  const [connectedNodes, setConnectedNodes] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const connectionSteps = [
    { from: 'Pikachu', to: 'Electric', label: 'has type' },
    { from: 'Pikachu', to: 'Thunder', label: 'can learn' },
    { from: 'Pikachu', to: 'Raichu', label: 'grows into' },
  ];

  const tapCards = [
    { id: 0, emoji: '🔴', label: 'Pokemon', kid: 'A Pokemon like Pikachu or Charizard!' },
    { id: 1, emoji: '⚡', label: 'Type', kid: 'A type like Fire, Water, or Electric!' },
    { id: 2, emoji: '⚔️', label: 'Move', kid: 'A move like Thunder or Flamethrower!' },
    { id: 3, emoji: '✨', label: 'Ability', kid: 'A special power like Static or Blaze!' },
    { id: 4, emoji: '🧬', label: 'Evolution', kid: 'How a Pokemon grows into a new form!' },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: 'In a knowledge web, the dots are called...',
      options: ['Strings', 'Nodes', 'Colors', 'Numbers'],
      answer: 1,
      explanation: 'Nodes are the dots! Each dot is a thing like a Pokemon or a Type.',
    },
    {
      question: 'What do the strings (lines) show?',
      options: ['How big things are', 'How things are connected', 'What color things are', 'How old things are'],
      answer: 1,
      explanation: 'Strings show how things are connected — like "Pikachu has type Electric"!',
    },
  ];

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    return <LessonResult correct={correct} total={quiz.length} onComplete={onComplete} />;
  }

  const steps = [
    {
      title: 'Everything Connects!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Look at Pikachu! It has strings connecting it to lots of things.
            Each string shows a connection.
          </Text>
          <Box
            bg={SURFACE.panel}
            borderRadius="lg"
            p={6}
            position="relative"
            h="220px"
            border="1px solid"
            borderColor={SURFACE.border}
            overflow="hidden"
          >
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              <line x1="20%" y1="50%" x2="70%" y2="20%" stroke="#facc15" strokeWidth="3" strokeDasharray="6 3" />
              <line x1="20%" y1="50%" x2="70%" y2="50%" stroke="#3b82f6" strokeWidth="3" strokeDasharray="6 3" />
              <line x1="20%" y1="50%" x2="70%" y2="80%" stroke="#a78bfa" strokeWidth="3" strokeDasharray="6 3" />
              <text x="45%" y="32%" fill="#facc15" fontSize="11" fontWeight="bold" textAnchor="middle">has type</text>
              <text x="45%" y="47%" fill="#3b82f6" fontSize="11" fontWeight="bold" textAnchor="middle">can learn</text>
              <text x="45%" y="72%" fill="#a78bfa" fontSize="11" fontWeight="bold" textAnchor="middle">grows into</text>
            </svg>
            <NodeDot label="🔴 Pikachu" x="20%" y="50%" color="#fbbf24" />
            <NodeDot label="⚡ Electric" x="70%" y="20%" color="#facc15" />
            <NodeDot label="⚔️ Thunder" x="70%" y="50%" color="#3b82f6" />
            <NodeDot label="🧬 Raichu" x="70%" y="80%" color="#a78bfa" />
          </Box>
          <Text fontSize="sm" color={SURFACE.body}>
            This is called a <strong>knowledge web</strong> — or a <strong>knowledge graph</strong>!
            It's a way to store facts and how they connect.
          </Text>
        </VStack>
      ),
    },
    {
      title: 'The Friend Web',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Think of it like a <strong>friend web</strong>. You are connected to your friends,
            and your friends are connected to their friends. Everything links together!
          </Text>
          <Box
            bg={SURFACE.panel}
            borderRadius="lg"
            p={6}
            position="relative"
            h="200px"
            border="1px solid"
            borderColor={SURFACE.border}
            overflow="hidden"
          >
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
              <line x1="50%" y1="50%" x2="20%" y2="25%" stroke="#43e97b" strokeWidth="2" />
              <line x1="50%" y1="50%" x2="80%" y2="25%" stroke="#43e97b" strokeWidth="2" />
              <line x1="50%" y1="50%" x2="20%" y2="75%" stroke="#43e97b" strokeWidth="2" />
              <line x1="50%" y1="50%" x2="80%" y2="75%" stroke="#43e97b" strokeWidth="2" />
              <line x1="20%" y1="25%" x2="80%" y2="25%" stroke="#43e97b" strokeWidth="1" opacity="0.4" />
            </svg>
            <NodeDot label="You" x="50%" y="50%" color="#fbbf24" />
            <NodeDot label="Friend 1" x="20%" y="25%" color="#43e97b" />
            <NodeDot label="Friend 2" x="80%" y="25%" color="#43e97b" />
            <NodeDot label="Friend 3" x="20%" y="75%" color="#43e97b" />
            <NodeDot label="Friend 4" x="80%" y="75%" color="#43e97b" />
          </Box>
          <Text fontSize="sm" color={SURFACE.body}>
            In our Pokemon web, Pikachu is connected to its type, its moves, and its evolution!
          </Text>
        </VStack>
      ),
    },
    {
      title: 'Tap the Dots!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            The dots in our web are called <strong>nodes</strong>. Tap each card to learn what
            kind of nodes we have!
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {tapCards.map((card) => {
              const tapped = tappedCards.has(card.id);
              return (
                <Box
                  key={card.id}
                  bg={tapped ? SURFACE.card : 'rgba(255,255,255,0.05)'}
                  borderRadius="lg"
                  p={3}
                  border="2px solid"
                  borderColor={tapped ? 'blue.400' : 'whiteAlpha.200'}
                  cursor="pointer"
                  _hover={{ borderColor: 'blue.300' }}
                  transition="all 0.15s ease"
                  onClick={() => setTappedCards((prev) => new Set(prev).add(card.id))}
                >
                  <HStack spacing={3}>
                    <Text fontSize="2xl">{card.emoji}</Text>
                    <Box>
                      <Text fontWeight="bold" fontSize="sm" color={SURFACE.title}>{card.label}</Text>
                      {tapped && <Text fontSize="xs" color={SURFACE.body}>{card.kid}</Text>}
                      {!tapped && <Text fontSize="xs" color={SURFACE.muted}>Tap to reveal!</Text>}
                    </Box>
                    {tapped && <Text ml="auto" color="green.400" fontSize="lg">✓</Text>}
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
          {tappedCards.size === tapCards.length && (
            <Box bg="rgba(67,233,123,0.12)" borderRadius="lg" p={3} border="1px solid" borderColor="rgba(67,233,123,0.3)">
              <Text fontSize="sm" color="green.300">
                🎉 You found all the node types! Everything in the Pokemon world is a node.
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Build a Connection',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            The strings in our web are called <strong>edges</strong>. Let's build some connections!
            Tap each button to snap a string into place.
          </Text>
          <VStack spacing={3} align="stretch">
            {connectionSteps.map((conn, i) => {
              const connected = connectedNodes.includes(`${i}`);
              return (
                <Box
                  key={i}
                  bg={SURFACE.card}
                  borderRadius="lg"
                  p={4}
                  border="1px solid"
                  borderColor={connected ? 'green.400' : SURFACE.border}
                >
                  <HStack spacing={3} justify="center">
                    <Badge colorScheme="yellow" fontSize="sm">{conn.from}</Badge>
                    <Text fontSize="lg" color={connected ? 'green.400' : SURFACE.muted}>
                      {connected ? `──[ ${conn.label} ]──` : '· · · · · ·'}
                    </Text>
                    <Badge colorScheme="purple" fontSize="sm">{conn.to}</Badge>
                    {!connected && (
                      <Button
                        size="xs"
                        colorScheme="blue"
                        onClick={() => setConnectedNodes((prev) => [...prev, `${i}`])}
                      >
                        Connect!
                      </Button>
                    )}
                    {connected && <Text color="green.400" fontSize="lg">✓</Text>}
                  </HStack>
                </Box>
              );
            })}
          </VStack>
          {connectedNodes.length === connectionSteps.length && (
            <Box bg="rgba(79,172,254,0.15)" border="1px solid" borderColor="rgba(79,172,254,0.4)" borderRadius="lg" p={3}>
              <Text fontSize="sm" color={SURFACE.title}>
                Now we can ask: "Show me all Water Pokemon!" The web knows the answer because
                everything is connected. 🎉
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Quick Check',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

// ─── Lesson: Nodes & Edges ────────────────────────────────────────────────

function NodesEdgesLesson({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const quiz: QuizQuestion[] = [
    {
      question: 'In our graph, "Pikachu" is a...',
      options: ['Edge', 'Node', 'Relationship', 'Property'],
      answer: 1,
      explanation: 'Pikachu is a node — specifically a :Pokemon node!',
    },
    {
      question: 'What does the edge "EVOLVES_INTO" connect?',
      options: [
        'A Pokemon and a Type',
        'Two Species nodes',
        'A Pokemon and a Move',
        'Two Types',
      ],
      answer: 1,
      explanation: 'EVOLVES_INTO connects two Species nodes — like Charmander evolving into Charmeleon!',
    },
    {
      question: 'What are properties on an edge?',
      options: [
        'Extra information about the relationship',
        'The names of nodes',
        'Colors of the graph',
        'Types of Pokemon',
      ],
      answer: 0,
      explanation: 'Properties add extra info — like the "level" on a CAN_LEARN edge telling you at what level a Pokemon learns a move!',
    },
  ];

  const surface = useSurface();
  const steps = [
    {
      title: 'Nodes: The Dots',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            <strong>Nodes</strong> are the dots in our graph. Each node represents a thing.
            In our Pokemon graph, we have many types of nodes:
          </Text>
          <SimpleGrid columns={2} spacing={3}>
            {[
              { label: 'Pokemon', emoji: '🔴', example: 'Pikachu, Charizard' },
              { label: 'Type', emoji: '⚡', example: 'Fire, Water, Grass' },
              { label: 'Move', emoji: '⚔️', example: 'Thunder, Flamethrower' },
              { label: 'Ability', emoji: '✨', example: 'Static, Blaze' },
              { label: 'Species', emoji: '🧬', example: 'Mouse Pokemon' },
              { label: 'Region', emoji: '🗺️', example: 'Kanto, Johto' },
              { label: 'Generation', emoji: '🎮', example: 'Gen I, Gen II' },
              { label: 'Item', emoji: '🎒', example: 'Potion, Pokeball' },
            ].map((node) => (
              <Box
                key={node.label}
                bg="rgba(255,255,255,0.05)"
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <HStack spacing={2}>
                  <Text fontSize="lg">{node.emoji}</Text>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm">:{node.label}</Text>
                    <Text fontSize="xs" color={surface.muted}>{node.example}</Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      ),
    },
    {
      title: 'Edges: The Lines',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            <strong>Edges</strong> are the lines connecting nodes. They show
            <em> how</em> things are related. Each edge has a direction and a label.
          </Text>
          <VStack spacing={3} align="stretch">
            {[
              { edge: 'HAS_TYPE', from: 'Pokemon', to: 'Type', emoji: '⚡' },
              { edge: 'CAN_LEARN', from: 'Pokemon', to: 'Move', emoji: '⚔️' },
              { edge: 'HAS_ABILITY', from: 'Pokemon', to: 'Ability', emoji: '✨' },
              { edge: 'EVOLVES_INTO', from: 'Species', to: 'Species', emoji: '🧬' },
              { edge: 'STRONG_AGAINST', from: 'Type', to: 'Type', emoji: '💪' },
              { edge: 'FOUND_IN', from: 'Pokemon', to: 'LocationArea', emoji: '📍' },
            ].map((rel) => (
              <Box
                key={rel.edge}
                bg="rgba(255,255,255,0.05)"
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <HStack spacing={2} fontSize="sm">
                  <Badge colorScheme="blue">{rel.from}</Badge>
                  <Text fontWeight="bold" color="purple.300">─[{rel.edge}]→</Text>
                  <Badge colorScheme="green">{rel.to}</Badge>
                  <Text ml="auto">{rel.emoji}</Text>
                </HStack>
              </Box>
            ))}
          </VStack>
          <Box
            bg="rgba(67,233,123,0.1)"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="rgba(67,233,123,0.3)"
          >
            <Text fontSize="sm" color={surface.body}>
              💡 Edges can also have <strong>properties</strong>! For example, the
              "CAN_LEARN" edge has a "level" property — telling you at what level
              a Pokemon learns that move.
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Quiz Time!',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    return <LessonResult correct={correct} total={quiz.length} onComplete={onComplete} />;
  }

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

// ─── Lesson: Ask the Pokedex (L9) ──────────────────────────────────────────

function QueryPokemonLesson({
  onComplete,
  onPokemonSelect,
}: {
  onComplete: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchCount, setSearchCount] = useState(0);

  const doSearch = useCallback(async (q?: string) => {
    const query = q ?? searchQuery;
    if (q) setSearchQuery(q);
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await pokedexClient.searchPokemon(query, '', undefined, undefined, 12);
      setResults(data ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const quickSearches = ['pikachu', 'char', 'mew', 'dragon', 'legendary'];

  const steps = [
    {
      title: 'Ask the Pokedex a Question!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            The Pokedex is like a <strong>super-smart robot</strong> that knows about
            every Pokemon. You can ask it questions by searching!
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              💡 When you search, the Pokedex looks through its entire web of facts
              to find Pokemon that match your question. It's like asking:
              "Hey Pokedex, show me all Pokemon with 'char' in their name!"
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Try Searching!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Type a name or tap a quick button to search!</Text>
          <HStack>
            <InputGroup>
              <InputLeftElement>
                <SearchIcon color={SURFACE.muted} />
              </InputLeftElement>
              <Input
                placeholder="Type a Pokemon name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                bg="rgba(255,255,255,0.05)"
                borderColor={SURFACE.border}
              />
            </InputGroup>
            <Button colorScheme="purple" onClick={() => doSearch()} isLoading={loading}>
              Search
            </Button>
          </HStack>
          <HStack spacing={2} justify="center">
            {quickSearches.map((q) => (
              <Button
                key={q}
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={() => doSearch(q)}
              >
                "{q}"
              </Button>
            ))}
          </HStack>

          {loading && (
            <HStack justify="center" py={4}>
              <Spinner color="purple.400" />
              <Text color={SURFACE.muted}>Asking the Pokedex...</Text>
            </HStack>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <Text color={SURFACE.muted} textAlign="center" py={4}>
              No Pokemon found. Try another search! 🔍
            </Text>
          )}

          {!loading && results.length > 0 && (
            <>
              <Text fontSize="sm" color="green.300">
                ✓ The Pokedex found {results.length} Pokemon!
              </Text>
              <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
                {results.map((p) => (
                  <Box
                    key={p.id}
                    bg={SURFACE.card}
                    borderRadius="lg"
                    p={3}
                    cursor="pointer"
                    _hover={{ transform: 'scale(1.05)', borderColor: 'purple.400' }}
                    transition="all 0.15s ease"
                    border="1px solid"
                    borderColor={SURFACE.border}
                    onClick={async () => {
                      setSearchCount((c) => c + 1);
                      const detail = await pokedexClient.pokemonByName(p.name);
                      if (detail) onPokemonSelect(detail);
                    }}
                  >
                    <VStack spacing={1}>
                      <PokemonSprite
                        name={p.name}
                        spriteDreamWorld={p.sprite_dream_world}
                        officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                        spriteFront={p.sprite_front}
                        size="md"
                      />
                      <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize" color={SURFACE.title}>
                        {p.name}
                      </Text>
                      <Text fontSize="xs" color={SURFACE.muted}>
                        #{p.pokedex_number}
                      </Text>
                      <HStack spacing={1}>
                        {p.types.map((t) => (
                          <Tag
                            key={t}
                            size="sm"
                            bg={`${getTypeColor(t)}40`}
                            color={getTypeColor(t)}
                            borderRadius="full"
                          >
                            <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                          </Tag>
                        ))}
                      </HStack>
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </>
          )}

          {!hasSearched && !loading && (
            <Box bg="rgba(79,172,254,0.1)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(79,172,254,0.3)">
              <Text fontSize="sm" color={SURFACE.body}>
                💡 Tap a purple button above to try a quick search, or type your own
                Pokemon name and press Search!
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'You Did It!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            🎉 You asked the Pokedex questions!
          </Text>
          <Text>
            Every time you searched, the Pokedex looked through its giant web of facts
            to find matching Pokemon. That's how knowledge webs work — you ask a question,
            and the web finds the answer!
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              🚀 In the next lesson, you'll learn how to talk to the computer using
              your own words — no typing needed!
            </Text>
          </Box>
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Lesson: Strong & Weak (L5) ────────────────────────────────────────────

function TypeChartLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string>('');
  const [effectiveness, setEffectiveness] = useState<TypeEffectiveness | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [battleAttacker, setBattleAttacker] = useState<string>('');
  const [battleDefender, setBattleDefender] = useState<string>('');
  const [battleResult, setBattleResult] = useState<string>('');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const rpsTypes = ['fire', 'water', 'grass'];
  const rpsMatchup: Record<string, string> = { fire: 'grass', water: 'fire', grass: 'water' };

  const fetchEffectiveness = useCallback(async (type: string) => {
    setSelectedType(type);
    setLoading(true);
    try {
      const data = await pokedexClient.typeEffectiveness(type);
      setEffectiveness(data);
    } catch {
      setEffectiveness(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBattle = () => {
    if (!battleAttacker || !battleDefender) return;
    let result = 'tie';
    if (rpsMatchup[battleAttacker] === battleDefender) {
      result = 'win';
    } else if (rpsMatchup[battleDefender] === battleAttacker) {
      result = 'lose';
    }
    setBattleResult(result);
    if (result === 'win') playSound('success');
    else if (result === 'lose') playSound('error');
  };

  const quiz: QuizQuestion[] = [
    {
      question: 'Fire is strong against Grass. What does that mean?',
      options: [
        'Grass beats Fire',
        'Fire moves do extra damage to Grass',
        'Fire and Grass are equal',
        'Fire can\'t hurt Grass',
      ],
      answer: 1,
      explanation: 'Fire moves do 2x damage to Grass Pokemon — super effective!',
    },
    {
      question: 'If Water is strong against Fire, who wins: Water vs Fire?',
      options: ['Fire wins', 'Water wins', 'It\'s a tie', 'Nobody wins'],
      answer: 1,
      explanation: 'Water beats Fire! Water moves do 2x damage to Fire Pokemon.',
    },
  ];

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    return <LessonResult correct={correct} total={quiz.length} onComplete={onComplete} />;
  }

  const steps = [
    {
      title: 'Rock, Paper, Scissors!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Pokemon types work like <strong>rock-paper-scissors</strong>! Each type is
            strong against some and weak against others.
          </Text>
          <Box bg={SURFACE.panel} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <HStack spacing={4} justify="center" fontSize="2xl">
              <Text>🔥 <strong>Fire</strong></Text>
              <Text color="green.400">beats</Text>
              <Text>🌿 <strong>Grass</strong></Text>
            </HStack>
            <Divider my={3} borderColor={SURFACE.border} />
            <HStack spacing={4} justify="center" fontSize="2xl">
              <Text>💧 <strong>Water</strong></Text>
              <Text color="green.400">beats</Text>
              <Text>🔥 <strong>Fire</strong></Text>
            </HStack>
            <Divider my={3} borderColor={SURFACE.border} />
            <HStack spacing={4} justify="center" fontSize="2xl">
              <Text>🌿 <strong>Grass</strong></Text>
              <Text color="green.400">beats</Text>
              <Text>💧 <strong>Water</strong></Text>
            </HStack>
          </Box>
          <Text fontSize="sm" color={SURFACE.body}>
            It's a circle! Fire beats Grass, Grass beats Water, Water beats Fire. Cool, right?
          </Text>
        </VStack>
      ),
    },
    {
      title: 'Predict: Who Wins?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Let's play a game! <strong>Fire vs Grass</strong> — who do you think wins?
          </Text>
          <HStack spacing={3} justify="center">
            <Box
              bg={prediction === 0 ? 'rgba(238,129,48,0.3)' : SURFACE.card}
              border="3px solid"
              borderColor={prediction === 0 ? '#EE8130' : SURFACE.border}
              borderRadius="xl"
              p={4}
              cursor="pointer"
              _hover={{ borderColor: '#EE8130' }}
              transition="all 0.15s ease"
              textAlign="center"
              onClick={() => { setPrediction(0); setRevealed(false); }}
            >
              <Text fontSize="3xl">🔥</Text>
              <Text fontWeight="bold" color="#EE8130">Fire wins!</Text>
            </Box>
            <Box
              bg={prediction === 1 ? 'rgba(122,199,76,0.3)' : SURFACE.card}
              border="3px solid"
              borderColor={prediction === 1 ? '#7AC74C' : SURFACE.border}
              borderRadius="xl"
              p={4}
              cursor="pointer"
              _hover={{ borderColor: '#7AC74C' }}
              transition="all 0.15s ease"
              textAlign="center"
              onClick={() => { setPrediction(1); setRevealed(false); }}
            >
              <Text fontSize="3xl">🌿</Text>
              <Text fontWeight="bold" color="#7AC74C">Grass wins!</Text>
            </Box>
          </HStack>
          {prediction !== null && !revealed && (
            <Button colorScheme="yellow" size="sm" alignSelf="center" onClick={() => { setRevealed(true); playSound(prediction === 0 ? 'success' : 'error'); }}>
              Reveal the answer! ✨
            </Button>
          )}
          {revealed && (
            <Box
              bg={prediction === 0 ? 'rgba(67,233,123,0.15)' : 'rgba(245,87,108,0.15)'}
              borderRadius="lg"
              p={4}
              border="2px solid"
              borderColor={prediction === 0 ? 'green.400' : 'red.400'}
              textAlign="center"
            >
              <Text fontSize="lg" color={prediction === 0 ? 'green.300' : 'red.300'}>
                {prediction === 0 ? '🎉 Correct! Fire beats Grass!' : '❌ Not quite! Fire beats Grass!'}
              </Text>
              <Text fontSize="sm" color={SURFACE.body} mt={2}>
                Fire moves do <strong>2x damage</strong> to Grass Pokemon. That's super effective!
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Explore a Type',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Pick any type to see what it beats and what beats it!</Text>
          <Wrap>
            {['fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'poison', 'normal'].map((t) => (
              <WrapItem key={t}>
                <Button
                  size="xs"
                  onClick={() => fetchEffectiveness(t)}
                  bg={selectedType === t ? getTypeColor(t) : `${getTypeColor(t)}30`}
                  color={selectedType === t ? 'white' : getTypeColor(t)}
                  border="1px solid"
                  borderColor={getTypeColor(t)}
                  _hover={{ bg: getTypeColor(t), color: 'white' }}
                  borderRadius="full"
                >
                  {getTypeEmoji(t)} {titleCase(t)}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
          {loading && (
            <HStack justify="center" py={4}>
              <Spinner color="purple.400" />
              <Text color={SURFACE.muted}>Loading...</Text>
            </HStack>
          )}
          {!loading && effectiveness && (
            <VStack spacing={3} align="stretch">
              <Box
                bg={`${getTypeColor(effectiveness.type)}30`}
                borderRadius="xl"
                p={3}
                textAlign="center"
                border="2px solid"
                borderColor={getTypeColor(effectiveness.type)}
              >
                <Text fontSize="2xl">{getTypeEmoji(effectiveness.type)}</Text>
                <Text fontSize="lg" fontWeight="bold" textTransform="capitalize" color={getTypeColor(effectiveness.type)}>
                  {effectiveness.type}
                </Text>
              </Box>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <EffectivenessBox
                  title="💪 Beats (2x)"
                  types={effectiveness.strong_against}
                  colorScheme="green"
                />
                <EffectivenessBox
                  title="🛡️ Weak to (0.5x)"
                  types={effectiveness.weak_against}
                  colorScheme="orange"
                />
              </SimpleGrid>
            </VStack>
          )}
          {!loading && !selectedType && (
            <Text color={SURFACE.muted} textAlign="center" py={4}>
              Pick a type above to explore! 🔍
            </Text>
          )}
        </VStack>
      ),
    },
    {
      title: 'Battle Mini-Game!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Time to battle! Pick an attacker and a defender. Can you pick the right
            type to win?
          </Text>
          <Box bg={SURFACE.panel} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" fontWeight="bold" color={SURFACE.muted} mb={2}>Pick Attacker:</Text>
            <HStack spacing={2} justify="center">
              {rpsTypes.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  onClick={() => { setBattleAttacker(t); setBattleResult(''); }}
                  bg={battleAttacker === t ? getTypeColor(t) : `${getTypeColor(t)}30`}
                  color={battleAttacker === t ? 'white' : getTypeColor(t)}
                  borderRadius="full"
                >
                  {getTypeEmoji(t)} {titleCase(t)}
                </Button>
              ))}
            </HStack>
          </Box>
          <Text textAlign="center" fontSize="xl" color={SURFACE.muted}>⚔️ VS ⚔️</Text>
          <Box bg={SURFACE.panel} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" fontWeight="bold" color={SURFACE.muted} mb={2}>Pick Defender:</Text>
            <HStack spacing={2} justify="center">
              {rpsTypes.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  onClick={() => { setBattleDefender(t); setBattleResult(''); }}
                  bg={battleDefender === t ? getTypeColor(t) : `${getTypeColor(t)}30`}
                  color={battleDefender === t ? 'white' : getTypeColor(t)}
                  borderRadius="full"
                >
                  {getTypeEmoji(t)} {titleCase(t)}
                </Button>
              ))}
            </HStack>
          </Box>
          <Button
            colorScheme="red"
            size="sm"
            alignSelf="center"
            onClick={handleBattle}
            isDisabled={!battleAttacker || !battleDefender}
          >
            Battle! ⚔️
          </Button>
          {battleResult && (
            <Box
              bg={battleResult === 'win' ? 'rgba(67,233,123,0.15)' : battleResult === 'lose' ? 'rgba(245,87,108,0.15)' : 'rgba(160,174,192,0.15)'}
              borderRadius="lg"
              p={4}
              border="2px solid"
              borderColor={battleResult === 'win' ? 'green.400' : battleResult === 'lose' ? 'red.400' : SURFACE.border}
              textAlign="center"
            >
              <Text fontSize="xl" color={battleResult === 'win' ? 'green.300' : battleResult === 'lose' ? 'red.300' : SURFACE.body}>
                {battleResult === 'win' && `🎉 ${battleAttacker} beats ${battleDefender}! Super effective!`}
                {battleResult === 'lose' && `💥 ${battleDefender} beats ${battleAttacker}! Not very effective...`}
                {battleResult === 'tie' && `🤝 It's a tie! Same types are equal.`}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Quick Quiz',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

function EffectivenessBox({
  title,
  types,
  colorScheme,
}: {
  title: string;
  types: string[];
  colorScheme: string;
}) {
  const SURFACE = useSurface();
  const colorMap: Record<string, string> = {
    green: 'rgba(67,233,123,0.15)',
    orange: 'rgba(253,203,110,0.15)',
    gray: 'rgba(160,174,192,0.15)',
    red: 'rgba(245,87,108,0.15)',
  };
  const borderMap: Record<string, string> = {
    green: 'rgba(67,233,123,0.3)',
    orange: 'rgba(253,203,110,0.3)',
    gray: 'rgba(160,174,192,0.3)',
    red: 'rgba(245,87,108,0.3)',
  };

  return (
    <Box
      bg={colorMap[colorScheme]}
      borderRadius="lg"
      p={3}
      border="1px solid"
      borderColor={borderMap[colorScheme]}
      minH="80px"
    >
      <Text fontWeight="semibold" fontSize="sm" mb={2}>{title}</Text>
      {types.length === 0 ? (
        <Text fontSize="xs" color={SURFACE.muted}>None</Text>
      ) : (
        <Wrap>
          {types.map((t) => (
            <WrapItem key={t}>
              <Tag size="sm" bg={`${getTypeColor(t)}40`} color={getTypeColor(t)} borderRadius="full">
                <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      )}
    </Box>
  );
}

// ─── Lesson: Stats & Analytics ────────────────────────────────────────────

function StatsAnalyticsLesson({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [pokemonName, setPokemonName] = useState('pikachu');
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPokemon = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pokedexClient.pokemonByName(pokemonName);
      if (!data) {
        setError('Pokemon not found. Try another name!');
        setPokemon(null);
      } else {
        setPokemon(data);
      }
    } catch {
      setError('Could not reach the Pokedex service.');
      setPokemon(null);
    } finally {
      setLoading(false);
    }
  }, [pokemonName]);

  useEffect(() => {
    fetchPokemon();
  }, []);

  const maxStat = 200;

  const surface = useSurface();
  const steps = [
    {
      title: 'What is Data Analytics?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            <strong>Data analytics</strong> means looking at data to find patterns
            and insights. In our Pokemon graph, each Pokemon has <strong>stats</strong> —
            numbers that tell us how strong they are in different areas.
          </Text>
          <SimpleGrid columns={2} spacing={3}>
            {[
              { stat: 'HP', emoji: '❤️', desc: 'How much damage they can take' },
              { stat: 'Attack', emoji: '⚔️', desc: 'Physical move power' },
              { stat: 'Defense', emoji: '🛡️', desc: 'Physical damage resistance' },
              { stat: 'Sp. Atk', emoji: '🔮', desc: 'Special move power' },
              { stat: 'Sp. Def', emoji: '✨', desc: 'Special damage resistance' },
              { stat: 'Speed', emoji: '💨', desc: 'Who goes first in battle' },
            ].map((s) => (
              <Box
                key={s.stat}
                bg="rgba(255,255,255,0.05)"
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <HStack spacing={2}>
                  <Text fontSize="lg">{s.emoji}</Text>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm">{s.stat}</Text>
                    <Text fontSize="xs" color={surface.muted}>{s.desc}</Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      ),
    },
    {
      title: 'Compare Pokemon Stats',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Search for a Pokemon to see its stats visualized as a bar chart!
            Try "pikachu", "charizard", or "mewtwo".
          </Text>
          <HStack>
            <InputGroup>
              <InputLeftElement>
                <SearchIcon color={surface.muted} />
              </InputLeftElement>
              <Input
                placeholder="Pokemon name..."
                value={pokemonName}
                onChange={(e) => setPokemonName(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === 'Enter' && fetchPokemon()}
                bg="rgba(255,255,255,0.05)"
                borderColor="whiteAlpha.200"
              />
            </InputGroup>
            <Button colorScheme="green" onClick={fetchPokemon} isLoading={loading}>
              Analyze
            </Button>
          </HStack>

          {loading && (
            <HStack justify="center" py={8}>
              <Spinner color="green.400" />
              <Text color={surface.muted}>Fetching stats...</Text>
            </HStack>
          )}

          {error && !loading && (
            <Text color="red.400" fontSize="sm">{error}</Text>
          )}

          {pokemon && !loading && (
            <VStack spacing={4} align="stretch">
              {/* Pokemon header */}
              <HStack spacing={4}>
                <PokemonSprite
                  name={pokemon.name}
                  spriteDreamWorld={pokemon.sprite_dream_world}
                  officialArtwork={pokemon.official_artwork}
                  animeArtwork={pokemon.anime_artwork}
                  spriteFront={pokemon.sprite_front}
                  size="lg"
                />
                <Box>
                  <Text fontSize="xl" fontWeight="bold" textTransform="capitalize">
                    {pokemon.name}
                  </Text>
                  <Text fontSize="sm" color={surface.muted}>
                    Pokemon #{pokemon.pokedex_number}
                  </Text>
                  <HStack spacing={1} mt={1}>
                    {pokemon.types.map((t) => (
                      <Tag
                        key={t}
                        size="sm"
                        bg={`${getTypeColor(t)}40`}
                        color={getTypeColor(t)}
                        borderRadius="full"
                      >
                        <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </Box>
              </HStack>

              {/* Stat bars */}
              <Box bg="rgba(0,0,0,0.3)" borderRadius="lg" p={4}>
                <Text fontWeight="semibold" fontSize="sm" mb={3}>
                  📊 Battle Stats
                </Text>
                <VStack spacing={2} align="stretch">
                  {pokemon.stats.map((s) => (
                    <Box key={s.stat}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" fontWeight="semibold">
                          {statLabel(s.stat)}
                        </Text>
                        <Text fontSize="xs" color={statColor(s.base_value)} fontWeight="bold">
                          {s.base_value}
                        </Text>
                      </HStack>
                      <Progress
                        value={(s.base_value / maxStat) * 100}
                        colorScheme={s.base_value >= 90 ? 'green' : s.base_value >= 60 ? 'yellow' : 'red'}
                        size="sm"
                        borderRadius="full"
                        bg="whiteAlpha.200"
                      />
                    </Box>
                  ))}
                  <Divider my={2} />
                  <HStack justify="space-between">
                    <Text fontSize="xs" fontWeight="bold">Total</Text>
                    <Text fontSize="xs" fontWeight="bold" color="purple.300">
                      {pokemon.stats.reduce((sum, s) => sum + s.base_value, 0)}
                    </Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Extra info */}
              <SimpleGrid columns={3} spacing={3}>
                <InfoCard label="How Tall" value={formatHeight(pokemon.height)} />
                <InfoCard label="How Heavy" value={formatWeight(pokemon.weight)} />
                <InfoCard label="Battle Points" value={pokemon.base_experience.toString()} />
              </SimpleGrid>

              {pokemon.species && (
                <Box
                  bg="rgba(102,126,234,0.1)"
                  borderRadius="lg"
                  p={3}
                  border="1px solid"
                  borderColor="rgba(102,126,234,0.3)"
                >
                  <Text fontSize="sm" color={surface.body}>
                    {pokemon.species.description || `${pokemon.name} is a ${pokemon.species.genus || 'Pokemon'}.`}
                  </Text>
                  {pokemon.species.is_legendary && (
                    <Badge colorScheme="yellow" mt={2}>⭐ Legendary</Badge>
                  )}
                  {pokemon.species.is_mythical && (
                    <Badge colorScheme="purple" mt={2}>🌟 Mythical</Badge>
                  )}
                </Box>
              )}
            </VStack>
          )}
        </VStack>
      ),
    },
    {
      title: 'What Did We Learn?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center">
            📊 You just did data analytics!
          </Text>
          <Text>
            By looking at Pokemon stats, you analyzed data from a knowledge graph.
            You compared numbers, visualized them as bar charts, and found patterns —
            that's exactly what data scientists do!
          </Text>
          <Box
            bg="rgba(67,233,123,0.1)"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="rgba(67,233,123,0.3)"
          >
            <Text fontSize="sm" color={surface.body}>
              💡 In the knowledge graph, each stat is stored as a connection
              (has stat) with a number connecting a Pokemon to a Stat node.
              The graph makes it easy to query and compare!
            </Text>
          </Box>
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Lesson: Stat Bars (reworked kid-friendly) ───────────────────────────

function StatBarsLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [p1, setP1] = useState<PokemonDetail | null>(null);
  const [p2, setP2] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [speedChoice, setSpeedChoice] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      pokedexClient.pokemonByName('pikachu').catch(() => null),
      pokedexClient.pokemonByName('snorlax').catch(() => null),
    ])
      .then(([a, b]) => {
        setP1(a);
        setP2(b);
      })
      .finally(() => setLoading(false));
  }, []);

  const maxStat = 200;

  const statCards = [
    { stat: 'HP', key: 'hp', emoji: '❤️', kid: 'How much you can get hit' },
    { stat: 'Attack', key: 'attack', emoji: '⚔️', kid: 'How hard you hit' },
    { stat: 'Defense', key: 'defense', emoji: '🛡️', kid: 'How well you block' },
    { stat: 'Sp. Atk', key: 'special-attack', emoji: '🔮', kid: 'Special hit power' },
    { stat: 'Sp. Def', key: 'special-defense', emoji: '✨', kid: 'Special block power' },
    { stat: 'Speed', key: 'speed', emoji: '💨', kid: 'Who goes first' },
  ];

  const quiz: QuizQuestion[] = [
    {
      question: 'A taller bar means the stat is...',
      options: ['Smaller', 'Bigger', 'The same'],
      answer: 1,
      explanation: 'Taller bars show bigger numbers!',
    },
    {
      question: 'Which stat tells you who goes first?',
      options: ['HP', 'Speed', 'Attack'],
      answer: 1,
      explanation: 'Speed decides who moves first in battle.',
    },
  ];

  const getStat = (p: PokemonDetail | null, statName: string) =>
    p?.stats.find((s) => s.stat === statName)?.base_value ?? 0;

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    const p1Faster = (p1 && p2) ? getStat(p1, 'speed') > getStat(p2, 'speed') : false;
    const speedCorrect = (speedChoice !== null && ((speedChoice === 0 && p1Faster) || (speedChoice === 1 && !p1Faster))) ? 1 : 0;
    return (
      <LessonResult
        correct={correct + speedCorrect}
        total={quiz.length + 1}
        onComplete={onComplete}
      />
    );
  }

  const steps = [
    {
      title: 'Meet the Six Stats',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Every Pokemon has six stats. Each one is a number.</Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {statCards.map((s) => (
              <Box
                key={s.stat}
                bg={SURFACE.card}
                border="1px solid"
                borderColor={SURFACE.border}
                borderRadius="lg"
                p={3}
              >
                <HStack spacing={3}>
                  <Text fontSize="2xl">{s.emoji}</Text>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color={SURFACE.title}>{s.stat}</Text>
                    <Text fontSize="xs" color={SURFACE.body}>{s.kid}</Text>
                  </Box>
                </HStack>
              </Box>
            ))}
          </SimpleGrid>
        </VStack>
      ),
    },
    {
      title: 'Compare Two Pokemon',
      content: (
        <VStack spacing={4} align="stretch">
          {loading ? (
            <HStack justify="center" py={6}>
              <Spinner color="green.300" />
              <Text color={SURFACE.body}>Loading Pokemon...</Text>
            </HStack>
          ) : (
            <>
              <HStack spacing={4} justify="center">
                {p1 && (
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p1.name}
                      spriteDreamWorld={p1.sprite_dream_world}
                      officialArtwork={p1.official_artwork}
                      animeArtwork={p1.anime_artwork}
                      spriteFront={p1.sprite_front}
                      size="lg"
                    />
                    <Text textTransform="capitalize" fontWeight="bold" color={SURFACE.title}>
                      {p1.name}
                    </Text>
                  </VStack>
                )}
                <Text fontSize="2xl" color={SURFACE.muted}>VS</Text>
                {p2 && (
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p2.name}
                      spriteDreamWorld={p2.sprite_dream_world}
                      officialArtwork={p2.official_artwork}
                      animeArtwork={p2.anime_artwork}
                      spriteFront={p2.sprite_front}
                      size="lg"
                    />
                    <Text textTransform="capitalize" fontWeight="bold" color={SURFACE.title}>
                      {p2.name}
                    </Text>
                  </VStack>
                )}
              </HStack>

              <Box bg={SURFACE.panel} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
                <VStack spacing={2} align="stretch">
                  {statCards.map((s) => {
                    const v1 = getStat(p1, s.key);
                    const v2 = getStat(p2, s.key);
                    return (
                      <Box key={s.stat}>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs" fontWeight="bold" color={SURFACE.title}>
                            {s.emoji} {s.stat}
                          </Text>
                          <Text fontSize="xs" color={SURFACE.body}>
                            {p1?.name}: {v1}  |  {p2?.name}: {v2}
                          </Text>
                        </HStack>
                        <HStack spacing={2} align="stretch">
                          <Box flex={1}>
                            <Progress
                              value={(v1 / maxStat) * 100}
                              colorScheme="yellow"
                              size="sm"
                              borderRadius="full"
                              bg="whiteAlpha.200"
                            />
                          </Box>
                          <Box flex={1}>
                            <Progress
                              value={(v2 / maxStat) * 100}
                              colorScheme="blue"
                              size="sm"
                              borderRadius="full"
                              bg="whiteAlpha.200"
                            />
                          </Box>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
              <HStack spacing={4} justify="center">
                <HStack spacing={1}>
                  <Circle size="12px" bg="yellow.400" />
                  <Text fontSize="xs" color={SURFACE.body} textTransform="capitalize">{p1?.name}</Text>
                </HStack>
                <HStack spacing={1}>
                  <Circle size="12px" bg="blue.400" />
                  <Text fontSize="xs" color={SURFACE.body} textTransform="capitalize">{p2?.name}</Text>
                </HStack>
              </HStack>
            </>
          )}
        </VStack>
      ),
    },
    {
      title: 'Who is Faster?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Look at the Speed bars. Who has the taller Speed bar?</Text>
          {p1 && p2 && (
            <HStack spacing={4} justify="center">
              <VStack spacing={1}>
                <PokemonSprite
                  name={p1.name}
                  spriteDreamWorld={p1.sprite_dream_world}
                  officialArtwork={p1.official_artwork}
                  animeArtwork={p1.anime_artwork}
                  spriteFront={p1.sprite_front}
                  size="md"
                />
                <Text fontSize="sm" textTransform="capitalize" color={SURFACE.title}>{p1.name}</Text>
                <Text fontSize="lg" fontWeight="bold" color="yellow.300">💨 {getStat(p1, 'speed')}</Text>
              </VStack>
              <VStack spacing={1}>
                <PokemonSprite
                  name={p2.name}
                  spriteDreamWorld={p2.sprite_dream_world}
                  officialArtwork={p2.official_artwork}
                  animeArtwork={p2.anime_artwork}
                  spriteFront={p2.sprite_front}
                  size="md"
                />
                <Text fontSize="sm" textTransform="capitalize" color={SURFACE.title}>{p2.name}</Text>
                <Text fontSize="lg" fontWeight="bold" color="blue.300">💨 {getStat(p2, 'speed')}</Text>
              </VStack>
            </HStack>
          )}
          <VStack spacing={2} align="stretch">
            {[p1?.name, p2?.name].filter(Boolean).map((name, idx) => {
              let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
              const p1Faster = (p1 && p2) ? getStat(p1, 'speed') > getStat(p2, 'speed') : false;
              if (speedChoice !== null) {
                if ((idx === 0 && p1Faster) || (idx === 1 && !p1Faster)) state = 'correct';
                else if (idx === speedChoice) state = 'incorrect';
              }
              return (
                <BigChoiceButton
                  key={name}
                  label={String.fromCharCode(65 + idx)}
                  option={name!}
                  state={state}
                  onClick={() => setSpeedChoice(idx)}
                  showCheck={speedChoice !== null && ((idx === 0 && p1Faster) || (idx === 1 && !p1Faster))}
                />
              );
            })}
          </VStack>
          {speedChoice !== null && (
            <Box bg="rgba(79,172,254,0.15)" border="1px solid" borderColor="rgba(79,172,254,0.4)" borderRadius="lg" p={3}>
              <Text fontSize="sm" color={SURFACE.title}>
                Taller bar = bigger number. Great reading!
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Quick Check',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

// ─── Lesson: Data Detective (capstone) ────────────────────────────────────

const DETECTIVE_QUESTIONS = [
  {
    id: 'water-vs-fire-speed',
    text: 'Are Water Pokemon faster than Fire Pokemon?',
    types: ['water', 'fire'] as const,
    stat: 'speed',
    emoji: '💨',
  },
  {
    id: 'grass-vs-fire-hp',
    text: 'Do Grass Pokemon have more HP than Fire Pokemon?',
    types: ['grass', 'fire'] as const,
    stat: 'hp',
    emoji: '❤️',
  },
  {
    id: 'water-vs-grass-attack',
    text: 'Are Water Pokemon stronger attackers than Grass Pokemon?',
    types: ['water', 'grass'] as const,
    stat: 'attack',
    emoji: '⚔️',
  },
];

const JOURNEY_STOPS = ['Ask', 'Collect', 'Sort', 'Graph', 'Tell'];

function DataJourneyStrip({ stamped }: { stamped: number }) {
  const SURFACE = useSurface();
  return (
    <HStack spacing={1} justify="center" flexWrap="wrap">
      {JOURNEY_STOPS.map((stop, i) => (
        <HStack key={stop} spacing={1}>
          <Circle
            size="28px"
            bg={i < stamped ? 'green.400' : 'whiteAlpha.200'}
            color={i < stamped ? 'white' : SURFACE.muted}
            fontSize="xs"
            fontWeight="bold"
          >
            {i < stamped ? '✓' : i + 1}
          </Circle>
          <Text fontSize="xs" color={i < stamped ? 'green.300' : SURFACE.muted} fontWeight={i < stamped ? 'bold' : 'normal'}>
            {stop}
          </Text>
          {i < JOURNEY_STOPS.length - 1 && <Text color={SURFACE.muted} fontSize="xs">→</Text>}
        </HStack>
      ))}
    </HStack>
  );
}

// ─── Lesson: Who's Typical? (L8) ───────────────────────────────────────────

function WhosTypicalLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const samplePokemon = [
    { name: 'Pidgey', hp: 40, emoji: '🐦' },
    { name: 'Rattata', hp: 30, emoji: '🐀' },
    { name: 'Spearow', hp: 40, emoji: '🦅' },
    { name: 'Zubat', hp: 40, emoji: '🦇' },
    { name: 'Magikarp', hp: 20, emoji: '🐟' },
  ];

  const sortedHp = [...samplePokemon].sort((a, b) => a.hp - b.hp);
  const medianHp = sortedHp[Math.floor(sortedHp.length / 2)].hp;
  const hpCounts: Record<number, number> = {};
  samplePokemon.forEach((p) => { hpCounts[p.hp] = (hpCounts[p.hp] || 0) + 1; });
  const modeHp = Object.entries(hpCounts).sort((a, b) => b[1] - a[1])[0][0];

  const outlierPokemon = { name: 'Snorlax', hp: 160, emoji: '😴' };

  const quiz: QuizQuestion[] = [
    {
      question: 'What is the "most common" number called?',
      options: ['The middle', 'The mode', 'The biggest', 'The smallest'],
      answer: 1,
      explanation: 'The mode is the most common value! In our set, 40 appeared 3 times — that\'s the mode!',
    },
    {
      question: 'What do we call a number that is far from all the others?',
      options: ['The mode', 'The middle', 'An outlier', 'A surprise'],
      answer: 2,
      explanation: 'An outlier is a value far from the rest — like Snorlax with 160 HP when everyone else has 20-40!',
    },
  ];

  if (showResult) {
    const correct = quizAnswers.filter((a, i) => a === quiz[i].answer).length;
    return <LessonResult correct={correct} total={quiz.length} onComplete={onComplete} />;
  }

  const maxHp = 160;
  const barWidth = (hp: number) => `${(hp / maxHp) * 100}%`;

  const steps = [
    {
      title: 'Who\'s the Most Common?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Look at these 5 Pokemon and their HP (health points). Which HP number
            shows up the <strong>most</strong>?
          </Text>
          <VStack spacing={2} align="stretch">
            {samplePokemon.map((p) => (
              <Box key={p.name} bg={SURFACE.card} borderRadius="md" p={3} border="1px solid" borderColor={SURFACE.border}>
                <HStack spacing={3}>
                  <Text fontSize="xl">{p.emoji}</Text>
                  <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title} minW="80px">
                    {p.name}
                  </Text>
                  <Box flex={1} bg="rgba(255,255,255,0.1)" borderRadius="full" h="20px" overflow="hidden">
                    <Box bg="green.400" h="full" borderRadius="full" style={{ width: barWidth(p.hp) }} />
                  </Box>
                  <Text fontSize="sm" fontWeight="bold" color="green.300" minW="40px" textAlign="right">
                    {p.hp} HP
                  </Text>
                </HStack>
              </Box>
            ))}
          </VStack>
          <Box bg="rgba(102,126,234,0.15)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(102,126,234,0.3)">
            <Text fontSize="sm" color={SURFACE.body}>
              Count how many times each HP number appears:
            </Text>
            <VStack spacing={1} align="start" mt={2} fontSize="sm" color={SURFACE.body}>
              <Text>• 20 HP: 1 Pokemon (Magikarp)</Text>
              <Text>• 30 HP: 1 Pokemon (Rattata)</Text>
              <Text>• 40 HP: 3 Pokemon (Pidgey, Spearow, Zubat) ← <strong>most common!</strong></Text>
            </VStack>
            <Text fontSize="sm" color="blue.300" mt={2} fontWeight="bold">
              The most common value is called the <strong>mode</strong>! Here it's 40 HP.
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Who\'s in the Middle?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Now let's put all the HP numbers in order from smallest to biggest.
            Which one is <strong>in the middle</strong>?
          </Text>
          <VStack spacing={2} align="stretch">
            {sortedHp.map((p, i) => (
              <Box
                key={p.name}
                bg={i === Math.floor(sortedHp.length / 2) ? 'rgba(102,126,234,0.2)' : SURFACE.card}
                borderRadius="md"
                p={3}
                border="2px solid"
                borderColor={i === Math.floor(sortedHp.length / 2) ? 'blue.400' : SURFACE.border}
              >
                <HStack spacing={3}>
                  <Text fontSize="xs" color={SURFACE.muted} minW="20px">{i + 1}.</Text>
                  <Text fontSize="xl">{p.emoji}</Text>
                  <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title} minW="80px">
                    {p.name}
                  </Text>
                  <Box flex={1} bg="rgba(255,255,255,0.1)" borderRadius="full" h="20px" overflow="hidden">
                    <Box bg={i === Math.floor(sortedHp.length / 2) ? 'blue.400' : 'green.400'} h="full" borderRadius="full" style={{ width: barWidth(p.hp) }} />
                  </Box>
                  <Text fontSize="sm" fontWeight="bold" color={i === Math.floor(sortedHp.length / 2) ? 'blue.300' : 'green.300'} minW="40px" textAlign="right">
                    {p.hp} HP
                  </Text>
                  {i === Math.floor(sortedHp.length / 2) && <Text fontSize="xs" color="blue.300" fontWeight="bold">← Middle!</Text>}
                </HStack>
              </Box>
            ))}
          </VStack>
          <Box bg="rgba(102,126,234,0.15)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(102,126,234,0.3)">
            <Text fontSize="sm" color="blue.300" fontWeight="bold">
              The middle value is called the <strong>median</strong>! Here it's {medianHp} HP.
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Odd One Out!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Look! Someone new joined the group. Can you spot the <strong>odd one out</strong>?
          </Text>
          <VStack spacing={2} align="stretch">
            {samplePokemon.map((p) => (
              <Box key={p.name} bg={SURFACE.card} borderRadius="md" p={3} border="1px solid" borderColor={SURFACE.border}>
                <HStack spacing={3}>
                  <Text fontSize="xl">{p.emoji}</Text>
                  <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title} minW="80px">
                    {p.name}
                  </Text>
                  <Box flex={1} bg="rgba(255,255,255,0.1)" borderRadius="full" h="20px" overflow="hidden">
                    <Box bg="green.400" h="full" borderRadius="full" style={{ width: barWidth(p.hp) }} />
                  </Box>
                  <Text fontSize="sm" fontWeight="bold" color="green.300" minW="40px" textAlign="right">
                    {p.hp} HP
                  </Text>
                </HStack>
              </Box>
            ))}
            <Box bg="rgba(245,87,108,0.15)" borderRadius="md" p={3} border="2px solid" borderColor="red.400">
              <HStack spacing={3}>
                <Text fontSize="xl">{outlierPokemon.emoji}</Text>
                <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title} minW="80px">
                  {outlierPokemon.name}
                </Text>
                <Box flex={1} bg="rgba(255,255,255,0.1)" borderRadius="full" h="20px" overflow="hidden">
                  <Box bg="red.400" h="full" borderRadius="full" style={{ width: barWidth(outlierPokemon.hp) }} />
                </Box>
                <Text fontSize="sm" fontWeight="bold" color="red.300" minW="40px" textAlign="right">
                  {outlierPokemon.hp} HP
                </Text>
              </HStack>
            </Box>
          </VStack>
          <Box bg="rgba(245,87,108,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(245,87,108,0.3)">
            <Text fontSize="sm" color="red.300" fontWeight="bold">
              Snorlax has <strong>160 HP</strong> — way more than everyone else (20-40)!
              That's called an <strong>outlier</strong> — a value that's far from the rest.
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Data Has a Usual... and Surprises!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            🎉 You learned 3 big data words!
          </Text>
          <SimpleGrid columns={1} spacing={3}>
            <Box bg="rgba(67,233,123,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(67,233,123,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">📊</Text>
                <Box>
                  <Text fontWeight="bold" color="green.300">Mode = Most Common</Text>
                  <Text fontSize="sm" color={SURFACE.body}>The number that shows up the most. Like 40 HP!</Text>
                </Box>
              </HStack>
            </Box>
            <Box bg="rgba(102,126,234,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(102,126,234,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">🎯</Text>
                <Box>
                  <Text fontWeight="bold" color="blue.300">Median = Middle</Text>
                  <Text fontSize="sm" color={SURFACE.body}>The number in the middle when you line them up. Like {medianHp} HP!</Text>
                </Box>
              </HStack>
            </Box>
            <Box bg="rgba(245,87,108,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(245,87,108,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">🤯</Text>
                <Box>
                  <Text fontWeight="bold" color="red.300">Outlier = Odd One Out</Text>
                  <Text fontSize="sm" color={SURFACE.body}>A value far from the rest. Like Snorlax with 160 HP!</Text>
                </Box>
              </HStack>
            </Box>
          </SimpleGrid>
          <Text fontSize="sm" color={SURFACE.body} textAlign="center">
            Data has a <strong>usual</strong> pattern... and sometimes <strong>surprises</strong>!
          </Text>
        </VStack>
      ),
    },
    {
      title: 'Quick Quiz',
      content: (
        <QuizView
          questions={quiz}
          answers={quizAnswers}
          onAnswer={(idx, answer) => {
            const next = [...quizAnswers];
            next[idx] = answer;
            setQuizAnswers(next);
          }}
          onComplete={() => setShowResult(true)}
        />
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === quiz.length}
    />
  );
}

function DataDetectiveLesson({
  onComplete,
  onExplorerOpen,
}: {
  onComplete: () => void;
  onExplorerOpen: () => void;
}) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [questionIdx, setQuestionIdx] = useState<number | null>(null);
  const [collected, setCollected] = useState<Record<string, PokemonDetail[]>>({});
  const [loading, setLoading] = useState(false);
  const [sorted, setSorted] = useState(false);
  const [storyText, setStoryText] = useState('');
  const [showDiploma, setShowDiploma] = useState(false);

  const question = questionIdx !== null ? DETECTIVE_QUESTIONS[questionIdx] : null;
  const maxStat = 200;

  const collectData = useCallback(async () => {
    if (!question) return;
    setLoading(true);
    const results: Record<string, PokemonDetail[]> = {};
    for (const t of question.types) {
      try {
        const list = await pokedexClient.pokemonByType(t, 8);
        const details = await Promise.all(
          list.slice(0, 5).map((r) => pokedexClient.pokemonByName(r.name).catch(() => null)),
        );
        results[t] = details.filter((d): d is PokemonDetail => Boolean(d));
      } catch {
        results[t] = [];
      }
    }
    setCollected(results);
    setLoading(false);
  }, [question]);

  useEffect(() => {
    if (step === 1 && questionIdx !== null && Object.keys(collected).length === 0) {
      collectData();
    }
  }, [step, questionIdx, collected, collectData]);

  const getStat = (p: PokemonDetail, statName: string) =>
    p.stats.find((s) => s.stat === statName)?.base_value ?? 0;

  const avgStat = (group: PokemonDetail[], statName: string) =>
    group.length > 0 ? Math.round(group.reduce((sum, p) => sum + getStat(p, statName), 0) / group.length) : 0;

  const steps = [
    {
      title: 'Ask a Question',
      content: (
        <VStack spacing={4} align="stretch">
          <DataJourneyStrip stamped={0} />
          <Text>Pick a question to investigate:</Text>
          <VStack spacing={2} align="stretch">
            {DETECTIVE_QUESTIONS.map((q, idx) => (
              <BigChoiceButton
                key={q.id}
                label={String.fromCharCode(65 + idx)}
                option={`${q.emoji} ${q.text}`}
                state={questionIdx === idx ? 'selected' : 'default'}
                onClick={() => setQuestionIdx(idx)}
                showCheck={questionIdx === idx}
              />
            ))}
          </VStack>
          {questionIdx !== null && (
            <Button colorScheme="green" size="sm" alignSelf="flex-end" onClick={() => setStep(1)}>
              Let's investigate! →
            </Button>
          )}
        </VStack>
      ),
    },
    {
      title: 'Collect the Data',
      content: (
        <VStack spacing={4} align="stretch">
          <DataJourneyStrip stamped={1} />
          <Text>
            We need Pokemon data! Searching the Pokedex for{' '}
            <strong>{question?.types.join(' and ')}</strong> Pokemon...
          </Text>
          {loading ? (
            <HStack justify="center" py={6}>
              <Spinner color="green.300" />
              <Text color={SURFACE.body}>Fetching Pokemon...</Text>
            </HStack>
          ) : (
            <>
              {question?.types.map((t) => (
                <Box key={t}>
                  <Text fontWeight="bold" fontSize="sm" color={SURFACE.title} mb={2} textTransform="capitalize">
                    {getTypeEmoji(t)} {titleCase(t)} Pokemon ({collected[t]?.length ?? 0})
                  </Text>
                  <Wrap>
                    {(collected[t] ?? []).map((p) => (
                      <WrapItem key={p.id}>
                        <VStack spacing={0}>
                          <PokemonSprite
                            name={p.name}
                            spriteDreamWorld={p.sprite_dream_world}
                            officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                            spriteFront={p.sprite_front}
                            size="sm"
                          />
                          <Text fontSize="xs" textTransform="capitalize" color={SURFACE.body}>{p.name}</Text>
                        </VStack>
                      </WrapItem>
                    ))}
                  </Wrap>
                </Box>
              ))}
              {Object.keys(collected).length > 0 && (
                <Button colorScheme="green" size="sm" alignSelf="flex-end" onClick={() => setStep(2)}>
                  Sort them! →
                </Button>
              )}
            </>
          )}
        </VStack>
      ),
    },
    {
      title: 'Sort into Groups',
      content: (
        <VStack spacing={4} align="stretch">
          <DataJourneyStrip stamped={2} />
          <Text>Now we sort our Pokemon into two groups by type.</Text>
          <HStack spacing={4} align="start">
            {question?.types.map((t) => (
              <Box
                key={t}
                flex={1}
                bg={SURFACE.card}
                border="2px solid"
                borderColor={getTypeColor(t)}
                borderRadius="lg"
                p={3}
              >
                <Text fontWeight="bold" fontSize="sm" color={SURFACE.title} mb={2} textTransform="capitalize">
                  {getTypeEmoji(t)} {titleCase(t)}
                </Text>
                <VStack spacing={2}>
                  {(collected[t] ?? []).map((p) => (
                    <HStack key={p.id} spacing={2}>
                      <PokemonSprite
                        name={p.name}
                        spriteDreamWorld={p.sprite_dream_world}
                        officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                        spriteFront={p.sprite_front}
                        size="sm"
                      />
                      <Text fontSize="xs" textTransform="capitalize" color={SURFACE.body}>{p.name}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            ))}
          </HStack>
          <Button colorScheme="green" size="sm" alignSelf="flex-end" onClick={() => { setSorted(true); setStep(3); }}>
            Make a graph! →
          </Button>
        </VStack>
      ),
    },
    {
      title: 'Graph the Results',
      content: (
        <VStack spacing={4} align="stretch">
          <DataJourneyStrip stamped={3} />
          <Text>
            Let's compare the <strong>{question?.stat}</strong> stat. Each bar shows the average (middle) number.
          </Text>
          {question && (
            <Box bg={SURFACE.panel} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
              <VStack spacing={3} align="stretch">
                {question.types.map((t) => {
                  const avg = avgStat(collected[t] ?? [], question.stat);
                  return (
                    <Box key={t}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" fontWeight="bold" color={SURFACE.title} textTransform="capitalize">
                          {getTypeEmoji(t)} {titleCase(t)}
                        </Text>
                        <Text fontSize="sm" fontWeight="bold" color={getTypeColor(t)}>{avg}</Text>
                      </HStack>
                      <Progress
                        value={(avg / maxStat) * 100}
                        colorScheme={t === 'fire' ? 'orange' : t === 'water' ? 'blue' : 'green'}
                        size="md"
                        borderRadius="full"
                        bg="whiteAlpha.200"
                      />
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          )}
          {question && (
            <Box bg="rgba(79,172,254,0.15)" border="1px solid" borderColor="rgba(79,172,254,0.4)" borderRadius="lg" p={3}>
              <Text fontSize="sm" color={SURFACE.title}>
                {(() => {
                  const vals = question.types.map((t) => avgStat(collected[t] ?? [], question.stat));
                  const diff = Math.abs(vals[0] - vals[1]);
                  const winner = vals[0] > vals[1] ? question.types[0] : question.types[1];
                  return `${winner.charAt(0).toUpperCase() + winner.slice(1)} Pokemon have a higher ${question.stat} by ${diff}!`;
                })()}
              </Text>
            </Box>
          )}
          <Button colorScheme="green" size="sm" alignSelf="flex-end" onClick={() => setStep(4)}>
            Tell the story! →
          </Button>
        </VStack>
      ),
    },
    {
      title: 'Tell the Story',
      content: (
        <VStack spacing={4} align="stretch">
          <DataJourneyStrip stamped={5} />
          <Text fontWeight="bold" fontSize="md" color={SURFACE.title}>
            You did it, Data Detective! 🎉
          </Text>
          <Text>Write what you found:</Text>
          <Box bg={SURFACE.card} border="2px solid" borderColor={SURFACE.border} borderRadius="lg" p={4}>
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color={SURFACE.body}>
                {question && (() => {
                  const vals = question.types.map((t) => avgStat(collected[t] ?? [], question.stat));
                  const winner = vals[0] > vals[1] ? question.types[0] : question.types[1];
                  const loser = vals[0] > vals[1] ? question.types[1] : question.types[0];
                  return `I found that ${winner} Pokemon have a higher ${question.stat} than ${loser} Pokemon!`;
                })()}
              </Text>
              <Input
                placeholder="Type your own story here..."
                value={storyText}
                onChange={(e) => setStoryText(e.target.value)}
                bg="whiteAlpha.50"
                borderColor="whiteAlpha.200"
                size="sm"
              />
            </VStack>
          </Box>
          {!showDiploma ? (
            <Button colorScheme="yellow" size="md" onClick={() => setShowDiploma(true)}>
              Get your diploma! 🎓
            </Button>
          ) : (
            <VStack spacing={4} align="stretch">
              <Box
                bg="rgba(255,215,0,0.12)"
                border="2px solid"
                borderColor="yellow.400"
                borderRadius="xl"
                p={5}
                textAlign="center"
              >
                <Text fontSize="2xl">🎓</Text>
                <Text fontWeight="bold" fontSize="lg" color="yellow.300" mt={2}>
                  Data Detective Diploma
                </Text>
                <Text fontSize="sm" color={SURFACE.body} mt={1}>
                  You asked a question, collected data, sorted it, graphed it, and told the story.
                </Text>
                <Text fontSize="sm" color={SURFACE.body} mt={1}>
                  That's what data scientists do!
                </Text>
              </Box>
              <HStack spacing={3} justify="center">
                <Button colorScheme="green" size="sm" onClick={onComplete}>
                  Finish Lesson ✓
                </Button>
                <Button colorScheme="blue" variant="outline" size="sm" onClick={onExplorerOpen}>
                  Keep Exploring →
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && showDiploma}
    />
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  const SURFACE = useSurface();
  return (
    <Box
      bg={SURFACE.card}
      borderRadius="lg"
      p={3}
      textAlign="center"
      border="1px solid"
      borderColor={SURFACE.border}
    >
      <Text fontSize="xs" color={SURFACE.muted}>{label}</Text>
      <Text fontSize="sm" fontWeight="bold" color={SURFACE.title}>{value}</Text>
    </Box>
  );
}

// ─── Lesson: Natural Language Queries ─────────────────────────────────────

interface NLExample {
  nl: string;
  gql: string;
  emoji: string;
}

function NLQueryPlayground({ examples }: { examples: NLExample[] }) {
  const SURFACE = useSurface();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    graphqlQuery: string;
    source: string;
    data: Record<string, unknown> | null;
    errors: Array<{ message: string }> | null;
  } | null>(null);
  const [error, setError] = useState('');

  const askQuestion = useCallback(async (q?: string) => {
    const query = (q || question).trim();
    if (!query) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/child/pokedex-nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult({
        graphqlQuery: data.graphqlQuery || '',
        source: data.source || 'unknown',
        data: data.data || null,
        errors: data.errors || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [question]);

  const renderResultData = (data: Record<string, unknown> | null) => {
    if (!data) return null;
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    return (
      <VStack spacing={2} align="stretch">
        {entries.map(([key, value]) => (
          <Box key={key} bg="rgba(0,0,0,0.2)" borderRadius="md" p={3}>
            <Text fontSize="xs" color="purple.300" fontWeight="semibold" mb={1}>
              {key}
            </Text>
            <NLResultRenderer value={value} />
          </Box>
        ))}
      </VStack>
    );
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text>
        Type a question about Pokemon in plain English! AI will translate it
        into a GraphQL query and run it against the knowledge graph. 🤖
      </Text>

      {/* Example chips */}
      <Wrap>
        {examples.map((ex, i) => (
          <WrapItem key={i}>
            <Button
              size="xs"
              variant="outline"
              colorScheme="purple"
              borderRadius="full"
              onClick={() => {
                setQuestion(ex.nl);
                askQuestion(ex.nl);
              }}
            >
              {ex.emoji} {ex.nl}
            </Button>
          </WrapItem>
        ))}
      </Wrap>

      {/* Input */}
      <HStack>
        <InputGroup>
          <InputLeftElement>
            <Text fontSize="sm">💬</Text>
          </InputLeftElement>
          <Input
            placeholder="Ask a question about Pokemon..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
            bg="rgba(255,255,255,0.05)"
            borderColor="whiteAlpha.200"
          />
        </InputGroup>
        <Button
          colorScheme="purple"
          onClick={() => askQuestion()}
          isLoading={loading}
          size="md"
        >
          Ask!
        </Button>
      </HStack>

      {/* Loading state */}
      {loading && (
        <VStack spacing={2} py={4}>
          <Spinner color="purple.400" />
          <Text fontSize="sm" color={SURFACE.muted}>
            🤖 AI is translating your question into a graph query...
          </Text>
        </VStack>
      )}

      {/* Error */}
      {error && !loading && (
        <Box bg="rgba(245,87,108,0.1)" borderRadius="lg" p={3} border="1px solid" borderColor="rgba(245,87,108,0.3)">
          <Text fontSize="sm" color="red.300">❌ {error}</Text>
        </Box>
      )}

      {/* Result */}
      {result && !loading && (
        <VStack spacing={3} align="stretch">
          {/* Generated GraphQL */}
          <Box bg="rgba(0,0,0,0.4)" borderRadius="lg" p={3} border="1px solid" borderColor="whiteAlpha.200">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="xs" color="green.300" fontWeight="semibold">
                🔄 Generated GraphQL Query
              </Text>
              <Badge
                size="sm"
                colorScheme={result.source === 'ai-gateway' ? 'green' : 'orange'}
                fontSize="2xs"
              >
                {result.source === 'ai-gateway' ? '🤖 AI' : '📝 Fallback'}
              </Badge>
            </HStack>
            <Text fontFamily="mono" fontSize="xs" color="green.300" whiteSpace="pre-wrap">
              {result.graphqlQuery}
            </Text>
          </Box>

          {/* Query errors */}
          {result.errors && result.errors.length > 0 && (
            <Box bg="rgba(245,87,108,0.1)" borderRadius="md" p={3} border="1px solid" borderColor="rgba(245,87,108,0.3)">
              <Text fontSize="xs" color="red.300">
                ⚠️ {result.errors[0]?.message}
              </Text>
            </Box>
          )}

          {/* Data results */}
          {result.data && (
            <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={3} border="1px solid" borderColor="whiteAlpha.200">
              <Text fontSize="xs" color="blue.300" fontWeight="semibold" mb={2}>
                ✅ Graph Results
              </Text>
              {renderResultData(result.data)}
            </Box>
          )}
        </VStack>
      )}

      {/* Info box */}
      <Box
        bg="rgba(250,112,154,0.1)"
        borderRadius="lg"
        p={4}
        border="1px solid"
        borderColor="rgba(250,112,154,0.3)"
      >
        <Text fontSize="sm" color={SURFACE.body}>
          🤖 This uses the same child-safe AI Gateway that powers your chat.
          The AI knows the Pokemon graph schema and translates your words
          into queries. If the AI is unavailable, a built-in fallback
          translator handles common questions!
        </Text>
      </Box>
    </VStack>
  );
}

function NLResultRenderer({ value }: { value: unknown }) {
  const SURFACE = useSurface();
  if (value === null || value === undefined) {
    return <Text fontSize="xs" color={SURFACE.muted}>null</Text>;
  }

  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return (
      <Text fontSize="sm" fontFamily="mono">
        {typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)}
      </Text>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <Text fontSize="xs" color={SURFACE.muted}>No results</Text>;
    }
    return (
      <VStack spacing={1} align="stretch">
        {value.slice(0, 12).map((item, i) => (
          <Box key={i} bg="rgba(0,0,0,0.2)" borderRadius="sm" p={2}>
            <NLResultRenderer value={item} />
          </Box>
        ))}
        {value.length > 12 && (
          <Text fontSize="xs" color={SURFACE.muted}>... and {value.length - 12} more</Text>
        )}
      </VStack>
    );
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return (
      <VStack spacing={1} align="stretch">
        {Object.entries(obj).map(([k, v]) => (
          <HStack key={k} spacing={2} align="start" flexWrap="wrap">
            <Text fontSize="xs" color="purple.300" fontWeight="semibold" minW="80px">
              {k}:
            </Text>
            <Box flex={1}>
              <NLResultRenderer value={v} />
            </Box>
          </HStack>
        ))}
      </VStack>
    );
  }

  return <Text fontSize="xs" color={SURFACE.muted}>{String(value)}</Text>;
}

function NLQueriesLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);

  const examples = [
    { nl: 'Show me all Fire type Pokemon', gql: 'pokemonByType(typeName: "fire")', emoji: '🔥' },
    { nl: 'Find Pokemon #25', gql: 'pokemonByDex(dex: 25)', emoji: '🔴' },
    { nl: 'What is Pikachu\'s type?', gql: 'pokemonByName(name: "pikachu") { types }', emoji: '⚡' },
    { nl: 'Show me Electric type effectiveness', gql: 'typeEffectiveness(typeName: "electric")', emoji: '⚡' },
  ];

  const steps = [
    {
      title: 'Talk to the Computer!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            What if you could just <em>talk</em> to the computer and it understands?
            Like asking a friend a question!
          </Text>
          <Text>Here's how it works in 4 steps:</Text>
          <VStack spacing={3} align="stretch">
            {[
              { num: 1, text: 'You ask a question in words', emoji: '💬' },
              { num: 2, text: 'AI understands your question', emoji: '🤖' },
              { num: 3, text: 'AI turns it into a graph search', emoji: '🔄' },
              { num: 4, text: 'The graph finds the answer!', emoji: '✅' },
            ].map((s) => (
              <Box
                key={s.num}
                bg={SURFACE.card}
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor={SURFACE.border}
              >
                <HStack spacing={3}>
                  <Circle size="32px" bg="purple.500">
                    <Text color="white" fontWeight="bold" fontSize="sm">{s.num}</Text>
                  </Circle>
                  <Text fontSize="sm" color={SURFACE.body}>{s.emoji} {s.text}</Text>
                </HStack>
              </Box>
            ))}
          </VStack>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              💡 It's like having a robot friend who speaks Pokemon! You say
              "show me all Fire Pokemon" and it finds them for you.
            </Text>
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Try a Question!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Tap one of these questions to see the computer answer it!
          </Text>
          <NLQueryPlayground examples={examples} />
        </VStack>
      ),
    },
    {
      title: 'You\'re a Graph Explorer!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            🎉 You did it, Trainer!
          </Text>
          <Text>
            You learned how to talk to a computer using your own words. You asked
            questions, and the computer searched its giant web of Pokemon facts to
            find answers!
          </Text>
          <Box
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            borderRadius="xl"
            p={5}
            textAlign="center"
          >
            <Text fontSize="3xl">🎓</Text>
            <Text fontWeight="bold" color="white" mt={2}>
              Graph Explorer
            </Text>
            <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
              You can now explore the Pokedex freely and keep learning!
            </Text>
          </Box>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              🚀 Keep exploring! Every question you ask makes you a better
              Data Detective!
            </Text>
          </Box>
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Shared: Lesson Step View ─────────────────────────────────────────────

function LessonStepView({
  step,
  steps,
  onStepChange,
  onComplete,
  canComplete,
}: {
  step: number;
  steps: { title: string; content: React.ReactNode }[];
  onStepChange: (step: number) => void;
  onComplete: () => void;
  canComplete: boolean;
}) {
  const SURFACE = useSurface();
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between" align="center">
        <HStack spacing={2}>
          <Image
            src="/themes/pokemon/Widgets/pikachu.png.svg"
            alt="Pikachu"
            boxSize="32px"
            animation={`${float} 3s ease-in-out infinite`}
          />
          <Text fontSize="sm" fontWeight="bold" color={SURFACE.body}>
            Step {step + 1} of {steps.length}
          </Text>
        </HStack>
        <Badge colorScheme="yellow" borderRadius="full" px={2}>
          ⭐ Keep going!
        </Badge>
      </HStack>

      {/* Step indicator — numbered circles */}
      <HStack spacing={1} justify="center">
        {steps.map((_, i) => (
          <HStack key={i} spacing={1} align="center">
            <Circle
              size={i === step ? '28px' : '24px'}
              bg={i < step ? 'green.400' : i === step ? 'purple.500' : 'whiteAlpha.200'}
              color="white"
              fontSize="xs"
              fontWeight="bold"
              transition="all 0.3s ease"
              flexShrink={0}
              boxShadow={i === step ? '0 0 12px rgba(128,90,213,0.6)' : 'none'}
            >
              {i < step ? '✓' : i + 1}
            </Circle>
            {i < steps.length - 1 && (
              <Box
                h="2px"
                w="16px"
                bg={i < step ? 'green.400' : 'whiteAlpha.200'}
                borderRadius="full"
                transition="all 0.3s ease"
              />
            )}
          </HStack>
        ))}
      </HStack>

      {/* Step content */}
      <Box
        bg={SURFACE.panel}
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        borderWidth="1px"
        borderColor={SURFACE.border}
        boxShadow="0 6px 20px rgba(0,0,0,0.35)"
      >
        <Text fontSize="lg" fontWeight="bold" mb={4} color={SURFACE.title}>
          {current.title}
        </Text>
        {current.content}
      </Box>

      {/* Navigation */}
      <HStack justify="space-between">
        <Button
          leftIcon={<ChevronLeftIcon />}
          variant="ghost"
          onClick={() => onStepChange(Math.max(0, step - 1))}
          isDisabled={step === 0}
          size="sm"
        >
          Previous
        </Button>
        {isLast ? (
          <Button
            rightIcon={<CheckCircleIcon />}
            colorScheme="green"
            onClick={onComplete}
            isDisabled={!canComplete}
            size="sm"
          >
            Complete Lesson
          </Button>
        ) : (
          <Button
            rightIcon={<ChevronRightIcon />}
            colorScheme="purple"
            onClick={() => onStepChange(step + 1)}
            size="sm"
          >
            Next
          </Button>
        )}
      </HStack>
    </VStack>
  );
}

// ─── Shared: Quiz View ────────────────────────────────────────────────────

function BigChoiceButton({
  label,
  option,
  state,
  onClick,
  showCheck,
  suppressSound,
}: {
  label: string;
  option: string;
  state: 'default' | 'selected' | 'correct' | 'incorrect';
  onClick: () => void;
  showCheck?: boolean;
  suppressSound?: boolean;
}) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const prevStateRef = useRef(state);

  useEffect(() => {
    if (suppressSound) return;
    const prev = prevStateRef.current;
    if (prev !== 'correct' && prev !== 'incorrect' && state === 'correct') {
      playSound('success');
    } else if (prev !== 'incorrect' && state === 'incorrect') {
      playSound('error');
    }
    prevStateRef.current = state;
  }, [state, playSound, suppressSound]);

  const handleClick = () => {
    playSound('click');
    onClick();
  };
  const styleMap: Record<'default' | 'selected' | 'correct' | 'incorrect', { bg: string; border: string }> = {
    default: { bg: SURFACE.card, border: SURFACE.borderLocked },
    selected: { bg: 'rgba(102,126,234,0.25)', border: 'purple.400' },
    correct: { bg: 'rgba(67,233,123,0.22)', border: 'green.400' },
    incorrect: { bg: 'rgba(245,87,108,0.22)', border: 'red.400' },
  };

  const style = styleMap[state];

  return (
    <Box
      bg={style.bg}
      border="2px solid"
      borderColor={style.border}
      borderRadius="xl"
      px={4}
      py={3}
      minH="56px"
      cursor="pointer"
      onClick={handleClick}
      transition="all 0.15s ease"
      _hover={{ transform: 'translateY(-1px)' }}
    >
      <HStack spacing={3}>
        <Circle
          size="28px"
          bg={state === 'selected' || state === 'correct' ? 'purple.500' : 'whiteAlpha.300'}
          color="white"
          fontSize="xs"
          fontWeight="bold"
          flexShrink={0}
        >
          {label}
        </Circle>
        <Text fontSize="sm" fontWeight="semibold" color={SURFACE.title}>
          {option}
        </Text>
        {showCheck && <CheckCircleIcon color="green.300" ml="auto" />}
      </HStack>
    </Box>
  );
}

function QuizView({
  questions,
  answers,
  onAnswer,
  onComplete,
}: {
  questions: QuizQuestion[];
  answers: number[];
  onAnswer: (idx: number, answer: number) => void;
  onComplete: () => void;
}) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const q = questions[currentQ];
  const isCorrect = selected === q.answer;

  const handleSelect = (idx: number) => {
    if (showFeedback) return;
    setSelected(idx);
  };

  const handleCheck = () => {
    if (selected === null) return;
    playSound(selected === q.answer ? 'success' : 'error');
    onAnswer(currentQ, selected);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowFeedback(false);
    } else {
      onComplete();
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Badge colorScheme="purple">
          Question {currentQ + 1} of {questions.length}
        </Badge>
        {showFeedback && (
          <Badge colorScheme={isCorrect ? 'green' : 'red'}>
            {isCorrect ? '✅ Correct!' : '❌ Not quite'}
          </Badge>
        )}
      </HStack>

      <Text fontWeight="semibold" fontSize="md">
        {q.question}
      </Text>

      <VStack spacing={2} align="stretch">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isAnswer = idx === q.answer;
          let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';

          if (showFeedback) {
            if (isAnswer) {
              state = 'correct';
            } else if (isSelected) {
              state = 'incorrect';
            }
          } else if (isSelected) {
            state = 'selected';
          }

          return (
            <BigChoiceButton
              key={idx}
              label={String.fromCharCode(65 + idx)}
              option={opt}
              state={state}
              onClick={() => handleSelect(idx)}
              showCheck={showFeedback && isAnswer}
              suppressSound={showFeedback}
            />
          );
        })}
      </VStack>

      {showFeedback && (
        <Box
          bg={isCorrect ? 'rgba(67,233,123,0.1)' : 'rgba(245,87,108,0.1)'}
          borderRadius="lg"
          p={3}
          border="1px solid"
          borderColor={isCorrect ? 'rgba(67,233,123,0.3)' : 'rgba(245,87,108,0.3)'}
        >
          <Text fontSize="sm" color={SURFACE.body}>
            💡 {q.explanation}
          </Text>
        </Box>
      )}

      <HStack justify="flex-end">
        {!showFeedback ? (
          <Button
            colorScheme="purple"
            onClick={handleCheck}
            isDisabled={selected === null}
            size="sm"
          >
            Check Answer
          </Button>
        ) : (
          <Button
            colorScheme="purple"
            onClick={handleNext}
            rightIcon={<ChevronRightIcon />}
            size="sm"
          >
            {currentQ < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        )}
      </HStack>
    </VStack>
  );
}

// ─── Shared: Lesson Result ────────────────────────────────────────────────

function LessonResult({
  correct,
  total,
  onComplete,
}: {
  correct: number;
  total: number;
  onComplete: () => void;
}) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const percentage = Math.round((correct / total) * 100);
  const isPerfect = correct === total;
  const stars = isPerfect ? 3 : percentage >= 67 ? 2 : 1;

  useEffect(() => {
    playSound(isPerfect ? 'achievement' : 'complete');
  }, [isPerfect, playSound]);

  return (
    <VStack spacing={6} align="stretch">
      <Box
        bg={isPerfect
          ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }
        borderRadius="xl"
        p={8}
        textAlign="center"
        position="relative"
        overflow="hidden"
        animation={`${popIn} 0.3s ease both`}
      >
        {/* Decorative sparkles */}
        <Box position="absolute" top="10px" left="15%" fontSize="20px" opacity={0.4} animation={`${float} 2s ease-in-out infinite`}>✨</Box>
        <Box position="absolute" top="20px" right="15%" fontSize="16px" opacity={0.3} animation={`${float} 2.5s ease-in-out infinite`}>⭐</Box>
        <Box position="absolute" bottom="15px" left="20%" fontSize="18px" opacity={0.35} animation={`${float} 3s ease-in-out infinite`}>✨</Box>

        <Text fontSize="5xl" animation={`${float} 2s ease-in-out infinite`}>
          {isPerfect ? '🏆' : '🎉'}
        </Text>
        <Text fontSize="2xl" fontWeight="bold" color="white" mt={2}>
          {isPerfect ? 'Perfect Score!' : 'Great Job!'}
        </Text>
        <HStack justify="center" spacing={1} mt={2}>
          {[0, 1, 2].map((i) => (
            <Text
              key={i}
              fontSize="2xl"
              color={i < stars ? 'yellow.300' : 'whiteAlpha.400'}
              style={{ textShadow: i < stars ? '0 0 8px rgba(255,234,0,0.6)' : 'none' }}
            >
              ★
            </Text>
          ))}
        </HStack>
        <Text color="whiteAlpha.900" fontSize="lg" mt={2}>
          You got {correct} out of {total} correct ({percentage}%)
        </Text>
      </Box>

      <Button
        colorScheme="green"
        size="md"
        rightIcon={<CheckCircleIcon />}
        onClick={onComplete}
        mx="auto"
        w="200px"
      >
        Complete Lesson
      </Button>
    </VStack>
  );
}

// ─── Lesson: Follow the Strings (L4) ───────────────────────────────────────

function GraphVizLesson({
  onComplete,
  onPokemonSelect,
}: {
  onComplete: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [pokemonName, setPokemonName] = useState('pikachu');
  const [pokemon, setPokemon] = useState<PokemonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [foundItems, setFoundItems] = useState<Set<string>>(new Set());

  const fetchPokemon = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await pokedexClient.pokemonByName(pokemonName);
      if (!data) {
        setError('Pokemon not found. Try another name!');
        setPokemon(null);
        setDemoMode(false);
      } else {
        setPokemon(data);
        setDemoMode(false);
      }
    } catch (err) {
      setError('Could not reach the Pokedex service. Showing a demo graph instead.');
      setPokemon(null);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, [pokemonName]);

  useEffect(() => {
    fetchPokemon();
  }, []);

  const scavengerTasks = [
    { id: 'type', label: 'Find its Type', emoji: '⚡', hint: 'Look for a colored circle connected to your Pokemon!' },
    { id: 'ability', label: 'Find its Ability', emoji: '✨', hint: 'Look for a purple circle!' },
    { id: 'move', label: 'Find a Move', emoji: '⚔️', hint: 'Look for a blue circle!' },
    { id: 'evolution', label: 'Find its Evolution', emoji: '🧬', hint: 'Look for a green circle!' },
  ];

  const starters = ['pikachu', 'charmander', 'squirtle', 'bulbasaur'];

  const steps = [
    {
      title: 'Pick Your Starter!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Let's explore a real knowledge web! Pick a Pokemon to start with:
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            {starters.map((name) => (
              <Box
                key={name}
                bg={pokemonName === name ? SURFACE.card : 'rgba(255,255,255,0.05)'}
                border="2px solid"
                borderColor={pokemonName === name ? 'blue.400' : 'whiteAlpha.200'}
                borderRadius="lg"
                p={3}
                cursor="pointer"
                _hover={{ borderColor: 'blue.300', transform: 'scale(1.05)' }}
                transition="all 0.15s ease"
                textAlign="center"
                onClick={() => setPokemonName(name)}
              >
                <Text fontSize="sm" fontWeight="bold" textTransform="capitalize" color={SURFACE.title}>
                  {name}
                </Text>
                {pokemonName === name && <Text fontSize="2xs" color="blue.300">✓ Selected</Text>}
              </Box>
            ))}
          </SimpleGrid>
          <Button colorScheme="blue" size="sm" alignSelf="flex-end" onClick={() => { fetchPokemon(); setStep(1); }}>
            See the web! →
          </Button>
        </VStack>
      ),
    },
    {
      title: 'See the Web!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Here is <strong style={{ textTransform: 'capitalize' }}>{pokemonName}</strong>'s knowledge web!
            Each circle is a thing connected to it. You can:
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={3} border="1px solid" borderColor={SURFACE.border}>
            <VStack spacing={1} align="start" fontSize="sm" color={SURFACE.body}>
              <Text>🖱️ <strong>Drag</strong> circles to move them</Text>
              <Text>🔍 <strong>Scroll</strong> to zoom in and out</Text>
              <Text>👆 <strong>Click</strong> a circle to see what it is</Text>
            </VStack>
          </Box>
          {loading ? (
            <HStack justify="center" py={6}>
              <Spinner color="blue.300" />
              <Text color={SURFACE.body}>Loading the web...</Text>
            </HStack>
          ) : (
            <>
              {error && (
                <Box bg="rgba(255,255,255,0.1)" borderRadius="md" p={3} border="1px solid" borderColor="whiteAlpha.300">
                  <Text color="orange.200" fontSize="sm">⚠️ {error}</Text>
                </Box>
              )}
              {(pokemon || demoMode) && (
                <Box w="full">
                  <HStack spacing={2} mb={3}>
                    <Text fontSize="lg">{pokemon ? getTypeEmoji(pokemon.types[0] || '') : '⚡'}</Text>
                    <Text fontWeight="bold" fontSize="md" textTransform="capitalize" color={SURFACE.title}>
                      {pokemon ? `${pokemon.name}'s Web` : 'Pikachu Demo Web'}
                    </Text>
                  </HStack>
                  <PokemonGraphViz pokemon={pokemon || undefined} demo={demoMode} height={400} />
                </Box>
              )}
            </>
          )}
          <Button colorScheme="blue" size="sm" alignSelf="flex-end" onClick={() => setStep(2)}>
            Start the hunt! →
          </Button>
        </VStack>
      ),
    },
    {
      title: 'Scavenger Hunt!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Can you find these things in the web? Look at the graph above and tap each
            one when you spot it!
          </Text>
          <VStack spacing={2} align="stretch">
            {scavengerTasks.map((task) => {
              const found = foundItems.has(task.id);
              return (
                <Box
                  key={task.id}
                  bg={found ? 'rgba(67,233,123,0.12)' : SURFACE.card}
                  border="2px solid"
                  borderColor={found ? 'green.400' : SURFACE.border}
                  borderRadius="lg"
                  p={3}
                  cursor="pointer"
                  _hover={{ borderColor: found ? 'green.400' : 'blue.300' }}
                  transition="all 0.15s ease"
                  onClick={() => setFoundItems((prev) => new Set(prev).add(task.id))}
                >
                  <HStack spacing={3}>
                    <Text fontSize="xl">{task.emoji}</Text>
                    <Box flex={1}>
                      <Text fontWeight="bold" fontSize="sm" color={found ? 'green.300' : SURFACE.title}>
                        {task.label}
                      </Text>
                      {!found && <Text fontSize="xs" color={SURFACE.muted}>{task.hint}</Text>}
                      {found && <Text fontSize="xs" color="green.300">Found it! ✓</Text>}
                    </Box>
                    <Text fontSize="2xl">{found ? '✅' : '⬜'}</Text>
                  </HStack>
                </Box>
              );
            })}
          </VStack>
          {foundItems.size === scavengerTasks.length && (
            <Box bg="rgba(67,233,123,0.12)" borderRadius="lg" p={3} border="1px solid" borderColor="rgba(67,233,123,0.3)">
              <Text fontSize="sm" color="green.300">
                🎉 You found everything! You're a web explorer!
              </Text>
            </Box>
          )}
          {(pokemon || demoMode) && (
            <Box w="full">
              <PokemonGraphViz pokemon={pokemon || undefined} demo={demoMode} height={350} />
            </Box>
          )}
          <Button
            colorScheme="blue"
            size="sm"
            alignSelf="flex-end"
            onClick={() => setStep(3)}
            isDisabled={foundItems.size < scavengerTasks.length}
          >
            Recap →
          </Button>
        </VStack>
      ),
    },
    {
      title: 'What Did You Find?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            🕸️ You just explored a real knowledge web!
          </Text>
          <Text>
            You found that <strong style={{ textTransform: 'capitalize' }}>{pokemonName}</strong> is connected to
            its type, its abilities, its moves, and its evolution. Every circle is a node,
            and every line is a string showing how they're connected!
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              💡 Scientists and companies use knowledge webs just like this to understand
              how things are connected. You're using the same tools they do — just with Pokemon!
            </Text>
          </Box>
          {pokemon && (
            <Button
              colorScheme="purple"
              variant="outline"
              size="sm"
              alignSelf="center"
              onClick={() => onPokemonSelect(pokemon)}
            >
              Explore {pokemon.name} in the Pokedex →
            </Button>
          )}
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Concept Glossary (kid-friendly explanations) ─────────────────────────

const CONCEPT_GLOSSARY: Record<string, { title: string; emoji: string; kid: string }> = {
  // Types
  fire: { title: 'Fire Type', emoji: '🔥', kid: 'Fire Pokemon are hot and powerful! They are strong against Grass but weak to Water.' },
  water: { title: 'Water Type', emoji: '💧', kid: 'Water Pokemon love to swim! They are strong against Fire but weak to Grass.' },
  grass: { title: 'Grass Type', emoji: '🌿', kid: 'Grass Pokemon use nature powers! They are strong against Water but weak to Fire.' },
  electric: { title: 'Electric Type', emoji: '⚡', kid: 'Electric Pokemon use lightning! They are strong against Water and Flying.' },
  psychic: { title: 'Psychic Type', emoji: '🔮', kid: 'Psychic Pokemon use mind powers! They are strong against Fighting and Poison.' },
  ice: { title: 'Ice Type', emoji: '❄️', kid: 'Ice Pokemon are super cold! They are strong against Grass and Dragon.' },
  dragon: { title: 'Dragon Type', emoji: '🐉', kid: 'Dragon Pokemon are rare and mighty! They are weak to other Dragons and Fairy.' },
  dark: { title: 'Dark Type', emoji: '🌑', kid: 'Dark Pokemon are sneaky! They are strong against Psychic and Ghost.' },
  fairy: { title: 'Fairy Type', emoji: '🧚', kid: 'Fairy Pokemon are magical! They are strong against Dragon and Dark.' },
  fighting: { title: 'Fighting Type', emoji: '🥊', kid: 'Fighting Pokemon use punches and kicks! They are strong against Normal and Ice.' },
  flying: { title: 'Flying Type', emoji: '🪶', kid: 'Flying Pokemon soar in the sky! They are strong against Grass and Fighting.' },
  ground: { title: 'Ground Type', emoji: '⛰️', kid: 'Ground Pokemon dig underground! They are strong against Fire and Electric.' },
  rock: { title: 'Rock Type', emoji: '🪨', kid: 'Rock Pokemon are tough and hard! They are strong against Fire and Flying.' },
  steel: { title: 'Steel Type', emoji: '⚙️', kid: 'Steel Pokemon are made of metal! They are strong against Fairy and Ice.' },
  poison: { title: 'Poison Type', emoji: '☠️', kid: 'Poison Pokemon use toxic attacks! They are strong against Grass and Fairy.' },
  bug: { title: 'Bug Type', emoji: '🐛', kid: 'Bug Pokemon are creepy-crawly! They are strong against Grass and Psychic.' },
  ghost: { title: 'Ghost Type', emoji: '👻', kid: 'Ghost Pokemon are spooky! They are strong against Psychic and Ghost.' },
  normal: { title: 'Normal Type', emoji: '⭐', kid: 'Normal Pokemon are everyday types. They do not have big strengths or weaknesses.' },
  // Stats
  hp: { title: 'HP', emoji: '❤️', kid: 'HP is how much damage a Pokemon can take before it faints. More HP means it stays in battle longer!' },
  attack: { title: 'Attack', emoji: '⚔️', kid: 'Attack is how hard a Pokemon hits with physical moves like punches and tackles.' },
  defense: { title: 'Defense', emoji: '🛡️', kid: 'Defense is how well a Pokemon blocks physical hits like punches and tackles.' },
  'special-attack': { title: 'Sp. Atk', emoji: '🔮', kid: 'Special Attack is how hard a Pokemon hits with special moves like beams and blasts.' },
  'special-defense': { title: 'Sp. Def', emoji: '✨', kid: 'Special Defense is how well a Pokemon blocks special moves like beams and blasts.' },
  speed: { title: 'Speed', emoji: '💨', kid: 'Speed decides who goes first in battle. The faster Pokemon attacks first!' },
  // Damage classes
  physical: { title: 'Physical Move', emoji: '👊', kid: 'Physical moves use body power. They are blocked by Defense.' },
  special: { title: 'Special Move', emoji: '🌟', kid: 'Special moves use energy power. They are blocked by Special Defense.' },
  status: { title: 'Status Move', emoji: '🔄', kid: 'Status moves do not do damage. They change stats or cause effects like sleep.' },
  // Evolution triggers
  'level-up': { title: 'Level Up', emoji: '📈', kid: 'This Pokemon grows into its next form by getting stronger in battle!' },
  'use-item': { title: 'Use an Item', emoji: '🎁', kid: 'This Pokemon needs a special item to evolve, like a Fire Stone!' },
  trade: { title: 'Trade', emoji: '🤝', kid: 'This Pokemon evolves when traded to another trainer!' },
  // Special
  legendary: { title: 'Legendary', emoji: '⭐', kid: 'Legendary Pokemon are super rare and super powerful. There is usually only one in the whole world!' },
  mythical: { title: 'Mythical', emoji: '🌟', kid: 'Mythical Pokemon are so rare that most people think they are just stories!' },
  ability: { title: 'Ability', emoji: '✨', kid: 'An ability is a special power that a Pokemon has. It works automatically in battle!' },
};

function getGlossaryEntry(key: string): { title: string; emoji: string; kid: string } {
  return CONCEPT_GLOSSARY[key.toLowerCase()] || { title: key, emoji: '❓', kid: 'A Pokemon concept. Tap around to learn more!' };
}

// ─── Breadcrumb Navigation ─────────────────────────────────────────────────

function BreadcrumbNav({
  historyStack,
  currentName,
  onBack,
  onHomeBase,
}: {
  historyStack: PokemonDetail[];
  currentName: string;
  onBack: () => void;
  onHomeBase: () => void;
}) {
  const SURFACE = useSurface();
  return (
    <HStack spacing={2} flexWrap="wrap" align="center">
      <Button
        leftIcon={<ChevronLeftIcon />}
        variant="ghost"
        size="xs"
        onClick={onBack}
        color={SURFACE.body}
      >
        Back
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={onHomeBase}
        color="blue.300"
        _hover={{ color: 'blue.200' }}
      >
        🏠 Explorer
      </Button>
      {historyStack.length > 0 && (
        <>
          <Text fontSize="xs" color={SURFACE.muted}>›</Text>
          {historyStack.slice(-3).map((p, i) => (
            <React.Fragment key={p.id}>
              <Text
                fontSize="xs"
                color={SURFACE.muted}
                textTransform="capitalize"
                cursor="pointer"
                _hover={{ color: SURFACE.title }}
                onClick={() => {
                  const stepsBack = historyStack.length - 1 - i;
                  for (let s = 0; s < stepsBack; s++) onBack();
                }}
              >
                {p.name}
              </Text>
              <Text fontSize="xs" color={SURFACE.muted}>›</Text>
            </React.Fragment>
          ))}
        </>
      )}
      <Text fontSize="xs" color={SURFACE.body} fontWeight="bold" textTransform="capitalize">
        {currentName}
      </Text>
    </HStack>
  );
}

// ─── Concept Lens (traversal modal) ────────────────────────────────────────

type ConceptType = 'type' | 'ability' | 'move' | 'stat' | 'evolution' | 'species';

interface ConceptLensData {
  type: ConceptType;
  key: string;
  label: string;
  pokemonId?: number;
  pokemonName?: string;
  /** Which section of the detail page the lens originated from (renders inline). */
  sectionId?: string;
  /** Which item within the section triggered the lens (for exact eye-level placement). */
  itemKey?: string;
}

function ConceptLensTrigger({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip label={`Learn more about ${label}`} placement="top" hasArrow openDelay={400}>
      <IconButton
        aria-label={`Learn more about ${label}`}
        icon={<SearchIcon />}
        size="xs"
        variant="ghost"
        colorScheme="blue"
        opacity={0.7}
        _hover={{ opacity: 1, transform: 'scale(1.1)' }}
        transition="all 0.15s ease"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />
    </Tooltip>
  );
}

function ConceptLensInline({
  concept,
  expected,
  pokemon,
  onClose,
  onPokemonSelect,
}: {
  concept: ConceptLensData | null;
  expected: { sectionId: string; itemKey?: string };
  pokemon: PokemonDetail;
  onClose: () => void;
  onPokemonSelect: (p: PokemonDetail) => void;
}) {
  if (!concept) return null;
  if (concept.sectionId !== expected.sectionId) return null;
  if (expected.itemKey && concept.itemKey !== expected.itemKey) return null;
  return (
    <Box flexBasis="100%" w="full">
      <ConceptLens
        concept={concept}
        pokemon={pokemon}
        onClose={onClose}
        onPokemonSelect={onPokemonSelect}
      />
    </Box>
  );
}

function ConceptLens({
  concept,
  pokemon,
  onClose,
  onPokemonSelect,
}: {
  concept: ConceptLensData | null;
  pokemon: PokemonDetail;
  onClose: () => void;
  onPokemonSelect: (p: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const [related, setRelated] = useState<PokemonSearchResult[]>([]);
  const [typeEff, setTypeEff] = useState<TypeEffectiveness | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose: onDrawerClose } = useDisclosure();

  useEffect(() => {
    if (concept) {
      onOpen();
      setLoading(true);
      setRelated([]);
      setTypeEff(null);

      const fetchRelated = async () => {
        try {
          if (concept.type === 'type') {
            const [list, eff] = await Promise.all([
              pokedexClient.pokemonByType(concept.key, 8),
              pokedexClient.typeEffectiveness(concept.key).catch(() => null),
            ]);
            setRelated(list ?? []);
            setTypeEff(eff);
          } else if (concept.type === 'ability') {
            // ability key is the ability name; need to find its id
            // For now, search by name as a fallback
            const allAbilities = pokemon.abilities;
            const ability = allAbilities.find((a) => a.name === concept.key);
            if (ability) {
              const list = await pokedexClient.pokemonByAbility(ability.id, 8);
              setRelated(
                list.map((a) => ({
                  id: a.id,
                  name: a.name,
                  pokedex_number: a.pokedex_number,
                  sprite_front: a.sprite_front ?? '',
                  official_artwork: '',
                  anime_artwork: null,
                  sprite_dream_world: a.sprite_dream_world ?? '',
                  types: a.types,
                })),
              );
            }
          } else if (concept.type === 'move') {
            // Move key is the move name; we need the move id
            // We can search for it via the moves already loaded on the detail view
            // For now, we'll skip this and show a message
          }
        } catch {
          // silent fail
        } finally {
          setLoading(false);
        }
      };

      fetchRelated();
    } else {
      onDrawerClose();
    }
  }, [concept, pokemon, onOpen, onDrawerClose]);

  if (!concept) return null;

  const entry = getGlossaryEntry(concept.key);
  const isOpenFinal = isOpen && concept !== null;

  return (
    <Collapse in={isOpenFinal}>
      <Box
        bg={SURFACE.panel}
        border="2px solid"
        borderColor={SURFACE.border}
        borderRadius="xl"
        p={5}
        mt={2}
        position="relative"
      >
        {/* Close button */}
        <IconButton
          aria-label="Close"
          icon={<ChevronLeftIcon transform="rotate(90deg)" />}
          size="xs"
          variant="ghost"
          position="absolute"
          top={2}
          right={2}
          onClick={onClose}
        />

        {/* Zone 1: What is it? */}
        <VStack spacing={3} align="stretch">
          <HStack spacing={3}>
            <Circle size="40px" bg={`${getTypeColor(concept.key)}30`} flexShrink={0}>
              <Text fontSize="xl">{entry.emoji}</Text>
            </Circle>
            <Box>
              <Text fontWeight="bold" fontSize="md" color={SURFACE.title}>
                {entry.title}
              </Text>
              <Text fontSize="sm" color={SURFACE.body}>
                {entry.kid}
              </Text>
            </Box>
          </HStack>

          {/* Type effectiveness for type concepts */}
          {concept.type === 'type' && typeEff && (
            <SimpleGrid columns={2} spacing={2}>
              {typeEff.strong_against.length > 0 && (
                <Box bg="rgba(67,233,123,0.12)" borderRadius="md" p={2} border="1px solid" borderColor="rgba(67,233,123,0.3)">
                  <Text fontSize="xs" fontWeight="bold" color="green.300" mb={1}>💪 Beats</Text>
                  <HStack spacing={1} flexWrap="wrap">
                    {typeEff.strong_against.map((t) => (
                      <Badge key={t} fontSize="2xs" bg={`${getTypeColor(t)}30`} color={getTypeColor(t)} borderRadius="full">
                        {getTypeEmoji(t)} {titleCase(t)}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}
              {typeEff.vulnerable_to.length > 0 && (
                <Box bg="rgba(245,87,108,0.12)" borderRadius="md" p={2} border="1px solid" borderColor="rgba(245,87,108,0.3)">
                  <Text fontSize="xs" fontWeight="bold" color="red.300" mb={1}>🛡️ Weak to</Text>
                  <HStack spacing={1} flexWrap="wrap">
                    {typeEff.vulnerable_to.map((t) => (
                      <Badge key={t} fontSize="2xs" bg={`${getTypeColor(t)}30`} color={getTypeColor(t)} borderRadius="full">
                        {getTypeEmoji(t)} {titleCase(t)}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}
            </SimpleGrid>
          )}

          {/* Zone 2: See it on the web */}
          <Box bg={SURFACE.card} borderRadius="md" p={3} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="xs" fontWeight="bold" color={SURFACE.muted} mb={1}>
              🕸️ How {pokemon.name} connects to {entry.title}
            </Text>
            <Text fontSize="xs" color={SURFACE.body}>
              {concept.type === 'type' && `${pokemon.name} has the ${concept.key} type. This means it uses ${concept.key} moves and is affected by ${concept.key} strengths and weaknesses.`}
              {concept.type === 'ability' && `${pokemon.name} has the "${concept.key}" ability. This power works automatically in battle!`}
              {concept.type === 'move' && `${pokemon.name} can learn "${concept.key}". This is a move it can use in battle.`}
              {concept.type === 'stat' && `${pokemon.name}'s ${entry.title} stat is one of six numbers that describe how strong it is.`}
              {concept.type === 'evolution' && `${pokemon.name} can evolve — that means it grows into a bigger, stronger form!`}
              {concept.type === 'species' && `${pokemon.name} belongs to the ${pokemon.species?.genus || 'Pokemon'} family.`}
            </Text>
          </Box>

          {/* Zone 3: Jump to connected things */}
          <Box>
            <Text fontSize="xs" fontWeight="bold" color={SURFACE.muted} mb={2}>
              🔗 Jump to connected {concept.type === 'type' ? 'Pokemon' : 'things'}
            </Text>
            {loading ? (
              <HStack spacing={2} py={2}>
                <Spinner size="xs" color="blue.300" />
                <Text fontSize="xs" color={SURFACE.muted}>Finding connected Pokemon...</Text>
              </HStack>
            ) : related.length > 0 ? (
              <Wrap>
                {related.slice(0, 8).map((p) => (
                  <WrapItem key={p.id}>
                    <VStack
                      spacing={0}
                      bg={SURFACE.card}
                      border="1px solid"
                      borderColor={SURFACE.border}
                      borderRadius="lg"
                      p={2}
                      cursor="pointer"
                      _hover={{ borderColor: 'blue.400', transform: 'scale(1.05)' }}
                      transition="all 0.15s ease"
                      onClick={async () => {
                        const detail = await pokedexClient.pokemonByName(p.name);
                        if (detail) onPokemonSelect(detail);
                      }}
                    >
                      <PokemonSprite
                        name={p.name}
                        spriteDreamWorld={p.sprite_dream_world}
                        officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                        spriteFront={p.sprite_front}
                        size="sm"
                      />
                      <Text fontSize="2xs" textTransform="capitalize" color={SURFACE.body}>
                        {p.name}
                      </Text>
                    </VStack>
                  </WrapItem>
                ))}
              </Wrap>
            ) : (
              <Text fontSize="xs" color={SURFACE.muted} fontStyle="italic">
                {concept.type === 'move'
                  ? 'Tap a Pokemon from the moves list to explore it!'
                  : concept.type === 'stat'
                    ? 'Tap a Pokemon to compare stats!'
                    : 'No connected Pokemon found right now.'}
              </Text>
            )}
          </Box>

          {/* Fact-check affordance */}
          <Box bg="rgba(79,172,254,0.08)" borderRadius="md" p={2} border="1px solid" borderColor="rgba(79,172,254,0.2)">
            <Text fontSize="2xs" color="blue.300">
              🔎 Is this true? This info comes from the Pokedex knowledge graph — {pokemon.name} is connected to {entry.title} by a real edge.
            </Text>
          </Box>
        </VStack>
      </Box>
    </Collapse>
  );
}

// ─── Pokemon Explorer (Free Explore Mode) ─────────────────────────────────

function PokemonExplorer({
  onBack,
  onPokemonSelect,
}: {
  onBack: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allTypes, setAllTypes] = useState<{ id: number; name: string }[]>([]);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [totalCount, setTotalCount] = useState(0);
  const [usedFuzzy, setUsedFuzzy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const PAGE_SIZE = 24;
  const FETCH_LIMIT = 200;

  // Non-standard types that exist in the database but have no real Pokemon,
  // no type color, and no emoji — filter them out so they don't show as
  // broken tiles in the Explorer.
  const HIDDEN_TYPES = new Set(['unknown', 'stellar', 'shadow']);

  useEffect(() => {
    pokedexClient
      .allTypes()
      .then((d) => setAllTypes((d ?? []).filter((t) => !HIDDEN_TYPES.has(t.name.toLowerCase()))))
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    setVisibleCount(PAGE_SIZE);
    try {
      if (query.trim()) {
        // Regular search first (substring match, fast and kid-friendly for partial typing)
        let data = await pokedexClient.searchPokemon(query.trim(), typeFilter, undefined, undefined, FETCH_LIMIT).catch((e) => {
          console.error('[PokemonExplorer] searchPokemon error:', e);
          return null;
        });
        setUsedFuzzy(false);
        if (!data || data.length === 0) {
          // Fallback to fuzzy search for misspelling tolerance
          data = await pokedexClient.fuzzySearchPokemon(query.trim(), FETCH_LIMIT).catch((e) => {
            console.error('[PokemonExplorer] fuzzySearchPokemon fallback error:', e);
            return null;
          });
          setUsedFuzzy(true);
        }
        // If type filter is also active, filter results client-side
        if (data && typeFilter) {
          data = data.filter((p) => p.types.some((t) => t.toLowerCase() === typeFilter.toLowerCase()));
        }
        setResults(data ?? []);
        setTotalCount(data?.length ?? 0);
      } else if (typeFilter) {
        // Browse by type — use pokemonByType for complete results
        const data = await pokedexClient.pokemonByType(typeFilter, FETCH_LIMIT).catch((e) => {
          console.error('[PokemonExplorer] pokemonByType error:', e);
          setSearchError('Could not load Pokemon for this type. Please try again.');
          return null;
        });
        setUsedFuzzy(false);
        setResults(data ?? []);
        setTotalCount(data?.length ?? 0);
      } else {
        // No query, no filter — show first FETCH_LIMIT pokemon by dex number
        const data = await pokedexClient.searchPokemon('', '', undefined, undefined, FETCH_LIMIT).catch((e) => {
          console.error('[PokemonExplorer] initial load error:', e);
          setSearchError('Could not load Pokemon. Please check your connection and try again.');
          return null;
        });
        setUsedFuzzy(false);
        setResults(data ?? []);
        setTotalCount(data?.length ?? 0);
      }
    } catch (e) {
      console.error('[PokemonExplorer] doSearch unexpected error:', e);
      setSearchError('Something went wrong. Please try again.');
      setResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const handleSurprise = async () => {
    setSurpriseLoading(true);
    try {
      const seed = Math.floor(Math.random() * 100000);
      const daily = await pokedexClient.dailyPokemon(seed);
      const detail = await pokedexClient.pokemonByName(daily.name);
      if (detail) onPokemonSelect(detail);
    } catch {
      // fallback: pick a random from current results
      if (results.length > 0) {
        const random = results[Math.floor(Math.random() * results.length)];
        const detail = await pokedexClient.pokemonByName(random.name);
        if (detail) onPokemonSelect(detail);
      }
    } finally {
      setSurpriseLoading(false);
    }
  };

  const CONCEPT_TILES = [
    { emoji: '🔥', label: 'Fire', key: 'fire', color: '#EE8130' },
    { emoji: '💧', label: 'Water', key: 'water', color: '#6390F0' },
    { emoji: '🌿', label: 'Grass', key: 'grass', color: '#7AC74C' },
    { emoji: '⚡', label: 'Electric', key: 'electric', color: '#F7D02C' },
    { emoji: '🐉', label: 'Dragon', key: 'dragon', color: '#6F35FC' },
    { emoji: '🧚', label: 'Fairy', key: 'fairy', color: '#D685AD' },
  ];

  return (
    <VStack spacing={4} align="stretch" maxW="900px" mx="auto" w="full">
      <HStack justify="space-between">
        <Button leftIcon={<ChevronLeftIcon />} variant="ghost" size="sm" onClick={onBack}>
          Back to Lab
        </Button>
        <Badge colorScheme="blue" fontSize="xs">🔍 Free Explore</Badge>
      </HStack>

      <Text fontSize="xl" fontWeight="bold">
        🔍 Pokedex Explorer
      </Text>

      {/* Search bar + Surprise me */}
      <VStack spacing={2} align="stretch">
        <HStack>
          <InputGroup>
            <InputLeftElement>
              <SearchIcon color={SURFACE.muted} />
            </InputLeftElement>
            <Input
              placeholder="Search by name... (try pikashu!)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              bg="rgba(255,255,255,0.05)"
              borderColor="whiteAlpha.200"
            />
          </InputGroup>
          <Button colorScheme="purple" onClick={doSearch} isLoading={loading}>
            Search
          </Button>
          <Button
            colorScheme="yellow"
            variant="outline"
            onClick={handleSurprise}
            isLoading={surpriseLoading}
            leftIcon={<StarIcon />}
          >
            Surprise me!
          </Button>
        </HStack>
        {usedFuzzy && results.length > 0 && !loading && (
          <Text fontSize="xs" color={SURFACE.muted} fontStyle="italic">
            Did you mean...? Showing close matches for "{query}" 🔍
          </Text>
        )}
      </VStack>

      {/* Browse by concept tiles */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" color={SURFACE.muted} mb={2}>🌟 Browse by Type</Text>
        <SimpleGrid columns={{ base: 3, md: 6 }} spacing={2}>
          {CONCEPT_TILES.map((tile) => (
            <Box
              key={tile.key}
              bg={`${tile.color}20`}
              border="1px solid"
              borderColor={`${tile.color}50`}
              borderRadius="lg"
              p={3}
              cursor="pointer"
              _hover={{ transform: 'scale(1.05)', borderColor: tile.color }}
              transition="all 0.15s ease"
              textAlign="center"
              onClick={() => setTypeFilter(tile.key)}
            >
              <Text fontSize="2xl">{tile.emoji}</Text>
              <Text fontSize="xs" fontWeight="bold" color={tile.color}>{tile.label}</Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      {/* Type filter chips */}
      <Wrap>
        <WrapItem>
          <Button
            size="xs"
            onClick={() => setTypeFilter('')}
            bg={typeFilter === '' ? 'purple.500' : 'whiteAlpha.100'}
            color={typeFilter === '' ? 'white' : SURFACE.body}
            borderRadius="full"
          >
            All Types
          </Button>
        </WrapItem>
        {allTypes.map((t) => (
          <WrapItem key={t.id}>
            <Button
              size="xs"
              onClick={() => setTypeFilter(t.name)}
              bg={typeFilter === t.name ? getTypeColor(t.name) : `${getTypeColor(t.name)}30`}
              color={typeFilter === t.name ? 'white' : getTypeColor(t.name)}
              borderRadius="full"
            >
              {getTypeEmoji(t.name)} {t.name}
            </Button>
          </WrapItem>
        ))}
      </Wrap>

      {/* Results count */}
      {!loading && results.length > 0 && (
        <Text fontSize="xs" color={SURFACE.muted}>
          Showing {Math.min(visibleCount, results.length)} of {totalCount} Pokemon{typeFilter ? ` (${getTypeEmoji(typeFilter)} ${typeFilter})` : ''}
        </Text>
      )}

      {/* Results */}
      {loading && (
        <HStack justify="center" py={8}>
          <Spinner color="purple.400" />
          <Text color={SURFACE.muted}>Searching...</Text>
        </HStack>
      )}

      {!loading && searchError && (
        <VStack spacing={2} py={8}>
          <Text color="red.400" textAlign="center" fontWeight="bold">
            ⚠️ {searchError}
          </Text>
          <Button size="sm" colorScheme="purple" variant="outline" onClick={doSearch}>
            Try Again
          </Button>
        </VStack>
      )}

      {!loading && !searchError && hasSearched && results.length === 0 && (
        <VStack spacing={2} py={8}>
          <Text color={SURFACE.muted} textAlign="center">
            No Pokemon found. Try a different search! 🔍
          </Text>
          <Text fontSize="xs" color={SURFACE.muted}>
            Tip: You can misspell! Try "pikashu" or "char" — we'll find close matches.
          </Text>
        </VStack>
      )}

      {!loading && results.length > 0 && (
        <>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
            {results.slice(0, visibleCount).map((p) => (
              <Box
                key={p.id}
                bg="rgba(255,255,255,0.05)"
                borderRadius="lg"
                p={3}
                cursor="pointer"
                _hover={{ transform: 'scale(1.05)', borderColor: 'purple.400' }}
                transition="all 0.15s ease"
                border="1px solid"
                borderColor="whiteAlpha.200"
                onClick={async () => {
                  const detail = await pokedexClient.pokemonByName(p.name);
                  if (detail) onPokemonSelect(detail);
                }}
              >
                <VStack spacing={1}>
                  <PokemonSprite
                    name={p.name}
                    spriteDreamWorld={p.sprite_dream_world}
                    officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                    spriteFront={p.sprite_front}
                    size="md"
                  />
                  <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">
                    {p.name}
                  </Text>
                  <Text fontSize="xs" color={SURFACE.muted}>
                    #{p.pokedex_number}
                  </Text>
                  <HStack spacing={1}>
                    {p.types.map((t) => (
                      <Tag
                        key={t}
                        size="sm"
                        bg={`${getTypeColor(t)}40`}
                        color={getTypeColor(t)}
                        borderRadius="full"
                      >
                        <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>

          {visibleCount < results.length && (
            <VStack spacing={2} py={4}>
              <Button
                colorScheme="purple"
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              >
                Load More Pokemon! ({results.length - visibleCount} more to discover)
              </Button>
            </VStack>
          )}
        </>
      )}
    </VStack>
  );
}

// ─── Pokemon Detail View ──────────────────────────────────────────────────

function PokemonDetailView({
  pokemon,
  onBack,
  onHomeBase,
  historyStack,
  recentlyViewed,
  onPokemonSelect,
}: {
  pokemon: PokemonDetail;
  onBack: () => void;
  onHomeBase: () => void;
  historyStack: PokemonDetail[];
  recentlyViewed: PokemonDetail[];
  onPokemonSelect: (p: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const [moves, setMoves] = useState<PokemonMove[]>([]);
  const [evolution, setEvolution] = useState<EvolutionNode[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [conceptLens, setConceptLens] = useState<ConceptLensData | null>(null);
  const [artworkMode, setArtworkMode] = useState<'anime' | 'classic'>('anime');
  const { isOpen: showMoves, onToggle: toggleMoves } = useDisclosure();
  const { isOpen: showEvolution, onToggle: toggleEvolution } = useDisclosure();
  const { isOpen: showGraph, onToggle: toggleGraph } = useDisclosure();

  useEffect(() => {
    setLoadingExtra(true);
    Promise.all([
      pokedexClient.pokemonMoves(pokemon.id).catch(() => []),
      pokemon.species
        ? pokedexClient.evolutionChain(pokemon.species.id).catch(() => [])
        : Promise.resolve([]),
    ]).then(([m, e]) => {
      setMoves(m);
      setEvolution(e);
      setLoadingExtra(false);
    });
  }, [pokemon.id, pokemon.species]);

  const maxStat = 200;

  return (
    <VStack spacing={4} align="stretch" maxW="700px" mx="auto" w="full">
      <BreadcrumbNav
        historyStack={historyStack}
        currentName={pokemon.name}
        onBack={onBack}
        onHomeBase={onHomeBase}
      />

      {/* Pokemon header */}
      <Box
        bg="linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)"
        borderRadius="xl"
        p={5}
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <HStack spacing={4} align="start">
          <VStack spacing={2} align="center">
            <PokemonSprite
              name={pokemon.name}
              spriteDreamWorld={pokemon.sprite_dream_world}
              officialArtwork={pokemon.official_artwork}
              animeArtwork={artworkMode === 'anime' ? pokemon.anime_artwork : null}
              spriteFront={pokemon.sprite_front}
              size="xl"
            />
            {pokemon.anime_artwork && (
              <HStack spacing={1}>
                <Button
                  size="xs"
                  variant={artworkMode === 'anime' ? 'solid' : 'ghost'}
                  colorScheme="purple"
                  onClick={() => setArtworkMode('anime')}
                  borderRadius="full"
                >
                  ✨ Anime
                </Button>
                <Button
                  size="xs"
                  variant={artworkMode === 'classic' ? 'solid' : 'ghost'}
                  colorScheme="gray"
                  onClick={() => setArtworkMode('classic')}
                  borderRadius="full"
                >
                  🎨 Classic
                </Button>
              </HStack>
            )}
          </VStack>
          <Box flex={1}>
            <Text fontSize="2xl" fontWeight="bold" textTransform="capitalize">
              {pokemon.name}
            </Text>
            <Text fontSize="sm" color={SURFACE.muted}>
              Pokemon #{pokemon.pokedex_number}
            </Text>
            <HStack spacing={1} mt={2} flexWrap="wrap">
              {pokemon.types.map((t) => (
                <React.Fragment key={t}>
                  <Tag
                    size="md"
                    bg={`${getTypeColor(t)}40`}
                    color={getTypeColor(t)}
                    borderRadius="full"
                  >
                    <TagLabel>{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                  </Tag>
                  <ConceptLensTrigger
                    label={t}
                    onClick={() =>
                      setConceptLens({
                        type: 'type',
                        key: t,
                        label: t,
                        pokemonId: pokemon.id,
                        pokemonName: pokemon.name,
                        sectionId: 'types',
                        itemKey: t,
                      })
                    }
                  />
                  <ConceptLensInline
                    concept={conceptLens}
                    expected={{ sectionId: 'types', itemKey: t }}
                    pokemon={pokemon}
                    onClose={() => setConceptLens(null)}
                    onPokemonSelect={onPokemonSelect}
                  />
                </React.Fragment>
              ))}
            </HStack>
            {pokemon.species && (
              <Text fontSize="xs" color={SURFACE.muted} mt={2}>
                {pokemon.species.genus}
                {pokemon.species.is_legendary && ' ⭐ Legendary'}
                {pokemon.species.is_mythical && ' 🌟 Mythical'}
              </Text>
            )}
          </Box>
        </HStack>
      </Box>

      {/* Stats */}
      <Box bg="rgba(0,0,0,0.3)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
        <Text fontWeight="semibold" fontSize="sm" mb={3}>📊 Battle Stats <Text as="span" fontSize="2xs" color={SURFACE.muted}>(tap a stat to learn what it means)</Text></Text>
        <VStack spacing={2} align="stretch">
          {pokemon.stats.map((s) => (
            <Box key={s.stat}>
              <HStack justify="space-between" mb={1}>
                <HStack spacing={1}>
                  <Text fontSize="xs" fontWeight="semibold">
                    {statLabel(s.stat)}
                  </Text>
                  <ConceptLensTrigger
                    label={statLabel(s.stat)}
                    onClick={() =>
                      setConceptLens({
                        type: 'stat',
                        key: s.stat,
                        label: statLabel(s.stat),
                        pokemonId: pokemon.id,
                        pokemonName: pokemon.name,
                        sectionId: 'stats',
                        itemKey: s.stat,
                      })
                    }
                  />
                </HStack>
                <Text fontSize="xs" color={statColor(s.base_value)} fontWeight="bold">
                  {s.base_value}
                </Text>
              </HStack>
              <Progress
                value={(s.base_value / maxStat) * 100}
                colorScheme={s.base_value >= 90 ? 'green' : s.base_value >= 60 ? 'yellow' : 'red'}
                size="sm"
                borderRadius="full"
                bg="whiteAlpha.200"
              />
              <ConceptLensInline
                concept={conceptLens}
                expected={{ sectionId: 'stats', itemKey: s.stat }}
                pokemon={pokemon}
                onClose={() => setConceptLens(null)}
                onPokemonSelect={onPokemonSelect}
              />
            </Box>
          ))}
          <Divider my={2} />
          <HStack justify="space-between">
            <Text fontSize="xs" fontWeight="bold">Total</Text>
            <Text fontSize="xs" fontWeight="bold" color="purple.300">
              {pokemon.stats.reduce((sum, s) => sum + s.base_value, 0)}
            </Text>
          </HStack>
        </VStack>
      </Box>

      {/* Info grid */}
      <SimpleGrid columns={3} spacing={3}>
        <InfoCard label="How Tall" value={formatHeight(pokemon.height)} />
        <InfoCard label="How Heavy" value={formatWeight(pokemon.weight)} />
        <InfoCard label="Battle Points" value={pokemon.base_experience.toString()} />
      </SimpleGrid>

      {/* Abilities */}
      {pokemon.abilities.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Text fontWeight="semibold" fontSize="sm" mb={2}>✨ Abilities</Text>
          <HStack spacing={2} flexWrap="wrap" align="flex-start">
            {pokemon.abilities.map((a) => (
              <React.Fragment key={a.id}>
                <Tag
                  size="md"
                  bg="purple.500"
                  color="white"
                  borderRadius="full"
                >
                  <TagLabel>{a.name}{a.is_hidden ? ' (hidden)' : ''}</TagLabel>
                </Tag>
                <ConceptLensTrigger
                  label={a.name}
                  onClick={() =>
                    setConceptLens({
                      type: 'ability',
                      key: a.name,
                      label: a.name,
                      pokemonId: pokemon.id,
                      pokemonName: pokemon.name,
                      sectionId: 'abilities',
                      itemKey: a.name,
                    })
                  }
                />
                <ConceptLensInline
                  concept={conceptLens}
                  expected={{ sectionId: 'abilities', itemKey: a.name }}
                  pokemon={pokemon}
                  onClose={() => setConceptLens(null)}
                  onPokemonSelect={onPokemonSelect}
                />
              </React.Fragment>
            ))}
          </HStack>
        </Box>
      )}

      {/* Evolution chain */}
      {evolution.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Button variant="ghost" size="sm" onClick={toggleEvolution} rightIcon={showEvolution ? <ChevronLeftIcon transform="rotate(-90deg)" /> : <ChevronRightIcon />}>
            🧬 Evolution Family ({evolution.length})
          </Button>
          <Collapse in={showEvolution}>
            <HStack spacing={2} mt={3} flexWrap="wrap" justify="center" align="flex-start">
              {evolution.map((e, i) => (
                <React.Fragment key={e.species_id}>
                  {i > 0 && (
                    <VStack spacing={0}>
                      <Text fontSize="xs" color="purple.300">→</Text>
                      {e.evolve_trigger && (
                        <HStack spacing={0}>
                          <Text fontSize="2xs" color={SURFACE.muted}>{e.evolve_trigger}</Text>
                          <ConceptLensTrigger
                            label={e.evolve_trigger}
                            onClick={() =>
                              setConceptLens({
                                type: 'evolution',
                                key: e.evolve_trigger!,
                                label: e.species_name,
                                pokemonId: pokemon.id,
                                pokemonName: pokemon.name,
                                sectionId: 'evolution',
                                itemKey: e.evolve_trigger,
                              })
                            }
                          />
                        </HStack>
                      )}
                    </VStack>
                  )}
                  <VStack
                    spacing={1}
                    cursor={e.pokemon_name ? 'pointer' : 'default'}
                    _hover={e.pokemon_name ? { transform: 'scale(1.1)' } : undefined}
                    transition="all 0.15s ease"
                    onClick={async () => {
                      if (e.pokemon_name) {
                        const detail = await pokedexClient.pokemonByName(e.pokemon_name);
                        if (detail) onPokemonSelect(detail);
                      }
                    }}
                  >
                    <PokemonSprite
                      name={e.pokemon_name || e.species_name}
                      officialArtwork={e.artwork}
                      animeArtwork={e.anime_artwork}
                      spriteFront={e.sprite_front}
                      size="sm"
                    />
                    <Text fontSize="xs" textTransform="capitalize">{e.species_name}</Text>
                    {e.pokemon_name && <Text fontSize="2xs" color="blue.300">tap to explore →</Text>}
                  </VStack>
                </React.Fragment>
              ))}
              <ConceptLensInline
                concept={conceptLens}
                expected={{ sectionId: 'evolution' }}
                pokemon={pokemon}
                onClose={() => setConceptLens(null)}
                onPokemonSelect={onPokemonSelect}
              />
            </HStack>
          </Collapse>
        </Box>
      )}

      {/* Moves */}
      {moves.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Button variant="ghost" size="sm" onClick={toggleMoves} rightIcon={showMoves ? <ChevronLeftIcon transform="rotate(-90deg)" /> : <ChevronRightIcon />}>
            ⚔️ Cool Moves ({moves.length})
          </Button>
          <Collapse in={showMoves}>
            <VStack spacing={2} align="stretch" mt={3} maxH="300px" overflowY="auto">
              {moves.slice(0, 30).map((m) => (
                <Box key={m.id}>
                  <HStack
                    bg="rgba(0,0,0,0.2)"
                    borderRadius="md"
                    p={2}
                    spacing={3}
                    _hover={{ bg: 'rgba(0,0,0,0.35)', borderColor: 'blue.400' }}
                    border="1px solid"
                    borderColor="transparent"
                    transition="all 0.15s ease"
                  >
                    <Tag size="sm" bg={`${getTypeColor(m.type)}40`} color={getTypeColor(m.type)} borderRadius="full">
                      <TagLabel fontSize="xs">{getTypeEmoji(m.type)} {titleCase(m.type)}</TagLabel>
                    </Tag>
                    <Text fontSize="sm" fontWeight="semibold" textTransform="capitalize">{titleCase(m.name)}</Text>
                    <ConceptLensTrigger
                      label={m.name}
                      onClick={() =>
                        setConceptLens({
                          type: 'move',
                          key: m.name,
                          label: m.name,
                          pokemonId: pokemon.id,
                          pokemonName: pokemon.name,
                          sectionId: 'moves',
                          itemKey: m.name,
                        })
                      }
                    />
                    <Box flex={1} />
                    {m.power && <Text fontSize="xs" color={SURFACE.muted}>💪 Power: {m.power}</Text>}
                    {m.level && <Text fontSize="xs" color={SURFACE.muted}>⭐ Level: {m.level}</Text>}
                    <Text fontSize="xs" color={SURFACE.muted}>{kidDamageClass(m.damage_class)}</Text>
                  </HStack>
                  <ConceptLensInline
                    concept={conceptLens}
                    expected={{ sectionId: 'moves', itemKey: m.name }}
                    pokemon={pokemon}
                    onClose={() => setConceptLens(null)}
                    onPokemonSelect={onPokemonSelect}
                  />
                </Box>
              ))}
            </VStack>
          </Collapse>
        </Box>
      )}

      {/* Species info */}
      {pokemon.species && pokemon.species.description && (
        <Box
          bg="rgba(102,126,234,0.1)"
          borderRadius="lg"
          p={4}
          border="1px solid"
          borderColor="rgba(102,126,234,0.3)"
        >
          <Text fontSize="sm" color={SURFACE.body}>
            📖 {pokemon.species.description}
          </Text>
        </Box>
      )}

      {/* Graph visualization */}
      <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
        <Button variant="ghost" size="sm" onClick={toggleGraph} rightIcon={showGraph ? <ChevronLeftIcon transform="rotate(-90deg)" /> : <ChevronRightIcon />}>
          🕸️ Friend Web
        </Button>
        <Collapse in={showGraph}>
          <Box mt={3}>
            <PokemonGraphViz pokemon={pokemon} height={400} />
          </Box>
        </Collapse>
      </Box>

      {loadingExtra && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" color="purple.400" />
          <Text fontSize="sm" color={SURFACE.muted}>Loading moves & evolutions...</Text>
        </HStack>
      )}

      {/* Recently viewed */}
      {recentlyViewed.length > 1 && (
        <Box bg={SURFACE.card} borderRadius="lg" p={3} border="1px solid" borderColor={SURFACE.border}>
          <Text fontSize="xs" fontWeight="bold" color={SURFACE.muted} mb={2}>👀 Recently Visited</Text>
          <HStack spacing={2} flexWrap="wrap">
            {recentlyViewed.filter((p) => p.id !== pokemon.id).slice(0, 4).map((p) => (
              <VStack
                key={p.id}
                spacing={0}
                cursor="pointer"
                _hover={{ transform: 'scale(1.05)' }}
                transition="all 0.15s ease"
                onClick={() => onPokemonSelect(p)}
              >
                <PokemonSprite
                  name={p.name}
                  spriteDreamWorld={p.sprite_dream_world}
                  officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                  spriteFront={p.sprite_front}
                  size="sm"
                />
                <Text fontSize="2xs" textTransform="capitalize" color={SURFACE.body}>{p.name}</Text>
              </VStack>
            ))}
          </HStack>
        </Box>
      )}
    </VStack>
  );
}

// ─── Lesson: Build Your Team (L6) ──────────────────────────────────────────

function TeamBuilderLesson({ onComplete }: { onComplete: () => void }) {
  const SURFACE = useSurface();
  const [step, setStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<TeamSuggestion[]>([]);
  const [weakness, setWeakness] = useState<WeaknessCalc | null>(null);
  const [coverage, setCoverage] = useState<TypeCoverage | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const allTypes = useMemo(
    () => [
      'fire', 'water', 'grass', 'electric', 'psychic', 'ice',
      'dragon', 'dark', 'fairy', 'fighting', 'flying', 'ground',
      'rock', 'steel', 'poison', 'bug', 'ghost', 'normal',
    ],
    [],
  );

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const fetchSuggestions = useCallback(async () => {
    if (selectedTypes.length === 0) return;
    setLoading(true);
    try {
      const data = await pokedexClient.teamSuggest(selectedTypes, 12);
      setSuggestions(data ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTypes]);

  const addToTeam = (p: TeamSuggestion) => {
    if (team.length >= 6 || team.some((t) => t.id === p.id)) return;
    setTeam([...team, p]);
  };

  const removeFromTeam = (id: number) => {
    setTeam(team.filter((t) => t.id !== id));
  };

  const analyzeTeam = useCallback(async () => {
    if (team.length === 0) return;
    setAnalyzing(true);
    try {
      const ids = team.map((t) => t.id);
      const [w, c] = await Promise.all([
        pokedexClient.teamWeakness(ids),
        pokedexClient.teamCoverage(ids),
      ]);
      setWeakness(w);
      setCoverage(c);
    } catch {
      setWeakness(null);
      setCoverage(null);
    } finally {
      setAnalyzing(false);
    }
  }, [team]);

  const teamTypeSet = new Set<string>();
  team.forEach((p) => p.types.forEach((t) => teamTypeSet.add(t)));
  const teamTypes = Array.from(teamTypeSet);

  const donutSegments = teamTypes.map((t, i) => {
    const pct = 100 / teamTypes.length;
    const offset = teamTypes.slice(0, i).reduce((sum, _) => sum + pct, 0);
    return { type: t, pct, offset, color: getTypeColor(t) };
  });

  const steps = [
    {
      title: 'Build Your Team!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Pokemon trainers bring a <strong>team of 6</strong> to battles! A great
            team has Pokemon that cover each other. Let's build one!
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              💡 If your team is all Fire types, a Water Pokemon could beat them all!
              But if you add a Grass type, it can protect your team from Water. That's
              called <strong>type coverage</strong>!
            </Text>
          </Box>
          <Text>Pick one or two types to start finding Pokemon:</Text>
          <Wrap spacing={2}>
            {allTypes.map((t) => (
              <WrapItem key={t}>
                <Button
                  size="xs"
                  onClick={() => toggleType(t)}
                  bg={selectedTypes.includes(t) ? getTypeColor(t) : `${getTypeColor(t)}30`}
                  color={selectedTypes.includes(t) ? 'white' : getTypeColor(t)}
                  border="1px solid"
                  borderColor={getTypeColor(t)}
                  _hover={{ bg: getTypeColor(t), color: 'white' }}
                  borderRadius="full"
                >
                  {getTypeEmoji(t)} {titleCase(t)}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
          {selectedTypes.length > 0 && (
            <Button
              colorScheme="yellow"
              onClick={fetchSuggestions}
              isLoading={loading}
              size="sm"
              alignSelf="center"
            >
              Find {selectedTypes.join(' + ')} Pokemon! 🔍
            </Button>
          )}
        </VStack>
      ),
    },
    {
      title: 'Pick Your Pokemon!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Tap <strong>+ Add</strong> to put Pokemon on your team. You can pick up to 6!
          </Text>
          <HStack spacing={2} justify="center">
            <Text fontSize="sm" color={SURFACE.muted}>Your team:</Text>
            <Badge colorScheme={team.length === 6 ? 'green' : 'yellow'} fontSize="sm">
              {team.length}/6
            </Badge>
          </HStack>
          {team.length > 0 && (
            <HStack spacing={2} justify="center" flexWrap="wrap">
              {team.map((p) => (
                <Box key={p.id} bg="rgba(246,211,101,0.15)" borderRadius="lg" p={2} border="1px solid" borderColor="rgba(246,211,101,0.3)">
                  <VStack spacing={0}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="sm"
                    />
                    <Text fontSize="2xs" textTransform="capitalize" color={SURFACE.title}>{p.name}</Text>
                    <Button size="xs" variant="ghost" colorScheme="red" onClick={() => removeFromTeam(p.id)}>✕</Button>
                  </VStack>
                </Box>
              ))}
            </HStack>
          )}
          {loading && (
            <HStack justify="center" py={4}>
              <Spinner color="yellow.400" />
              <Text color={SURFACE.muted}>Finding Pokemon...</Text>
            </HStack>
          )}
          {!loading && suggestions.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
              {suggestions.map((p) => (
                <Box
                  key={p.id}
                  bg={SURFACE.card}
                  borderRadius="lg"
                  p={3}
                  border="1px solid"
                  borderColor={SURFACE.border}
                  _hover={{ transform: 'scale(1.05)', borderColor: 'yellow.400' }}
                  transition="all 0.15s ease"
                >
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="md"
                    />
                    <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize" color={SURFACE.title}>
                      {p.name}
                    </Text>
                    <Text fontSize="xs" color={SURFACE.muted}>#{p.pokedex_number}</Text>
                    <HStack spacing={1}>
                      {p.types.map((t) => (
                        <Tag key={t} size="sm" bg={`${getTypeColor(t)}40`} color={getTypeColor(t)} borderRadius="full">
                          <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                        </Tag>
                      ))}
                    </HStack>
                    <Button
                      size="xs"
                      colorScheme="green"
                      onClick={() => addToTeam(p)}
                      isDisabled={team.length >= 6 || team.some((t) => t.id === p.id)}
                    >
                      {team.some((t) => t.id === p.id) ? '✓ Added!' : '+ Add'}
                    </Button>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
          {!loading && suggestions.length === 0 && selectedTypes.length === 0 && (
            <Text color={SURFACE.muted} textAlign="center" py={4}>
              Go back and pick some types first! 👆
            </Text>
          )}
          {team.length > 0 && (
            <Button colorScheme="yellow" size="sm" alignSelf="center" onClick={() => setStep(2)}>
              Check my team! →
            </Button>
          )}
        </VStack>
      ),
    },
    {
      title: 'Type Coverage Check!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>Let's see how your team does! Tap "Analyze" to check your types.</Text>
          <Button colorScheme="yellow" onClick={analyzeTeam} isLoading={analyzing} size="sm" alignSelf="center">
            Analyze My Team! 🔍
          </Button>
          {coverage && weakness && (
            <VStack spacing={4} align="stretch">
              {/* Type Coverage Donut */}
              <Box bg={SURFACE.card} borderRadius="xl" p={4} border="1px solid" borderColor={SURFACE.border} textAlign="center">
                <Text fontWeight="bold" fontSize="sm" color={SURFACE.title} mb={3}>Your Team's Types</Text>
                {teamTypes.length > 0 ? (
                  <VStack spacing={2}>
                    <Box position="relative" w="120px" h="120px" mx="auto" borderRadius="full" bg="whiteAlpha.100" overflow="hidden">
                      {donutSegments.map((seg) => (
                        <Box
                          key={seg.type}
                          position="absolute"
                          top="0"
                          left="0"
                          w="100%"
                          h="100%"
                          borderRadius="full"
                          bg={`conic-gradient(${seg.color} ${seg.offset}% ${seg.offset + seg.pct}%, transparent ${seg.offset + seg.pct}%)`}
                        />
                      ))}
                      <Box position="absolute" top="20%" left="20%" w="60%" h="60%" borderRadius="full" bg={SURFACE.card} />
                      <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)">
                        <Text fontSize="lg" fontWeight="bold" color={SURFACE.title}>{teamTypes.length}</Text>
                        <Text fontSize="2xs" color={SURFACE.muted}>types</Text>
                      </Box>
                    </Box>
                    <HStack spacing={2} justify="center" flexWrap="wrap">
                      {teamTypes.map((t) => (
                        <Tag key={t} size="sm" bg={`${getTypeColor(t)}30`} color={getTypeColor(t)} borderRadius="full">
                          <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                ) : (
                  <Text color={SURFACE.muted} fontSize="sm">No types yet!</Text>
                )}
              </Box>

              {/* Coverage */}
              <Box bg="rgba(67,233,123,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(67,233,123,0.3)">
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="bold" fontSize="sm" color="green.300">✅ Type Coverage</Text>
                  <Badge colorScheme={coverage.coverage_pct >= 70 ? 'green' : coverage.coverage_pct >= 50 ? 'yellow' : 'red'}>
                    {coverage.coverage_pct.toFixed(0)}%
                  </Badge>
                </HStack>
                <Progress value={coverage.coverage_pct} colorScheme={coverage.coverage_pct >= 70 ? 'green' : 'yellow'} size="sm" mb={3} />
                {coverage.super_effective.length > 0 && (
                  <Box mb={2}>
                    <Text fontSize="xs" color={SURFACE.muted} mb={1}>💪 Can beat:</Text>
                    <Wrap spacing={2}>
                      {coverage.super_effective.map((t) => (
                        <WrapItem key={t}>
                          <Tag size="sm" bg={`${getTypeColor(t)}30`} color={getTypeColor(t)} borderRadius="full">
                            <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
                {coverage.not_covered.filter((t) => !['stellar', 'unknown', 'shadow'].includes(t)).length > 0 && (
                  <Box>
                    <Text fontSize="xs" color={SURFACE.muted} mb={1}>🛡️ Can't beat yet:</Text>
                    <Wrap spacing={2}>
                      {coverage.not_covered.filter((t) => !['stellar', 'unknown', 'shadow'].includes(t)).map((t) => (
                        <WrapItem key={t}>
                          <Tag size="sm" bg="whiteAlpha.100" color={SURFACE.muted} borderRadius="full">
                            <TagLabel fontSize="xs">{t}</TagLabel>
                          </Tag>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </Box>
                )}
              </Box>

              {/* Weakness */}
              <Box bg="rgba(245,87,108,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(245,87,108,0.3)">
                <Text fontWeight="bold" fontSize="sm" color="red.300" mb={2}>⚠️ Watch Out For:</Text>
                {weakness.weak_to.length > 0 ? (
                  <Wrap spacing={2}>
                    {weakness.weak_to.map((t) => (
                      <WrapItem key={t}>
                        <Tag size="sm" bg={`${getTypeColor(t)}30`} color={getTypeColor(t)} borderRadius="full">
                          <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                ) : (
                  <Text fontSize="sm" color="green.300">No major weaknesses! 🛡️</Text>
                )}
                {weakness.weak_to.length > 0 && (
                  <Text fontSize="xs" color={SURFACE.muted} mt={2}>
                    💡 Try adding a Pokemon that beats these types!
                  </Text>
                )}
              </Box>
            </VStack>
          )}
          {coverage && (
            <Button colorScheme="green" size="sm" alignSelf="center" onClick={() => setStep(3)}>
              See results! →
            </Button>
          )}
        </VStack>
      ),
    },
    {
      title: 'Your Team is Ready!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            🏆 Your team is ready, Trainer!
          </Text>
          {team.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
              {team.map((p) => (
                <Box key={p.id} bg="rgba(246,211,101,0.12)" borderRadius="lg" p={3} border="2px solid" borderColor="rgba(246,211,101,0.4)">
                  <VStack spacing={1}>
                    <PokemonSprite
                      name={p.name}
                      spriteDreamWorld={p.sprite_dream_world}
                      officialArtwork={p.official_artwork}
                    animeArtwork={p.anime_artwork}
                      spriteFront={p.sprite_front}
                      size="md"
                    />
                    <Text fontWeight="bold" fontSize="sm" textTransform="capitalize" color={SURFACE.title}>{p.name}</Text>
                    <HStack spacing={1}>
                      {p.types.map((t) => (
                        <Tag key={t} size="sm" bg={`${getTypeColor(t)}40`} color={getTypeColor(t)} borderRadius="full">
                          <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
          {coverage && (
            <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border} textAlign="center">
              <Text fontSize="sm" color={SURFACE.body}>
                Your team covers <strong>{coverage.coverage_pct.toFixed(0)}%</strong> of all types.
                {coverage.coverage_pct >= 70
                  ? ' Amazing coverage! 🎉'
                  : ' Try adding different types to cover more! 💪'}
              </Text>
            </Box>
          )}
          <Box bg="rgba(246,211,101,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(246,211,101,0.3)">
            <Text fontSize="sm" color={SURFACE.body}>
              💡 Real Pokemon trainers think about type coverage too! You just used
              data skills to build a better team than picking randomly!
            </Text>
          </Box>
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Bonus: Amazing Forms ─────────────────────────────────────────────────

function FormsLesson({
  onComplete,
  onPokemonSelect,
}: {
  onComplete: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const SURFACE = useSurface();
  const { play: playSound } = useSound();
  const [step, setStep] = useState(0);
  const [searchName, setSearchName] = useState('charizard');
  const [forms, setForms] = useState<PokemonForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPokemonId, setCurrentPokemonId] = useState<number | null>(null);
  const [spotDiffAnswer, setSpotDiffAnswer] = useState<number | null>(null);
  const [spotDiffRevealed, setSpotDiffRevealed] = useState(false);

  const fetchForms = useCallback(async (name: string) => {
    setLoading(true);
    setError('');
    try {
      const pokemon = await pokedexClient.pokemonByName(name);
      if (!pokemon) {
        setError('Pokemon not found. Try another name!');
        setForms([]);
        return;
      }
      setCurrentPokemonId(pokemon.id);
      const data = await pokedexClient.pokemonForms(pokemon.id);
      setForms(data ?? []);
    } catch {
      setError('Could not reach the Pokedex service.');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms('charizard');
  }, []);

  const steps = [
    {
      title: 'Same Pokemon, Different Costume!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Some Pokemon have special <strong>forms</strong> — it's the same Pokemon,
            but wearing a different costume! They can look different, have different
            types, and different powers!
          </Text>
          <SimpleGrid columns={1} spacing={3}>
            <Box bg="rgba(255,107,107,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(255,107,107,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">💥</Text>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color={SURFACE.title}>Mega Evolution</Text>
                  <Text fontSize="xs" color={SURFACE.muted}>A super-powerful form during battle! Mega Charizard X becomes Fire/Dragon!</Text>
                </Box>
              </HStack>
            </Box>
            <Box bg="rgba(102,126,234,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(102,126,234,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">🏔️</Text>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color={SURFACE.title}>Regional Forms</Text>
                  <Text fontSize="xs" color={SURFACE.muted}>Pokemon adapt to different places! Alolan Vulpix is Ice-type instead of Fire!</Text>
                </Box>
              </HStack>
            </Box>
            <Box bg="rgba(246,211,101,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(246,211,101,0.3)">
              <HStack spacing={3}>
                <Text fontSize="2xl">🎪</Text>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color={SURFACE.title}>Gigantamax</Text>
                  <Text fontSize="xs" color={SURFACE.muted}>A giant form in Galar region battles. Gigantamax Charizard is enormous!</Text>
                </Box>
              </HStack>
            </Box>
          </SimpleGrid>
        </VStack>
      ),
    },
    {
      title: 'Spot the Difference!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Look at these two Vulpix forms. Can you spot what's different?
          </Text>
          <SimpleGrid columns={2} spacing={4}>
            <Box bg="rgba(238,129,48,0.15)" borderRadius="xl" p={4} border="2px solid" borderColor="#EE8130" textAlign="center">
              <Text fontSize="xs" color={SURFACE.muted} mb={2}>Regular Vulpix</Text>
              <Text fontSize="3xl">🦊</Text>
              <Tag mt={2} size="sm" bg="#EE813040" color="#EE8130" borderRadius="full">
                <TagLabel fontSize="xs">🔥 Fire</TagLabel>
              </Tag>
            </Box>
            <Box bg="rgba(150,217,214,0.15)" borderRadius="xl" p={4} border="2px solid" borderColor="#96D9D6" textAlign="center">
              <Text fontSize="xs" color={SURFACE.muted} mb={2}>Alolan Vulpix</Text>
              <Text fontSize="3xl">❄️🦊</Text>
              <Tag mt={2} size="sm" bg="#96D9D640" color="#96D9D6" borderRadius="full">
                <TagLabel fontSize="xs">❄️ Ice</TagLabel>
              </Tag>
            </Box>
          </SimpleGrid>
          <Text fontSize="sm" color={SURFACE.body} textAlign="center">
            What's different about Alolan Vulpix?
          </Text>
          <VStack spacing={2} align="stretch">
            {[
              { idx: 0, text: 'It has a different type (Ice instead of Fire)', correct: true },
              { idx: 1, text: 'It is a completely different Pokemon', correct: false },
              { idx: 2, text: 'It is always shiny', correct: false },
            ].map((opt) => (
              <Box
                key={opt.idx}
                bg={spotDiffAnswer === opt.idx
                  ? (spotDiffRevealed ? (opt.correct ? 'rgba(67,233,123,0.15)' : 'rgba(245,87,108,0.15)') : SURFACE.card)
                  : SURFACE.card}
                border="2px solid"
                borderColor={spotDiffAnswer === opt.idx
                  ? (spotDiffRevealed ? (opt.correct ? 'green.400' : 'red.400') : 'blue.400')
                  : SURFACE.border}
                borderRadius="lg"
                p={3}
                cursor="pointer"
                _hover={{ borderColor: 'blue.300' }}
                transition="all 0.15s ease"
                onClick={() => { setSpotDiffAnswer(opt.idx); setSpotDiffRevealed(false); }}
              >
                <Text fontSize="sm" color={SURFACE.body}>{opt.text}</Text>
              </Box>
            ))}
          </VStack>
          {spotDiffAnswer !== null && !spotDiffRevealed && (
            <Button colorScheme="yellow" size="sm" alignSelf="center" onClick={() => { setSpotDiffRevealed(true); playSound(spotDiffAnswer === 0 ? 'success' : 'error'); }}>
              Check! ✨
            </Button>
          )}
          {spotDiffRevealed && (
            <Box
              bg={spotDiffAnswer === 0 ? 'rgba(67,233,123,0.15)' : 'rgba(245,87,108,0.15)'}
              borderRadius="lg" p={4} border="1px solid"
              borderColor={spotDiffAnswer === 0 ? 'green.400' : 'red.400'}
            >
              <Text fontSize="sm" color={spotDiffAnswer === 0 ? 'green.300' : 'red.300'}>
                {spotDiffAnswer === 0
                  ? '🎉 Yes! Alolan Vulpix is Ice-type instead of Fire-type!'
                  : '❌ Not quite! Alolan Vulpix is the same Pokemon but with a different type!'}
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Form Gallery!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Search for a Pokemon to see all its forms! Try "charizard", "mewtwo", or "pikachu".
          </Text>
          <HStack>
            <InputGroup>
              <InputLeftElement>
                <SearchIcon color={SURFACE.muted} />
              </InputLeftElement>
              <Input
                placeholder="Pokemon name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value.toLowerCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchForms(searchName); }}
                bg="rgba(255,255,255,0.05)"
                border="1px solid"
                borderColor={SURFACE.border}
              />
            </InputGroup>
            <Button colorScheme="purple" onClick={() => fetchForms(searchName)} isLoading={loading} size="sm">
              Search
            </Button>
          </HStack>

          {error && <Text color="red.400" fontSize="sm">{error}</Text>}

          {loading && (
            <HStack justify="center" py={4}>
              <Spinner size="sm" color="purple.400" />
              <Text fontSize="sm" color={SURFACE.muted}>Loading forms...</Text>
            </HStack>
          )}

          {!loading && forms.length > 0 && (
            <VStack spacing={3} align="stretch">
              <Text fontSize="sm" color={SURFACE.muted}>
                Found <strong>{forms.length}</strong> form{forms.length !== 1 ? 's' : ''}:
              </Text>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                {forms.map((f) => (
                  <Box
                    key={f.id}
                    bg={SURFACE.card}
                    borderRadius="lg"
                    p={4}
                    border="2px solid"
                    borderColor={f.is_default ? SURFACE.border : 'rgba(255,107,107,0.3)'}
                  >
                    <VStack spacing={2}>
                      <PokemonSprite
                        name={f.name}
                        spriteFront={f.sprite_front}
                        size="lg"
                      />
                      <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize" color={SURFACE.title}>
                        {f.name.replace(/-/g, ' ')}
                      </Text>
                      {f.is_default ? (
                        <Badge colorScheme="gray" fontSize="2xs">Original</Badge>
                      ) : (
                        <Badge colorScheme="red" fontSize="2xs">
                          {f.is_battle_only ? 'Battle Only' : 'Special Form'}
                        </Badge>
                      )}
                      {f.types.length > 0 && (
                        <HStack spacing={1}>
                          {f.types.map((t) => (
                            <Tag key={t} size="sm" bg={`${getTypeColor(t)}40`} color={getTypeColor(t)} borderRadius="full">
                              <TagLabel fontSize="xs">{getTypeEmoji(t)} {titleCase(t)}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                      )}
                      {currentPokemonId && (
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="purple"
                          onClick={async () => {
                            const detail = await pokedexClient.pokemonByName(f.name);
                            if (detail) onPokemonSelect(detail);
                          }}
                        >
                          View Details →
                        </Button>
                      )}
                    </VStack>
                  </Box>
                ))}
              </SimpleGrid>
            </VStack>
          )}

          {!loading && !error && forms.length === 1 && forms[0].is_default && (
            <Box bg="rgba(102,126,234,0.12)" borderRadius="lg" p={4} border="1px solid" borderColor="rgba(102,126,234,0.3)">
              <Text fontSize="sm" color={SURFACE.body}>
                This Pokemon only has its original form. Try "charizard" or "mewtwo" to see
                Pokemon with multiple forms!
              </Text>
            </Box>
          )}
        </VStack>
      ),
    },
    {
      title: 'Amazing!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" textAlign="center" color={SURFACE.title}>
            ✨ You discovered Amazing Forms!
          </Text>
          <Text>
            Forms show us that the same thing can look different and have different
            powers. It's still the same Pokemon — just wearing a different costume!
          </Text>
          <Box bg={SURFACE.card} borderRadius="lg" p={4} border="1px solid" borderColor={SURFACE.border}>
            <Text fontSize="sm" color={SURFACE.body}>
              💡 In data science, we call this <strong>variation</strong> — when the
              same thing comes in different versions. Forms are a fun way to see it!
            </Text>
          </Box>
        </VStack>
      ),
    },
  ];

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1}
    />
  );
}

// ─── Visual helpers ───────────────────────────────────────────────────────

function NodeDot({
  label,
  x,
  y,
  color,
}: {
  label: string;
  x: string;
  y: string;
  color: string;
}) {
  return (
    <Box
      position="absolute"
      left={x}
      top={y}
      transform="translate(-50%, -50%)"
    >
      <VStack spacing={1}>
        <Circle size="40px" bg={`${color}40`} border="2px solid" borderColor={color}>
          <Text fontSize="xs" fontWeight="bold" color={color}>●</Text>
        </Circle>
        <Text fontSize="xs" color="white" fontWeight="semibold" textShadow="0 1px 2px rgba(0,0,0,0.5)">{label}</Text>
      </VStack>
    </Box>
  );
}

