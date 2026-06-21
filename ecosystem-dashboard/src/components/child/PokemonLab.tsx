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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Avatar,
  Tag,
  TagLabel,
  Wrap,
  WrapItem,
  IconButton,
  Collapse,
  useDisclosure,
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
import {
  pokedexClient,
  getTypeColor,
  getTypeEmoji,
  statColor,
  statLabel,
  formatHeight,
  formatWeight,
  PokemonDetail,
  PokemonSearchResult,
  TypeEffectiveness,
  GraphStats,
  EvolutionNode,
  PokemonMove,
} from '@/lib/pokedex-client';

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

// ─── Lesson definitions ───────────────────────────────────────────────────

type LessonId = 'what-is-kg' | 'nodes-edges' | 'query-pokemon' | 'type-chart' | 'stats-analytics' | 'nl-queries';

interface Lesson {
  id: LessonId;
  title: string;
  emoji: string;
  description: string;
  color: string;
}

const LESSONS: Lesson[] = [
  {
    id: 'what-is-kg',
    title: 'What is a Knowledge Graph?',
    emoji: '🕸️',
    description: 'Discover how things connect — just like a spider web of facts!',
    color: '#667eea',
  },
  {
    id: 'nodes-edges',
    title: 'Nodes & Edges',
    emoji: '🔗',
    description: 'Learn the building blocks: dots and lines that mean something.',
    color: '#f093fb',
  },
  {
    id: 'query-pokemon',
    title: 'Explore Pokemon',
    emoji: '🔍',
    description: 'Search the Pokedex and find your favorite Pokemon!',
    color: '#4facfe',
  },
  {
    id: 'type-chart',
    title: 'Type Effectiveness',
    emoji: '⚔️',
    description: 'See how types are strong or weak against each other.',
    color: '#f5576c',
  },
  {
    id: 'stats-analytics',
    title: 'Stats & Analytics',
    emoji: '📊',
    description: 'Compare Pokemon stats and learn about data analysis.',
    color: '#43e97b',
  },
  {
    id: 'nl-queries',
    title: 'Ask Questions',
    emoji: '💬',
    description: 'Turn natural language into graph queries!',
    color: '#fa709a',
  },
];

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

type View = 'home' | 'lesson' | 'explorer' | 'pokemon-detail';

export function PokemonLab() {
  const [view, setView] = useState<View>('home');
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<LessonId>>(new Set());
  const [selectedPokemon, setSelectedPokemon] = useState<PokemonDetail | null>(null);

  const progress = (completedLessons.size / LESSONS.length) * 100;

  const handleLessonClick = (lesson: Lesson) => {
    setActiveLesson(lesson.id);
    setView('lesson');
  };

  const handleLessonComplete = (id: LessonId) => {
    setCompletedLessons((prev) => new Set(prev).add(id));
    setView('home');
  };

  const handlePokemonSelect = (pokemon: PokemonDetail) => {
    setSelectedPokemon(pokemon);
    setView('pokemon-detail');
  };

  // ─── Home View ──────────────────────────────────────────────────────────

  if (view === 'home') {
    return (
      <PokemonLabHome
        lessons={LESSONS}
        completedLessons={completedLessons}
        progress={progress}
        onLessonClick={handleLessonClick}
        onExplorerOpen={() => setView('explorer')}
      />
    );
  }

  // ─── Lesson View ────────────────────────────────────────────────────────

  if (view === 'lesson' && activeLesson) {
    const lesson = LESSONS.find((l) => l.id === activeLesson)!;
    return (
      <LessonView
        lesson={lesson}
        onComplete={() => handleLessonComplete(activeLesson)}
        onBack={() => setView('home')}
        onPokemonSelect={handlePokemonSelect}
      />
    );
  }

  // ─── Explorer View ──────────────────────────────────────────────────────

  if (view === 'explorer') {
    return (
      <PokemonExplorer
        onBack={() => setView('home')}
        onPokemonSelect={handlePokemonSelect}
      />
    );
  }

  // ─── Pokemon Detail View ────────────────────────────────────────────────

  if (view === 'pokemon-detail' && selectedPokemon) {
    return (
      <PokemonDetailView
        pokemon={selectedPokemon}
        onBack={() => setView('explorer')}
      />
    );
  }

  return null;
}

// ─── Home View ────────────────────────────────────────────────────────────

