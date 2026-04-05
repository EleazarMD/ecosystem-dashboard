/**
 * Enhanced AI Gateway Infrastructure Dashboard
 * 
 * Real-time monitoring of upstream/downstream connections and API services
 * Features: Provider monitoring, client connections, interface health, live metrics
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
  HStack,
  VStack,
  Flex,
  Switch,
  FormControl,
  FormLabel
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
  FiShield
} from 'react-icons/fi';
import { useAIGatewayClient, AIGatewayClientProvider } from '../../lib/ai-gateway-client-provider';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Types for monitoring data
interface ProviderStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'offline';
  latency: number;
  requests_per_minute: number;
  error_rate: number;
  last_request: string;
  quota_used?: number;
  quota_limit?: number;
}

interface ClientConnection {
  id: string;
  client_id: string;
  ip_address: string;
  connected_at: string;
  requests_count: number;
  last_activity: string;
  user_agent?: string;
  auth_method: string;
}

interface InterfaceMetrics {
  endpoint: string;
  protocol: string;
  active_connections: number;
  requests_per_second: number;
  avg_response_time: number;
  error_rate: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface LiveMetrics {
  total_requests: number;
  requests_per_second: number;
  active_connections: number;
  avg_latency: number;
  error_rate: number;
  uptime: number;
}

// API data fetchers
const fetchProviderData = async (): Promise<ProviderStatus[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/providers');
    if (!response.ok) {
      console.warn(`Provider metrics unavailable: HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.warn('AI Gateway backend not available - provider metrics unavailable');
    return [];
  }
};

const fetchClientData = async (): Promise<ClientConnection[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/connections');
    if (!response.ok) {
      console.warn(`Connection metrics unavailable: HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.connections || [];
  } catch (error) {
    console.warn('AI Gateway backend not available - connection metrics unavailable');
    return [];
  }
};

const fetchInterfaceData = async (): Promise<InterfaceMetrics[]> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/interfaces');
    if (!response.ok) {
      console.warn(`Interface metrics unavailable: HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.interfaces || [];
  } catch (error) {
    console.warn('AI Gateway backend not available - interface metrics unavailable');
    return [];
  }
};

const fetchLiveMetrics = async (): Promise<LiveMetrics | null> => {
  try {
    const response = await fetch('/api/ai-gateway/metrics/live');
    if (!response.ok) {
      console.warn(`Live metrics unavailable: HTTP ${response.status}`);
      return null;
    }
    const data = await response.json();
    return {
      total_requests: data.total_requests,
      requests_per_second: data.requests_per_second,
      active_connections: data.active_connections,
      avg_latency: data.avg_latency,
      error_rate: data.error_rate,
      uptime: data.derived?.health_score || 0
    };
  } catch (error) {
    console.warn('AI Gateway backend not available - live metrics unavailable');
    return null;
  }
};

// Status color helpers (Chakra UI Badge colorSchemes)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return 'green';
    case 'degraded': return 'yellow';
    case 'error': return 'red';
    case 'offline': return 'red';
    default: return 'gray';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'healthy': return <Box as={FiCheckCircle} color="green.500" />;
    case 'degraded': return <Box as={FiAlertTriangle} color="yellow.500" />;
    case 'error': return <Box as={FiAlertCircle} color="red.500" />;
    case 'offline': return <Box as={FiAlertCircle} color="red.500" />;
    default: return <Box as={FiCheckCircle} color={useSemanticToken('text.secondary')} />;
  }
};

// Main component (inner)
function EnhancedAIGatewayDashboardContent() {
  // Note: This page uses direct API calls instead of useAIGatewayClient
  // const { isConnected, error } = useAIGatewayClient();
  
  // State
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [clients, setClients] = useState<ClientConnection[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceMetrics[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data loading
  const loadAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Load metrics data from APIs
      const [providersData, clientsData, interfacesData] = await Promise.all([
        fetchProviderData(),
        fetchClientData(),
        fetchInterfaceData()
      ]);
      
      setProviders(providersData);
      setClients(clientsData);
      setInterfaces(interfacesData);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Auto-refresh effect
  useEffect(() => {
    loadAllData();
    
    if (autoRefresh) {
      const interval = setInterval(loadAllData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [loadAllData, autoRefresh]);

  // Chakra tabs use direct index change
  // handleTabChange is now inline in the Tabs onChange

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  // Render functions
  const renderOverviewCards = () => (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 5 }} spacing={4} mb={6}>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel>Active Connections</StatLabel>
            <StatNumber color="blue.500">
              {liveMetrics?.active_connections || 0}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel>Requests/sec</StatLabel>
            <StatNumber color="green.500">
              {liveMetrics?.requests_per_second.toFixed(1) || '0.0'}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel>Avg Latency</StatLabel>
            <StatNumber color="cyan.500">
              {liveMetrics?.avg_latency || 0}ms
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel>Error Rate</StatLabel>
            <StatNumber color={liveMetrics?.error_rate && liveMetrics.error_rate > 0.05 ? 'red.500' : 'green.500'}>
              {((liveMetrics?.error_rate || 0) * 100).toFixed(1)}%
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody textAlign="center">
          <Stat>
            <StatLabel>Uptime</StatLabel>
            <StatNumber color="orange.500">
              {liveMetrics?.uptime.toFixed(1) || '0.0'}%
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
    </SimpleGrid>
  );

  const renderProvidersTab = () => (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiActivity} /> Upstream AI Providers
      </Heading>
      <Card>
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Provider</Th>
                <Th>Status</Th>
                <Th isNumeric>Latency</Th>
                <Th isNumeric>Req/min</Th>
                <Th isNumeric>Error Rate</Th>
                <Th isNumeric>Quota</Th>
                <Th>Last Request</Th>
              </Tr>
            </Thead>
            <Tbody>
              {providers.map((provider) => (
                <Tr key={provider.id}>
                  <Td>
                    <HStack spacing={2}>
                      {getStatusIcon(provider.status)}
                      <Text fontWeight="medium" fontSize="sm">
                        {provider.name}
                      </Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={getStatusColor(provider.status)}
                      fontSize="xs"
                    >
                      {provider.status}
                    </Badge>
                  </Td>
                  <Td isNumeric>
                    <Text fontSize="sm" color={provider.latency > 1000 ? 'red.500' : 'inherit'}>
                      {provider.latency}ms
                    </Text>
                  </Td>
                  <Td isNumeric fontSize="sm">{provider.requests_per_minute}</Td>
                  <Td isNumeric>
                    <Text fontSize="sm" color={provider.error_rate > 0.1 ? 'red.500' : 'inherit'}>
                      {(provider.error_rate * 100).toFixed(1)}%
                    </Text>
                  </Td>
                  <Td isNumeric>
                    {provider.quota_used && provider.quota_limit ? (
                      <VStack spacing={1} align="end">
                        <Text fontSize="sm">
                          {provider.quota_used}/{provider.quota_limit}
                        </Text>
                        <Progress 
                          value={(provider.quota_used / provider.quota_limit) * 100}
                          size="xs"
                          width="60px"
                          colorScheme="blue"
                        />
                      </VStack>
                    ) : (
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')}>N/A</Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {provider.last_request}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );

  const renderClientsTab = () => (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiUsers} /> Downstream Client Connections
      </Heading>
      <Card>
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Client ID</Th>
                <Th>IP Address</Th>
                <Th>Connected</Th>
                <Th isNumeric>Requests</Th>
                <Th>Last Activity</Th>
                <Th>Auth Method</Th>
                <Th>User Agent</Th>
              </Tr>
            </Thead>
            <Tbody>
              {clients.map((client) => (
                <Tr key={client.id}>
                  <Td>
                    <Text fontWeight="medium" fontSize="sm">
                      {client.client_id}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" fontFamily="mono">
                      {client.ip_address}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {client.connected_at}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <HStack spacing={2} justify="flex-end">
                      <Box as={FiServer} color="blue.500" />
                      <Badge colorScheme="blue">{client.requests_count}</Badge>
                    </HStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {client.last_activity}
                    </Text>
                  </Td>
                  <Td>
                    <Badge 
                      colorScheme={client.auth_method === 'API Key' ? 'blue' : 'purple'}
                      fontSize="xs"
                    >
                      {client.auth_method}
                    </Badge>
                  </Td>
                  <Td>
                    <Tooltip label={client.user_agent || 'Unknown'} hasArrow>
                      <Text 
                        fontSize="sm" 
                        color={useSemanticToken('text.secondary')} 
                        isTruncated 
                        maxW="200px"
                      >
                        {client.user_agent || 'Unknown'}
                      </Text>
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>
    </Box>
  );

  const renderInterfacesTab = () => (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiWifi} /> API Interfaces & Protocols
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {interfaces.map((interface_item) => (
          <Card key={interface_item.endpoint}>
            <CardBody>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm">{interface_item.endpoint}</Heading>
                <Badge 
                  colorScheme={getStatusColor(interface_item.status)}
                  fontSize="xs"
                >
                  {interface_item.status}
                </Badge>
              </Flex>
              
              <SimpleGrid columns={2} spacing={4} mb={4}>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Protocol</Text>
                  <Text fontWeight="medium">{interface_item.protocol}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Active Connections</Text>
                  <Text fontWeight="medium">{interface_item.active_connections}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Requests/sec</Text>
                  <Text fontWeight="medium">{interface_item.requests_per_second.toFixed(1)}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={1}>Avg Response</Text>
                  <Text fontWeight="medium">{interface_item.avg_response_time}ms</Text>
                </Box>
              </SimpleGrid>
              
              <Box>
                <Text fontSize="xs" color={useSemanticToken('text.secondary')} mb={2}>Error Rate</Text>
                <HStack spacing={2}>
                  <Progress 
                    value={interface_item.error_rate * 100}
                    colorScheme={interface_item.error_rate > 0.05 ? 'red' : 'green'}
                    size="sm"
                    flex={1}
                  />
                  <Text fontSize="sm" fontWeight="medium">
                    {(interface_item.error_rate * 100).toFixed(1)}%
                  </Text>
                </HStack>
              </Box>
            </CardBody>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  );

  const renderMetricsTab = () => (
    <Box>
      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
        <Box as={FiTrendingUp} /> Live Performance Metrics
      </Heading>
      
      {/* Real-time charts and metrics would go here */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
        <Card>
          <CardHeader>
            <Heading size="sm">Request Flow</Heading>
          </CardHeader>
          <CardBody>
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>Live request flow chart (coming soon)</Text>
            </Flex>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <Heading size="sm">Latency Heatmap</Heading>
          </CardHeader>
          <CardBody>
            <Flex h="200px" align="center" justify="center">
              <Text color={useSemanticToken('text.secondary')}>Latency distribution chart (coming soon)</Text>
            </Flex>
          </CardBody>
        </Card>
      </SimpleGrid>
      <Card>
        <CardHeader>
          <Heading size="sm">Provider Load Distribution</Heading>
        </CardHeader>
        <CardBody>
          <Flex h="200px" align="center" justify="center">
            <Text color={useSemanticToken('text.secondary')}>Load balancing visualization (coming soon)</Text>
          </Flex>
        </CardBody>
      </Card>
    </Box>
  );

  const bgColor = useSemanticToken('surface.elevated');

  return (
    <DashboardLayout>
      <Box p={6}>
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading size="lg">AI Gateway Infrastructure</Heading>
          <HStack spacing={3}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                Auto Refresh
              </FormLabel>
              <Switch
                id="auto-refresh"
                isChecked={autoRefresh}
                onChange={handleAutoRefreshToggle}
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
          <AlertTitle>AI Gateway Monitoring Dashboard</AlertTitle>
        </Alert>

        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Tabbed Content */}
        <Card bg={bgColor}>
          <Tabs index={tabValue} onChange={(index) => setTabValue(index)} colorScheme="blue">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiActivity} />
                  <Text>Upstream Providers</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiUsers} />
                  <Text>Downstream Clients</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <Box as={FiWifi} />
                  <Text>API Interfaces</Text>
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
              <TabPanel>{renderProvidersTab()}</TabPanel>
              <TabPanel>{renderClientsTab()}</TabPanel>
              <TabPanel>{renderInterfacesTab()}</TabPanel>
              <TabPanel>{renderMetricsTab()}</TabPanel>
            </TabPanels>
          </Tabs>
        </Card>
      </Box>
    </DashboardLayout>
  );
}

// Wrap with provider for context
export default function EnhancedAIGatewayDashboard() {
  return (
    <AIGatewayClientProvider>
      <EnhancedAIGatewayDashboardContent />
    </AIGatewayClientProvider>
  );
}
