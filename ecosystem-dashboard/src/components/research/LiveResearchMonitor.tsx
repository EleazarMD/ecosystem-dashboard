import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Divider,
  Code,
  Progress,
  Tooltip,
  Icon,
  useToast,
  Flex,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiZap,
} from 'react-icons/fi';
import SessionPulseIndicator from './SessionPulseIndicator';
import { Line } from 'react-chartjs-2';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

interface LiveResearchMonitorProps {
  sessionId: string | null;
}

interface SessionData {
  session: any;
  telemetry: any[];
  stats: {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    successCount: number;
    errorCount: number;
    avgLatency: number;
    modelsUsed: string[];
    tokensPerMinute: number[];
    costPerMinute: number[];
  };
  realtime: {
    isActive: boolean;
    lastUpdate: string;
    timeSinceLastUpdate: number;
  };
  telemetryOnly?: boolean; // 🔧 FIX: Flag for telemetry-only mode (no full session record yet)
}

export const LiveResearchMonitor: React.FC<LiveResearchMonitorProps> = ({ sessionId }) => {
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const statBg = useSemanticToken('surface.base');
  const primaryColor = useSemanticToken('primary.500');
  const successColor = useSemanticToken('success.500');
  const errorColor = useSemanticToken('danger.500');
  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/research-lab/monitor/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Session not in database yet - fetch telemetry-only view
          console.log('[LiveMonitor] Session not in DB yet, fetching telemetry-only view');
          const telemetryResponse = await fetch(`/api/research-lab/monitor/telemetry-only?sessionId=${sessionId}`);
          if (telemetryResponse.ok) {
            const telemetryData = await telemetryResponse.json();
            setSessionData(telemetryData);
          } else {
            // No telemetry data yet - show empty state
            console.log('[LiveMonitor] No telemetry data yet for session:', sessionId);
            setSessionData({
              session: {
                session_id: sessionId,
                status: 'pending',
                progress: 0,
                created_at: new Date().toISOString(),
              },
              telemetry: [],
              stats: {
                totalRequests: 0,
                totalTokens: 0,
                totalCost: 0,
                successCount: 0,
                errorCount: 0,
                avgLatency: 0,
                modelsUsed: [],
                tokensPerMinute: [],
                costPerMinute: [],
              },
              realtime: {
                isActive: true,
                lastUpdate: new Date().toISOString(),
                timeSinceLastUpdate: 0,
              },
              telemetryOnly: true,
            });
          }
          setLoading(false);
          return;
        }
        // For other errors, log but don't crash
        console.warn('[LiveMonitor] Failed to fetch session data:', response.status, response.statusText);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setSessionData(data);
    } catch (error) {
      console.error('[LiveMonitor] Error fetching session data:', error);
      // Don't crash - just log the error
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !autoRefresh) return;

    fetchSessionData();
    const interval = setInterval(fetchSessionData, refreshInterval);
    return () => clearInterval(interval);
  }, [sessionId, autoRefresh, refreshInterval, fetchSessionData]);

  const getTokenChartData = () => {
    if (!sessionData) return null;
    const labels = sessionData.stats.tokensPerMinute.map((_, i) => `${i + 1}m`);
    return {
      labels,
      datasets: [{
        label: 'Tokens per Minute',
        data: sessionData.stats.tokensPerMinute,
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.4,
      }],
    };
  };

  const getCostChartData = () => {
    if (!sessionData) return null;
    const labels = sessionData.stats.costPerMinute.map((_, i) => `${i + 1}m`);
    return {
      labels,
      datasets: [{
        label: 'Cost per Minute ($)',
        data: sessionData.stats.costPerMinute,
        fill: true,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgb(34, 197, 94)',
        tension: 0.4,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  if (!sessionId) {
    return (
      <Flex h="full" align="center" justify="center">
        <VStack spacing={4}>
          <Icon as={FiActivity} boxSize={12} color={useSemanticToken('text.tertiary')} />
          <Text color={useSemanticToken('text.secondary')}>No active session selected</Text>
          <Text fontSize="sm" color={useSemanticToken('text.tertiary')}>Start a research session to see live monitoring</Text>
        </VStack>
      </Flex>
    );
  }

  if (loading && !sessionData) {
    return (
      <Flex h="full" align="center" justify="center">
        <Spinner size="xl" color={primaryColor} />
      </Flex>
    );
  }

  if (!sessionData || (sessionData.stats.totalRequests === 0 && sessionData.session.status === 'pending')) {
    return (
      <Flex h="full" align="center" justify="center">
        <VStack spacing={4}>
          <Icon as={FiClock} boxSize={12} color={primaryColor} />
          <Text color={useSemanticToken('text.secondary')} fontWeight="semibold">Session Created - Waiting for LLM Calls</Text>
          <Code fontSize="sm" colorScheme="blue">{sessionId}</Code>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" maxW="md">
            The clarifying agent will start processing your question shortly.<br />
            LLM calls will appear here in real-time.
          </Text>
          {autoRefresh && (
            <HStack spacing={2}>
              <Spinner size="sm" color={primaryColor} />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>Polling every {refreshInterval / 1000}s...</Text>
            </HStack>
          )}
        </VStack>
      </Flex>
    );
  }

  return (
    <VStack align="stretch" spacing={6} h="full" p={6} overflowY="auto">
      {/* Header */}
      <HStack justify="space-between">
        <VStack align="start" spacing={1}>
          <HStack spacing={2}>
            <Badge colorScheme={sessionData.realtime.isActive ? 'blue' : 'gray'} fontSize="sm">
              {sessionData.realtime.isActive ? '🔴 LIVE' : 'Completed'}
            </Badge>
            {(sessionData as any).telemetryOnly && (
              <Badge colorScheme="purple" fontSize="xs">
                Early Tracking
              </Badge>
            )}
            <Code fontSize="xs">{sessionId}</Code>
          </HStack>

          {/* Pulse Indicator - Proof of life from OpenAI */}
          {sessionData.session && (
            <SessionPulseIndicator
              sessionId={sessionId!}
              status={sessionData.session.status}
              autoRefresh={autoRefresh}
              refreshInterval={refreshInterval}
            />
          )}

          {(sessionData as any).telemetryOnly && (
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
              Tracking LLM calls (clarifying, synthesizing)
            </Text>
          )}
        </VStack>

        <HStack>
          <Select size="sm" w="120px" value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))}>
            <option value={1000}>1s</option>
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
          </Select>
          <Button size="sm" colorScheme={autoRefresh ? 'blue' : 'gray'} onClick={() => setAutoRefresh(!autoRefresh)} leftIcon={<FiRefreshCw />}>
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </HStack>
      </HStack>

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        <Stat bg={statBg} p={4} borderRadius="lg">
          <StatLabel>Total Cost</StatLabel>
          <StatNumber>${sessionData.stats.totalCost.toFixed(4)}</StatNumber>
          <StatHelpText><Icon as={FiDollarSign} mr={1} />{sessionData.stats.totalRequests} requests</StatHelpText>
        </Stat>

        <Stat bg={statBg} p={4} borderRadius="lg">
          <StatLabel>Total Tokens</StatLabel>
          <StatNumber>{sessionData.stats.totalTokens.toLocaleString()}</StatNumber>
          <StatHelpText><Icon as={FiZap} mr={1} />Avg: {Math.round(sessionData.stats.totalTokens / Math.max(1, sessionData.stats.totalRequests))}</StatHelpText>
        </Stat>

        <Stat bg={statBg} p={4} borderRadius="lg">
          <StatLabel>Duration</StatLabel>
          <StatNumber>{sessionData.session.duration_readable}</StatNumber>
          <StatHelpText><Icon as={FiClock} mr={1} />Since {new Date(sessionData.session.created_at).toLocaleTimeString()}</StatHelpText>
        </Stat>

        <Stat bg={statBg} p={4} borderRadius="lg">
          <StatLabel>Success Rate</StatLabel>
          <StatNumber>{((sessionData.stats.successCount / Math.max(1, sessionData.stats.totalRequests)) * 100).toFixed(1)}%</StatNumber>
          <StatHelpText><Icon as={FiCheckCircle} mr={1} color={successColor} />{sessionData.stats.successCount}/{sessionData.stats.totalRequests}</StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Current Status */}
      {sessionData.session.current_step && (
        <Box bg={statBg} p={4} borderRadius="lg">
          <VStack align="stretch" spacing={2}>
            <Text fontWeight="bold">Current Step:</Text>
            <Text>{sessionData.session.current_step}</Text>
            {sessionData.session.progress > 0 && (
              <Progress value={sessionData.session.progress} colorScheme="blue" hasStripe isAnimated={sessionData.realtime.isActive} />
            )}
          </VStack>
        </Box>
      )}

      {/* Charts */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        <Box bg={bgColor} p={4} borderRadius="lg" border="1px" borderColor={borderColor}>
          <Heading size="sm" mb={4}>Token Usage Over Time</Heading>
          <Box h="200px">{getTokenChartData() && <Line data={getTokenChartData()!} options={chartOptions} />}</Box>
        </Box>

        <Box bg={bgColor} p={4} borderRadius="lg" border="1px" borderColor={borderColor}>
          <Heading size="sm" mb={4}>Cost Over Time</Heading>
          <Box h="200px">{getCostChartData() && <Line data={getCostChartData()!} options={chartOptions} />}</Box>
        </Box>
      </SimpleGrid>

      {/* Activity Log */}
      <Box bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Box p={4} borderBottom="1px" borderColor={borderColor}>
          <Heading size="sm">Recent Activity</Heading>
        </Box>
        <Box overflowX="auto">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Model</Th>
                <Th isNumeric>Tokens</Th>
                <Th isNumeric>Cost</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sessionData.telemetry.slice(0, 10).map((event: any, idx: number) => (
                <Tr key={idx}>
                  <Td fontSize="xs">{new Date(event.timestamp).toLocaleTimeString()}</Td>
                  <Td><Code fontSize="xs">{event.model}</Code></Td>
                  <Td isNumeric>{event.tokens_total?.toLocaleString()}</Td>
                  <Td isNumeric fontSize="xs">${parseFloat(event.cost_usd).toFixed(4)}</Td>
                  <Td>{event.status === 'success' ? <Icon as={FiCheckCircle} color={successColor} /> : <Icon as={FiXCircle} color={errorColor} />}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Models Used */}
      <Box bg={statBg} p={4} borderRadius="lg">
        <Heading size="sm" mb={2}>Models Used</Heading>
        <HStack spacing={2} flexWrap="wrap">
          {sessionData.stats.modelsUsed.map((model: string) => (
            <Badge key={model} colorScheme="purple">{model}</Badge>
          ))}
        </HStack>
      </Box>
    </VStack>
  );
};
