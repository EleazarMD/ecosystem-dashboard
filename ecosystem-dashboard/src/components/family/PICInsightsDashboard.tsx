/**
 * PIC Insights Dashboard
 * 
 * Parent-facing dashboard for viewing child learning progress and wellness.
 * Shows aggregated insights while protecting child privacy.
 * 
 * Core Principles:
 * - Parents see WHAT is happening, not private content
 * - No access to journal entries, chat transcripts, or raw data
 * - Wellness indicators are derived signals, not emotional surveillance
 * - Goal suggestions are mediated by PIC, child decides adoption
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Badge,
  Button,
  IconButton,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tooltip,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Icon,
  CircularProgress,
  CircularProgressLabel,
  Wrap,
  WrapItem,
  Collapse,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiAward,
  FiTarget,
  FiHeart,
  FiBook,
  FiEdit3,
  FiMessageCircle,
  FiImage,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiPlus,
  FiInfo,
  FiShield,
  FiEye,
  FiClock,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';

// ============================================================================
// Types
// ============================================================================

interface ParentInsightsSummary {
  child: {
    id: string;
    displayName: string;
    ageGroup: string;
  };
  weeklyProgress: {
    totalActivities: number;
    totalTimeMinutes: number;
    newAchievements: number;
    topActivities: { category: string; count: number }[];
    trend: 'improving' | 'stable' | 'declining';
  };
  wellness: {
    cognitiveScore: number;
    sentiment: string;
    engagementLevel: string;
    needsAttention: boolean;
    attentionReason?: string;
    suggestedActivities?: string[];
    conversationStarters?: string[];
  };
  achievements: {
    total: number;
    recent: { title: string; icon: string; earnedAt: Date }[];
  };
  goals: {
    active: number;
    completed: number;
    suggested: any[];
  };
  recommendations: {
    activities: string[];
    conversationStarters: string[];
  };
}

interface PICInsightsDashboardProps {
  childId: string;
  childName?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function PICInsightsDashboard({ childId, childName }: PICInsightsDashboardProps) {
  const toast = useToast();
  const { isOpen: isGoalModalOpen, onOpen: onGoalModalOpen, onClose: onGoalModalClose } = useDisclosure();
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ParentInsightsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Goal suggestion form
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'general',
    targetValue: '',
    targetUnit: '',
  });
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Fetch insights
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/family/pic-insights?action=summary&childId=${childId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch insights');
      }

      setInsights(data.data);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error loading insights',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [childId, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Submit goal suggestion
  const handleSubmitGoal = async () => {
    if (!goalForm.title.trim()) {
      toast({
        title: 'Title required',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSubmittingGoal(true);
    try {
      const res = await fetch('/api/family/pic-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-goal',
          childId,
          title: goalForm.title,
          description: goalForm.description,
          category: goalForm.category,
          targetValue: goalForm.targetValue ? parseFloat(goalForm.targetValue) : undefined,
          targetUnit: goalForm.targetUnit || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to suggest goal');
      }

      toast({
        title: 'Goal suggested!',
        description: `${insights?.child.displayName || 'Your child'} will see this suggestion and can choose to adopt it.`,
        status: 'success',
        duration: 5000,
      });

      onGoalModalClose();
      setGoalForm({ title: '', description: '', category: 'general', targetValue: '', targetUnit: '' });
      fetchInsights();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Render helpers
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <Icon as={FiTrendingUp} color="green.500" />;
      case 'declining':
        return <Icon as={FiTrendingDown} color="orange.500" />;
      default:
        return <Icon as={FiMinus} color="gray.500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'workspace':
        return FiEdit3;
      case 'books':
        return FiBook;
      case 'chat':
        return FiMessageCircle;
      case 'art-studio':
      case 'art':
        return FiImage;
      case 'planner':
        return FiCheckCircle;
      default:
        return FiActivity;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'green';
      case 'neutral':
        return 'blue';
      case 'mixed':
        return 'yellow';
      case 'concerning':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'green';
      case 'moderate':
        return 'blue';
      case 'low':
        return 'yellow';
      case 'declining':
        return 'orange';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading insights...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!insights) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <AlertDescription>No insights available yet. Check back after some activity!</AlertDescription>
      </Alert>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Privacy Notice */}
      <Alert status="info" borderRadius="md" variant="subtle">
        <AlertIcon as={FiShield} />
        <Box flex="1">
          <AlertTitle fontSize="sm">Privacy-First Insights</AlertTitle>
          <AlertDescription fontSize="xs">
            You see activity summaries and wellness indicators, not private content like journal entries or chat messages.
            <Button size="xs" variant="link" ml={2} onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}>
              {showPrivacyInfo ? 'Hide details' : 'Learn more'}
            </Button>
          </AlertDescription>
        </Box>
        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCw />}
          size="sm"
          variant="ghost"
          onClick={fetchInsights}
        />
      </Alert>

      <Collapse in={showPrivacyInfo}>
        <GlassPanel p={4} mb={4}>
          <VStack align="start" spacing={2} fontSize="sm">
            <HStack>
              <Icon as={FiEye} color="green.500" />
              <Text fontWeight="bold">What you CAN see:</Text>
            </HStack>
            <Text pl={6}>Activity counts, time spent, achievements earned, progress trends, wellness indicators</Text>
            
            <HStack mt={2}>
              <Icon as={FiShield} color="red.500" />
              <Text fontWeight="bold">What is PROTECTED:</Text>
            </HStack>
            <Text pl={6}>Journal content, chat conversations, specific artwork details, personal thoughts</Text>
            
            <HStack mt={2}>
              <Icon as={FiTarget} color="blue.500" />
              <Text fontWeight="bold">Goal Suggestions:</Text>
            </HStack>
            <Text pl={6}>You can suggest goals, but {insights.child.displayName} decides whether to adopt them</Text>
          </VStack>
        </GlassPanel>
      </Collapse>

      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={0}>
          <Heading size="md">{insights.child.displayName}'s Learning Journey</Heading>
          <Text fontSize="sm" color="gray.500">
            Age group: {insights.child.ageGroup === 'early' ? '5-7 years' : insights.child.ageGroup === 'middle' ? '8-10 years' : '11-13 years'}
          </Text>
        </VStack>
        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm" onClick={onGoalModalOpen}>
          Suggest Goal
        </Button>
      </HStack>

      {/* Attention Alert */}
      {insights.wellness.needsAttention && (
        <Alert status="warning" borderRadius="md">
          <AlertIcon as={FiAlertTriangle} />
          <Box>
            <AlertTitle>Needs Attention</AlertTitle>
            <AlertDescription>{insights.wellness.attentionReason}</AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Weekly Progress Stats */}
      <GlassPanel p={5}>
        <HStack justify="space-between" mb={4}>
          <Heading size="sm">This Week's Progress</Heading>
          <HStack>
            {getTrendIcon(insights.weeklyProgress.trend)}
            <Text fontSize="sm" color="gray.500">
              {insights.weeklyProgress.trend === 'improving' ? 'Improving' : 
               insights.weeklyProgress.trend === 'declining' ? 'Needs encouragement' : 'Stable'}
            </Text>
          </HStack>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <Stat>
            <StatLabel>Activities</StatLabel>
            <StatNumber>{insights.weeklyProgress.totalActivities}</StatNumber>
            <StatHelpText>
              <StatArrow type={insights.weeklyProgress.trend === 'improving' ? 'increase' : insights.weeklyProgress.trend === 'declining' ? 'decrease' : 'increase'} />
              This week
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Time Spent</StatLabel>
            <StatNumber>{Math.round(insights.weeklyProgress.totalTimeMinutes / 60)}h {insights.weeklyProgress.totalTimeMinutes % 60}m</StatNumber>
            <StatHelpText>Learning time</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Achievements</StatLabel>
            <StatNumber>{insights.weeklyProgress.newAchievements}</StatNumber>
            <StatHelpText>New this week</StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Badges</StatLabel>
            <StatNumber>{insights.achievements.total}</StatNumber>
            <StatHelpText>All time</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Top Activities */}
        {insights.weeklyProgress.topActivities.length > 0 && (
          <>
            <Divider my={4} />
            <Text fontSize="sm" fontWeight="medium" mb={2}>Top Activities</Text>
            <Wrap spacing={2}>
              {insights.weeklyProgress.topActivities.map((activity, idx) => (
                <WrapItem key={idx}>
                  <Badge
                    colorScheme={idx === 0 ? 'green' : idx === 1 ? 'blue' : 'gray'}
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    <HStack spacing={1}>
                      <Icon as={getCategoryIcon(activity.category)} />
                      <Text>{activity.category}</Text>
                      <Text fontWeight="bold">({activity.count})</Text>
                    </HStack>
                  </Badge>
                </WrapItem>
              ))}
            </Wrap>
          </>
        )}
      </GlassPanel>

      {/* Wellness Indicators */}
      <GlassPanel p={5}>
        <HStack justify="space-between" mb={4}>
          <Heading size="sm">Wellness Indicators</Heading>
          <Tooltip label="These are derived from activity patterns, not private content">
            <Icon as={FiInfo} color="gray.400" />
          </Tooltip>
        </HStack>

        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <VStack>
            <CircularProgress
              value={insights.wellness.cognitiveScore * 100}
              color="purple.400"
              size="80px"
            >
              <CircularProgressLabel>
                {Math.round(insights.wellness.cognitiveScore * 100)}%
              </CircularProgressLabel>
            </CircularProgress>
            <Text fontSize="sm" fontWeight="medium">Cognitive Wellness</Text>
            <Text fontSize="xs" color="gray.500">Focus, curiosity, persistence</Text>
          </VStack>

          <VStack>
            <Badge
              colorScheme={getSentimentColor(insights.wellness.sentiment)}
              fontSize="lg"
              px={4}
              py={2}
              borderRadius="full"
            >
              {insights.wellness.sentiment}
            </Badge>
            <Text fontSize="sm" fontWeight="medium">Overall Mood</Text>
            <Text fontSize="xs" color="gray.500">Based on engagement</Text>
          </VStack>

          <VStack>
            <Badge
              colorScheme={getEngagementColor(insights.wellness.engagementLevel)}
              fontSize="lg"
              px={4}
              py={2}
              borderRadius="full"
            >
              {insights.wellness.engagementLevel}
            </Badge>
            <Text fontSize="sm" fontWeight="medium">Engagement</Text>
            <Text fontSize="xs" color="gray.500">Activity level</Text>
          </VStack>

          <VStack>
            <Icon
              as={insights.wellness.needsAttention ? FiAlertTriangle : FiCheckCircle}
              boxSize={10}
              color={insights.wellness.needsAttention ? 'orange.500' : 'green.500'}
            />
            <Text fontSize="sm" fontWeight="medium">
              {insights.wellness.needsAttention ? 'Needs Attention' : 'Doing Well'}
            </Text>
            <Text fontSize="xs" color="gray.500">Overall status</Text>
          </VStack>
        </SimpleGrid>
      </GlassPanel>

      {/* Recommendations */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Suggested Activities */}
        <GlassPanel p={5}>
          <Heading size="sm" mb={3}>💡 Activity Ideas</Heading>
          <VStack align="start" spacing={2}>
            {insights.recommendations.activities.length > 0 ? (
              insights.recommendations.activities.map((activity, idx) => (
                <HStack key={idx}>
                  <Icon as={FiActivity} color="blue.500" />
                  <Text fontSize="sm">{activity}</Text>
                </HStack>
              ))
            ) : (
              <Text fontSize="sm" color="gray.500">Great variety of activities!</Text>
            )}
          </VStack>
        </GlassPanel>

        {/* Conversation Starters */}
        <GlassPanel p={5}>
          <Heading size="sm" mb={3}>💬 Conversation Starters</Heading>
          <VStack align="start" spacing={2}>
            {insights.recommendations.conversationStarters.length > 0 ? (
              insights.recommendations.conversationStarters.map((starter, idx) => (
                <HStack key={idx}>
                  <Icon as={FiMessageCircle} color="green.500" />
                  <Text fontSize="sm">{starter}</Text>
                </HStack>
              ))
            ) : (
              <Text fontSize="sm" color="gray.500">Ask about their favorite activities!</Text>
            )}
          </VStack>
        </GlassPanel>
      </SimpleGrid>

      {/* Recent Achievements */}
      {insights.achievements.recent.length > 0 && (
        <GlassPanel p={5}>
          <Heading size="sm" mb={3}>🏆 Recent Achievements</Heading>
          <Wrap spacing={3}>
            {insights.achievements.recent.map((achievement, idx) => (
              <WrapItem key={idx}>
                <HStack
                  bg="yellow.50"
                  px={3}
                  py={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="yellow.200"
                >
                  <Text fontSize="xl">{achievement.icon}</Text>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="medium">{achievement.title}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(achievement.earnedAt).toLocaleDateString()}
                    </Text>
                  </VStack>
                </HStack>
              </WrapItem>
            ))}
          </Wrap>
        </GlassPanel>
      )}

      {/* Goals Section */}
      <GlassPanel p={5}>
        <HStack justify="space-between" mb={3}>
          <Heading size="sm">🎯 Goals</Heading>
          <HStack spacing={4}>
            <Badge colorScheme="green">{insights.goals.active} Active</Badge>
            <Badge colorScheme="purple">{insights.goals.completed} Completed</Badge>
          </HStack>
        </HStack>

        {insights.goals.suggested.length > 0 && (
          <>
            <Text fontSize="sm" color="gray.500" mb={2}>Pending Suggestions</Text>
            <VStack align="stretch" spacing={2}>
              {insights.goals.suggested.map((goal, idx) => (
                <HStack
                  key={idx}
                  p={3}
                  bg="blue.50"
                  borderRadius="md"
                  justify="space-between"
                >
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="medium">{goal.title}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {goal.picRecommendation === 'appropriate' ? '✓ PIC approved' :
                       goal.picRecommendation === 'too_easy' ? '⚠️ May be too easy' :
                       goal.picRecommendation === 'too_hard' ? '⚠️ May be challenging' :
                       '⏳ Awaiting response'}
                    </Text>
                  </VStack>
                  <Badge colorScheme="blue">Suggested</Badge>
                </HStack>
              ))}
            </VStack>
          </>
        )}

        {insights.goals.suggested.length === 0 && insights.goals.active === 0 && (
          <Text fontSize="sm" color="gray.500">
            No active goals. Consider suggesting one to encourage growth!
          </Text>
        )}
      </GlassPanel>

      {/* Goal Suggestion Modal */}
      <Modal isOpen={isGoalModalOpen} onClose={onGoalModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Suggest a Goal for {insights.child.displayName}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Alert status="info" borderRadius="md" size="sm">
                <AlertIcon />
                <Text fontSize="sm">
                  {insights.child.displayName} will see this suggestion and can choose to adopt it.
                  PIC will evaluate if the goal is appropriate.
                </Text>
              </Alert>

              <FormControl isRequired>
                <FormLabel>Goal Title</FormLabel>
                <Input
                  placeholder="e.g., Read 3 books this month"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description (optional)</FormLabel>
                <Textarea
                  placeholder="Why this goal might be fun or helpful..."
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Category</FormLabel>
                <Select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="art">Art & Creativity</option>
                  <option value="learning">Learning</option>
                  <option value="consistency">Consistency</option>
                </Select>
              </FormControl>

              <HStack w="full">
                <FormControl>
                  <FormLabel>Target (optional)</FormLabel>
                  <Input
                    type="number"
                    placeholder="e.g., 5"
                    value={goalForm.targetValue}
                    onChange={(e) => setGoalForm({ ...goalForm, targetValue: e.target.value })}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Unit</FormLabel>
                  <Input
                    placeholder="e.g., books"
                    value={goalForm.targetUnit}
                    onChange={(e) => setGoalForm({ ...goalForm, targetUnit: e.target.value })}
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onGoalModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmitGoal}
              isLoading={submittingGoal}
            >
              Suggest Goal
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
