import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Badge,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Heading,
  VStack,
  HStack,
  Card,
  CardHeader,
  CardBody,
  Divider,
  Icon,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { FiDatabase, FiActivity, FiClock, FiUsers } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui';
import RedisPerformanceChart from './RedisPerformanceChart';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface RedisHealth {
  status: string;
  ping_latency: number;
  uptime: number;
  version: string;
  memory_used: number;
  memory_peak: number;
  memory_fragmentation_ratio: number;
  connected_clients: number;
  blocked_clients: number;
  total_connections_received: number;
  total_commands_processed: number;
  instantaneous_ops_per_sec: number;
  keyspace_hits: number;
  keyspace_misses: number;
  evicted_keys: number;
  expired_keys: number;
}

interface CacheStats {
  cache_hits: number;
  cache_misses: number;
  cache_sets: number;
  total_operations: number;
  hit_rate: number;
  miss_rate: number;
  error_rate: number;
  errors: number;
}

interface PerformanceMetrics {
  avg_response_time: number;
  total_requests: number;
  requests_per_minute: number;
  peak_response_time: number;
  error_count: number;
  success_rate: number;
}

interface SlowQuery {
  timestamp: number;
  duration: number;
  command: string;
  arguments: string[];
}

interface RedisMonitoringData {
  health: RedisHealth;
  cache: CacheStats;
  performance: PerformanceMetrics;
  slowQueries: SlowQuery[];
  memoryAnalysis: {
    total_memory: number;
    used_memory: number;
    available_memory: number;
    fragmentation_ratio: number;
    key_patterns: Record<string, number>;
  };
}

const RedisMonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<RedisMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const isDark = false;
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const fetchRedisData = async () => {
    try {
      setLoading(true);
      
      // Fetch all Redis monitoring data from Knowledge Graph endpoints
      const [healthRes, cacheRes, performanceRes, slowQueriesRes, memoryRes] = await Promise.all([
        fetch('http://localhost:8765/monitoring/redis/health'),
        fetch('http://localhost:8765/monitoring/redis/cache'),
        fetch('http://localhost:8765/monitoring/redis/performance'),
        fetch('http://localhost:8765/monitoring/redis/slow-queries'),
        fetch('http://localhost:8765/monitoring/redis/memory')
      ]);

      if (!healthRes.ok || !cacheRes.ok || !performanceRes.ok || !slowQueriesRes.ok || !memoryRes.ok) {
        throw new Error('Failed to fetch Redis monitoring data');
      }

      const [health, cache, performance, slowQueries, memory] = await Promise.all([
        healthRes.json(),
        cacheRes.json(),
        performanceRes.json(),
        slowQueriesRes.json(),
        memoryRes.json()
      ]);

      setData({
        health: health.data,
        cache: cache.data,
        performance: performance.data,
        slowQueries: slowQueries.data,
        memoryAnalysis: memory.data
      });

      setError(null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Redis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedisData();
    const interval = setInterval(fetchRedisData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading && !data) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color={isDark ? 'white' : 'gray.600'}>Loading Redis monitoring data...</Text>
        </VStack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        <Box>
          <AlertTitle>Redis Monitoring Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Box>
      </Alert>
    );
  }

  if (!data) return null;

  const healthStatus = data.health.status === 'healthy' ? 'success' : 'error';
  const hitRate = data.cache.hit_rate * 100;

  return (
    <VStack spacing={6} align="stretch">
      {/* Status Overview */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiDatabase} />
                  <Text>Redis Status</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                <Badge 
                  colorScheme={healthStatus === 'success' ? 'green' : 'red'}
                  fontSize="lg"
                  p={2}
                  borderRadius="md"
                >
                  {data.health.status.toUpperCase()}
                </Badge>
              </StatNumber>
              <StatHelpText>
                Ping: {data.health.ping_latency}ms | Uptime: {formatDuration(data.health.uptime)}
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </GridItem>

        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiActivity} />
                  <Text>Cache Hit Rate</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{hitRate.toFixed(1)}%</StatNumber>
              <StatHelpText>
                <StatArrow type={hitRate > 50 ? 'increase' : 'decrease'} />
                {data.cache.cache_hits} hits / {data.cache.total_operations} total
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </GridItem>

        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiClock} />
                  <Text>Operations/sec</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{data.health.instantaneous_ops_per_sec}</StatNumber>
              <StatHelpText>
                Avg Response: {data.performance.avg_response_time}ms
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </GridItem>

        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FiUsers} />
                  <Text>Connected Clients</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{data.health.connected_clients}</StatNumber>
              <StatHelpText>
                Blocked: {data.health.blocked_clients} | Total: {data.health.total_connections_received}
              </StatHelpText>
            </Stat>
          </GlassPanel>
        </GridItem>
      </Grid>

      {/* Redis Performance Chart - Standardized Recharts Area Chart Visualization */}
      <RedisPerformanceChart height={350} />

      {/* Memory Usage */}
      <GlassPanel variant="light" elevation={1} p={4}>
        <VStack align="stretch" spacing={4}>
          <Heading size="md" color={isDark ? 'white' : 'gray.800'}>
            Memory Usage
          </Heading>
          <Grid templateColumns="2fr 1fr" gap={6}>
            <GridItem>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                    Used Memory
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {formatBytes(data.health.memory_used)} / {formatBytes(data.memoryAnalysis.total_memory)}
                  </Text>
                </HStack>
                <Progress 
                  value={(data.health.memory_used / data.memoryAnalysis.total_memory) * 100}
                  colorScheme={data.health.memory_used / data.memoryAnalysis.total_memory > 0.8 ? 'red' : 'blue'}
                  size="lg"
                  borderRadius="md"
                />
                <HStack justify="space-between" fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                  <Text>Peak: {formatBytes(data.health.memory_peak)}</Text>
                  <Text>Fragmentation: {data.health.memory_fragmentation_ratio.toFixed(2)}</Text>
                </HStack>
              </VStack>
            </GridItem>
            <GridItem>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" fontWeight="bold" color={isDark ? 'white' : 'gray.800'}>
                  Key Distribution
                </Text>
                {Object.entries(data.memoryAnalysis.key_patterns).slice(0, 5).map(([pattern, count]) => (
                  <HStack key={pattern} justify="space-between" fontSize="xs">
                    <Text color={isDark ? 'whiteAlpha.700' : 'gray.600'} isTruncated>
                      {pattern}
                    </Text>
                    <Badge size="sm" colorScheme="blue">{count}</Badge>
                  </HStack>
                ))}
              </VStack>
            </GridItem>
          </Grid>
        </VStack>
      </GlassPanel>

      {/* Performance Metrics & Slow Queries */}
      <Grid templateColumns="1fr 1fr" gap={4}>
        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <VStack align="stretch" spacing={4}>
              <Heading size="md" color={isDark ? 'white' : 'gray.800'}>
                Performance Metrics
              </Heading>
              <Grid templateColumns="1fr 1fr" gap={4}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                    Success Rate
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="green.500">
                    {(data.performance.success_rate * 100).toFixed(1)}%
                  </Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                    Total Requests
                  </Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {data.performance.total_requests.toLocaleString()}
                  </Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                    Req/min
                  </Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {data.performance.requests_per_minute}
                  </Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                    Peak Response
                  </Text>
                  <Text fontSize="xl" fontWeight="bold">
                    {data.performance.peak_response_time}ms
                  </Text>
                </VStack>
              </Grid>
            </VStack>
          </GlassPanel>
        </GridItem>

        <GridItem>
          <GlassPanel variant="light" elevation={1} p={4}>
            <VStack align="stretch" spacing={4}>
              <Heading size="md" color={isDark ? 'white' : 'gray.800'}>
                Recent Slow Queries
              </Heading>
              {data.slowQueries.length > 0 ? (
                <TableContainer>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Duration</Th>
                        <Th>Command</Th>
                        <Th>Time</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.slowQueries.slice(0, 5).map((query, index) => (
                        <Tr key={index}>
                          <Td>
                            <Badge colorScheme={query.duration > 1000 ? 'red' : 'yellow'}>
                              {query.duration}ms
                            </Badge>
                          </Td>
                          <Td fontSize="xs" fontFamily="mono">
                            {query.command}
                          </Td>
                          <Td fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                            {new Date(query.timestamp * 1000).toLocaleTimeString()}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              ) : (
                <Center h="100px">
                  <Text color={isDark ? 'whiteAlpha.600' : 'gray.500'} fontSize="sm">
                    No slow queries detected
                  </Text>
                </Center>
              )}
            </VStack>
          </GlassPanel>
        </GridItem>
      </Grid>

      {/* Last Updated */}
      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'} textAlign="center">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </Text>
    </VStack>
  );
};

export default RedisMonitoringDashboard;
