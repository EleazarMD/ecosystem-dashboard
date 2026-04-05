import React, { useRef } from 'react';
import { Box, Heading, Text, Spinner, HStack, Badge, Flex } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import useSWR from 'swr';
import ChartExportMenu from '../ui/ChartExportMenu';

interface SystemMetricsChartProps {
  height?: number | string;
}

interface MetricsDataPoint {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
}

interface MetricsData {
  current: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  history: MetricsDataPoint[];
}

/**
 * SystemMetricsChart Component
 * 
 * Displays system metrics (CPU, memory, disk) using standardized Recharts area chart
 * with gradient fills and interactive tooltips.
 */
const SystemMetricsChart: React.FC<SystemMetricsChartProps> = ({ height = 300 }) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const labelColor = useSemanticToken('text.secondary');
  const gridColor = useSemanticToken('border.subtle');
  
  // Chart colors
  const cpuColor = '#4299E1';  // blue.400
  const memoryColor = '#48BB78'; // green.400
  const diskColor = '#ECC94B';  // yellow.400
  
  // Reference to chart container for export functionality
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch metrics data with SWR
  const { data, error, isLoading } = useSWR<MetricsData>(
    '/api/monitoring/system-metrics',
    (url) => fetch(url).then(res => res.json()),
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Format data for chart
  const formatChartData = (data: MetricsDataPoint[]) => {
    return data.map(point => ({
      name: new Date(point.timestamp).toLocaleTimeString(),
      cpu: point.cpuUsage,
      memory: point.memoryUsage,
      disk: point.diskUsage,
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
                {entry.name}: {entry.value}%
              </Text>
            </HStack>
          ))}
        </Box>
      );
    }
    return null;
  };

  // Get badge color for current metrics
  const getBadgeColor = (value: number) => {
    if (value >= 90) return 'red';
    if (value >= 70) return 'orange';
    if (value >= 50) return 'yellow';
    return 'green';
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
        <Text>Error loading system metrics</Text>
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
    { key: 'cpu', header: 'CPU Usage (%)' },
    { key: 'memory', header: 'Memory Usage (%)' },
    { key: 'disk', header: 'Disk Usage (%)' }
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
        <Heading size="md">System Resource Usage</Heading>
        <ChartExportMenu
          chartRef={chartRef}
          data={chartData}
          columns={exportColumns}
          filename="system-resource-usage"
        />
      </Flex>
      
      {/* Current Metrics */}
      <HStack spacing={4} mb={4}>
        <Box>
          <Text fontSize="sm" color={labelColor}>CPU:</Text>
          <Badge colorScheme={getBadgeColor(data.current.cpuUsage)} fontSize="md">
            {data.current.cpuUsage}%
          </Badge>
        </Box>
        <Box>
          <Text fontSize="sm" color={labelColor}>Memory:</Text>
          <Badge colorScheme={getBadgeColor(data.current.memoryUsage)} fontSize="md">
            {data.current.memoryUsage}%
          </Badge>
        </Box>
        <Box>
          <Text fontSize="sm" color={labelColor}>Disk:</Text>
          <Badge colorScheme={getBadgeColor(data.current.diskUsage)} fontSize="md">
            {data.current.diskUsage}%
          </Badge>
        </Box>
      </HStack>
      
      {/* Metrics Chart */}
      <Box height="calc(100% - 100px)" width="100%">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#48BB78" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#48BB78" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4299E1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#4299E1" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
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
              unit="%" 
              domain={[0, 100]} 
              tick={{ fill: labelColor }} 
              tickLine={{ stroke: labelColor }}
            />
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="cpu" 
              stroke={cpuColor} 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1}
              fill="url(#cpuGradient)"
              name="CPU Usage"
              dot={{ r: 3, strokeWidth: 1, fill: cpuColor, stroke: cpuColor }}
              activeDot={{ r: 5, strokeWidth: 0, fill: cpuColor }}
            />
            <Area 
              type="monotone" 
              dataKey="memory" 
              stroke={memoryColor} 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1}
              fill="url(#memoryGradient)"
              name="Memory Usage"
              dot={{ r: 3, strokeWidth: 1, fill: memoryColor, stroke: memoryColor }}
              activeDot={{ r: 5, strokeWidth: 0, fill: memoryColor }}
            />
            <Area 
              type="monotone" 
              dataKey="disk" 
              stroke={diskColor} 
              strokeWidth={3}
              strokeOpacity={0.9}
              fillOpacity={1}
              fill="url(#diskGradient)"
              name="Disk Usage"
              dot={{ r: 3, strokeWidth: 1, fill: diskColor, stroke: diskColor }}
              activeDot={{ r: 5, strokeWidth: 0, fill: diskColor }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default SystemMetricsChart;
