import React, { useRef } from 'react';
import { Box, Heading, Text, Spinner, HStack, Badge, Stat, StatLabel, StatNumber, StatHelpText, StatGroup, Flex } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import useSWR from 'swr';
import ChartExportMenu from '../ui/ChartExportMenu';

interface RedisPerformanceChartProps {
  height?: number | string;
}

interface RedisMetricsDataPoint {
  timestamp: string;
  operationsPerSecond: number;
  responseTimeMs: number;
  cacheHitRate: number;
  memoryUsage: number;
}

interface RedisMetricsData {
  current: {
    operationsPerSecond: number;
    responseTimeMs: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  history: RedisMetricsDataPoint[];
}

/**
 * RedisPerformanceChart Component
 * 
 * Displays Redis performance metrics using standardized Recharts area chart
 * with gradient fills and interactive tooltips.
 */
const RedisPerformanceChart: React.FC<RedisPerformanceChartProps> = ({ height = 350 }) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const labelColor = useSemanticToken('text.secondary');
  const gridColor = useSemanticToken('border.subtle');
  const statBgColor = useSemanticToken('surface.base');
  
  // Reference to chart container for export functionality
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch metrics data with SWR
  const { data, error, isLoading } = useSWR<RedisMetricsData>(
    '/api/monitoring/redis-metrics',
    (url) => fetch(url).then(res => res.json()),
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Format data for chart - focus on operations and response time
  const formatChartData = (data: RedisMetricsDataPoint[]) => {
    return data.map(point => ({
      name: new Date(point.timestamp).toLocaleTimeString(),
      ops: point.operationsPerSecond,
      responseTime: point.responseTimeMs,
      hitRate: point.cacheHitRate * 100, // Convert to percentage
      memory: point.memoryUsage,
      // Include full timestamp for tooltip
      fullTime: new Date(point.timestamp).toLocaleString()
    }));
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={useSemanticToken('surface.elevated')}
          p={3}
          borderRadius="md"
          boxShadow="md"
          border="1px solid"
          borderColor={useSemanticToken('border.default')}
        >
          <Text fontWeight="bold" mb={2}>{payload[0].payload.fullTime}</Text>
          {payload.map((entry: any, index: number) => (
            <HStack key={index} spacing={2} mb={1}>
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={entry.color}
              />
              <Text fontSize="sm">
                {entry.name}: {entry.name === 'Hit Rate' ? `${entry.value.toFixed(1)}%` : 
                              entry.name === 'Response Time' ? `${entry.value.toFixed(1)}ms` : 
                              entry.name === 'Memory Usage' ? `${entry.value}%` :
                              entry.value.toLocaleString()}
              </Text>
            </HStack>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
        color="red.500"
      >
        <Text>Error loading Redis metrics</Text>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box
        height={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text>No data available</Text>
      </Box>
    );
  }

  const chartData = formatChartData(data.history);

  // Define columns for data export
  const exportColumns = [
    { key: 'fullTime', header: 'Timestamp' },
    { key: 'ops', header: 'Operations/sec' },
    { key: 'responseTime', header: 'Response Time (ms)' },
    { key: 'hitRate', header: 'Cache Hit Rate (%)' },
    { key: 'memory', header: 'Memory Usage (%)' }
  ];

  return (
    <Box 
      bg={bgColor} 
      borderWidth="1px" 
      borderRadius="lg" 
      borderColor={borderColor}
      p={4}
      height={height}
      ref={chartRef}
    >
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">Redis Performance</Heading>
        <ChartExportMenu
          chartRef={chartRef}
          data={chartData}
          columns={exportColumns}
          filename="redis-performance"
        />
      </Flex>
      
      {/* Current Metrics Stats */}
      <StatGroup mb={4}>
        <Stat bg={statBgColor} p={3} borderRadius="md" size="sm">
          <StatLabel>Operations/sec</StatLabel>
          <StatNumber>{data.current.operationsPerSecond.toLocaleString()}</StatNumber>
          <StatHelpText>Requests handled</StatHelpText>
        </Stat>
        <Stat bg={statBgColor} p={3} borderRadius="md" size="sm">
          <StatLabel>Response Time</StatLabel>
          <StatNumber>{data.current.responseTimeMs} ms</StatNumber>
          <StatHelpText>Average latency</StatHelpText>
        </Stat>
        <Stat bg={statBgColor} p={3} borderRadius="md" size="sm">
          <StatLabel>Cache Hit Rate</StatLabel>
          <StatNumber>{(data.current.cacheHitRate * 100).toFixed(1)}%</StatNumber>
          <StatHelpText>Cache efficiency</StatHelpText>
        </Stat>
        <Stat bg={statBgColor} p={3} borderRadius="md" size="sm">
          <StatLabel>Memory Usage</StatLabel>
          <StatNumber>{data.current.memoryUsage}%</StatNumber>
          <StatHelpText>Total memory</StatHelpText>
        </Stat>
      </StatGroup>
      
      {/* Performance Chart */}
      <Box height="calc(100% - 160px)" width="100%">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38B2AC" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#38B2AC" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorResponseTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F56565" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#F56565" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorHitRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4299E1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#4299E1" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#9F7AEA" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#9F7AEA" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="name" 
              tick={{ fill: labelColor }} 
              tickLine={{ stroke: labelColor }}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: labelColor }} 
              tickLine={{ stroke: labelColor }}
              domain={[0, 'dataMax']}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: labelColor }} 
              tickLine={{ stroke: labelColor }}
              domain={[0, 100]} // For hit rate and memory (percentage based)
            />
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="ops" 
              name="Operations/sec" 
              stroke="#38B2AC" 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1} 
              fill="url(#colorOps)" 
              dot={{ r: 3, strokeWidth: 1, fill: "#38B2AC", stroke: "#38B2AC" }}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#38B2AC" }}
              yAxisId="left"
            />
            <Area 
              type="monotone" 
              dataKey="responseTime" 
              name="Response Time" 
              stroke="#F56565" 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1} 
              fill="url(#colorResponseTime)" 
              dot={{ r: 3, strokeWidth: 1, fill: "#F56565", stroke: "#F56565" }}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#F56565" }}
              yAxisId="left"
            />
            <Area 
              type="monotone" 
              dataKey="hitRate" 
              name="Hit Rate" 
              stroke="#4299E1" 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1} 
              fill="url(#colorHitRate)"
              dot={{ r: 3, strokeWidth: 1, fill: "#4299E1", stroke: "#4299E1" }}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#4299E1" }}
              yAxisId="right"
            />
            <Area 
              type="monotone" 
              dataKey="memory" 
              name="Memory Usage" 
              stroke="#9F7AEA" 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1} 
              fill="url(#colorMemory)"
              dot={{ r: 3, strokeWidth: 1, fill: "#9F7AEA", stroke: "#9F7AEA" }}
              activeDot={{ r: 5, strokeWidth: 0, fill: "#9F7AEA" }}
              yAxisId="right"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default RedisPerformanceChart;
