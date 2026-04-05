/**
 * AI Command Center - Proactive Intelligence Dashboard Header
 * Surfaces AI agent insights and recommendations to save time
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  Button,
  VStack,
  HStack,
  Icon,
  Skeleton,
  Avatar,
  Tooltip,
  Progress
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  BrainCircuitIcon,
  ZapIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from 'lucide-react';

interface AgentInsight {
  id: string;
  agent: string;
  type: 'opportunity' | 'warning' | 'success' | 'action';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: string;
  data?: any;
}

interface AICommandCenterProps {
  onTakeAction?: (insight: AgentInsight) => void;
}

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

export const AICommandCenter: React.FC<AICommandCenterProps> = ({ onTakeAction }) => {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.hover');
  const accentColor = useSemanticToken('interactive.primary');

  // Mock AI agent insights - replace with real agent data
  useEffect(() => {
    const fetchAgentInsights = async () => {
      setLoading(true);

      // Simulate AI agent analysis
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockInsights: AgentInsight[] = [
        {
          id: '1',
          agent: 'Knowledge Graph Agent',
          type: 'opportunity',
          title: 'New Research Connections Discovered',
          description: '3 new knowledge pathways identified in your recent AI papers. Ready to explore?',
          priority: 'high',
          actionable: true,
          timestamp: new Date().toISOString(),
          data: { connections: 3, domains: ['NLP', 'Computer Vision', 'Reinforcement Learning'] }
        },
        {
          id: '2',
          agent: 'Memory Agent',
          type: 'action',
          title: 'Memory Optimization Recommended',
          description: 'Your vector database could benefit from index rebuilding. Est. 40% performance boost.',
          priority: 'medium',
          actionable: true,
          timestamp: new Date().toISOString(),
          data: { estimatedImprovement: '40%', timeRequired: '15 min' }
        },
        {
          id: '3',
          agent: 'Project Orchestrator',
          type: 'success',
          title: 'Voice Assistant Integration Complete',
          description: 'OpenAI Realtime API successfully integrated with multi-language support.',
          priority: 'low',
          actionable: false,
          timestamp: new Date().toISOString(),
          data: { languages: ['English', 'Spanish'], accuracy: '94%' }
        },
        {
          id: '4',
          agent: 'Resource Monitor',
          type: 'warning',
          title: 'GPU Utilization Opportunity',
          description: 'Your A100 has been idle for 2h. Want me to suggest some experiments?',
          priority: 'medium',
          actionable: true,
          timestamp: new Date().toISOString(),
          data: { idleTime: '2h 15m', suggestedTasks: 3 }
        }
      ];

      setInsights(mockInsights);
      setLoading(false);
    };

    fetchAgentInsights();

    // Rotate insights every 8 seconds
    const interval = setInterval(() => {
      setCurrentInsightIndex(prev => (prev + 1) % insights.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [insights.length]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return TrendingUpIcon;
      case 'warning': return AlertTriangleIcon;
      case 'success': return CheckCircleIcon;
      case 'action': return ZapIcon;
      default: return SparklesIcon;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'green';
      case 'warning': return 'orange';
      case 'success': return 'blue';
      case 'action': return 'purple';
      default: return 'gray';
    }
  };

  const currentInsight = insights[currentInsightIndex];

  return (
    <MotionBox
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      bg={bg}
      borderRadius="xl"
      border="1px solid"
      borderColor={borderColor}
      p={6}
      mb={6}
      position="relative"
      overflow="hidden"
    >
      {/* Background Pattern */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        opacity={0.03}
        backgroundImage="radial-gradient(circle at 50% 50%, currentColor 1px, transparent 1px)"
        backgroundSize="20px 20px"
      />

      {/* Header */}
      <Flex align="center" justify="space-between" mb={6} position="relative" zIndex={1}>
        <HStack spacing={3}>
          <Box
            p={2}
            bg={accentColor}
            borderRadius="lg"
            color="whiteAlpha.900"
          >
            <Icon as={BrainCircuitIcon} boxSize={6} />
          </Box>
          <VStack align="start" spacing={0}>
            <Text fontSize="xl" fontWeight="bold">
              AI Command Center
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
              Proactive intelligence from your ecosystem agents
            </Text>
          </VStack>
        </HStack>

        <HStack spacing={2}>
          <Badge colorScheme="green" variant="subtle">
            {insights.length} Active Agents
          </Badge>
          <Tooltip label="All agents operational">
            <Box w={2} h={2} bg="green.400" borderRadius="full" />
          </Tooltip>
        </HStack>
      </Flex>

      {/* Main Insight Display */}
      {loading ? (
        <VStack spacing={4} align="stretch">
          <Skeleton height="60px" borderRadius="lg" />
          <HStack>
            <Skeleton height="20px" width="100px" />
            <Skeleton height="20px" width="80px" />
          </HStack>
        </VStack>
      ) : (
        <AnimatePresence mode="wait">
          {currentInsight && (
            <MotionBox
              key={currentInsight.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Flex
                bg={cardBg}
                borderRadius="lg"
                p={4}
                align="center"
                justify="space-between"
              >
                <HStack spacing={4} flex={1}>
                  <Box
                    p={3}
                    bg={`${getInsightColor(currentInsight.type)}.100`}
                    color={`${getInsightColor(currentInsight.type)}.500`}
                    borderRadius="lg"
                  >
                    <Icon as={getInsightIcon(currentInsight.type)} boxSize={5} />
                  </Box>

                  <VStack align="start" spacing={1} flex={1}>
                    <HStack>
                      <Avatar size="xs" name={currentInsight.agent} />
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                        {currentInsight.agent}
                      </Text>
                      <Badge
                        size="sm"
                        colorScheme={getInsightColor(currentInsight.type)}
                        variant="subtle"
                      >
                        {currentInsight.priority}
                      </Badge>
                    </HStack>

                    <Text fontWeight="semibold" fontSize="md">
                      {currentInsight.title}
                    </Text>

                    <Text fontSize="sm" color={useSemanticToken('text.secondary')} noOfLines={2}>
                      {currentInsight.description}
                    </Text>
                  </VStack>
                </HStack>

                {currentInsight.actionable && (
                  <Button
                    size="sm"
                    colorScheme={getInsightColor(currentInsight.type)}
                    variant="ghost"
                    rightIcon={<Icon as={ArrowRightIcon} boxSize={4} />}
                    onClick={() => onTakeAction?.(currentInsight)}
                  >
                    Take Action
                  </Button>
                )}
              </Flex>

              {/* Progress indicator */}
              <Box mt={3}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {currentInsightIndex + 1} of {insights.length} insights
                  </Text>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    Next update in 8s
                  </Text>
                </HStack>
                <Progress
                  value={((currentInsightIndex + 1) / insights.length) * 100}
                  size="xs"
                  colorScheme={getInsightColor(currentInsight.type)}
                  borderRadius="full"
                />
              </Box>
            </MotionBox>
          )}
        </AnimatePresence>
      )}

      {/* Quick Stats */}
      <HStack mt={4} spacing={6} fontSize="sm">
        <HStack>
          <Icon as={CheckCircleIcon} color="green.400" boxSize={4} />
          <Text color={useSemanticToken('text.secondary')}>
            {insights.filter(i => i.type === 'success').length} Completed
          </Text>
        </HStack>
        <HStack>
          <Icon as={ZapIcon} color="purple.400" boxSize={4} />
          <Text color={useSemanticToken('text.secondary')}>
            {insights.filter(i => i.actionable).length} Actions Available
          </Text>
        </HStack>
        <HStack>
          <Icon as={TrendingUpIcon} color="green.400" boxSize={4} />
          <Text color={useSemanticToken('text.secondary')}>
            {insights.filter(i => i.type === 'opportunity').length} Opportunities
          </Text>
        </HStack>
      </HStack>
    </MotionBox>
  );
};

export default AICommandCenter;
