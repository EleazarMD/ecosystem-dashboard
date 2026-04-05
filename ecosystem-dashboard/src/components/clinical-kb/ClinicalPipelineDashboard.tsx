import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Progress,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Flex,
  Spinner,
  Divider,
  Icon,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Select,
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BeakerIcon,
  BoltIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface MetricPoint {
  timestamp: string;
  domain: string;
  metric_name: string;
  metric_value: any;
}

interface ActivitySummary {
  by_skill: Array<{
    skill_name: string;
    total: number;
    successful: number;
    avg_duration_ms: number;
  }>;
  recent: Array<{
    timestamp: string;
    skill_name: string;
    success: boolean;
    duration_ms: number;
    error_message?: string;
  }>;
  hourly: Array<{
    hour: string;
    total: number;
    successful: number;
  }>;
}

interface HealthReport {
  health_score: {
    score: number;
    status: string;
    color: string;
    breakdown: Record<string, number>;
  };
  metrics: {
    total_pathways: number;
    target_pathways: number;
    coverage_percentage: number;
    by_specialty: Record<string, number>;
    by_priority: Record<string, { target: number; completed: number; percentage: number }>;
  };
  quality: {
    avg_depth_score: number;
    max_depth_score: number;
    enrichment_needed: number;
  };
  performance: {
    queries_24h: number;
    hit_rate: number;
    avg_response_time_ms: number;
    cache_efficiency: number;
    errors_24h: number;
  };
  expansion_queue: {
    pending_count: number;
    by_priority: Record<string, number>;
  };
  recommendations: Array<{
    priority: string;
    category: string;
    title: string;
    description: string;
    action: string;
  }>;
  timestamp: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];
const STATUS_COLORS: Record<string, string> = {
  healthy: 'green',
  good: 'blue',
  needs_attention: 'yellow',
  critical: 'red',
};

