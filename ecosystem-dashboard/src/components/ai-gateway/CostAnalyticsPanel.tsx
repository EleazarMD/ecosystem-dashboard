import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Progress,
  SimpleGrid,
  VStack,
  Flex,
} from '@chakra-ui/react';
import { FiDollarSign } from 'react-icons/fi';
import { CostTrendChart } from '../charts/CostTrendChart';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface CostSummary {
  total: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerRequest: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byClient: Record<string, number>;
  trend: Array<{ timestamp: string; cost: number; requests: number }>;
}

interface CostAnalyticsPanelProps {
  costSummary: CostSummary | null;
}

export const CostAnalyticsPanel: React.FC<CostAnalyticsPanelProps> = ({ costSummary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  return (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiDollarSign} /> Cost Analytics
      </Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Cost by Provider</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {costSummary && Object.entries(costSummary.byProvider).map(([provider, cost]) => (
                <Box key={provider}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">{provider}</Text>
                    <Text fontSize="sm" fontWeight="bold">{formatCurrency(Number(cost))}</Text>
                  </Flex>
                  <Progress
                    value={(Number(cost) / costSummary.total) * 100}
                    size="sm"
                    colorScheme="purple"
                  />
                </Box>
              ))}
              {(!costSummary || Object.keys(costSummary.byProvider).length === 0) && (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">No cost data available</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="sm">Cost by Model</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {costSummary && Object.entries(costSummary.byModel)
                .sort(([,a], [,b]) => Number(b) - Number(a))
                .slice(0, 5)
                .map(([model, cost]) => (
                  <Box key={model}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium" isTruncated maxW="200px">
                        {model}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">{formatCurrency(Number(cost))}</Text>
                    </Flex>
                    <Progress
                      value={(Number(cost) / costSummary.total) * 100}
                      size="sm"
                      colorScheme="orange"
                    />
                  </Box>
                ))}
              {(!costSummary || Object.keys(costSummary.byModel).length === 0) && (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">No cost data available</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <Heading size="sm">Cost Trend</Heading>
        </CardHeader>
        <CardBody>
          <Box h="250px">
            {costSummary?.trend && costSummary.trend.length > 0 ? (
              <CostTrendChart data={costSummary.trend} />
            ) : (
              <Flex h="100%" align="center" justify="center">
                <Text color={useSemanticToken('text.secondary')}>No trend data available</Text>
              </Flex>
            )}
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
};
