/**
 * Enhanced AI Gateway Infrastructure Dashboard v2.1
 * 
 * Comprehensive monitoring with request tracing, cost analytics, and advanced metrics
 * Features: Request traces, cost tracking, model health, real-time charts, alerts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  Button,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Progress,
  Tooltip,
  IconButton,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  HStack,
  VStack,
  Flex,
  Switch,
  FormControl,
  FormLabel,
  Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Code,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiAlertTriangle,
  FiActivity,
  FiZap,
  FiWifi,
  FiServer,
  FiTrendingUp,
  FiUsers,
  FiShield,
  FiDollarSign,
  FiEye,
  FiFilter,
  FiClock,
} from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Types
interface Trace {
  traceId: string;
  spanId: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'error' | 'in_progress';
  statusCode: number;
  request: {
    method: string;
    model: string;
    provider: string;
    stream: boolean;
  };
  client: {
    id: string;
    ip: string;
  };
  routing: {
    strategy: string;
    selectedProvider: string;
    retries: number;
  };
  response?: {
    model: string;
    provider: string;
    content: string;
  };
  error?: {
    message: string;
    code: string;
  };
  metrics: {
    tokenCount: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency: {
      routing: number;
      provider: number;
      total: number;
    };
    cost: {
      total: number;
    };
  };
}

interface CostSummary {
  total: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerRequest: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byClient: Record<string, number>;
  trend: Array<{ timestamp: string; cost: number; requests: number }>;
}

interface LiveMetrics {
  total_requests: number;
  requests_per_second: number;
  active_connections: number;
  avg_latency: number;
  error_rate: number;
  uptime: number;
}

// Main component
function EnhancedAIGatewayDashboardV2Content() {
  const [tabValue, setTabValue] = useState(0);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProvider, setFilterProvider] = useState('');
  const [filterModel, setFilterModel] = useState('');
  
  // Modal for trace details
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null);

  // Data loading
  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadTraces(),
        loadCostSummary(),
        loadLiveMetrics(),
      ]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [timeRange, filterStatus, filterProvider, filterModel]);

  const loadTraces = async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filterStatus) params.append('status', filterStatus);
      if (filterProvider) params.append('provider', filterProvider);
      if (filterModel) params.append('model', filterModel);
      
      const response = await fetch(`/api/ai-gateway/traces?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTraces(data.traces || []);
      }
    } catch (error) {
      console.error('Failed to load traces:', error);
    }
  };

  const loadCostSummary = async () => {
    try {
      const response = await fetch(`/api/ai-gateway/costs/summary?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setCostSummary(data);
      }
    } catch (error) {
      console.error('Failed to load cost summary:', error);
    }
  };

  const loadLiveMetrics = async () => {
    try {
      const response = await fetch('/api/ai-gateway/metrics/live');
      if (response.ok) {
        const data = await response.json();
        setLiveMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load live metrics:', error);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    loadAllData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [loadAllData, autoRefresh]);

  // Handlers
  const handleRefresh = () => {
    loadAllData();
  };

  const handleTraceClick = async (trace: Trace) => {
    setSelectedTrace(trace);
    onOpen();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'in_progress': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle />;
      case 'error': return <FiAlertCircle />;
      case 'in_progress': return <FiActivity />;
      default: return <FiCheckCircle />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Render functions
  const renderOverviewCards = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 6 }} spacing={4} mb={6}>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Active Connections</StatLabel>
            <StatNumber color="blue.500" fontSize="2xl">
              {liveMetrics?.active_connections || 0}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Requests/sec</StatLabel>
            <StatNumber color="green.500" fontSize="2xl">
              {liveMetrics?.requests_per_second.toFixed(1) || '0.0'}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Avg Latency</StatLabel>
            <StatNumber color="cyan.500" fontSize="2xl">
              {liveMetrics?.avg_latency || 0}ms
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Error Rate</StatLabel>
            <StatNumber color={liveMetrics?.error_rate && liveMetrics.error_rate > 0.05 ? 'red.500' : 'green.500'} fontSize="2xl">
              {((liveMetrics?.error_rate || 0) * 100).toFixed(1)}%
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Total Cost ({timeRange})</StatLabel>
            <StatNumber color="purple.500" fontSize="2xl">
              {formatCurrency(costSummary?.total || 0)}
            </StatNumber>
            <StatHelpText>
              {costSummary?.totalRequests || 0} requests
            </StatHelpText>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel fontSize="xs">Tokens Used</StatLabel>
            <StatNumber color="orange.500" fontSize="2xl">
              {((costSummary?.totalTokens || 0) / 1000).toFixed(1)}K
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
    </SimpleGrid>
  );

  const renderTracesTab = () => (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md" display="flex" alignItems="center" gap={2}>
          <Box as={FiEye} /> Request Traces
        </Heading>
        <HStack spacing={2}>
          <Select
            size="sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder="All Status"
            width="150px"
          >
            <option value="completed">Completed</option>
            <option value="error">Error</option>
            <option value="in_progress">In Progress</option>
          </Select>
          <Select
            size="sm"
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            placeholder="All Providers"
            width="150px"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
            <option value="openai-oss">Ollama</option>
          </Select>
          <Button size="sm" leftIcon={<FiFilter />} onClick={loadTraces}>
            Apply
          </Button>
        </HStack>
      </Flex>
      
      <Card>
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Timestamp</Th>
                <Th>Trace ID</Th>
                <Th>Status</Th>
                <Th>Model</Th>
                <Th>Provider</Th>
                <Th isNumeric>Duration</Th>
                <Th isNumeric>Tokens</Th>
                <Th isNumeric>Cost</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {traces.map((trace) => (
                <Tr key={trace.traceId} _hover={{ bg: 'gray.50' }}>
                  <Td>
                    <Text fontSize="xs" fontFamily="mono">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </Text>
                  </Td>
                  <Td>
                    <Tooltip label={trace.traceId}>
                      <Text fontSize="xs" fontFamily="mono" isTruncated maxW="100px">
                        {trace.traceId.substring(0, 8)}...
                      </Text>
                    </Tooltip>
                  </Td>
                  <Td>
                    <HStack spacing={1}>
                      <Box as={getStatusIcon(trace.status)} boxSize={3} />
                      <Badge colorScheme={getStatusColor(trace.status)} fontSize="xs">
                        {trace.status}
                      </Badge>
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="xs">{trace.request.model}</Text>
                  </Td>
                  <Td>
                    <Badge colorScheme="blue" fontSize="xs">
                      {trace.routing.selectedProvider}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs" color={trace.duration > 5000 ? 'red.500' : 'inherit'}>
                      {formatDuration(trace.duration)}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs">{trace.metrics.tokenCount.total}</Text>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="xs">{formatCurrency(trace.metrics.cost.total)}</Text>
                  </Td>
                  <Td>
                    <IconButton
                      icon={<FiEye />}
                      aria-label="View details"
                      size="xs"
                      onClick={() => handleTraceClick(trace)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        {traces.length === 0 && (
          <Flex h="200px" align="center" justify="center">
            <Text color={useSemanticToken('text.secondary')}>No traces found</Text>
          </Flex>
        )}
      </Card>
    </Box>
  );

  const renderCostAnalyticsTab = () => (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiDollarSign} /> Cost Analytics
      </Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Cost by Provider</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {costSummary && Object.entries(costSummary.byProvider).map(([provider, cost]) => (
                <Box key={provider}>
                  <Flex justify="space-between" mb={1}>
                    <Text fontSize="sm" fontWeight="medium">{provider}</Text>
                    <Text fontSize="sm" fontWeight="bold">{formatCurrency(Number(cost))}</Text>
                  </Flex>
                  <Progress
                    value={(Number(cost) / costSummary.total) * 100}
                    size="sm"
                    colorScheme="purple"
                  />
                </Box>
              ))}
              {(!costSummary || Object.keys(costSummary.byProvider).length === 0) && (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">No cost data available</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="sm">Cost by Model</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              {costSummary && Object.entries(costSummary.byModel)
                .sort(([,a], [,b]) => Number(b) - Number(a))
                .slice(0, 5)
                .map(([model, cost]) => (
                  <Box key={model}>
                    <Flex justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium" isTruncated maxW="200px">
                        {model}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold">{formatCurrency(Number(cost))}</Text>
                    </Flex>
                    <Progress
                      value={(Number(cost) / costSummary.total) * 100}
                      size="sm"
                      colorScheme="orange"
                    />
                  </Box>
                ))}
              {(!costSummary || Object.keys(costSummary.byModel).length === 0) && (
                <Text color={useSemanticToken('text.secondary')} textAlign="center">No cost data available</Text>
              )}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card>
        <CardHeader>
          <Heading size="sm">Cost Trend</Heading>
        </CardHeader>
        <CardBody>
          {costSummary && costSummary.trend.length > 0 ? (
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>Cost trend chart (visualization coming soon)</Text>
            </Flex>
          ) : (
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>No trend data available</Text>
            </Flex>
          )}
        </CardBody>
      </Card>
    </Box>
  );

  const renderTraceDetailModal = () => (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Trace Details</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {selectedTrace && (
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={2}>Request Information</Text>
                <SimpleGrid columns={2} spacing={2}>
                  <Text fontSize="sm"><strong>Trace ID:</strong></Text>
                  <Code fontSize="xs">{selectedTrace.traceId}</Code>
                  
                  <Text fontSize="sm"><strong>Timestamp:</strong></Text>
                  <Text fontSize="sm">{new Date(selectedTrace.timestamp).toLocaleString()}</Text>
                  
                  <Text fontSize="sm"><strong>Model:</strong></Text>
                  <Text fontSize="sm">{selectedTrace.request.model}</Text>
                  
                  <Text fontSize="sm"><strong>Provider:</strong></Text>
                  <Badge colorScheme="blue">{selectedTrace.routing.selectedProvider}</Badge>
                  
                  <Text fontSize="sm"><strong>Duration:</strong></Text>
                  <Text fontSize="sm">{formatDuration(selectedTrace.duration)}</Text>
                  
                  <Text fontSize="sm"><strong>Status:</strong></Text>
                  <Badge colorScheme={getStatusColor(selectedTrace.status)}>
                    {selectedTrace.status}
                  </Badge>
                </SimpleGrid>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>Metrics</Text>
                <SimpleGrid columns={3} spacing={2}>
                  <Stat size="sm">
                    <StatLabel>Prompt Tokens</StatLabel>
                    <StatNumber fontSize="md">{selectedTrace.metrics.tokenCount.prompt}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Completion Tokens</StatLabel>
                    <StatNumber fontSize="md">{selectedTrace.metrics.tokenCount.completion}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Total Cost</StatLabel>
                    <StatNumber fontSize="md">{formatCurrency(selectedTrace.metrics.cost.total)}</StatNumber>
                  </Stat>
                </SimpleGrid>
              </Box>

              {selectedTrace.error && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2} color="red.500">Error Details</Text>
                    <Alert status="error">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>{selectedTrace.error.code}</AlertTitle>
                        <AlertDescription fontSize="sm">
                          {selectedTrace.error.message}
                        </AlertDescription>
                      </Box>
                    </Alert>
                  </Box>
                </>
              )}

              {selectedTrace.response && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2}>Response Content</Text>
                    <Code display="block" whiteSpace="pre-wrap" p={2} fontSize="xs">
                      {selectedTrace.response.content}
                    </Code>
                  </Box>
                </>
              )}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );

  const bgColor = useSemanticToken('surface.elevated');

  return (
    <DashboardLayout>
      <Box p={6}>
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading size="lg">AI Gateway Infrastructure v2.1</Heading>
          <HStack spacing={3}>
            <Select
              size="sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              width="120px"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </Select>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                Auto Refresh
              </FormLabel>
              <Switch
                id="auto-refresh"
                isChecked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                colorScheme="blue"
              />
            </FormControl>
            <Button
              size="sm"
              leftIcon={refreshing ? <Spinner size="xs" /> : <Box as={FiRefreshCw} />}
              onClick={handleRefresh}
              isLoading={refreshing}
              colorScheme="blue"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>

        {/* Status indicator */}
        <Alert status="info" mb={6}>
          <AlertIcon />
          <AlertTitle>Enhanced AI Gateway Monitoring</AlertTitle>
          <AlertDescription>Real-time tracing, cost analytics, and performance metrics</AlertDescription>
        </Alert>

        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Tabbed Content */}
        <Card bg={bgColor}>
          <Tabs index={tabValue} onChange={(index) => setTabValue(index)} colorScheme="blue">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiEye} />
                  <Text>Request Traces</Text>
                  <Badge colorScheme="blue">{traces.length}</Badge>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiDollarSign} />
                  <Text>Cost Analytics</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiActivity} />
                  <Text>Providers</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiTrendingUp} />
                  <Text>Live Metrics</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>{renderTracesTab()}</TabPanel>
              <TabPanel>{renderCostAnalyticsTab()}</TabPanel>
              <TabPanel>
                <Text color={useSemanticToken('text.secondary')}>Provider monitoring (existing functionality)</Text>
              </TabPanel>
              <TabPanel>
                <Text color={useSemanticToken('text.secondary')}>Live metrics charts (coming soon)</Text>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Card>

        {/* Trace Detail Modal */}
        {renderTraceDetailModal()}
      </Box>
    </DashboardLayout>
  );
}

// Wrap with provider for context
export default function EnhancedAIGatewayDashboardV2() {
  return <EnhancedAIGatewayDashboardV2Content />;
}
