/**
 * Child Planner Right Panel
 * 
 * Kid-friendly panel with:
 * - Study Buddy AI assistant
 * - Goals & achievements tracking
 * - Planner settings
 */

import React, { useState, useEffect } from 'react';
import { ChildTutorTab } from './ChildTutorTab';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Progress,
  Badge,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Divider,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiTarget, FiCheck, FiClock, FiBell, FiFileText, FiArrowRight, FiPlus } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useStudentProgress } from '@/contexts/StudentProgressContext';
import { useChildTheme } from './ChildThemeProvider';

interface PlannerSettings {
  remindersBefore: number;
  defaultView: 'calendar' | 'list';
  showCompleted: boolean;
  dailyGoal: number;
}

interface Achievement {
  id: string;
  emoji: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-task', emoji: '🌟', title: 'First Step', description: 'Complete your first task', unlocked: false },
  { id: 'streak-3', emoji: '🔥', title: '3-Day Streak', description: 'Complete tasks 3 days in a row', unlocked: false, progress: 0, total: 3 },
  { id: 'streak-7', emoji: '⚡', title: 'Week Warrior', description: 'Complete tasks 7 days in a row', unlocked: false, progress: 0, total: 7 },
  { id: 'homework-5', emoji: '📚', title: 'Homework Hero', description: 'Complete 5 homework assignments', unlocked: false, progress: 0, total: 5 },
  { id: 'early-bird', emoji: '🐦', title: 'Early Bird', description: 'Complete a task before its due date', unlocked: false },
  { id: 'organized', emoji: '📋', title: 'Super Organized', description: 'Add 10 items to your planner', unlocked: false, progress: 0, total: 10 },
];

interface PlannerItem {
  id: string;
  type: 'homework' | 'activity' | 'reminder' | 'note' | 'goal';
  title: string;
  description?: string;
  date: string;
  priority?: 'low' | 'medium' | 'high';
  completed: boolean;
  subject?: string;
}

interface ChildPlannerPanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function ChildPlannerPanel({ activeTab }: ChildPlannerPanelProps) {
  const router = useRouter();
  const { progress } = useStudentProgress();
  const { colors } = useChildTheme();

