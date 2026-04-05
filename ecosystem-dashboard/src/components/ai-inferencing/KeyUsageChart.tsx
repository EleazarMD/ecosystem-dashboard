/**
 * Key Usage Chart Component
 * Displays usage metrics for API keys over time
 */

import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  
} from '@chakra-ui/react';
import { FiTrendingUp, FiActivity, FiDollarSign } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KeyUsageData {
  provider: string;
  requestCount: number;
  tokenCount: number;
  cost: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface KeyUsageChartProps {
  data: KeyUsageData[];
  timeRange?: string;
}

export const KeyUsageChart: React.FC<KeyUsageChartProps> = ({ data, timeRange = '24h' }) => {
  const cardBg = useSemanticToken('surface.elevated');
  const statBg = useSemanticToken('surface.hover');

  const providerColors: Record<string, string> = {
    openai: 'green',
    anthropic: 'purple',
    google: 'blue',
    ollama: 'orange',
    perplexity: 'pink',
  };

  const totalRequests = data.reduce((sum, item) => sum + item.requestCount, 0);
  const totalTokens = data.reduce((sum, item) => sum + item.tokenCount, 0);
  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);

  return (
    <Card bg={cardBg}>
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">API Key Usage</Heading>
          <Badge colorScheme="blue">{timeRange}</Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Summary Stats */}
          <HStack spacing={4}>
            <Stat flex="1" p={3} bg={statBg} borderRadius="md">
              <StatLabel fontSize="xs">Total Requests</StatLabel>
              <StatNumber>{totalRequests.toLocaleString()}</StatNumber>
              <StatHelpText>
                <HStack spacing={1}>
                  <FiActivity />
                  <Text>All providers</Text>
                </HStack>
              </StatHelpText>
            </Stat>

            <Stat flex="1" p={3} bg={statBg} borderRadius="md">
              <StatLabel fontSize="xs">Total Tokens</StatLabel>
              <StatNumber>{(totalTokens / 1000).toFixed(1)}K</StatNumber>
              <StatHelpText>
                <HStack spacing={1}>
                  <FiTrendingUp />
                  <Text>Usage</Text>
                </HStack>
              </StatHelpText>
            </Stat>

            <Stat flex="1" p={3} bg={statBg} borderRadius="md">
              <StatLabel fontSize="xs">Total Cost</StatLabel>
              <StatNumber>${totalCost.toFixed(4)}</StatNumber>
              <StatHelpText>
                <HStack spacing={1}>
                  <FiDollarSign />
                  <Text>Spend</Text>
                </HStack>
              </StatHelpText>
            </Stat>
          </HStack>

          {/* Per-Provider Breakdown */}
          <Box>
            <Text fontSize="sm" fontWeight="bold" mb={3}>
              By Provider
            </Text>
            <VStack spacing={2} align="stretch">
              {data.map((item) => {
                const colorScheme = providerColors[item.provider.toLowerCase()] || 'gray';
                const percentage = totalRequests > 0 
                  ? ((item.requestCount / totalRequests) * 100).toFixed(1) 
                  : '0';

                return (
                  <Box
                    key={item.provider}
                    p={3}
                    bg={statBg}
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderLeftColor={`${colorScheme}.500`}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Badge colorScheme={colorScheme} textTransform="capitalize">
                          {item.provider}
                        </Badge>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {percentage}% of traffic
                        </Text>
                      </HStack>
                      {item.trend !== 'stable' && (
                        <HStack spacing={1} fontSize="sm">
                          <StatArrow type={item.trend === 'up' ? 'increase' : 'decrease'} />
                          <Text>{item.trendPercentage}%</Text>
                        </HStack>
                      )}
                    </HStack>

                    <HStack spacing={4} fontSize="sm">
                      <Text>
                        <strong>{item.requestCount.toLocaleString()}</strong> requests
                      </Text>
                      <Text>
                        <strong>{(item.tokenCount / 1000).toFixed(1)}K</strong> tokens
                      </Text>
                      <Text>
                        <strong>${item.cost.toFixed(4)}</strong> cost
                      </Text>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </Box>

          {data.length === 0 && (
            <Box textAlign="center" py={8} color={useSemanticToken('text.secondary')}>
              <Text>No usage data available for this time range</Text>
              <Text fontSize="sm" mt={2}>
                Usage data will appear after API keys are used
              </Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default KeyUsageChart;
