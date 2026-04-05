/**
 * Inference Traffic Component
 * Shows which services/clients are driving GPU inference
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Spinner,
  useColorMode,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  RefreshCw,
  Activity,
  Users,
  Cpu,
  Clock,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';

interface ClientTraffic {
  clientId: string;
  clientName: string;
  requests: number;
  requestsPerMinute: number;
  tokensIn: number;
  tokensOut: number;
  avgLatency: number;
  lastRequest: string;
  models: string[];
  endpoints: string[];
}

interface ModelTraffic {
  model: string;
  provider: string;
  requests: number;
  requestsPerMinute: number;
  tokensIn: number;
  tokensOut: number;
  avgLatency: number;
}

interface RecentRequest {
  id: string;
  timestamp: string;
  client: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latency: number;
  status: string;
}

interface TrafficData {
  summary: {
    totalRequests: number;
    requestsPerMinute: number;
    activeClients: number;
    activeModels: number;
    totalTokensIn: number;
    totalTokensOut: number;
  };
  clients: ClientTraffic[];
  models: ModelTraffic[];
  recentRequests: RecentRequest[];
}

interface InferenceTrafficProps {
  refreshInterval?: number;
}

const getClientColor = (clientName: string): string => {
  if (clientName.includes('Hermes')) return 'purple';
  if (clientName.includes('PIC')) return 'blue';
  if (clientName.includes('OpenClaw')) return 'green';
  if (clientName.includes('Clinical')) return 'red';
  if (clientName.includes('Child')) return 'pink';
  if (clientName.includes('Research')) return 'orange';
  if (clientName.includes('Email')) return 'cyan';
  if (clientName.includes('Calendar')) return 'teal';
  if (clientName.includes('TTS')) return 'yellow';
  return 'gray';
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const formatLatency = (ms: number): string => {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const InferenceTraffic: React.FC<InferenceTrafficProps> = ({
  refreshInterval = 5000,
}) => {
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/inference-traffic');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch traffic data');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);
  
  if (loading && !data) {
    return (
      <Box textAlign="center" py={6}>
        <Spinner size="md" color="blue.400" />
        <Text mt={2} fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
          Loading inference traffic...
        </Text>
      </Box>
    );
  }
  
  if (error && !data) {
    return (
      <GlassPanel variant="light" p={4}>
        <HStack>
          <Activity size={18} color="#E53E3E" />
          <Text color="red.400">AI Gateway not reachable</Text>
        </HStack>
        <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'} mt={2}>
          {error}
        </Text>
      </GlassPanel>
    );
  }
  
  if (!data || (data.clients.length === 0 && data.recentRequests.length === 0)) {
    return (
      <GlassPanel variant="light" p={4}>
        <VStack spacing={2}>
          <Activity size={24} color={isDark ? '#A0AEC0' : '#718096'} />
          <Text fontWeight="medium">No Active Inference Traffic</Text>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
            No requests have been routed through the AI Gateway recently
          </Text>
        </VStack>
      </GlassPanel>
    );
  }
  
  const totalTraffic = data.clients.reduce((sum, c) => sum + c.requests, 0);
  
  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Activity size={18} color="#4299E1" />
          <Text fontWeight="semibold">Inference Traffic</Text>
        </HStack>
        <HStack>
          <Badge colorScheme="blue">{data.summary.requestsPerMinute.toFixed(1)} req/min</Badge>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh"
              icon={<RefreshCw size={14} />}
              size="xs"
              variant="ghost"
              onClick={fetchData}
              isLoading={loading}
            />
          </Tooltip>
        </HStack>
      </HStack>
      
      {/* Summary Stats */}
      <SimpleGrid columns={4} spacing={3}>
        <Stat size="sm">
          <StatLabel fontSize="xs">
            <HStack spacing={1}>
              <Users size={12} />
              <Text>Clients</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="lg">{data.summary.activeClients}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="xs">
            <HStack spacing={1}>
              <Cpu size={12} />
              <Text>Models</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="lg">{data.summary.activeModels}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="xs">
            <HStack spacing={1}>
              <MessageSquare size={12} />
              <Text>Tokens In</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="lg">{formatNumber(data.summary.totalTokensIn)}</StatNumber>
        </Stat>
        <Stat size="sm">
          <StatLabel fontSize="xs">
            <HStack spacing={1}>
              <Zap size={12} />
              <Text>Tokens Out</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="lg">{formatNumber(data.summary.totalTokensOut)}</StatNumber>
        </Stat>
      </SimpleGrid>
      
      <Tabs variant="soft-rounded" colorScheme="blue" size="sm">
        <TabList>
          <Tab>By Client</Tab>
          <Tab>By Model</Tab>
          <Tab>Recent</Tab>
        </TabList>
        
        <TabPanels>
          {/* By Client */}
          <TabPanel px={0}>
            <VStack spacing={3} align="stretch">
              {data.clients.map((client) => (
                <GlassPanel key={client.clientId} variant="light" p={3}>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Badge colorScheme={getClientColor(client.clientName)} fontSize="sm">
                        {client.clientName}
                      </Badge>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                        {client.requestsPerMinute} req/min
                      </Text>
                    </HStack>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="medium">
                        {client.requests} requests
                      </Text>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                        ({((client.requests / totalTraffic) * 100).toFixed(0)}%)
                      </Text>
                    </HStack>
                  </HStack>
                  
                  <Progress
                    value={(client.requests / totalTraffic) * 100}
                    colorScheme={getClientColor(client.clientName)}
                    size="sm"
                    borderRadius="full"
                    mb={2}
                  />
                  
                  <SimpleGrid columns={3} spacing={2}>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Tokens</Text>
                      <Text fontSize="sm">
                        {formatNumber(client.tokensIn)} → {formatNumber(client.tokensOut)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Latency</Text>
                      <Text fontSize="sm">{formatLatency(client.avgLatency)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Models</Text>
                      <Text fontSize="sm" isTruncated>{client.models.join(', ') || '-'}</Text>
                    </Box>
                  </SimpleGrid>
                </GlassPanel>
              ))}
              
              {data.clients.length === 0 && (
                <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'} textAlign="center">
                  No client traffic data available
                </Text>
              )}
            </VStack>
          </TabPanel>
          
          {/* By Model */}
          <TabPanel px={0}>
            <VStack spacing={3} align="stretch">
              {data.models.map((model) => (
                <GlassPanel key={model.model} variant="light" p={3}>
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">{model.model}</Text>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                        {model.provider}
                      </Text>
                    </VStack>
                    <Badge colorScheme="purple">{model.requests} requests</Badge>
                  </HStack>
                  
                  <SimpleGrid columns={3} spacing={2}>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>RPM</Text>
                      <Text fontSize="sm">{model.requestsPerMinute}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Tokens</Text>
                      <Text fontSize="sm">
                        {formatNumber(model.tokensIn)} → {formatNumber(model.tokensOut)}
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Latency</Text>
                      <Text fontSize="sm">{formatLatency(model.avgLatency)}</Text>
                    </Box>
                  </SimpleGrid>
                </GlassPanel>
              ))}
              
              {data.models.length === 0 && (
                <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'} textAlign="center">
                  No model traffic data available
                </Text>
              )}
            </VStack>
          </TabPanel>
          
          {/* Recent Requests */}
          <TabPanel px={0}>
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Client</Th>
                    <Th>Model</Th>
                    <Th isNumeric>Tokens</Th>
                    <Th isNumeric>Latency</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.recentRequests.map((req) => (
                    <Tr key={req.id}>
                      <Td>
                        <HStack spacing={1}>
                          <Clock size={12} />
                          <Text fontSize="xs">{formatTime(req.timestamp)}</Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Badge colorScheme={getClientColor(req.client)} size="sm">
                          {req.client}
                        </Badge>
                      </Td>
                      <Td>
                        <Text fontSize="sm" isTruncated maxW="150px">{req.model}</Text>
                      </Td>
                      <Td isNumeric>
                        <Text fontSize="xs">
                          {req.tokensIn} → {req.tokensOut}
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={req.latency > 5000 ? 'red' : req.latency > 2000 ? 'yellow' : 'green'}
                          size="sm"
                        >
                          {formatLatency(req.latency)}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              
              {data.recentRequests.length === 0 && (
                <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'} textAlign="center" py={4}>
                  No recent requests
                </Text>
              )}
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};

export default InferenceTraffic;
