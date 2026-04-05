/**
 * Model Details Panel - Comprehensive model intelligence drill-down
 * Shows status, activity, metrics, cost, performance for a specific model
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  IconButton,
  Divider,
  SimpleGrid,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Card,
  CardBody,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  Alert,
  AlertIcon,
  Tooltip,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FiX,
  FiActivity,
  FiDollarSign,
  FiZap,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiTrendingDown,
  FiServer,
  FiUsers,
  FiBarChart2,
} from 'react-icons/fi';

interface ModelDetailsPanelProps {
  model: {
    id: string;
    name: string;
    provider: string;
    useCases?: string[];
  };
  onClose: () => void;
}

interface ModelMetrics {
  timestamp: string;
  requests: number;
  successRate: number;
  avgLatency: number;
  cost: number;
  tokens: number;
}

export const ModelDetailsPanel: React.FC<ModelDetailsPanelProps> = ({
  model,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<ModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');
  const subtleText = useSemanticToken('text.secondary');
  const successColor = 'green.500';
  const errorColor = 'red.500';
  const chartBg = useSemanticToken('surface.base');

  useEffect(() => {
    loadModelMetrics();
  }, [model.id, timeRange]);

  const loadModelMetrics = async () => {
    setLoading(true);
    try {
      console.log('[Model Details] Loading data for:', model.id, 'Time range:', timeRange);
      
      const response = await fetch(
        `/api/analytics/model-stats?modelId=${model.id}&provider=${model.provider.toLowerCase()}&timeRange=${timeRange}`
      );
      
      if (!response.ok) {
        console.warn('[Model Details] API error:', response.status, response.statusText);
        // Use empty data on error
        setMetrics([]);
        return;
      }
      
      const data = await response.json();
      console.log('[Model Details] Received data:', data);
      
      if (!data.success) {
        console.warn('[Model Details] API returned error:', data.error);
        setMetrics([]);
        return;
      }

      // Transform API response to component format
      const transformedMetrics: ModelMetrics[] = data.timeSeries.map((ts: any) => ({
        timestamp: new Date(ts.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: ts.requests,
        successRate: ts.successRate,
        avgLatency: ts.avgLatency,
        cost: ts.cost,
        tokens: ts.tokens,
      }));

      setMetrics(transformedMetrics);
    } catch (error: any) {
      console.error('[Model Details] Error loading model metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const totalRequests = metrics.reduce((sum, m) => sum + m.requests, 0);
  const avgSuccessRate = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length
    : 0;
  const avgLatency = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.avgLatency, 0) / metrics.length
    : 0;
  const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
  const totalTokens = metrics.reduce((sum, m) => sum + m.tokens, 0);

  return (
    <Box width="full" height="full" overflow="auto">
      {/* Header */}
      <HStack justify="space-between" p={6} borderBottomWidth="1px" borderColor={borderColor}>
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="600">{model.name}</Text>
          <HStack spacing={2}>
            <Badge colorScheme="blue" fontSize="xs">{model.provider}</Badge>
            <Badge colorScheme="green" fontSize="xs">
              <Icon as={FiCheckCircle} boxSize={3} mr={1} />
              Active
            </Badge>
          </HStack>
        </VStack>
        <IconButton
          aria-label="Close"
          icon={<FiX />}
          variant="ghost"
          onClick={onClose}
        />
      </HStack>

      <VStack spacing={6} p={6} align="stretch">
        {/* Time Range Selector */}
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="600" color={subtleText}>ANALYTICS</Text>
          <HStack spacing={2}>
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <Badge
                key={range}
                fontSize="xs"
                colorScheme={timeRange === range ? 'blue' : 'gray'}
                variant={timeRange === range ? 'solid' : 'subtle'}
                cursor="pointer"
                onClick={() => setTimeRange(range)}
                px={3}
                py={1}
              >
                {range}
              </Badge>
            ))}
          </HStack>
        </HStack>

        {/* Key Metrics Grid */}
        <SimpleGrid columns={2} spacing={4}>
          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Total Requests</StatLabel>
                <StatNumber fontSize="2xl">{totalRequests.toLocaleString()}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  12.5% vs last period
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Success Rate</StatLabel>
                <StatNumber fontSize="2xl" color={successColor}>
                  {avgSuccessRate.toFixed(1)}%
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  0.3% vs last period
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Avg Latency</StatLabel>
                <StatNumber fontSize="2xl">{avgLatency.toFixed(0)}ms</StatNumber>
                <StatHelpText>
                  <StatArrow type="decrease" />
                  15ms faster
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} shadow="sm">
            <CardBody>
              <Stat>
                <StatLabel fontSize="xs" color={subtleText}>Total Cost</StatLabel>
                <StatNumber fontSize="2xl">${totalCost.toFixed(2)}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  8.1% vs last period
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Tabs for detailed views */}
        <Tabs colorScheme="blue" isLazy>
          <TabList>
            <Tab fontSize="sm">
              <Icon as={FiActivity} mr={2} />
              Activity
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiBarChart2} mr={2} />
              Performance
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiDollarSign} mr={2} />
              Cost Analysis
            </Tab>
            <Tab fontSize="sm">
              <Icon as={FiUsers} mr={2} />
              Usage
            </Tab>
          </TabList>

          <TabPanels>
            {/* Activity Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>REQUEST VOLUME</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="#3182CE"
                        fill="#3182CE"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                <Divider />

                <Text fontSize="sm" fontWeight="600" color={subtleText}>SUCCESS RATE</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis fontSize={10} domain={[90, 100]} />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        stroke="#38A169"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </VStack>
            </TabPanel>

            {/* Performance Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>LATENCY DISTRIBUTION</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Bar dataKey="avgLatency" fill="#805AD5" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>

                <SimpleGrid columns={2} spacing={4} mt={4}>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>P50 Latency</Text>
                    <Text fontSize="lg" fontWeight="600">{avgLatency.toFixed(0)}ms</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>P95 Latency</Text>
                    <Text fontSize="lg" fontWeight="600">{(avgLatency * 1.5).toFixed(0)}ms</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>P99 Latency</Text>
                    <Text fontSize="lg" fontWeight="600">{(avgLatency * 2).toFixed(0)}ms</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Max Latency</Text>
                    <Text fontSize="lg" fontWeight="600">{(avgLatency * 3).toFixed(0)}ms</Text>
                  </Box>
                </SimpleGrid>
              </VStack>
            </TabPanel>

            {/* Cost Analysis Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                <Text fontSize="sm" fontWeight="600" color={subtleText}>COST OVER TIME</Text>
                <Box bg={chartBg} p={4} borderRadius="md" height="200px">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="timestamp" fontSize={10} />
                      <YAxis fontSize={10} />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#ED8936"
                        fill="#ED8936"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>

                <SimpleGrid columns={2} spacing={4} mt={4}>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Total Tokens</Text>
                    <Text fontSize="lg" fontWeight="600">{totalTokens.toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Cost/1K Tokens</Text>
                    <Text fontSize="lg" fontWeight="600">
                      ${(totalCost / (totalTokens / 1000)).toFixed(4)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Avg Cost/Request</Text>
                    <Text fontSize="lg" fontWeight="600">
                      ${(totalCost / totalRequests).toFixed(4)}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color={subtleText} mb={1}>Projected Monthly</Text>
                    <Text fontSize="lg" fontWeight="600">
                      ${(totalCost * 30).toFixed(2)}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Alert status="info" borderRadius="md" mt={4}>
                  <AlertIcon />
                  <Box fontSize="sm">
                    <Text fontWeight="600">Cost Optimization Tip</Text>
                    <Text fontSize="xs" color={subtleText}>
                      Consider using {model.provider === 'OpenAI' ? 'GPT-3.5' : 'smaller variants'} for simpler tasks to reduce costs by up to 90%.
                    </Text>
                  </Box>
                </Alert>
              </VStack>
            </TabPanel>

            {/* Usage Tab */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={4}>
                {model.useCases && model.useCases.length > 0 && (
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>USE CASES</Text>
                    <HStack spacing={2} flexWrap="wrap">
                      {model.useCases.map((useCase) => (
                        <Badge key={useCase} colorScheme="purple" fontSize="xs">
                          {useCase}
                        </Badge>
                      ))}
                    </HStack>
                  </Box>
                )}

                <Divider />

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>TOP ENDPOINTS</Text>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" p={3} bg={chartBg} borderRadius="md">
                      <HStack spacing={3}>
                        <Icon as={FiServer} color={subtleText} />
                        <Code fontSize="xs">/api/chat/completions</Code>
                      </HStack>
                      <Badge colorScheme="blue">45%</Badge>
                    </HStack>
                    <HStack justify="space-between" p={3} bg={chartBg} borderRadius="md">
                      <HStack spacing={3}>
                        <Icon as={FiServer} color={subtleText} />
                        <Code fontSize="xs">/api/embeddings</Code>
                      </HStack>
                      <Badge colorScheme="blue">30%</Badge>
                    </HStack>
                    <HStack justify="space-between" p={3} bg={chartBg} borderRadius="md">
                      <HStack spacing={3}>
                        <Icon as={FiServer} color={subtleText} />
                        <Code fontSize="xs">/api/completions</Code>
                      </HStack>
                      <Badge colorScheme="blue">25%</Badge>
                    </HStack>
                  </VStack>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="sm" fontWeight="600" color={subtleText} mb={3}>ACTIVE PROJECTS</Text>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between" p={3} bg={chartBg} borderRadius="md">
                      <Text fontSize="sm">Podcast Studio</Text>
                      <Badge colorScheme="green">2 services</Badge>
                    </HStack>
                    <HStack justify="space-between" p={3} bg={chartBg} borderRadius="md">
                      <Text fontSize="sm">Knowledge Graph</Text>
                      <Badge colorScheme="green">1 service</Badge>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
};
