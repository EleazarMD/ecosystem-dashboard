import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  SimpleGrid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Progress,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  VStack,
  Tooltip,
  useColorModeValue,
  Spinner,
  Flex,
  Icon,
  Divider
} from '@chakra-ui/react';
import { 
  FiRefreshCw, 
  FiClock, 
  FiDatabase, 
  FiTrendingUp, 
  FiTrendingDown,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface ContextStat {
  query_count: number;
  cache_hits: number;
  cache_misses: number;
  hit_rate: number;
  default_ttl: number;
  adaptive_ttl: number;
  ttl_change_percent: number;
  last_query: string | null;
  hourly_distribution: Record<string, number>;
}

interface CacheRecommendation {
  type: 'warning' | 'info' | 'success';
  context: string;
  message: string;
  action: string;
}

interface CacheAnalytics {
  user_id: string;
  session_start: string;
  session_duration_seconds: number;
  total_queries: number;
  total_cache_hits: number;
  total_cache_misses: number;
  overall_hit_rate: number;
  context_stats: Record<string, ContextStat>;
  recommendations: CacheRecommendation[];
  timestamp: string;
}

interface HeatmapData {
  heatmap: Record<string, number[]>;
  context_types: string[];
}

const CONTEXT_LABELS: Record<string, string> = {
  emails: '📧 Emails',
  calendar: '📅 Calendar',
  reminders: '✅ Reminders',
  conversations: '💬 Conversations',
  knowledgeGraph: '�� Knowledge',
  approvals: '🔔 Approvals',
  weather: '🌤️ Weather'
};

const CONTEXT_COLORS: Record<string, string> = {
  emails: 'blue',
  calendar: 'green',
  reminders: 'purple',
  conversations: 'orange',
  knowledgeGraph: 'pink',
  approvals: 'red',
  weather: 'cyan'
};

export default function CacheAnalyticsPage() {
  const [analytics, setAnalytics] = useState<CacheAnalytics | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsRes, heatmapRes] = await Promise.all([
        fetch('/api/cache/analytics?user_id=eleazar'),
        fetch('/api/cache/heatmap?user_id=eleazar')
      ]);

      if (!analyticsRes.ok) throw new Error('Failed to fetch analytics');
      if (!heatmapRes.ok) throw new Error('Failed to fetch heatmap');

      const analyticsData = await analyticsRes.json();
      const heatmapData = await heatmapRes.json();

      setAnalytics(analyticsData);
      setHeatmap(heatmapData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'warning': return FiAlertCircle;
      case 'success': return FiCheckCircle;
      default: return FiInfo;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'warning': return 'orange';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  if (loading && !analytics) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={8}>
          <Flex justify="center" align="center" minH="400px">
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" />
              <Text>Loading cache analytics...</Text>
            </VStack>
          </Flex>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        {/* Header */}
        <Flex justify="space-between" align="center" mb={8}>
          <Box>
            <Heading size="lg" mb={2}>Cache Analytics</Heading>
            <Text color="gray.500">
              Monitor and optimize voice agent context caching
            </Text>
          </Box>
          <HStack spacing={4}>
            <Text fontSize="sm" color="gray.500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Text>
            <Button
              leftIcon={<FiRefreshCw />}
              onClick={fetchAnalytics}
              isLoading={loading}
              size="sm"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {error && (
          <Alert status="error" mb={6} borderRadius="md">
            <AlertIcon />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {analytics && (
          <>
            {/* Overview Stats */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Total Queries</StatLabel>
                    <StatNumber>{analytics.total_queries}</StatNumber>
                    <StatHelpText>
                      Session: {formatDuration(analytics.session_duration_seconds)}
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Cache Hit Rate</StatLabel>
                    <StatNumber>
                      {(analytics.overall_hit_rate * 100).toFixed(1)}%
                    </StatNumber>
                    <StatHelpText>
                      <StatArrow type={analytics.overall_hit_rate > 0.8 ? 'increase' : 'decrease'} />
                      {analytics.total_cache_hits} hits / {analytics.total_cache_misses} misses
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Active Contexts</StatLabel>
                    <StatNumber>
                      {Object.values(analytics.context_stats).filter(s => s.query_count > 0).length}
                    </StatNumber>
                    <StatHelpText>
                      of {Object.keys(analytics.context_stats).length} total
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardBody>
                  <Stat>
                    <StatLabel>Recommendations</StatLabel>
                    <StatNumber>{analytics.recommendations.length}</StatNumber>
                    <StatHelpText>
                      {analytics.recommendations.filter(r => r.type === 'warning').length} warnings
                    </StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>

            {/* Context Stats Table */}
            <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} mb={8}>
              <CardHeader>
                <Heading size="md">Context Performance</Heading>
              </CardHeader>
              <CardBody>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Context</Th>
                      <Th isNumeric>Queries</Th>
                      <Th isNumeric>Hit Rate</Th>
                      <Th isNumeric>Default TTL</Th>
                      <Th isNumeric>Adaptive TTL</Th>
                      <Th isNumeric>Change</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Object.entries(analytics.context_stats).map(([context, stats]) => (
                      <Tr key={context}>
                        <Td>
                          <HStack>
                            <Text>{CONTEXT_LABELS[context] || context}</Text>
                          </HStack>
                        </Td>
                        <Td isNumeric>{stats.query_count}</Td>
                        <Td isNumeric>
                          <HStack justify="flex-end">
                            <Progress
                              value={stats.hit_rate * 100}
                              size="sm"
                              width="60px"
                              colorScheme={stats.hit_rate > 0.8 ? 'green' : stats.hit_rate > 0.5 ? 'yellow' : 'red'}
                              borderRadius="full"
                            />
                            <Text fontSize="sm">{(stats.hit_rate * 100).toFixed(0)}%</Text>
                          </HStack>
                        </Td>
                        <Td isNumeric>{stats.default_ttl}s</Td>
                        <Td isNumeric fontWeight="bold">{stats.adaptive_ttl}s</Td>
                        <Td isNumeric>
                          <HStack justify="flex-end">
                            {stats.ttl_change_percent !== 0 && (
                              <Icon
                                as={stats.ttl_change_percent > 0 ? FiTrendingUp : FiTrendingDown}
                                color={stats.ttl_change_percent > 0 ? 'green.500' : 'red.500'}
                              />
                            )}
                            <Text
                              color={stats.ttl_change_percent > 0 ? 'green.500' : stats.ttl_change_percent < 0 ? 'red.500' : 'gray.500'}
                            >
                              {stats.ttl_change_percent > 0 ? '+' : ''}{stats.ttl_change_percent.toFixed(0)}%
                            </Text>
                          </HStack>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              stats.query_count === 0 ? 'gray' :
                              stats.hit_rate > 0.8 ? 'green' :
                              stats.hit_rate > 0.5 ? 'yellow' : 'red'
                            }
                          >
                            {stats.query_count === 0 ? 'Inactive' :
                             stats.hit_rate > 0.8 ? 'Optimal' :
                             stats.hit_rate > 0.5 ? 'Fair' : 'Poor'}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>

            {/* Recommendations */}
            {analytics.recommendations.length > 0 && (
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor} mb={8}>
                <CardHeader>
                  <Heading size="md">Optimization Recommendations</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {analytics.recommendations.map((rec, idx) => (
                      <Alert
                        key={idx}
                        status={rec.type === 'warning' ? 'warning' : rec.type === 'success' ? 'success' : 'info'}
                        borderRadius="md"
                      >
                        <AlertIcon />
                        <Box>
                          <AlertTitle>
                            {CONTEXT_LABELS[rec.context] || rec.context}
                          </AlertTitle>
                          <AlertDescription>{rec.message}</AlertDescription>
                        </Box>
                      </Alert>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            )}

            {/* Hourly Heatmap */}
            {heatmap && (
              <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
                <CardHeader>
                  <Heading size="md">Usage Patterns (24-Hour)</Heading>
                </CardHeader>
                <CardBody>
                  <Box overflowX="auto">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Context</Th>
                          {Array.from({ length: 24 }, (_, i) => (
                            <Th key={i} isNumeric fontSize="xs" px={1}>
                              {i.toString().padStart(2, '0')}
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {Object.entries(heatmap.heatmap).map(([context, hours]) => {
                          const maxVal = Math.max(...hours, 1);
                          return (
                            <Tr key={context}>
                              <Td fontSize="sm">{CONTEXT_LABELS[context] || context}</Td>
                              {hours.map((count, hour) => (
                                <Td
                                  key={hour}
                                  isNumeric
                                  px={1}
                                  bg={count > 0 ? `${CONTEXT_COLORS[context] || 'blue'}.${Math.min(Math.round((count / maxVal) * 5) * 100 + 100, 500)}` : 'transparent'}
                                  color={count > maxVal * 0.5 ? 'white' : 'inherit'}
                                  fontSize="xs"
                                >
                                  {count > 0 ? count : ''}
                                </Td>
                              ))}
                            </Tr>
                          );
                        })}
                      </Tbody>
                    </Table>
                  </Box>
                  <Text fontSize="sm" color="gray.500" mt={4}>
                    Shows query distribution across hours (00-23). Darker colors indicate higher usage.
                  </Text>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
