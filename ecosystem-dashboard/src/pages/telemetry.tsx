import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
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
  Select,
  IconButton,
  Spinner,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiRefreshCw, FiDollarSign, FiActivity, FiClock, FiCheckCircle, FiXCircle, FiLayers } from 'react-icons/fi';
import ContentAreaLayout from '../components/layout/ContentAreaLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TelemetryStats {
  totalRequests: number;
  totalErrors: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
}

interface ConcurrencyStats {
  totalInflight: number;
  totalQueued: number;
  activeKeys: number;
  maxConcurrentPerKey: number;
}

interface ActivityLog {
  id: number;
  timestamp: string;
  serviceId: string;
  provider: string;
  model: string;
  requestType: string;
  durationMs: number;
  tokensPrompt: number;
  tokensCompletion: number;
  tokensTotal: number;
  costUsd: number;
  status: 'success' | 'error';
  errorMessage?: string;
  metadata?: any;
}

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';

export default function TelemetryDashboard() {
  const [stats, setStats] = useState<TelemetryStats>({
    totalRequests: 0,
    totalErrors: 0,
    totalCost: 0,
    totalTokens: 0,
    avgLatency: 0,
    successRate: 100,
    errorRate: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [concurrency, setConcurrency] = useState<ConcurrencyStats>({
    totalInflight: 0, totalQueued: 0, activeKeys: 0, maxConcurrentPerKey: 8,
  });
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Ensure component is mounted before rendering time-sensitive content
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTelemetryData = async () => {
    try {
      // Fetch overview stats
      const statsRes = await fetch(`${AI_INFERENCING_URL}/api/v1/telemetry/overview?timeRange=${timeRange}`);
      const statsData = await statsRes.json();
      
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // Fetch recent activity
      const activityRes = await fetch(`${AI_INFERENCING_URL}/api/v1/telemetry/activity?limit=50`);
      const activityData = await activityRes.json();
      
      if (activityData.success) {
        setActivityLogs(activityData.logs);
      }

      // Fetch concurrency stats from AI Gateway
      try {
        const concRes = await fetch('/api/ai-gateway/metrics/concurrency');
        const concData = await concRes.json();
        if (concData.summary) {
          setConcurrency(concData.summary);
        }
      } catch (e) {
        console.warn('Concurrency stats unavailable:', e);
      }
    } catch (error) {
      console.error('Error fetching telemetry:', error);
      toast({
        title: 'Error loading telemetry',
        description: 'Failed to fetch data from AI Inferencing Service',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetryData();
  }, [timeRange]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchTelemetryData();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(cost);
  };

  const formatDate = (dateString: string) => {
    // Only format dates on client-side to avoid hydration mismatch
    if (!mounted) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleString();
  };

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <ContentAreaLayout>
        <VStack h="full" justify="center" align="center">
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text>Loading telemetry data...</Text>
        </VStack>
      </ContentAreaLayout>
    );
  }

  return (
    <ContentAreaLayout>
      <VStack spacing={6} align="stretch" p={6}>
        {/* Header */}
        <HStack justify="space-between">
          <Heading size="lg">AI Inferencing Telemetry</Heading>
          <HStack>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              width="150px"
              size="sm"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Select>
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="sm"
              onClick={() => fetchTelemetryData()}
              colorScheme={autoRefresh ? 'green' : 'gray'}
            />
          </HStack>
        </HStack>

        {/* Stats Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Stat>
                <StatLabel>Total Requests</StatLabel>
                <StatNumber>{stats.totalRequests.toLocaleString()}</StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Success: {stats.successRate.toFixed(1)}%
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Stat>
                <StatLabel>Total Cost</StatLabel>
                <StatNumber>{formatCost(stats.totalCost)}</StatNumber>
                <StatHelpText>
                  <FiDollarSign style={{ display: 'inline' }} /> Last {timeRange}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Stat>
                <StatLabel>Total Tokens</StatLabel>
                <StatNumber>{(stats.totalTokens / 1000).toFixed(1)}K</StatNumber>
                <StatHelpText>
                  <FiActivity style={{ display: 'inline' }} /> Processed
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Stat>
                <StatLabel>Avg Latency</StatLabel>
                <StatNumber>{(stats.avgLatency / 1000).toFixed(2)}s</StatNumber>
                <StatHelpText>
                  <FiClock style={{ display: 'inline' }} /> Response time
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardBody>
              <Stat>
                <StatLabel>Concurrency</StatLabel>
                <StatNumber>{concurrency.totalInflight} / {concurrency.maxConcurrentPerKey}</StatNumber>
                <StatHelpText>
                  <FiLayers style={{ display: 'inline' }} />{' '}
                  {concurrency.totalQueued > 0
                    ? `${concurrency.totalQueued} queued`
                    : `${concurrency.activeKeys} active key${concurrency.activeKeys !== 1 ? 's' : ''}`}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Grid>

        {/* Activity Log */}
        <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">Recent Activity</Heading>
              <Badge colorScheme="green">Live</Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box overflowX="auto">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Service</Th>
                    <Th>Provider</Th>
                    <Th>Model</Th>
                    <Th isNumeric>Tokens</Th>
                    <Th isNumeric>Cost</Th>
                    <Th isNumeric>Duration</Th>
                    <Th>Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {activityLogs.map((log) => (
                    <Tr key={log.id}>
                      <Td>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {formatDate(log.timestamp)}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontWeight="medium">
                          {log.serviceId}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme="purple" variant="subtle">
                          {log.provider}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm">{log.model}</Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="sm">{log.tokensTotal.toLocaleString()}</Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="sm" fontWeight="medium">
                          {formatCost(log.costUsd)}
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="sm">{(log.durationMs / 1000).toFixed(2)}s</Text>
                      </Td>
                      <Td>
                        {log.status === 'success' ? (
                          <Badge colorScheme="green" variant="subtle">
                            <HStack spacing={1}>
                              <FiCheckCircle size={12} />
                              <Text>Success</Text>
                            </HStack>
                          </Badge>
                        ) : (
                          <Badge colorScheme="red" variant="subtle">
                            <HStack spacing={1}>
                              <FiXCircle size={12} />
                              <Text>Error</Text>
                            </HStack>
                          </Badge>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              {activityLogs.length === 0 && (
                <VStack py={8}>
                  <Text color={useSemanticToken('text.secondary')}>No activity in the selected time range</Text>
                </VStack>
              )}
            </Box>
          </CardBody>
        </Card>
      </VStack>
    </ContentAreaLayout>
  );
}
