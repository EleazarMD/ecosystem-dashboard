/**
 * Child Home Right Panel
 * 
 * Enhanced kid-friendly panel with agentic features:
 * - Daily Guide: Personalized recommendations and today's focus
 * - Progress: Learning analytics and achievements
 * - Discover: New tools and learning opportunities
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChildTutorTab } from './ChildTutorTab';
import { KNOWN_ACTIVITY_IDS } from '@/domains/learning/shared/activity-registry';
import { useChildTheme } from './ChildThemeProvider';
import { StreakFlame, DailyGoalRing, LevelChip, MasteryBar, DailyMissionCard } from './learning-kit';
import { useKidsPCG } from '@/hooks/useKidsPCG';
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
  Tooltip,
  useToast,
  InputGroup,
  InputRightElement,
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
  const { colors } = useChildTheme();
  const { fetchProgress, fetchAchievements } = useKidsPCG();

  // Daily Guide state
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: "Good morning! 🌟 I'm your Learning Buddy! Ready to have an amazing day? Let me help you plan your activities!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyTip, setDailyTip] = useState(DAILY_TIPS[0]);

  // Progress state — derived from PCG API
  const [goals, setGoals] = useState<LearningGoal[]>(LEARNING_GOALS);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);
  const [weeklyStats, setWeeklyStats] = useState({ totalMinutes: 0, activitiesCompleted: 0, streak: 0 });
  const [pcgLevel, setPcgLevel] = useState({ level: 1, xp: 0, xpToNext: 100 });

  // Load real data from PCG API
  const loadPCGData = useCallback(async () => {
    try {
      const [progress, pcgAchievements] = await Promise.all([
        fetchProgress(),
        fetchAchievements(),
      ]);

      if (progress && progress.length > 0) {
        const artworks = progress.find((p: any) => p.metricName === 'artworks_created')?.currentValue || 0;
        const words = progress.find((p: any) => p.metricName === 'words_learned')?.currentValue || 0;
        const pages = progress.find((p: any) => p.metricName === 'pages_created')?.currentValue || 0;
        const tasks = progress.find((p: any) => p.metricName === 'tasks_completed')?.currentValue || 0;
        const books = progress.find((p: any) => p.metricName === 'books_read')?.currentValue || 0;
        const journal = progress.find((p: any) => p.metricName === 'journal_entries')?.currentValue || 0;
        const streak = Math.max(...progress.map((p: any) => p.streakCount || 0), 0);

        // Update goals with real PCG data
        setGoals([
          { id: '1', title: 'Reading Time', emoji: '📖', progress: books * 15, target: 30, unit: 'min' },
          { id: '2', title: 'Words Learned', emoji: '🧠', progress: words, target: 20, unit: 'words' },
          { id: '3', title: 'Stories Written', emoji: '✍️', progress: pages, target: 3, unit: 'stories' },
          { id: '4', title: 'Art Created', emoji: '🎨', progress: artworks, target: 5, unit: 'pictures' },
        ]);

        // Derive level/XP from PCG metrics
        const totalXP = artworks * 15 + words * 5 + pages * 20 + tasks * 10 + books * 25 + journal * 10;
        const lvl = Math.floor(totalXP / 100) + 1;
        setPcgLevel({ level: lvl, xp: totalXP % 100, xpToNext: 100 });

        // Update weekly stats
        const totalActivities = artworks + words + pages + tasks + books + journal;
        setWeeklyStats({
          totalMinutes: Math.round(totalActivities * 5), // estimate 5 min per activity
          activitiesCompleted: totalActivities,
          streak,
        });
      }

      // Map PCG achievements to panel achievements
      if (pcgAchievements && pcgAchievements.length > 0) {
        const mapped: Achievement[] = pcgAchievements.slice(0, 6).map((a: any, i: number) => ({
          id: a.id || String(i),
          title: a.title || a.achievementCode || 'Badge',
          emoji: a.icon || '🏅',
          description: a.description || '',
          earned: true,
          earnedDate: a.earnedAt ? new Date(a.earnedAt).toLocaleDateString() : undefined,
        }));
        setAchievements(mapped);
      }
    } catch (error) {
      console.error('[ChildHomePanel] Failed to load PCG data:', error);
    }
  }, [fetchProgress, fetchAchievements]);

  useEffect(() => {
    setDailyTip(DAILY_TIPS[Math.floor(Math.random() * DAILY_TIPS.length)]);
    loadPCGData();
  }, [loadPCGData]);

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
      const res = await fetch('/api/child/companion/agent-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          activityId: 'home',
          intent: 'talk',
          contextState: {
            context: `You are a friendly Learning Buddy for kids! Help them plan their day and suggest fun learning activities.
            Be encouraging and use simple language. Add emojis to be fun!
            Suggest specific activities they can do in the app (Chat, Art Studio, Writing, Planner).
            Keep responses short (2-3 sentences) and exciting!`,
            service: 'learning-buddy',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        throw new Error('API error');
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I had trouble connecting just now. Please try again in a moment! 🔄',
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

      {/* Daily Mission — hero card */}
      <DailyMissionCard compact />

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
    const earnedCount = achievements.filter(a => a.earned).length;
    
    return (
      <VStack spacing={4} align="stretch">
        {/* Gamification header */}
        <HStack justify="space-between" px={1}>
          <HStack spacing={2}>
            <StreakFlame days={weeklyStats.streak} size="sm" />
            <LevelChip level={pcgLevel.level} xp={pcgLevel.xp} xpToNext={pcgLevel.xpToNext} />
          </HStack>
          <DailyGoalRing value={weeklyStats.activitiesCompleted} goal={5} size={56} label="Today" />
        </HStack>

        <Divider />

        {/* Learning Goals */}
        <Box>
          <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em" mb={3} color={colors.textSecondary}>🎯 Learning Goals</Text>
          <VStack spacing={2.5} align="stretch" maxH="120px" overflowY="auto">
            {goals.map((goal) => (
              <Box key={goal.id} p={3} bg={colors.backgroundTertiary} borderRadius="lg">
                <HStack justify="space-between" mb={1.5}>
                  <HStack>
                    <Text>{goal.emoji}</Text>
                    <Text fontSize="xs" fontWeight="600" color={colors.text}>{goal.title}</Text>
                  </HStack>
                  <Text fontSize="2xs" color={colors.textMuted}>
                    {goal.progress}/{goal.target} {goal.unit}
                  </Text>
                </HStack>
                <MasteryBar
                  value={(goal.progress / goal.target) * 100}
                  segments={5}
                  showPercent={false}
                  size="sm"
                />
              </Box>
            ))}
          </VStack>
        </Box>

        <Divider />

        {/* Achievements */}
        <Box>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" fontWeight="700" letterSpacing="0.02em" color={colors.textSecondary}>🏆 Achievements</Text>
            <Badge colorScheme="purple" fontSize="2xs">{earnedCount}/{achievements.length}</Badge>
          </HStack>
          <SimpleGrid columns={3} spacing={2} maxH="100px" overflowY="auto">
            {achievements.slice(0, 6).map((achievement) => (
              <Tooltip key={achievement.id} label={achievement.description}>
                <Box
                  p={2}
                  bg={achievement.earned ? `${colors.accent}22` : colors.backgroundTertiary}
                  borderRadius="lg"
                  textAlign="center"
                  opacity={achievement.earned ? 1 : 0.5}
                  cursor="pointer"
                >
                  <Text fontSize="xl">{achievement.emoji}</Text>
                  <Text fontSize="2xs" noOfLines={1} color={colors.text}>{achievement.title}</Text>
                </Box>
              </Tooltip>
            ))}
          </SimpleGrid>
        </Box>

        {/* Weekly Summary */}
        <Box p={3} bg={`${colors.primary}11`} borderRadius="lg">
          <Text fontSize="xs" fontWeight="700" color={colors.primary} mb={1.5}>📅 This Week</Text>
          <HStack justify="space-around">
            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="800" color={colors.primary}>{weeklyStats.totalMinutes}</Text>
              <Text fontSize="2xs" color={colors.textMuted}>Minutes</Text>
            </VStack>
            <VStack spacing={0}>
              <Text fontSize="sm" fontWeight="800" color={colors.primary}>{weeklyStats.activitiesCompleted}</Text>
              <Text fontSize="2xs" color={colors.textMuted}>Activities</Text>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    );
  };

  // Render Discover tab
  const renderDiscover = () => (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={3}>
          <Text fontSize="2xl">🔍</Text>
          <Box>
            <Text fontWeight="700" fontSize="sm" color={colors.text}>Discover</Text>
            <Text fontSize="xs" color={colors.textMuted}>Find new things to learn!</Text>
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
    <Box p={activeTab === 'chat' ? 0 : 3} h="full">

      {activeTab === 'chat' && (
        <Box h="full" display="flex" flexDirection="column">
          <ChildTutorTab
            defaultActivityId={KNOWN_ACTIVITY_IDS.LEARN_HUB}
            defaultTitle="Learning Buddy"
          />
        </Box>
      )}
      {activeTab === 'daily-guide' && renderDailyGuide()}
      {activeTab === 'progress' && renderProgress()}
      {activeTab === 'discover' && renderDiscover()}
    </Box>
  );
}

export default ChildHomePanel;
