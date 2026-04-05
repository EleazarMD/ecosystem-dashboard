/**
 * AI Truth Engine - Status Overview Card
 * 
 * Displays real-time status of the AI Truth Engine with approval queue metrics.
 * Provides quick access to the human oversight interface.
 * 
 * @module components/ide-memory/AITruthEngineStatusCard
 * @version 1.0.0
 * @updated 2025-08-15
 */

import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Icon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Skeleton
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiExternalLink,
  FiCpu
} from 'react-icons/fi';
import { useApprovalQueue, useApprovalStats } from '../../hooks/useApprovalWorkflow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AITruthEngineStatusCard: React.FC = () => {
  // All hooks must be called in the same order every time
  const { data: queueData, loading: queueLoading } = useApprovalQueue();
  const { data: statsData, loading: statsLoading } = useApprovalStats();
  
  // Color mode values - ensure these are called in consistent order
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.secondary');
  const accentBg = useSemanticToken('surface.highlight');
  const progressBg = useSemanticToken('surface.base');

  // Get queue health color
  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'green';
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const isLoading = queueLoading || statsLoading;

  return (
    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
      <CardHeader pb={2}>
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Icon as={FiCpu} boxSize={5} color="orange.500" />
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="semibold">
                AI Truth Engine
              </Text>
              <Text fontSize="sm" color={textColor}>
                Human Oversight System
              </Text>
            </VStack>
          </HStack>
          
          <HStack spacing={2}>
            {queueData && (
              <Badge 
                colorScheme={getHealthColor(queueData.metadata.queue_health)}
                fontSize="sm"
              >
                {queueData.metadata.queue_health.toUpperCase()}
              </Badge>
            )}
            <Button
              size="sm"
              colorScheme="orange"
              variant="outline"
              rightIcon={<FiExternalLink />}
              onClick={() => window.location.href = '/ide-memory#ai-approvals'}
            >
              Open Dashboard
            </Button>
          </HStack>
        </HStack>
      </CardHeader>

      <CardBody pt={0}>
        <VStack spacing={4} align="stretch">
          {/* Quick Stats Grid */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat size="sm">
              <StatLabel fontSize="xs" color={textColor}>Pending Reviews</StatLabel>
              {isLoading ? (
                <Skeleton height="24px" />
              ) : (
                <StatNumber fontSize="xl" color="blue.500">
                  {queueData?.queue_stats.total_pending || 0}
                </StatNumber>
              )}
              <StatHelpText fontSize="xs">
                <Icon as={FiClock} mr={1} />
                Queue
              </StatHelpText>
            </Stat>

            <Stat size="sm">
              <StatLabel fontSize="xs" color={textColor}>Approval Rate</StatLabel>
              {isLoading ? (
                <Skeleton height="24px" />
              ) : (
                <StatNumber fontSize="xl" color="green.500">
                  {statsData ? Math.round(statsData.overview.approval_rate * 100) : 0}%
                </StatNumber>
              )}
              <StatHelpText fontSize="xs">
                <StatArrow type="increase" />
                Last 30 days
              </StatHelpText>
            </Stat>

            <Stat size="sm">
              <StatLabel fontSize="xs" color={textColor}>AI Accuracy</StatLabel>
              {isLoading ? (
                <Skeleton height="24px" />
              ) : (
                <StatNumber fontSize="xl" color="purple.500">
                  {statsData ? Math.round(statsData.accuracy_metrics.ai_accuracy_score * 100) : 0}%
                </StatNumber>
              )}
              <StatHelpText fontSize="xs">
                <Icon as={FiTrendingUp} mr={1} />
                Improving
              </StatHelpText>
            </Stat>

            <Stat size="sm">
              <StatLabel fontSize="xs" color={textColor}>Avg Review Time</StatLabel>
              {isLoading ? (
                <Skeleton height="24px" />
              ) : (
                <StatNumber fontSize="xl" color="orange.500">
                  {statsData ? statsData.overview.average_processing_time_minutes.toFixed(1) : 0}m
                </StatNumber>
              )}
              <StatHelpText fontSize="xs">
                <Icon as={FiCheckCircle} mr={1} />
                Per correction
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Priority Queue Breakdown */}
          {queueData && queueData.queue_stats.total_pending > 0 && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2} color={textColor}>
                Priority Breakdown
              </Text>
              <HStack spacing={3} wrap="wrap">
                {queueData.queue_stats.by_priority.critical > 0 && (
                  <Badge colorScheme="red" variant="solid">
                    {queueData.queue_stats.by_priority.critical} Critical
                  </Badge>
                )}
                {queueData.queue_stats.by_priority.high > 0 && (
                  <Badge colorScheme="orange" variant="solid">
                    {queueData.queue_stats.by_priority.high} High
                  </Badge>
                )}
                {queueData.queue_stats.by_priority.medium > 0 && (
                  <Badge colorScheme="yellow" variant="solid">
                    {queueData.queue_stats.by_priority.medium} Medium
                  </Badge>
                )}
                {queueData.queue_stats.by_priority.low > 0 && (
                  <Badge colorScheme="green" variant="solid">
                    {queueData.queue_stats.by_priority.low} Low
                  </Badge>
                )}
              </HStack>
            </Box>
          )}

          {/* System Health Indicator */}
          {statsData && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  System Health
                </Text>
                <Text fontSize="xs" color={textColor}>
                  {Math.round(statsData.system_health.processing_efficiency * 100)}% efficiency
                </Text>
              </HStack>
              <Progress
                value={statsData.system_health.processing_efficiency * 100}
                size="sm"
                colorScheme={statsData.system_health.processing_efficiency > 0.8 ? 'green' : 
                           statsData.system_health.processing_efficiency > 0.6 ? 'yellow' : 'red'}
                bg={progressBg}
              />
            </Box>
          )}

          {/* Quick Actions */}
          <HStack spacing={2} justify="center">
            <Button
              size="sm"
              colorScheme="orange"
              variant="solid"
              flex="1"
              onClick={() => window.location.href = '/ide-memory#ai-approvals'}
            >
              Review Queue
            </Button>
            {queueData && queueData.queue_stats.total_pending === 0 && (
              <Text fontSize="sm" color="green.500" textAlign="center" flex="1">
                ✅ All corrections reviewed
              </Text>
            )}
          </HStack>

          {/* Warning for high priority items */}
          {queueData && (queueData.queue_stats.by_priority.critical > 0 || queueData.queue_stats.by_priority.high > 3) && (
            <Box bg={accentBg} p={3} borderRadius="md" borderLeft="4px solid" borderLeftColor="orange.500">
              <HStack>
                <Icon as={FiAlertTriangle} color="orange.500" />
                <Text fontSize="sm" color="orange.700">
                  {queueData.queue_stats.by_priority.critical > 0 
                    ? `${queueData.queue_stats.by_priority.critical} critical corrections need immediate attention`
                    : `${queueData.queue_stats.by_priority.high} high-priority corrections pending`
                  }
                </Text>
              </HStack>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default AITruthEngineStatusCard;
