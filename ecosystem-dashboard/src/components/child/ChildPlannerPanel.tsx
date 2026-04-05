/**
 * Child Planner Right Panel
 * 
 * Kid-friendly panel with:
 * - Study Buddy AI assistant
 * - Goals & achievements tracking
 * - Planner settings
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Progress,
  Badge,
  Switch,
  FormControl,
  FormLabel,
  Select,
  Divider,
  Spinner,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react';
import { FiSend, FiAward, FiTarget, FiStar, FiCheck, FiClock, FiBell, FiFileText, FiArrowRight, FiPlus } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useStudentProgress } from '@/contexts/StudentProgressContext';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

const STUDY_BUDDY_SUGGESTIONS = [
  "Help me with my homework 📚",
  "What should I study today? 🤔",
  "Give me a study tip! 💡",
  "Quiz me on something! 🎯",
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
  
  // Study Buddy state
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Hi there! 👋 I'm your Study Buddy! I can help you with homework, give study tips, or just chat about school. What would you like help with?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Handle AI chat
  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/child/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: `You are a friendly Study Buddy helping a child with their planner and homework. 
            Be encouraging, helpful, and use simple language. Add emojis to be friendly!
            Keep responses short (2-3 sentences max) and easy to understand.
            If they ask for help with homework, give helpful hints but encourage them to think.`,
          service: 'planner-assistant',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      const fallbackResponses = [
        "That's a great question! 🌟 Try breaking it into smaller parts - it makes everything easier!",
        "You're doing awesome! 💪 Remember, practice makes perfect!",
        "I love that you're working hard! 📚 Keep it up, you've got this!",
        "Great thinking! 🧠 What do you think the answer might be?",
      ];
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
  };

  // Render Study Buddy tab
  const renderStudyBuddy = () => (
    <VStack spacing={3} align="stretch" h="full">
      <HStack>
        <Text fontSize="2xl">🤖</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Study Buddy</Text>
          <Text fontSize="xs" color="gray.500">Your homework helper!</Text>
        </Box>
      </HStack>

      {/* Messages */}
      <Box 
        flex={1} 
        overflowY="auto" 
        bg="gray.50" 
        borderRadius="lg" 
        p={2}
        maxH="280px"
      >
        <VStack spacing={2} align="stretch">
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              bg={msg.role === 'user' ? 'purple.500' : 'white'}
              color={msg.role === 'user' ? 'white' : 'gray.800'}
              px={3}
              py={2}
              borderRadius="lg"
              maxW="90%"
              boxShadow="sm"
              fontSize="sm"
            >
              {msg.content}
            </Box>
          ))}
          {loading && (
            <HStack bg="white" px={3} py={2} borderRadius="lg" alignSelf="flex-start">
              <Spinner size="xs" color="purple.500" />
              <Text fontSize="sm" color="gray.500">Thinking...</Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Quick suggestions */}
      <SimpleGrid columns={2} spacing={1}>
        {STUDY_BUDDY_SUGGESTIONS.map((suggestion, idx) => (
          <Button
            key={idx}
            size="xs"
            variant="outline"
            fontSize="2xs"
            onClick={() => handleSuggestion(suggestion)}
            whiteSpace="normal"
            h="auto"
            py={1}
            textAlign="left"
          >
            {suggestion}
          </Button>
        ))}
      </SimpleGrid>

      {/* Input */}
      <HStack>
        <Input
          placeholder="Ask me anything!"
          size="sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          borderRadius="full"
        />
        <IconButton
          icon={<FiSend />}
          aria-label="Send"
          size="sm"
          colorScheme="purple"
          borderRadius="full"
          onClick={handleSend}
          isLoading={loading}
        />
      </HStack>
    </VStack>
  );

  // Render Goals tab
  const renderGoals = () => (
    <VStack spacing={4} align="stretch">
      <HStack>
        <Text fontSize="2xl">🎯</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Goals & Achievements</Text>
          <Text fontSize="xs" color="gray.500">Track your progress!</Text>
        </Box>
      </HStack>

      {/* Weekly Progress */}
      <Box bg="purple.50" p={3} borderRadius="lg">
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="bold" fontSize="sm">This Week</Text>
          <Badge colorScheme="purple">{weeklyStats.streak} day streak 🔥</Badge>
        </HStack>
        <Progress 
          value={(weeklyStats.completed / Math.max(weeklyStats.total, 1)) * 100} 
          colorScheme="purple" 
          borderRadius="full"
          size="sm"
        />
        <Text fontSize="xs" color="gray.600" mt={1}>
          {weeklyStats.completed} of {weeklyStats.total || settings.dailyGoal * 7} tasks completed
        </Text>
      </Box>

      {/* Daily Goal */}
      <Box bg="blue.50" p={3} borderRadius="lg">
        <HStack justify="space-between">
          <HStack>
            <FiTarget />
            <Text fontWeight="medium" fontSize="sm">Daily Goal</Text>
          </HStack>
          <Text fontWeight="bold" color="blue.600">{settings.dailyGoal} tasks</Text>
        </HStack>
      </Box>

      <Divider />

      {/* Achievements */}
      <Text fontWeight="bold" fontSize="sm">🏆 Achievements</Text>
      <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
        {achievements.map((achievement) => (
          <HStack
            key={achievement.id}
            p={2}
            bg={achievement.unlocked ? 'green.50' : 'gray.50'}
            borderRadius="md"
            opacity={achievement.unlocked ? 1 : 0.6}
          >
            <Text fontSize="xl">{achievement.emoji}</Text>
            <Box flex={1}>
              <Text fontWeight="medium" fontSize="xs">{achievement.title}</Text>
              <Text fontSize="2xs" color="gray.500">{achievement.description}</Text>
              {achievement.total && !achievement.unlocked && (
                <Progress 
                  value={(achievement.progress || 0) / achievement.total * 100} 
                  size="xs" 
                  colorScheme="purple"
                  mt={1}
                />
              )}
            </Box>
            {achievement.unlocked && <FiCheck color="green" />}
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
      <VStack spacing={4} align="stretch">
        <HStack>
          <Text fontSize="2xl">📝</Text>
          <Box>
            <Text fontWeight="bold" fontSize="sm">Workspace Integration</Text>
            <Text fontSize="xs" color="gray.500">Create pages from your tasks!</Text>
          </Box>
        </HStack>

        {/* Quick Create */}
        <Box bg="purple.50" p={3} borderRadius="lg">
          <HStack mb={2}>
            <FiPlus />
            <Text fontWeight="bold" fontSize="sm">Quick Create</Text>
          </HStack>
          <Text fontSize="xs" color="gray.600" mb={2}>
            Turn your planner items into organized workspace pages!
          </Text>
          <Button
            size="sm"
            colorScheme="purple"
            leftIcon={<FiFileText />}
            onClick={() => router.push('/child/workspace')}
            w="full"
          >
            Open Workspace
          </Button>
        </Box>

        <Divider />

        {/* Upcoming Items to Convert */}
        <Text fontWeight="bold" fontSize="sm">📋 Create Pages From Tasks</Text>
        
        {upcomingItems.length === 0 ? (
          <Box textAlign="center" py={4} bg="gray.50" borderRadius="lg">
            <Text fontSize="2xl" mb={2}>✨</Text>
            <Text fontSize="sm" color="gray.600">No pending tasks!</Text>
            <Text fontSize="xs" color="gray.500">Add tasks to your planner first</Text>
          </Box>
        ) : (
          <VStack spacing={2} align="stretch" maxH="250px" overflowY="auto">
            {upcomingItems.map((item) => {
              const suggestion = getSuggestedPageType(item);
              return (
                <Box
                  key={item.id}
                  p={2}
                  bg="white"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                  _hover={{ borderColor: 'purple.300', bg: 'purple.50' }}
                  cursor="pointer"
                  onClick={() => handleCreatePage(item)}
                >
                  <HStack justify="space-between">
                    <HStack flex={1}>
                      <Text fontSize="lg">{suggestion.emoji}</Text>
                      <Box flex={1}>
                        <Text fontWeight="medium" fontSize="xs" noOfLines={1}>
                          {item.title}
                        </Text>
                        <HStack spacing={1}>
                          <Badge size="sm" colorScheme="purple" fontSize="2xs">
                            {suggestion.type}
                          </Badge>
                          {item.type === 'homework' && item.subject && (
                            <Badge size="sm" colorScheme="blue" fontSize="2xs">
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
                      colorScheme="purple"
                    />
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        )}

        {/* Tip */}
        <Box bg="yellow.50" p={3} borderRadius="lg" mt={2}>
          <Text fontSize="xs" color="yellow.800">
            💡 <strong>Tip:</strong> Click any task above to create a workspace page with a ready-made structure!
          </Text>
        </Box>
      </VStack>
    );
  };

  // Render Settings tab
  const renderSettings = () => (
    <VStack spacing={4} align="stretch">
      <HStack>
        <Text fontSize="2xl">⚙️</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Planner Settings</Text>
          <Text fontSize="xs" color="gray.500">Customize your planner</Text>
        </Box>
      </HStack>

      <Divider />

      {/* Reminder Settings */}
      <FormControl>
        <FormLabel fontSize="sm">
          <HStack>
            <FiBell />
            <Text>Remind me before due date</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.remindersBefore}
          onChange={(e) => updateSettings('remindersBefore', parseInt(e.target.value))}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={1440}>1 day</option>
        </Select>
      </FormControl>

      {/* Default View */}
      <FormControl>
        <FormLabel fontSize="sm">
          <HStack>
            <FiClock />
            <Text>Default view</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.defaultView}
          onChange={(e) => updateSettings('defaultView', e.target.value as 'calendar' | 'list')}
        >
          <option value="calendar">📅 Calendar</option>
          <option value="list">📋 List</option>
        </Select>
      </FormControl>

      {/* Daily Goal */}
      <FormControl>
        <FormLabel fontSize="sm">
          <HStack>
            <FiTarget />
            <Text>Daily task goal</Text>
          </HStack>
        </FormLabel>
        <Select
          size="sm"
          value={settings.dailyGoal}
          onChange={(e) => updateSettings('dailyGoal', parseInt(e.target.value))}
        >
          <option value={1}>1 task</option>
          <option value={2}>2 tasks</option>
          <option value={3}>3 tasks</option>
          <option value={5}>5 tasks</option>
        </Select>
      </FormControl>

      {/* Show Completed */}
      <FormControl display="flex" alignItems="center" justifyContent="space-between">
        <FormLabel fontSize="sm" mb={0}>
          Show completed tasks
        </FormLabel>
        <Switch
          colorScheme="purple"
          isChecked={settings.showCompleted}
          onChange={(e) => updateSettings('showCompleted', e.target.checked)}
        />
      </FormControl>

      <Divider />

      {/* Fun Stats */}
      <Box bg="purple.50" p={3} borderRadius="lg">
        <Text fontWeight="bold" fontSize="sm" mb={2}>📊 Fun Stats</Text>
        <SimpleGrid columns={2} spacing={2}>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="xl" fontWeight="bold" color="purple.500">0</Text>
            <Text fontSize="2xs" color="gray.500">Tasks Done</Text>
          </Box>
          <Box textAlign="center" p={2} bg="white" borderRadius="md">
            <Text fontSize="xl" fontWeight="bold" color="blue.500">0</Text>
            <Text fontSize="2xs" color="gray.500">Day Streak</Text>
          </Box>
        </SimpleGrid>
      </Box>
    </VStack>
  );

  return (
    <Box p={3} h="full">
      {activeTab === 'study-buddy' && renderStudyBuddy()}
      {activeTab === 'goals' && renderGoals()}
      {activeTab === 'workspace' && renderWorkspace()}
      {activeTab === 'settings' && renderSettings()}
    </Box>
  );
}

export default ChildPlannerPanel;