  // Goals state
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0, streak: 0 });

  // Settings state
  const [settings, setSettings] = useState<PlannerSettings>({
    remindersBefore: 30,
    defaultView: 'calendar',
    showCompleted: true,
    dailyGoal: 3,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('childPlannerSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save settings
  const updateSettings = (key: keyof PlannerSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('childPlannerSettings', JSON.stringify(newSettings));
  };

  // Render Goals tab
  const renderGoals = () => (
    <VStack spacing={4} align="stretch" p={4} overflowY="auto">
      <HStack spacing={3}>
        <Text fontSize="2xl">🎯</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Goals & Achievements</Text>
          <Text fontSize="xs" color={colors.textMuted}>Track your progress!</Text>
        </Box>
      </HStack>

      {/* Weekly Progress */}
      <Box bg={`${colors.primary}11`} p={4} borderRadius="lg">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>This Week</Text>
          <Badge colorScheme="blue">{weeklyStats.streak} day streak 🔥</Badge>
        </HStack>
        <Progress 
          value={(weeklyStats.completed / Math.max(weeklyStats.total, 1)) * 100} 
          colorScheme="blue" 
          borderRadius="full"
          size="sm"
        />
        <Text fontSize="xs" color={colors.textMuted} mt={1.5}>
          {weeklyStats.completed} of {weeklyStats.total || settings.dailyGoal * 7} tasks completed
        </Text>
      </Box>

      {/* Daily Goal */}
      <Box bg={colors.backgroundTertiary} p={4} borderRadius="lg" border="1px solid" borderColor={colors.border}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <FiTarget />
            <Text fontWeight="600" fontSize="sm" color={colors.text}>Daily Goal</Text>
          </HStack>
          <Text fontWeight="700" color={colors.primary}>{settings.dailyGoal} tasks</Text>
        </HStack>
      </Box>

      <Divider />

      {/* Achievements */}
      <Text fontWeight="700" fontSize="sm" color={colors.text}>🏆 Achievements</Text>
      <VStack spacing={2.5} align="stretch" maxH="200px" overflowY="auto">
        {achievements.map((achievement) => (
          <HStack
            key={achievement.id}
            p={3}
            bg={achievement.unlocked ? `${colors.primary}11` : colors.backgroundTertiary}
            borderRadius="lg"
            border="1px solid"
            borderColor={colors.border}
            opacity={achievement.unlocked ? 1 : 0.6}
            spacing={3}
          >
            <Text fontSize="xl">{achievement.emoji}</Text>
            <Box flex={1}>
              <Text fontWeight="600" fontSize="xs" color={colors.text}>{achievement.title}</Text>
              <Text fontSize="2xs" color={colors.textMuted}>{achievement.description}</Text>
              {achievement.total && !achievement.unlocked && (
                <Progress 
                  value={(achievement.progress || 0) / achievement.total * 100} 
                  size="xs" 
                  colorScheme="blue"
                  mt={1}
                  borderRadius="full"
                />
              )}
            </Box>
            {achievement.unlocked && <FiCheck color={colors.primary} />}
          </HStack>
        ))}
      </VStack>
    </VStack>
  );

  // Navigate to workspace with pre-filled prompt
  const handleCreatePage = (item: PlannerItem) => {
    // Store the item info in sessionStorage for the workspace to pick up
    const pagePrompt = getPagePromptFromItem(item);
    sessionStorage.setItem('workspacePagePrompt', JSON.stringify({
      prompt: pagePrompt,
      fromPlanner: true,
      plannerItem: item,
    }));
    router.push('/child/workspace');
  };

  // Generate a page prompt based on planner item
  const getPagePromptFromItem = (item: PlannerItem): string => {
    switch (item.type) {
      case 'homework':
        return `${item.subject || 'Homework'} assignment: ${item.title}`;
      case 'activity':
        return `Activity plan for: ${item.title}`;
      case 'note':
        return `Notes about: ${item.title}`;
      default:
        return item.title;
    }
  };

  // Get suggested page type based on item
  const getSuggestedPageType = (item: PlannerItem): { emoji: string; type: string } => {
    switch (item.type) {
      case 'homework':
        return { emoji: '📝', type: 'Homework Page' };
      case 'activity':
        return { emoji: '🎯', type: 'Activity Plan' };
      case 'note':
        return { emoji: '📋', type: 'Notes Page' };
      default:
        return { emoji: '📄', type: 'New Page' };
    }
  };

  // Render Workspace Integration tab
  const renderWorkspace = () => {
    const plannerItems = progress?.plannerItems || [];
    const upcomingItems = plannerItems
      .filter(item => !item.completed)
      .slice(0, 5);

    return (
      <VStack spacing={4} align="stretch" p={4} overflowY="auto">
        <HStack spacing={3}>
          <Text fontSize="2xl">📝</Text>
          <Box>
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Workspace Integration</Text>
            <Text fontSize="xs" color={colors.textMuted}>Create pages from your tasks!</Text>
          </Box>
        </HStack>

        {/* Quick Create */}
        <Box bg={`${colors.primary}11`} p={4} borderRadius="lg">
          <HStack mb={2} spacing={2}>
            <FiPlus />
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Quick Create</Text>
          </HStack>
          <Text fontSize="xs" color={colors.textMuted} mb={3}>
            Turn your planner items into organized workspace pages!
          </Text>
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<FiFileText />}
            onClick={() => router.push('/child/workspace')}
            w="full"
            borderRadius="full"
          >
            Open Workspace
          </Button>
        </Box>

        <Divider />

        {/* Upcoming Items to Convert */}
        <Text fontWeight="700" fontSize="sm" color={colors.text}>📋 Create Pages From Tasks</Text>
        
        {upcomingItems.length === 0 ? (
          <Box textAlign="center" py={6} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
            <Text fontSize="2xl" mb={2}>✨</Text>
            <Text fontSize="sm" color={colors.textMuted}>No pending tasks!</Text>
            <Text fontSize="xs" color={colors.textMuted}>Add tasks to your planner first</Text>
          </Box>
        ) : (
          <VStack spacing={2.5} align="stretch" maxH="250px" overflowY="auto">
            {upcomingItems.map((item) => {
              const suggestion = getSuggestedPageType(item);
              return (
                <Box
                  key={item.id}
                  p={3}
                  bg={colors.backgroundTertiary}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={colors.border}
                  _hover={{ borderColor: colors.primary, bg: `${colors.primary}08` }}
                  cursor="pointer"
                  onClick={() => handleCreatePage(item)}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between">
                    <HStack flex={1} spacing={3}>
                      <Text fontSize="lg">{suggestion.emoji}</Text>
                      <Box flex={1}>
                        <Text fontWeight="600" fontSize="xs" noOfLines={1} color={colors.text}>
                          {item.title}
                        </Text>
                        <HStack spacing={1}>
                          <Badge size="sm" colorScheme="blue" fontSize="2xs">
                            {suggestion.type}
                          </Badge>
                          {item.type === 'homework' && item.subject && (
                            <Badge size="sm" colorScheme="purple" fontSize="2xs">
                              {item.subject}
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    </HStack>
                    <IconButton
                      icon={<FiArrowRight />}
                      aria-label="Create page"
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        )}

        {/* Tip */}
        <Box bg={`${colors.primary}11`} p={3} borderRadius="lg" mt={2}>
          <Text fontSize="xs" color={colors.textMuted}>
            💡 <strong>Tip:</strong> Click any task above to create a workspace page with a ready-made structure!
          </Text>
        </Box>
      </VStack>
    );
  };

  // Render Settings tab
  const renderSettings = () => (
    <VStack spacing={4} align="stretch" p={4} overflowY="auto">
      <HStack spacing={3}>
        <Text fontSize="2xl">⚙️</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Planner Settings</Text>
          <Text fontSize="xs" color={colors.textMuted}>Customize your planner</Text>
        </Box>
      </HStack>

      <Divider />

      {/* Reminder Settings */}
      <FormControl>
        <FormLabel fontSize="sm" color={colors.text}>
          <HStack spacing={2}>
            <FiBell />
            <Text>Remind me before due date</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.remindersBefore}
          onChange={(e) => updateSettings('remindersBefore', parseInt(e.target.value))}
          bg={colors.backgroundTertiary}
          borderColor={colors.border}
          color={colors.text}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={1440}>1 day</option>
        </Select>
      </FormControl>

      {/* Default View */}
      <FormControl>
        <FormLabel fontSize="sm" color={colors.text}>
          <HStack spacing={2}>
            <FiClock />
            <Text>Default view</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.defaultView}
          onChange={(e) => updateSettings('defaultView', e.target.value as 'calendar' | 'list')}
          bg={colors.backgroundTertiary}
          borderColor={colors.border}
          color={colors.text}
        >
          <option value="calendar">📅 Calendar</option>
          <option value="list">📋 List</option>
        </Select>
      </FormControl>

      {/* Daily Goal */}
      <FormControl>
        <FormLabel fontSize="sm" color={colors.text}>
          <HStack spacing={2}>
            <FiTarget />
            <Text>Daily task goal</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.dailyGoal}
          onChange={(e) => updateSettings('dailyGoal', parseInt(e.target.value))}
          bg={colors.backgroundTertiary}
          borderColor={colors.border}
          color={colors.text}
        >
          <option value={1}>1 task</option>
          <option value={2}>2 tasks</option>
          <option value={3}>3 tasks</option>
          <option value={5}>5 tasks</option>
        </Select>
      </FormControl>

      {/* Show Completed */}
      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <FormLabel fontSize="sm" mb={0} color={colors.text}>
          Show completed tasks
        </FormLabel>
        <Switch
          colorScheme="blue"
          isChecked={settings.showCompleted}
          onChange={(e) => updateSettings('showCompleted', e.target.checked)}
        />
      </FormControl>

      <Divider />

      {/* Fun Stats */}
      <Box bg={`${colors.primary}11`} p={4} borderRadius="lg">
        <Text fontWeight="700" fontSize="sm" color={colors.text} mb={3}>📊 Fun Stats</Text>
        <SimpleGrid columns={2} spacing={3}>
          <Box textAlign="center" p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
            <Text fontSize="xl" fontWeight="800" color={colors.primary}>0</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Tasks Done</Text>
          </Box>
          <Box textAlign="center" p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
            <Text fontSize="xl" fontWeight="800" color={colors.primary}>0</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Day Streak</Text>
          </Box>
        </SimpleGrid>
      </Box>
    </VStack>
  );

  return (
    <Box p={0} h="full">

      {activeTab === 'chat' && (
        <Box h="full" display="flex" flexDirection="column">
          <ChildTutorTab
            defaultActivityId={KNOWN_ACTIVITY_IDS.PLANNER}
            defaultTitle="Study Buddy"
          />
        </Box>
      )}
      {activeTab === 'goals' && renderGoals()}
      {activeTab === 'workspace' && renderWorkspace()}
      {activeTab === 'settings' && renderSettings()}
    </Box>
  );
}

export default ChildPlannerPanel;
