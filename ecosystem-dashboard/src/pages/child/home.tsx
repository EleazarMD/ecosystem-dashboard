/**
 * Child Home Page
 * 
 * Enhanced, intelligent dashboard for child accounts with:
 * - Advanced analytics and progress tracking
 * - Personalized recommendations
 * - Learning streaks and achievements
 * - Quick access to all learning tools
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Progress,
  Icon,
  useToast,
  Circle,
  Skeleton,
  Badge,
  Divider,
  CircularProgress,
  CircularProgressLabel,
  Tooltip,
  useBreakpointValue,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  useDisclosure,
} from '@chakra-ui/react';
import { FiSettings } from 'react-icons/fi';
import { FiLock, FiClock, FiTrendingUp, FiAward, FiTarget, FiZap, FiStar } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import ChildDashboardLayout from '@/components/layout/ChildDashboardLayout';
import { BackgroundContextMenu, getBackgroundStyles, BackgroundMode } from '@/components/child/BackgroundContextMenu';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useKidsPIC } from '@/hooks/useKidsPIC';

interface ChildHomeData {
  name: string;
  avatarEmoji: string;
  todayUsageMinutes: number;
  dailyLimitMinutes: number;
  remainingMinutes: number;
  messageCount: number;
  streakDays: number;
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
      serviceIcons: { chat: string; art: string; writing: string; email: string; planner?: string; clock?: string; books?: string; camera?: string };
      welcomeMessages: string[];
      widgets?: string[];
    };
  };
}

const DEFAULT_AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐶', '🐱', '🐰', '🐻', '🦖'];

// Define child services with their routes and styling
const getChildServices = (theme?: ChildHomeData['theme']) => {
  const icons = theme?.childExtras?.serviceIcons;
  const isImageIcon = (icon?: string) => icon?.startsWith('/');
  
  return [
    {
      id: 'personal-ai',
      label: 'Chat',
      icon: icons?.chat || '💬',
      isImage: isImageIcon(icons?.chat),
      path: '/child/chat',
      color: theme?.colors?.primary || '#667eea',
      description: 'Talk with AI',
    },
    {
      id: 'image-studio',
      label: 'Art Studio',
      icon: icons?.art || '🎨',
      isImage: isImageIcon(icons?.art),
      path: '/child/art-studio',
      color: theme?.colors?.accent || '#f5576c',
      description: 'Create pictures',
    },
    {
      id: 'workspace',
      label: 'Writing',
      icon: icons?.writing || '✏️',
      isImage: isImageIcon(icons?.writing),
      path: '/child/workspace',
      color: '#4facfe',
      description: 'Write stories',
    },
    {
      id: 'email-client',
      label: 'Email Helper',
      icon: icons?.email || '✉️',
      isImage: isImageIcon(icons?.email),
      path: '/child/email',
      color: '#38ef7d',
      description: 'Write emails',
    },
    {
      id: 'planner',
      label: 'My Planner',
      icon: icons?.planner || '📅',
      isImage: isImageIcon(icons?.planner),
      path: '/child/planner',
      color: '#9f7aea',
      description: 'Plan homework',
    },
  ];
};

interface ServiceItem {
  id: string;
  label: string;
  icon: string;
  isImage?: boolean;
  path: string;
  color: string;
  description: string;
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
  // Minecraft-specific styling
  const mcBg = 'rgba(245, 222, 179, 0.75)';
  const mcHoverBg = 'rgba(245, 222, 179, 0.9)';
  const mcShadow = '4px 4px 0px #5D8C3E';
  const mcHoverShadow = '6px 6px 0px #55CDFC';
  
  return (
    <Box
      as="button"
      onClick={disabled ? undefined : onClick}
      bg={isMinecraft ? mcBg : isTransparent ? 'rgba(255, 255, 255, 0.7)' : 'white'}
      borderRadius={isMinecraft ? '4px' : '2xl'}
      p={4}
      textAlign="center"
      boxShadow={isMinecraft ? mcShadow : 'md'}
      transition="all 0.2s"
      opacity={disabled ? 0.5 : 1}
      cursor={disabled ? 'not-allowed' : 'pointer'}
      backdropFilter={(isTransparent || isMinecraft) ? 'blur(8px)' : undefined}
      border={isMinecraft ? '3px solid #8B5A2B' : '2px solid transparent'}
      _hover={disabled ? {} : { 
        transform: isMinecraft ? 'translate(-2px, -2px)' : 'translateY(-4px)', 
        boxShadow: isMinecraft ? mcHoverShadow : 'xl',
        bg: isMinecraft ? mcHoverBg : isTransparent ? 'rgba(255, 255, 255, 0.85)' : 'white',
      }}
      position="relative"
      w="full"
      _active={{ borderColor: service.color }}
    >
      {disabled && (
        <Icon
          as={FiLock}
          position="absolute"
          top={3}
          right={3}
          boxSize={4}
          color="gray.400"
        />
      )}
      {/* Icon - either image or emoji */}
      {service.isImage ? (
        <Box
          mx="auto"
          mb={2}
          w="48px"
          h="48px"
          borderRadius={isMinecraft ? '4px' : 'lg'}
          overflow="hidden"
        >
          <img 
            src={service.icon} 
            alt={service.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
      ) : (
        <Circle
          size="48px"
          bg={service.color}
          mx="auto"
          mb={2}
          borderRadius={isMinecraft ? '4px' : 'full'}
        >
          <Text fontSize="lg">{service.icon}</Text>
        </Circle>
      )}
      <Text fontWeight="bold" fontSize="sm" color={isMinecraft ? '#2C2C2C' : 'gray.800'}>
        {service.label}
      </Text>
      <Text fontSize="2xs" color="gray.500" mt={0.5}>
        {service.description}
      </Text>
    </Box>
  );
}

