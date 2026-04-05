/**
 * Enhanced Model Usage Section
 * Modern, sophisticated design for model analytics
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiCpu,
  FiZap,
  FiTrendingUp,
  FiDollarSign,
} from 'react-icons/fi';

interface ModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
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
  models: ModelUsage[];
  overviewStats: OverviewStats | null;
  timeRange: string;
}

export const ModelUsageSectionEnhanced: React.FC<Props> = ({
  models,
  overviewStats,
  timeRange,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const tableHeaderBg = useSemanticToken('surface.hover');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(amount);
  };

  const getProviderColor = (provider: string) => {
    const colors = {
      google: 'blue',
      openai: 'green',
      anthropic: 'orange',
    };
    return colors[provider.toLowerCase()] || 'gray';
  };

  // Calculate totals
  const totalRequests = models.reduce((sum, m) => sum + m.requestCount, 0);
  const totalCost = models.reduce((sum, m) => sum + m.totalCost, 0);
  const totalTokens = models.reduce((sum, m) => sum + m.totalTokens, 0);

  return (
    <VStack spacing={6} align="stretch">
      {/* Section Header */}
      <HStack spacing={4}>
        <Circle size="40px" bg={useSemanticToken('interactive.secondary')}>
          <Icon as={FiCpu} color={useSemanticToken('text.inverse')} boxSize={5} />
        </Circle>
        <Box>
          <Heading size="md" mb={1}>
            Model Usage Analytics
          </Heading>
          <Text fontSize="sm" color={mutedText}>
            Detailed breakdown by model • Last {timeRange}
          </Text>
        </Box>
      </HStack>

      {/* Summary Cards */}
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
                <Icon as={FiActivity} color={useSemanticToken('interactive.secondary')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  MODELS
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {models.length}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Active models
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
                <Icon as={FiZap} color={useSemanticToken('interactive.primary')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  REQUESTS
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {totalRequests.toLocaleString()}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Total requests
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
                <Icon as={FiTrendingUp} color={useSemanticToken('status.warning')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  TOKENS
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {((totalTokens || 0) / 1000).toFixed(1)}K
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Total tokens
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
                <Icon as={FiDollarSign} color={useSemanticToken('status.success')} boxSize={4} />
                <Text fontSize="xs" color={mutedText} fontWeight="medium">
                  COST
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" lineHeight="1">
                {formatCurrency(totalCost)}
              </Text>
              <Text fontSize="xs" color={mutedText}>
                Total spend
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Model Table */}
      <Card bg={cardBg} shadow="sm" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead bg={tableHeaderBg}>
              <Tr>
                <Th>Model</Th>
                <Th>Provider</Th>
                <Th isNumeric>Requests</Th>
                <Th isNumeric>Success Rate</Th>
                <Th isNumeric>Avg Latency</Th>
                <Th isNumeric>Tokens</Th>
                <Th isNumeric>Cost</Th>
              </Tr>
            </Thead>
            <Tbody>
              {models.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <VStack spacing={2}>
                      <Icon as={FiActivity} boxSize={8} color={mutedText} />
                      <Text color={mutedText}>No model usage data available</Text>
                      <Text fontSize="sm" color={mutedText}>
                        Generate some API requests to see analytics
                      </Text>
                    </VStack>
                  </Td>
                </Tr>
              ) : (
                models.map((model, idx) => {
                  const usagePercent = (model.requestCount / totalRequests) * 100;
                  
                  return (
                    <Tr
                      key={`${model.provider}-${model.model}-${idx}`}
                      _hover={{ bg: useSemanticToken('surface.hover') }}
                    >
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="medium" fontSize="sm">
                            {model.model}
                          </Text>
                          <Progress
                            value={usagePercent}
                            size="xs"
                            colorScheme={getProviderColor(model.provider)}
                            width="100px"
                            borderRadius="full"
                          />
                        </VStack>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={getProviderColor(model.provider)}
                          fontSize="xs"
                          textTransform="capitalize"
                        >
                          {model.provider}
                        </Badge>
                      </Td>
                      <Td isNumeric fontWeight="medium">
                        {model.requestCount.toLocaleString()}
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={model.successRate >= 95 ? 'green' : 'yellow'}
                          fontSize="xs"
                        >
                          {model.successRate.toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        <Text
                          color={
                            model.avgLatency < 1000
                              ? 'green.500'
                              : model.avgLatency < 3000
                              ? 'orange.500'
                              : 'red.500'
                          }
                          fontWeight="medium"
                        >
                          {model.avgLatency}ms
                        </Text>
                      </Td>
                      <Td isNumeric>
                        {((model.totalTokens || 0) / 1000).toFixed(1)}K
                      </Td>
                      <Td isNumeric fontWeight="medium">
                        {formatCurrency(model.totalCost)}
                      </Td>
                    </Tr>
                  );
                })
              )}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </VStack>
  );
};
