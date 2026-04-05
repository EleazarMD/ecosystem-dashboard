/**
 * LLM Service Monitor
 * Real-time monitoring for vLLM services running on RTX Workstation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  IconButton,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorMode
} from '@chakra-ui/react';
import { 
  Brain,
  Activity,
  RefreshCw,
  Clock,
  Gauge,
  MessageSquare,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface VLLMMetrics {
  promptThroughput: number;
  generationThroughput: number;
  runningRequests: number;
  waitingRequests: number;
  kvCacheUsage: number;
  prefixCacheHitRate: number;
}

interface VLLMService {
  name: string;
  containerName: string;
  model: string;
  servedModelName: string;
  port: number;
  gpuId: number;
  status: 'running' | 'stopped' | 'error';
  uptime: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  metrics: VLLMMetrics | null;
  lastActivity: string | null;
}

interface VLLMStatusResponse {
  success: boolean;
  timestamp: string;
  services: VLLMService[];
  error?: string;
}

const getHealthColor = (health: string): string => {
  switch (health) {
    case 'healthy': return 'green';
    case 'unhealthy': return 'red';
    default: return 'gray';
  }
};

const getHealthIcon = (health: string) => {
  switch (health) {
    case 'healthy': return <CheckCircle size={16} />;
    case 'unhealthy': return <XCircle size={16} />;
    default: return <AlertTriangle size={16} />;
  }
};

interface ServiceCardProps {
  service: VLLMService;
  isDark: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isDark }) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  const healthColor = getHealthColor(service.health);
  const isActive = service.metrics && service.metrics.runningRequests > 0;
  
  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      p={5}
      bg={cardBg}
      borderColor={service.health === 'unhealthy' ? 'red.500' : borderColor}
      borderWidth={service.health === 'unhealthy' ? '2px' : '1px'}
    >
      {/* Service Header */}
      <HStack justify="space-between" mb={4}>
        <VStack align="start" spacing={1}>
          <HStack>
            <Brain size={20} />
            <Text fontSize="lg" fontWeight="semibold" color={isDark ? 'white' : 'gray.800'}>
              {service.servedModelName}
            </Text>
          </HStack>
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
            {service.model}
          </Text>
        </VStack>
        <VStack align="end" spacing={1}>
          <HStack>
            {getHealthIcon(service.health)}
            <Badge colorScheme={healthColor}>{service.health}</Badge>
          </HStack>
          <Badge colorScheme="purple" variant="outline">GPU {service.gpuId}</Badge>
        </VStack>
      </HStack>
      
      {/* Status Row */}
      <HStack spacing={4} mb={4}>
        <Badge colorScheme={service.status === 'running' ? 'green' : 'red'}>
          {service.status}
        </Badge>
        <HStack spacing={1}>
          <Clock size={12} />
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
            Up {service.uptime}
          </Text>
        </HStack>
        <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
          Port: {service.port}
        </Text>
      </HStack>
      
      {/* Metrics */}
      {service.metrics ? (
        <>
          <Divider mb={4} />
          <SimpleGrid columns={2} spacing={4} mb={4}>
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Gauge size={12} />
                  <Text>Generation</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={isActive ? 'green.400' : undefined}>
                {service.metrics.generationThroughput.toFixed(1)}
              </StatNumber>
              <StatHelpText>tokens/sec</StatHelpText>
            </Stat>
            
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Activity size={12} />
                  <Text>Prompt</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                {service.metrics.promptThroughput.toFixed(1)}
              </StatNumber>
              <StatHelpText>tokens/sec</StatHelpText>
            </Stat>
          </SimpleGrid>
          
          <SimpleGrid columns={2} spacing={4} mb={4}>
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <MessageSquare size={12} />
                  <Text>Requests</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                {service.metrics.runningRequests}
              </StatNumber>
              <StatHelpText>
                {service.metrics.waitingRequests} waiting
              </StatHelpText>
            </Stat>
            
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Database size={12} />
                  <Text>KV Cache</Text>
                </HStack>
              </StatLabel>
              <StatNumber>
                {service.metrics.kvCacheUsage.toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                {service.metrics.prefixCacheHitRate.toFixed(1)}% hit rate
              </StatHelpText>
            </Stat>
          </SimpleGrid>
          
          {/* KV Cache Progress */}
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs">KV Cache Usage</Text>
              <Text fontSize="xs">{service.metrics.kvCacheUsage.toFixed(1)}%</Text>
            </HStack>
            <Progress 
              value={service.metrics.kvCacheUsage} 
              colorScheme={service.metrics.kvCacheUsage > 80 ? 'orange' : 'blue'}
              size="xs"
              borderRadius="full"
            />
          </Box>
        </>
      ) : (
        <Box py={4} textAlign="center">
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
            No metrics available
          </Text>
        </Box>
      )}
      
      {/* Last Activity */}
      {service.lastActivity && (
        <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'} mt={3}>
          Last activity: {service.lastActivity}
        </Text>
      )}
    </GlassPanel>
  );
};

