/**
 * Clean Cost Optimization Section
 * Minimal design with clear spacing
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Card,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  
} from '@chakra-ui/react';

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
  totalCost: number;
}

interface Props {
  recommendations: CostRecommendation[];
  overviewStats: OverviewStats | null;
  timeRange: string;
}

export const CostOptimizationClean: React.FC<Props> = ({
  recommendations,
  overviewStats,
  timeRange,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const subtleText = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const totalPotentialSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0);
  const totalCurrentCost = overviewStats?.totalCost || 0;
  const projectedMonthlyCost = totalCurrentCost * 30;
  const projectedMonthlySavings = totalPotentialSavings * 30;

  return (
    <VStack spacing={12} align="stretch">
      {/* Simple Header */}
      <Box>
        <Heading size="lg" fontWeight="600" mb={2}>
          Cost Optimization
        </Heading>
        <Text color={subtleText} fontSize="sm">
          Insights and recommendations for the last {timeRange}
        </Text>
      </Box>

      {/* Cost Overview */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Current
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {formatCurrency(totalCurrentCost)}
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Projected Monthly
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {formatCurrency(projectedMonthlyCost)}
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Potential Savings
            </Text>
            <Text fontSize="3xl" fontWeight="500" color="green.600">
              {formatCurrency(projectedMonthlySavings)}
            </Text>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="start" spacing={3}>
            <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
              Recommendations
            </Text>
            <Text fontSize="3xl" fontWeight="500">
              {recommendations.length}
            </Text>
          </VStack>
        </Card>
      </SimpleGrid>

      {/* Recommendations */}
      <Box>
        <Heading size="md" fontWeight="600" mb={8}>
          Recommendations
        </Heading>

        {recommendations.length === 0 ? (
          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={12}>
            <VStack spacing={3}>
              <Text fontSize="lg" fontWeight="500">
                All Optimized
              </Text>
              <Text color={subtleText} textAlign="center" maxW="md">
                Your AI usage is well-optimized. We'll notify you if we find opportunities to reduce costs.
              </Text>
            </VStack>
          </Card>
        ) : (
          <VStack spacing={6} align="stretch">
            {recommendations.map((rec, idx) => {
              const savingsPercent = rec.currentCost > 0
                ? ((rec.potentialSavings / rec.currentCost) * 100)
                : 0;

              return (
                <Card
                  key={idx}
                  bg={cardBg}
                  shadow="none"
                  border="1px"
                  borderColor={borderColor}
                  p={8}
                >
                  <VStack align="stretch" spacing={6}>
                    {/* Header */}
                    <HStack justify="space-between" align="start">
                      <Box flex="1">
                        <Heading size="sm" fontWeight="600" mb={2}>
                          {rec.title}
                        </Heading>
                        <Text color={subtleText} fontSize="sm">
                          {rec.description}
                        </Text>
                      </Box>
                      <VStack align="end" spacing={0}>
                        <Text fontSize="xs" color={subtleText}>
                          Save up to
                        </Text>
                        <Text fontSize="2xl" fontWeight="600" color="green.600">
                          {formatCurrency(rec.potentialSavings)}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Cost Breakdown */}
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={1}>
                          CURRENT
                        </Text>
                        <Text fontSize="lg" fontWeight="500">
                          {formatCurrency(rec.currentCost)}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={1}>
                          PROJECTED
                        </Text>
                        <Text fontSize="lg" fontWeight="500">
                          {formatCurrency(rec.projectedCost)}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={1}>
                          REDUCTION
                        </Text>
                        <Text fontSize="lg" fontWeight="500" color="green.600">
                          {savingsPercent.toFixed(0)}%
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </VStack>
                </Card>
              );
            })}
          </VStack>
        )}
      </Box>
    </VStack>
  );
};
