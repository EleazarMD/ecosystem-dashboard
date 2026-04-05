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
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
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
  BarChart,
  Bar,
} from 'recharts';

interface ActivityPattern {
  timestamp: string;
  date: string;
  creations: number;
  updates: number;
  deletions: number;
  parseErrors: number;
  avgSize: number;
  uniqueWorkspaces: number;
}

interface ActivityAnalytics {
  patterns: ActivityPattern[];
  summary: {
    totalActivity: number;
    avgDailyCreations: number;
    peakActivity: { date: string; count: number };
    quietPeriods: number;
    errorRate: number;
    workspaceActivity: number;
  };
  trends: {
    creationTrend: 'increasing' | 'decreasing' | 'stable';
    errorTrend: 'improving' | 'worsening' | 'stable';
    sizeTrend: 'growing' | 'shrinking' | 'stable';
  };
}

interface MemoryActivityPatternsProps {
  height?: string | number;
}

const MemoryActivityPatterns: React.FC<MemoryActivityPatternsProps> = ({ height = 300 }) => {
  const [data, setData] = useState<ActivityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('7d');
  const [viewType, setViewType] = useState<'activity' | 'errors' | 'size'>('activity');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBgColor = useSemanticToken('surface.base');

  const fetchActivityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/ide-memory/activity-patterns?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch activity patterns');
      }
    } catch (err: any) {
      console.error('Error fetching activity patterns:', err);
      setError(err.message);
      // No fake data - show service unavailable state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();
  }, [timeframe]);

  const generateActivityPatterns = (timeframe: string): ActivityAnalytics => {
    const days = parseTimeframe(timeframe);
    const patterns: ActivityPattern[] = [];
    
    // Generate realistic activity patterns
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      // Simulate different activity phases
      let baseActivity = 50;
      let errorRate = 0.05;
      
      // Recent plateau period (low activity)
      if (i > days * 0.7) {
        baseActivity = 15;
        errorRate = 0.02;
      }
      // Load testing period (high activity)
      else if (i > days * 0.4) {
        baseActivity = 200;
        errorRate = 0.12;
      }
      // Development period (moderate activity)
      else if (i > days * 0.2) {
        baseActivity = 80;
        errorRate = 0.08;
      }
      
      // Add day-of-week variation
      const dayOfWeek = date.getDay();
      const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1.0;
      
      // Add some randomness
      const randomFactor = 0.5 + Math.random();
      
      const totalActivity = Math.floor(baseActivity * weekendFactor * randomFactor);
      const creations = Math.floor(totalActivity * 0.85);
      const updates = Math.floor(totalActivity * 0.12);
      const deletions = Math.floor(totalActivity * 0.03);
      const parseErrors = Math.floor(totalActivity * errorRate);
      
      patterns.push({
        timestamp: date.toISOString(),
        date: date.toISOString().split('T')[0],
        creations,
        updates,
        deletions,
        parseErrors,
        avgSize: Math.floor(800 + Math.random() * 600),
        uniqueWorkspaces: Math.floor(2 + Math.random() * 4)
      });
    }
    
    // Calculate summary statistics
    const totalActivity = patterns.reduce((sum, p) => sum + p.creations + p.updates + p.deletions, 0);
    const avgDailyCreations = patterns.reduce((sum, p) => sum + p.creations, 0) / patterns.length;
    const peakActivity = patterns.reduce((max, p) => {
      const activity = p.creations + p.updates + p.deletions;
      return activity > max.count ? { date: p.date, count: activity } : max;
    }, { date: '', count: 0 });
    
    const quietPeriods = patterns.filter(p => (p.creations + p.updates + p.deletions) < 10).length;
    const totalErrors = patterns.reduce((sum, p) => sum + p.parseErrors, 0);
    const errorRate = totalActivity > 0 ? (totalErrors / totalActivity) * 100 : 0;
    
    // Calculate trends
    const recentPatterns = patterns.slice(-Math.floor(patterns.length * 0.3));
    const earlierPatterns = patterns.slice(0, Math.floor(patterns.length * 0.3));
    
    const recentAvgCreations = recentPatterns.reduce((sum, p) => sum + p.creations, 0) / recentPatterns.length;
    const earlierAvgCreations = earlierPatterns.reduce((sum, p) => sum + p.creations, 0) / earlierPatterns.length;
    
    const recentErrorRate = recentPatterns.reduce((sum, p) => sum + p.parseErrors, 0) / 
                           recentPatterns.reduce((sum, p) => sum + p.creations + p.updates + p.deletions, 0);
    const earlierErrorRate = earlierPatterns.reduce((sum, p) => sum + p.parseErrors, 0) / 
                            earlierPatterns.reduce((sum, p) => sum + p.creations + p.updates + p.deletions, 0);
    
    const recentAvgSize = recentPatterns.reduce((sum, p) => sum + p.avgSize, 0) / recentPatterns.length;
    const earlierAvgSize = earlierPatterns.reduce((sum, p) => sum + p.avgSize, 0) / earlierPatterns.length;
    
    return {
      patterns,
      summary: {
        totalActivity,
        avgDailyCreations: Math.round(avgDailyCreations),
        peakActivity,
        quietPeriods,
        errorRate: Number(errorRate.toFixed(2)),
        workspaceActivity: Math.round(patterns.reduce((sum, p) => sum + p.uniqueWorkspaces, 0) / patterns.length)
      },
      trends: {
        creationTrend: recentAvgCreations > earlierAvgCreations * 1.1 ? 'increasing' : 
                      recentAvgCreations < earlierAvgCreations * 0.9 ? 'decreasing' : 'stable',
        errorTrend: recentErrorRate < earlierErrorRate * 0.9 ? 'improving' : 
                   recentErrorRate > earlierErrorRate * 1.1 ? 'worsening' : 'stable',
        sizeTrend: recentAvgSize > earlierAvgSize * 1.1 ? 'growing' : 
                  recentAvgSize < earlierAvgSize * 0.9 ? 'shrinking' : 'stable'
      }
    };
  };

  const parseTimeframe = (timeframe: string): number => {
    const match = timeframe.match(/^(\d+)([dwmy])$/);
    if (!match) return 7;
    
    const [, amount, unit] = match;
    const num = parseInt(amount);
    
    switch (unit) {
      case 'd': return num;
      case 'w': return num * 7;
      case 'm': return num * 30;
      case 'y': return num * 365;
      default: return 7;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'growing':
      case 'improving':
        return 'green';
      case 'decreasing':
      case 'shrinking':
      case 'worsening':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
      case 'growing':
      case 'improving':
        return '↗️';
      case 'decreasing':
      case 'shrinking':
      case 'worsening':
        return '↘️';
      default:
        return '➡️';
    }
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
            {payload.map((entry: any, index: number) => (
              <HStack key={index}>
                <Box w={3} h={3} bg={entry.color} borderRadius="full" />
                <Text fontSize="sm">{entry.name}: {entry.value}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Box p={4} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Loading activity patterns...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">Failed to load activity data: {error}</Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" spacing={1}>
          <Heading size="md">🔄 Memory Activity Patterns</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
            Real-time analysis of memory creation, updates, and quality trends
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
          </Select>
          
          <Select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as any)}
            size="sm"
            w="120px"
          >
            <option value="activity">Activity</option>
            <option value="errors">Errors</option>
            <option value="size">Size</option>
          </Select>
          
          <Button size="sm" onClick={fetchActivityData} colorScheme="blue">
            Refresh
          </Button>
        </HStack>
      </Flex>

      {data && (
        <>
          {/* Summary Stats */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={4}>
            <Stat p={3} bg={cardBgColor} borderRadius="md" size="sm">
              <StatLabel fontSize="xs">Daily Avg</StatLabel>
              <StatNumber fontSize="lg">{data.summary.avgDailyCreations}</StatNumber>
              <StatHelpText fontSize="xs">creations/day</StatHelpText>
            </Stat>

            <Stat p={3} bg={cardBgColor} borderRadius="md" size="sm">
              <StatLabel fontSize="xs">Error Rate</StatLabel>
              <StatNumber fontSize="lg" color="red.500">{data.summary.errorRate}%</StatNumber>
              <StatHelpText fontSize="xs">
                <Badge colorScheme={getTrendColor(data.trends.errorTrend)} size="sm">
                  {getTrendIcon(data.trends.errorTrend)} {data.trends.errorTrend}
                </Badge>
              </StatHelpText>
            </Stat>

            <Stat p={3} bg={cardBgColor} borderRadius="md" size="sm">
              <StatLabel fontSize="xs">Peak Activity</StatLabel>
              <StatNumber fontSize="lg" color="purple.500">{data.summary.peakActivity.count}</StatNumber>
              <StatHelpText fontSize="xs">{formatDate(data.summary.peakActivity.date)}</StatHelpText>
            </Stat>

            <Stat p={3} bg={cardBgColor} borderRadius="md" size="sm">
              <StatLabel fontSize="xs">Quiet Days</StatLabel>
              <StatNumber fontSize="lg" color={useSemanticToken('text.secondary')}>{data.summary.quietPeriods}</StatNumber>
              <StatHelpText fontSize="xs">low activity</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Main Chart */}
          <Box height={height}>
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'activity' ? (
                <AreaChart data={data.patterns} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorUpdates" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="creations"
                    stackId="1"
                    stroke="#8B5CF6"
                    fillOpacity={1}
                    fill="url(#colorCreations)"
                    name="Creations"
                  />
                  <Area
                    type="monotone"
                    dataKey="updates"
                    stackId="1"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorUpdates)"
                    name="Updates"
                  />
                </AreaChart>
              ) : viewType === 'errors' ? (
                <LineChart data={data.patterns} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="parseErrors"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    name="Parse Errors"
                  />
                </LineChart>
              ) : (
                <BarChart data={data.patterns} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="avgSize"
                    fill="#F59E0B"
                    radius={[2, 2, 0, 0]}
                    name="Avg Size (chars)"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </Box>

          {/* Trend Indicators */}
          <HStack justify="center" spacing={6} mt={4}>
            <Badge colorScheme={getTrendColor(data.trends.creationTrend)} p={2}>
              {getTrendIcon(data.trends.creationTrend)} Creation: {data.trends.creationTrend}
            </Badge>
            <Badge colorScheme={getTrendColor(data.trends.errorTrend)} p={2}>
              {getTrendIcon(data.trends.errorTrend)} Quality: {data.trends.errorTrend}
            </Badge>
            <Badge colorScheme={getTrendColor(data.trends.sizeTrend)} p={2}>
              {getTrendIcon(data.trends.sizeTrend)} Size: {data.trends.sizeTrend}
            </Badge>
          </HStack>
        </>
      )}
    </Box>
  );
};

export default MemoryActivityPatterns;
