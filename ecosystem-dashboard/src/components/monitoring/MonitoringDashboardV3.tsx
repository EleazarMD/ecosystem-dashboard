/**
 * RTX Monitoring Dashboard V3
 * Unified GPU + Service Activity view with trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  useColorMode,
  Button,
  ButtonGroup,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  SimpleGrid,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { Activity, Cpu, Cloud, DollarSign, Clock, TrendingUp, Zap, Server } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';

// Types
interface GPUProcess {
  pid: number;
  name: string;
  memoryMB: number;
}

interface GPUStats {
  index: number;
  name: string;
  temperature: number;
  utilization: number;
  memoryUsed: number;
  memoryTotal: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
  processes: GPUProcess[];
}

interface ServiceActivity {
  serviceId: string;
  serviceName: string;
  provider: string;
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorCount: number;
  lastRequest: string;
  trend: number[];
  isLocal: boolean;
  gpuId?: number;
}

interface DashboardData {
  gpus: GPUStats[];
  services: ServiceActivity[];
  overview: {
    totalRequests: number;
    localRequests: number;
    cloudRequests: number;
    totalCost: number;
    avgLatency: number;
  };
}

// Sparkline component for trends
const Sparkline: React.FC<{ data: number[]; color?: string; height?: number }> = ({ 
  data, 
  color = '#48BB78', 
  height = 24 
}) => {
  const max = Math.max(...data, 1);
  const width = 60;
  const barWidth = width / data.length - 1;
  
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {data.map((value, i) => {
        const barHeight = (value / max) * height;
        return (
          <rect
            key={i}
            x={i * (barWidth + 1)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={color}
            opacity={0.7 + (i / data.length) * 0.3}
          />
        );
      })}
    </svg>
  );
};

// Format helpers
const formatMemory = (mb: number): string => {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}G`;
  return `${Math.round(mb)}M`;
};

const formatNumber = (n: number): string => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const MonitoringDashboardV3: React.FC = () => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedService, setSelectedService] = useState<ServiceActivity | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchData = useCallback(async () => {
    try {
      const [gpuRes, servicesRes] = await Promise.all([
        fetch('/api/monitoring/gpu-stats'),
        fetch(`/api/monitoring/service-activity?timeRange=${timeRange}`),
      ]);

      const gpuData = await gpuRes.json();
      const servicesData = await servicesRes.json();

      setData({
        gpus: gpuData.gpus || [],
        services: servicesData.services || [],
        overview: servicesData.overview || {
          totalRequests: 0,
          localRequests: 0,
          cloudRequests: 0,
          totalCost: 0,
          avgLatency: 0,
        },
      });
      setError(null);
    } catch (e) {
      setError('Failed to fetch monitoring data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleServiceClick = (service: ServiceActivity) => {
    setSelectedService(service);
    onOpen();
  };

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading monitoring data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const { gpus, services, overview } = data;

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Header with time range selector */}
      <HStack justify="space-between" mb={2}>
        <HStack spacing={3}>
          <Icon as={Activity} boxSize={5} color="blue.400" />
          <Text fontSize="lg" fontWeight="bold">AI Inference Monitor</Text>
        </HStack>
        <ButtonGroup size="sm" isAttached variant="outline">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              onClick={() => setTimeRange(range)}
              colorScheme={timeRange === range ? 'blue' : 'gray'}
              variant={timeRange === range ? 'solid' : 'outline'}
            >
              {range}
            </Button>
          ))}
        </ButtonGroup>
      </HStack>

      {/* Overview Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              <HStack spacing={1}><Icon as={Activity} boxSize={3} /><Text>Total Requests</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl">{formatNumber(overview.totalRequests)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              {timeRange} period
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              <HStack spacing={1}><Icon as={Cpu} boxSize={3} color="green.400" /><Text>Local (RTX)</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="green.400">{formatNumber(overview.localRequests)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              {overview.totalRequests > 0 ? ((overview.localRequests / overview.totalRequests) * 100).toFixed(0) : 0}% of total
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              <HStack spacing={1}><Icon as={Cloud} boxSize={3} color="blue.400" /><Text>Cloud</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="blue.400">{formatNumber(overview.cloudRequests)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              {overview.totalRequests > 0 ? ((overview.cloudRequests / overview.totalRequests) * 100).toFixed(0) : 0}% of total
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              <HStack spacing={1}><Icon as={DollarSign} boxSize={3} color="yellow.400" /><Text>Cost</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl">${overview.totalCost.toFixed(2)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              {timeRange} spend
            </StatHelpText>
          </Stat>
        </GlassPanel>
      </SimpleGrid>

      {/* GPU Status Cards */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3}>
        {gpus.map((gpu) => {
          const isHot = gpu.temperature >= 80;
          const gpuProcesses = gpu.processes.filter(p => 
            !p.name.includes('Xorg') && p.memoryMB > 100
          );
          
          return (
            <GlassPanel key={gpu.index} p={3}>
              <HStack justify="space-between" mb={2}>
                <HStack spacing={2}>
                  <Badge 
                    colorScheme={gpu.index === 0 ? 'orange' : 'cyan'} 
                    variant="solid"
                    fontSize="xs"
                  >
                    GPU {gpu.index}
                  </Badge>
                  <Text fontSize="sm" fontWeight="medium">{gpu.name}</Text>
                </HStack>
                <HStack spacing={3}>
                  <Tooltip label="Temperature">
                    <Badge colorScheme={isHot ? 'red' : 'green'} variant="subtle">
                      {gpu.temperature}°C
                    </Badge>
                  </Tooltip>
                  <Tooltip label="Power">
                    <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                      {Math.round(gpu.powerDraw)}W
                    </Text>
                  </Tooltip>
                </HStack>
              </HStack>

              {/* GPU Utilization Bar */}
              <Box mb={2}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                    Utilization
                  </Text>
                  <Text fontSize="xs" fontWeight="medium">{gpu.utilization}%</Text>
                </HStack>
                <Progress 
                  value={gpu.utilization} 
                  size="sm" 
                  colorScheme={gpu.utilization > 90 ? 'red' : gpu.utilization > 70 ? 'yellow' : 'green'}
                  borderRadius="full"
                />
              </Box>

              {/* Memory Bar */}
              <Box mb={3}>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                    VRAM
                  </Text>
                  <Text fontSize="xs" fontWeight="medium">
                    {formatMemory(gpu.memoryUsed)} / {formatMemory(gpu.memoryTotal)}
                  </Text>
                </HStack>
                <Progress 
                  value={(gpu.memoryUsed / gpu.memoryTotal) * 100} 
                  size="sm" 
                  colorScheme="purple"
                  borderRadius="full"
                />
              </Box>

              {/* Processes on this GPU */}
              {gpuProcesses.length > 0 && (
                <VStack spacing={1} align="stretch">
                  <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                    PROCESSES
                  </Text>
                  {gpuProcesses.slice(0, 4).map((proc) => (
                    <HStack key={proc.pid} justify="space-between" fontSize="xs">
                      <HStack spacing={2}>
                        <Text fontWeight="medium">
                          {proc.name.includes('vllm') || proc.name.includes('VLLM') ? 'vLLM' :
                           proc.name.includes('triton') ? 'Triton' :
                           proc.name.includes('python') ? 'Python' : proc.name}
                        </Text>
                        <Text color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
                          PID {proc.pid}
                        </Text>
                      </HStack>
                      <Badge colorScheme="purple" variant="outline" fontSize="xs">
                        {formatMemory(proc.memoryMB)}
                      </Badge>
                    </HStack>
                  ))}
                </VStack>
              )}
            </GlassPanel>
          );
        })}
      </SimpleGrid>

      {/* Service Activity Table */}
      <GlassPanel p={3}>
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={Server} boxSize={4} color="blue.400" />
            <Text fontWeight="semibold">Service Activity</Text>
          </HStack>
          <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
            Click row for details
          </Text>
        </HStack>

        {services.length === 0 ? (
          <Box py={8} textAlign="center">
            <Text color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
              No service activity in the selected period
            </Text>
          </Box>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th px={2}>Service</Th>
                  <Th px={2}>Provider</Th>
                  <Th px={2} isNumeric>Requests</Th>
                  <Th px={2} isNumeric>Tokens</Th>
                  <Th px={2} isNumeric>Latency</Th>
                  <Th px={2} isNumeric>Cost</Th>
                  <Th px={2}>Trend</Th>
                </Tr>
              </Thead>
              <Tbody>
                {services.map((service) => (
                  <Tr 
                    key={`${service.serviceId}-${service.provider}`}
                    onClick={() => handleServiceClick(service)}
                    cursor="pointer"
                    _hover={{ bg: isDark ? 'whiteAlpha.100' : 'gray.50' }}
                  >
                    <Td px={2}>
                      <HStack spacing={2}>
                        <Box 
                          w={2} 
                          h={2} 
                          borderRadius="full" 
                          bg={service.isLocal ? 'green.400' : 'blue.400'} 
                        />
                        <Text fontWeight="medium" fontSize="sm">
                          {service.serviceName}
                        </Text>
                      </HStack>
                    </Td>
                    <Td px={2}>
                      <Badge 
                        colorScheme={service.isLocal ? 'green' : 'blue'} 
                        variant="subtle"
                        fontSize="xs"
                      >
                        {service.provider}
                      </Badge>
                    </Td>
                    <Td px={2} isNumeric fontWeight="medium">
                      {formatNumber(service.requestCount)}
                    </Td>
                    <Td px={2} isNumeric fontSize="sm">
                      {formatNumber(service.totalTokens)}
                    </Td>
                    <Td px={2} isNumeric fontSize="sm">
                      {service.avgLatency}ms
                    </Td>
                    <Td px={2} isNumeric fontSize="sm">
                      ${service.totalCost.toFixed(2)}
                    </Td>
                    <Td px={2}>
                      <Sparkline 
                        data={service.trend} 
                        color={service.isLocal ? '#48BB78' : '#4299E1'} 
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </GlassPanel>

      {/* Service Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={isDark ? 'gray.800' : 'white'}>
          <ModalHeader>
            <HStack spacing={2}>
              <Box 
                w={3} 
                h={3} 
                borderRadius="full" 
                bg={selectedService?.isLocal ? 'green.400' : 'blue.400'} 
              />
              <Text>{selectedService?.serviceName}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedService && (
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={2} spacing={4}>
                  <Stat size="sm">
                    <StatLabel>Provider</StatLabel>
                    <StatNumber fontSize="lg">
                      <Badge colorScheme={selectedService.isLocal ? 'green' : 'blue'}>
                        {selectedService.provider}
                      </Badge>
                    </StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Total Requests</StatLabel>
                    <StatNumber fontSize="lg">{formatNumber(selectedService.requestCount)}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Total Tokens</StatLabel>
                    <StatNumber fontSize="lg">{formatNumber(selectedService.totalTokens)}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Avg Latency</StatLabel>
                    <StatNumber fontSize="lg">{selectedService.avgLatency}ms</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Total Cost</StatLabel>
                    <StatNumber fontSize="lg">${selectedService.totalCost.toFixed(2)}</StatNumber>
                  </Stat>
                  <Stat size="sm">
                    <StatLabel>Errors</StatLabel>
                    <StatNumber fontSize="lg" color={selectedService.errorCount > 0 ? 'red.400' : 'green.400'}>
                      {selectedService.errorCount}
                    </StatNumber>
                  </Stat>
                </SimpleGrid>

                <Box>
                  <Text fontWeight="semibold" mb={2}>Activity Trend ({timeRange})</Text>
                  <Box 
                    p={4} 
                    bg={isDark ? 'whiteAlpha.100' : 'gray.50'} 
                    borderRadius="md"
                    height="80px"
                  >
                    <Sparkline 
                      data={selectedService.trend} 
                      color={selectedService.isLocal ? '#48BB78' : '#4299E1'}
                      height={60}
                    />
                  </Box>
                </Box>

                {selectedService.lastRequest && (
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                    Last request: {new Date(selectedService.lastRequest).toLocaleString()}
                  </Text>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default MonitoringDashboardV3;
