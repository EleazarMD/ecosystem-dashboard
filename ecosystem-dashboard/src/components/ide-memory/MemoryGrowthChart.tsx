import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Select,
  Button,
  ButtonGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  Spacer,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TimeSeriesPoint {
  timestamp: string;
  date: string;
  count: number;
  growth_rate: number;
  cumulative_growth: number;
}

interface GrowthAnalytics {
  timeSeries: TimeSeriesPoint[];
  totalGrowth: number;
  averageGrowthRate: number;
  exponentialFactor: number;
  projections: {
    oneWeek: number;
    oneMonth: number;
    threeMonths: number;
  };
}

interface MemoryGrowthChartProps {
  height?: string | number;
}

const MemoryGrowthChart: React.FC<MemoryGrowthChartProps> = ({ height = 400 }) => {
  const [data, setData] = useState<GrowthAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [granularity, setGranularity] = useState('daily');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBgColor = useSemanticToken('surface.base');

  const fetchGrowthData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/ide-memory/growth-analytics?timeframe=${timeframe}&granularity=${granularity}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch growth data');
      }
    } catch (err: any) {
      console.error('Error fetching growth analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [timeframe, granularity]);

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (granularity === 'hourly') {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric',
        hour12: true 
      });
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getGrowthColor = (growthRate: number) => {
    if (growthRate > 10) return '#E53E3E'; // Red for very high growth
    if (growthRate > 5) return '#D69E2E'; // Orange for high growth
    if (growthRate > 0) return '#38A169'; // Green for positive growth
    return '#718096'; // Gray for no growth
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          bg={bgColor}
          p={3}
          border="1px"
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="lg"
        >
          <Text fontWeight="bold" fontSize="sm" mb={2}>
            {formatDate(label)}
          </Text>
          <VStack align="start" spacing={1}>
            <HStack>
              <Box w={3} h={3} bg="#8B5CF6" borderRadius="full" />
              <Text fontSize="sm">Count: {data.count.toLocaleString()}</Text>
            </HStack>
            <HStack>
              <Box w={3} h={3} bg="#10B981" borderRadius="full" />
              <Text fontSize="sm">Growth Rate: {data.growth_rate}%</Text>
            </HStack>
            <HStack>
              <Box w={3} h={3} bg="#F59E0B" borderRadius="full" />
              <Text fontSize="sm">Cumulative: {data.cumulative_growth}%</Text>
            </HStack>
          </VStack>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Loading memory growth analytics...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">Failed to load growth data: {error}</Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">📈 Memory Growth Analytics</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
            Exponential growth pattern analysis with time series visualization
          </Text>
        </VStack>
        
        <HStack spacing={3}>
          <Select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            size="sm"
            w="120px"
          >
            <option value="7d">7 Days</option>
            <option value="14d">14 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
            <option value="6m">6 Months</option>
          </Select>
          
          <Select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            size="sm"
            w="100px"
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </Select>
          
          <ButtonGroup size="sm" isAttached>
            <Button
              variant={chartType === 'area' ? 'solid' : 'outline'}
              onClick={() => setChartType('area')}
            >
              Area
            </Button>
            <Button
              variant={chartType === 'line' ? 'solid' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
          </ButtonGroup>
          
          <Button size="sm" onClick={fetchGrowthData} colorScheme="blue">
            Refresh
          </Button>
        </HStack>
      </Flex>

      {data && (
        <>
          {/* Growth Statistics */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={6}>
            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Total Growth</StatLabel>
              <StatNumber fontSize="xl" color="purple.500">
                {data.totalGrowth.toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                Since baseline
              </StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Avg Growth Rate</StatLabel>
              <StatNumber fontSize="xl" color="green.500">
                {data.averageGrowthRate.toFixed(1)}%
              </StatNumber>
              <StatHelpText>
                Per {granularity.slice(0, -2)}
              </StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Exponential Factor</StatLabel>
              <StatNumber fontSize="xl" color="orange.500">
                {data.exponentialFactor.toFixed(1)}x
              </StatNumber>
              <StatHelpText>
                Recent multiplier
              </StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Current Count</StatLabel>
              <StatNumber fontSize="xl" color="blue.500">
                {data.timeSeries[data.timeSeries.length - 1]?.count.toLocaleString()}
              </StatNumber>
              <StatHelpText>
                Total memories
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Main Chart */}
          <Box mb={6}>
            <Box height={height}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatCount}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      strokeWidth={2}
                      name="Memory Count"
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatCount}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8B5CF6"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Memory Count"
                    />
                    <Line
                      type="monotone"
                      dataKey="growth_rate"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                      yAxisId="right"
                      name="Growth Rate (%)"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Growth Projections */}
          <Box p={4} bg={cardBgColor} borderRadius="md">
            <Text fontWeight="medium" mb={3}>Growth Projections</Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <HStack justify="space-between">
                <Text fontSize="sm">1 Week:</Text>
                <Badge colorScheme="blue" variant="subtle">
                  {data.projections.oneWeek.toLocaleString()} memories
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">1 Month:</Text>
                <Badge colorScheme="orange" variant="subtle">
                  {data.projections.oneMonth.toLocaleString()} memories
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">3 Months:</Text>
                <Badge colorScheme="red" variant="subtle">
                  {data.projections.threeMonths.toLocaleString()} memories
                </Badge>
              </HStack>
            </SimpleGrid>
          </Box>
        </>
      )}
    </Box>
  );
};

export default MemoryGrowthChart;
