/**
 * Child Home Right Panel
 * 
 * Enhanced kid-friendly panel with agentic features:
 * - Daily Guide: Personalized recommendations and today's focus
 * - Progress: Learning analytics and achievements
 * - Discover: New tools and learning opportunities
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  IconButton,
  Divider,
  Spinner,
  SimpleGrid,
  Badge,
  Progress,
  Tooltip,
  useToast,
  InputGroup,
  InputRightElement,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { 
  FiSend, 
  FiStar, 
  FiTrendingUp,
  FiAward,
  FiTarget,
  FiBookOpen,
  FiEdit3,
  FiImage,
  FiMessageCircle,
  FiCalendar,
  FiZap,
  FiCompass,
  FiPlay,
  FiChevronRight,
} from 'react-icons/fi';
import { useRouter } from 'next/router';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LearningGoal {
  id: string;
  title: string;
  emoji: string;
  progress: number;
  target: number;
  unit: string;
}

interface Achievement {
  id: string;
  title: string;
  emoji: string;
  description: string;
  earned: boolean;
  earnedDate?: string;
}

interface DiscoverItem {
  id: string;
  title: string;
  emoji: string;
  description: string;
  path: string;
  category: 'tool' | 'activity' | 'challenge';
  isNew?: boolean;
}

const DAILY_TIPS = [
  { emoji: '💡', text: 'Try the Art Studio to create amazing pictures!' },
  { emoji: '📚', text: 'Reading for 15 minutes a day makes you smarter!' },
  { emoji: '✍️', text: 'Writing stories helps your imagination grow!' },
  { emoji: '🧮', text: 'Practice math problems to become a math wizard!' },
  { emoji: '🎯', text: 'Set a goal and work towards it every day!' },
];

const QUICK_ACTIONS = [
  { emoji: '💬', label: 'Chat', path: '/child/chat', color: 'blue' },
  { emoji: '🎨', label: 'Draw', path: '/child/art-studio', color: 'pink' },
  { emoji: '✏️', label: 'Write', path: '/child/workspace', color: 'purple' },
  { emoji: '📅', label: 'Plan', path: '/child/planner', color: 'green' },
];

const LEARNING_GOALS: LearningGoal[] = [
  { id: '1', title: 'Reading Time', emoji: '📖', progress: 0, target: 30, unit: 'min' },
  { id: '2', title: 'Math Problems', emoji: '🧮', progress: 0, target: 10, unit: 'solved' },
  { id: '3', title: 'Stories Written', emoji: '✍️', progress: 0, target: 3, unit: 'stories' },
  { id: '4', title: 'Art Created', emoji: '🎨', progress: 0, target: 5, unit: 'pictures' },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'First Steps', emoji: '👣', description: 'Complete your first activity', earned: false },
  { id: '2', title: 'Bookworm', emoji: '📚', description: 'Read for 100 minutes total', earned: false },
  { id: '3', title: 'Artist', emoji: '🎨', description: 'Create 10 artworks', earned: false },
  { id: '4', title: 'Writer', emoji: '✏️', description: 'Write 5 stories', earned: false },
  { id: '5', title: 'Math Wizard', emoji: '🧙', description: 'Solve 50 math problems', earned: false },
  { id: '6', title: 'Streak Master', emoji: '🔥', description: 'Maintain a 7-day streak', earned: false },
];

const DISCOVER_ITEMS: DiscoverItem[] = [
  { id: '1', title: 'Story Builder', emoji: '📖', description: 'Create your own adventure stories!', path: '/child/workspace', category: 'tool', isNew: true },
  { id: '2', title: 'Math Games', emoji: '🎮', description: 'Fun math challenges and puzzles', path: '/child/workspace', category: 'activity' },
  { id: '3', title: 'Art Challenge', emoji: '🎨', description: 'Daily drawing prompts', path: '/child/art-studio', category: 'challenge' },
  { id: '4', title: 'Book Explorer', emoji: '🔍', description: 'Discover new books to read', path: '/child/workspace', category: 'tool' },
  { id: '5', title: 'Study Buddy', emoji: '🤖', description: 'AI helper for homework', path: '/child/planner', category: 'tool', isNew: true },
];

interface ChildHomePanelProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
}

export function ChildHomePanel({ activeTab }: ChildHomePanelProps) {
  const router = useRouter();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Daily Guide state
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Good morning! 🌟 I'm your Learning Buddy! Ready to have an amazing day? Let me help you plan your activities!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyTip, setDailyTip] = useState(DAILY_TIPS[0]);

  // Progress state
  const [goals, setGoals] = useState<LearningGoal[]>(LEARNING_GOALS);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [weeklyStats, setWeeklyStats] = useState({ totalMinutes: 0, activitiesCompleted: 0, streak: 0 });

  // Load data from localStorage
  useEffect(() => {
    // Random daily tip
    setDailyTip(DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
    
    // Load saved progress
    const savedGoals = localStorage.getItem('childLearningGoals');
    if (savedGoals) {
      try {
        setGoals(JSON.parse(savedGoals));
      } catch (e) {}
    }
    
    const savedAchievements = localStorage.getItem('childAchievements');
    if (savedAchievements) {
      try {
        setAchievements(JSON.parse(savedAchievements));
      } catch (e) {}
    }

    const savedStats = localStorage.getItem('childWeeklyStats');
    if (savedStats) {
      try {
        setWeeklyStats(JSON.parse(savedStats));
      } catch (e) {}
    }
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          context: `You are a friendly Learning Buddy for kids! Help them plan their day and suggest fun learning activities.
            Be encouraging and use simple language. Add emojis to be fun!
            Suggest specific activities they can do in the app (Chat, Art Studio, Writing, Planner).
            Keep responses short (2-3 sentences) and exciting!`,
          service: 'learning-buddy',
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
        "That sounds great! 🌟 Why not start with some creative writing in the Workspace?",
        "Awesome idea! 🎨 The Art Studio is perfect for that!",
        "I love your enthusiasm! 📚 Let's check your Planner to organize your day!",
        "You're doing amazing! 💪 Keep up the great work!",
      ];
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to activity
  const goToActivity = (path: string) => {
    router.push(path);
  };

  // Render Daily Guide tab
  const renderDailyGuide = () => (
    <VStack spacing={3} align="stretch" h="full">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="2xl">🌟</Text>
          <Box>
            <Text fontWeight="bold" fontSize="sm">Today's Guide</Text>
            <Text fontSize="xs" color="gray.500">Your learning buddy!</Text>
          </Box>
        </HStack>
      </HStack>

      {/* Daily Tip */}
      <Box bg="yellow.50" borderRadius="lg" p={3}>
        <HStack>
          <Text fontSize="xl">{dailyTip.emoji}</Text>
          <Text fontSize="sm" color="yellow.800" fontWeight="medium">
            {dailyTip.text}
          </Text>
        </HStack>
      </Box>

      {/* Quick Actions */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">⚡ Quick Start</Text>
        <SimpleGrid columns={4} spacing={2}>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.path}
              size="sm"
              variant="outline"
              colorScheme={action.color}
              onClick={() => goToActivity(action.path)}
              flexDirection="column"
              h="auto"
              py={2}
            >
              <Text fontSize="lg">{action.emoji}</Text>
              <Text fontSize="2xs">{action.label}</Text>
            </Button>
          ))}
        </SimpleGrid>
      </Box>

      {/* Chat Area */}
      <Box 
        flex={1} 
        overflowY="auto" 
        bg="blue.50" 
        borderRadius="lg" 
        p={2}
        maxH="180px"
      >
        <VStack spacing={2} align="stretch">
          {messages.map((msg, idx) => (
            <Box
              key={idx}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              bg={msg.role === 'user' ? 'blue.500' : 'white'}
              color={msg.role === 'user' ? 'white' : 'gray.800'}
              px={3}
              py={2}
              borderRadius="lg"
              maxW="90%"
              boxShadow="sm"
              fontSize="sm"
              ml={msg.role === 'user' ? 'auto' : 0}
            >
              {msg.content}
            </Box>
          ))}
          {loading && (
            <HStack bg="white" px={3} py={2} borderRadius="lg" alignSelf="flex-start">
              <Spinner size="xs" color="blue.500" />
              <Text fontSize="sm" color="gray.500">Thinking...</Text>
            </HStack>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <HStack>
        <InputGroup size="sm" flex={1}>
          <Input
            placeholder="Ask me anything!"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            borderRadius="full"
            focusBorderColor="blue.400"
          />
        </InputGroup>
        <IconButton
          icon={<FiSend />}
          aria-label="Send"
          size="sm"
          colorScheme="blue"
          borderRadius="full"
          onClick={handleSend}
          isLoading={loading}
        />
      </HStack>
    </VStack>
  );

  // Render Progress tab
  const renderProgress = () => {
    const totalGoalProgress = goals.reduce((acc, g) => acc + (g.progress / g.target), 0) / goals.length * 100;
    const earnedCount = achievements.filter(a => a.earned).length;
    
    return (
      <VStack spacing={3} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Text fontSize="2xl">📊</Text>
            <Box>
              <Text fontWeight="bold" fontSize="sm">My Progress</Text>
              <Text fontSize="xs" color="gray.500">Track your learning!</Text>
            </Box>
          </HStack>
        </HStack>

        {/* Overall Progress */}
        <HStack justify="space-around" p={3} bg="purple.50" borderRadius="lg">
          <VStack spacing={1}>
            <CircularProgress value={totalGoalProgress} color="purple.500" size="50px">
              <CircularProgressLabel fontSize="xs" fontWeight="bold">
                {Math.round(totalGoalProgress)}%
              </CircularProgressLabel>
            </CircularProgress>
            <Text fontSize="2xs" color="gray.500">Goals</Text>
          </VStack>
          <Divider orientation="vertical" h="50px" />
          <VStack spacing={1}>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              {weeklyStats.streak}
            </Text>
            <Text fontSize="2xs" color="gray.500">Day Streak 🔥</Text>
          </VStack>
          <Divider orientation="vertical" h="50px" />
          <VStack spacing={1}>
            <Text fontSize="2xl" fontWeight="bold" color="green.500">
              {earnedCount}
            </Text>
            <Text fontSize="2xs" color="gray.500">Badges 🏆</Text>
          </VStack>
        </HStack>

        {/* Learning Goals */}
        <Box>
          <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">🎯 Learning Goals</Text>
          <VStack spacing={2} align="stretch" maxH="120px" overflowY="auto">
            {goals.map((goal) => (
              <Box key={goal.id} p={2} bg="gray.50" borderRadius="md">
                <HStack justify="space-between" mb={1}>
                  <HStack>
                    <Text>{goal.emoji}</Text>
                    <Text fontSize="xs" fontWeight="medium">{goal.title}</Text>
                  </HStack>
                  <Text fontSize="2xs" color="gray.500">
                    {goal.progress}/{goal.target} {goal.unit}
                  </Text>
                </HStack>
                <Progress 
                  value={(goal.progress / goal.target) * 100} 
                  size="xs" 
                  colorScheme="green" 
                  borderRadius="full"
                />
              </Box>
            ))}
          </VStack>
        </Box>

        <Divider />

        {/* Achievements */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xs" fontWeight="bold" color="gray.600">🏆 Achievements</Text>
            <Badge colorScheme="purple" fontSize="2xs">{earnedCount}/{achievements.length}</Badge>
          </HStack>
          <SimpleGrid columns={3} spacing={2} maxH="100px" overflowY="auto">
            {achievements.slice(0, 6).map((achievement) => (
              <Tooltip key={achievement.id} label={achievement.description}>
                <Box
                  p={2}
                  bg={achievement.earned ? 'yellow.50' : 'gray.100'}
                  borderRadius="md"
                  textAlign="center"
                  opacity={achievement.earned ? 1 : 0.5}
                  cursor="pointer"
                >
                  <Text fontSize="xl">{achievement.emoji}</Text>
                  <Text fontSize="2xs" noOfLines={1}>{achievement.title}</Text>
                </Box>
              </Tooltip>
            ))}
          </SimpleGrid>
        </Box>

        {/* Weekly Summary */}
        <Box p={2} bg="blue.50" borderRadius="lg">
          <Text fontSize="xs" fontWeight="bold" color="blue.700" mb={1}>📅 This Week</Text>
          <HStack justify="space-around">
            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="bold" color="blue.600">{weeklyStats.totalMinutes}</Text>
              <Text fontSize="2xs" color="gray.500">Minutes</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="bold" color="blue.600">{weeklyStats.activitiesCompleted}</Text>
              <Text fontSize="2xs" color="gray.500">Activities</Text>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    );
  };

  // Render Discover tab
  const renderDiscover = () => (
    <VStack spacing={3} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="2xl">🔍</Text>
          <Box>
            <Text fontWeight="bold" fontSize="sm">Discover</Text>
            <Text fontSize="xs" color="gray.500">Find new things to learn!</Text>
          </Box>
        </HStack>
      </HStack>

      {/* Featured */}
      <Box 
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
        borderRadius="lg" 
        p={3}
        color="white"
      >
        <HStack justify="space-between">
          <Box>
            <Badge colorScheme="yellow" mb={1}>✨ Featured</Badge>
            <Text fontWeight="bold" fontSize="sm">Story Builder</Text>
            <Text fontSize="xs" opacity={0.9}>Create your own adventure!</Text>
          </Box>
          <IconButton
            icon={<FiPlay />}
            aria-label="Try it"
            colorScheme="whiteAlpha"
            size="sm"
            borderRadius="full"
            onClick={() => goToActivity('/child/workspace')}
          />
        </HStack>
      </Box>

      {/* Categories */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">🎯 Activities</Text>
        <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
          {DISCOVER_ITEMS.map((item) => (
            <HStack
              key={item.id}
              p={2}
              bg="gray.50"
              borderRadius="md"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ bg: 'gray.100', transform: 'translateX(4px)' }}
              onClick={() => goToActivity(item.path)}
            >
              <Box
                w="36px"
                h="36px"
                bg={item.category === 'tool' ? 'blue.100' : item.category === 'activity' ? 'green.100' : 'orange.100'}
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize="lg">{item.emoji}</Text>
              </Box>
              <Box flex={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">{item.title}</Text>
                  {item.isNew && <Badge colorScheme="red" fontSize="2xs">NEW</Badge>}
                </HStack>
                <Text fontSize="2xs" color="gray.500">{item.description}</Text>
              </Box>
              <FiChevronRight color="gray" />
            </HStack>
          ))}
        </VStack>
      </Box>

      <Divider />

      {/* Learning Paths */}
      <Box>
        <Text fontSize="xs" fontWeight="bold" mb={2} color="gray.600">🛤️ Learning Paths</Text>
        <SimpleGrid columns={2} spacing={2}>
          <Box
            p={2}
            bg="purple.50"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'purple.100' }}
            onClick={() => goToActivity('/child/workspace')}
          >
            <Text fontSize="lg" mb={1}>📚</Text>
            <Text fontSize="xs" fontWeight="medium">Reading</Text>
            <Text fontSize="2xs" color="gray.500">Explore books</Text>
          </Box>
          <Box
            p={2}
            bg="green.50"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'green.100' }}
            onClick={() => goToActivity('/child/workspace')}
          >
            <Text fontSize="lg" mb={1}>🧮</Text>
            <Text fontSize="xs" fontWeight="medium">Math</Text>
            <Text fontSize="2xs" color="gray.500">Practice skills</Text>
          </Box>
          <Box
            p={2}
            bg="pink.50"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'pink.100' }}
            onClick={() => goToActivity('/child/art-studio')}
          >
            <Text fontSize="lg" mb={1}>🎨</Text>
            <Text fontSize="xs" fontWeight="medium">Art</Text>
            <Text fontSize="2xs" color="gray.500">Be creative</Text>
          </Box>
          <Box
            p={2}
            bg="blue.50"
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'blue.100' }}
            onClick={() => goToActivity('/child/workspace')}
          >
            <Text fontSize="lg" mb={1}>✍️</Text>
            <Text fontSize="xs" fontWeight="medium">Writing</Text>
            <Text fontSize="2xs" color="gray.500">Tell stories</Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Tip */}
      <Box p={2} bg="yellow.50" borderRadius="lg">
        <Text fontSize="2xs" color="yellow.700">
          💡 Try something new every day to earn special badges!
        </Text>
      </Box>
    </VStack>
  );

  return (
    <Box p={3} h="full">
      {activeTab === 'daily-guide' && renderDailyGuide()}
      {activeTab === 'progress' && renderProgress()}
      {activeTab === 'discover' && renderDiscover()}
    </Box>
  );
}

export default ChildHomePanel;
