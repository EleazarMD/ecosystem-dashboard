/**
 * GPU Drill-Down Component
 * Detailed view of GPU processes with AI Gateway and OpenClaw correlation
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
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
  Alert,
  AlertIcon,
  Collapse,
  Button,
} from '@chakra-ui/react';
import {
  RefreshCw,
  Cpu,
  Activity,
  Server,
  Zap,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';
import InferenceTraffic from './InferenceTraffic';

interface ProcessDetail {
  pid: number;
  name: string;
  command: string;
  gpuId: number;
  memoryMB: number;
  memoryPercent: number;
  gpuUtilization: number;
  cpuPercent: number;
  user: string;
  startTime: string;
  runtime: string;
  service?: string;
  model?: string;
  endpoint?: string;
}

interface AIGatewayMetrics {
  activeRequests: number;
  requestsPerSecond: number;
  avgLatency: number;
  models: Array<{
    name: string;
    requests: number;
    avgLatency: number;
  }>;
}

interface OpenClawMetrics {
  running: boolean;
  activeSessions: number;
  currentAgent?: string;
  lastActivity?: string;
}

interface GPUDrillDownProps {
  gpuId: number;
  gpuName: string;
  onClose?: () => void;
  refreshInterval?: number;
}

const formatMemory = (mb: number): string => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

const getServiceColor = (service?: string): string => {
  if (!service) return 'gray';
  if (service.includes('vLLM')) return 'purple';
  if (service.includes('Triton')) return 'blue';
  if (service.includes('OpenClaw')) return 'green';
  if (service.includes('Ollama')) return 'orange';
  if (service.includes('ComfyUI')) return 'pink';
  return 'gray';
};

export const GPUDrillDown: React.FC<GPUDrillDownProps> = ({
  gpuId,
  gpuName,
  onClose,
  refreshInterval = 5000,
}) => {
  const [processes, setProcesses] = useState<ProcessDetail[]>([]);
  const [aiGateway, setAIGateway] = useState<AIGatewayMetrics | null>(null);
  const [openClaw, setOpenClaw] = useState<OpenClawMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPid, setExpandedPid] = useState<number | null>(null);
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`/api/monitoring/process-details?gpu=${gpuId}`);
      const result = await response.json();
      
      if (result.success) {
        setProcesses(result.processes || []);
        setAIGateway(result.aiGateway || null);
        setOpenClaw(result.openClaw || null);
      }
    } catch (e) {
      console.error('Failed to fetch process details:', e);
    } finally {
      setLoading(false);
    }
  }, [gpuId]);
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);
  
  const totalMemory = processes.reduce((sum, p) => sum + p.memoryMB, 0);
  const serviceBreakdown = processes.reduce((acc, p) => {
    const service = p.service || 'Other';
    acc[service] = (acc[service] || 0) + p.memoryMB;
    return acc;
  }, {} as Record<string, number>);
  
  if (loading && processes.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" color="blue.400" />
        <Text mt={2} fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
          Loading process details...
        </Text>
      </Box>
    );
  }
  
  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack>
          <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
            GPU {gpuId}
          </Badge>
          <Text fontWeight="semibold" fontSize="lg">{gpuName}</Text>
        </HStack>
        <HStack>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh"
              icon={<RefreshCw size={16} />}
              size="sm"
              variant="ghost"
              onClick={fetchData}
              isLoading={loading}
            />
          </Tooltip>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </HStack>
      </HStack>
      
      {/* Service Integration Status */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* AI Gateway Status */}
        <GlassPanel variant="light" p={4}>
          <HStack justify="space-between" mb={3}>
            <HStack>
              <Server size={18} color="#4299E1" />
              <Text fontWeight="semibold">AI Gateway</Text>
            </HStack>
            <Badge colorScheme={aiGateway ? 'green' : 'gray'}>
              {aiGateway ? 'Connected' : 'Offline'}
            </Badge>
          </HStack>
          {aiGateway ? (
            <SimpleGrid columns={3} spacing={2}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Active</StatLabel>
                <StatNumber fontSize="lg">{aiGateway.activeRequests}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">RPS</StatLabel>
                <StatNumber fontSize="lg">{aiGateway.requestsPerSecond.toFixed(1)}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Latency</StatLabel>
                <StatNumber fontSize="lg">{aiGateway.avgLatency.toFixed(0)}ms</StatNumber>
              </Stat>
            </SimpleGrid>
          ) : (
            <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
              AI Gateway not reachable
            </Text>
          )}
        </GlassPanel>
        
        {/* OpenClaw Status */}
        <GlassPanel variant="light" p={4}>
          <HStack justify="space-between" mb={3}>
            <HStack>
              <Zap size={18} color="#48BB78" />
              <Text fontWeight="semibold">OpenClaw</Text>
            </HStack>
            <Badge colorScheme={openClaw?.running ? 'green' : 'gray'}>
              {openClaw?.running ? 'Running' : 'Offline'}
            </Badge>
          </HStack>
          {openClaw?.running ? (
            <SimpleGrid columns={2} spacing={2}>
              <Stat size="sm">
                <StatLabel fontSize="xs">Sessions</StatLabel>
                <StatNumber fontSize="lg">{openClaw.activeSessions}</StatNumber>
              </Stat>
              <Stat size="sm">
                <StatLabel fontSize="xs">Agent</StatLabel>
                <StatNumber fontSize="sm">{openClaw.currentAgent || 'Idle'}</StatNumber>
              </Stat>
            </SimpleGrid>
          ) : (
            <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
              OpenClaw gateway not running
            </Text>
          )}
        </GlassPanel>
      </SimpleGrid>
      
      {/* Inference Traffic - What's Driving the GPU */}
      <GlassPanel variant="light" p={4}>
        <InferenceTraffic refreshInterval={5000} />
      </GlassPanel>
      
      {/* Service Memory Breakdown */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="semibold" mb={3}>VRAM by Service</Text>
        <VStack spacing={2} align="stretch">
          {Object.entries(serviceBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([service, memory]) => (
              <Box key={service}>
                <HStack justify="space-between" mb={1}>
                  <HStack>
                    <Badge colorScheme={getServiceColor(service)} size="sm">
                      {service}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatMemory(memory)}
                  </Text>
                </HStack>
                <Progress
                  value={(memory / totalMemory) * 100}
                  colorScheme={getServiceColor(service)}
                  size="sm"
                  borderRadius="full"
                />
              </Box>
            ))}
        </VStack>
      </GlassPanel>
      
      {/* Process Table */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="semibold" mb={3}>
          Running Processes ({processes.length})
        </Text>
        
        {processes.length === 0 ? (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            No GPU processes running
          </Alert>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Process</Th>
                  <Th>Service</Th>
                  <Th isNumeric>VRAM</Th>
                  <Th isNumeric>GPU %</Th>
                  <Th isNumeric>CPU %</Th>
                  <Th>Runtime</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {processes.map((proc) => (
                  <React.Fragment key={proc.pid}>
                    <Tr
                      cursor="pointer"
                      onClick={() => setExpandedPid(expandedPid === proc.pid ? null : proc.pid)}
                      _hover={{ bg: isDark ? 'whiteAlpha.50' : 'gray.50' }}
                    >
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="medium">{proc.name}</Text>
                          <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                            PID: {proc.pid}
                          </Text>
                        </VStack>
                      </Td>
                      <Td>
                        {proc.service ? (
                          <Badge colorScheme={getServiceColor(proc.service)} size="sm">
                            {proc.service}
                          </Badge>
                        ) : (
                          <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                            -
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric>
                        <VStack align="end" spacing={0}>
                          <Text fontWeight="medium">{formatMemory(proc.memoryMB)}</Text>
                          <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                            {proc.memoryPercent.toFixed(1)}%
                          </Text>
                        </VStack>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={proc.gpuUtilization > 80 ? 'red' : proc.gpuUtilization > 50 ? 'yellow' : 'green'}
                        >
                          {proc.gpuUtilization}%
                        </Badge>
                      </Td>
                      <Td isNumeric>{proc.cpuPercent.toFixed(1)}%</Td>
                      <Td>
                        <HStack spacing={1}>
                          <Clock size={12} />
                          <Text fontSize="sm">{proc.runtime}</Text>
                        </HStack>
                      </Td>
                      <Td>
                        {expandedPid === proc.pid ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </Td>
                    </Tr>
                    <Tr>
                      <Td colSpan={7} p={0}>
                        <Collapse in={expandedPid === proc.pid}>
                          <Box
                            p={4}
                            bg={isDark ? 'whiteAlpha.50' : 'gray.50'}
                            borderBottomRadius="md"
                          >
                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                              <Box>
                                <Text fontSize="xs" fontWeight="semibold" mb={1} color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                                  COMMAND
                                </Text>
                                <Text fontSize="sm" fontFamily="mono" wordBreak="break-all">
                                  {proc.command}
                                </Text>
                              </Box>
                              <Box>
                                <SimpleGrid columns={2} spacing={2}>
                                  <Box>
                                    <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                                      USER
                                    </Text>
                                    <HStack>
                                      <User size={12} />
                                      <Text fontSize="sm">{proc.user}</Text>
                                    </HStack>
                                  </Box>
                                  <Box>
                                    <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                                      STARTED
                                    </Text>
                                    <Text fontSize="sm">{proc.startTime || 'Unknown'}</Text>
                                  </Box>
                                  {proc.model && (
                                    <Box>
                                      <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                                        MODEL
                                      </Text>
                                      <Badge colorScheme="purple">{proc.model}</Badge>
                                    </Box>
                                  )}
                                  {proc.endpoint && (
                                    <Box>
                                      <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                                        ENDPOINT
                                      </Text>
                                      <Text fontSize="sm" fontFamily="mono">{proc.endpoint}</Text>
                                    </Box>
                                  )}
                                </SimpleGrid>
                              </Box>
                            </SimpleGrid>
                          </Box>
                        </Collapse>
                      </Td>
                    </Tr>
                  </React.Fragment>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </GlassPanel>
    </VStack>
  );
};

export default GPUDrillDown;
