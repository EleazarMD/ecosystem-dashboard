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
  Divider,
  Spinner,
  SimpleGrid,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiAward, 
  FiTarget, 
  FiStar, 
  FiEdit, 
  FiCalendar, 
  FiBook,
  FiFeather,
  FiTrendingUp,
  FiZap,
  FiHeart,
  FiRefreshCw,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useChildTheme } from './ChildThemeProvider';
import {
  JournalStreak,
  JournalPrompt,
  DAILY_PROMPTS,
  JOURNAL_TYPE_CONFIG,
} from '@/types/journal';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
  const { colors, themeId } = useChildTheme();
  
  // AI assistant state
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Hi there! 📔 I'm your Journal Helper! I can give you writing ideas, help you get started, or just chat about your day. What would you like to do?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Progress state
  const [streak, setStreak] = useState<JournalStreak | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<JournalPrompt | null>(null);
  
  // Theme
  const isMinecraft = themeId?.includes('minecraft');
  const isPusheen = themeId?.includes('pusheen');
  const primaryColor = colors?.primary || '#667eea';
  
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
          context: `You are a friendly Journal Helper for a child. Help them with journaling and creative writing.
            Be encouraging, warm, and use simple language. Add emojis to be friendly!
            Keep responses short (2-3 sentences max) and easy to understand.
            Give creative writing prompts, help them express feelings, and encourage reflection.
            If they share something personal, be supportive and kind.`,
          service: 'journal-assistant',
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
        "That's wonderful! 🌟 Writing about your feelings is so important. Keep going!",
        "Great thinking! 💭 What else happened? I'd love to hear more!",
        "You're doing amazing! ✨ Every word you write helps you grow as a writer!",
        "I love that! 📝 Try adding some details about how it made you feel.",
      ];
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
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
    <VStack spacing={3} align="stretch">
      <HStack>
        <Text fontSize="xl">💡</Text>
        <Text fontWeight="bold" fontSize="sm">Writing Tips</Text>
      </HStack>
      
      <VStack spacing={2} align="stretch">
        {WRITING_TIPS.map((item, idx) => (
          <HStack 
            key={idx} 
            p={2} 
            bg="gray.50" 
            borderRadius={isMinecraft ? '4px' : 'lg'}
            fontSize="xs"
          >
            <Text>{item.emoji}</Text>
            <Text>{item.tip}</Text>
          </HStack>
        ))}
      </VStack>
      
      <Divider my={2} />
      
      {/* Quick Prompts */}
      <HStack>
        <Text fontSize="xl">✨</Text>
        <Text fontWeight="bold" fontSize="sm">Quick Prompts</Text>
      </HStack>
      
      <SimpleGrid columns={2} spacing={2}>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <Button
            key={idx}
            size="xs"
            variant="outline"
            leftIcon={<Text>{prompt.emoji}</Text>}
            onClick={() => copyPromptToClipboard(prompt.text)}
            whiteSpace="normal"
            h="auto"
            py={2}
            textAlign="left"
            fontSize="2xs"
            borderRadius={isMinecraft ? '4px' : 'md'}
          >
            {prompt.text}
          </Button>
        ))}
      </SimpleGrid>
      
      {/* AI Helper */}
      <Divider my={2} />
      
      <HStack>
        <Text fontSize="xl">🤖</Text>
        <Box>
          <Text fontWeight="bold" fontSize="sm">Journal Helper</Text>
          <Text fontSize="xs" color="gray.500">Ask me anything!</Text>
        </Box>
      </HStack>

      {/* Messages */}
      <Box 
        flex={1} 
        overflowY="auto" 
        bg="gray.50" 
        borderRadius={isMinecraft ? '4px' : 'lg'}
        p={2}
        maxH="150px"
      >
        <VStack spacing={2} align="stretch">
          {messages.slice(-4).map((msg, idx) => (
            <Box
              key={idx}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              bg={msg.role === 'user' ? primaryColor : 'white'}
              color={msg.role === 'user' ? 'white' : 'gray.800'}
              px={2}
              py={1}
              borderRadius={isMinecraft ? '4px' : 'lg'}
              maxW="90%"
              boxShadow="sm"
              fontSize="xs"
            >
              {msg.content}
            </Box>
          ))}
          {loading && (
            <HStack bg="white" px={2} py={1} borderRadius="lg" alignSelf="flex-start">
              <Spinner size="xs" color={primaryColor} />
              <Text fontSize="xs" color="gray.500">Thinking...</Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Input */}
      <HStack>
        <Input
          placeholder="Ask for help..."
          size="sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          borderRadius={isMinecraft ? '4px' : 'full'}
          fontSize="xs"
        />
        <IconButton
          icon={<FiSend />}
          aria-label="Send"
          size="sm"
          colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'purple'}
          borderRadius={isMinecraft ? '4px' : 'full'}
          onClick={handleSend}
          isLoading={loading}
        />
      </HStack>
    </VStack>
  );

  // Render Prompts tab
  const renderPrompts = () => (
    <VStack spacing={3} align="stretch">
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="xl">🎯</Text>
          <Text fontWeight="bold" fontSize="sm">Today's Prompt</Text>
        </HStack>
        <IconButton
          icon={<FiRefreshCw />}
          aria-label="New prompt"
          size="xs"
          variant="ghost"
          onClick={() => setTodayPrompt(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)])}
        />
      </HStack>
      
      {todayPrompt && (
        <Box 
          p={3} 
          bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'blue.50'}
          borderRadius={isMinecraft ? '4px' : 'xl'}
          border="2px solid"
          borderColor={isPusheen ? 'pink.200' : isMinecraft ? 'green.300' : 'blue.200'}
        >
          <HStack mb={2}>
            <Text fontSize="xl">{todayPrompt.emoji}</Text>
            <Badge colorScheme={JOURNAL_TYPE_CONFIG[todayPrompt.type]?.color || 'gray'}>
              {JOURNAL_TYPE_CONFIG[todayPrompt.type]?.label || todayPrompt.type}
            </Badge>
          </HStack>
          <Text fontSize="sm" fontStyle="italic" mb={2}>"{todayPrompt.prompt}"</Text>
          <Button
            size="xs"
            colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'blue'}
            onClick={() => copyPromptToClipboard(todayPrompt.prompt)}
            borderRadius={isMinecraft ? '4px' : 'full'}
          >
            Copy Prompt 📋
          </Button>
        </Box>
      )}
      
      <Divider my={2} />
      
      {/* Connected Activities */}
      <HStack>
        <Text fontSize="xl">🔗</Text>
        <Text fontWeight="bold" fontSize="sm">Connected Activities</Text>
      </HStack>
      
      <VStack spacing={2} align="stretch">
        {CONNECTED_ACTIVITIES.map((activity) => (
          <HStack
            key={activity.id}
            p={2}
            bg="white"
            borderRadius={isMinecraft ? '4px' : 'lg'}
            boxShadow="sm"
            cursor="pointer"
            _hover={{ bg: 'gray.50', transform: 'translateX(4px)' }}
            transition="all 0.2s"
            onClick={() => navigateTo(activity.path)}
          >
            <Text fontSize="xl">{activity.emoji}</Text>
            <Box flex={1}>
              <Text fontWeight="bold" fontSize="xs">{activity.label}</Text>
              <Text fontSize="2xs" color="gray.500">{activity.description}</Text>
            </Box>
            <Badge colorScheme={activity.color} fontSize="2xs">Go →</Badge>
          </HStack>
        ))}
      </VStack>
      
      <Divider my={2} />
      
      {/* Entry Type Ideas */}
      <HStack>
        <Text fontSize="xl">📔</Text>
        <Text fontWeight="bold" fontSize="sm">Try Different Types</Text>
      </HStack>
      
      <SimpleGrid columns={2} spacing={1}>
        {Object.entries(JOURNAL_TYPE_CONFIG).slice(0, 6).map(([key, config]) => (
          <Tooltip key={key} label={config.prompt} fontSize="xs">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Text fontSize="sm">{config.emoji}</Text>}
              fontSize="2xs"
              h="auto"
              py={1}
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
    <VStack spacing={3} align="stretch">
      {/* Streak Card */}
      <Box 
        p={3} 
        bg={isPusheen ? 'pink.50' : isMinecraft ? 'green.50' : 'orange.50'}
        borderRadius={isMinecraft ? '4px' : 'xl'}
        border="2px solid"
        borderColor={isPusheen ? 'pink.200' : isMinecraft ? 'green.300' : 'orange.200'}
      >
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Text fontSize="xl">🔥</Text>
            <Text fontWeight="bold" fontSize="sm">Writing Streak</Text>
          </HStack>
          <Badge colorScheme="orange" fontSize="md" px={2}>
            {streak?.currentStreak || 0} days
          </Badge>
        </HStack>
        
        <SimpleGrid columns={3} spacing={2}>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold">{streak?.totalEntries || 0}</Text>
            <Text fontSize="2xs" color="gray.500">Total</Text>
          </VStack>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold">{streak?.entriesThisWeek || 0}</Text>
            <Text fontSize="2xs" color="gray.500">This Week</Text>
          </VStack>
          <VStack spacing={0}>
            <Text fontSize="lg" fontWeight="bold">{streak?.longestStreak || 0}</Text>
            <Text fontSize="2xs" color="gray.500">Best</Text>
          </VStack>
        </SimpleGrid>
      </Box>
      
      <Divider my={1} />
      
      {/* Achievements */}
      <HStack>
        <Text fontSize="xl">🏆</Text>
        <Text fontWeight="bold" fontSize="sm">Achievements</Text>
      </HStack>
      
      <VStack spacing={2} align="stretch">
        <HStack p={2} bg="gray.50" borderRadius={isMinecraft ? '4px' : 'lg'}>
          <Text fontSize="lg">📔</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="bold">First Entry</Text>
            <Text fontSize="2xs" color="gray.500">Write your first journal entry</Text>
          </Box>
          {(streak?.totalEntries || 0) >= 1 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">0/1</Badge>
          )}
        </HStack>
        
        <HStack p={2} bg="gray.50" borderRadius={isMinecraft ? '4px' : 'lg'}>
          <Text fontSize="lg">🔥</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="bold">3-Day Streak</Text>
            <Text fontSize="2xs" color="gray.500">Write 3 days in a row</Text>
          </Box>
          {(streak?.currentStreak || 0) >= 3 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{streak?.currentStreak || 0}/3</Badge>
          )}
        </HStack>
        
        <HStack p={2} bg="gray.50" borderRadius={isMinecraft ? '4px' : 'lg'}>
          <Text fontSize="lg">⭐</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="bold">Week Warrior</Text>
            <Text fontSize="2xs" color="gray.500">Write 7 days in a row</Text>
          </Box>
          {(streak?.currentStreak || 0) >= 7 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{Math.min(streak?.currentStreak || 0, 7)}/7</Badge>
          )}
        </HStack>
        
        <HStack p={2} bg="gray.50" borderRadius={isMinecraft ? '4px' : 'lg'}>
          <Text fontSize="lg">📚</Text>
          <Box flex={1}>
            <Text fontSize="xs" fontWeight="bold">Dedicated Writer</Text>
            <Text fontSize="2xs" color="gray.500">Write 10 entries</Text>
          </Box>
          {(streak?.totalEntries || 0) >= 10 ? (
            <Badge colorScheme="green">✓</Badge>
          ) : (
            <Badge colorScheme="gray">{streak?.totalEntries || 0}/10</Badge>
          )}
        </HStack>
      </VStack>
      
      <Divider my={1} />
      
      {/* Quick Stats */}
      <HStack>
        <Text fontSize="xl">📊</Text>
        <Text fontWeight="bold" fontSize="sm">This Month</Text>
      </HStack>
      
      <Box p={2} bg="gray.50" borderRadius={isMinecraft ? '4px' : 'lg'}>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs">Entries this month</Text>
          <Text fontSize="xs" fontWeight="bold">{streak?.entriesThisMonth || 0}</Text>
        </HStack>
        <Progress 
          value={Math.min(((streak?.entriesThisMonth || 0) / 30) * 100, 100)} 
          size="sm" 
          colorScheme={isMinecraft ? 'green' : isPusheen ? 'pink' : 'purple'}
          borderRadius="full"
        />
        <Text fontSize="2xs" color="gray.500" mt={1}>Goal: Write every day!</Text>
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
    <Box p={3} h="full" overflowY="auto">
      {renderContent()}
    </Box>
  );
}

export default ChildJournalPanel;
