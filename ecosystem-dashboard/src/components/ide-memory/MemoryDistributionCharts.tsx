import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  SimpleGrid,
  Select,
  Button,
  ButtonGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Flex,
  Tooltip,
  Card,
  CardBody,
} from '@chakra-ui/react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Treemap,
} from 'recharts';

interface MemoryDistribution {
  byWorkspace: { name: string; count: number; percentage: number }[];
  byTags: { name: string; count: number; percentage: number }[];
  bySize: { range: string; count: number; percentage: number; avgSize: number }[];
  byProject: { name: string; count: number; percentage: number; workspaces: string[] }[];
  byCreationTime: { period: string; count: number; percentage: number }[];
  qualityMetrics: {
    withTags: number;
    withoutTags: number;
    parseErrors: number;
    avgContentLength: number;
    totalMemories: number;
  };
}

interface MemoryDistributionChartsProps {
  height?: string | number;
}

const MemoryDistributionCharts: React.FC<MemoryDistributionChartsProps> = ({ height = 400 }) => {
  const [data, setData] = useState<MemoryDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'workspace' | 'tags' | 'size' | 'project' | 'quality'>('workspace');

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBgColor = useSemanticToken('surface.base');

  // Color palettes for different chart types
  const workspaceColors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5A2B', '#EC4899', '#6B7280'];
  const tagColors = ['#06B6D4', '#84CC16', '#F97316', '#EF4444', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  const sizeColors = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
  const projectColors = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16', '#6B7280'];

  const fetchDistributionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ide-memory/distribution-analytics');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Distribution data received:', result);
      
      if (result.success && result.data) {
        console.log('Setting data:', result.data);
        // Process the data to abbreviate workspace names
        const processedData = {
          ...result.data,
          byWorkspace: result.data.byWorkspace.map((item: any) => ({
            ...item,
            name: abbreviateWorkspaceName(item.name)
          }))
        };
        setData(processedData);
      } else {
        throw new Error(result.error || 'Failed to fetch distribution data');
      }
    } catch (err: any) {
      console.error('Error fetching distribution analytics:', err);
      setError(err.message);
      // Use fallback data when service is unavailable
      setData(getFallbackDistributionData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributionData();
  }, []);

  const abbreviateWorkspaceName = (fullPath: string): string => {
    if (fullPath === 'default') return 'default';
    
    // Debug logging
    console.log('Abbreviating workspace name:', fullPath);
    
    const parts = fullPath.split('/');
    if (parts.length >= 3) {
      // Extract meaningful parts: AIHomelab/component/subcomponent
      const relevant = parts.slice(-3);
      if (relevant[0] === 'AIHomelab') {
        const abbreviated = `${relevant[1]}/${relevant[2]}`;
        console.log('Abbreviated to:', abbreviated);
        return abbreviated;
      }
      const joined = relevant.join('/');
      console.log('Joined to:', joined);
      return joined;
    }
    console.log('Returning original:', fullPath);
    return fullPath;
  };

  const getFallbackDistributionData = (): MemoryDistribution => {
    return {
      byWorkspace: [
        { name: 'core/knowledge-graph', count: 18500, percentage: 55.8 },
        { name: 'tools/monitoring', count: 8200, percentage: 24.7 },
        { name: 'services/auth', count: 3800, percentage: 11.4 },
        { name: 'default', count: 2762, percentage: 8.1 }
      ],
      byTags: [
        { name: 'architecture', count: 3100, percentage: 9.3 },
        { name: 'api', count: 2800, percentage: 8.4 },
        { name: 'testing', count: 2400, percentage: 7.2 },
        { name: 'deployment', count: 2100, percentage: 6.3 },
        { name: 'database', count: 1900, percentage: 5.7 },
        { name: 'security', count: 1600, percentage: 4.8 },
        { name: 'performance', count: 1400, percentage: 4.2 },
        { name: 'ui', count: 1200, percentage: 3.6 },
        { name: 'documentation', count: 1000, percentage: 3.0 }
      ],
      bySize: [
        { range: '101-500 chars', count: 12800, percentage: 38.6, avgSize: 320 },
        { range: '501-1K chars', count: 9200, percentage: 27.7, avgSize: 750 },
        { range: '1K-5K chars', count: 8100, percentage: 24.4, avgSize: 2100 },
        { range: '0-100 chars', count: 2400, percentage: 7.2, avgSize: 65 },
        { range: '5K+ chars', count: 762, percentage: 2.3, avgSize: 8500 }
      ],
      byProject: [
        { name: 'knowledge-graph', count: 18500, percentage: 55.8, workspaces: ['core/knowledge-graph'] },
        { name: 'ecosystem-dashboard', count: 5200, percentage: 15.7, workspaces: ['tools/monitoring'] },
        { name: 'auth-service', count: 3800, percentage: 11.4, workspaces: ['services/auth'] },
        { name: 'ai-gateway', count: 2100, percentage: 6.3, workspaces: ['services/gateway'] },
        { name: 'ide-memory', count: 1800, percentage: 5.4, workspaces: ['core/knowledge-graph'] }
      ],
      byCreationTime: [
        { period: 'Last 24h', count: 45, percentage: 0.1 },
        { period: 'Last 7 days', count: 320, percentage: 1.0 },
        { period: 'Last 30 days', count: 1200, percentage: 3.6 },
        { period: 'Older', count: 31697, percentage: 95.3 }
      ],
      qualityMetrics: {
        withTags: 28062,
        withoutTags: 5200,
        parseErrors: 0,
        avgContentLength: 1250,
        totalMemories: 33262
      }
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
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
            {data.name || data.range || data.period || label}
          </Text>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm">Count: {data.count?.toLocaleString()}</Text>
            <Text fontSize="sm">Percentage: {data.percentage}%</Text>
            {data.avgSize && (
              <Text fontSize="sm">Avg Size: {data.avgSize} chars</Text>
            )}
            {data.workspaces && (
              <Text fontSize="sm">Workspaces: {data.workspaces.length}</Text>
            )}
          </VStack>
        </Box>
      );
    }
    return null;
  };

  const renderPieChart = (data: any[], colors: string[], title: string) => {
    // Abbreviate workspace names for better display
    const processedData = data.map(item => ({
      ...item,
      displayName: title.includes('Workspace') ? abbreviateWorkspaceName(item.name) : item.name,
      originalName: item.name
    }));

    return (
      <Box>
        <Heading size="md" mb={4} textAlign="center">{title}</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              label={({ displayName, percentage }) => `${displayName}: ${percentage}%`}
              labelLine={false}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <Box bg={useSemanticToken('surface.elevated')} p={3} borderRadius="md" shadow="lg" border="1px solid" borderColor={useSemanticToken('border.default')}>
                    <Text fontWeight="bold">{data.originalName || data.displayName}</Text>
                    <Text>Count: {formatNumber(data.count)}</Text>
                    <Text>Percentage: {data.percentage}%</Text>
                  </Box>
                );
              }
              return null;
            }} />
            <Legend formatter={(value, entry) => {
              const item = processedData.find(d => d.displayName === value);
              return item?.displayName || value;
            }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderBarChart = (chartData: any[], title: string, dataKey: string = 'count') => {
    // Abbreviate workspace names for bar chart
    const processedData = chartData.slice(0, 10).map(item => ({
      ...item,
      displayName: title.includes('Workspace') ? abbreviateWorkspaceName(item.name) : item.name,
      originalName: item.name
    }));

    return (
      <Box>
        <Heading size="md" mb={4} textAlign="center">{title}</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis 
              dataKey="displayName" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
              fontSize={12}
            />
            <YAxis tickFormatter={formatNumber} />
            <RechartsTooltip content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <Box bg={useSemanticToken('surface.elevated')} p={3} borderRadius="md" shadow="lg" border="1px solid" borderColor={useSemanticToken('border.default')}>
                    <Text fontWeight="bold">{data.originalName || data.displayName}</Text>
                    <Text>Count: {formatNumber(data.count)}</Text>
                    <Text>Percentage: {data.percentage}%</Text>
                  </Box>
                );
              }
              return null;
            }} />
            <Bar dataKey={dataKey} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    );
  };

  const renderTreemap = (chartData: any[], title: string) => {
    const treemapData = chartData.slice(0, 12).map((item, index) => ({
      name: item.name || item.range,
      size: item.count,
      fill: projectColors[index % projectColors.length]
    }));

    return (
      <Box>
        <Heading size="md" mb={4} textAlign="center">{title}</Heading>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="#fff"
            fill="#8884d8"
            content={({ root, depth, x, y, width, height, index, payload, colors, name }) => {
              if (depth === 1 && payload && x !== undefined && y !== undefined && width && height) {
                const fillColor = payload.fill || projectColors[(index || 0) % projectColors.length];
                const itemName = payload.name || name || 'Unknown';
                const itemSize = payload.size || 0;
                
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{
                        fill: fillColor,
                        stroke: '#fff',
                        strokeWidth: 2,
                        strokeOpacity: 1,
                      }}
                    />
                    {width > 60 && height > 30 && (
                      <text
                        x={x + width / 2}
                        y={y + height / 2}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={Math.min(width / 8, height / 4, 14)}
                        fontWeight="bold"
                      >
                        {itemName}
                      </text>
                    )}
                    {width > 80 && height > 50 && (
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + 16}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                      >
                        {formatNumber(itemSize)}
                      </text>
                    )}
                  </g>
                );
              }
              return null;
            }}
          >
            <RechartsTooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Loading memory distribution analytics...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">Failed to load distribution data: {error}</Text>
        </Alert>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">No distribution data available</Text>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6} bg={bgColor} borderRadius="lg" border="1px" borderColor={borderColor}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg">📊 Memory Distribution Analytics</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
            Comprehensive analysis of memory patterns across workspaces, projects, and content types
          </Text>
        </VStack>
        
        <HStack spacing={3}>
          <ButtonGroup size="sm" isAttached>
            <Button
              variant={activeView === 'workspace' ? 'solid' : 'outline'}
              onClick={() => setActiveView('workspace')}
            >
              Workspace
            </Button>
            <Button
              variant={activeView === 'project' ? 'solid' : 'outline'}
              onClick={() => setActiveView('project')}
            >
              Project
            </Button>
            <Button
              variant={activeView === 'tags' ? 'solid' : 'outline'}
              onClick={() => setActiveView('tags')}
            >
              Tags
            </Button>
            <Button
              variant={activeView === 'size' ? 'solid' : 'outline'}
              onClick={() => setActiveView('size')}
            >
              Size
            </Button>
            <Button
              variant={activeView === 'quality' ? 'solid' : 'outline'}
              onClick={() => setActiveView('quality')}
            >
              Quality
            </Button>
          </ButtonGroup>
          
          <Button size="sm" onClick={fetchDistributionData} colorScheme="blue">
            Refresh
          </Button>
        </HStack>
      </Flex>

      {data && (
        <>
          {/* Quality Metrics Overview */}
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4} mb={6}>
            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Total Memories</StatLabel>
              <StatNumber fontSize="xl" color="blue.500">
                {data.qualityMetrics.totalMemories.toLocaleString()}
              </StatNumber>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">With Tags</StatLabel>
              <StatNumber fontSize="xl" color="green.500">
                {data.qualityMetrics.withTags.toLocaleString()}
              </StatNumber>
              <StatHelpText>
                {((data.qualityMetrics.withTags / data.qualityMetrics.totalMemories) * 100).toFixed(1)}%
              </StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Parse Errors</StatLabel>
              <StatNumber fontSize="xl" color="red.500">
                {data.qualityMetrics.parseErrors.toLocaleString()}
              </StatNumber>
              <StatHelpText>
                {((data.qualityMetrics.parseErrors / data.qualityMetrics.totalMemories) * 100).toFixed(1)}%
              </StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Avg Content</StatLabel>
              <StatNumber fontSize="xl" color="purple.500">
                {data.qualityMetrics.avgContentLength}
              </StatNumber>
              <StatHelpText>characters</StatHelpText>
            </Stat>

            <Stat p={4} bg={cardBgColor} borderRadius="md">
              <StatLabel fontSize="xs">Quality Score</StatLabel>
              <StatNumber fontSize="xl" color="orange.500">
                {Math.round(((data.qualityMetrics.totalMemories - data.qualityMetrics.parseErrors) / data.qualityMetrics.totalMemories) * 100)}%
              </StatNumber>
              <StatHelpText>health</StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Main Visualization */}
          <Box mb={6}>
            {activeView === 'workspace' && (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {renderPieChart(data.byWorkspace, workspaceColors, 'Memory Distribution by Workspace')}
                {renderBarChart(data.byWorkspace, 'Workspace Memory Count', 'count')}
              </SimpleGrid>
            )}

            {activeView === 'project' && (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {renderTreemap(data.byProject, 'Project Memory Distribution (Treemap)')}
                {renderBarChart(data.byProject, 'Project Memory Count', 'count')}
              </SimpleGrid>
            )}

            {activeView === 'tags' && (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {renderPieChart(data.byTags, tagColors, 'Memory Distribution by Tags')}
                {renderBarChart(data.byTags, 'Top Memory Tags', 'count')}
              </SimpleGrid>
            )}

            {activeView === 'size' && (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {renderPieChart(data.bySize.map(item => ({ ...item, name: item.range })), sizeColors, 'Memory Distribution by Size')}
                {renderBarChart(data.bySize.map(item => ({ ...item, name: item.range })), 'Memory Size Distribution', 'count')}
              </SimpleGrid>
            )}

            {activeView === 'quality' && (
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                <Box>
                  <Heading size="md" mb={4} textAlign="center">Memory Quality Breakdown</Heading>
                  <ResponsiveContainer width="100%" height={300} minHeight={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Healthy', count: data.qualityMetrics.totalMemories - data.qualityMetrics.parseErrors, percentage: ((data.qualityMetrics.totalMemories - data.qualityMetrics.parseErrors) / data.qualityMetrics.totalMemories * 100).toFixed(1) },
                          { name: 'Parse Errors', count: data.qualityMetrics.parseErrors, percentage: (data.qualityMetrics.parseErrors / data.qualityMetrics.totalMemories * 100).toFixed(1) }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        <Cell fill="#10B981" />
                        <Cell fill="#EF4444" />
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                {renderBarChart(data.byCreationTime.map(item => ({ ...item, name: item.period })), 'Memory Creation Timeline', 'count')}
              </SimpleGrid>
            )}
          </Box>

          {/* Detailed Statistics */}
          <Card>
            <CardBody>
              <Heading size="sm" mb={4}>📈 Key Insights</Heading>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium" fontSize="sm">Top Workspace</Text>
                  <Badge colorScheme="purple" variant="subtle">
                    {data.byWorkspace[0]?.name.split('/').pop() || 'N/A'}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {data.byWorkspace[0]?.count.toLocaleString()} memories ({data.byWorkspace[0]?.percentage}%)
                  </Text>
                </VStack>

                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium" fontSize="sm">Most Common Tag</Text>
                  <Badge colorScheme="blue" variant="subtle">
                    {data.byTags[0]?.name || 'N/A'}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {data.byTags[0]?.count.toLocaleString()} occurrences ({data.byTags[0]?.percentage}%)
                  </Text>
                </VStack>

                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium" fontSize="sm">Common Size Range</Text>
                  <Badge colorScheme="green" variant="subtle">
                    {data.bySize[0]?.range || 'N/A'}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {data.bySize[0]?.count.toLocaleString()} memories ({data.bySize[0]?.percentage}%)
                  </Text>
                </VStack>

                <VStack align="start" spacing={2}>
                  <Text fontWeight="medium" fontSize="sm">Top Project</Text>
                  <Badge colorScheme="orange" variant="subtle">
                    {data.byProject[0]?.name || 'N/A'}
                  </Badge>
                  <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                    {data.byProject[0]?.count.toLocaleString()} memories ({data.byProject[0]?.percentage}%)
                  </Text>
                </VStack>
              </SimpleGrid>
            </CardBody>
          </Card>
        </>
      )}
    </Box>
  );
};

export default MemoryDistributionCharts;
