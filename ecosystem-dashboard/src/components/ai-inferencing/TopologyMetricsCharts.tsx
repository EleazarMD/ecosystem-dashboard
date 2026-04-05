/**
 * Topology Metrics Charts
 * Real-time charts for latency, throughput, and error rates
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  
  Card,
  CardBody,
  Select,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetricsData {
  timestamp: string;
  clientLatency: number;
  inferencingLatency: number;
  gatewayLatency: number;
  providerLatency: number;
  totalLatency: number;
  throughput: number;
  errorRate: number;
  successRate: number;
}

interface TopologyMetricsChartsProps {
  selectedProvider?: string;
}

export default function TopologyMetricsCharts({ selectedProvider = 'openai' }: TopologyMetricsChartsProps) {
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [timeRange, setTimeRange] = useState('1h');

  const cardBg = useSemanticToken('surface.elevated');
  const gridColor = useSemanticToken('border.subtle');
  const tooltipBg = useSemanticToken('surface.elevated');
  const tickColor = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchMetricsData();
    const interval = setInterval(fetchMetricsData, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, [selectedProvider, timeRange]);

  const fetchMetricsData = async () => {
    try {
      // Fetch real metrics from AI Inferencing Service
      const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
      const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';
      
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/topology/${selectedProvider}/metrics?range=${timeRange}`,
        {
          headers: {
            'X-Admin-Key': ADMIN_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }

      setMetricsData(data.metrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      
      // Fallback to mock data on error
      const now = Date.now();
      const mockData: MetricsData[] = Array.from({ length: 30 }, (_, i) => {
        const time = new Date(now - (29 - i) * 60000); // Last 30 minutes
        return {
          timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          clientLatency: 40 + Math.random() * 20,
          inferencingLatency: 10 + Math.random() * 8,
          gatewayLatency: 5 + Math.random() * 6,
          providerLatency: 800 + Math.random() * 200,
          totalLatency: 855 + Math.random() * 150,
          throughput: 100 + Math.random() * 40,
          errorRate: Math.random() * 2,
          successRate: 98 + Math.random() * 2,
        };
      });

      setMetricsData(mockData);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg={tooltipBg}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          boxShadow="lg"
        >
          <Text fontSize="xs" fontWeight="600" mb={2}>
            {label}
          </Text>
          {payload.map((entry: any, index: number) => (
            <HStack key={index} justify="space-between" spacing={4}>
              <HStack>
                <Box w={2} h={2} borderRadius="full" bg={entry.color} />
                <Text fontSize="xs">{entry.name}:</Text>
              </HStack>
              <Text fontSize="xs" fontWeight="600">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                {entry.unit || ''}
              </Text>
            </HStack>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <VStack spacing={4} align="stretch">
      {/* Time Range Selector */}
      <HStack justify="space-between">
        <Text fontSize="md" fontWeight="600">
          Performance Metrics
        </Text>
        <Select
          size="sm"
          w="150px"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="15m">Last 15 minutes</option>
          <option value="1h">Last hour</option>
          <option value="6h">Last 6 hours</option>
          <option value="24h">Last 24 hours</option>
        </Select>
      </HStack>

      {/* Charts */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab fontSize="sm">Latency Breakdown</Tab>
          <Tab fontSize="sm">Total Latency</Tab>
          <Tab fontSize="sm">Throughput</Tab>
          <Tab fontSize="sm">Success Rate</Tab>
        </TabList>

        <TabPanels>
          {/* Latency Breakdown - Stacked Area Chart */}
          <TabPanel p={0} pt={4}>
            <Card bg={cardBg}>
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                      label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="square"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="clientLatency" 
                      stackId="1"
                      stroke="#3182ce" 
                      fill="#3182ce" 
                      fillOpacity={0.6}
                      name="Client"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="inferencingLatency" 
                      stackId="1"
                      stroke="#38a169" 
                      fill="#38a169" 
                      fillOpacity={0.6}
                      name="Inferencing"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="gatewayLatency" 
                      stackId="1"
                      stroke="#d69e2e" 
                      fill="#d69e2e" 
                      fillOpacity={0.6}
                      name="Gateway"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="providerLatency" 
                      stackId="1"
                      stroke="#e53e3e" 
                      fill="#e53e3e" 
                      fillOpacity={0.6}
                      name="Provider"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Total Latency - Line Chart */}
          <TabPanel p={0} pt={4}>
            <Card bg={cardBg}>
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                      label={{ value: 'Total Latency (ms)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalLatency" 
                      stroke="#3182ce" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Total Latency"
                      unit="ms"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Throughput - Bar Chart */}
          <TabPanel p={0} pt={4}>
            <Card bg={cardBg}>
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                      label={{ value: 'Requests/min', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="square"
                    />
                    <Bar 
                      dataKey="throughput" 
                      fill="#38a169" 
                      name="Throughput"
                      unit=" req/min"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>

          {/* Success Rate - Line Chart */}
          <TabPanel p={0} pt={4}>
            <Card bg={cardBg}>
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: tickColor }}
                      domain={[95, 100]}
                      label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#38a169" 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      name="Success Rate"
                      unit="%"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#e53e3e" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Error Rate"
                      unit="%"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
}
