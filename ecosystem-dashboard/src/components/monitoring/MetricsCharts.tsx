/**
 * Metrics Charts Component
 * Time-series charts for GPU/CPU temperature, utilization, power, and VRAM
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Select,
  Badge,
  Spinner,
  useColorMode,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { GlassPanel } from '@/components/ui';

interface MetricPoint {
  timestamp: number;
  gpus: Array<{
    id: number;
    temperature: number;
    utilization: number;
    memoryUsedMB: number;
    powerDraw: number;
    fanSpeed: number;
  }>;
  cpu: {
    temperature: number;
    utilization: number;
    loadAverage: number[];
  };
}

interface ChartData {
  time: string;
  timestamp: number;
  gpu0Temp?: number;
  gpu1Temp?: number;
  gpu0Util?: number;
  gpu1Util?: number;
  gpu0Power?: number;
  gpu1Power?: number;
  gpu0Vram?: number;
  gpu1Vram?: number;
  gpu0Fan?: number;
  gpu1Fan?: number;
  cpuTemp?: number;
  cpuUtil?: number;
  cpuLoad?: number;
}

interface TrendStats {
  current: number;
  min: number;
  max: number;
  avg: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
}

function calculateTrend(data: number[]): TrendStats {
  if (data.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0, trend: 'stable', change: 0 };
  }
  
  const current = data[data.length - 1];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  
  // Calculate trend from last 10% of data
  const recentCount = Math.max(2, Math.floor(data.length * 0.1));
  const recent = data.slice(-recentCount);
  const older = data.slice(-recentCount * 2, -recentCount);
  
  if (older.length === 0) {
    return { current, min, max, avg, trend: 'stable', change: 0 };
  }
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const change = recentAvg - olderAvg;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (change > 2) trend = 'up';
  else if (change < -2) trend = 'down';
  
  return { current, min, max, avg, trend, change };
}

interface MetricsChartsProps {
  refreshInterval?: number;
}

export const MetricsCharts: React.FC<MetricsChartsProps> = ({
  refreshInterval = 30000,
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const [trends, setTrends] = useState<Record<string, TrendStats>>({});
  
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const chartColors = {
    gpu0Temp: '#F56565',
    gpu1Temp: '#FC8181',
    gpu0Util: '#4299E1',
    gpu1Util: '#63B3ED',
    gpu0Power: '#9F7AEA',
    gpu1Power: '#B794F4',
    cpuTemp: '#48BB78',
    cpuUtil: '#68D391',
  };
  
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/monitoring/history?range=${timeRange}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const chartData: ChartData[] = result.data.map((point: MetricPoint) => {
          const date = new Date(point.timestamp);
          return {
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: point.timestamp,
            gpu0Temp: point.gpus[0]?.temperature,
            gpu1Temp: point.gpus[1]?.temperature,
            gpu0Util: point.gpus[0]?.utilization,
            gpu1Util: point.gpus[1]?.utilization,
            gpu0Power: point.gpus[0]?.powerDraw,
            gpu1Power: point.gpus[1]?.powerDraw,
            gpu0Vram: point.gpus[0]?.memoryUsedMB ? point.gpus[0].memoryUsedMB / 1024 : undefined,
            gpu1Vram: point.gpus[1]?.memoryUsedMB ? point.gpus[1].memoryUsedMB / 1024 : undefined,
            gpu0Fan: point.gpus[0]?.fanSpeed,
            gpu1Fan: point.gpus[1]?.fanSpeed,
            cpuTemp: point.cpu?.temperature,
            cpuUtil: point.cpu?.utilization,
            cpuLoad: point.cpu?.loadAverage?.[0],
          };
        });
        
        setData(chartData);
        
        // Calculate trends
        if (chartData.length > 0) {
          setTrends({
            gpu0Temp: calculateTrend(chartData.map(d => d.gpu0Temp).filter(Boolean) as number[]),
            gpu1Temp: calculateTrend(chartData.map(d => d.gpu1Temp).filter(Boolean) as number[]),
            gpu0Util: calculateTrend(chartData.map(d => d.gpu0Util).filter(Boolean) as number[]),
            gpu1Util: calculateTrend(chartData.map(d => d.gpu1Util).filter(Boolean) as number[]),
            cpuTemp: calculateTrend(chartData.map(d => d.cpuTemp).filter(Boolean) as number[]),
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);
  
  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchHistory, refreshInterval]);
  
  const tooltipStyle = {
    backgroundColor: isDark ? '#1A202C' : '#FFFFFF',
    border: `1px solid ${isDark ? '#4A5568' : '#E2E8F0'}`,
    borderRadius: '8px',
    padding: '8px',
  };
  
  if (loading && data.length === 0) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="lg" color="blue.400" />
        <Text mt={2} fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
          Loading historical data...
        </Text>
      </Box>
    );
  }
  
  if (data.length === 0) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Text fontWeight="semibold">No Historical Data Yet</Text>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
            Historical metrics are collected every minute. Check back soon.
          </Text>
        </VStack>
      </GlassPanel>
    );
  }
  
  return (
    <VStack spacing={6} align="stretch">
      {/* Controls */}
      <HStack justify="space-between">
        <Text fontWeight="semibold">Performance Trends</Text>
        <HStack>
          <Text fontSize="sm" color={isDark ? 'whiteAlpha.600' : 'gray.500'}>
            Time Range:
          </Text>
          <Select
            size="sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            w="100px"
          >
            <option value="15m">15 min</option>
            <option value="1h">1 hour</option>
            <option value="6h">6 hours</option>
            <option value="24h">24 hours</option>
          </Select>
          <Badge colorScheme="blue">{data.length} points</Badge>
        </HStack>
      </HStack>
      
      {/* Trend Summary */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
        {trends.gpu0Temp && (
          <Stat size="sm">
            <StatLabel>GPU 0 Temp Trend</StatLabel>
            <StatNumber>{trends.gpu0Temp.current.toFixed(0)}°C</StatNumber>
            <StatHelpText>
              <StatArrow type={trends.gpu0Temp.trend === 'up' ? 'increase' : trends.gpu0Temp.trend === 'down' ? 'decrease' : 'increase'} />
              {Math.abs(trends.gpu0Temp.change).toFixed(1)}°C
              <Text as="span" ml={2} fontSize="xs">
                (avg: {trends.gpu0Temp.avg.toFixed(0)}°C)
              </Text>
            </StatHelpText>
          </Stat>
        )}
        {trends.gpu1Temp && (
          <Stat size="sm">
            <StatLabel>GPU 1 Temp Trend</StatLabel>
            <StatNumber>{trends.gpu1Temp.current.toFixed(0)}°C</StatNumber>
            <StatHelpText>
              <StatArrow type={trends.gpu1Temp.trend === 'up' ? 'increase' : trends.gpu1Temp.trend === 'down' ? 'decrease' : 'increase'} />
              {Math.abs(trends.gpu1Temp.change).toFixed(1)}°C
              <Text as="span" ml={2} fontSize="xs">
                (avg: {trends.gpu1Temp.avg.toFixed(0)}°C)
              </Text>
            </StatHelpText>
          </Stat>
        )}
        {trends.gpu0Util && (
          <Stat size="sm">
            <StatLabel>GPU 0 Util Trend</StatLabel>
            <StatNumber>{trends.gpu0Util.current.toFixed(0)}%</StatNumber>
            <StatHelpText>
              <StatArrow type={trends.gpu0Util.trend === 'up' ? 'increase' : trends.gpu0Util.trend === 'down' ? 'decrease' : 'increase'} />
              {Math.abs(trends.gpu0Util.change).toFixed(1)}%
            </StatHelpText>
          </Stat>
        )}
        {trends.cpuTemp && (
          <Stat size="sm">
            <StatLabel>CPU Temp Trend</StatLabel>
            <StatNumber>{trends.cpuTemp.current.toFixed(0)}°C</StatNumber>
            <StatHelpText>
              <StatArrow type={trends.cpuTemp.trend === 'up' ? 'increase' : trends.cpuTemp.trend === 'down' ? 'decrease' : 'increase'} />
              {Math.abs(trends.cpuTemp.change).toFixed(1)}°C
            </StatHelpText>
          </Stat>
        )}
      </SimpleGrid>
      
      {/* Temperature Chart */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="medium" mb={4}>Temperature (°C)</Text>
        <Box h="200px">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A5568' : '#E2E8F0'} />
              <XAxis 
                dataKey="time" 
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                domain={[30, 100]}
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="gpu0Temp" 
                name="GPU 0" 
                stroke={chartColors.gpu0Temp}
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="gpu1Temp" 
                name="GPU 1" 
                stroke={chartColors.gpu1Temp}
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="cpuTemp" 
                name="CPU" 
                stroke={chartColors.cpuTemp}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </GlassPanel>
      
      {/* Utilization Chart */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="medium" mb={4}>Utilization (%)</Text>
        <Box h="200px">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A5568' : '#E2E8F0'} />
              <XAxis 
                dataKey="time" 
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="gpu0Util" 
                name="GPU 0" 
                stroke={chartColors.gpu0Util}
                fill={chartColors.gpu0Util}
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="gpu1Util" 
                name="GPU 1" 
                stroke={chartColors.gpu1Util}
                fill={chartColors.gpu1Util}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </GlassPanel>
      
      {/* Power Chart */}
      <GlassPanel variant="light" p={4}>
        <Text fontWeight="medium" mb={4}>Power Draw (W)</Text>
        <Box h="200px">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A5568' : '#E2E8F0'} />
              <XAxis 
                dataKey="time" 
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 350]}
                stroke={isDark ? '#A0AEC0' : '#718096'}
                fontSize={12}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="gpu0Power" 
                name="GPU 0" 
                stroke={chartColors.gpu0Power}
                fill={chartColors.gpu0Power}
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="gpu1Power" 
                name="GPU 1" 
                stroke={chartColors.gpu1Power}
                fill={chartColors.gpu1Power}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </GlassPanel>
    </VStack>
  );
};

export default MetricsCharts;
