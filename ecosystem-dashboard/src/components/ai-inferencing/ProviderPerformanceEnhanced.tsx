/**
 * Provider Performance Analytics - Enhanced with comparison visualizations
 * Head-to-head provider comparison with actionable insights
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Progress,
  Button,
  ButtonGroup,
  Icon,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiTrendingUp, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ProviderMetrics {
  provider: string;
  status: string;
  requestCount: number;
  errorCount: number;
  avgLatency: number;
  successRate: number;
  totalCost: number;
  totalTokens: number;
  uptime: number;
  costEfficiency: number;
}

interface Props {
  providers: ProviderMetrics[];
  timeRange: string;
}

export function ProviderPerformanceEnhanced({ providers, timeRange }: Props) {
  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');
  const insightBg = useSemanticToken('surface.highlight');

  // Calculate totals
  const totalRequests = providers.reduce((sum, p) => sum + p.requestCount, 0);
  const avgSuccessRate = providers.length > 0
    ? providers.reduce((sum, p) => sum + p.successRate, 0) / providers.length
    : 0;

  // Prepare radar chart data (multi-dimensional comparison)
  const radarData = [
    {
      metric: 'Reliability',
      OpenAI: providers.find(p => p.provider.toLowerCase() === 'openai')?.successRate || 0,
      Google: providers.find(p => p.provider.toLowerCase() === 'google')?.successRate || 0,
      Anthropic: providers.find(p => p.provider.toLowerCase() === 'anthropic')?.successRate || 0,
    },
    {
      metric: 'Speed',
      OpenAI: Math.max(0, 100 - (providers.find(p => p.provider.toLowerCase() === 'openai')?.avgLatency || 0) / 100),
      Google: Math.max(0, 100 - (providers.find(p => p.provider.toLowerCase() === 'google')?.avgLatency || 0) / 100),
      Anthropic: Math.max(0, 100 - (providers.find(p => p.provider.toLowerCase() === 'anthropic')?.avgLatency || 0) / 100),
    },
    {
      metric: 'Volume',
      OpenAI: (providers.find(p => p.provider.toLowerCase() === 'openai')?.requestCount || 0) / Math.max(totalRequests / 100, 1),
      Google: (providers.find(p => p.provider.toLowerCase() === 'google')?.requestCount || 0) / Math.max(totalRequests / 100, 1),
      Anthropic: (providers.find(p => p.provider.toLowerCase() === 'anthropic')?.requestCount || 0) / Math.max(totalRequests / 100, 1),
    },
    {
      metric: 'Cost Efficiency',
      OpenAI: providers.find(p => p.provider.toLowerCase() === 'openai')?.costEfficiency || 0,
      Google: providers.find(p => p.provider.toLowerCase() === 'google')?.costEfficiency || 0,
      Anthropic: providers.find(p => p.provider.toLowerCase() === 'anthropic')?.costEfficiency || 0,
    },
  ];

  // Uptime data for horizontal bars
  const uptimeData = providers.map(p => ({
    provider: p.provider,
    uptime: p.uptime || 0,
  }));

  // Cost comparison
  const costData = providers.map(p => ({
    provider: p.provider,
    cost: p.totalCost,
    requests: p.requestCount,
  }));

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
        return FiCheckCircle;
      case 'degraded':
        return FiAlertTriangle;
      case 'down':
      case 'inactive':
        return FiXCircle;
      default:
        return FiAlertTriangle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'active':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'down':
      case 'inactive':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Compact Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm">
            <Text fontWeight="500">{providers.length} providers</Text>
            <Text>·</Text>
            <Text>{totalRequests} requests</Text>
            <Text>·</Text>
            <Text fontWeight="600" color={avgSuccessRate >= 95 ? 'green.500' : 'yellow.500'}>
              {avgSuccessRate.toFixed(1)}% avg success rate
            </Text>
          </HStack>
        </VStack>

        <ButtonGroup size="sm" isAttached variant="outline">
          <Button colorScheme={timeRange === '24h' ? 'blue' : 'gray'}>24h</Button>
          <Button colorScheme={timeRange === '7d' ? 'blue' : 'gray'}>7d</Button>
          <Button colorScheme={timeRange === '30d' ? 'blue' : 'gray'}>30d</Button>
        </ButtonGroup>
      </HStack>

      {/* Provider Health Status Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {providers.map((provider) => (
          <Card
            key={provider.provider}
            borderWidth="1px"
            borderColor={borderColor}
            _hover={{ borderColor: getStatusColor(provider.status) + '.400' }}
          >
            <CardBody>
              <VStack align="start" spacing={2}>
                <HStack justify="space-between" width="full">
                  <Text fontSize="lg" fontWeight="600" textTransform="capitalize">
                    {provider.provider}
                  </Text>
                  <Badge colorScheme={getStatusColor(provider.status)}>
                    <HStack spacing={1}>
                      <Icon as={getStatusIcon(provider.status)} />
                      <Text>{provider.status}</Text>
                    </HStack>
                  </Badge>
                </HStack>
                <HStack width="full" justify="space-between">
                  <Text fontSize="2xl" fontWeight="700">
                    {provider.successRate.toFixed(1)}%
                  </Text>
                  <VStack align="end" spacing={0}>
                    <Text fontSize="xs" color={mutedText}>
                      {provider.requestCount} requests
                    </Text>
                    <Text fontSize="xs" color={mutedText}>
                      {provider.avgLatency}ms avg
                    </Text>
                  </VStack>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>

      {/* Multi-Dimensional Comparison (Radar Chart) */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="md" fontWeight="600" mb={4}>
            Multi-Dimensional Comparison
          </Text>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke={borderColor} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: mutedText }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="OpenAI"
                  dataKey="OpenAI"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Google"
                  dataKey="Google"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Anthropic"
                  dataKey="Anthropic"
                  stroke="#ffc658"
                  fill="#ffc658"
                  fillOpacity={0.3}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      {/* Two Charts Side-by-Side */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Uptime & Reliability */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Uptime & Reliability (Last 30 Days)
            </Text>
            <VStack spacing={3} align="stretch">
              {uptimeData.map((item) => (
                <Box key={item.provider}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="500" textTransform="capitalize">
                      {item.provider}
                    </Text>
                    <Text fontSize="sm" fontWeight="600">
                      {item.uptime.toFixed(1)}%
                    </Text>
                  </HStack>
                  <Progress
                    value={item.uptime}
                    colorScheme={item.uptime >= 99 ? 'green' : item.uptime >= 95 ? 'yellow' : 'red'}
                    size="sm"
                    borderRadius="full"
                  />
                </Box>
              ))}
            </VStack>
          </CardBody>
        </Card>

        {/* Cost per Provider */}
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={4}>
              Cost Distribution
            </Text>
            <Box height="150px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="provider" type="category" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: useSemanticToken('surface.elevated'),
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `$${value.toFixed(4)}`}
                  />
                  <Bar dataKey="cost" fill="#9F7AEA" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Detailed Metrics Table */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody p={0}>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>PROVIDER</Th>
                <Th isNumeric>REQUESTS</Th>
                <Th isNumeric>AVG LATENCY</Th>
                <Th isNumeric>SUCCESS RATE</Th>
                <Th isNumeric>TOTAL COST</Th>
              </Tr>
            </Thead>
            <Tbody>
              {providers.map((provider) => (
                <Tr key={provider.provider} _hover={{ bg: bgHover }}>
                  <Td>
                    <HStack>
                      <Icon
                        as={getStatusIcon(provider.status)}
                        color={getStatusColor(provider.status) + '.500'}
                      />
                      <Text fontWeight="600" textTransform="capitalize">
                        {provider.provider}
                      </Text>
                    </HStack>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="sm">{provider.requestCount}</Text>
                  </Td>
                  <Td isNumeric>
                    <Badge
                      colorScheme={
                        provider.avgLatency < 1000
                          ? 'green'
                          : provider.avgLatency < 5000
                          ? 'yellow'
                          : 'red'
                      }
                    >
                      {provider.avgLatency}ms
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <HStack justify="flex-end">
                      <Progress
                        value={provider.successRate}
                        width="60px"
                        size="sm"
                        colorScheme={
                          provider.successRate >= 95
                            ? 'green'
                            : provider.successRate >= 80
                            ? 'yellow'
                            : 'red'
                        }
                        borderRadius="full"
                      />
                      <Text fontSize="sm" fontWeight="500" minW="45px">
                        {provider.successRate.toFixed(1)}%
                      </Text>
                    </HStack>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="sm" fontWeight="500">
                      ${provider.totalCost.toFixed(4)}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Insights */}
      <Card borderWidth="1px" borderColor={borderColor} bg={insightBg}>
        <CardBody>
          <HStack spacing={3} align="start">
            <Icon as={FiZap} boxSize={5} color="blue.500" mt={0.5} />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="600">
                Provider Performance Insights
              </Text>
              <Text fontSize="xs" color={mutedText}>
                {providers.filter(p => p.successRate >= 95).length} of {providers.length} providers are healthy. 
                {providers.find(p => p.successRate < 80) && (
                  <> {providers.find(p => p.successRate < 80)?.provider} needs attention.</>
                )}
              </Text>
            </VStack>
          </HStack>
        </CardBody>
      </Card>
    </VStack>
  );
}