export default function ChildHomePage() {
  const router = useRouter();
  const toast = useToast();
  const { setContext, setIsOpen, isOpen: isRightPanelOpen } = useRightPanel();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  
  // PIC integration for personalized home experience
  const { 
    profile: picProfile, 
    progress: picProgress, 
    achievements: picAchievements,
    fetchProgress,
    fetchAchievements,
  } = useKidsPIC();
  
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
  
  // PIC-powered stats
  const [picStats, setPicStats] = useState<{
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

  // Set right panel context and open it for child dashboard (desktop only)
  useEffect(() => {
    setContext('child-home');
    // Only open panel on desktop, keep closed on mobile/tablet
    if (!isMobile) {
      setIsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);
  
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
    // Load stats from localStorage immediately (synchronous)
    loadLearningStats();
    
    // Defer API call until after render
    const timer = setTimeout(() => {
      fetchHomeData();
      loadPICStats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Load PIC stats for personalized dashboard
  const loadPICStats = async () => {
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
        setPicStats(stats);
        
        // Update learning stats with PIC data
        setLearningStats(prev => ({
          ...prev,
          todayActivities: stats.totalArtworks + stats.wordsLearned + stats.pagesCreated,
          milestonesEarned: achievements?.length || 0,
        }));
      }
    } catch (error) {
      console.error('[Home] Failed to load PIC stats:', error);
    }
  };

  const loadLearningStats = () => {
    const saved = localStorage.getItem('childLearningStats');
    if (saved) {
      try {
        setLearningStats(JSON.parse(saved));
      } catch (e) {}
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
  
  // Theme colors with fallbacks - using more transparency for themed backgrounds
  const themeColors = data?.theme?.colors;
  const bgColor = themeColors?.background || '#f8fafc';
  const isPusheenTheme = data?.theme?.id === 'child-pusheen';
  const isMinecraftTheme = data?.theme?.id === 'child-minecraft';
  const hasThemedBackground = isPusheenTheme || isMinecraftTheme;
  
  // More transparent cards for better background visibility
  const cardBg = isPusheenTheme 
    ? 'rgba(255, 255, 255, 0.7)' 
    : isMinecraftTheme
    ? 'rgba(135, 206, 235, 0.7)'  // Sky blue for Minecraft (boy-friendly)
    : (themeColors?.backgroundSecondary || 'white');
  const cardBgSolid = isPusheenTheme
    ? 'rgba(255, 255, 255, 0.85)'
    : isMinecraftTheme
    ? 'rgba(135, 206, 235, 0.85)'  // Sky blue solid
    : (themeColors?.backgroundSecondary || 'white');
  const primaryColor = themeColors?.primary || '#667eea';
  const textColor = themeColors?.text || 'gray.800';
  const backgroundImages = data?.theme?.childExtras?.decorations?.backgroundImages;
  const backgroundImage = backgroundImages?.home || backgroundImages?.default;
  const bgStyles = getBackgroundStyles(bgMode);
  
  // Theme-specific styling
  const cardBorderRadius = isMinecraftTheme ? '4px' : '2xl';  // Pixelated for Minecraft
  const cardShadow = isMinecraftTheme ? '4px 4px 0px #5D8C3E' : 'sm';
  const blurEffect = hasThemedBackground ? 'blur(8px)' : undefined;

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
                    <Heading size={headingSize} color={textColor} noOfLines={1}>
                      Hi, {data?.name || 'Friend'}! {data?.theme?.childExtras?.decorations?.emoji?.[0] || '👋'}
                    </Heading>
                  )}
                  {data && (
                    <HStack mt={1} color="gray.500" fontSize={{ base: 'xs', md: 'sm' }} flexWrap="wrap" gap={1}>
                      <Text>🔥 {data.streakDays} day streak</Text>
                      {!isMobile && <Text>•</Text>}
                      {!isMobile && <Text>💬 {data.messageCount} messages today</Text>}
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

            {/* Stats Row - Time, Streak, Progress */}
            {data && (
              <SimpleGrid columns={statsColumns} spacing={{ base: 3, md: 4 }}>
                {/* Time Card */}
                <Box bg={cardBg} borderRadius={cardBorderRadius} p={4} boxShadow={cardShadow} backdropFilter={blurEffect}>
                  <HStack justify="space-between" mb={2}>
                    <HStack spacing={2}>
                      <Circle size="32px" bg={`${primaryColor}22`}>
                        <Icon as={FiClock} color={primaryColor} boxSize={4} />
                      </Circle>
                      <Text fontWeight="semibold" fontSize="sm" color={textColor}>Time Today</Text>
                    </HStack>
                    <Text 
                      fontWeight="bold" 
                      fontSize="sm"
                      color={usagePercent > 80 ? 'red.500' : usagePercent > 50 ? 'orange.500' : 'green.500'}
                    >
                      {data.remainingMinutes}m left
                    </Text>
                  </HStack>
                  <Progress
                    value={usagePercent}
                    size="sm"
                    borderRadius="full"
                    colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'orange' : 'green'}
                    bg="gray.100"
                  />
                </Box>

                {/* Streak Card */}
                <Box bg={cardBg} borderRadius={cardBorderRadius} p={4} boxShadow={cardShadow} backdropFilter={blurEffect}>
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Circle size="32px" bg="orange.100">
                        <Text fontSize="md">🔥</Text>
                      </Circle>
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color={textColor}>Streak</Text>
                        <Text fontSize="xs" color="gray.500">Keep it going!</Text>
                      </Box>
                    </HStack>
                    <VStack spacing={0}>
                      <Text fontWeight="bold" fontSize="2xl" color="orange.500">{data.streakDays}</Text>
                      <Text fontSize="2xs" color="gray.400">days</Text>
                    </VStack>
                  </HStack>
                </Box>

                {/* Today's Goal Card */}
                <Box bg={cardBg} borderRadius={cardBorderRadius} p={4} boxShadow={cardShadow} backdropFilter={blurEffect}>
                  <HStack justify="space-between">
                    <HStack spacing={2}>
                      <Circle size="32px" bg="purple.100">
                        <Icon as={FiTarget} color="purple.500" boxSize={4} />
                      </Circle>
                      <Box>
                        <Text fontWeight="semibold" fontSize="sm" color={textColor}>Today's Goal</Text>
                        <Text fontSize="xs" color="gray.500">{learningStats.currentGoal}</Text>
                      </Box>
                    </HStack>
                    <CircularProgress value={learningStats.weeklyProgress} color="purple.500" size="40px">
                      <CircularProgressLabel fontSize="2xs">{learningStats.weeklyProgress}%</CircularProgressLabel>
                    </CircularProgress>
                  </HStack>
                </Box>
              </SimpleGrid>
            )}

            {/* Time's Up Warning */}
            {isTimeUp && (
              <Box
                bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                borderRadius="2xl"
                p={8}
                color="white"
                textAlign="center"
              >
                <Text fontSize="5xl" mb={3}>😴</Text>
                <Heading size="md" mb={2}>Time's up for today!</Heading>
                <Text opacity={0.9}>Come back tomorrow for more fun!</Text>
              </Box>
            )}

            {/* Quick Insights Card */}
            {!isTimeUp && data && (
              <Box bg={cardBg} borderRadius={cardBorderRadius} p={4} boxShadow={cardShadow} backdropFilter={blurEffect}>
                <HStack justify="space-between" mb={3}>
                  <HStack spacing={2}>
                    <Icon as={FiZap} color="yellow.500" />
                    <Text fontWeight="semibold" fontSize="sm" color={textColor}>Quick Insights</Text>
                  </HStack>
                  <Badge colorScheme="green" fontSize="2xs">
                    <Icon as={FiTrendingUp} mr={1} />
                    Great progress!
                  </Badge>
                </HStack>
                <SimpleGrid columns={4} spacing={3}>
                  <Tooltip label="Messages sent today">
                    <VStack spacing={1} p={2} bg={isPusheenTheme ? 'rgba(191, 219, 254, 0.6)' : isMinecraftTheme ? 'rgba(93, 140, 62, 0.3)' : 'blue.50'} borderRadius={isMinecraftTheme ? '4px' : 'lg'}>
                      <Text fontSize="xl">{isPusheenTheme ? '🐱' : isMinecraftTheme ? '💬' : '💬'}</Text>
                      <Text fontWeight="bold" fontSize="lg" color={isMinecraftTheme ? 'green.700' : 'blue.600'}>{data.messageCount}</Text>
                      <Text fontSize="2xs" color="gray.500">Chats</Text>
                    </VStack>
                  </Tooltip>
                  <Tooltip label="Activities completed">
                    <VStack spacing={1} p={2} bg={isPusheenTheme ? 'rgba(187, 247, 208, 0.6)' : isMinecraftTheme ? 'rgba(85, 205, 252, 0.3)' : 'green.50'} borderRadius={isMinecraftTheme ? '4px' : 'lg'}>
                      <Text fontSize="xl">{isPusheenTheme ? '🌸' : isMinecraftTheme ? '⛏️' : '✅'}</Text>
                      <Text fontWeight="bold" fontSize="lg" color={isMinecraftTheme ? 'cyan.600' : 'green.600'}>{learningStats.todayActivities}</Text>
                      <Text fontSize="2xs" color="gray.500">{isMinecraftTheme ? 'Mined' : 'Done'}</Text>
                    </VStack>
                  </Tooltip>
                  <Tooltip label="Badges earned">
                    <VStack spacing={1} p={2} bg={isPusheenTheme ? 'rgba(254, 240, 138, 0.6)' : isMinecraftTheme ? 'rgba(139, 90, 43, 0.3)' : 'yellow.50'} borderRadius={isMinecraftTheme ? '4px' : 'lg'}>
                      <Text fontSize="xl">{isPusheenTheme ? '⭐' : isMinecraftTheme ? '💎' : '🏆'}</Text>
                      <Text fontWeight="bold" fontSize="lg" color={isMinecraftTheme ? 'cyan.500' : 'yellow.600'}>{learningStats.milestonesEarned}</Text>
                      <Text fontSize="2xs" color="gray.500">{isMinecraftTheme ? 'Gems' : 'Badges'}</Text>
                    </VStack>
                  </Tooltip>
                  <Tooltip label={`Next: ${learningStats.nextMilestone}`}>
                    <VStack spacing={1} p={2} bg={isPusheenTheme ? 'rgba(233, 213, 255, 0.6)' : isMinecraftTheme ? 'rgba(255, 215, 0, 0.3)' : 'purple.50'} borderRadius={isMinecraftTheme ? '4px' : 'lg'}>
                      <Text fontSize="xl">{isPusheenTheme ? '🎀' : isMinecraftTheme ? '🏆' : '⭐'}</Text>
                      <Text fontWeight="bold" fontSize="lg" color={isMinecraftTheme ? 'yellow.600' : 'purple.600'}>+1</Text>
                      <Text fontSize="2xs" color="gray.500">{isMinecraftTheme ? 'Level' : 'Next'}</Text>
                    </VStack>
                  </Tooltip>
                </SimpleGrid>
                
                {/* PIC-Powered Learning Progress */}
                {(picStats.totalArtworks > 0 || picStats.wordsLearned > 0 || picStats.pagesCreated > 0) && (
                  <>
                    <Divider my={3} />
                    <Text fontWeight="semibold" fontSize="sm" color={textColor} mb={2}>
                      {isMinecraftTheme ? '⚔️ Your Adventure Stats' : isPusheenTheme ? '🌸 Your Learning Journey' : '📊 Your Progress'}
                    </Text>
                    <SimpleGrid columns={{ base: 3, md: 6 }} spacing={2}>
                      {picStats.totalArtworks > 0 && (
                        <Tooltip label="Artworks created">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(254, 215, 226, 0.6)' : isMinecraftTheme ? 'rgba(255, 165, 0, 0.3)' : 'pink.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">🎨</Text>
                            <Text fontWeight="bold" fontSize="md" color="pink.600">{picStats.totalArtworks}</Text>
                            <Text fontSize="2xs" color="gray.500">Art</Text>
                          </VStack>
                        </Tooltip>
                      )}
                      {picStats.wordsLearned > 0 && (
                        <Tooltip label="Words learned">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(191, 219, 254, 0.6)' : isMinecraftTheme ? 'rgba(0, 191, 255, 0.3)' : 'blue.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">📚</Text>
                            <Text fontWeight="bold" fontSize="md" color="blue.600">{picStats.wordsLearned}</Text>
                            <Text fontSize="2xs" color="gray.500">Words</Text>
                          </VStack>
                        </Tooltip>
                      )}
                      {picStats.pagesCreated > 0 && (
                        <Tooltip label="Pages written">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(187, 247, 208, 0.6)' : isMinecraftTheme ? 'rgba(50, 205, 50, 0.3)' : 'green.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">✏️</Text>
                            <Text fontWeight="bold" fontSize="md" color="green.600">{picStats.pagesCreated}</Text>
                            <Text fontSize="2xs" color="gray.500">Pages</Text>
                          </VStack>
                        </Tooltip>
                      )}
                      {picStats.booksRead > 0 && (
                        <Tooltip label="Books read">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(233, 213, 255, 0.6)' : isMinecraftTheme ? 'rgba(138, 43, 226, 0.3)' : 'purple.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">📖</Text>
                            <Text fontWeight="bold" fontSize="md" color="purple.600">{picStats.booksRead}</Text>
                            <Text fontSize="2xs" color="gray.500">Books</Text>
                          </VStack>
                        </Tooltip>
                      )}
                      {picStats.journalEntries > 0 && (
                        <Tooltip label="Journal entries">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(254, 240, 138, 0.6)' : isMinecraftTheme ? 'rgba(255, 215, 0, 0.3)' : 'yellow.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">📝</Text>
                            <Text fontWeight="bold" fontSize="md" color="yellow.600">{picStats.journalEntries}</Text>
                            <Text fontSize="2xs" color="gray.500">Journal</Text>
                          </VStack>
                        </Tooltip>
                      )}
                      {picStats.tasksCompleted > 0 && (
                        <Tooltip label="Tasks completed">
                          <VStack spacing={0} p={2} bg={isPusheenTheme ? 'rgba(167, 243, 208, 0.6)' : isMinecraftTheme ? 'rgba(0, 128, 0, 0.3)' : 'teal.50'} borderRadius={isMinecraftTheme ? '4px' : 'md'}>
                            <Text fontSize="md">✅</Text>
                            <Text fontWeight="bold" fontSize="md" color="teal.600">{picStats.tasksCompleted}</Text>
                            <Text fontSize="2xs" color="gray.500">Tasks</Text>
                          </VStack>
                        </Tooltip>
                      )}
                    </SimpleGrid>
                  </>
                )}
                
                {/* Recent Achievements */}
                {picStats.recentAchievements.length > 0 && (
                  <>
                    <Divider my={3} />
                    <Text fontWeight="semibold" fontSize="sm" color={textColor} mb={2}>
                      {isMinecraftTheme ? '🏆 Recent Achievements' : isPusheenTheme ? '⭐ Your Badges' : '🎖️ Recent Achievements'}
                    </Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {picStats.recentAchievements.map((achievement: any, idx: number) => (
                        <Tooltip key={idx} label={achievement.description || achievement.name}>
                          <Badge 
                            colorScheme={achievement.category === 'art' ? 'pink' : achievement.category === 'vocabulary' ? 'blue' : 'purple'}
                            px={2} 
                            py={1} 
                            borderRadius={isMinecraftTheme ? '4px' : 'full'}
                            fontSize="xs"
                          >
                            {achievement.icon || '🏅'} {achievement.name}
                          </Badge>
                        </Tooltip>
                      ))}
                    </HStack>
                  </>
                )}
              </Box>
            )}

            {/* Activities Section */}
            {!isTimeUp && (
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Text fontWeight="semibold" color={textColor} fontSize="lg">
                    What do you want to do? {data?.theme?.childExtras?.decorations?.emoji?.[1] || '✨'}
                  </Text>
                  <Badge colorScheme="purple" fontSize="xs">
                    <Icon as={FiStar} mr={1} />
                    {getChildServices(data?.theme).length} activities
                  </Badge>
                </HStack>
                
                <SimpleGrid columns={activityColumns} spacing={{ base: 3, md: 4 }}>
                  {getChildServices(data?.theme).map((service) => (
                    <ActivityCard
                      key={service.id}
                      service={service}
                      onClick={() => handleServiceClick(service)}
                      disabled={isTimeUp || false}
                      isTransparent={isPusheenTheme}
                      isMinecraft={isMinecraftTheme}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {/* Daily Tip */}
            {!isTimeUp && (
              <Box 
                bg={isPusheenTheme 
                  ? 'linear-gradient(135deg, #8B7355 0%, #A0826D 100%)' 
                  : isMinecraftTheme
                  ? 'linear-gradient(135deg, #5D8C3E 0%, #4E7A33 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                } 
                borderRadius={isMinecraftTheme ? '4px' : '2xl'}
                boxShadow={isMinecraftTheme ? '4px 4px 0px #8B5A2B' : undefined}
                p={4}
                color="white"
              >
                <HStack spacing={3}>
                  <Circle size="40px" bg="whiteAlpha.200" borderRadius={isMinecraftTheme ? '4px' : 'full'}>
                    <Text fontSize="xl">{isPusheenTheme ? '🐱' : isMinecraftTheme ? '⛏️' : '💡'}</Text>
                  </Circle>
                  <Box>
                    <Text fontWeight="bold" fontSize="sm">
                      {isPusheenTheme ? 'Pusheen Says...' : isMinecraftTheme ? 'Quest of the Day!' : 'Tip of the Day'}
                    </Text>
                    <Text fontSize="sm" opacity={0.9}>
                      {isPusheenTheme 
                        ? "Let's create something purrfect today! Try the Art Studio to make cute drawings! 🎨✨"
                        : isMinecraftTheme
                        ? "Time to mine some knowledge! 💎 Complete 3 activities to earn a Diamond Badge! ⛏️"
                        : 'Try creating something in the Art Studio today! Drawing helps your brain grow stronger! 🎨'
                      }
                    </Text>
                  </Box>
                </HStack>
              </Box>
            )}

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
