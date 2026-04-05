import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  Flex,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { FiActivity, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  avgLatency: number;
  successRate: number;
  totalCost: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface ModelUsagePanelProps {
  usage: ModelUsage[];
  totalRequests: number;
}

export const ModelUsagePanel: React.FC<ModelUsagePanelProps> = ({ usage, totalRequests }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const topModels = usage.slice(0, 10);
  const mostUsed = usage[0];
  const mostExpensive = [...usage].sort((a, b) => b.totalCost - a.totalCost)[0];
  const fastest = [...usage].sort((a, b) => a.avgLatency - b.avgLatency)[0];

  return (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Icon as={FiActivity} /> Model Usage Analytics
      </Heading>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        {mostUsed && (
          <Card variant="outline">
            <CardBody>
              <Stat>
                <StatLabel>Most Used Model</StatLabel>
                <StatNumber fontSize="lg">{mostUsed.model}</StatNumber>
                <StatHelpText>
                  {mostUsed.requestCount} requests ({((mostUsed.requestCount / totalRequests) * 100).toFixed(1)}%)
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        )}

        {fastest && (
          <Card variant="outline">
            <CardBody>
              <Stat>
                <StatLabel>Fastest Model</StatLabel>
                <StatNumber fontSize="lg">{fastest.model}</StatNumber>
                <StatHelpText>
                  {fastest.avgLatency}ms avg latency
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        )}

        {mostExpensive && (
          <Card variant="outline">
            <CardBody>
              <Stat>
                <StatLabel>Highest Cost Model</StatLabel>
                <StatNumber fontSize="lg">{mostExpensive.model}</StatNumber>
                <StatHelpText>
                  {formatCurrency(mostExpensive.totalCost)} total
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        )}
      </SimpleGrid>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <Heading size="sm">Top Models by Request Volume</Heading>
        </CardHeader>
        <CardBody>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Model</Th>
                  <Th>Provider</Th>
                  <Th isNumeric>Requests</Th>
                  <Th>Usage %</Th>
                  <Th isNumeric>Avg Latency</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Cost</Th>
                  <Th isNumeric>Success Rate</Th>
                  <Th>Trend</Th>
                </Tr>
              </Thead>
              <Tbody>
                {topModels.map((model) => {
                  const usagePercent = (model.requestCount / totalRequests) * 100;
                  
                  return (
                    <Tr key={`${model.model}-${model.provider}`}>
                      <Td>
                        <Text fontSize="xs" fontWeight="medium">
                          {model.model}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme="blue" fontSize="xs">
                          {model.provider}
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="xs" fontWeight="bold">
                          {formatNumber(model.requestCount)}
                        </Text>
                      </Td>
                      <Td>
                        <Flex align="center" gap={2}>
                          <Progress
                            value={usagePercent}
                            size="sm"
                            colorScheme="purple"
                            width="60px"
                          />
                          <Text fontSize="xs" minW="45px">
                            {usagePercent.toFixed(1)}%
                          </Text>
                        </Flex>
                      </Td>
                      <Td isNumeric>
                        <Text
                          fontSize="xs"
                          color={model.avgLatency < 1000 ? 'green.500' : model.avgLatency < 2000 ? 'orange.500' : 'red.500'}
                        >
                          {model.avgLatency}ms
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="xs">{formatNumber(model.totalTokens)}</Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="xs">{formatCurrency(model.totalCost)}</Text>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={model.successRate >= 95 ? 'green' : model.successRate >= 90 ? 'yellow' : 'red'}
                          fontSize="xs"
                        >
                          {model.successRate.toFixed(1)}%
                        </Badge>
                      </Td>
                      <Td>
                        <Flex align="center" gap={1} justify="flex-end">
                          {model.trend === 'up' && (
                            <>
                              <Icon as={FiTrendingUp} color="green.500" boxSize={3} />
                              <Text fontSize="xs" color="green.500">
                                +{model.trendPercentage}%
                              </Text>
                            </>
                          )}
                          {model.trend === 'down' && (
                            <>
                              <Icon as={FiTrendingDown} color="red.500" boxSize={3} />
                              <Text fontSize="xs" color="red.500">
                                -{model.trendPercentage}%
                              </Text>
                            </>
                          )}
                          {model.trend === 'stable' && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              stable
                            </Text>
                          )}
                        </Flex>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          {topModels.length === 0 && (
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>No model usage data available</Text>
            </Flex>
          )}
        </CardBody>
      </Card>
    </Box>
  );
};
