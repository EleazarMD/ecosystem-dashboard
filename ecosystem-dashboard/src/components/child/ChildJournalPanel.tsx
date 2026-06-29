/**
 * Child Journal Right Panel
 * 
 * Kid-friendly panel with:
 * - Writing tips and prompts
 * - Quick links to related activities (Planner, Workspace)
 * - Progress tracking and achievements
 * - AI writing assistant
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
  Progress,
  Badge,
  Divider,
  SimpleGrid,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useChildTheme } from './ChildThemeProvider';
import {
  JournalStreak,
  JournalPrompt,
  DAILY_PROMPTS,
  JOURNAL_TYPE_CONFIG,
} from '@/types/journal';

const WRITING_TIPS = [
  { emoji: '✨', tip: 'Start with how you feel today' },
  { emoji: '🎨', tip: 'Use describing words (colors, sounds, feelings)' },
  { emoji: '❓', tip: 'Ask yourself "What else?" to add more details' },
  { emoji: '🌟', tip: 'Write about something that made you smile' },
  { emoji: '💭', tip: 'It\'s okay to write about hard things too' },
  { emoji: '📝', tip: 'Even a few sentences count!' },
];

const QUICK_PROMPTS = [
  { emoji: '😊', text: 'What made you happy today?' },
  { emoji: '🎯', text: 'What did you learn today?' },
  { emoji: '💝', text: 'Who are you grateful for?' },
  { emoji: '🌈', text: 'What are you looking forward to?' },
  { emoji: '💪', text: 'What challenge did you face?' },
  { emoji: '✨', text: 'What was your favorite moment?' },
];

const CONNECTED_ACTIVITIES = [
  { 
    id: 'planner', 
    emoji: '📅', 
    label: 'My Planner', 
    description: 'Add journal reminders',
    path: '/child/planner',
    color: 'purple'
  },
  { 
    id: 'workspace', 
    emoji: '✍️', 
    label: 'Writing Lab', 
    description: 'Continue your story',
    path: '/child/workspace',
    color: 'blue'
  },
  { 
    id: 'chat', 
    emoji: '💬', 
    label: 'Chat', 
    description: 'Talk about your day',
    path: '/child/chat',
    color: 'green'
  },
  { 
    id: 'art', 
    emoji: '🎨', 
    label: 'Art Studio', 
    description: 'Draw your feelings',
    path: '/child/art-studio',
    color: 'pink'
  },
];

const AI_SUGGESTIONS = [
  "Help me start writing ✏️",
  "Give me a fun prompt! 🎯",
  "What should I write about? 🤔",
  "Help me describe my day 📝",
];

interface ChildJournalPanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function ChildJournalPanel({ activeTab }: ChildJournalPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useChildTheme();
  
  // Progress state
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<JournalPrompt | null>(null);
  
  // Fetch streak on mount
  useEffect(() => {
    fetchStreak();
    // Get a random prompt
    setTodayPrompt(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
  }, []);
  
  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/child/journal?action=streak');
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streak);
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  };
  
  const navigateTo = (path: string) => {
    router.push(path);
  };
  
  const copyPromptToClipboard = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({
      title: '📋 Copied!',
      description: 'Prompt copied - paste it in your journal!',
      status: 'success',
      duration: 2000,
    });
  };

  // Render Writing Tips tab
  const renderWritingTips = () => (
    <VStack spacing={4} align="stretch" p={4} overflowY="auto">
      <HStack spacing={3}>
        <Text fontSize="2xl">💡</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Writing Tips</Text>
          <Text fontSize="xs" color={colors.textMuted}>Ideas to make your writing shine!</Text>
        </Box>
      </HStack>
      
      <VStack spacing={2.5} align="stretch">
        {WRITING_TIPS.map((item, idx) => (
          <HStack 
            key={idx} 
            p={3} 
            bg={colors.backgroundTertiary} 
            borderRadius="lg"
            border="1px solid"
            borderColor={colors.border}
            fontSize="xs"
            spacing={2}
          >
            <Text fontSize="sm">{item.emoji}</Text>
            <Text color={colors.text}>{item.tip}</Text>
          </HStack>
        ))}
      </VStack>
      
      <Divider />
      
      {/* Quick Prompts */}
      <HStack spacing={3}>
        <Text fontSize="2xl">✨</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Quick Prompts</Text>
          <Text fontSize="xs" color={colors.textMuted}>Tap to copy and start writing!</Text>
        </Box>
      </HStack>
      
      <SimpleGrid columns={2} spacing={2.5}>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <Button
            key={idx}
            size="xs"
            variant="outline"
            leftIcon={<Text>{prompt.emoji}</Text>}
            onClick={() => copyPromptToClipboard(prompt.text)}
            whiteSpace="normal"
            h="auto"
            py={2.5}
            textAlign="left"
            fontSize="2xs"
            borderRadius="lg"
            borderColor={colors.border}
            color={colors.text}
            _hover={{ bg: colors.backgroundTertiary, borderColor: colors.primary }}
          >
            {prompt.text}
          </Button>
        ))}
      </SimpleGrid>

      <Box p={3} bg={`${colors.primary}11`} borderRadius="lg">
        <Text fontSize="xs" color={colors.textMuted} textAlign="center">
          💬 Want help? Switch to the <strong>Chat</strong> tab to talk with your Journal Buddy!
        </Text>
      </Box>
    </VStack>
  );

  // Render Prompts tab
  const renderPrompts = () => (
    <VStack spacing={4} align="stretch" p={4} overflowY="auto">
      <HStack justify="space-between">
        <HStack spacing={3}>
          <Text fontSize="2xl">🎯</Text>
          <Box>
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Today's Prompt</Text>
            <Text fontSize="xs" color={colors.textMuted}>A fresh idea every day!</Text>
          </Box>
        </HStack>
        <Button
          leftIcon={<FiRefreshCw />}
          aria-label="New prompt"
          size="xs"
          variant="ghost"
          onClick={() => setTodayPrompt(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)])}
          color={colors.textMuted}
        />
      </HStack>
      
      {todayPrompt && (
        <Box 
          p={4} 
          bg={`${colors.primary}11`}
          borderRadius="xl"
          border="2px solid"
          borderColor={`${colors.primary}40`}
        >
          <HStack mb={2}>
            <Text fontSize="xl">{todayPrompt.emoji}</Text>
            <Badge colorScheme={JOURNAL_TYPE_CONFIG[todayPrompt.type]?.color || 'gray'}>
              {JOURNAL_TYPE_CONFIG[todayPrompt.type]?.label || todayPrompt.type}
            </Badge>
          </HStack>
          <Text fontSize="sm" fontStyle="italic" mb={3} color={colors.text}>"{todayPrompt.prompt}"</Text>
          <Button
            size="xs"
            onClick={() => copyPromptToClipboard(todayPrompt.prompt)}
            borderRadius="full"
            colorScheme="blue"
          >
            Copy Prompt 📋
          </Button>
        </Box>
      )}
      
      <Divider />
      
      {/* Connected Activities */}
      <HStack spacing={3}>
        <Text fontSize="2xl">🔗</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Connected Activities</Text>
          <Text fontSize="xs" color={colors.textMuted}>Jump to related studios</Text>
        </Box>
      </HStack>
      
      <VStack spacing={2.5} align="stretch">
        {CONNECTED_ACTIVITIES.map((activity) => (
          <HStack
            key={activity.id}
            p={3}
            bg={colors.backgroundTertiary}
            borderRadius="lg"
            border="1px solid"
            borderColor={colors.border}
            cursor="pointer"
            _hover={{ borderColor: colors.primary, transform: 'translateX(2px)' }}
            transition="all 0.2s"
            onClick={() => navigateTo(activity.path)}
            spacing={3}
          >
            <Text fontSize="xl">{activity.emoji}</Text>
            <Box flex={1}>
              <Text fontWeight="600" fontSize="xs" color={colors.text}>{activity.label}</Text>
              <Text fontSize="2xs" color={colors.textMuted}>{activity.description}</Text>
            </Box>
            <Badge colorScheme={activity.color} fontSize="2xs">Go →</Badge>
          </HStack>
        ))}
      </VStack>
      
      <Divider />
      
      {/* Entry Type Ideas */}
      <HStack spacing={3}>
        <Text fontSize="2xl">📔</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Try Different Types</Text>
          <Text fontSize="xs" color={colors.textMuted}>Explore new writing styles</Text>
        </Box>
      </HStack>
      
      <SimpleGrid columns={2} spacing={2}>
        {Object.entries(JOURNAL_TYPE_CONFIG).slice(0, 6).map(([key, config]) => (
          <Tooltip key={key} label={config.prompt} fontSize="xs">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Text fontSize="sm">{config.emoji}</Text>}
              fontSize="2xs"
              h="auto"
              py={2}
              borderRadius="lg"
              color={colors.text}
              _hover={{ bg: colors.backgroundTertiary }}
            >
              {config.label}
            </Button>
          </Tooltip>
        ))}
      </SimpleGrid>
    </VStack>
  );

  // Render Progress tab
  const renderProgress = () => (
    <VStack spacing={4} align="stretch" p={4} overflowY="auto">
      {/* Streak Card */}
      <Box 
        p={4} 
        bg={`${colors.primary}11`}
        borderRadius="xl"
        border="2px solid"
        borderColor={`${colors.primary}40`}
      >
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Text fontSize="xl">🔥</Text>
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Writing Streak</Text>
          </HStack>
          <Badge colorScheme="orange" fontSize="md" px={2}>
            {streak?.currentStreak || 0} days
          </Badge>
        </HStack>
        
        <SimpleGrid columns={3} spacing={2}>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{streak?.totalEntries || 0}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Total</Text>
          </VStack>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{streak?.entriesThisWeek || 0}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>This Week</Text>
          </VStack>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="800" color={colors.primary}>{streak?.longestStreak || 0}</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Best</Text>
          </VStack>
        </SimpleGrid>
      </Box>
      
      <Divider />
      
      {/* Achievements */}
      <HStack spacing={3}>
        <Text fontSize="2xl">🏆</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>Achievements</Text>
          <Text fontSize="xs" color={colors.textMuted}>Keep writing to unlock them all!</Text>
        </Box>
      </HStack>
      
      <VStack spacing={2.5} align="stretch">
        <HStack p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
          <Text fontSize="lg">📔</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="600" color={colors.text}>First Entry</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Write your first journal entry</Text>
          </Box>
          {(streak?.totalEntries || 0) >= 1 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">0/1</Badge>
          )}
        </HStack>
        
        <HStack p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
          <Text fontSize="lg">🔥</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="600" color={colors.text}>3-Day Streak</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Write 3 days in a row</Text>
          </Box>
          {(streak?.currentStreak || 0) >= 3 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{streak?.currentStreak || 0}/3</Badge>
          )}
        </HStack>
        
        <HStack p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
          <Text fontSize="lg">⭐</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="600" color={colors.text}>Week Warrior</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Write 7 days in a row</Text>
          </Box>
          {(streak?.currentStreak || 0) >= 7 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{Math.min(streak?.currentStreak || 0, 7)}/7</Badge>
          )}
        </HStack>
        
        <HStack p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
          <Text fontSize="lg">📚</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="600" color={colors.text}>Dedicated Writer</Text>
            <Text fontSize="2xs" color={colors.textMuted}>Write 10 entries</Text>
          </Box>
          {(streak?.totalEntries || 0) >= 10 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{streak?.totalEntries || 0}/10</Badge>
          )}
        </HStack>
      </VStack>
      
      <Divider />
      
      {/* Quick Stats */}
      <HStack spacing={3}>
        <Text fontSize="2xl">📊</Text>
        <Box>
          <Text fontWeight="700" fontSize="sm" color={colors.text}>This Month</Text>
          <Text fontSize="xs" color={colors.textMuted}>Your writing progress</Text>
        </Box>
      </HStack>
      
      <Box p={3} bg={colors.backgroundTertiary} borderRadius="lg" border="1px solid" borderColor={colors.border}>
        <HStack justify="space-between" mb={1.5}>
          <Text fontSize="xs" color={colors.text}>Entries this month</Text>
          <Text fontSize="xs" fontWeight="700" color={colors.primary}>{streak?.entriesThisMonth || 0}</Text>
        </HStack>
        <Progress 
          value={Math.min(((streak?.entriesThisMonth || 0) / 30) * 100, 100)} 
          size="sm" 
          colorScheme="blue"
          borderRadius="full"
        />
        <Text fontSize="2xs" color={colors.textMuted} mt={1.5}>Goal: Write every day!</Text>
      </Box>
    </VStack>
  );

  // Main render based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'writing-tips':
        return renderWritingTips();
      case 'prompts':
        return renderPrompts();
      case 'progress':
        return renderProgress();
      default:
        return renderWritingTips();
    }
  };

  return (
    <Box p={0} h="full">

      {activeTab === 'chat' && (
        <Box h="full" display="flex" flexDirection="column">
          <ChildTutorTab
            defaultActivityId={KNOWN_ACTIVITY_IDS.JOURNAL}
            defaultTitle="Journal Buddy"
          />
        </Box>
      )}
      {renderContent()}
    </Box>
  );
}

export default ChildJournalPanel;