function PokemonLabHome({
  lessons,
  completedLessons,
  progress,
  onLessonClick,
  onExplorerOpen,
}: {
  lessons: Lesson[];
  completedLessons: Set<LessonId>;
  progress: number;
  onLessonClick: (lesson: Lesson) => void;
  onExplorerOpen: () => void;
}) {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    pokedexClient
      .graphStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <VStack spacing={6} align="stretch" maxW="900px" mx="auto" w="full">
      {/* Hero Banner */}
      <Box
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
        borderRadius="2xl"
        p={{ base: 6, md: 8 }}
        position="relative"
        overflow="hidden"
        boxShadow="0 10px 40px rgba(102,126,234,0.3)"
      >
        <Box
          position="absolute"
          top="-20px"
          right="-20px"
          fontSize="120px"
          opacity={0.15}
          animation={`${float} 3s ease-in-out infinite`}
        >
          🔬
        </Box>
        <VStack align="start" spacing={3} position="relative">
          <HStack spacing={3}>
            <Text fontSize="3xl">🔬</Text>
            <Text fontSize="2xl" fontWeight="bold" color="white">
              Pokemon Knowledge Lab
            </Text>
          </HStack>
          <Text color="whiteAlpha.900" fontSize="md">
            Learn about knowledge graphs by exploring the world of Pokemon!
            Discover nodes, edges, queries, and data analytics in a fun way.
          </Text>
          {stats && !statsLoading && (
            <HStack spacing={4} mt={2} flexWrap="wrap">
              <StatBadge label="Pokemon" value={stats.pokemon} emoji="🔴" />
              <StatBadge label="Types" value={stats.types} emoji="⚡" />
              <StatBadge label="Moves" value={stats.moves} emoji="⚔️" />
              <StatBadge label="Abilities" value={stats.abilities} emoji="✨" />
              <StatBadge label="Nodes" value={stats.total_nodes} emoji="🕸️" />
              <StatBadge label="Edges" value={stats.total_rels} emoji="🔗" />
            </HStack>
          )}
          {statsLoading && (
            <HStack color="whiteAlpha.700" spacing={2}>
              <Spinner size="sm" />
              <Text fontSize="sm">Loading graph stats...</Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Progress Bar */}
      <Box
        bg="rgba(255,255,255,0.05)"
        borderRadius="xl"
        p={4}
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="semibold" fontSize="sm">
            🏆 Your Progress
          </Text>
          <Text fontSize="sm" color="gray.400">
            {completedLessons.size} / {lessons.length} lessons
          </Text>
        </HStack>
        <Progress
          value={progress}
          colorScheme="purple"
          borderRadius="full"
          size="md"
          bg="whiteAlpha.200"
        />
      </Box>

      {/* Lesson Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {lessons.map((lesson, idx) => {
          const isCompleted = completedLessons.has(lesson.id);
          return (
            <Box
              key={lesson.id}
              bg="rgba(255,255,255,0.05)"
              border="1px solid"
              borderColor="whiteAlpha.200"
              borderRadius="xl"
              p={5}
              cursor="pointer"
              onClick={() => onLessonClick(lesson)}
              _hover={{
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 30px ${lesson.color}40`,
                borderColor: `${lesson.color}80`,
              }}
              transition="all 0.2s ease"
              position="relative"
              overflow="hidden"
              animation={`${popIn} 0.3s ease ${idx * 0.08}s both`}
            >
              {/* Completion badge */}
              {isCompleted && (
                <Box position="absolute" top={3} right={3}>
                  <CheckCircleIcon color="green.400" boxSize={5} />
                </Box>
              )}

              {/* Lesson number circle */}
              <Circle
                size="48px"
                bg={`${lesson.color}30`}
                border="2px solid"
                borderColor={lesson.color}
                mb={3}
              >
                <Text fontSize="xl">{lesson.emoji}</Text>
              </Circle>

              <Text fontWeight="bold" fontSize="md" mb={1}>
                {lesson.title}
              </Text>
              <Text fontSize="sm" color="gray.400" noOfLines={2}>
                {lesson.description}
              </Text>

              <HStack mt={3} spacing={1} color={lesson.color}>
                <Text fontSize="xs" fontWeight="semibold">
                  {isCompleted ? 'Review' : 'Start'}
                </Text>
                <ChevronRightIcon boxSize={4} />
              </HStack>
            </Box>
          );
        })}
      </SimpleGrid>

      {/* Free Explore Button */}
      <Box
        bg="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
        borderRadius="xl"
        p={5}
        cursor="pointer"
        onClick={onExplorerOpen}
        _hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 30px rgba(79,172,254,0.4)' }}
        transition="all 0.2s ease"
      >
        <HStack spacing={4}>
          <Circle size="56px" bg="whiteAlpha.300">
            <Text fontSize="2xl">🔍</Text>
          </Circle>
          <Box>
            <Text fontWeight="bold" color="white" fontSize="lg">
              Free Explore Mode
            </Text>
            <Text color="whiteAlpha.900" fontSize="sm">
              Search the Pokedex freely and look up any Pokemon!
            </Text>
          </Box>
          <ChevronRightIcon color="white" boxSize={6} ml="auto" />
        </HStack>
      </Box>
    </VStack>
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
}: {
  lesson: Lesson;
  onComplete: () => void;
  onBack: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
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
      {lesson.id === 'what-is-kg' && <WhatIsKGLesson onComplete={onComplete} />}
      {lesson.id === 'nodes-edges' && <NodesEdgesLesson onComplete={onComplete} />}
      {lesson.id === 'query-pokemon' && <QueryPokemonLesson onComplete={onComplete} onPokemonSelect={onPokemonSelect} />}
      {lesson.id === 'type-chart' && <TypeChartLesson onComplete={onComplete} />}
      {lesson.id === 'stats-analytics' && <StatsAnalyticsLesson onComplete={onComplete} />}
      {lesson.id === 'nl-queries' && <NLQueriesLesson onComplete={onComplete} />}
    </VStack>
  );
}

