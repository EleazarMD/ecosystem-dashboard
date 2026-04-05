/**
 * Child Dashboard Component
 * 
 * A fun, engaging dashboard for child accounts with usage tracking,
 * available services, and achievement badges
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
  Avatar,
  Button,
  Progress,
  Icon,
  Badge,
  useToast,
  Spinner,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiMessageSquare,
  FiImage,
  FiBook,
  FiMusic,
  FiStar,
  FiClock,
  FiLock,
  FiHeart,
} from 'react-icons/fi';
import { useChildTheme } from './ChildThemeProvider';

interface ChildDashboardData {
  name: string;
  avatarEmoji: string;
  todayUsageMinutes: number;
  dailyLimitMinutes: number;
  remainingMinutes: number;
  messageCount: number;
  streakDays: number;
  achievements: Achievement[];
  allowedServices: ServiceCard[];
  blockedServices: string[];
}

interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earnedAt: string;
}

interface ServiceCard {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  isAvailable: boolean;
  requiresApproval?: boolean;
}

const AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐶', '🐱', '🐰', '🐻', '🦖'];

const SERVICE_EMOJIS: Record<string, { emoji: string; color: string }> = {
  'workspace': { emoji: '📝', color: 'blue' },
  'goosemind-chat': { emoji: '🤖', color: 'purple' },
  'calendar': { emoji: '📅', color: 'green' },
  'image-studio': { emoji: '🎨', color: 'pink' },
  'research-lab': { emoji: '🔬', color: 'teal' },
  'podcast-studio': { emoji: '🎙️', color: 'orange' },
};

function FunCard({ children, gradient, ...props }: any) {
  return (
    <Box
      bg={gradient || 'white'}
      borderRadius="2xl"
      p={6}
      boxShadow="xl"
      transition="all 0.3s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: '2xl' }}
      {...props}
    >
      {children}
    </Box>
  );
}

function UsageMeter({ used, total }: { used: number; total: number }) {
  const percent = Math.min(100, (used / total) * 100);
  const remaining = Math.max(0, total - used);
  
  const getColor = () => {
    if (percent > 80) return 'red';
    if (percent > 50) return 'orange';
    return 'green';
  };

  return (
    <FunCard gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
      <VStack spacing={4} color="white">
        <HStack>
          <Icon as={FiClock} boxSize={6} />
          <Heading size="md">Time Today</Heading>
        </HStack>
        
        <Box position="relative" w="150px" h="150px">
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="10"
              strokeDasharray={`${percent * 2.83} 283`}
              strokeLinecap="round"
            />
          </svg>
          <VStack
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            spacing={0}
          >
            <Text fontSize="3xl" fontWeight="bold">{used}</Text>
            <Text fontSize="sm" opacity={0.8}>minutes</Text>
          </VStack>
        </Box>
        
        <VStack spacing={1}>
          <Text fontSize="lg" fontWeight="medium">
            {remaining} minutes left! ⏰
          </Text>
          <Text fontSize="sm" opacity={0.8}>
            out of {total} minutes today
          </Text>
        </VStack>
      </VStack>
    </FunCard>
  );
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  return (
    <Tooltip label={achievement.description} placement="top">
      <Box
        bg="white"
        borderRadius="xl"
        p={3}
        textAlign="center"
        boxShadow="md"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{ transform: 'scale(1.1)' }}
      >
        <Text fontSize="2xl">{achievement.emoji}</Text>
        <Text fontSize="xs" fontWeight="medium" mt={1}>
          {achievement.name}
        </Text>
      </Box>
    </Tooltip>
  );
}

function ServiceButton({ service, onClick }: { service: ServiceCard; onClick: () => void }) {
  const config = SERVICE_EMOJIS[service.id] || { emoji: '🔧', color: 'gray' };
  
  return (
    <Box
      as="button"
      onClick={onClick}
      bg={service.isAvailable ? 'white' : 'gray.100'}
      borderRadius="2xl"
      p={5}
      textAlign="center"
      boxShadow="lg"
      transition="all 0.3s"
      opacity={service.isAvailable ? 1 : 0.6}
      cursor={service.isAvailable ? 'pointer' : 'not-allowed'}
      _hover={service.isAvailable ? { transform: 'scale(1.05)', boxShadow: 'xl' } : {}}
      position="relative"
    >
      {!service.isAvailable && (
        <Icon
          as={FiLock}
          position="absolute"
          top={2}
          right={2}
          color="gray.400"
        />
      )}
      {service.requiresApproval && (
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme="orange"
          fontSize="xs"
        >
          Ask Parent
        </Badge>
      )}
      <Text fontSize="4xl" mb={2}>{config.emoji}</Text>
      <Text fontWeight="bold" color={`${config.color}.600`}>
        {service.name}
      </Text>
      <Text fontSize="sm" color="gray.500" mt={1}>
        {service.description}
      </Text>
    </Box>
  );
}

export function ChildDashboard() {
  const toast = useToast();
  const { avatarEmoji, setAvatarEmoji } = useChildTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChildDashboardData | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
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
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceClick = (service: ServiceCard) => {
    if (!service.isAvailable) {
      toast({
        title: '🔒 This is locked',
        description: 'Ask your parent to unlock this for you!',
        status: 'info',
        duration: 3000,
      });
      return;
    }
    
    if (service.requiresApproval) {
      toast({
        title: '📝 Asking parent...',
        description: 'We sent a request to your parent!',
        status: 'info',
        duration: 3000,
      });
      // TODO: Create approval request
      return;
    }
    
    // Navigate to service
    window.location.href = `/${service.id}`;
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

  if (loading) {
    return (
      <Box
        minH="100vh"
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={4} color="white">
          <Spinner size="xl" />
          <Text fontSize="xl">Loading your dashboard... 🚀</Text>
        </VStack>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        minH="100vh"
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontSize="xl">Something went wrong 😢</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      py={8}
    >
      <Container maxW="container.xl">
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" color="white">
            <HStack spacing={4}>
              <Box
                as="button"
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                fontSize="5xl"
                bg="white"
                borderRadius="full"
                w="80px"
                h="80px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                boxShadow="xl"
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.1)' }}
              >
                {avatarEmoji}
              </Box>
              <VStack align="start" spacing={0}>
                <Heading size="xl">Hi, {data.name}! 👋</Heading>
                <HStack>
                  <Icon as={FiStar} color="yellow.300" />
                  <Text>{data.streakDays} day streak!</Text>
                </HStack>
              </VStack>
            </HStack>
          </HStack>

          {/* Avatar Picker */}
          {showAvatarPicker && (
            <FunCard>
              <Text fontWeight="bold" mb={3}>Pick your avatar:</Text>
              <HStack spacing={3} wrap="wrap">
                {AVATAR_EMOJIS.map((emoji) => (
                  <Box
                    key={emoji}
                    as="button"
                    onClick={() => handleAvatarChange(emoji)}
                    fontSize="2xl"
                    p={2}
                    borderRadius="lg"
                    bg={emoji === avatarEmoji ? 'purple.100' : 'gray.100'}
                    transition="all 0.2s"
                    _hover={{ transform: 'scale(1.2)' }}
                  >
                    {emoji}
                  </Box>
                ))}
              </HStack>
            </FunCard>
          )}

          {/* Main Grid */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {/* Usage Meter */}
            <UsageMeter
              used={data.todayUsageMinutes}
              total={data.dailyLimitMinutes}
            />

            {/* Stats Card */}
            <FunCard gradient="linear-gradient(135deg, #FF6B9D 0%, #FF9F43 100%)">
              <VStack spacing={4} color="white">
                <Heading size="md">Today's Stats 📊</Heading>
                <SimpleGrid columns={2} spacing={4} w="full">
                  <VStack bg="rgba(255,255,255,0.2)" p={4} borderRadius="xl">
                    <Text fontSize="3xl" fontWeight="bold">{data.messageCount}</Text>
                    <Text fontSize="sm">Messages</Text>
                  </VStack>
                  <VStack bg="rgba(255,255,255,0.2)" p={4} borderRadius="xl">
                    <Text fontSize="3xl" fontWeight="bold">{data.achievements.length}</Text>
                    <Text fontSize="sm">Badges</Text>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </FunCard>

            {/* Achievements */}
            <FunCard>
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Text fontSize="xl">🏆</Text>
                  <Heading size="md">My Badges</Heading>
                </HStack>
                {data.achievements.length > 0 ? (
                  <SimpleGrid columns={3} spacing={3}>
                    {data.achievements.slice(0, 6).map((achievement) => (
                      <AchievementBadge key={achievement.id} achievement={achievement} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text color="gray.500" textAlign="center" py={4}>
                    Keep using the app to earn badges! 🌟
                  </Text>
                )}
              </VStack>
            </FunCard>
          </SimpleGrid>

          {/* Services */}
          <Box>
            <Heading size="lg" color="white" mb={4}>
              What do you want to do? 🎯
            </Heading>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={4}>
              {data.allowedServices.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  onClick={() => handleServiceClick(service)}
                />
              ))}
            </SimpleGrid>
          </Box>

          {/* Time Warning */}
          {data.remainingMinutes < 15 && data.remainingMinutes > 0 && (
            <FunCard gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <HStack justify="center" color="white">
                <Text fontSize="2xl">⏰</Text>
                <Text fontSize="lg" fontWeight="bold">
                  Only {data.remainingMinutes} minutes left today!
                </Text>
              </HStack>
            </FunCard>
          )}

          {data.remainingMinutes <= 0 && (
            <FunCard gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <VStack color="white" spacing={2}>
                <Text fontSize="3xl">😴</Text>
                <Heading size="md">Time's up for today!</Heading>
                <Text>Come back tomorrow for more fun!</Text>
              </VStack>
            </FunCard>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

export default ChildDashboard;
