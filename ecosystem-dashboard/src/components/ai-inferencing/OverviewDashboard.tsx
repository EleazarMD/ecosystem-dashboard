/**
 * AI Inferencing Overview Dashboard - PROTOTYPE
 * Complete redesign with real-time metrics and visualizations
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Icon,
  
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Divider,
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
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiZap,
  FiAlertCircle,
  FiTrendingUp,
  FiTrendingDown,
} from 'react-icons/fi';

interface MetricData {
  requestsPerMin: number;
  successRate: number;
  avgLatency: number;
  costBurnRate: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

interface ActivityItem {
  id: string;
  timestamp: Date;
  model: string;
  status: 'success' | 'error';
  latency: number;
  cost: number;
}

interface ProviderHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  successRate: number;
}

export function OverviewDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [metrics, setMetrics] = useState<MetricData>({
    requestsPerMin: 142,
    successRate: 98.5,
    avgLatency: 1.2,
    costBurnRate: 0.12,
    trend: 'up',
    change: 12.5,
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [costHistory, setCostHistory] = useState<any[]>([]);

  // Color scheme
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
        
        // Fetch recent activity
        const activityRes = await fetch(
          `${AI_INFERENCING_URL}/api/v1/telemetry/activity?limit=10`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ).catch(err => {
          throw new Error('Cannot connect to AI Inferencing Service. Is it running on port 9000?');
        });
        
        if (!activityRes.ok) {
          throw new Error(`Activity fetch failed: ${activityRes.status}`);
        }
        
        const activityData = await activityRes.json();
        
        if (activityData.success) {
          setRecentActivity(
            activityData.logs.map((log: any) => ({
              id: log.id,
              timestamp: new Date(log.timestamp),
              model: log.model,
              status: log.status,
              latency: log.durationMs,
              cost: log.costUsd,
            }))
          );
        }

        // Fetch provider metrics
        const providerRes = await fetch(
          `${AI_INFERENCING_URL}/api/v1/telemetry/providers`
        );
        
        if (!providerRes.ok) {
          throw new Error(`Provider fetch failed: ${providerRes.status}`);
        }
        
        const providerData = await providerRes.json();
        
        if (providerData.success) {
          setProviderHealth(
            providerData.metrics.map((p: any) => ({
              name: p.provider,
              status: p.successRate > 95 ? 'healthy' : p.successRate > 80 ? 'degraded' : 'down',
              latency: p.avgLatency,
              successRate: p.successRate,
            }))
          );
        }

        // Generate cost history (mock data for now - will be real endpoint)
        const now = Date.now();
        const history = [];
        for (let i = 24; i >= 0; i--) {
          history.push({
            hour: `${i}h ago`,
            cost: Math.random() * 2 + 0.5,
            requests: Math.floor(Math.random() * 200 + 50),
          });
        }
        setCostHistory(history.reverse());
        
        setError(null);
        setLoading(false);

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'success':
        return 'green';
      case 'degraded':
        return 'yellow';
      case 'down':
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <VStack spacing={4}>
          <Box fontSize="2xl">⏳</Box>
          <Text color={mutedText}>Loading dashboard data...</Text>
        </VStack>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card bg={cardBg} borderWidth="1px" borderColor={useSemanticToken('status.error')} p={6}>
        <VStack spacing={4} align="center">
          <Icon as={FiAlertCircle} boxSize={12} color={useSemanticToken('status.error')} />
          <Text fontSize="lg" fontWeight="600">Failed to Load Dashboard</Text>
          <Text color={mutedText} textAlign="center">
            {error}
          </Text>
          <Text fontSize="sm" color={mutedText}>
            Make sure the AI Inferencing Service is running on port 9000
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Real-Time Metrics Grid */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        {/* Requests/Min */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="wider">
                Requests/Min
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="600">
                {metrics.requestsPerMin}
              </StatNumber>
              <StatHelpText>
                <StatArrow type={metrics.trend === 'up' ? 'increase' : 'decrease'} />
                {metrics.change}% from avg
              </StatHelpText>
              <Box mt={2} height="40px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costHistory.slice(-10)}>
                    <Line
                      type="monotone"
                      dataKey="requests"
                      stroke="#4299E1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Stat>
          </CardBody>
        </Card>

        {/* Success Rate */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="wider">
                Success Rate
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="600" color={useSemanticToken('status.success')}>
                {metrics.successRate}%
              </StatNumber>
              <Progress
                value={metrics.successRate}
                size="sm"
                colorScheme="green"
                mt={2}
                borderRadius="full"
              />
              <StatHelpText mt={2}>
                <Icon as={FiCheckCircle} mr={1} />
                Excellent health
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        {/* Avg Latency */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="wider">
                Avg Latency
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="600" color={useSemanticToken('status.warning')}>
                {metrics.avgLatency}s
              </StatNumber>
              <StatHelpText>
                <Icon as={FiClock} mr={1} />
                Within normal range
              </StatHelpText>
              <Box mt={2} height="40px">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={costHistory.slice(-10)}>
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#ECC94B"
                      fill="#ECC94B"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Stat>
          </CardBody>
        </Card>

        {/* Cost Burn Rate */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <Stat>
              <StatLabel fontSize="xs" color={mutedText} textTransform="uppercase" letterSpacing="wider">
                Cost Burn Rate
              </StatLabel>
              <StatNumber fontSize="3xl" fontWeight="600" color={useSemanticToken('interactive.secondary')}>
                ${metrics.costBurnRate}/hr
              </StatNumber>
              <StatHelpText>
                <Icon as={FiDollarSign} mr={1} />
                $2.88/day projected
              </StatHelpText>
              <Box mt={2} height="40px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costHistory.slice(-10)}>
                    <Line
                      type="monotone"
                      dataKey="cost"
                      stroke="#9F7AEA"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Live Activity & Provider Health */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {/* Live Request Stream */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={FiActivity} color={useSemanticToken('interactive.primary')} boxSize={5} />
                <Text fontSize="md" fontWeight="600">
                  Live Request Stream
                </Text>
              </HStack>
              <Badge colorScheme="green" variant="subtle">
                LIVE
              </Badge>
            </HStack>

            <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
              {recentActivity.length === 0 ? (
                <Text color={mutedText} fontSize="sm" textAlign="center" py={8}>
                  No recent activity
                </Text>
              ) : (
                recentActivity.map((item) => (
                  <HStack
                    key={item.id}
                    p={2}
                    borderRadius="md"
                    bg={useSemanticToken('surface.hover')}
                    fontSize="sm"
                    justify="space-between"
                  >
                    <HStack spacing={3} flex={1}>
                      <Text color={mutedText} fontSize="xs" minW="50px">
                        {formatTime(item.timestamp)}
                      </Text>
                      <Text fontWeight="500" minW="100px">
                        {item.model}
                      </Text>
                      <Badge
                        colorScheme={getStatusColor(item.status)}
                        variant="subtle"
                        fontSize="xs"
                      >
                        {item.status === 'success' ? '✓' : '✗'}
                      </Badge>
                    </HStack>
                    <HStack spacing={3} color={mutedText}>
                      <Text fontSize="xs">
                        {item.latency < 1000
                          ? `${item.latency}ms`
                          : `${(item.latency / 1000).toFixed(2)}s`}
                      </Text>
                      <Text fontSize="xs" minW="60px" textAlign="right">
                        ${item.cost.toFixed(4)}
                      </Text>
                    </HStack>
                  </HStack>
                ))
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Provider Health */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={FiZap} color={useSemanticToken('interactive.secondary')} boxSize={5} />
                <Text fontSize="md" fontWeight="600">
                  Provider Health
                </Text>
              </HStack>
            </HStack>

            <VStack spacing={3} align="stretch">
              {providerHealth.length === 0 ? (
                <Text color={mutedText} fontSize="sm" textAlign="center" py={8}>
                  Loading provider status...
                </Text>
              ) : (
                providerHealth.map((provider) => (
                  <Box key={provider.name}>
                    <HStack justify="space-between" mb={2}>
                      <HStack>
                        <Box
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={useSemanticToken('status.success')}
                        />
                        <Text fontWeight="500">{provider.name}</Text>
                      </HStack>
                      <Badge colorScheme={getStatusColor(provider.status)} variant="subtle">
                        {provider.status}
                      </Badge>
                    </HStack>
                    <HStack fontSize="xs" color={mutedText} spacing={4}>
                      <Text>Latency: {provider.latency}ms</Text>
                      <Text>Success: {provider.successRate.toFixed(1)}%</Text>
                    </HStack>
                    <Progress
                      value={provider.successRate}
                      size="xs"
                      colorScheme={getStatusColor(provider.status)}
                      mt={1}
                      borderRadius="full"
                    />
                  </Box>
                ))
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Cost Over Time Chart */}
      <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} shadow="sm">
        <CardBody>
          <HStack justify="space-between" mb={4}>
            <HStack>
              <Icon as={FiTrendingUp} color={useSemanticToken('status.success')} boxSize={5} />
              <Text fontSize="md" fontWeight="600">
                Cost Over Time (Last 24h)
              </Text>
            </HStack>
            <HStack spacing={2} fontSize="xs">
              <Badge colorScheme="blue">Total: ${costHistory.reduce((sum, h) => sum + h.cost, 0).toFixed(2)}</Badge>
            </HStack>
          </HStack>

          <Box height="200px">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costHistory}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9F7AEA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9F7AEA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  interval={2}
                  stroke={mutedText}
                />
                <YAxis tick={{ fontSize: 10 }} stroke={mutedText} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#9F7AEA"
                  strokeWidth={2}
                  fill="url(#colorCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
}
