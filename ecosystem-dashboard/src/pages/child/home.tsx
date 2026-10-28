/**
 * Child Home Page — Brilliant-style skill dashboard.
 *
 * Features:
 * - Streak header with level, time remaining, and daily goal ring
 * - Today's Mission hero card (adaptive based on child's progress)
 * - Active courses grid with mastery progress bars
 * - Daily challenge card
 * - Explore More tiles for all other activities
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  KNOWN_ACTIVITY_IDS,
  useActivityContext,
  createHomeContextProvider,
} from '@/domains/learning/shared/activity-registry';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  useToast,
  Circle,
  Skeleton,
  Badge,
  Divider,
  Tooltip,
  useBreakpointValue,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useKidsPCG } from '@/hooks/useKidsPCG';
import { SkillDashboard } from '@/components/child/SkillDashboard';
import { ActivityTile } from '@/components/child/premium';
import TeksBadgesCard from '@/components/child/TeksBadgesCard';
import AssignedLessonsCard from '@/components/child/AssignedLessonsCard';

interface ChildHomeData {
  name: string;
  avatarEmoji: string;
  todayUsageMinutes: number;
  dailyLimitMinutes: number;
  remainingMinutes: number;
  messageCount: number;
  streakDays: number;
  weeklyData?: Array<{ day: string; minutes: number; date: string }>;
  allowedServices?: string[];
  themeId?: string;
  theme?: {
    id: string;
    name: string;
    colors: {
      primary: string;
      accent: string;
      background: string;
      backgroundSecondary: string;
      text: string;
    };
    childExtras: {
      avatar: { default: string; options: string[] };
      decorations: { 
        emoji: string[]; 
        cardStyle: string; 
        backgroundImages?: { home?: string; chat?: string; email?: string; default?: string };
      };
      serviceIcons: { chat: string; art: string; writing: string; email: string; planner?: string; clock?: string; books?: string; camera?: string; research?: string; dictionary?: string; journal?: string };
      welcomeMessages: string[];
      widgets?: string[];
    };
  };
}

const DEFAULT_AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐶', '🐱', '🐰', '🐻', '🦖'];

// Define child services with their routes and styling, organized by category
const getChildServices = (theme?: ChildHomeData['theme']) => {
  const icons = theme?.childExtras?.serviceIcons;
  const isImageIcon = (icon?: string) => icon?.startsWith('/');

  return [
    {
      id: 'learn',
      label: 'Learn',
      icon: '🧠',
      isImage: false,
      path: '/child/learn',
      color: '#43e97b',
      description: "Today's plan",
      category: 'learning' as const,
      badge: 'HOT',
    },
    {
      id: 'math-lab',
      label: 'Math Lab',
      icon: '🧮',
      isImage: false,
      path: '/child/math-lab',
      color: '#3182CE',
      description: 'Numbers & logic',
      category: 'learning' as const,
      badge: 'NEW',
    },
    {
      id: 'reading-lab',
      label: 'Reading Lab',
      icon: '📖',
      isImage: false,
      path: '/child/reading-lab',
      color: '#805AD5',
      description: 'Comprehension',
      category: 'learning' as const,
      badge: 'NEW',
    },
    {
      id: 'science-lab',
      label: 'Science Lab',
      icon: '🔬',
      isImage: false,
      path: '/child/science-lab',
      color: '#38A169',
      description: 'Discover & explore',
      category: 'learning' as const,
      badge: 'NEW',
    },
    {
      id: 'learning-path',
      label: 'My Path',
      icon: '🗺️',
      isImage: false,
      path: '/child/learning-path',
      color: '#fa709a',
      description: 'Learning adventure',
      category: 'learning' as const,
    },
    {
      id: 'teams',
      label: 'My Teams',
      icon: '👥',
      isImage: false,
      path: '/child/teams',
      color: '#30cfd0',
      description: 'Learn together',
      category: 'learning' as const,
    },
    {
      id: 'pokemon-lab',
      label: 'Pokemon Lab',
      icon: '⚡',
      isImage: false,
      path: '/child/pokemon-lab',
      color: '#3b7dd8',
      description: 'Learn graphs',
      category: 'learning' as const,
      badge: '12 lessons',
    },
    {
      id: 'personal-ai',
      label: 'Research',
      icon: icons?.research || '🔍',
      isImage: isImageIcon(icons?.research),
      path: '/child/research',
      color: theme?.colors?.primary || '#667eea',
      description: 'Research & explore',
      category: 'creative' as const,
    },
    {
      id: 'image-studio',
      label: 'Art Studio',
      icon: icons?.art || '🎨',
      isImage: isImageIcon(icons?.art),
      path: '/child/art-studio',
      color: theme?.colors?.accent || '#f5576c',
      description: 'Create pictures',
      category: 'creative' as const,
    },
    {
      id: 'workspace',
      label: 'Writing',
      icon: icons?.writing || '✏️',
      isImage: isImageIcon(icons?.writing),
      path: '/child/workspace',
      color: '#4facfe',
      description: 'Write stories',
      category: 'creative' as const,
    },
    {
      id: 'books',
      label: 'Books',
      icon: icons?.books || '📚',
      isImage: isImageIcon(icons?.books),
      path: '/child/books',
      color: '#a78bfa',
      description: 'Read stories',
      category: 'creative' as const,
      isNew: true,
    },
    {
      id: 'dictionary',
      label: 'Dictionary',
      icon: '📖',
      isImage: false,
      path: '/child/dictionary',
      color: '#f59e0b',
      description: 'Learn words',
      category: 'learning' as const,
    },
    {
      id: 'journal',
      label: 'Journal',
      icon: '📝',
      isImage: false,
      path: '/child/journal',
      color: '#34d399',
      description: 'Daily diary',
      category: 'creative' as const,
    },
    {
      id: 'email-client',
      label: 'Email Helper',
      icon: icons?.email || '✉️',
      isImage: isImageIcon(icons?.email),
      path: '/child/email',
      color: '#38ef7d',
      description: 'Write emails',
      category: 'productivity' as const,
    },
    {
      id: 'planner',
      label: 'My Planner',
      icon: icons?.planner || '📅',
      isImage: isImageIcon(icons?.planner),
      path: '/child/planner',
      color: '#9f7aea',
      description: 'Plan homework',
      category: 'productivity' as const,
    },
  ]
};

interface ServiceItem {
  id: string;
  label: string;
  icon: string;
  isImage?: boolean;
  path: string;
  color: string;
  description: string;
  category: 'learning' | 'creative' | 'productivity';
  badge?: string;
  isNew?: boolean;
}

function ActivityCard({ 
  service, 
  onClick, 
  disabled,
  isTransparent = false,
  isMinecraft = false,
}: { 
  service: ServiceItem; 
  onClick: () => void;
  disabled?: boolean;
  isTransparent?: boolean;
  isMinecraft?: boolean;
}) {
  return (
    <ActivityTile
      emoji={service.icon}
      label={service.label}
      description={service.description}
      color={service.color}
      disabled={disabled}
      isMinecraft={isMinecraft}
      isTransparent={isTransparent}
      badge={service.badge}
      isNew={service.isNew}
      onClick={onClick}
      isImage={service.isImage}
    />
  );
}

export default function ChildHomePage() {
  const router = useRouter();
  const toast = useToast();
  const { setContext, setIsOpen, isOpen: isRightPanelOpen } = useRightPanel();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();

  // Register Home context provider with the Context Hub
  const homeStateRef = useRef({ childName: '' });
  useActivityContext(KNOWN_ACTIVITY_IDS.HOME, () => createHomeContextProvider(homeStateRef));
  
  // PCG integration for personalized home experience
  const { 
    fetchProgress,
    fetchAchievements,
  } = useKidsPCG();
  
  // Mobile/tablet responsive values
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });
  const containerPadding = useBreakpointValue({ base: 3, md: 6 });
  const headingSize = useBreakpointValue({ base: 'md', md: 'lg' });
  const avatarSize = useBreakpointValue({ base: '50px', md: '60px' });
  const cardPadding = useBreakpointValue({ base: 3, md: 4, lg: 6 });
  const statsColumns = useBreakpointValue({ base: 1, sm: 2, md: 3 });
  const activityColumns = useBreakpointValue({ base: 2, sm: 3, md: 4, lg: 5 });
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChildHomeData | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState('🦊');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [learningStats, setLearningStats] = useState({
    todayActivities: 0,
    weeklyProgress: 0,
    currentGoal: 'Complete 3 activities today!',
    nextMilestone: 'Art Master',
    milestonesEarned: 0,
  });
  
  // PCG-powered stats
  const [pcgStats, setPcgStats] = useState<{
    totalArtworks: number;
    wordsLearned: number;
    pagesCreated: number;
    chatSessions: number;
    booksRead: number;
    journalEntries: number;
    tasksCompleted: number;
    currentStreak: number;
    recentAchievements: any[];
  }>({
    totalArtworks: 0,
    wordsLearned: 0,
    pagesCreated: 0,
    chatSessions: 0,
    booksRead: 0,
    journalEntries: 0,
    tasksCompleted: 0,
    currentStreak: 0,
    recentAchievements: [],
  });

  // Set right panel context — panel stays closed by default; user opens via right-rail buttons
  useEffect(() => {
    setContext('child-home');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Toggle right panel for mobile
  const handleTogglePanel = () => {
    if (isMobile) {
      onDrawerOpen();
    } else {
      setIsOpen(!isRightPanelOpen);
    }
  };

  // Defer data fetching to speed up initial render
  useEffect(() => {
    // Defer API call until after render — all stats come from PCG/API now
    const timer = setTimeout(() => {
      fetchHomeData();
      loadPCGStats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Load PCG stats for personalized dashboard — replaces localStorage zeros
  const loadPCGStats = async () => {
    try {
      const progress = await fetchProgress();
      const achievements = await fetchAchievements();
      
      if (progress && progress.length > 0) {
        const stats = {
          totalArtworks: progress.find((p: any) => p.metricName === 'artworks_created')?.currentValue || 0,
          wordsLearned: progress.find((p: any) => p.metricName === 'words_learned')?.currentValue || 0,
          pagesCreated: progress.find((p: any) => p.metricName === 'pages_created')?.currentValue || 0,
          chatSessions: progress.find((p: any) => p.metricName === 'chat_sessions')?.currentValue || 0,
          booksRead: progress.find((p: any) => p.metricName === 'books_read')?.currentValue || 0,
          journalEntries: progress.find((p: any) => p.metricName === 'journal_entries')?.currentValue || 0,
          tasksCompleted: progress.find((p: any) => p.metricName === 'tasks_completed')?.currentValue || 0,
          currentStreak: Math.max(...progress.map((p: any) => p.streakCount || 0), 0),
          recentAchievements: achievements?.slice(0, 3) || [],
        };
        setPcgStats(stats);
        
        // Derive today's activities from all PCG metrics (real data, not localStorage)
        const totalActivities = stats.totalArtworks + stats.wordsLearned + stats.pagesCreated + stats.chatSessions + stats.booksRead + stats.journalEntries + stats.tasksCompleted;
        setLearningStats(prev => ({
          ...prev,
          todayActivities: totalActivities,
          milestonesEarned: achievements?.length || 0,
        }));
      }
    } catch (error) {
      console.error('[Home] Failed to load PCG stats:', error);
    }
  };


  const fetchHomeData = async () => {
    try {
      const res = await fetch('/api/child/dashboard');
      const result = await res.json();
      if (res.ok) {
        setData(result);
        if (result.avatarEmoji) {
          setAvatarEmoji(result.avatarEmoji);
        }
      }
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (service: ServiceItem) => {
    if (data && data.remainingMinutes <= 0) {
      toast({
        title: "⏰ Time's up!",
        description: "Come back tomorrow for more fun!",
        status: 'warning',
        duration: 3000,
      });
      return;
    }
    router.push(service.path);
  };

  const handleAvatarChange = async (emoji: string) => {
    setAvatarEmoji(emoji);
    setShowAvatarPicker(false);
    
    try {
      await fetch('/api/child/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarEmoji: emoji }),
      });
    } catch (error) {
      console.error('Failed to save avatar:', error);
    }
  };

  const isTimeUp = data && data.remainingMinutes <= 0;
  const usagePercent = data ? Math.min(100, (data.todayUsageMinutes / data.dailyLimitMinutes) * 100) : 0;
  
  // Background mode state - load from localStorage
  const [bgMode, setBgMode] = useState<BackgroundMode>('cover');
  
  useEffect(() => {
    const saved = localStorage.getItem('childBgMode');
    if (saved) setBgMode(saved as BackgroundMode);
  }, []);
  
  const handleBgModeChange = (mode: BackgroundMode) => {
    setBgMode(mode);
    localStorage.setItem('childBgMode', mode);
  };
  
  // Theme colors with fallbacks
  const themeColors = data?.theme?.colors;
  const bgColor = themeColors?.background || '#f8fafc';
  const isPusheenTheme = data?.theme?.id === 'child-pusheen';
  const isMinecraftTheme = data?.theme?.id === 'child-minecraft';
  const hasThemedBackground = isPusheenTheme || isMinecraftTheme;
  const primaryColor = themeColors?.primary || '#667eea';
  const textColor = themeColors?.text || 'gray.800';
  const backgroundImages = data?.theme?.childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.home || backgroundImages?.default;
  const bgStyles = getBackgroundStyles(bgMode);
  const blurEffect = hasThemedBackground ? 'blur(8px)' : undefined;
  const cardBgSolid = isPusheenTheme
    ? 'rgba(255, 255, 255, 0.95)'
    : isMinecraftTheme
    ? '#D6D6D6'
    : (themeColors?.backgroundSecondary || 'white');
  const cardBorderRadius = isMinecraftTheme ? '2px' : '2xl';
  const cardShadow = isMinecraftTheme
    ? 'inset -3px -3px 0px rgba(0,0,0,0.28), inset 3px 3px 0px rgba(255,255,255,0.45), 4px 4px 0px rgba(0,0,0,0.3)'
    : 'sm';

  // Derive level/XP from PCG progress (every activity = 10 XP, 100 XP per level)
  const { level, xp, xpToNext } = useMemo(() => {
    const totalXP = pcgStats.totalArtworks * 15
      + pcgStats.wordsLearned * 5
      + pcgStats.pagesCreated * 20
      + pcgStats.chatSessions * 5
      + pcgStats.booksRead * 25
      + pcgStats.journalEntries * 10
      + pcgStats.tasksCompleted * 10
      + (pcgStats.recentAchievements?.length || 0) * 50;
    const lvl = Math.floor(totalXP / 100) + 1;
    const xpInLevel = totalXP % 100;
    return { level: lvl, xp: xpInLevel, xpToNext: 100 };
  }, [pcgStats]);

  // Derive SkillDashboard props from real PCG/API data
  const dashboardProps = useMemo(() => ({
    childName: data?.name || 'Friend',
    streakDays: data?.streakDays || pcgStats.currentStreak || 0,
    remainingMinutes: data?.remainingMinutes || 0,
    dailyLimitMinutes: data?.dailyLimitMinutes || 0,
    todayUsageMinutes: data?.todayUsageMinutes || 0,
    todayActivities: learningStats.todayActivities,
    dailyGoal: 3,
    level,
    xp,
    xpToNext,
    pcgStats,
    loading,
    isTimeUp: !!isTimeUp,
    onNavigate: (path: string) => router.push(path),
  }), [data, learningStats.todayActivities, pcgStats, loading, isTimeUp, router, level, xp, xpToNext]);

  return (
    <ChildDashboardLayout pageType="home">
      <BackgroundContextMenu onModeChange={handleBgModeChange} currentMode={bgMode}>
      <Box 
        minH="calc(100vh - 60px)" 
        bg={bgColor} 
        py={{ base: 3, md: 6 }}
        pb={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 6 }}
        backgroundImage={backgroundImage ? `url(${backgroundImage})` : undefined}
        backgroundRepeat={bgStyles.backgroundRepeat}
        backgroundSize={bgStyles.backgroundSize}
        backgroundPosition={bgStyles.backgroundPosition}
        backgroundAttachment={bgStyles.backgroundAttachment}
        css={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Mobile Settings Button */}
        {isMobile && (
          <IconButton
            icon={<FiSettings />}
            aria-label="Settings"
            position="fixed"
            bottom={{ base: 'calc(env(safe-area-inset-bottom) + 16px)', md: 4 }}
            right={4}
            zIndex={100}
            size="lg"
            colorScheme="purple"
            borderRadius="full"
            boxShadow="lg"
            onClick={handleTogglePanel}
          />
        )}
        
        <Container maxW="container.lg" px={{ base: 3, md: 4 }}>
          <VStack spacing={{ base: 4, md: 6 }} align="stretch">
            
            {/* Welcome Header */}
            <Box
              bg={cardBgSolid}
              borderRadius={cardBorderRadius}
              p={cardPadding}
              boxShadow={cardShadow}
              border={isMinecraftTheme ? '3px solid' : '2px solid'}
              borderColor={primaryColor}
              backdropFilter={blurEffect}
            >
              <HStack spacing={{ base: 3, md: 4 }}>
                {/* Avatar - supports both emoji and image */}
                <Box
                  as="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  bg={`${primaryColor}22`}
                  borderRadius="full"
                  w={avatarSize}
                  h={avatarSize}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  transition="all 0.2s"
                  overflow="hidden"
                  flexShrink={0}
                  _hover={{ transform: 'scale(1.05)', opacity: 0.8 }}
                >
                  {avatarEmoji.startsWith('/') ? (
                    <img 
                      src={avatarEmoji} 
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <Text fontSize="3xl">{avatarEmoji}</Text>
                  )}
                </Box>
                <Box flex={1}>
                  {loading ? (
                    <Skeleton height="28px" width="200px" />
                  ) : (
                    <Heading size={headingSize} color={textColor} noOfLines={1} letterSpacing="-0.02em">
                      Hi, {data?.name || 'Friend'}! {data?.theme?.childExtras?.decorations?.emoji?.[0] || '👋'}
                    </Heading>
                  )}
                  {data && (
                    <HStack mt={1} color="gray.500" fontSize={{ base: 'xs', md: 'sm' }} flexWrap="wrap" gap={1}>
                      <Text fontWeight="600">🔥 {data.streakDays} day streak</Text>
                      {!isMobile && <Text>•</Text>}
                      {!isMobile && <Text fontWeight="600">💬 {data.messageCount} messages today</Text>}
                    </HStack>
                  )}
                </Box>
              </HStack>

              {/* Avatar Picker */}
              {showAvatarPicker && (
                <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.100">
                  <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>
                    Choose your avatar:
                  </Text>
                  <HStack spacing={2} wrap="wrap">
                    {(data?.theme?.childExtras?.avatar?.options || DEFAULT_AVATAR_EMOJIS).map((avatarOption) => (
                      <Box
                        key={avatarOption}
                        as="button"
                        onClick={() => handleAvatarChange(avatarOption)}
                        p={1}
                        borderRadius="lg"
                        bg={avatarOption === avatarEmoji ? 'purple.100' : 'gray.50'}
                        border="2px solid"
                        borderColor={avatarOption === avatarEmoji ? 'purple.300' : 'transparent'}
                        transition="all 0.15s"
                        _hover={{ transform: 'scale(1.1)', bg: 'purple.50' }}
                        w="44px"
                        h="44px"
                        overflow="hidden"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {avatarOption.startsWith('/') ? (
                          <img 
                            src={avatarOption} 
                            alt="Avatar option"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        ) : (
                          <Text fontSize="xl">{avatarOption}</Text>
                        )}
                      </Box>
                    ))}
                  </HStack>
                </Box>
              )}
            </Box>

            {/* Brilliant-style Skill Dashboard */}
            <SkillDashboard {...dashboardProps} />

            {/* Lessons the family assigned (published, from the lesson pipeline) */}
            <AssignedLessonsCard />

            {/* TEKS badges from paper worksheet practice */}
            <TeksBadgesCard />

          </VStack>
        </Container>
      </Box>
      </BackgroundContextMenu>
    </ChildDashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  const user = session.user as any;
  if (user.accountType !== 'child') {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
