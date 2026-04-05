/**
 * RTX Workstation Monitoring Dashboard
 * Real-time GPU monitoring for NVIDIA RTX PRO 6000 Blackwell GPUs
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
  CircularProgress,
  CircularProgressLabel,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  IconButton,
  Divider,
  useColorMode
} from '@chakra-ui/react';
import { 
  Cpu, 
  Thermometer, 
  Zap, 
  HardDrive, 
  Activity,
  RefreshCw,
  Server,
  Fan
} from 'lucide-react';
import { GlassPanel } from '@/components/ui';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import GPUDrillDown from './GPUDrillDown';

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
  cpu?: CPUStats;
  error?: string;
}

const getTemperatureColor = (temp: number): string => {
  if (temp < 50) return 'green';
  if (temp < 70) return 'yellow';
  if (temp < 80) return 'orange';
  return 'red';
};

const getUtilizationColor = (util: number): string => {
  if (util < 30) return 'green';
  if (util < 70) return 'blue';
  if (util < 90) return 'yellow';
  return 'orange';
};

const formatMemory = (mb: number): string => {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

interface GPUCardProps {
  gpu: GPUStats;
  isDark: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

const GPUCard: React.FC<GPUCardProps> = ({ gpu, isDark, onClick, isSelected }) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const memoryPercent = (gpu.memoryUsedMB / gpu.memoryTotalMB) * 100;
  const powerPercent = (gpu.powerDraw / gpu.powerLimit) * 100;
  
  const tempColor = getTemperatureColor(gpu.temperature);
  const utilColor = getUtilizationColor(gpu.utilization);
  
  // Determine if GPU is in a warning state
  const isOverheating = gpu.temperature >= 80;
  const isHighUtilNoWork = gpu.utilization > 95; // Could indicate stuck process
  
  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      p={5}
      bg={cardBg}
      borderColor={isSelected ? 'blue.500' : isOverheating ? 'red.500' : borderColor}
      borderWidth={isSelected ? '2px' : isOverheating ? '2px' : '1px'}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      _hover={onClick ? { transform: 'translateY(-2px)', shadow: 'lg' } : {}}
      transition="all 0.2s"
    >
      {/* GPU Header */}
      <HStack justify="space-between" mb={4}>
        <VStack align="start" spacing={0}>
          <HStack>
            <Badge colorScheme="purple" fontSize="sm">GPU {gpu.id}</Badge>
            {isOverheating && (
              <Badge colorScheme="red" variant="solid">HOT</Badge>
            )}
          </HStack>
          <Text fontSize="md" fontWeight="semibold" color={isDark ? 'white' : 'gray.800'}>
            {gpu.name.replace('NVIDIA ', '').replace(' Max-Q Workstation Edition', '')}
          </Text>
        </VStack>
        <CircularProgress 
          value={gpu.utilization} 
          color={`${utilColor}.400`}
          size="60px"
          thickness="8px"
        >
          <CircularProgressLabel fontSize="sm" fontWeight="bold">
            {gpu.utilization}%
          </CircularProgressLabel>
        </CircularProgress>
      </HStack>
      
      {/* Temperature & Power Row */}
      <SimpleGrid columns={3} spacing={4} mb={4}>
        <Stat size="sm">
          <StatLabel>
            <HStack spacing={1}>
              <Thermometer size={14} />
              <Text>Temp</Text>
            </HStack>
          </StatLabel>
          <StatNumber color={`${tempColor}.400`}>{gpu.temperature}°C</StatNumber>
          <StatHelpText>
            {gpu.temperature < 50 ? 'Cool' : gpu.temperature < 70 ? 'Normal' : gpu.temperature < 80 ? 'Warm' : 'Hot!'}
          </StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>
            <HStack spacing={1}>
              <Zap size={14} />
              <Text>Power</Text>
            </HStack>
          </StatLabel>
          <StatNumber>{Math.round(gpu.powerDraw)}W</StatNumber>
          <StatHelpText>/ {Math.round(gpu.powerLimit)}W</StatHelpText>
        </Stat>
        
        <Stat size="sm">
          <StatLabel>
            <HStack spacing={1}>
              <Fan size={14} />
              <Text>Fan</Text>
            </HStack>
          </StatLabel>
          <StatNumber>{gpu.fanSpeed}%</StatNumber>
          <StatHelpText>Speed</StatHelpText>
        </Stat>
      </SimpleGrid>
      
      {/* Memory Usage */}
      <Box mb={4}>
        <HStack justify="space-between" mb={1}>
          <HStack spacing={1}>
            <HardDrive size={14} />
            <Text fontSize="sm" fontWeight="medium">VRAM</Text>
          </HStack>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
            {formatMemory(gpu.memoryUsedMB)} / {formatMemory(gpu.memoryTotalMB)}
          </Text>
        </HStack>
        <Progress 
          value={memoryPercent} 
          colorScheme={memoryPercent > 90 ? 'orange' : 'blue'}
          size="sm"
          borderRadius="full"
        />
        <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'} mt={1}>
          {formatMemory(gpu.memoryFreeMB)} available
        </Text>
      </Box>
      
      {/* Power Usage Bar */}
      <Box mb={4}>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="sm" fontWeight="medium">Power Draw</Text>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.700' : 'gray.600'}>
            {powerPercent.toFixed(0)}%
          </Text>
        </HStack>
        <Progress 
          value={powerPercent} 
          colorScheme={powerPercent > 95 ? 'red' : powerPercent > 80 ? 'yellow' : 'green'}
          size="sm"
          borderRadius="full"
        />
      </Box>
      
      {/* Running Processes */}
      {gpu.processes.length > 0 && (
        <Box>
          <Divider mb={3} />
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            Running Processes ({gpu.processes.length})
          </Text>
          <VStack align="stretch" spacing={1}>
            {gpu.processes.slice(0, 5).map((proc, idx) => (
              <HStack key={idx} justify="space-between" fontSize="xs">
                <Text 
                  color={isDark ? 'whiteAlpha.800' : 'gray.700'}
                  isTruncated
                  maxW="180px"
                >
                  {proc.name}
                </Text>
                <Badge size="sm" colorScheme="blue">
                  {formatMemory(proc.memoryMB)}
                </Badge>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </GlassPanel>
  );
};

interface RTXMonitoringDashboardProps {
  refreshInterval?: number;
}

export const RTXMonitoringDashboard: React.FC<RTXMonitoringDashboardProps> = ({
  refreshInterval = 5000
}) => {
  const [data, setData] = useState<GPUStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedGpuId, setSelectedGpuId] = useState<number | null>(null);
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const cardBg = useSemanticToken('surface.elevated');
  
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/gpu-stats');
      const result: GPUStatsResponse = await response.json();
      
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch GPU stats');
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
          Connecting to RTX Workstation...
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
  
  // Calculate totals for summary header
  const totalPower = data?.gpus.reduce((sum, g) => sum + g.powerDraw, 0) || 0;
  const totalPowerLimit = data?.gpus.reduce((sum, g) => sum + g.powerLimit, 0) || 0;
  const totalVramUsed = data?.gpus.reduce((sum, g) => sum + g.memoryUsedMB, 0) || 0;
  const totalVramTotal = data?.gpus.reduce((sum, g) => sum + g.memoryTotalMB, 0) || 0;
  const maxTemp = data?.gpus.length ? Math.max(...data.gpus.map(g => g.temperature)) : 0;
  const avgUtil = data?.gpus.length ? Math.round(data.gpus.reduce((sum, g) => sum + g.utilization, 0) / data.gpus.length) : 0;
  
  return (
    <Box>
      {/* System Header Card */}
      <GlassPanel variant="medium" elevation={2} p={4} mb={6} bg={cardBg}>
        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <HStack spacing={4}>
            <HStack>
              <Server size={24} color={isDark ? '#63B3ED' : '#3182CE'} />
              <Text fontWeight="bold" fontSize="lg">{data?.hostname || 'RTX-Workstation'}</Text>
            </HStack>
            <Badge colorScheme="green" fontSize="sm">Driver {data?.driverVersion}</Badge>
            <Badge colorScheme="blue" fontSize="sm">CUDA {data?.cudaVersion}</Badge>
          </HStack>
          
          {/* Quick Stats */}
          <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
            <HStack spacing={2}>
              <Zap size={18} color={totalPower > totalPowerLimit * 0.9 ? '#F56565' : '#48BB78'} />
              <Text fontWeight="semibold">{Math.round(totalPower)}W</Text>
              <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>/ {totalPowerLimit}W</Text>
            </HStack>
            <HStack spacing={2}>
              <HardDrive size={18} color="#63B3ED" />
              <Text fontWeight="semibold">{formatMemory(totalVramUsed)}</Text>
              <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>/ {formatMemory(totalVramTotal)}</Text>
            </HStack>
            <HStack spacing={2}>
              <Thermometer size={18} color={maxTemp >= 80 ? '#F56565' : maxTemp >= 70 ? '#ECC94B' : '#48BB78'} />
              <Text fontWeight="semibold">{maxTemp}°C</Text>
              <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>max</Text>
            </HStack>
            <HStack spacing={2}>
              <Activity size={18} color="#805AD5" />
              <Text fontWeight="semibold">{avgUtil}%</Text>
              <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>avg</Text>
            </HStack>
          </HStack>
          
          <HStack>
            {lastRefresh && (
              <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
                {lastRefresh.toLocaleTimeString()}
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
      </GlassPanel>
      
      {error && (
        <Alert status="warning" mb={4} borderRadius="lg">
          <AlertIcon />
          <Text fontSize="sm">Connection issue: {error}. Showing last known data.</Text>
        </Alert>
      )}
      
      {/* CPU Stats Card */}
      {data?.cpu && (
        <GlassPanel
          variant="medium"
          elevation={2}
          p={5}
          mb={6}
          bg={cardBg}
        >
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={0}>
              <Badge colorScheme="blue" fontSize="sm">CPU</Badge>
              <Text fontSize="md" fontWeight="semibold" color={isDark ? 'white' : 'gray.800'}>
                AMD Ryzen Threadripper ({data.cpu.cores} cores)
              </Text>
            </VStack>
            <CircularProgress 
              value={data.cpu.utilization} 
              color={data.cpu.utilization > 80 ? 'orange.400' : 'blue.400'}
              size="60px"
              thickness="8px"
            >
              <CircularProgressLabel fontSize="sm" fontWeight="bold">
                {data.cpu.utilization}%
              </CircularProgressLabel>
            </CircularProgress>
          </HStack>
          
          <SimpleGrid columns={4} spacing={4}>
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Thermometer size={14} />
                  <Text>Temp</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={data.cpu.temperature > 80 ? 'red.400' : data.cpu.temperature > 60 ? 'yellow.400' : 'green.400'}>
                {data.cpu.temperature}°C
              </StatNumber>
              <StatHelpText>
                {data.cpu.temperature < 50 ? 'Cool' : data.cpu.temperature < 70 ? 'Normal' : 'Warm'}
              </StatHelpText>
            </Stat>
            
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Activity size={14} />
                  <Text>Load (1m)</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{data.cpu.loadAverage[0]?.toFixed(2)}</StatNumber>
              <StatHelpText>/ {data.cpu.cores} cores</StatHelpText>
            </Stat>
            
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Activity size={14} />
                  <Text>Load (5m)</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{data.cpu.loadAverage[1]?.toFixed(2)}</StatNumber>
              <StatHelpText>avg</StatHelpText>
            </Stat>
            
            <Stat size="sm">
              <StatLabel>
                <HStack spacing={1}>
                  <Activity size={14} />
                  <Text>Load (15m)</Text>
                </HStack>
              </StatLabel>
              <StatNumber>{data.cpu.loadAverage[2]?.toFixed(2)}</StatNumber>
              <StatHelpText>avg</StatHelpText>
            </Stat>
          </SimpleGrid>
        </GlassPanel>
      )}
      
      {/* GPU Cards */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {data?.gpus.map(gpu => (
          <GPUCard 
            key={gpu.id} 
            gpu={gpu} 
            isDark={isDark}
            onClick={() => setSelectedGpuId(selectedGpuId === gpu.id ? null : gpu.id)}
            isSelected={selectedGpuId === gpu.id}
          />
        ))}
      </SimpleGrid>
      
      {/* GPU Drill-Down */}
      {selectedGpuId !== null && data?.gpus.find(g => g.id === selectedGpuId) && (
        <Box mt={6}>
          <GPUDrillDown
            gpuId={selectedGpuId}
            gpuName={data.gpus.find(g => g.id === selectedGpuId)?.name.replace('NVIDIA ', '').replace(' Max-Q Workstation Edition', '') || `GPU ${selectedGpuId}`}
            onClose={() => setSelectedGpuId(null)}
            refreshInterval={5000}
          />
        </Box>
      )}
      
      {/* Process Summary */}
      {data && data.gpus.length > 0 && (
        <GlassPanel variant="light" p={4} mt={6}>
          <HStack justify="space-between" mb={2}>
            <Text fontWeight="semibold" fontSize="sm">Active GPU Processes</Text>
            <Badge colorScheme="purple">
              {data.gpus.reduce((sum, g) => sum + g.processes.length, 0)} total
            </Badge>
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            {data.gpus.map(gpu => (
              <Box key={gpu.id}>
                <Text fontSize="xs" color={isDark ? 'whiteAlpha.600' : 'gray.500'} mb={1}>
                  GPU {gpu.id}
                </Text>
                {gpu.processes.length === 0 ? (
                  <Text fontSize="sm" color={isDark ? 'whiteAlpha.500' : 'gray.400'}>No active processes</Text>
                ) : (
                  <VStack align="stretch" spacing={1}>
                    {gpu.processes.filter(p => p.memoryMB > 500).map((proc, idx) => (
                      <HStack key={idx} justify="space-between" fontSize="sm">
                        <Text isTruncated maxW="200px">{proc.name}</Text>
                        <Badge colorScheme="blue" size="sm">{formatMemory(proc.memoryMB)}</Badge>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </GlassPanel>
      )}
    </Box>
  );
};

export default RTXMonitoringDashboard;