// ─── Lesson: What is a Knowledge Graph? ───────────────────────────────────

function WhatIsKGLesson({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const steps = [
    {
      title: 'Imagine a Giant Web of Facts',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            A <strong>knowledge graph</strong> is like a giant spider web where each point
            holds a piece of information, and the threads connecting them show how
            things are related.
          </Text>
          <Box
            bg="rgba(102,126,234,0.1)"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="rgba(102,126,234,0.3)"
          >
            <Text fontSize="sm" color="gray.300">
              📝 In our Pokemon knowledge graph, we store facts about Pokemon, their types,
              their moves, their abilities, and how they evolve — all connected!
            </Text>
          </Box>
          {/* Visual: simple node-edge diagram */}
          <Box
            bg="rgba(0,0,0,0.3)"
            borderRadius="lg"
            p={6}
            position="relative"
            h="200px"
          >
            <NodeDot label="Pikachu" x="20%" y="50%" color="#fbbf24" />
            <NodeDot label="Electric" x="70%" y="30%" color="#facc15" />
            <NodeDot label="Thunder" x="70%" y="70%" color="#3b82f6" />
            <EdgeLine from="20%,50%" to="70%,30%" label="HAS_TYPE" />
            <EdgeLine from="20%,50%" to="70%,70%" label="CAN_LEARN" />
          </Box>
        </VStack>
      ),
    },
    {
      title: 'Why "Graph"?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            The word <strong>"graph"</strong> here doesn't mean a bar chart or pie chart.
            It comes from math — a graph is a set of points (called <strong>nodes</strong>)
            connected by lines (called <strong>edges</strong>).
          </Text>
          <Box
            bg="rgba(240,147,251,0.1)"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="rgba(240,147,251,0.3)"
          >
            <Text fontSize="sm" color="gray.300">
              🧠 Fun fact: The idea of graphs goes back to 1736 when mathematician
              Leonhard Euler solved the "Seven Bridges of Königsberg" problem!
            </Text>
          </Box>
          <Text>
            In a <strong>knowledge</strong> graph, the nodes and edges have meaning.
            A node might be "Pikachu" and an edge might be "HAS_TYPE" connecting it to "Electric."
          </Text>
        </VStack>
      ),
    },
    {
      title: 'Quiz Time!',
      content: (
        <QuizView
          questions={KG_QUIZ}
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
    const correct = quizAnswers.filter((a, i) => a === KG_QUIZ[i].answer).length;
    return (
      <LessonResult
        correct={correct}
        total={KG_QUIZ.length}
        onComplete={onComplete}
      />
    );
  }

  return (
    <LessonStepView
      step={step}
      steps={steps}
      onStepChange={setStep}
      onComplete={onComplete}
      canComplete={step === steps.length - 1 && quizAnswers.length === KG_QUIZ.length}
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
                    <Text fontSize="xs" color="gray.400">{node.example}</Text>
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
            <Text fontSize="sm" color="gray.300">
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

// ─── Lesson: Query Pokemon ────────────────────────────────────────────────

function QueryPokemonLesson({
  onComplete,
  onPokemonSelect,
}: {
  onComplete: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const [step, setStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await pokedexClient.searchPokemon(searchQuery, '', undefined, undefined, 12);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const steps = [
    {
      title: 'What is a Query?',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            A <strong>query</strong> is a question you ask a database. In a knowledge graph,
            we use query languages like <strong>Cypher</strong> (for Neo4j) or <strong>GraphQL</strong>
            to find nodes and edges.
          </Text>
          <Box
            bg="rgba(0,0,0,0.4)"
            borderRadius="lg"
            p={4}
            fontFamily="mono"
            fontSize="sm"
            color="green.300"
          >
            <Text color="gray.500" fontSize="xs" mb={2}>// Cypher query example:</Text>
            <Text>{'MATCH (p:Pokemon)'}</Text>
            <Text>{'WHERE p.name = "pikachu"'}</Text>
            <Text>{'RETURN p'}</Text>
          </Box>
          <Text>
            This says: "Find a Pokemon node where the name is 'pikachu' and return it."
            Cool, right? 🎉
          </Text>
        </VStack>
      ),
    },
    {
      title: 'Try It Yourself!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            Search for your favorite Pokemon! Try names like "pikachu", "char", or "mew".
          </Text>
          <HStack>
            <InputGroup>
              <InputLeftElement>
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search Pokemon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                bg="rgba(255,255,255,0.05)"
                borderColor="whiteAlpha.200"
              />
            </InputGroup>
            <Button colorScheme="purple" onClick={doSearch} isLoading={loading}>
              Search
            </Button>
          </HStack>

          {loading && (
            <HStack justify="center" py={8}>
              <Spinner color="purple.400" />
              <Text color="gray.400">Searching the graph...</Text>
            </HStack>
          )}

          {!loading && hasSearched && results.length === 0 && (
            <Text color="gray.400" textAlign="center" py={4}>
              No Pokemon found. Try a different search! 🔍
            </Text>
          )}

          {!loading && results.length > 0 && (
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
              {results.map((p) => (
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
                    {p.sprite_front ? (
                      <Avatar src={p.sprite_front} size="md" bg="whiteAlpha.100" />
                    ) : (
                      <Circle size="48px" bg="whiteAlpha.100">
                        <Text fontSize="xl">🔴</Text>
                      </Circle>
                    )}
                    <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">
                      {p.name}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
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
                          <TagLabel fontSize="xs">{getTypeEmoji(t)} {t}</TagLabel>
                        </Tag>
                      ))}
                    </HStack>
                  </VStack>
                </Box>
              ))}
            </SimpleGrid>
          )}

          {!hasSearched && !loading && (
            <Box
              bg="rgba(79,172,254,0.1)"
              borderRadius="lg"
              p={4}
              border="1px solid"
              borderColor="rgba(79,172,254,0.3)"
            >
              <Text fontSize="sm" color="gray.300">
                💡 Tip: The search runs a query against the knowledge graph.
                It looks through all :Pokemon nodes and finds ones whose name
                contains your search text!
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
          <Text fontSize="lg" textAlign="center">
            🎉 Awesome! You just queried a knowledge graph!
          </Text>
          <Text>
            You used a search box that sent a GraphQL query to our Pokemon graph
            service. The graph found matching nodes and returned them to you.
            That's exactly how knowledge graph applications work in the real world!
          </Text>
          <Box
            bg="rgba(67,233,123,0.1)"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="rgba(67,233,123,0.3)"
          >
            <Text fontSize="sm" color="gray.300">
              🚀 In the next lessons, you'll learn about type effectiveness,
              statistics, and natural language queries!
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

// ─── Lesson: Type Chart ───────────────────────────────────────────────────

function TypeChartLesson({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState<string>('');
  const [effectiveness, setEffectiveness] = useState<TypeEffectiveness | null>(null);
  const [loading, setLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const allTypes = useMemo(
    () => [
      'normal', 'fire', 'water', 'electric', 'grass', 'ice',
      'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
      'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
    ],
    [],
  );

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

  const quiz: QuizQuestion[] = [
    {
      question: 'What does "STRONG_AGAINST" mean in the type graph?',
      options: [
        'The type takes more damage',
        'The type deals more damage',
        'The type is immune',
        'The type has more HP',
      ],
      answer: 1,
      explanation: 'STRONG_AGAINST means the attacking type deals more damage to the defending type!',
    },
    {
      question: 'If Fire is strong against Grass, what does that mean?',
      options: [
        'Grass moves deal more to Fire',
        'Fire moves deal 2x damage to Grass',
        'Fire is immune to Grass',
        'They are equal',
      ],
      answer: 1,
      explanation: 'Fire moves deal 2x damage to Grass Pokemon — that\'s why fire is super effective against grass!',
    },
  ];

  const steps = [
    {
      title: 'Type Effectiveness Graph',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            In Pokemon, types are connected by edges like <strong>STRONG_AGAINST</strong>,
            <strong> WEAK_AGAINST</strong>, and <strong>IMMUNE_TO</strong>. This forms
            a type effectiveness graph!
          </Text>
          <Text>Click a type below to see its relationships:</Text>
          <Wrap>
            {allTypes.map((t) => (
              <WrapItem key={t}>
                <Button
                  size="sm"
                  onClick={() => fetchEffectiveness(t)}
                  bg={selectedType === t ? getTypeColor(t) : `${getTypeColor(t)}30`}
                  color={selectedType === t ? 'white' : getTypeColor(t)}
                  border="1px solid"
                  borderColor={getTypeColor(t)}
                  _hover={{ bg: getTypeColor(t), color: 'white' }}
                  borderRadius="full"
                >
                  {getTypeEmoji(t)} {t}
                </Button>
              </WrapItem>
            ))}
          </Wrap>
        </VStack>
      ),
    },
    {
      title: 'Explore the Connections',
      content: (
        <VStack spacing={4} align="stretch">
          {loading && (
            <HStack justify="center" py={8}>
              <Spinner color="purple.400" />
              <Text color="gray.400">Loading type data...</Text>
            </HStack>
          )}
          {!loading && !selectedType && (
            <Text color="gray.400" textAlign="center" py={4}>
              Go back and pick a type to explore! 🔄
            </Text>
          )}
          {!loading && effectiveness && (
            <VStack spacing={4} align="stretch">
              {/* Type header */}
              <Box
                bg={`${getTypeColor(effectiveness.type)}30`}
                borderRadius="xl"
                p={4}
                textAlign="center"
                border="2px solid"
                borderColor={getTypeColor(effectiveness.type)}
              >
                <Text fontSize="3xl">{getTypeEmoji(effectiveness.type)}</Text>
                <Text fontSize="xl" fontWeight="bold" textTransform="capitalize" color={getTypeColor(effectiveness.type)}>
                  {effectiveness.type}
                </Text>
              </Box>

              {/* Effectiveness grid */}
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                <EffectivenessBox
                  title="💪 Strong Against (2x)"
                  types={effectiveness.strong_against}
                  colorScheme="green"
                />
                <EffectivenessBox
                  title="🛡️ Weak Against (0.5x)"
                  types={effectiveness.weak_against}
                  colorScheme="orange"
                />
                <EffectivenessBox
                  title="🚫 Immune To (0x)"
                  types={effectiveness.immune_to}
                  colorScheme="gray"
                />
                <EffectivenessBox
                  title="⚠️ Vulnerable To"
                  types={effectiveness.vulnerable_to}
                  colorScheme="red"
                />
              </SimpleGrid>

              <Box
                bg="rgba(245,87,108,0.1)"
                borderRadius="lg"
                p={4}
                border="1px solid"
                borderColor="rgba(245,87,108,0.3)"
              >
                <Text fontSize="sm" color="gray.300">
                  🧠 In the knowledge graph, each of these relationships is an
                  <strong> edge</strong> from this Type node to another Type node.
                  The multiplier is a <strong>property</strong> on that edge!
                </Text>
              </Box>
            </VStack>
          )}
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

function EffectivenessBox({
  title,
  types,
  colorScheme,
}: {
  title: string;
  types: string[];
  colorScheme: string;
}) {
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
        <Text fontSize="xs" color="gray.500">None</Text>
      ) : (
        <Wrap>
          {types.map((t) => (
            <WrapItem key={t}>
              <Tag size="sm" bg={`${getTypeColor(t)}40`} color={getTypeColor(t)} borderRadius="full">
                <TagLabel fontSize="xs">{getTypeEmoji(t)} {t}</TagLabel>
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
                    <Text fontSize="xs" color="gray.400">{s.desc}</Text>
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
                <SearchIcon color="gray.400" />
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
              <Text color="gray.400">Fetching stats...</Text>
            </HStack>
          )}

          {error && !loading && (
            <Text color="red.400" fontSize="sm">{error}</Text>
          )}

          {pokemon && !loading && (
            <VStack spacing={4} align="stretch">
              {/* Pokemon header */}
              <HStack spacing={4}>
                {pokemon.official_artwork || pokemon.sprite_front ? (
                  <Avatar
                    src={pokemon.official_artwork || pokemon.sprite_front}
                    size="lg"
                    bg="whiteAlpha.100"
                  />
                ) : (
                  <Circle size="64px" bg="whiteAlpha.100">
                    <Text fontSize="2xl">🔴</Text>
                  </Circle>
                )}
                <Box>
                  <Text fontSize="xl" fontWeight="bold" textTransform="capitalize">
                    {pokemon.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    Pokedex #{pokemon.pokedex_number}
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
                        <TagLabel fontSize="xs">{getTypeEmoji(t)} {t}</TagLabel>
                      </Tag>
                    ))}
                  </HStack>
                </Box>
              </HStack>

              {/* Stat bars */}
              <Box bg="rgba(0,0,0,0.3)" borderRadius="lg" p={4}>
                <Text fontWeight="semibold" fontSize="sm" mb={3}>
                  📊 Base Stats
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
                <InfoCard label="Height" value={formatHeight(pokemon.height)} />
                <InfoCard label="Weight" value={formatWeight(pokemon.weight)} />
                <InfoCard label="Base XP" value={pokemon.base_experience.toString()} />
              </SimpleGrid>

              {pokemon.species && (
                <Box
                  bg="rgba(102,126,234,0.1)"
                  borderRadius="lg"
                  p={3}
                  border="1px solid"
                  borderColor="rgba(102,126,234,0.3)"
                >
                  <Text fontSize="sm" color="gray.300">
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
            <Text fontSize="sm" color="gray.300">
              💡 In the knowledge graph, each stat is stored as an edge
              (HAS_STAT) with a property (base_value) connecting a Pokemon to a Stat node.
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Box
      bg="rgba(255,255,255,0.05)"
      borderRadius="lg"
      p={3}
      textAlign="center"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <Text fontSize="xs" color="gray.400">{label}</Text>
      <Text fontSize="sm" fontWeight="bold">{value}</Text>
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
          <Text fontSize="sm" color="gray.400">
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
        <Text fontSize="sm" color="gray.300">
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
  if (value === null || value === undefined) {
    return <Text fontSize="xs" color="gray.500">null</Text>;
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
      return <Text fontSize="xs" color="gray.500">No results</Text>;
    }
    return (
      <VStack spacing={1} align="stretch">
        {value.slice(0, 12).map((item, i) => (
          <Box key={i} bg="rgba(0,0,0,0.2)" borderRadius="sm" p={2}>
            <NLResultRenderer value={item} />
          </Box>
        ))}
        {value.length > 12 && (
          <Text fontSize="xs" color="gray.500">... and {value.length - 12} more</Text>
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

  return <Text fontSize="xs" color="gray.500">{String(value)}</Text>;
}

function NLQueriesLesson({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const examples = [
    { nl: 'Show me all Fire type Pokemon', gql: 'pokemonByType(typeName: "fire")', emoji: '🔥' },
    { nl: 'Find Pokemon #25', gql: 'pokemonByDex(dex: 25)', emoji: '🔴' },
    { nl: 'What is Pikachu\'s type?', gql: 'pokemonByName(name: "pikachu") { types }', emoji: '⚡' },
    { nl: 'Show me Electric type effectiveness', gql: 'typeEffectiveness(typeName: "electric")', emoji: '⚡' },
  ];

  const steps = [
    {
      title: 'From Words to Queries',
      content: (
        <VStack spacing={4} align="stretch">
          <Text>
            What if you could just <em>ask</em> a question in plain English and the
            computer turns it into a graph query? That's called
            <strong> Natural Language Querying</strong>!
          </Text>
          <Text>Here's how it works:</Text>
          <VStack spacing={3} align="stretch">
            {[
              { num: 1, text: 'You ask a question in words', emoji: '💬' },
              { num: 2, text: 'AI understands your question', emoji: '🤖' },
              { num: 3, text: 'AI turns it into a graph query', emoji: '🔄' },
              { num: 4, text: 'The graph returns the answer', emoji: '✅' },
            ].map((s) => (
              <Box
                key={s.num}
                bg="rgba(255,255,255,0.05)"
                borderRadius="lg"
                p={3}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                <HStack spacing={3}>
                  <Circle size="32px" bg="purple.500">
                    <Text color="white" fontWeight="bold" fontSize="sm">{s.num}</Text>
                  </Circle>
                  <Text fontSize="sm">{s.emoji} {s.text}</Text>
                </HStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      ),
    },
    {
      title: 'Try It Live!',
      content: (
        <NLQueryPlayground examples={examples} />
      ),
    },
    {
      title: 'You\'re a Knowledge Graph Expert!',
      content: (
        <VStack spacing={4} align="stretch">
          <Text fontSize="xl" textAlign="center">
            🏆 Congratulations!
          </Text>
          <Text>
            You've learned about knowledge graphs, nodes, edges, queries, type
            effectiveness, data analytics, and natural language querying —
            all through Pokemon!
          </Text>
          <Box
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            borderRadius="xl"
            p={5}
            textAlign="center"
          >
            <Text fontSize="3xl">🎓</Text>
            <Text fontWeight="bold" color="white" mt={2}>
              Knowledge Graph Explorer
            </Text>
            <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
              You can now explore the Pokedex freely and keep learning!
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
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <VStack spacing={6} align="stretch">
      {/* Step indicator */}
      <HStack spacing={2}>
        {steps.map((_, i) => (
          <Box
            key={i}
            h="4px"
            flex={1}
            borderRadius="full"
            bg={i <= step ? 'purple.400' : 'whiteAlpha.200'}
            transition="all 0.3s ease"
          />
        ))}
      </HStack>

      {/* Step content */}
      <Box
        bg="rgba(255,255,255,0.03)"
        borderRadius="xl"
        p={{ base: 4, md: 6 }}
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <Text fontSize="lg" fontWeight="bold" mb={4}>
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
          let bg = 'rgba(255,255,255,0.05)';
          let border = 'whiteAlpha.200';

          if (showFeedback) {
            if (isAnswer) {
              bg = 'rgba(67,233,123,0.2)';
              border = 'green.400';
            } else if (isSelected) {
              bg = 'rgba(245,87,108,0.2)';
              border = 'red.400';
            }
          } else if (isSelected) {
            bg = 'rgba(102,126,234,0.2)';
            border = 'purple.400';
          }

          return (
            <Box
              key={idx}
              bg={bg}
              border="2px solid"
              borderColor={border}
              borderRadius="lg"
              p={3}
              cursor={showFeedback ? 'default' : 'pointer'}
              onClick={() => handleSelect(idx)}
              _hover={!showFeedback ? { bg: 'rgba(102,126,234,0.15)' } : {}}
              transition="all 0.15s ease"
            >
              <HStack spacing={3}>
                <Circle
                  size="24px"
                  bg={isSelected ? 'purple.500' : 'whiteAlpha.200'}
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {String.fromCharCode(65 + idx)}
                </Circle>
                <Text fontSize="sm">{opt}</Text>
                {showFeedback && isAnswer && (
                  <CheckCircleIcon color="green.400" ml="auto" />
                )}
              </HStack>
            </Box>
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
          <Text fontSize="sm" color="gray.300">
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
  const percentage = Math.round((correct / total) * 100);
  const isPerfect = correct === total;

  return (
    <VStack spacing={6} align="stretch">
      <Box
        bg={isPerfect ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}
        borderRadius="xl"
        p={8}
        textAlign="center"
      >
        <Text fontSize="4xl">{isPerfect ? '🏆' : '🎉'}</Text>
        <Text fontSize="2xl" fontWeight="bold" color="white" mt={2}>
          {isPerfect ? 'Perfect Score!' : 'Great Job!'}
        </Text>
        <Text color="whiteAlpha.900" fontSize="lg" mt={1}>
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

// ─── Pokemon Explorer (Free Explore Mode) ─────────────────────────────────

function PokemonExplorer({
  onBack,
  onPokemonSelect,
}: {
  onBack: () => void;
  onPokemonSelect: (pokemon: PokemonDetail) => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [results, setResults] = useState<PokemonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allTypes, setAllTypes] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    pokedexClient.allTypes().then(setAllTypes).catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await pokedexClient.searchPokemon(query, typeFilter, undefined, undefined, 24);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    doSearch();
  }, [typeFilter]);

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

      {/* Search bar */}
      <HStack>
        <InputGroup>
          <InputLeftElement>
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search by name..."
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
      </HStack>

      {/* Type filter chips */}
      <Wrap>
        <WrapItem>
          <Button
            size="xs"
            onClick={() => setTypeFilter('')}
            bg={typeFilter === '' ? 'purple.500' : 'whiteAlpha.100'}
            color={typeFilter === '' ? 'white' : 'gray.300'}
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

      {/* Results */}
      {loading && (
        <HStack justify="center" py={8}>
          <Spinner color="purple.400" />
          <Text color="gray.400">Searching...</Text>
        </HStack>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <Text color="gray.400" textAlign="center" py={8}>
          No Pokemon found. Try a different search! 🔍
        </Text>
      )}

      {!loading && results.length > 0 && (
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3}>
          {results.map((p) => (
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
                {p.sprite_front ? (
                  <Avatar src={p.sprite_front} size="md" bg="whiteAlpha.100" />
                ) : (
                  <Circle size="48px" bg="whiteAlpha.100">
                    <Text fontSize="xl">🔴</Text>
                  </Circle>
                )}
                <Text fontWeight="semibold" fontSize="sm" textTransform="capitalize">
                  {p.name}
                </Text>
                <Text fontSize="xs" color="gray.400">
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
                      <TagLabel fontSize="xs">{getTypeEmoji(t)} {t}</TagLabel>
                    </Tag>
                  ))}
                </HStack>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      )}
    </VStack>
  );
}

// ─── Pokemon Detail View ──────────────────────────────────────────────────

function PokemonDetailView({
  pokemon,
  onBack,
}: {
  pokemon: PokemonDetail;
  onBack: () => void;
}) {
  const [moves, setMoves] = useState<PokemonMove[]>([]);
  const [evolution, setEvolution] = useState<EvolutionNode[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const { isOpen: showMoves, onToggle: toggleMoves } = useDisclosure();
  const { isOpen: showEvolution, onToggle: toggleEvolution } = useDisclosure();

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
      <Button leftIcon={<ChevronLeftIcon />} variant="ghost" size="sm" onClick={onBack}>
        Back to Explorer
      </Button>

      {/* Pokemon header */}
      <Box
        bg="linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)"
        borderRadius="xl"
        p={5}
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <HStack spacing={4} align="start">
          {pokemon.official_artwork || pokemon.sprite_front ? (
            <Avatar
              src={pokemon.official_artwork || pokemon.sprite_front}
              size="xl"
              bg="whiteAlpha.100"
            />
          ) : (
            <Circle size="96px" bg="whiteAlpha.100">
              <Text fontSize="4xl">🔴</Text>
            </Circle>
          )}
          <Box flex={1}>
            <Text fontSize="2xl" fontWeight="bold" textTransform="capitalize">
              {pokemon.name}
            </Text>
            <Text fontSize="sm" color="gray.400">
              Pokedex #{pokemon.pokedex_number}
            </Text>
            <HStack spacing={1} mt={2}>
              {pokemon.types.map((t) => (
                <Tag
                  key={t}
                  size="md"
                  bg={`${getTypeColor(t)}40`}
                  color={getTypeColor(t)}
                  borderRadius="full"
                >
                  <TagLabel>{getTypeEmoji(t)} {t}</TagLabel>
                </Tag>
              ))}
            </HStack>
            {pokemon.species && (
              <Text fontSize="xs" color="gray.400" mt={2}>
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
        <Text fontWeight="semibold" fontSize="sm" mb={3}>📊 Base Stats</Text>
        <VStack spacing={2} align="stretch">
          {pokemon.stats.map((s) => (
            <Box key={s.stat}>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="xs" fontWeight="semibold">{statLabel(s.stat)}</Text>
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

      {/* Info grid */}
      <SimpleGrid columns={3} spacing={3}>
        <InfoCard label="Height" value={formatHeight(pokemon.height)} />
        <InfoCard label="Weight" value={formatWeight(pokemon.weight)} />
        <InfoCard label="Base XP" value={pokemon.base_experience.toString()} />
      </SimpleGrid>

      {/* Abilities */}
      {pokemon.abilities.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Text fontWeight="semibold" fontSize="sm" mb={2}>✨ Abilities</Text>
          <HStack spacing={2} flexWrap="wrap">
            {pokemon.abilities.map((a) => (
              <Tag
                key={a.id}
                size="md"
                bg="purple.500"
                color="white"
                borderRadius="full"
              >
                <TagLabel>{a.name}{a.is_hidden ? ' (hidden)' : ''}</TagLabel>
              </Tag>
            ))}
          </HStack>
        </Box>
      )}

      {/* Evolution chain */}
      {evolution.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Button variant="ghost" size="sm" onClick={toggleEvolution} rightIcon={showEvolution ? <ChevronLeftIcon transform="rotate(-90deg)" /> : <ChevronRightIcon />}>
            🧬 Evolution Chain ({evolution.length})
          </Button>
          <Collapse in={showEvolution}>
            <HStack spacing={2} mt={3} flexWrap="wrap" justify="center">
              {evolution.map((e, i) => (
                <React.Fragment key={e.species_id}>
                  {i > 0 && (
                    <VStack spacing={0}>
                      <Text fontSize="xs" color="purple.300">→</Text>
                      {e.evolve_trigger && (
                        <Text fontSize="2xs" color="gray.500">{e.evolve_trigger}</Text>
                      )}
                    </VStack>
                  )}
                  <VStack spacing={1}>
                    {e.sprite_front ? (
                      <Avatar src={e.sprite_front} size="sm" bg="whiteAlpha.100" />
                    ) : (
                      <Circle size="32px" bg="whiteAlpha.100">
                        <Text>🔴</Text>
                      </Circle>
                    )}
                    <Text fontSize="xs" textTransform="capitalize">{e.species_name}</Text>
                  </VStack>
                </React.Fragment>
              ))}
            </HStack>
          </Collapse>
        </Box>
      )}

      {/* Moves */}
      {moves.length > 0 && (
        <Box bg="rgba(255,255,255,0.05)" borderRadius="lg" p={4} border="1px solid" borderColor="whiteAlpha.200">
          <Button variant="ghost" size="sm" onClick={toggleMoves} rightIcon={showMoves ? <ChevronLeftIcon transform="rotate(-90deg)" /> : <ChevronRightIcon />}>
            ⚔️ Moves ({moves.length})
          </Button>
          <Collapse in={showMoves}>
            <VStack spacing={2} align="stretch" mt={3} maxH="300px" overflowY="auto">
              {moves.slice(0, 30).map((m) => (
                <HStack
                  key={m.id}
                  bg="rgba(0,0,0,0.2)"
                  borderRadius="md"
                  p={2}
                  spacing={3}
                >
                  <Tag size="sm" bg={`${getTypeColor(m.type)}40`} color={getTypeColor(m.type)} borderRadius="full">
                    <TagLabel fontSize="xs">{getTypeEmoji(m.type)} {m.type}</TagLabel>
                  </Tag>
                  <Text fontSize="sm" fontWeight="semibold" textTransform="capitalize">{m.name}</Text>
                  {m.power && <Text fontSize="xs" color="gray.400">PWR: {m.power}</Text>}
                  {m.level && <Text fontSize="xs" color="gray.400">Lv: {m.level}</Text>}
                  <Text fontSize="xs" color="gray.500" ml="auto">{m.damage_class}</Text>
                </HStack>
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
          <Text fontSize="sm" color="gray.300">
            📖 {pokemon.species.description}
          </Text>
        </Box>
      )}

      {loadingExtra && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" color="purple.400" />
          <Text fontSize="sm" color="gray.400">Loading moves & evolutions...</Text>
        </HStack>
      )}
    </VStack>
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
        <Text fontSize="xs" color="gray.300" fontWeight="semibold">{label}</Text>
      </VStack>
    </Box>
  );
}

function EdgeLine({ from, to, label }: { from: string; to: string; label: string }) {
  return (
    <Box
      position="absolute"
      left="50%"
      top="50%"
      transform="translate(-50%, -50%)"
    >
      <Text fontSize="2xs" color="purple.300" fontWeight="semibold" opacity={0.6}>
        ─── {label} ───
      </Text>
    </Box>
  );
}
