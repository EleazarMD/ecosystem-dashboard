/**
 * Child Learn Panel
 *
 * Right-panel companion for the Learn Hub, Learning Path, and Teams pages
 * (all share the `child-learn` panel context). Provides three tabs:
 * - tutor:    quick-prompt ideas + how to ask the companion for help
 * - progress: encouragement + what "progress" means in the learn flow
 * - path:     an explanation of the personalized learning path
 *
 * This panel is intentionally static/informational and has NO desktop
 * dependencies (no agent WebSocket, no AI Gateway client). It exists so the
 * `child-learn` context resolves to a child-safe panel instead of falling back
 * to the desktop `agent-notifications` panel (which opens ws://localhost:8888).
 */

import React, { useState, useEffect } from 'react';
import { Box, VStack, HStack, Text, Badge, Divider, Wrap, WrapItem, Spinner, Center } from '@chakra-ui/react';
import { ChildTutorTab } from './ChildTutorTab';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';
import { useChildTheme } from './ChildThemeProvider';
import { StreakFlame, DailyGoalRing, MasteryBar, LevelChip } from './learning-kit';

interface ChildLearnPanelProps {
  activeTab: string;
}

const TUTOR_QUICK_PROMPTS = [
  'Explain this step in a simpler way',
  'Give me a hint, not the answer',
  'Check my thinking on this',
  'Why is this the right answer?',
];

const PROGRESS_TIPS = [
  { emoji: '🎯', label: 'One step at a time', note: 'Finish today\'s plan one activity at a time.' },
  { emoji: '🔁', label: 'Try, try again', note: 'Mistakes help your brain grow stronger.' },
  { emoji: '⭐', label: 'Celebrate wins', note: 'Every finished activity is a real win.' },
];

const PATH_STAGES = [
  { emoji: '🌱', label: 'Warm up', note: 'Quick review of what you already know.' },
  { emoji: '📚', label: 'Learn something new', note: 'A short, focused new skill.' },
  { emoji: '🧩', label: 'Practice', note: 'Try it yourself with friendly hints.' },
  { emoji: '🪞', label: 'Reflect', note: 'Think about what you learned today.' },
];

interface ChildStats {
  focusSkills: Array<{ name: string; mastery: number }>;
  streak: { days: number };
  level: { level: number; xp: number; xpToNext: number };
  dailyGoal: { completed: number; target: number };
}

const DEFAULT_STATS: ChildStats = {
  focusSkills: [],
  streak: { days: 0 },
  level: { level: 1, xp: 0, xpToNext: 150 },
  dailyGoal: { completed: 0, target: 3 },
};

export default function ChildLearnPanel({ activeTab }: ChildLearnPanelProps) {
  const { colors } = useChildTheme();
  const [stats, setStats] = useState<ChildStats>(DEFAULT_STATS);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'progress' && activeTab !== 'path') return;
    let cancelled = false;
    setStatsLoading(true);
    fetch('/api/child/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setStats({
            focusSkills: data.focusSkills || [],
            streak: data.streak || { days: 0 },
            level: data.level || { level: 1, xp: 0, xpToNext: 150 },
            dailyGoal: data.dailyGoal || { completed: 0, target: 3 },
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  return (
    <Box h="full" display="flex" flexDirection="column">
      {activeTab === 'chat' && (
        <ChildTutorTab
          defaultActivityId={KNOWN_ACTIVITY_IDS.LEARN_HUB}
          defaultTitle="Learning Buddy"
        />
      )}

      {activeTab === 'progress' && (
        <VStack spacing={4} align="stretch" p={4} overflowY="auto">
          {/* Gamification header */}
          <HStack justify="space-between" px={1}>
            <HStack spacing={2}>
              <StreakFlame days={stats.streak.days} size="sm" />
              <LevelChip level={stats.level.level} xp={stats.level.xp} xpToNext={stats.level.xpToNext} />
            </HStack>
            <DailyGoalRing value={stats.dailyGoal.completed} goal={stats.dailyGoal.target} size={56} label="Today" />
          </HStack>

          <Divider />

          {/* Focus skills mastery */}
          <Box>
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em" color={colors.textSecondary} mb={3}>
              🧭 Your Skills
            </Text>
            {statsLoading ? (
              <Center py={4}><Spinner size="sm" color={colors.primary} /></Center>
            ) : stats.focusSkills.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {stats.focusSkills.map((skill) => (
                  <MasteryBar
                    key={skill.name}
                    label={skill.name}
                    value={skill.mastery}
                    segments={5}
                  />
                ))}
              </VStack>
            ) : (
              <Text fontSize="xs" color={colors.textMuted}>
                Start an activity to see your skill progress here!
              </Text>
            )}
          </Box>

          <Divider />

          {/* Encouragement tips */}
          <VStack spacing={2.5} align="stretch">
            {PROGRESS_TIPS.map((tip) => (
              <Box key={tip.label} p={3} borderRadius="lg" bg={colors.backgroundTertiary} border="1px solid" borderColor={colors.border}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="600" color={colors.text}>
                    {tip.emoji} {tip.label}
                  </Text>
                  <Badge colorScheme="green" fontSize="2xs">Tip</Badge>
                </HStack>
                <Text fontSize="xs" color={colors.textMuted}>{tip.note}</Text>
              </Box>
            ))}
          </VStack>
        </VStack>
      )}

      {activeTab === 'path' && (
        <VStack spacing={4} align="stretch" p={4} overflowY="auto">
          <HStack spacing={3}>
            <Text fontSize="2xl">🗺️</Text>
            <Box>
              <Text fontWeight="700" fontSize="sm" color={colors.text}>My Learning Path</Text>
              <Text fontSize="xs" color={colors.textMuted}>How a learning session flows.</Text>
            </Box>
          </HStack>

          <Divider />

          <VStack spacing={2.5} align="stretch">
            {PATH_STAGES.map((stage, i) => (
              <Box key={stage.label} p={3} borderRadius="lg" bg={colors.backgroundTertiary} border="1px solid" borderColor={colors.border}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="600" color={colors.text}>
                    {stage.emoji} {stage.label}
                  </Text>
                  <Text fontSize="2xs" fontWeight="700" color={colors.primary}>{i + 1}/{PATH_STAGES.length}</Text>
                </HStack>
                <Text fontSize="xs" color={colors.textMuted}>{stage.note}</Text>
              </Box>
            ))}
          </VStack>

          <Box>
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em" color={colors.textSecondary} mb={3}>
              🧭 Focus Skills
            </Text>
            {stats.focusSkills.length > 0 ? (
              <Wrap spacing={2}>
                {stats.focusSkills.map((skill) => (
                  <WrapItem key={skill.name}>
                    <Badge colorScheme="purple">{skill.name}</Badge>
                  </WrapItem>
                ))}
              </Wrap>
            ) : (
              <Text fontSize="xs" color={colors.textMuted}>
                Your focus skills will appear here as you learn.
              </Text>
            )}
          </Box>
        </VStack>
      )}

      {activeTab !== 'chat' && activeTab !== 'progress' && activeTab !== 'path' && (
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm" fontWeight="bold">Learn Panel</Text>
          <Text fontSize="xs" color="gray.500">Choose a tab to continue.</Text>
        </VStack>
      )}
    </Box>
  );
}