export default function ClinicalPipelineDashboard() {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24');
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [reportRes, metricsRes, activityRes] = await Promise.all([
        fetch('/api/clinical-kb/health-report'),
        fetch(`/api/clinical-kb/metrics?hours=${timeRange}`),
        fetch(`/api/clinical-kb/activity?hours=${timeRange}`),
      ]);

      if (reportRes.ok) {
        setHealthReport(await reportRes.json());
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data.metrics || []);
      }
      if (activityRes.ok) {
        setActivity(await activityRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('http://100.108.41.22:8021/openclaw/skill/collect_pipeline_metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      toast({
        title: 'Metrics collection triggered',
        status: 'info',
        duration: 2000,
      });
      setTimeout(fetchData, 3000);
    } catch (error) {
      toast({
        title: 'Failed to trigger collection',
        status: 'error',
        duration: 3000,
      });
      setRefreshing(false);
    }
  };

  // Process metrics for charts
  const coverageTrend = metrics
    .filter(m => m.domain === 'kb_coverage' && m.metric_name === 'coverage_percentage')
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      coverage: typeof m.metric_value === 'number' ? m.metric_value : parseFloat(m.metric_value),
    }))
    .reverse();

  const performanceTrend = metrics
    .filter(m => m.domain === 'query_performance')
    .reduce((acc: any[], m) => {
      const existing = acc.find(a => a.time === new Date(m.timestamp).toLocaleTimeString());
      if (existing) {
        existing[m.metric_name] = m.metric_value;
      } else {
        acc.push({
          time: new Date(m.timestamp).toLocaleTimeString(),
          [m.metric_name]: m.metric_value,
        });
      }
      return acc;
    }, [])
    .reverse();

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    );
  }

  return (
    <Container maxW="container.xl" py={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack align="start" spacing={0}>
            <HStack>
              <Icon as={ServerIcon} boxSize={6} color="purple.500" />
              <Text fontSize="2xl" fontWeight="bold">
                Clinical Evidence Pipeline
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.500">
              Persistent metrics dashboard • Auto-updates every minute
            </Text>
          </VStack>
          <HStack>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              size="sm"
              w="120px"
            >
              <option value="1">Last hour</option>
              <option value="6">Last 6 hours</option>
              <option value="24">Last 24 hours</option>
              <option value="168">Last 7 days</option>
            </Select>
            <Button
              leftIcon={<Icon as={ArrowPathIcon} />}
              onClick={handleRefresh}
              isLoading={refreshing}
              size="sm"
              colorScheme="purple"
            >
              Collect Now
            </Button>
          </HStack>
        </Flex>

        {/* Health Score Banner */}
        {healthReport && (
          <Box
            p={6}
            bg={`${STATUS_COLORS[healthReport.health_score.status]}.50`}
            borderRadius="xl"
            border="2px solid"
            borderColor={`${STATUS_COLORS[healthReport.health_score.status]}.200`}
          >
            <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Pipeline Health Score
                </Text>
                <HStack spacing={3}>
                  <Text fontSize="4xl" fontWeight="bold">
                    {healthReport.health_score.score}
                  </Text>
                  <Text fontSize="xl" color="gray.500">/100</Text>
                  <Badge
                    colorScheme={STATUS_COLORS[healthReport.health_score.status]}
                    fontSize="md"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {healthReport.health_score.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  Last updated: {new Date(healthReport.timestamp).toLocaleString()}
                </Text>
              </VStack>
              <SimpleGrid columns={4} spacing={4}>
                {Object.entries(healthReport.health_score.breakdown).map(([key, value]) => (
                  <VStack key={key} spacing={0} minW="60px">
                    <Text fontSize="xs" color="gray.500" textTransform="capitalize">
                      {key}
                    </Text>
                    <Text fontSize="lg" fontWeight="semibold">
                      {value}
                    </Text>
                  </VStack>
                ))}
              </SimpleGrid>
            </Flex>
          </Box>
        )}

        {/* Tabs for different domains */}
        <Tabs colorScheme="purple" variant="enclosed">
          <TabList>
            <Tab><Icon as={ChartBarIcon} mr={2} /> Coverage</Tab>
            <Tab><Icon as={BeakerIcon} mr={2} /> Quality</Tab>
            <Tab><Icon as={BoltIcon} mr={2} /> Performance</Tab>
            <Tab><Icon as={CpuChipIcon} mr={2} /> Agentic Activity</Tab>
            <Tab><Icon as={ClockIcon} mr={2} /> Queue</Tab>
          </TabList>

          <TabPanels>
            {/* Coverage Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {/* Coverage Stats */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    KB Coverage
                  </Text>
                  {healthReport && (
                    <VStack spacing={4} align="stretch">
                      <Stat>
                        <StatLabel>Pathways Completed</StatLabel>
                        <StatNumber>
                          {healthReport.metrics.total_pathways} / {healthReport.metrics.target_pathways}
                        </StatNumber>
                        <Progress
                          value={healthReport.metrics.coverage_percentage}
                          colorScheme={healthReport.metrics.coverage_percentage > 50 ? 'green' : 'orange'}
                          size="lg"
                          borderRadius="full"
                          mt={2}
                        />
                        <StatHelpText>
                          {healthReport.metrics.coverage_percentage}% of target
                        </StatHelpText>
                      </Stat>
                      <Divider />
                      <Text fontWeight="medium">By Priority</Text>
                      {Object.entries(healthReport.metrics.by_priority).map(([priority, data]) => (
                        <Box key={priority}>
                          <Flex justify="space-between" mb={1}>
                            <Badge colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}>
                              {priority}
                            </Badge>
                            <Text fontSize="sm">{data.completed}/{data.target}</Text>
                          </Flex>
                          <Progress
                            value={data.percentage}
                            colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}
                            size="sm"
                            borderRadius="full"
                          />
                        </Box>
                      ))}
                    </VStack>
                  )}
                </Box>

                {/* Coverage Trend Chart */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Coverage Trend
                  </Text>
                  {coverageTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={coverageTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={10} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="coverage"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Flex justify="center" align="center" h="250px" color="gray.400">
                      No trend data yet. Run "Collect Now" to start tracking.
                    </Flex>
                  )}
                </Box>

                {/* Specialty Distribution */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm" gridColumn={{ lg: 'span 2' }}>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Pathways by Specialty
                  </Text>
                  {healthReport && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={Object.entries(healthReport.metrics.by_specialty).map(([name, value]) => ({
                          name: name.replace('_', ' '),
                          pathways: value,
                        }))}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="pathways" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </SimpleGrid>
            </TabPanel>

            {/* Quality Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Stat>
                    <StatLabel>Average Depth Score</StatLabel>
                    <StatNumber>
                      {healthReport?.quality.avg_depth_score || 0} / {healthReport?.quality.max_depth_score || 5}
                    </StatNumber>
                    <Progress
                      value={((healthReport?.quality.avg_depth_score || 0) / 5) * 100}
                      colorScheme="purple"
                      size="lg"
                      borderRadius="full"
                      mt={2}
                    />
                  </Stat>
                </Box>
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Stat>
                    <StatLabel>Pathways Need Enrichment</StatLabel>
                    <StatNumber>{healthReport?.quality.enrichment_needed || 0}</StatNumber>
                    <StatHelpText>
                      Below quality threshold
                    </StatHelpText>
                  </Stat>
                </Box>
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Stat>
                    <StatLabel>Quality Score Contribution</StatLabel>
                    <StatNumber>
                      {healthReport?.health_score.breakdown.quality || 0}
                    </StatNumber>
                    <StatHelpText>
                      Out of 30 max points
                    </StatHelpText>
                  </Stat>
                </Box>
              </SimpleGrid>
            </TabPanel>

            {/* Performance Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                    <Stat>
                      <StatLabel>Queries (24h)</StatLabel>
                      <StatNumber>{healthReport?.performance.queries_24h || 0}</StatNumber>
                    </Stat>
                  </Box>
                  <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                    <Stat>
                      <StatLabel>Hit Rate</StatLabel>
                      <StatNumber>
                        {((healthReport?.performance.hit_rate || 0) * 100).toFixed(0)}%
                      </StatNumber>
                    </Stat>
                  </Box>
                  <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                    <Stat>
                      <StatLabel>Avg Response Time</StatLabel>
                      <StatNumber>{healthReport?.performance.avg_response_time_ms || 0}ms</StatNumber>
                    </Stat>
                  </Box>
                  <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                    <Stat>
                      <StatLabel>Cache Efficiency</StatLabel>
                      <StatNumber>
                        {((healthReport?.performance.cache_efficiency || 0) * 100).toFixed(0)}%
                      </StatNumber>
                    </Stat>
                  </Box>
                </SimpleGrid>

                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Performance Trend
                  </Text>
                  {performanceTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={performanceTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="hit_rate" stroke="#82ca9d" name="Hit Rate" />
                        <Line type="monotone" dataKey="avg_response_time_ms" stroke="#8884d8" name="Response Time (ms)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Flex justify="center" align="center" h="250px" color="gray.400">
                      No trend data yet
                    </Flex>
                  )}
                </Box>

                {healthReport && healthReport.performance.errors_24h > 0 && (
                  <Box p={5} bg="red.50" borderRadius="lg" gridColumn={{ lg: 'span 2' }}>
                    <HStack>
                      <Icon as={ExclamationCircleIcon} boxSize={6} color="red.500" />
                      <Text fontWeight="semibold" color="red.700">
                        {healthReport.performance.errors_24h} errors in last 24 hours
                      </Text>
                    </HStack>
                  </Box>
                )}
              </SimpleGrid>
            </TabPanel>

            {/* Agentic Activity Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {/* Activity by Skill */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Skill Usage
                  </Text>
                  {activity?.by_skill && activity.by_skill.length > 0 ? (
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Skill</Th>
                          <Th isNumeric>Total</Th>
                          <Th isNumeric>Success</Th>
                          <Th isNumeric>Avg Time</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {activity.by_skill.map((skill) => (
                          <Tr key={skill.skill_name}>
                            <Td fontFamily="mono" fontSize="xs">{skill.skill_name}</Td>
                            <Td isNumeric>{skill.total}</Td>
                            <Td isNumeric>
                              <Badge colorScheme={skill.successful === skill.total ? 'green' : 'yellow'}>
                                {skill.successful}
                              </Badge>
                            </Td>
                            <Td isNumeric>{Math.round(skill.avg_duration_ms)}ms</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text color="gray.400">No skill activity recorded yet</Text>
                  )}
                </Box>

                {/* Hourly Activity Chart */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Hourly Activity
                  </Text>
                  {activity?.hourly && activity.hourly.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={activity.hourly.map(h => ({
                        hour: new Date(h.hour).toLocaleTimeString([], { hour: '2-digit' }),
                        total: h.total,
                        successful: h.successful,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" fontSize={10} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" name="Total" />
                        <Bar dataKey="successful" fill="#82ca9d" name="Successful" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Flex justify="center" align="center" h="250px" color="gray.400">
                      No activity data yet
                    </Flex>
                  )}
                </Box>

                {/* Recent Activity */}
                <Box p={5} bg="white" borderRadius="lg" shadow="sm" gridColumn={{ lg: 'span 2' }}>
                  <Text fontSize="lg" fontWeight="semibold" mb={4}>
                    Recent Activity
                  </Text>
                  {activity?.recent && activity.recent.length > 0 ? (
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th>Time</Th>
                          <Th>Skill</Th>
                          <Th>Status</Th>
                          <Th isNumeric>Duration</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {activity.recent.slice(0, 10).map((act, idx) => (
                          <Tr key={idx}>
                            <Td fontSize="xs">{new Date(act.timestamp).toLocaleString()}</Td>
                            <Td fontFamily="mono" fontSize="xs">{act.skill_name}</Td>
                            <Td>
                              <Badge colorScheme={act.success ? 'green' : 'red'}>
                                {act.success ? 'Success' : 'Failed'}
                              </Badge>
                            </Td>
                            <Td isNumeric>{act.duration_ms}ms</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text color="gray.400">No recent activity</Text>
                  )}
                </Box>
              </SimpleGrid>
            </TabPanel>

            {/* Queue Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                <Box p={5} bg="white" borderRadius="lg" shadow="sm">
                  <Stat>
                    <StatLabel>Pending Items</StatLabel>
                    <StatNumber>{healthReport?.expansion_queue.pending_count || 0}</StatNumber>
                    <StatHelpText>
                      Conditions awaiting pathway generation
                    </StatHelpText>
                  </Stat>
                </Box>
                {healthReport?.expansion_queue.by_priority && Object.entries(healthReport.expansion_queue.by_priority).map(([priority, count]) => (
                  <Box key={priority} p={5} bg="white" borderRadius="lg" shadow="sm">
                    <Stat>
                      <StatLabel>
                        <Badge colorScheme={priority === 'P0' ? 'red' : priority === 'P1' ? 'orange' : 'blue'}>
                          {priority}
                        </Badge>
                      </StatLabel>
                      <StatNumber>{count}</StatNumber>
                      <StatHelpText>
                        {priority === 'P0' ? 'Critical priority' : priority === 'P1' ? 'High priority' : 'Standard priority'}
                      </StatHelpText>
                    </Stat>
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Recommendations */}
        {healthReport && healthReport.recommendations.length > 0 && (
          <Box p={5} bg="white" borderRadius="lg" shadow="sm">
            <Text fontSize="lg" fontWeight="semibold" mb={4}>
              Recommendations ({healthReport.recommendations.length})
            </Text>
            <VStack spacing={3} align="stretch">
              {healthReport.recommendations.map((rec, idx) => (
                <Box
                  key={idx}
                  p={4}
                  bg={`${rec.priority === 'critical' ? 'red' : rec.priority === 'high' ? 'orange' : 'yellow'}.50`}
                  borderRadius="md"
                  borderLeft="4px solid"
                  borderLeftColor={`${rec.priority === 'critical' ? 'red' : rec.priority === 'high' ? 'orange' : 'yellow'}.400`}
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <HStack>
                        <Badge colorScheme={rec.priority === 'critical' ? 'red' : rec.priority === 'high' ? 'orange' : 'yellow'}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </HStack>
                      <Text fontWeight="semibold">{rec.title}</Text>
                      <Text fontSize="sm" color="gray.600">{rec.description}</Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    Action: {rec.action}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
