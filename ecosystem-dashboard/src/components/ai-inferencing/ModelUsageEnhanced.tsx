/**
 * Model Usage Analytics - Enhanced with visualizations and insights
 * Compact design, actionable intelligence
 */

import React, { useState, useEffect } from 'react';
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
  Collapse,
  Icon,
  Divider,
} from '@chakra-ui/react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiAlertCircle, FiInfo, FiZap, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ModelMetrics {
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

interface Insight {
  type: 'error' | 'warning' | 'optimization' | 'info';
  icon: any;
  message: string;
  action?: string;
  priority: number;
}

interface Props {
  models: ModelMetrics[];
  timeRange: string;
  onNavigateToProvider?: (providerId: string) => void;
  onNavigateToLogs?: (modelId: string) => void;
}

export function ModelUsageEnhanced({
  models,
  timeRange,
  onNavigateToProvider,
  onNavigateToLogs
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const bgHover = useSemanticToken('surface.hover');

  // Calculate totals
  const totalRequests = models.reduce((sum, m) => sum + m.requestCount, 0);
  const totalTokens = models.reduce((sum, m) => sum + m.totalTokens, 0);
  const totalCost = models.reduce((sum, m) => sum + m.totalCost, 0);

  // Generate insights
  useEffect(() => {
    const generated = generateInsights(models);
    setInsights(generated);
  }, [models]);

  // Generate chart data (mock for now - will be real API data)
  useEffect(() => {
    const data = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const point: any = { day: days[i] };
      models.forEach(model => {
        // Mock trend data - in real version, this comes from API
        point[model.model] = Math.floor(Math.random() * 5) + 1;
      });
      point.cost = (Math.random() * 2 + 0.5).toFixed(2);
      data.push(point);
    }

    setChartData(data);
  }, [models]);

  const toggleRow = (model: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(model)) {
      newExpanded.delete(model);
    } else {
      newExpanded.add(model);
    }
    setExpandedRows(newExpanded);
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return 'green';
    if (latency < 10000) return 'yellow';
    return 'red';
  };

  const getLatencyEmoji = (latency: number) => {
    if (latency < 1000) return '🟢';
    if (latency < 10000) return '🟡';
    return '🔴';
  };

  return (
    <VStack spacing={6} align="stretch" width="full" suppressHydrationWarning>
      {/* Compact Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm" suppressHydrationWarning>
            <Text fontWeight="500">{models.length} models</Text>
            <Text>·</Text>
            <Text>{totalRequests.toLocaleString()} requests</Text>
            <Text>·</Text>
            <Text>{(totalTokens / 1000).toFixed(1)}K tokens</Text>
            <Text>·</Text>
            <Text fontWeight="600" color="purple.500">
              ${totalCost.toFixed(2)} cost
            </Text>
          </HStack>
          <HStack spacing={3} fontSize="xs" color="green.500">
            <HStack spacing={1}>
              <Icon as={FiTrendingUp} />
              <Text>+12% models</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FiTrendingUp} />
              <Text>+15% requests</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FiTrendingUp} />
              <Text>+8% tokens</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FiTrendingUp} />
              <Text>+21% cost</Text>
            </HStack>
          </HStack>
        </VStack>

        <ButtonGroup size="sm" isAttached variant="outline">
          <Button colorScheme={timeRange === '24h' ? 'blue' : 'gray'}>24h</Button>
          <Button colorScheme={timeRange === '7d' ? 'blue' : 'gray'}>7d</Button>
          <Button colorScheme={timeRange === '30d' ? 'blue' : 'gray'}>30d</Button>
        </ButtonGroup>
      </HStack>

      {/* Main Chart: Requests & Cost Trends */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody>
          <Text fontSize="md" fontWeight="600" mb={4}>
            Request & Cost Trends
          </Text>
          <Box height="300px">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke={mutedText} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke={mutedText} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke={mutedText} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: useSemanticToken('surface.elevated'),
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                  }}
                />
                <Legend />

                {/* Bars for each model */}
                {models.slice(0, 4).map((model, i) => (
                  <Bar
                    key={model.model}
                    yAxisId="left"
                    dataKey={model.model}
                    fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][i]}
                    stackId="models"
                  />
                ))}

                {/* Line for cost */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  stroke="#9F7AEA"
                  strokeWidth={2}
                  name="Cost ($)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>

      {/* Rich Table */}
      <Card borderWidth="1px" borderColor={borderColor}>
        <CardBody p={0}>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>MODEL</Th>
                <Th>REQUESTS</Th>
                <Th>LATENCY</Th>
                <Th>COST</Th>
                <Th width="50px"></Th>
              </Tr>
            </Thead>
            <Tbody>
              {models.map((model) => {
                const isExpanded = expandedRows.has(model.model);
                const requestPercent = totalRequests > 0 ? (model.requestCount / totalRequests) * 100 : 0;
                const costPercent = totalCost > 0 ? (model.totalCost / totalCost) * 100 : 0;

                return (
                  <React.Fragment key={model.model}>
                    <Tr
                      _hover={{ bg: bgHover }}
                      cursor="pointer"
                      onClick={() => toggleRow(model.model)}
                    >
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="600" fontSize="sm">
                            {model.model}
                          </Text>
                          <Text
                            fontSize="xs"
                            color="blue.500"
                            cursor="pointer"
                            _hover={{ textDecoration: 'underline' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigateToProvider?.(model.provider.toLowerCase());
                            }}
                          >
                            {model.provider}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="500">
                              {model.requestCount}
                            </Text>
                            <Text fontSize="xs" color={mutedText}>
                              ({requestPercent.toFixed(0)}%)
                            </Text>
                          </HStack>
                          <Progress
                            value={requestPercent}
                            size="xs"
                            colorScheme="blue"
                            width="100px"
                            borderRadius="full"
                          />
                        </VStack>
                      </Td>
                      <Td>
                        <HStack>
                          <Text fontSize="sm">
                            {model.avgLatency < 1000
                              ? `${model.avgLatency}ms`
                              : `${(model.avgLatency / 1000).toFixed(1)}s`}
                          </Text>
                          <Text>{getLatencyEmoji(model.avgLatency)}</Text>
                        </HStack>
                      </Td>
                      <Td>
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="500">
                            ${model.totalCost.toFixed(4)}
                          </Text>
                          <Progress
                            value={costPercent}
                            size="xs"
                            colorScheme="purple"
                            width="100px"
                            borderRadius="full"
                          />
                        </VStack>
                      </Td>
                      <Td>
                        <Icon
                          as={isExpanded ? FiChevronDown : FiChevronRight}
                          color={mutedText}
                        />
                      </Td>
                    </Tr>

                    <Tr>
                      <Td colSpan={5} p={0} borderBottom={isExpanded ? '1px' : '0'} borderColor={borderColor}>
                        <Collapse in={isExpanded} animateOpacity>
                          <Box p={4} bg={useSemanticToken('surface.elevated')}>
                            <HStack spacing={6} fontSize="sm">
                              <VStack align="start" spacing={0}>
                                <Text color={mutedText} fontSize="xs">Success Rate</Text>
                                <Text fontWeight="600">{model.successRate.toFixed(1)}%</Text>
                              </VStack>
                              <VStack align="start" spacing={0}>
                                <Text color={mutedText} fontSize="xs">Total Tokens</Text>
                                <Text fontWeight="600">{(model.totalTokens / 1000).toFixed(1)}K</Text>
                              </VStack>
                              <VStack align="start" spacing={0}>
                                <Text color={mutedText} fontSize="xs">Errors</Text>
                                <Text fontWeight="600" color={model.errorCount > 0 ? 'red.500' : 'green.500'}>
                                  {model.errorCount}
                                </Text>
                              </VStack>
                              <VStack align="start" spacing={0}>
                                <Text color={mutedText} fontSize="xs">Cost/Request</Text>
                                <Text fontWeight="600">
                                  ${model.requestCount > 0 ? (model.totalCost / model.requestCount).toFixed(4) : '0.0000'}
                                </Text>
                              </VStack>
                            </HStack>
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <Text fontSize="md" fontWeight="600" mb={3}>
              Insights & Recommendations
            </Text>
            <VStack spacing={2} align="stretch">
              {insights.map((insight, i) => (
                <HStack
                  key={i}
                  p={3}
                  bg={getInsightBg(insight.type)}
                  borderRadius="md"
                  align="start"
                  borderWidth="1px"
                  borderColor={getInsightBorderColor(insight.type)}
                >
                  <Icon as={insight.icon} boxSize={5} mt={0.5} />
                  <VStack align="start" spacing={0} flex={1}>
                    <Text fontSize="sm" fontWeight="500">
                      {insight.message}
                    </Text>
                    {insight.action && (
                      <Text fontSize="xs" color={mutedText} mt={1}>
                        → {insight.action}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}

// Helper functions
function generateInsights(models: ModelMetrics[]): Insight[] {
  const insights: Insight[] = [];

  // Rule 1: Failed models
  models.forEach(model => {
    if (model.successRate < 50 && model.requestCount > 0) {
      insights.push({
        type: 'error',
        icon: FiAlertCircle,
        message: `${model.model} has ${model.successRate.toFixed(0)}% success rate (${model.errorCount} failed requests)`,
        action: 'Check API key validity or model availability',
        priority: 5,
      });
    }
  });

  // Rule 2: Cost efficiency
  const sortedByCost = [...models]
    .filter(m => m.requestCount > 0 && m.successRate > 80)
    .sort((a, b) => (b.totalCost / b.requestCount) - (a.totalCost / a.requestCount));

  if (sortedByCost.length >= 2) {
    const expensive = sortedByCost[0];
    const cheap = sortedByCost[sortedByCost.length - 1];
    const costRatio = (expensive.totalCost / expensive.requestCount) /
      (cheap.totalCost / cheap.requestCount);
    const totalRequests = models.reduce((sum, m) => sum + m.requestCount, 0);

    if (costRatio > 5 && expensive.requestCount < totalRequests * 0.3) {
      const dailySavings = ((expensive.totalCost / expensive.requestCount) -
        (cheap.totalCost / cheap.requestCount)) * expensive.requestCount;

      insights.push({
        type: 'optimization',
        icon: FiZap,
        message: `${expensive.model} is ${costRatio.toFixed(0)}x more expensive than ${cheap.model} but only ${((expensive.requestCount / totalRequests) * 100).toFixed(0)}% of requests`,
        action: `Consider using ${cheap.model} for similar tasks to save $${dailySavings.toFixed(2)}/day`,
        priority: 4,
      });
    }
  }

  // Rule 3: High latency
  models.forEach(model => {
    if (model.avgLatency > 30000 && model.requestCount > 3) {
      insights.push({
        type: 'warning',
        icon: FiInfo,
        message: `${model.model} has high average latency (${(model.avgLatency / 1000).toFixed(1)}s)`,
        action: 'Consider using a faster model for time-sensitive tasks',
        priority: 3,
      });
    }
  });

  // Rule 4: Unused models
  models.forEach(model => {
    if (model.requestCount === 0) {
      insights.push({
        type: 'info',
        icon: FiInfo,
        message: `${model.model} is configured but unused`,
        action: 'Remove API key if not needed to reduce clutter',
        priority: 1,
      });
    }
  });

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

function getInsightBg(type: string) {
  const light = {
    error: 'red.50',
    warning: 'yellow.50',
    optimization: 'blue.50',
    info: 'gray.50',
  };
  const dark = {
    error: 'red.900',
    warning: 'yellow.900',
    optimization: 'blue.900',
    info: 'gray.800',
  };
  return { light: light[type as keyof typeof light], dark: dark[type as keyof typeof dark] };
}

function getInsightBorderColor(type: string) {
  const colors = {
    error: 'red.300',
    warning: 'yellow.300',
    optimization: 'blue.300',
    info: 'gray.300',
  };
  return colors[type as keyof typeof colors];
}
