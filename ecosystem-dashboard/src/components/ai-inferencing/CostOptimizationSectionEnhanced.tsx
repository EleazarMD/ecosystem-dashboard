/**
 * Enhanced Cost Optimization Section
 * Sophisticated design for cost analytics and recommendations
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  SimpleGrid,
  Badge,
  VStack,
  HStack,
  Flex,
  Icon,
  
  Circle,
  Progress,
  Divider,
} from '@chakra-ui/react';
import {
  FiDollarSign,
  FiTrendingDown,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiPieChart,
} from 'react-icons/fi';

interface CostRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number;
  currentCost: number;
  projectedCost: number;
}

interface OverviewStats {
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  errorRate: number;
  totalCost: number;
  totalTokens: number;
}

interface Props {
  recommendations: CostRecommendation[];
  overviewStats: OverviewStats | null;
  timeRange: string;
}

export const CostOptimizationSectionEnhanced: React.FC<Props> = ({
  recommendations,
  overviewStats,
  timeRange,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { color: 'red', icon: FiAlertCircle, label: 'High Priority' };
      case 'medium':
        return { color: 'orange', icon: FiAlertCircle, label: 'Medium Priority' };
      case 'low':
        return { color: 'blue', icon: FiCheckCircle, label: 'Low Priority' };
      default:
        return { color: 'gray', icon: FiCheckCircle, label: 'Info' };
    }
  };

  // Calculate totals
  const totalPotentialSavings = recommendations.reduce(
    (sum, r) => sum + r.potentialSavings,
    0
  );
  const totalCurrentCost = overviewStats?.totalCost || 0;
  const projectedMonthlyCost = totalCurrentCost * 30;
  const projectedMonthlySavings = totalPotentialSavings * 30;

  return (
    <VStack spacing={6} align="stretch">
      {/* Section Header */}
      <HStack spacing={4}>
        <Circle size="40px" bg={useSemanticToken('status.success')}>
          <Icon as={FiPieChart} color={useSemanticToken('text.inverse')} boxSize={5} />
        </Circle>
        <Box>
          <Heading size="md" mb={1}>
            Cost Optimization
          </Heading>
          <Text fontSize="sm" color={mutedText}>
            Insights and recommendations • Last {timeRange}
          </Text>
        </Box>
      </HStack>

      {/* Cost Overview Cards */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card
          bg={cardBg}
          borderLeftWidth="3px"
          borderLeftColor={useSemanticToken('interactive.secondary')}
          shadow="sm"
        >
          <CardBody p={4}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Icon as={FiDollarSign} color={useSemanticToken('interactive.secondary')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  CURRENT
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {formatCurrency(totalCurrentCost)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                This {timeRange}
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderLeftWidth="3px"
          borderLeftColor={useSemanticToken('interactive.primary')}
          shadow="sm"
        >
          <CardBody p={4}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Icon as={FiTrendingUp} color={useSemanticToken('interactive.primary')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  PROJECTED
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {formatCurrency(projectedMonthlyCost)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Monthly estimate
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderLeftWidth="3px"
          borderLeftColor={useSemanticToken('status.success')}
          shadow="sm"
        >
          <CardBody p={4}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Icon as={FiTrendingDown} color={useSemanticToken('status.success')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  SAVINGS
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1" color={useSemanticToken('status.success')}>
                {formatCurrency(projectedMonthlySavings)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Potential monthly
              </Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderLeftWidth="3px"
          borderLeftColor={useSemanticToken('status.warning')}
          shadow="sm"
        >
          <CardBody p={4}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Icon as={FiCheckCircle} color={useSemanticToken('status.warning')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  ACTIONS
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {recommendations.length}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Recommendations
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Recommendations */}
      <Box>
        <Heading size="sm" mb={4} color={mutedText} fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
          Optimization Opportunities
        </Heading>
        
        {recommendations.length === 0 ? (
          <Card bg={cardBg} shadow="sm">
            <CardBody py={12}>
              <VStack spacing={3}>
                <Circle size="60px" bg={useSemanticToken('status.successSubtle')}>
                  <Icon as={FiCheckCircle} boxSize={8} color={useSemanticToken('status.success')} />
                </Circle>
                <Heading size="sm" color={useSemanticToken('status.success')}>
                  All Optimized!
                </Heading>
                <Text color={mutedText} textAlign="center" maxW="md">
                  Your AI usage is well-optimized. We'll notify you if we find opportunities to reduce costs.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <VStack spacing={4} align="stretch">
            {recommendations.map((rec, idx) => {
              const priorityConfig = getPriorityConfig(rec.priority);
              const savingsPercent = rec.currentCost > 0
                ? ((rec.potentialSavings / rec.currentCost) * 100)
                : 0;

              return (
                <Card
                  key={idx}
                  bg={cardBg}
                  borderWidth="1px"
                  borderColor={borderColor}
                  shadow="sm"
                  overflow="hidden"
                  transition="all 0.2s"
                  _hover={{ shadow: 'md', borderColor: `${priorityConfig.color}.400` }}
                >
                  <CardBody p={5}>
                    <Flex gap={4}>
                      {/* Priority Indicator */}
                      <Circle
                        size="40px"
                        bg={useSemanticToken('surface.elevated')}
                        color={useSemanticToken('icon.primary')}
                      >
                        <Icon as={priorityConfig.icon} boxSize={5} />
                      </Circle>

                      {/* Content */}
                      <Box flex="1">
                        <Flex justify="space-between" align="start" mb={2}>
                          <VStack align="start" spacing={1}>
                            <HStack>
                              <Heading size="sm">{rec.title}</Heading>
                              <Badge
                                colorScheme={priorityConfig.color}
                                fontSize="xs"
                              >
                                {priorityConfig.label}
                              </Badge>
                            </HStack>
                            <Text fontSize="sm" color={mutedText}>
                              {rec.description}
                            </Text>
                          </VStack>

                          <VStack align="end" spacing={0}>
                            <Text fontSize="sm" color={mutedText}>
                              Save up to
                            </Text>
                            <Text fontSize="xl" fontWeight="bold" color={useSemanticToken('status.success')}>
                              {formatCurrency(rec.potentialSavings)}
                            </Text>
                          </VStack>
                        </Flex>

                        <Divider my={3} />

                        <Flex justify="space-between" align="center">
                          <HStack spacing={6} fontSize="sm">
                            <VStack align="start" spacing={0}>
                              <Text color={mutedText}>Current</Text>
                              <Text fontWeight="medium">
                                {formatCurrency(rec.currentCost)}
                              </Text>
                            </VStack>
                            <Icon as={FiTrendingDown} color={useSemanticToken('status.success')} />
                            <VStack align="start" spacing={0}>
                              <Text color={mutedText}>Projected</Text>
                              <Text fontWeight="medium" color={useSemanticToken('status.success')}>
                                {formatCurrency(rec.projectedCost)}
                              </Text>
                            </VStack>
                          </HStack>

                          <VStack align="end" spacing={1}>
                            <Text fontSize="xs" color={mutedText}>
                              Potential reduction
                            </Text>
                            <Badge colorScheme="green" fontSize="sm">
                              -{savingsPercent.toFixed(0)}%
                            </Badge>
                          </VStack>
                        </Flex>
                      </Box>
                    </Flex>
                  </CardBody>
                </Card>
              );
            })}
          </VStack>
        )}
      </Box>
    </VStack>
  );
};