interface LLMServiceMonitorProps {
  refreshInterval?: number;
}

export const LLMServiceMonitor: React.FC<LLMServiceMonitorProps> = ({
  refreshInterval = 10000
}) => {
  const [data, setData] = useState<VLLMStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/vllm-status');
      const result: VLLMStatusResponse = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch vLLM status');
      }
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || 'Network error');
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
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="blue.400" />
        <Text mt={4} color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
          Loading LLM services...
        </Text>
      </Box>
    );
  }
  
  if (error && !data) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Connection Error</Text>
          <Text fontSize="sm">{error}</Text>
        </Box>
      </Alert>
    );
  }
  
  const totalThroughput = data?.services.reduce((sum, s) => 
    sum + (s.metrics?.generationThroughput || 0), 0) || 0;
  const activeServices = data?.services.filter(s => s.status === 'running').length || 0;
  const healthyServices = data?.services.filter(s => s.health === 'healthy').length || 0;
  
  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack spacing={4}>
          <HStack>
            <Brain size={20} />
            <Text fontWeight="semibold">LLM Services</Text>
          </HStack>
          <Badge colorScheme="green">{activeServices} running</Badge>
          <Badge colorScheme={healthyServices === activeServices ? 'green' : 'yellow'}>
            {healthyServices} healthy
          </Badge>
        </HStack>
        <HStack>
          {lastRefresh && (
            <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              Updated: {lastRefresh.toLocaleTimeString()}
            </Text>
          )}
          <Tooltip label="Refresh now">
            <IconButton
              aria-label="Refresh"
              icon={<RefreshCw size={16} />}
              size="sm"
              variant="ghost"
              onClick={fetchData}
              isLoading={loading}
            />
          </Tooltip>
        </HStack>
      </HStack>
      
      {error && (
        <Alert status="warning" mb={4} borderRadius="lg">
          <AlertIcon />
          <Text fontSize="sm">Connection issue: {error}. Showing last known data.</Text>
        </Alert>
      )}
      
      {/* Service Cards */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {data?.services.map(service => (
          <ServiceCard key={service.containerName} service={service} isDark={isDark} />
        ))}
      </SimpleGrid>
      
      {/* Summary */}
      {data && data.services.length > 0 && (
        <GlassPanel variant="light" p={4} mt={6}>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <Stat size="sm">
              <StatLabel>Total Services</StatLabel>
              <StatNumber>{data.services.length}</StatNumber>
              <StatHelpText>{activeServices} active</StatHelpText>
            </Stat>
            <Stat size="sm">
              <StatLabel>Combined Throughput</StatLabel>
              <StatNumber>{totalThroughput.toFixed(1)}</StatNumber>
              <StatHelpText>tokens/sec</StatHelpText>
            </Stat>
            <Stat size="sm">
              <StatLabel>Active Requests</StatLabel>
              <StatNumber>
                {data.services.reduce((sum, s) => sum + (s.metrics?.runningRequests || 0), 0)}
              </StatNumber>
              <StatHelpText>
                {data.services.reduce((sum, s) => sum + (s.metrics?.waitingRequests || 0), 0)} waiting
              </StatHelpText>
            </Stat>
            <Stat size="sm">
              <StatLabel>Avg KV Cache</StatLabel>
              <StatNumber>
                {(data.services.reduce((sum, s) => sum + (s.metrics?.kvCacheUsage || 0), 0) / 
                  Math.max(data.services.filter(s => s.metrics).length, 1)).toFixed(1)}%
              </StatNumber>
              <StatHelpText>usage</StatHelpText>
            </Stat>
          </SimpleGrid>
        </GlassPanel>
      )}
      
      {(!data || data.services.length === 0) && !loading && (
        <Alert status="info" borderRadius="lg">
          <AlertIcon />
          <Text>No vLLM services found running on RTX Workstation</Text>
        </Alert>
      )}
    </Box>
  );
};

export default LLMServiceMonitor;
