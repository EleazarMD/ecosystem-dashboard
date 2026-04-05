/**
 * AI Gateway Metrics Tab Component
 * Displays gateway performance metrics and usage statistics with interactive charts
 * 
 * @module components/ai-gateway
 * @version 2.0.0
 * @since 1.0.0
 */
import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  SimpleGrid,
  Heading,
  HStack,
  Select,
  Button,
  Badge,
  ButtonGroup,
  useToken,
  Spinner,
  Icon,
  Flex,
  Tooltip as ChakraTooltip
} from '@chakra-ui/react';
import { FiDownload, FiRefreshCw, FiBarChart2 } from 'react-icons/fi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { GlassPanel } from '../ui/GlassPanel';
import { AIMetrics, AIGatewayStatus } from '@/types/aiGateway';
import { AIGatewayMetricsTabProps } from './types';

// Mock data for metrics charts
// In a real implementation, this would come from the API
const mockMetrics: AIMetrics = {
  requestsPerMinute: [
    { timestamp: '2023-06-01T10:00:00', value: 12 },
    { timestamp: '2023-06-01T10:05:00', value: 18 },
    { timestamp: '2023-06-01T10:10:00', value: 25 },
    { timestamp: '2023-06-01T10:15:00', value: 22 },
    { timestamp: '2023-06-01T10:20:00', value: 30 },
    { timestamp: '2023-06-01T10:25:00', value: 28 },
  ],
  responseTimeMs: [
    { timestamp: '2023-06-01T10:00:00', value: 350 },
    { timestamp: '2023-06-01T10:05:00', value: 320 },
    { timestamp: '2023-06-01T10:10:00', value: 380 },
    { timestamp: '2023-06-01T10:15:00', value: 400 },
    { timestamp: '2023-06-01T10:20:00', value: 420 },
    { timestamp: '2023-06-01T10:25:00', value: 370 },
  ],
  tokenUsage: [
    { timestamp: '2023-06-01T10:00:00', prompt: 2500, completion: 1200 },
    { timestamp: '2023-06-01T10:05:00', prompt: 3000, completion: 1500 },
    { timestamp: '2023-06-01T10:10:00', prompt: 3500, completion: 1800 },
    { timestamp: '2023-06-01T10:15:00', prompt: 3200, completion: 1600 },
    { timestamp: '2023-06-01T10:20:00', prompt: 4000, completion: 2000 },
    { timestamp: '2023-06-01T10:25:00', prompt: 3800, completion: 1900 },
  ],
  errorRate: [
    { timestamp: '2023-06-01T10:00:00', value: 0.5 },
    { timestamp: '2023-06-01T10:05:00', value: 0.7 },
    { timestamp: '2023-06-01T10:10:00', value: 0.3 },
    { timestamp: '2023-06-01T10:15:00', value: 0.2 },
    { timestamp: '2023-06-01T10:20:00', value: 0.4 },
    { timestamp: '2023-06-01T10:25:00', value: 0.3 },
  ],
  modelUsage: [
    { model: 'gpt-3.5-turbo', requests: 1250, tokens: 450000 },
    { model: 'gpt-4', requests: 320, tokens: 180000 },
    { model: 'claude-instant', requests: 580, tokens: 210000 },
    { model: 'llama2', requests: 420, tokens: 175000 },
  ]
};

// Using the AIGatewayMetricsTabProps type imported from './types'

