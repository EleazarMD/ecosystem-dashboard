/**
 * RTX Workstation Monitor
 * Comprehensive system monitoring with all vital statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  SimpleGrid,
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
  Divider,
  Icon,
  Grid,
  GridItem,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { 
  Cpu, 
  Thermometer, 
  Zap, 
  Fan, 
  HardDrive, 
  MemoryStick, 
  Activity,
  Server,
  Gauge,
  Clock,
  TrendingUp,
  AlertTriangle,
  Container,
  Database,
  TriangleAlert,
} from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';

// Types
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

interface MemoryInfo {
  totalMB: number;
  usedMB: number;
  freeMB: number;
  availableMB: number;
  swapTotalMB: number;
  swapUsedMB: number;
  swapFreeMB: number;
  usagePercent: number;
  swapUsagePercent: number;
}

interface SystemMetrics {
  current: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    memory?: MemoryInfo;
  };
}

interface ProcessInfo {
  pid: number;
  ppid: number;
  user: string;
  cpuPercent: number;
  memPercent: number;
  memRSS: number;
  stat: string;
  elapsed: string;
  command: string;
  isOrphan: boolean;
  isZombie: boolean;
  isRunaway: boolean;
}

interface ContainerInfo {
  name: string;
  status: string;
  health: 'healthy' | 'unhealthy' | 'starting' | 'none';
  uptime: string;
  image: string;
  isUp: boolean;
}

interface WorkstationData {
  gpus: GPUStats[];
  cpu?: CPUStats;
  hostname: string;
  driverVersion: string;
  cudaVersion: string;
  system?: SystemMetrics;
}

// Gauge component for circular metrics
const MetricGauge: React.FC<{
  value: number;
  max?: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
  warning?: number;
  critical?: number;
}> = ({ value, max = 100, label, unit = '%', color, size = 80, warning = 70, critical = 90 }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const actualColor = percentage >= critical ? 'red' : percentage >= warning ? 'yellow' : color;
  
  return (
    <VStack spacing={1}>
      <CircularProgress 
        value={percentage} 
        size={`${size}px`} 
        color={`${actualColor}.400`}
        trackColor="whiteAlpha.200"
        thickness="8px"
      >
        <CircularProgressLabel fontSize="sm" fontWeight="bold">
          {Math.round(value)}{unit}
        </CircularProgressLabel>
      </CircularProgress>
      <Text fontSize="xs" color="whiteAlpha.700">{label}</Text>
    </VStack>
  );
};

// Mini bar chart for historical data
const MiniChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ 
  data, 
  color, 
  height = 30 
}) => {
  const max = Math.max(...data, 1);
  const width = 100;
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
            opacity={0.6 + (i / data.length) * 0.4}
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

const formatPower = (watts: number): string => `${Math.round(watts)}W`;

const WorkstationMonitor: React.FC = () => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const [data, setData] = useState<WorkstationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpuHistory, setGpuHistory] = useState<{ [key: number]: number[] }>({});
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [processStats, setProcessStats] = useState({ zombieCount: 0, orphanCount: 0, runawayCount: 0, loadAverage: [0,0,0] });
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [containerStats, setContainerStats] = useState({ totalUp: 0, totalDown: 0, totalUnhealthy: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [gpuRes, systemRes] = await Promise.all([
        fetch('/api/monitoring/gpu-stats'),
        fetch('/api/monitoring/system-metrics'),
      ]);

      const gpuData = await gpuRes.json();
      const systemData = await systemRes.json();

      if (gpuData.success) {
        setData({
          gpus: gpuData.gpus || [],
          cpu: gpuData.cpu,
          hostname: gpuData.hostname,
          driverVersion: gpuData.driverVersion,
          cudaVersion: gpuData.cudaVersion,
          system: systemData,
        });

        setGpuHistory(prev => {
          const newHistory = { ...prev };
          gpuData.gpus.forEach((gpu: GPUStats) => {
            const history = prev[gpu.id] || [];
            newHistory[gpu.id] = [...history.slice(-19), gpu.utilization];
          });
          return newHistory;
        });

        if (gpuData.cpu) {
          setCpuHistory(prev => [...prev.slice(-19), gpuData.cpu.utilization]);
        }
      }
      setError(null);
    } catch (e) {
      setError('Failed to fetch workstation data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/top-processes');
      const data = await res.json();
      if (data.success) {
        setProcesses(data.processes || []);
        setProcessStats({
          zombieCount: data.zombieCount,
          orphanCount: data.orphanCount,
          runawayCount: data.runawayCount,
          loadAverage: data.loadAverage,
        });
      }
    } catch (e) {}
  }, []);

  const fetchDocker = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/docker-status');
      const data = await res.json();
      if (data.success) {
        setContainers(data.containers || []);
        setContainerStats({
          totalUp: data.totalUp,
          totalDown: data.totalDown,
          totalUnhealthy: data.totalUnhealthy,
        });
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  useEffect(() => {
    fetchDocker();
    const interval = setInterval(fetchDocker, 10000);
    return () => clearInterval(interval);
  }, [fetchDocker]);

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading workstation metrics...</Text>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error || 'No data available'}
      </Alert>
    );
  }

  const { gpus, cpu, hostname, driverVersion, cudaVersion, system } = data;
  const totalGpuPower = gpus.reduce((sum, g) => sum + g.powerDraw, 0);
  const totalGpuMemory = gpus.reduce((sum, g) => sum + g.memoryUsedMB, 0);
  const totalGpuMemoryMax = gpus.reduce((sum, g) => sum + g.memoryTotalMB, 0);

  return (
    <VStack spacing={4} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <HStack spacing={3}>
          <Icon as={Server} boxSize={5} color="blue.400" />
          <VStack align="start" spacing={0}>
            <Text fontSize="lg" fontWeight="bold">{hostname}</Text>
            <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
              Driver {driverVersion} • CUDA {cudaVersion}
            </Text>
          </VStack>
        </HStack>
        <Badge colorScheme="green" variant="subtle" px={2} py={1}>
          <HStack spacing={1}>
            <Box w={2} h={2} borderRadius="full" bg="green.400" />
            <Text>Live</Text>
          </HStack>
        </Badge>
      </HStack>

      {/* System Overview Cards */}
      <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} spacing={3}>
        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={Zap} boxSize={3} color="yellow.400" /><Text>Total Power</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="yellow.400">{formatPower(totalGpuPower)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>GPU Power Draw</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={MemoryStick} boxSize={3} color="purple.400" /><Text>GPU Memory</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="purple.400">{formatMemory(totalGpuMemory)}</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>of {formatMemory(totalGpuMemoryMax)}</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={Cpu} boxSize={3} color="cyan.400" /><Text>CPU</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="cyan.400">{cpu?.utilization?.toFixed(0) || 0}%</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>{cpu?.cores || 0} cores</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={Thermometer} boxSize={3} color="orange.400" /><Text>CPU Temp</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color={cpu?.temperature && cpu.temperature > 80 ? 'red.400' : 'orange.400'}>
              {cpu?.temperature?.toFixed(0) || 0}°C
            </StatNumber>
            <StatHelpText fontSize="xs" mb={0}>Package</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={MemoryStick} boxSize={3} color="blue.400" /><Text>System RAM</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="blue.400">
              {system?.current?.memory
                ? `${(system.current.memory.usedMB / 1024).toFixed(0)}G`
                : `${system?.current?.memoryUsage?.toFixed(0) || 0}%`}
            </StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              of {system?.current?.memory ? `${(system.current.memory.totalMB / 1024).toFixed(0)}G` : 'N/A'}
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3} borderWidth={system?.current?.memory && system.current.memory.swapUsagePercent > 80 ? '1px' : '0'} borderColor="red.500">
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}>
                <Icon as={Database} boxSize={3} color={system?.current?.memory && system.current.memory.swapUsagePercent > 80 ? 'red.400' : 'orange.400'} />
                <Text>Swap</Text>
                {system?.current?.memory && system.current.memory.swapUsagePercent > 80 && (
                  <Badge colorScheme="red" fontSize="2xs" variant="solid">!</Badge>
                )}
              </HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color={system?.current?.memory && system.current.memory.swapUsagePercent > 80 ? 'red.400' : 'orange.400'}>
              {system?.current?.memory ? `${system.current.memory.swapUsagePercent.toFixed(0)}%` : 'N/A'}
            </StatNumber>
            <StatHelpText fontSize="xs" mb={0}>
              {system?.current?.memory
                ? `${(system.current.memory.swapUsedMB / 1024).toFixed(1)}G / ${(system.current.memory.swapTotalMB / 1024).toFixed(0)}G`
                : 'Used'}
            </StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs">
              <HStack spacing={1}><Icon as={HardDrive} boxSize={3} color="green.400" /><Text>Disk</Text></HStack>
            </StatLabel>
            <StatNumber fontSize="xl" color="green.400">{system?.current?.diskUsage?.toFixed(0) || 0}%</StatNumber>
            <StatHelpText fontSize="xs" mb={0}>Used</StatHelpText>
          </Stat>
        </GlassPanel>
      </SimpleGrid>

      {/* GPU Cards */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
        {gpus.map((gpu) => {
          const isHot = gpu.temperature >= 80;
          const memoryPercent = (gpu.memoryUsedMB / gpu.memoryTotalMB) * 100;
          const powerPercent = (gpu.powerDraw / gpu.powerLimit) * 100;
          const history = gpuHistory[gpu.id] || [];
          
          return (
            <GlassPanel key={gpu.id} p={4}>
              {/* GPU Header */}
              <HStack justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Badge 
                    colorScheme={gpu.id === 0 ? 'orange' : 'cyan'} 
                    variant="solid"
                    fontSize="sm"
                    px={2}
                  >
                    GPU {gpu.id}
                  </Badge>
                  <Text fontWeight="semibold" fontSize="sm">{gpu.name}</Text>
                </HStack>
                <Badge colorScheme={isHot ? 'red' : 'green'} variant="subtle" fontSize="sm">
                  {gpu.temperature}°C
                </Badge>
              </HStack>

              {/* Gauges Row */}
              <HStack justify="space-around" mb={4}>
                <MetricGauge 
                  value={gpu.utilization} 
                  label="Utilization" 
                  color="green"
                  warning={80}
                  critical={95}
                />
                <MetricGauge 
                  value={gpu.temperature} 
                  max={100}
                  label="Temperature" 
                  unit="°C"
                  color="orange"
                  warning={75}
                  critical={85}
                />
                <MetricGauge 
                  value={memoryPercent} 
                  label="VRAM" 
                  color="purple"
                  warning={85}
                  critical={95}
                />
                <MetricGauge 
                  value={powerPercent} 
                  label="Power" 
                  color="yellow"
                  warning={90}
                  critical={100}
                />
                <MetricGauge 
                  value={gpu.fanSpeed} 
                  label="Fan" 
                  color="cyan"
                  warning={80}
                  critical={95}
                />
              </HStack>

              {/* Detailed Stats */}
              <SimpleGrid columns={4} spacing={3} mb={3}>
                <VStack spacing={0} align="start">
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Power</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatPower(gpu.powerDraw)} / {formatPower(gpu.powerLimit)}
                  </Text>
                </VStack>
                <VStack spacing={0} align="start">
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>VRAM Used</Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {formatMemory(gpu.memoryUsedMB)} / {formatMemory(gpu.memoryTotalMB)}
                  </Text>
                </VStack>
                <VStack spacing={0} align="start">
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>VRAM Free</Text>
                  <Text fontSize="sm" fontWeight="medium">{formatMemory(gpu.memoryFreeMB)}</Text>
                </VStack>
                <VStack spacing={0} align="start">
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Fan Speed</Text>
                  <Text fontSize="sm" fontWeight="medium">{gpu.fanSpeed}%</Text>
                </VStack>
              </SimpleGrid>

              {/* Utilization History */}
              {history.length > 0 && (
                <Box mb={3}>
                  <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'} mb={1}>
                    Utilization History (last 40s)
                  </Text>
                  <MiniChart 
                    data={history} 
                    color={gpu.id === 0 ? '#ED8936' : '#38B2AC'} 
                    height={40}
                  />
                </Box>
              )}

              {/* Processes */}
              {gpu.processes.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color={isDark ? 'whiteAlpha.600' : 'gray.500'} mb={2}>
                    PROCESSES ({gpu.processes.length})
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {gpu.processes.slice(0, 5).map((proc) => (
                      <HStack key={proc.pid} justify="space-between" fontSize="xs">
                        <HStack spacing={2}>
                          <Badge colorScheme="gray" variant="outline" fontSize="2xs">
                            {proc.pid}
                          </Badge>
                          <Text fontWeight="medium" isTruncated maxW="150px">
                            {proc.name}
                          </Text>
                        </HStack>
                        <Badge colorScheme="purple" variant="subtle">
                          {formatMemory(proc.memoryMB)}
                        </Badge>
                      </HStack>
                    ))}
                    {gpu.processes.length > 5 && (
                      <Text fontSize="xs" color={isDark ? 'whiteAlpha.400' : 'gray.400'}>
                        +{gpu.processes.length - 5} more processes
                      </Text>
                    )}
                  </VStack>
                </Box>
              )}
            </GlassPanel>
          );
        })}
      </SimpleGrid>

      {/* CPU Section */}
      {cpu && (
        <GlassPanel p={4}>
          <HStack justify="space-between" mb={3}>
            <HStack spacing={2}>
              <Icon as={Cpu} boxSize={5} color="cyan.400" />
              <Text fontWeight="semibold">CPU ({cpu.cores} cores)</Text>
            </HStack>
            <Badge colorScheme={cpu.temperature > 80 ? 'red' : 'green'} variant="subtle">
              {cpu.temperature.toFixed(0)}°C
            </Badge>
          </HStack>

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <VStack spacing={1}>
              <MetricGauge 
                value={cpu.utilization} 
                label="Utilization" 
                color="cyan"
                size={70}
              />
            </VStack>
            <VStack spacing={1}>
              <MetricGauge 
                value={cpu.temperature} 
                max={100}
                label="Temperature" 
                unit="°C"
                color="orange"
                size={70}
                warning={75}
                critical={85}
              />
            </VStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Load Average</Text>
              <Text fontSize="lg" fontWeight="bold">
                {cpu.loadAverage[0]?.toFixed(2)} / {cpu.loadAverage[1]?.toFixed(2)} / {cpu.loadAverage[2]?.toFixed(2)}
              </Text>
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.400' : 'gray.400'}>1m / 5m / 15m</Text>
            </VStack>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>CPU History</Text>
              {cpuHistory.length > 0 && (
                <MiniChart data={cpuHistory} color="#38B2AC" height={50} />
              )}
            </VStack>
          </SimpleGrid>
        </GlassPanel>
      )}

      {/* System Resources */}
      {system?.current && (
        <GlassPanel p={4}>
          <HStack spacing={2} mb={3}>
            <Icon as={HardDrive} boxSize={5} color="green.400" />
            <Text fontWeight="semibold">System Resources</Text>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">System RAM</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {system.current.memory
                    ? `${(system.current.memory.usedMB / 1024).toFixed(1)}G / ${(system.current.memory.totalMB / 1024).toFixed(0)}G`
                    : `${system.current.memoryUsage.toFixed(1)}%`}
                </Text>
              </HStack>
              <Progress
                value={system.current.memoryUsage}
                colorScheme={system.current.memoryUsage > 90 ? 'red' : system.current.memoryUsage > 75 ? 'yellow' : 'blue'}
                size="sm" borderRadius="full"
              />
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.400' : 'gray.400'} mt={1}>
                {system.current.memoryUsage.toFixed(1)}% used
              </Text>
            </Box>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">Swap</Text>
                <Text fontSize="sm" fontWeight="medium"
                  color={system.current.memory && system.current.memory.swapUsagePercent > 80 ? 'red.400' : 'inherit'}>
                  {system.current.memory
                    ? `${(system.current.memory.swapUsedMB / 1024).toFixed(1)}G / ${(system.current.memory.swapTotalMB / 1024).toFixed(0)}G`
                    : 'N/A'}
                </Text>
              </HStack>
              <Progress
                value={system.current.memory?.swapUsagePercent || 0}
                colorScheme={system.current.memory && system.current.memory.swapUsagePercent > 90 ? 'red' : system.current.memory && system.current.memory.swapUsagePercent > 60 ? 'yellow' : 'orange'}
                size="sm" borderRadius="full"
              />
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.400' : 'gray.400'} mt={1}>
                {system.current.memory?.swapUsagePercent?.toFixed(1) || 0}% used
                {system.current.memory && system.current.memory.swapUsagePercent > 80 && (
                  <Badge ml={1} colorScheme="red" fontSize="2xs">⚠ High</Badge>
                )}
              </Text>
            </Box>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">Disk</Text>
                <Text fontSize="sm" fontWeight="medium">{system.current.diskUsage.toFixed(1)}%</Text>
              </HStack>
              <Progress
                value={system.current.diskUsage}
                colorScheme={system.current.diskUsage > 90 ? 'red' : system.current.diskUsage > 70 ? 'yellow' : 'green'}
                size="sm" borderRadius="full"
              />
            </Box>
            <Box>
              <HStack justify="space-between" mb={1}>
                <Text fontSize="sm">CPU Load</Text>
                <Text fontSize="sm" fontWeight="medium">{system.current.cpuUsage.toFixed(1)}%</Text>
              </HStack>
              <Progress
                value={system.current.cpuUsage}
                colorScheme={system.current.cpuUsage > 90 ? 'red' : system.current.cpuUsage > 70 ? 'yellow' : 'cyan'}
                size="sm" borderRadius="full"
              />
            </Box>
          </SimpleGrid>
        </GlassPanel>
      )}

      {/* Process Monitor */}
      <GlassPanel p={4}>
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={Activity} boxSize={5} color="red.400" />
            <Text fontWeight="semibold">Top Processes</Text>
          </HStack>
          <HStack spacing={2}>
            {processStats.runawayCount > 0 && (
              <Badge colorScheme="red" variant="solid" fontSize="xs">
                ⚠ {processStats.runawayCount} Runaway
              </Badge>
            )}
            {processStats.orphanCount > 0 && (
              <Badge colorScheme="orange" variant="subtle" fontSize="xs">
                {processStats.orphanCount} Orphan
              </Badge>
            )}
            {processStats.zombieCount > 0 && (
              <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                {processStats.zombieCount} Zombie
              </Badge>
            )}
            <Text fontSize="xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>
              Load: {processStats.loadAverage.map(l => l.toFixed(2)).join(' / ')}
            </Text>
          </HStack>
        </HStack>

        {processes.length > 0 ? (
          <Box overflowX="auto">
            <Table size="xs" variant="simple">
              <Thead>
                <Tr>
                  <Th fontSize="2xs" px={2}>PID</Th>
                  <Th fontSize="2xs" px={2}>User</Th>
                  <Th fontSize="2xs" px={2} isNumeric>CPU%</Th>
                  <Th fontSize="2xs" px={2} isNumeric>MEM</Th>
                  <Th fontSize="2xs" px={2}>Elapsed</Th>
                  <Th fontSize="2xs" px={2}>Command</Th>
                  <Th fontSize="2xs" px={2}>Flags</Th>
                </Tr>
              </Thead>
              <Tbody>
                {processes.slice(0, 15).map(proc => (
                  <Tr key={proc.pid}
                    bg={proc.isRunaway ? (isDark ? 'red.900' : 'red.50') :
                        proc.isOrphan ? (isDark ? 'orange.900' : 'orange.50') :
                        proc.isZombie ? (isDark ? 'purple.900' : 'purple.50') : 'transparent'}>
                    <Td fontSize="xs" px={2} fontFamily="mono">{proc.pid}</Td>
                    <Td fontSize="xs" px={2}>{proc.user}</Td>
                    <Td fontSize="xs" px={2} isNumeric fontWeight={proc.cpuPercent > 100 ? 'bold' : 'normal'}
                      color={proc.cpuPercent > 150 ? 'red.400' : proc.cpuPercent > 80 ? 'yellow.400' : 'inherit'}>
                      {proc.cpuPercent.toFixed(1)}
                    </Td>
                    <Td fontSize="xs" px={2} isNumeric>{proc.memRSS}M</Td>
                    <Td fontSize="xs" px={2} fontFamily="mono">{proc.elapsed}</Td>
                    <Td fontSize="xs" px={2} maxW="200px">
                      <Tooltip label={proc.command} placement="top">
                        <Text isTruncated maxW="200px">{proc.command}</Text>
                      </Tooltip>
                    </Td>
                    <Td fontSize="xs" px={2}>
                      <HStack spacing={1}>
                        {proc.isRunaway && <Badge colorScheme="red" fontSize="2xs">RUNAWAY</Badge>}
                        {proc.isOrphan && <Badge colorScheme="orange" fontSize="2xs">ORPHAN</Badge>}
                        {proc.isZombie && <Badge colorScheme="purple" fontSize="2xs">ZOMBIE</Badge>}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Loading processes...</Text>
        )}
      </GlassPanel>

      {/* Docker Containers */}
      <GlassPanel p={4}>
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={Server} boxSize={5} color="blue.400" />
            <Text fontWeight="semibold">Docker Containers</Text>
          </HStack>
          <HStack spacing={2}>
            <Badge colorScheme="green" variant="subtle" fontSize="xs">
              {containerStats.totalUp} Up
            </Badge>
            {containerStats.totalDown > 0 && (
              <Badge colorScheme="red" variant="subtle" fontSize="xs">
                {containerStats.totalDown} Down
              </Badge>
            )}
            {containerStats.totalUnhealthy > 0 && (
              <Badge colorScheme="orange" variant="solid" fontSize="xs">
                ⚠ {containerStats.totalUnhealthy} Unhealthy
              </Badge>
            )}
          </HStack>
        </HStack>

        {containers.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={2}>
            {containers.map(c => (
              <HStack key={c.name} justify="space-between" px={3} py={2}
                borderRadius="md"
                bg={!c.isUp ? (isDark ? 'red.900' : 'red.50') :
                    c.health === 'unhealthy' ? (isDark ? 'orange.900' : 'orange.50') :
                    isDark ? 'whiteAlpha.50' : 'gray.50'}>
                <VStack align="start" spacing={0} overflow="hidden">
                  <Text fontSize="xs" fontWeight="semibold" isTruncated maxW="150px">{c.name}</Text>
                  <Text fontSize="2xs" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>{c.uptime}</Text>
                </VStack>
                <Badge
                  fontSize="2xs"
                  colorScheme={
                    !c.isUp ? 'red' :
                    c.health === 'unhealthy' ? 'orange' :
                    c.health === 'healthy' ? 'green' :
                    c.health === 'starting' ? 'yellow' : 'gray'
                  }
                  variant={c.health !== 'none' ? 'solid' : 'subtle'}>
                  {!c.isUp ? 'DOWN' :
                   c.health === 'unhealthy' ? 'UNHEALTHY' :
                   c.health === 'healthy' ? 'HEALTHY' :
                   c.health === 'starting' ? 'STARTING' : 'UP'}
                </Badge>
              </HStack>
            ))}
          </SimpleGrid>
        ) : (
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>Loading containers...</Text>
        )}
      </GlassPanel>
    </VStack>
  );
};

export default WorkstationMonitor;
