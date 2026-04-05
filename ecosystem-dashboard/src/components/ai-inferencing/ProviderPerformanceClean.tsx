/**
 * Clean Provider Performance Section
 * Minimal, spacious design with subtle colors
 */

import React from 'react';
import {
  Box,
  Card,
  Heading,
  Text,
  Button,
  SimpleGrid,
  VStack,
  HStack,
  Flex,
  Icon,
  
} from '@chakra-ui/react';
import { FiPlus } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProviderMetrics {
  provider: string;
  status: string;
  avgLatency: number;
  successRate: number;
  requestCount: number;
  errorCount: number;
  totalCost: number;
  totalTokens: number;
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
  providers: ProviderMetrics[];
  overviewStats: OverviewStats | null;
  timeRange: string;
  onAddProvider?: () => void;
}

export const ProviderPerformanceClean: React.FC<Props> = ({
  providers,
  overviewStats,
  timeRange,
  onAddProvider,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const subtleText = useSemanticToken('text.subtle');
  const borderColor = useSemanticToken('border.default');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'green.500';
    if (status === 'inactive') return 'gray.400';
    return 'orange.500';
  };

  return (
    <VStack spacing={12} align="stretch">
      {/* Header with Add Provider Button */}
      <HStack justify="space-between" align="start">
        <Box>
          <Heading size="lg" fontWeight="600" mb={2}>
            Provider Performance
          </Heading>
          <Text color={subtleText} fontSize="sm">
            Real-time metrics for the last {timeRange}
          </Text>
        </Box>
        
        {onAddProvider && (
          <Button
            leftIcon={<Icon as={FiPlus} />}
            onClick={onAddProvider}
            size="sm"
            variant="outline"
            borderColor={borderColor}
          >
            Add LLM Provider
          </Button>
        )}
      </HStack>

      {/* Overview Stats - Clean Grid */}
      {overviewStats && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} spacing={6}>
          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Requests
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {overviewStats.totalRequests.toLocaleString()}
              </Text>
            </VStack>
          </Card>

          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Success Rate
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {overviewStats.successRate.toFixed(1)}%
              </Text>
            </VStack>
          </Card>

          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Avg Latency
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {overviewStats.avgLatency}ms
              </Text>
            </VStack>
          </Card>

          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Error Rate
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {overviewStats.errorRate.toFixed(1)}%
              </Text>
            </VStack>
          </Card>

          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Total Cost
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {formatCurrency(overviewStats.totalCost)}
              </Text>
            </VStack>
          </Card>

          <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
            <VStack align="start" spacing={3}>
              <Text fontSize="xs" color={subtleText} textTransform="uppercase" letterSpacing="wide">
                Tokens
              </Text>
              <Text fontSize="3xl" fontWeight="500">
                {((overviewStats.totalTokens || 0) / 1000).toFixed(1)}K
              </Text>
            </VStack>
          </Card>
        </SimpleGrid>
      )}

      {/* Provider Cards - Spacious */}
      <Box>
        <Heading size="md" fontWeight="600" mb={8}>
          Providers
        </Heading>
        
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
          {providers.map((provider) => {
            const isActive = provider.requestCount > 0;

            return (
              <Card
                key={provider.provider}
                bg={cardBg}
                shadow="none"
                border="1px"
                borderColor={borderColor}
                p={8}
              >
                <VStack align="stretch" spacing={6}>
                  {/* Header */}
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={1}>
                      <Text fontSize="lg" fontWeight="600" textTransform="capitalize">
                        {provider.provider}
                      </Text>
                      <Text fontSize="sm" color={getStatusColor(provider.status)}>
                        {provider.status === 'healthy' ? 'Active' : 
                         provider.status === 'inactive' ? 'No Activity' : 'Degraded'}
                      </Text>
                    </VStack>
                  </Flex>

                  {/* Metrics */}
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="xs" color={subtleText} mb={1}>
                        REQUESTS
                      </Text>
                      <Text fontSize="2xl" fontWeight="500">
                        {provider.requestCount.toLocaleString()}
                      </Text>
                    </Box>

                    <SimpleGrid columns={2} spacing={4}>
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={1}>
                          SUCCESS
                        </Text>
                        <Text fontSize="lg" fontWeight="500">
                          {provider.successRate.toFixed(0)}%
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color={subtleText} mb={1}>
                          ERRORS
                        </Text>
                        <Text fontSize="lg" fontWeight="500">
                          {provider.errorCount}
                        </Text>
                      </Box>
                    </SimpleGrid>

                    {isActive && (
                      <>
                        <Box>
                          <Text fontSize="xs" color={subtleText} mb={1}>
                            LATENCY
                          </Text>
                          <Text fontSize="lg" fontWeight="500">
                            {provider.avgLatency}ms
                          </Text>
                        </Box>

                        <Box>
                          <Text fontSize="xs" color={subtleText} mb={1}>
                            COST
                          </Text>
                          <Text fontSize="lg" fontWeight="500">
                            {formatCurrency(provider.totalCost)}
                          </Text>
                        </Box>
                      </>
                    )}
                  </VStack>
                </VStack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Box>
    </VStack>
  );
};