export const AIGatewayMetricsTab: React.FC<AIGatewayMetricsTabProps> = ({
  status,
  loading = false,
  metrics = mockMetrics,
  onRefreshMetrics = () => {}
}) => {
  const isDark = false;
  const [timeRange, setTimeRange] = useState<string>('24h');
  
  // Get theme colors for charts
  const [blue400, blue200, green400, green200, red400, purple400, gray300, gray600] = 
    useToken('colors', ['blue.400', 'blue.200', 'green.400', 'green.200', 'red.400', 'purple.400', 'gray.300', 'gray.600']);
  
  // Format date for x-axis
  const formatXAxisDate = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };
  
  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box 
          bg={isDark ? 'gray.800' : 'white'} 
          p={2} 
          borderRadius="md"
          boxShadow="md"
          border="1px solid"
          borderColor={isDark ? 'gray.700' : 'gray.200'}
          maxW="250px"
        >
          <Text fontWeight="bold" mb={1}>
            {label ? format(new Date(label), 'MMM d, yyyy HH:mm') : ''}
          </Text>
          {payload.map((entry: any, index: number) => (
            <HStack key={`tooltip-${index}`} spacing={2}>
              <Box w="12px" h="12px" borderRadius="sm" bg={entry.color} />
              <Text fontSize="sm">
                {entry.name}: {typeof entry.value === 'number' 
                  ? entry.name.toLowerCase().includes('rate') || entry.name.toLowerCase().includes('percentage')
                    ? `${(entry.value * 100).toFixed(2)}%`
                    : entry.value.toLocaleString() 
                  : entry.value}
              </Text>
            </HStack>
          ))}
        </Box>
      );
    }
    return null;
  };
  
  // Request Volume Chart
  const RequestVolumeChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={metrics.requestsPerMinute} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxisDate} 
          stroke={isDark ? gray300 : gray600}
          fontSize={11}
        />
        <YAxis stroke={isDark ? gray300 : gray600} fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name="Requests" 
          stroke={blue400} 
          activeDot={{ r: 8 }} 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  
  // Response Time Chart
  const ResponseTimeChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={metrics.responseTimeMs} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxisDate}
          stroke={isDark ? gray300 : gray600}
          fontSize={11}
        />
        <YAxis stroke={isDark ? gray300 : gray600} fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name="Response Time (ms)" 
          stroke={purple400} 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  
  // Token Usage Chart
  const TokenUsageChart = () => (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={metrics.tokenUsage} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxisDate}
          stroke={isDark ? gray300 : gray600}
          fontSize={11}
        />
        <YAxis stroke={isDark ? gray300 : gray600} fontSize={11} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="prompt" 
          name="Prompt Tokens" 
          stackId="1"
          stroke={green400} 
          fill={green200} 
          opacity={0.8}
        />
        <Area 
          type="monotone" 
          dataKey="completion" 
          name="Completion Tokens" 
          stackId="1"
          stroke={blue400} 
          fill={blue200} 
          opacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
  
  // Error Rate Chart
  const ErrorRateChart = () => (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={metrics.errorRate} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
        <XAxis 
          dataKey="timestamp" 
          tickFormatter={formatXAxisDate}
          stroke={isDark ? gray300 : gray600}
          fontSize={11}
        />
        <YAxis 
          tickFormatter={(value) => `${(value * 100).toFixed(1)}%`} 
          stroke={isDark ? gray300 : gray600}
          fontSize={11}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="value" 
          name="Error Rate" 
          stroke={red400} 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
  
  // Model Usage Chart
  const ModelUsageChart = () => {
    const COLORS = [blue400, green400, purple400, red400];
    
    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={metrics.modelUsage} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
          <XAxis dataKey="model" stroke={isDark ? gray300 : gray600} fontSize={11} />
          <YAxis stroke={isDark ? gray300 : gray600} fontSize={11} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="requests" name="Requests" fill={blue400} />
          <Bar dataKey="tokens" name="Tokens" fill={green400} />
        </BarChart>
      </ResponsiveContainer>
    );
  };
  
  return (
    <Box w="full">
      <Flex justify="space-between" align="center" mb={4}>
        <HStack spacing={4}>
          <Heading size="sm">Performance Metrics</Heading>
          <Select 
            size="sm" 
            w="auto" 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </Select>
        </HStack>
        
        <HStack spacing={2}>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FiRefreshCw} />} 
            onClick={onRefreshMetrics}
            isLoading={loading}
          >
            Refresh
          </Button>
          <Button 
            size="sm" 
            leftIcon={<Icon as={FiDownload} />}
            variant="outline"
          >
            Export
          </Button>
        </HStack>
      </Flex>
      
      {loading ? (
        <Box display="flex" justifyContent="center" w="full" py={8}>
          <VStack spacing={3}>
            <Spinner size="xl" color="blue.400" thickness="3px" />
            <Text color={isDark ? "gray.400" : "gray.600"}>
              Loading metrics...
            </Text>
          </VStack>
        </Box>
      ) : (
        <Box>
          {/* Traffic Overview */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
            <GlassPanel variant="light" elevation={1} p={4}>
              <VStack align="start" spacing={3} w="full">
                <Heading size="xs">Request Volume</Heading>
                <RequestVolumeChart />
              </VStack>
            </GlassPanel>
            
            <GlassPanel variant="light" elevation={1} p={4}>
              <VStack align="start" spacing={3} w="full">
                <Heading size="xs">Response Time</Heading>
                <ResponseTimeChart />
              </VStack>
            </GlassPanel>
          </SimpleGrid>
          
          {/* Token Usage */}
          <GlassPanel variant="light" elevation={1} p={4} mb={6}>
            <VStack align="start" spacing={3} w="full">
              <Heading size="xs">Token Usage</Heading>
              <TokenUsageChart />
            </VStack>
          </GlassPanel>
          
          {/* Model-Specific Metrics */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={6}>
            <GlassPanel variant="light" elevation={1} p={4}>
              <VStack align="start" spacing={3} w="full">
                <Heading size="xs">Model Usage Distribution</Heading>
                <ModelUsageChart />
              </VStack>
            </GlassPanel>
            
            <GlassPanel variant="light" elevation={1} p={4}>
              <VStack align="start" spacing={3} w="full">
                <Heading size="xs">Error Rate</Heading>
                <ErrorRateChart />
              </VStack>
            </GlassPanel>
          </SimpleGrid>
          
          {/* Note about metrics implementation */}
          <GlassPanel variant="light" elevation={1} p={4}>
            <Text fontSize="sm" fontStyle="italic">
              Note: These interactive charts use the Recharts library to visualize real-time and historical metrics data from the AI Gateway.
              Data is currently from mock sources but can be easily connected to the real API endpoints.
            </Text>
          </GlassPanel>
        </Box>
      )}
    </Box>
  );
};
