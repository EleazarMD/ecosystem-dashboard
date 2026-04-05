/**
 * Child Learning Dashboard Component
 * 
 * Displays a child's Personal Interest Catalog (PIC), achievements,
 * and learning progress for parent oversight.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  SimpleGrid,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Avatar,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagLeftIcon,
  Tooltip,
  Icon,
  Divider,
} from '@chakra-ui/react';
import {
  FiHeart,
  FiStar,
  FiTrendingUp,
  FiBook,
  FiAward,
  FiClock,
  FiTarget,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ChildRecipeManager } from './ChildRecipeManager';

interface PersonalInterest {
  interestName: string;
  category: string;
  engagementScore: number;
  mentionCount: number;
  knowledgeLevel: string;
}

interface Achievement {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  category: string;
  currentProgress: number;
  requirementValue: number;
  isCompleted: boolean;
  completedAt?: string;
  points: number;
}

interface PersonalizationContext {
  childName: string;
  childAge: number;
  interests: { name: string; category: string; level: string }[];
  recentTopics: string[];
  recentAchievements: { name: string; emoji?: string; completedAt: string }[];
}

interface ChildLearningDashboardProps {
  childId: string;
  childName: string;
  childAge: number;
}

export function ChildLearningDashboard({
  childId,
  childName,
  childAge,
}: ChildLearningDashboardProps) {
  const toast = useToast();

  const [interests, setInterests] = useState<PersonalInterest[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [context, setContext] = useState<PersonalizationContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLearningData();
  }, [childId]);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      const [interestsRes, achievementsRes, contextRes] = await Promise.all([
        fetch(`/api/child/learning?childId=${childId}&type=interests`),
        fetch(`/api/child/learning?childId=${childId}&type=achievements`),
        fetch(`/api/child/learning?childId=${childId}&type=context`),
      ]);

      if (interestsRes.ok) {
        const data = await interestsRes.json();
        setInterests(data.interests || []);
      }

      if (achievementsRes.ok) {
        const data = await achievementsRes.json();
        setAchievements(data.achievements || []);
      }

      if (contextRes.ok) {
        const data = await contextRes.json();
        setContext(data.context);
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
      toast({ title: 'Failed to load learning data', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      animals: '🐾',
      science: '🔬',
      space: '🚀',
      nature: '🌿',
      sports: '⚽',
      arts: '🎨',
      music: '🎵',
      games: '🎮',
      books: '📚',
      movies: '🎬',
      characters: '⭐',
      food: '🍕',
      history: '🏛️',
      technology: '🤖',
      math: '🔢',
      languages: '💬',
    };
    return emojis[category] || '✨';
  };

  const getKnowledgeLevelColor = (level: string) => {
    switch (level) {
      case 'curious':
        return 'blue';
      case 'learning':
        return 'green';
      case 'knowledgeable':
        return 'purple';
      case 'expert':
        return 'gold';
      default:
        return 'gray';
    }
  };

  const getAchievementCategoryColor = (category: string) => {
    switch (category) {
      case 'learning':
        return 'blue';
      case 'creativity':
        return 'purple';
      case 'consistency':
        return 'orange';
      case 'exploration':
        return 'green';
      case 'social':
        return 'pink';
      default:
        return 'gray';
    }
  };

  const completedAchievements = achievements.filter(a => a.isCompleted);
  const inProgressAchievements = achievements.filter(a => !a.isCompleted && a.currentProgress > 0);
  const totalPoints = completedAchievements.reduce((sum, a) => sum + a.points, 0);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={2}>Loading {childName}'s learning profile...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Overview Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <GlassPanel variant="light" p={4}>
          <Stat>
            <StatLabel>
              <HStack>
                <Icon as={FiHeart} color="red.400" />
                <Text>Interests</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{interests.length}</StatNumber>
            <StatHelpText>discovered</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="light" p={4}>
          <Stat>
            <StatLabel>
              <HStack>
                <Icon as={FiAward} color="yellow.500" />
                <Text>Achievements</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{completedAchievements.length}</StatNumber>
            <StatHelpText>earned</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="light" p={4}>
          <Stat>
            <StatLabel>
              <HStack>
                <Icon as={FiStar} color="purple.400" />
                <Text>Points</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{totalPoints}</StatNumber>
            <StatHelpText>total</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel variant="light" p={4}>
          <Stat>
            <StatLabel>
              <HStack>
                <Icon as={FiTarget} color="green.400" />
                <Text>In Progress</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{inProgressAchievements.length}</StatNumber>
            <StatHelpText>achievements</StatHelpText>
          </Stat>
        </GlassPanel>
      </SimpleGrid>

      {/* Tabs for different sections */}
      <Tabs colorScheme="purple" variant="enclosed">
        <TabList>
          <Tab>🎭 Characters</Tab>
          <Tab>❤️ Interests</Tab>
          <Tab>🏆 Achievements</Tab>
        </TabList>

        <TabPanels>
          {/* Characters Tab */}
          <TabPanel px={0}>
            <ChildRecipeManager
              childId={childId}
              childName={childName}
              childAge={childAge}
              onUpdate={fetchLearningData}
            />
          </TabPanel>

          {/* Interests Tab */}
          <TabPanel px={0}>
            <GlassPanel variant="light" p={5}>
              <Heading size="md" mb={4}>
                ❤️ {childName}'s Personal Interest Catalog
              </Heading>

              {interests.length === 0 ? (
                <Box p={4} textAlign="center" color="gray.500">
                  <Text>No interests discovered yet.</Text>
                  <Text fontSize="sm">
                    Interests are automatically learned from conversations!
                  </Text>
                </Box>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {interests.map((interest, idx) => (
                    <Box
                      key={idx}
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="gray.200"
                      bg="white"
                    >
                      <HStack justify="space-between" mb={2}>
                        <HStack>
                          <Text fontSize="xl">
                            {getCategoryEmoji(interest.category)}
                          </Text>
                          <Text fontWeight="bold">{interest.interestName}</Text>
                        </HStack>
                        <Badge colorScheme={getKnowledgeLevelColor(interest.knowledgeLevel)}>
                          {interest.knowledgeLevel}
                        </Badge>
                      </HStack>

                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Mentioned {interest.mentionCount} times
                      </Text>

                      <Box>
                        <HStack justify="space-between" mb={1}>
                          <Text fontSize="xs" color="gray.500">
                            Engagement
                          </Text>
                          <Text fontSize="xs" fontWeight="bold">
                            {Math.round(interest.engagementScore * 100)}%
                          </Text>
                        </HStack>
                        <Progress
                          value={interest.engagementScore * 100}
                          size="sm"
                          colorScheme="purple"
                          borderRadius="full"
                        />
                      </Box>
                    </Box>
                  ))}
                </SimpleGrid>
              )}

              {context?.recentTopics && context.recentTopics.length > 0 && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={3}>
                    💬 Recent Topics
                  </Heading>
                  <Wrap>
                    {context.recentTopics.map((topic, idx) => (
                      <WrapItem key={idx}>
                        <Tag colorScheme="blue" variant="subtle">
                          <TagLabel>{topic}</TagLabel>
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </>
              )}
            </GlassPanel>
          </TabPanel>

          {/* Achievements Tab */}
          <TabPanel px={0}>
            <GlassPanel variant="light" p={5}>
              <Heading size="md" mb={4}>
                🏆 Achievements
              </Heading>

              {/* Completed Achievements */}
              {completedAchievements.length > 0 && (
                <>
                  <Heading size="sm" mb={3} color="green.600">
                    ✅ Completed ({completedAchievements.length})
                  </Heading>
                  <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={3} mb={6}>
                    {completedAchievements.map((achievement) => (
                      <Tooltip
                        key={achievement.id}
                        label={achievement.description}
                        placement="top"
                      >
                        <Box
                          p={3}
                          borderRadius="lg"
                          bg="green.50"
                          border="2px solid"
                          borderColor="green.200"
                          textAlign="center"
                        >
                          <Text fontSize="2xl" mb={1}>
                            {achievement.emoji || '🏆'}
                          </Text>
                          <Text fontWeight="bold" fontSize="sm" noOfLines={1}>
                            {achievement.name}
                          </Text>
                          <Badge colorScheme="green" mt={1}>
                            +{achievement.points} pts
                          </Badge>
                        </Box>
                      </Tooltip>
                    ))}
                  </SimpleGrid>
                </>
              )}

              {/* In Progress Achievements */}
              {inProgressAchievements.length > 0 && (
                <>
                  <Heading size="sm" mb={3} color="orange.600">
                    🎯 In Progress ({inProgressAchievements.length})
                  </Heading>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                    {inProgressAchievements.map((achievement) => (
                      <Box
                        key={achievement.id}
                        p={3}
                        borderRadius="lg"
                        bg="orange.50"
                        border="1px solid"
                        borderColor="orange.200"
                      >
                        <HStack mb={2}>
                          <Text fontSize="xl">{achievement.emoji || '🎯'}</Text>
                          <VStack align="start" spacing={0} flex={1}>
                            <Text fontWeight="bold" fontSize="sm">
                              {achievement.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {achievement.currentProgress} / {achievement.requirementValue}
                            </Text>
                          </VStack>
                          <Badge colorScheme={getAchievementCategoryColor(achievement.category)}>
                            {achievement.category}
                          </Badge>
                        </HStack>
                        <Progress
                          value={(achievement.currentProgress / achievement.requirementValue) * 100}
                          size="sm"
                          colorScheme="orange"
                          borderRadius="full"
                        />
                      </Box>
                    ))}
                  </SimpleGrid>
                </>
              )}

              {achievements.length === 0 && (
                <Box p={4} textAlign="center" color="gray.500">
                  <Text>No achievements yet.</Text>
                  <Text fontSize="sm">
                    {childName} will earn achievements by chatting and learning!
                  </Text>
                </Box>
              )}
            </GlassPanel>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}

export default ChildLearningDashboard;
