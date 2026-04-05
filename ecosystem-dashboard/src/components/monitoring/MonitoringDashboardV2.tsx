/**
 * RTX Monitoring Dashboard V2
 * Compact, scannable layout with inline drill-down
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
  CircularProgress,
  CircularProgressLabel,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  IconButton,
  useColorMode,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Collapse,
  Grid,
  GridItem,
  Divider,
} from '@chakra-ui/react';
import { 
  Cpu, 
  Thermometer, 
  Zap, 
  HardDrive, 
  Activity,
  RefreshCw,
  Server,
  Fan,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GPUProcess {
  pid: number;
  name: string;
  memoryMB: number;
}

interface GPUStats {
  id: number;
  name: string;
  temperature: number;
  utilization: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryFreeMB: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  processes: GPUProcess[];
}

interface CPUStats {
  temperature: number;
  loadAverage: number[];
  utilization: number;
  cores: number;
}

interface GPUStatsResponse {
  success: boolean;
  timestamp: string;
  hostname: string;
  driverVersion: string;
  cudaVersion: string;
  gpus: GPUStats[];
  cpu: CPUStats;
  error?: string;
}

interface ClientTraffic {
  clientId: string;
  clientName: string;
  requests: number;
  requestsPerMinute: number;
  tokensIn: number;
  tokensOut: number;
  avgLatency: number;
  provider: string;
  isLocal: boolean;
  // Resource details
  gpuId?: number;
  gpuMemoryMB?: number;
  gpuUtilization?: number;
  processType: 'gpu' | 'cpu' | 'cloud';
  pid?: number;
}

interface ProviderBreakdown {
  local: {
    requests: number;
    tokensIn: number;
    tokensOut: number;
    providers: string[];
  };
  cloud: {
    requests: number;
    tokensIn: number;
    tokensOut: number;
    providers: string[];
  };
}

interface TrafficData {
  summary: {
    totalRequests: number;
    requestsPerMinute: number;
    activeClients: number;
  };
  providerBreakdown?: ProviderBreakdown;
  clients: ClientTraffic[];
}

const formatMemory = (mb: number): string => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${mb}M`;
};

const getClientColor = (name: string): string => {
  if (name.includes('Hermes')) return 'purple';
  if (name.includes('PIC')) return 'blue';
  if (name.includes('OpenClaw')) return 'green';
  if (name.includes('Clinical')) return 'red';
  if (name.includes('Child')) return 'pink';
  return 'gray';
};

interface MonitoringDashboardV2Props {
  refreshInterval?: number;
}

export const MonitoringDashboardV2: React.FC<MonitoringDashboardV2Props> = ({
  refreshInterval = 5000
}) => {
  const [data, setData] = useState<GPUStatsResponse | null>(null);
  const [traffic, setTraffic] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const cardBg = useSemanticToken('surface.elevated');
  
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, trafficRes] = await Promise.all([
        fetch('/api/monitoring/gpu-stats'),
        fetch('/api/monitoring/inference-traffic'),
      ]);
      
      const stats = await statsRes.json();
      const trafficData = await trafficRes.json();
      
      if (stats.success) setData(stats);
      if (trafficData.success) setTraffic(trafficData);
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
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
          Connecting to RTX Workstation...
        </Text>
      </Box>
    );
  }
  
  if (!data) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        <Text>Failed to connect to workstation</Text>
      </Alert>
    );
  }
  
  const totalPower = data.gpus.reduce((sum, g) => sum + g.powerDraw, 0);
  const totalVramUsed = data.gpus.reduce((sum, g) => sum + g.memoryUsedMB, 0);
  const totalVramTotal = data.gpus.reduce((sum, g) => sum + g.memoryTotalMB, 0);
  const maxTemp = Math.max(...data.gpus.map(g => g.temperature));
  
  return (
    <VStack spacing={4} align="stretch">
      {/* Top Bar - System Summary */}
      <HStack 
        justify="space-between" 
        bg={isDark ? 'whiteAlpha.50' : 'gray.50'} 
        p={3} 
        borderRadius="lg"
        flexWrap="wrap"
        gap={2}
      >
        <HStack spacing={4} flexWrap="wrap">
          <HStack>
            <Server size={16} />
            <Text fontWeight="semibold" fontSize="sm">{data.hostname}</Text>
            <Badge colorScheme="green" size="sm">CUDA {data.cudaVersion}</Badge>
          </HStack>
          <Divider orientation="vertical" h="20px" />
          <HStack spacing={3}>
            <Tooltip label="Total Power">
              <HStack spacing={1}>
                <Zap size={14} color="#9F7AEA" />
                <Text fontSize="sm" fontWeight="medium">{totalPower.toFixed(0)}W</Text>
              </HStack>
            </Tooltip>
            <Tooltip label="Total VRAM">
              <HStack spacing={1}>
                <HardDrive size={14} color="#4299E1" />
                <Text fontSize="sm" fontWeight="medium">
                  {formatMemory(totalVramUsed)} / {formatMemory(totalVramTotal)}
                </Text>
              </HStack>
            </Tooltip>
            <Tooltip label="Max Temperature">
              <HStack spacing={1}>
                <Thermometer size={14} color={maxTemp >= 80 ? '#E53E3E' : '#48BB78'} />
                <Text fontSize="sm" fontWeight="medium">{maxTemp}°C</Text>
              </HStack>
            </Tooltip>
            <Tooltip label="CPU">
              <HStack spacing={1}>
                <Cpu size={14} color="#ED8936" />
                <Text fontSize="sm" fontWeight="medium">
                  {data.cpu.temperature}°C / {data.cpu.utilization.toFixed(0)}%
                </Text>
              </HStack>
            </Tooltip>
          </HStack>
        </HStack>
        <HStack>
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
            {lastRefresh?.toLocaleTimeString()}
          </Text>
          <IconButton
            aria-label="Refresh"
            icon={<RefreshCw size={14} />}
            size="xs"
            variant="ghost"
            onClick={fetchData}
          />
        </HStack>
      </HStack>
      
      {/* Main Grid - GPUs + Traffic Side by Side */}
      <Grid templateColumns={{ base: '1fr', xl: '2fr 1fr' }} gap={4}>
        {/* Left: GPU Cards */}
        <GridItem>
          <VStack spacing={3} align="stretch">
            {data.gpus.map(gpu => {
              const memPercent = (gpu.memoryUsedMB / gpu.memoryTotalMB) * 100;
              const powerPercent = (gpu.powerDraw / gpu.powerLimit) * 100;
              const isSelected = selectedGpu === gpu.id;
              const isHot = gpu.temperature >= 80;
              
              return (
                <Box key={gpu.id}>
                  <GlassPanel
                    variant="medium"
                    p={3}
                    borderColor={isSelected ? 'blue.500' : isHot ? 'red.500' : undefined}
                    borderWidth={isSelected || isHot ? '2px' : '1px'}
                    cursor="pointer"
                    onClick={() => setSelectedGpu(isSelected ? null : gpu.id)}
                    _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                    transition="all 0.15s"
                  >
                    <Grid templateColumns="auto 1fr auto" gap={4} alignItems="center">
                      {/* GPU ID + Utilization */}
                      <GridItem>
                        <VStack spacing={1}>
                          <HStack>
                            <Badge colorScheme="purple" fontSize="xs">GPU {gpu.id}</Badge>
                            {isHot && <Badge colorScheme="red" fontSize="xs">HOT</Badge>}
                          </HStack>
                          <CircularProgress 
                            value={gpu.utilization} 
                            color={gpu.utilization > 90 ? 'orange.400' : 'blue.400'}
                            size="50px"
                            thickness="10px"
                          >
                            <CircularProgressLabel fontSize="xs" fontWeight="bold">
                              {gpu.utilization}%
                            </CircularProgressLabel>
                          </CircularProgress>
                        </VStack>
                      </GridItem>
                      
                      {/* Metrics Row */}
                      <GridItem>
                        <SimpleGrid columns={4} spacing={2}>
                          <Stat size="sm">
                            <StatLabel fontSize="xs">
                              <HStack spacing={1}><Thermometer size={10} /><Text>Temp</Text></HStack>
                            </StatLabel>
                            <StatNumber fontSize="md" color={isHot ? 'red.400' : undefined}>
                              {gpu.temperature}°C
                            </StatNumber>
                          </Stat>
                          <Stat size="sm">
                            <StatLabel fontSize="xs">
                              <HStack spacing={1}><Zap size={10} /><Text>Power</Text></HStack>
                            </StatLabel>
                            <StatNumber fontSize="md">
                              {gpu.powerDraw.toFixed(0)}W
                            </StatNumber>
                          </Stat>
                          <Stat size="sm">
                            <StatLabel fontSize="xs">
                              <HStack spacing={1}><Fan size={10} /><Text>Fan</Text></HStack>
                            </StatLabel>
                            <StatNumber fontSize="md">{gpu.fanSpeed}%</StatNumber>
                          </Stat>
                          <Stat size="sm">
                            <StatLabel fontSize="xs">
                              <HStack spacing={1}><HardDrive size={10} /><Text>VRAM</Text></HStack>
                            </StatLabel>
                            <StatNumber fontSize="md">
                              {formatMemory(gpu.memoryUsedMB)}
                            </StatNumber>
                          </Stat>
                        </SimpleGrid>
                        
                        {/* Progress Bars */}
                        <HStack mt={2} spacing={4}>
                          <Box flex={1}>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>VRAM</Text>
                              <Text fontSize="xs">{memPercent.toFixed(0)}%</Text>
                            </HStack>
                            <Progress 
                              value={memPercent} 
                              size="xs" 
                              colorScheme={memPercent > 90 ? 'red' : 'blue'} 
                              borderRadius="full"
                            />
                          </Box>
                          <Box flex={1}>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>Power</Text>
                              <Text fontSize="xs">{powerPercent.toFixed(0)}%</Text>
                            </HStack>
                            <Progress 
                              value={powerPercent} 
                              size="xs" 
                              colorScheme={powerPercent > 95 ? 'red' : 'purple'} 
                              borderRadius="full"
                            />
                          </Box>
                        </HStack>
                      </GridItem>
                      
                      {/* Expand Icon */}
                      <GridItem>
                        {isSelected ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </GridItem>
                    </Grid>
                  </GlassPanel>
                  
                  {/* Expanded Process List */}
                  <Collapse in={isSelected}>
                    <Box 
                      mt={-1} 
                      p={3} 
                      bg={isDark ? 'whiteAlpha.50' : 'gray.50'} 
                      borderRadius="0 0 lg lg"
                      borderWidth="1px"
                      borderTop="none"
                      borderColor={isDark ? 'whiteAlpha.100' : 'gray.200'}
                    >
                      <Text fontSize="xs" fontWeight="semibold" mb={2} color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
                        RUNNING PROCESSES ({gpu.processes.length})
                      </Text>
                      {gpu.processes.length === 0 ? (
                        <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>No active processes</Text>
                      ) : (
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
                          {gpu.processes.map((proc, idx) => (
                            <HStack key={idx} justify="space-between" fontSize="sm">
                              <HStack spacing={2}>
                                <Badge 
                                  colorScheme={
                                    proc.name.includes('VLLM') ? 'purple' :
                                    proc.name.includes('triton') ? 'blue' :
                                    proc.name.includes('python') ? 'green' : 'gray'
                                  }
                                  size="sm"
                                >
                                  {proc.name.includes('VLLM') ? 'vLLM' :
                                   proc.name.includes('triton') ? 'Triton' :
                                   proc.name}
                                </Badge>
                                <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                                  PID {proc.pid}
                                </Text>
                              </HStack>
                              <Text fontWeight="medium">{formatMemory(proc.memoryMB)}</Text>
                            </HStack>
                          ))}
                        </SimpleGrid>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </VStack>
        </GridItem>
        
        {/* Right: Inference Traffic */}
        <GridItem>
          <GlassPanel variant="light" p={3} h="100%">
            <HStack justify="space-between" mb={3}>
              <HStack>
                <Activity size={16} color="#4299E1" />
                <Text fontWeight="semibold" fontSize="sm">Inference Traffic</Text>
              </HStack>
              {traffic && (
                <Badge colorScheme="blue" fontSize="xs">
                  {traffic.summary.requestsPerMinute.toFixed(1)} req/min
                </Badge>
              )}
            </HStack>
            
            {!traffic || traffic.clients.length === 0 ? (
              <VStack py={6} spacing={2}>
                <Activity size={24} color={isDark ? '#4A5568' : '#A0AEC0'} />
                <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                  No active traffic
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {/* Local vs Cloud Breakdown */}
                {traffic.providerBreakdown && (
                  <Box 
                    p={2} 
                    bg={isDark ? 'whiteAlpha.50' : 'gray.50'} 
                    borderRadius="md"
                    mb={1}
                  >
                    <HStack justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Box w={2} h={2} borderRadius="full" bg="green.400" />
                        <Text fontSize="xs" fontWeight="medium">RTX Local</Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="bold" color="green.400">
                        {traffic.providerBreakdown.local.requests} req
                      </Text>
                    </HStack>
                    <Progress 
                      value={traffic.providerBreakdown.local.requests / 
                        (traffic.providerBreakdown.local.requests + traffic.providerBreakdown.cloud.requests || 1) * 100}
                      size="xs"
                      colorScheme="green"
                      borderRadius="full"
                      mb={2}
                    />
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Box w={2} h={2} borderRadius="full" bg="blue.400" />
                        <Text fontSize="xs" fontWeight="medium">Cloud</Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="bold" color="blue.400">
                        {traffic.providerBreakdown.cloud.requests} req
                      </Text>
                    </HStack>
                    <Progress 
                      value={traffic.providerBreakdown.cloud.requests / 
                        (traffic.providerBreakdown.local.requests + traffic.providerBreakdown.cloud.requests || 1) * 100}
                      size="xs"
                      colorScheme="blue"
                      borderRadius="full"
                    />
                    {traffic.providerBreakdown.local.providers.length > 0 && (
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'} mt={1}>
                        Local: {traffic.providerBreakdown.local.providers.join(', ')}
                      </Text>
                    )}
                    {traffic.providerBreakdown.cloud.providers.length > 0 && (
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                        Cloud: {traffic.providerBreakdown.cloud.providers.join(', ')}
                      </Text>
                    )}
                  </Box>
                )}
                
                {/* Client Traffic - showing GPU/CPU details */}
                {traffic.clients.slice(0, 8).map((client) => {
                  const gpuLabel = client.gpuId !== undefined ? `GPU ${client.gpuId}` : 
                                   client.processType === 'cloud' ? 'Cloud' : 'CPU';
                  const memLabel = client.gpuMemoryMB ? formatMemory(client.gpuMemoryMB) : '';
                  
                  return (
                    <Box 
                      key={client.clientId}
                      p={2}
                      bg={isDark ? 'whiteAlpha.50' : 'gray.50'}
                      borderRadius="md"
                      borderLeft="3px solid"
                      borderLeftColor={
                        client.gpuId === 0 ? 'orange.400' :
                        client.gpuId === 1 ? 'cyan.400' :
                        client.processType === 'cloud' ? 'blue.400' : 'gray.400'
                      }
                    >
                      <HStack justify="space-between" mb={1}>
                        <HStack spacing={2}>
                          <Badge 
                            colorScheme={
                              client.gpuId === 0 ? 'orange' :
                              client.gpuId === 1 ? 'cyan' :
                              client.processType === 'cloud' ? 'blue' : 'gray'
                            } 
                            fontSize="xs"
                            variant="solid"
                          >
                            {gpuLabel}
                          </Badge>
                          <Text fontSize="sm" fontWeight="medium">
                            {client.clientName}
                          </Text>
                        </HStack>
                        {memLabel && (
                          <Badge colorScheme="purple" variant="outline" fontSize="xs">
                            {memLabel}
                          </Badge>
                        )}
                      </HStack>
                      <HStack justify="space-between" fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                        <HStack spacing={2}>
                          <Text>{client.provider}</Text>
                          {client.pid && <Text>PID {client.pid}</Text>}
                        </HStack>
                        <Text>{client.avgLatency?.toFixed(0) || 0}ms</Text>
                      </HStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </GlassPanel>
        </GridItem>
      </Grid>
    </VStack>
  );
};

export default MonitoringDashboardV2;
