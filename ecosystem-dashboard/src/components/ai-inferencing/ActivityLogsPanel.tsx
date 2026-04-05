/**
 * Activity Logs Panel
 * Real-time model activity monitoring with filtering
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  Button,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Flex,
  Card,
  CardBody,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDollarSign,
  FiActivity,
  FiZap,
} from 'react-icons/fi';

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
  status: string;
  errorMessage?: string;
  metadata?: any;
}

export function ActivityLogsPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filters
  const [providerFilter, setProviderFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  
  // Available options
  const [providers, setProviders] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);

  // Color mode values
  const tableBg = useSemanticToken('surface.elevated');
  const hoverBg = useSemanticToken('surface.hover');
  const borderColor = useSemanticToken('border.default');
  const successColor = useSemanticToken('status.success');
  const errorColor = useSemanticToken('status.error');

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '50');
      if (providerFilter) params.append('provider', providerFilter);
      if (modelFilter) params.append('model', modelFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (serviceFilter) params.append('serviceId', serviceFilter);

      const response = await fetch(`${process.env.NEXT_PUBLIC_AI_INFERENCING_URL}/api/v1/telemetry/activity?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        
        // Extract unique values for filters
        const uniqueProviders = Array.from(new Set(data.logs.map((l: ActivityLog) => l.provider)));
        const uniqueModels = Array.from(new Set(data.logs.map((l: ActivityLog) => l.model)));
        const uniqueServices = Array.from(new Set(data.logs.map((l: ActivityLog) => l.serviceId)));
        
        setProviders(uniqueProviders as string[]);
        setModels(uniqueModels as string[]);
        setServices(uniqueServices as string[]);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [providerFilter, modelFilter, statusFilter, serviceFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, providerFilter, modelFilter, statusFilter, serviceFilter]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleTimeString();
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 1000) return 'green.500';
    if (ms < 5000) return 'yellow.500';
    return 'red.500';
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Calculate summary stats
  const totalRequests = logs.length;
  const successCount = logs.filter(l => l.status === 'success').length;
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 0;
  const avgLatency = totalRequests > 0 ? logs.reduce((sum, l) => sum + l.durationMs, 0) / totalRequests / 1000 : 0;
  const totalCost = logs.reduce((sum, l) => sum + l.costUsd, 0);

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Header */}
      <Flex justify="space-between" align="center">
        <Box>
          <Text fontSize="2xl" fontWeight="bold">Activity Logs</Text>
          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
            Real-time monitoring of AI model requests
          </Text>
        </Box>
        <HStack>
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
              Auto-refresh
            </FormLabel>
            <Switch
              id="auto-refresh"
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              colorScheme="green"
            />
          </FormControl>
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={fetchLogs}
            size="sm"
            colorScheme="blue"
            variant="outline"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Total Requests</StatLabel>
              <StatNumber fontSize="2xl">{totalRequests}</StatNumber>
              <StatHelpText>
                <Icon as={FiActivity} mr={1} />
                Last 50
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Success Rate</StatLabel>
              <StatNumber fontSize="2xl" color={successColor}>
                {successRate.toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                <Icon as={FiCheckCircle} mr={1} />
                {successCount} / {totalRequests}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Avg Latency</StatLabel>
              <StatNumber fontSize="2xl" color="yellow.500">
                {avgLatency.toFixed(2)}s
              </StatNumber>
              <StatHelpText>
                <Icon as={FiZap} mr={1} />
                Per request
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm">Total Cost</StatLabel>
              <StatNumber fontSize="2xl" color="purple.500">
                ${totalCost.toFixed(4)}
              </StatNumber>
              <StatHelpText>
                <Icon as={FiDollarSign} mr={1} />
                Last 50 requests
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Filters */}
      <Card>
        <CardBody>
          <Text fontSize="sm" fontWeight="semibold" mb={3}>Filters</Text>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
            <Box>
              <Text fontSize="xs" mb={1}>Provider</Text>
              <Select
                size="sm"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="">All Providers</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" mb={1}>Model</Text>
              <Select
                size="sm"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              >
                <option value="">All Models</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" mb={1}>Service</Text>
              <Select
                size="sm"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
              >
                <option value="">All Services</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" mb={1}>Status</Text>
              <Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </Select>
            </Box>
          </SimpleGrid>
          {(providerFilter || modelFilter || statusFilter || serviceFilter) && (
            <Button
              size="xs"
              variant="link"
              colorScheme="blue"
              mt={2}
              onClick={() => {
                setProviderFilter('');
                setModelFilter('');
                setStatusFilter('');
                setServiceFilter('');
              }}
            >
              Clear all filters
            </Button>
          )}
        </CardBody>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardBody p={0}>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg={useSemanticToken('surface.hover')}>
                <Tr>
                  <Th>Timestamp</Th>
                  <Th>Model</Th>
                  <Th>Service</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Tokens</Th>
                  <Th isNumeric>Latency</Th>
                  <Th isNumeric>Cost</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Spinner size="lg" />
                      <Text mt={2} color={useSemanticToken('text.secondary')}>Loading activity logs...</Text>
                    </Td>
                  </Tr>
                ) : logs.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py={8}>
                      <Text color={useSemanticToken('text.secondary')}>No activity logs found</Text>
                    </Td>
                  </Tr>
                ) : (
                  logs.map((log) => (
                    <Tr key={log.id} _hover={{ bg: hoverBg }}>
                      <Td fontSize="xs" color={useSemanticToken('text.secondary')}>
                        {formatTimestamp(log.timestamp)}
                      </Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">{log.model}</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{log.provider}</Text>
                        </VStack>
                      </Td>
                      <Td fontSize="sm">{log.serviceId}</Td>
                      <Td>
                        {log.status === 'success' ? (
                          <Badge colorScheme="green" fontSize="xs">
                            <HStack spacing={1}>
                              <Icon as={FiCheckCircle} boxSize={3} />
                              <span>Success</span>
                            </HStack>
                          </Badge>
                        ) : (
                          <Tooltip label={log.errorMessage} placement="top">
                            <Badge colorScheme="red" fontSize="xs">
                              <HStack spacing={1}>
                                <Icon as={FiXCircle} boxSize={3} />
                                <span>Error</span>
                              </HStack>
                            </Badge>
                          </Tooltip>
                        )}
                      </Td>
                      <Td isNumeric>
                        <VStack align="end" spacing={0}>
                          <Text fontSize="sm" fontWeight="medium">
                            {log.tokensTotal.toLocaleString()}
                          </Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {log.tokensPrompt}→{log.tokensCompletion}
                          </Text>
                        </VStack>
                      </Td>
                      <Td isNumeric>
                        <HStack justify="flex-end" spacing={1}>
                          <Icon as={FiClock} boxSize={3} color={getLatencyColor(log.durationMs)} />
                          <Text fontSize="sm" fontWeight="medium" color={getLatencyColor(log.durationMs)}>
                            {formatLatency(log.durationMs)}
                          </Text>
                        </HStack>
                      </Td>
                      <Td isNumeric>
                        <HStack justify="flex-end" spacing={1}>
                          <Icon as={FiDollarSign} boxSize={3} color={useSemanticToken('text.tertiary')} />
                          <Text fontSize="sm" fontWeight="medium">
                            {log.costUsd.toFixed(6)}
                          </Text>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </VStack>
  );
}
