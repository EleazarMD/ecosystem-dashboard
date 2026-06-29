/**
 * SkillDashboard — Brilliant-style home dashboard for the kids learning platform.
 *
 * Layout:
 * 1. Streak Header — compact, prominent streak + time + goal ring
 * 2. Today's Mission — hero card with the recommended next learning activity
 * 3. Active Courses — grid of course cards with mastery progress bars
 * 4. Daily Challenge — quick interactive challenge card
 * 5. Explore More — activity tiles grid for all other surfaces
 *
 * All sections are theme-aware via useChildTheme() and adapt to
 * Minecraft / Pusheen / Pokémon / default skins.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  SimpleGrid,
  Heading,
  Button,
  Icon,
  Badge,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Tooltip,
  Skeleton,
  Circle,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  ClockIcon,
  ArrowRightIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useChildTheme } from './ChildThemeProvider';
import { StreakFlame, DailyGoalRing, LevelChip, MasteryBar } from './learning-kit';
import { ActivityTile } from './premium';
import { activityRegistry, KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CourseCardData {
  id: string;
  label: string;
  emoji: string;
  color: string;
  path: string;
  description: string;
  progress: number;
  lessonCount?: string;
  badge?: string;
}

interface MissionData {
  title: string;
  description: string;
  emoji: string;
  color: string;
  path: string;
  progress: number;
  skillCode?: string;
}

interface SkillDashboardProps {
  childName: string;
  streakDays: number;
  remainingMinutes: number;
  dailyLimitMinutes: number;
  todayUsageMinutes: number;
  todayActivities: number;
  dailyGoal: number;
  level: number;
  xp: number;
  xpToNext: number;
  pcgStats: {
    totalArtworks: number;
    wordsLearned: number;
    pagesCreated: number;
    booksRead: number;
    journalEntries: number;
    tasksCompleted: number;
    currentStreak: number;
  };
  loading: boolean;
  isTimeUp: boolean;
  onNavigate: (path: string) => void;
}

// ─── Helper: derive active courses from registry + PCG stats ─────────────────

function deriveActiveCourses(pcgStats: SkillDashboardProps['pcgStats']): CourseCardData[] {
  const courses: CourseCardData[] = [
    {
      id: 'pokemon-lab',
      label: 'Pokemon Lab',
      emoji: '⚡',
      color: '#3b7dd8',
      path: '/child/pokemon-lab',
      description: 'Learn with Pokemon',
      progress: 35,
      lessonCount: '12 lessons',
      badge: 'HOT',
    },
    {
      id: 'learn',
      label: 'Learn Hub',
      emoji: '🧠',
      color: '#43e97b',
      path: '/child/learn',
      description: "Today's plan",
      progress: Math.min(100, (pcgStats.tasksCompleted / 5) * 100),
    },
    {
      id: 'learning-path',
      label: 'My Path',
      emoji: '🗺️',
      color: '#fa709a',
      path: '/child/learning-path',
      description: 'Learning adventure',
      progress: Math.min(100, (pcgStats.wordsLearned / 20) * 100),
    },
    {
      id: 'art-studio',
      label: 'Art Studio',
      emoji: '🎨',
      color: '#f5576c',
      path: '/child/art-studio',
      description: 'Create pictures',
      progress: Math.min(100, (pcgStats.totalArtworks / 10) * 100),
    },
    {
      id: 'workspace',
      label: 'Writing',
      emoji: '✏️',
      color: '#4facfe',
      path: '/child/workspace',
      description: 'Write stories',
      progress: Math.min(100, (pcgStats.pagesCreated / 5) * 100),
    },
    {
      id: 'books',
      label: 'Books',
      emoji: '📚',
      color: '#a78bfa',
      path: '/child/book-explorer',
      description: 'Read stories',
      progress: Math.min(100, (pcgStats.booksRead / 3) * 100),
    },
  ];

  return courses;
}

// ─── Helper: derive today's mission ──────────────────────────────────────────

function deriveMission(
  pcgStats: SkillDashboardProps['pcgStats'],
  todayActivities: number,
): MissionData {
  if (todayActivities === 0) {
    return {
      title: 'Start Your First Lesson!',
      description: 'Try the Pokemon Lab to learn about graphs and data with Pikachu!',
      emoji: '⚡',
      color: '#3b7dd8',
      path: '/child/pokemon-lab',
      progress: 0,
    };
  }

  if (pcgStats.totalArtworks === 0) {
    return {
      title: 'Create Your First Artwork!',
      description: 'Head to the Art Studio and make something amazing!',
      emoji: '🎨',
      color: '#f5576c',
      path: '/child/art-studio',
      progress: 20,
    };
  }

  if (pcgStats.pagesCreated === 0) {
    return {
      title: 'Write a Story!',
      description: 'Use the Writing Studio to create your own adventure.',
      emoji: '✏️',
      color: '#4facfe',
      path: '/child/workspace',
      progress: 40,
    };
  }

  return {
    title: 'Keep Your Streak Going!',
    description: `You've done ${todayActivities} activities today. Complete one more to reach your goal!`,
    emoji: '🔥',
    color: '#f6ad55',
    path: '/child/learn',
    progress: Math.min(90, (todayActivities / 3) * 100),
  };
}

// ─── Streak Header ───────────────────────────────────────────────────────────

function StreakHeader({
  streakDays,
  remainingMinutes,
  todayActivities,
  dailyGoal,
  level,
  xp,
  xpToNext,
}: {
  streakDays: number;
  remainingMinutes: number;
  todayActivities: number;
  dailyGoal: number;
  level: number;
  xp: number;
  xpToNext: number;
}) {
  const { colors } = useChildTheme();

  return (
    <HStack
      justify="space-between"
      align="center"
      w="full"
      px={4}
      py={3}
      bg={colors.backgroundSecondary}
      borderRadius="2xl"
      boxShadow="sm"
      border="1px solid"
      borderColor={`${colors.primary}40`}
    >
      <HStack spacing={4}>
        <StreakFlame days={streakDays} size="sm" />
        <VStack spacing={0} align="start">
          <Text fontSize="xs" color={colors.textMuted} fontWeight="600">
            Level
          </Text>
          <LevelChip level={level} xp={xp} xpToNext={xpToNext} />
        </VStack>
      </HStack>

      <HStack spacing={4}>
        <HStack spacing={1}>
          <Icon as={ClockIcon} color={remainingMinutes < 15 ? 'red.400' : colors.primary} boxSize={4} />
          <Text fontSize="sm" fontWeight="700" color={remainingMinutes < 15 ? 'red.400' : colors.text}>
            {remainingMinutes}m
          </Text>
          <Text fontSize="2xs" color={colors.textMuted}>left</Text>
        </HStack>

        <Divider orientation="vertical" h="32px" />

        <DailyGoalRing
          value={todayActivities}
          goal={dailyGoal}
          size={48}
          label="Today"
        />
      </HStack>
    </HStack>
  );
}

// ─── Mission Card (hero) ─────────────────────────────────────────────────────

function MissionCard({ mission, onNavigate }: { mission: MissionData; onNavigate: (path: string) => void }) {
  const { colors } = useChildTheme();

  return (
    <Box
      as="button"
      onClick={() => onNavigate(mission.path)}
      w="full"
      textAlign="left"
      position="relative"
      borderRadius="2xl"
      overflow="hidden"
      p={6}
      bg={`linear-gradient(135deg, ${mission.color}30 0%, ${mission.color}12 100%)`}
      border="2px solid"
      borderColor={`${mission.color}60`}
      transition="all 0.3s"
      _hover={{
        transform: 'translateY(-3px)',
        boxShadow: `0 8px 30px ${mission.color}25`,
        borderColor: mission.color,
      }}
    >
      <HStack spacing={4} align="start">
        <Circle
          size="56px"
          bg={`${mission.color}20`}
          flexShrink={0}
        >
          <Text fontSize="2xl">{mission.emoji}</Text>
        </Circle>

        <VStack align="start" spacing={2} flex={1}>
          <HStack spacing={2}>
            <Badge colorScheme="purple" fontSize="2xs" borderRadius="full" px={2}>
              🎯 Today's Mission
            </Badge>
          </HStack>
          <Text fontWeight="800" fontSize="lg" color={colors.text} letterSpacing="-0.01em">
            {mission.title}
          </Text>
          <Text fontSize="sm" color={colors.textSecondary} noOfLines={2}>
            {mission.description}
          </Text>

          <Box w="full" mt={2}>
            <MasteryBar
              value={mission.progress}
              segments={5}
              showPercent={false}
              size="sm"
            />
          </Box>

          <HStack justify="space-between" w="full" mt={1}>
            <Text fontSize="xs" color={colors.textMuted} fontWeight="600">
              {mission.progress > 0 ? `${Math.round(mission.progress)}% complete` : 'Not started yet!'}
            </Text>
            <HStack spacing={1}>
              <Text fontSize="sm" fontWeight="700" color={mission.color}>
                Start
              </Text>
              <Icon as={ArrowRightIcon} color={mission.color} boxSize={4} />
            </HStack>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}

// ─── Course Card ─────────────────────────────────────────────────────────────

function CourseCard({ course, onNavigate }: { course: CourseCardData; onNavigate: (path: string) => void }) {
  const { colors } = useChildTheme();
  const isComplete = course.progress >= 100;

  return (
    <Box
      as="button"
      onClick={() => onNavigate(course.path)}
      w="full"
      textAlign="center"
      borderRadius="xl"
      p={4}
      bg={colors.backgroundSecondary}
      border="2px solid"
      borderColor={isComplete ? `${course.color}60` : `${colors.border}40`}
      transition="all 0.25s"
      position="relative"
      overflow="hidden"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: `0 6px 20px ${course.color}20`,
        borderColor: course.color,
      }}
    >
      {course.badge && (
        <Box
          position="absolute"
          top={2}
          right={2}
          bg={`${course.color}20`}
          color={course.color}
          fontSize="2xs"
          fontWeight="bold"
          borderRadius="full"
          px={2}
          py={0.5}
        >
          {course.badge}
        </Box>
      )}

      <VStack align="center" spacing={2}>
        <Box
          w="48px"
          h="48px"
          borderRadius="xl"
          bg={`${course.color}15`}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize="xl">{course.emoji}</Text>
        </Box>

        <Text fontWeight="700" fontSize="sm" color={colors.text} noOfLines={1} letterSpacing="-0.01em">
          {course.label}
        </Text>
        <Text fontSize="xs" color={colors.textMuted} noOfLines={1}>
          {course.description}
        </Text>

        <Box w="full" mt={1}>
          <MasteryBar
            value={course.progress}
            segments={4}
            showPercent={false}
            size="sm"
          />
        </Box>

        <HStack justify="center" w="full" spacing={2}>
          <Text fontSize="2xs" color={isComplete ? course.color : colors.textMuted} fontWeight="600">
            {isComplete ? '✓ Complete!' : `${Math.round(course.progress)}%`}
          </Text>
          {course.lessonCount && (
            <Text fontSize="2xs" color={colors.textMuted}>
              · {course.lessonCount}
            </Text>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}

// ─── Daily Challenge Card ────────────────────────────────────────────────────

function DailyChallengeCard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { colors } = useChildTheme();
  const challengeEmoji = useMemo(() => {
    const challenges = ['🧮', '📖', '🎨', '⚡', '🧠'];
    return challenges[new Date().getDay() % challenges.length];
  }, []);

  const challengeText = useMemo(() => {
    const challenges = [
      'Solve a quick math puzzle!',
      'Read a short story!',
      'Draw something from nature!',
      'Learn a new Pokemon fact!',
      'Complete a brain teaser!',
    ];
    return challenges[new Date().getDay() % challenges.length];
  }, []);

  return (
    <Box
      as="button"
      onClick={() => onNavigate('/child/learn')}
      w="full"
      textAlign="left"
      borderRadius="2xl"
      p={5}
      bg={`linear-gradient(135deg, ${colors.accent}30 0%, ${colors.primary}15 100%)`}
      border="2px solid"
      borderColor={`${colors.accent}50`}
      transition="all 0.3s"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: `0 6px 20px ${colors.accent}20`,
        borderColor: colors.accent,
      }}
    >
      <HStack spacing={4}>
        <Circle size="48px" bg={`${colors.accent}20`} flexShrink={0}>
          <Text fontSize="xl">{challengeEmoji}</Text>
        </Circle>
        <VStack align="start" spacing={1} flex={1}>
          <HStack spacing={2}>
            <Icon as={BoltIcon} color={colors.accent} boxSize={4} />
            <Text fontWeight="700" fontSize="sm" color={colors.text}>
              Daily Challenge
            </Text>
          </HStack>
          <Text fontSize="xs" color={colors.textSecondary}>
            {challengeText}
          </Text>
        </VStack>
        <Icon as={ArrowRightIcon} color={colors.accent} boxSize={5} />
      </HStack>
    </Box>
  );
}

// ─── Explore More tiles ──────────────────────────────────────────────────────

function ExploreMoreSection({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { colors } = useChildTheme();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const columns = useBreakpointValue({ base: 2, sm: 3, md: 4, lg: 5 });

  const exploreItems = [
    { id: 'chat', label: 'Chat', emoji: '💬', color: '#667eea', path: '/child/chat', description: 'Talk with AI' },
    { id: 'journal', label: 'Journal', emoji: '📝', color: '#34d399', path: '/child/journal', description: 'Daily diary' },
    { id: 'dictionary', label: 'Dictionary', emoji: '📖', color: '#f59e0b', path: '/child/dictionary', description: 'Learn words' },
    { id: 'email', label: 'Email Helper', emoji: '✉️', color: '#38ef7d', path: '/child/email', description: 'Write emails' },
    { id: 'planner', label: 'My Planner', emoji: '📅', color: '#9f7aea', path: '/child/planner', description: 'Plan homework' },
    { id: 'teams', label: 'My Teams', emoji: '👥', color: '#30cfd0', path: '/child/teams', description: 'Learn together' },
  ];

  return (
    <Box>
      <HStack spacing={2} mb={3}>
        <Text fontSize="md">🚀</Text>
        <Text fontWeight="700" fontSize="sm" color={colors.text} letterSpacing="-0.01em">
          Explore More
        </Text>
        <Box flex={1} h="2px" bgGradient={`linear(to right, ${colors.border}, transparent)`} borderRadius="full" />
      </HStack>
      <SimpleGrid columns={columns} spacing={{ base: 3, md: 3 }}>
        {exploreItems.map((item, idx) => (
          <ActivityTile
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            description={item.description}
            color={item.color}
            onClick={() => onNavigate(item.path)}
            delay={idx * 60}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}

// ─── Main SkillDashboard component ───────────────────────────────────────────

export function SkillDashboard({
  childName,
  streakDays,
  remainingMinutes,
  dailyLimitMinutes,
  todayUsageMinutes,
  todayActivities,
  dailyGoal,
  level,
  xp,
  xpToNext,
  pcgStats,
  loading,
  isTimeUp,
  onNavigate,
}: SkillDashboardProps) {
  const { colors } = useChildTheme();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const courseColumns = useBreakpointValue({ base: 2, sm: 3, md: 4, lg: 6 });

  const mission = useMemo(() => deriveMission(pcgStats, todayActivities), [pcgStats, todayActivities]);
  const courses = useMemo(() => deriveActiveCourses(pcgStats), [pcgStats]);

  if (isTimeUp) {
    return (
      <Box
        bg={`linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`}
        borderRadius="2xl"
        p={8}
        color="white"
        textAlign="center"
      >
        <Text fontSize="5xl" mb={3}>😴</Text>
        <Heading size="md" mb={2}>Time's up for today!</Heading>
        <Text opacity={0.9}>Come back tomorrow for more fun adventures!</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={{ base: 4, md: 5 }} align="stretch" w="full">
      {/* 1. Streak Header */}
      {loading ? (
        <Skeleton height="64px" borderRadius="2xl" />
      ) : (
        <StreakHeader
          streakDays={streakDays}
          remainingMinutes={remainingMinutes}
          todayActivities={todayActivities}
          dailyGoal={dailyGoal}
          level={level}
          xp={xp}
          xpToNext={xpToNext}
        />
      )}

      {/* 2. Today's Mission */}
      {loading ? (
        <Skeleton height="140px" borderRadius="2xl" />
      ) : (
        <MissionCard mission={mission} onNavigate={onNavigate} />
      )}

      {/* 3. Active Courses Grid */}
      <Box>
        <HStack spacing={2} mb={3}>
          <Text fontSize="md">📚</Text>
          <Text fontWeight="700" fontSize="sm" color={colors.text} letterSpacing="-0.01em">
            Your Courses
          </Text>
          <Box flex={1} h="2px" bgGradient={`linear(to right, ${colors.border}, transparent)`} borderRadius="full" />
          <Badge colorScheme="purple" fontSize="2xs" borderRadius="full" px={2}>
            {courses.filter(c => c.progress > 0).length} active
          </Badge>
        </HStack>
        {loading ? (
          <SimpleGrid columns={courseColumns} spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="160px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid columns={courseColumns} spacing={{ base: 3, md: 3 }}>
            {courses.map((course, idx) => (
              <CourseCard key={course.id} course={course} onNavigate={onNavigate} />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* 4. Daily Challenge */}
      {loading ? (
        <Skeleton height="80px" borderRadius="2xl" />
      ) : (
        <DailyChallengeCard onNavigate={onNavigate} />
      )}

      {/* 5. Explore More */}
      <ExploreMoreSection onNavigate={onNavigate} />
    </VStack>
  );
}

export default SkillDashboard;
