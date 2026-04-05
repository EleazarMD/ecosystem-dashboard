import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  SimpleGrid,
  Text,
  Flex,
  HStack,
  FormControl,
  FormLabel,
  Select,
  Button,
  VStack,
  Heading,
  Divider,
  Spinner,
  Badge,
  Tooltip as ChakraTooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  Stack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Skeleton
} from '@chakra-ui/react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, LineChart, Line, Brush, Area, AreaChart,
  ComposedChart, Scatter, RadialBarChart, RadialBar, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';
import { InfoIcon, ChevronDownIcon, RepeatIcon, DownloadIcon } from '@chakra-ui/icons';
import { FiCpu, FiHardDrive, FiActivity, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface KubernetesMonitoringPanelProps {
  clusterData: any;
  servicesData: any[];
  refreshInterval: number;
  isLoading: boolean;
}

// Enhanced colors for charts with gradients and palettes
const chartColors = {
  // Status colors
  running: '#48BB78', // green
  pending: '#ECC94B', // yellow
  failed: '#F56565',  // red
  unknown: '#A0AEC0', // gray
  
  // Resource colors
  cpu: '#4299E1',     // blue
  memory: '#9F7AEA',  // purple
  network: '#ED64A6', // pink
  storage: '#38B2AC', // teal
  default: '#CBD5E0', // gray
  
  // Restart indicators
  restartLow: '#48BB78',    // green
  restartMedium: '#4299E1',  // blue
  restartHigh: '#ECC94B',    // yellow
  restartCritical: '#F56565', // red
  
  // Health score colors
  healthExcellent: '#48BB78', // green
  healthGood: '#68D391',      // light green
  healthModerate: '#ECC94B',  // yellow
  healthPoor: '#F6AD55',      // orange
  healthCritical: '#F56565',  // red
  
  // Gradients
  gradients: {
    blue: ['#2D3748', '#3182CE', '#90CDF4'],
    purple: ['#44337A', '#805AD5', '#D6BCFA'],
    green: ['#1C4532', '#48BB78', '#9AE6B4'],
    red: ['#742A2A', '#E53E3E', '#FEB2B2'],
    yellow: ['#744210', '#D69E2E', '#FAF089'],
  }
};

// Utility functions for advanced visualizations
const utils = {
  // Calculate health score based on multiple metrics
  calculateHealthScore: (runningPods: number, totalPods: number, restarts: number, cpuUsage: number, memoryUsage: number): number => {
    if (totalPods === 0) return 0;
    
    const availabilityScore = (runningPods / totalPods) * 100;
    const restartFactor = Math.max(0, 100 - (restarts * 5)); // Penalize for restarts
    const resourceScore = 100 - ((cpuUsage + memoryUsage) / 2); // Lower resource usage is better
    
    return Math.round((availabilityScore * 0.6) + (restartFactor * 0.3) + (resourceScore * 0.1));
  },
  
  // Get appropriate color for health score
  getHealthScoreColor: (score: number): string => {
    if (score >= 90) return chartColors.healthExcellent;
    if (score >= 75) return chartColors.healthGood;
    if (score >= 60) return chartColors.healthModerate;
    if (score >= 40) return chartColors.healthPoor;
    return chartColors.healthCritical;
  },
  
  // Format large numbers with K, M suffixes
  formatNumber: (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  },
  
  // Calculate percentage change between current and previous values
  calculateTrend: (current: number, previous: number): { value: number, direction: 'increase' | 'decrease' | 'stable' } => {
    if (!previous || previous === 0) return { value: 0, direction: 'stable' };
    
    const change = ((current - previous) / previous) * 100;
    const direction = change > 1 ? 'increase' : change < -1 ? 'decrease' : 'stable';
    
    return {
      value: Math.abs(change),
      direction
    };
  },
  
  // Generate gradient for chart areas
  getGradientDef: (id: string, colors: string[]) => {
    return (
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={colors[0]} stopOpacity={0.8}/>
          <stop offset="95%" stopColor={colors[colors.length - 1]} stopOpacity={0.2}/>
        </linearGradient>
      </defs>
    );
  },
  
  // Convert timestamp to readable format
  formatTimestamp: (timestamp: string | number | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }
};

const KubernetesMonitoringPanel: React.FC<KubernetesMonitoringPanelProps> = ({ 
  clusterData, 
  servicesData, 
  refreshInterval, 
  isLoading 
}) => {
  const [selectedNamespace, setSelectedNamespace] = useState('all');

  // Color mode values
  const bgColor = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const borderColor = useSemanticToken('border.default');
  
  // Process cluster data for charts
  const cpuMemoryData = useMemo(() => {
    // If we have historical data in clusterData, use it; otherwise use the current data point
    if (clusterData?.resourceHistory && Array.isArray(clusterData.resourceHistory) && clusterData.resourceHistory.length > 0) {
      return clusterData.resourceHistory.map((point: any) => ({
        timestamp: new Date(point.timestamp).toLocaleTimeString(),
        cpu: point.cpuUsage || 0,
        memory: point.memoryUsage || 0,
      }));
    } else {
      // Create a single data point from current values
      return [{
        timestamp: new Date().toLocaleTimeString(),
        cpu: clusterData?.cpuUsage || 0,
        memory: clusterData?.memoryUsage || 0,
      }];
    }
  }, [clusterData]);
  
  // Process pod status data
  const podStatusData = useMemo(() => [
    { name: 'Running', value: clusterData?.runningPods || 0, color: chartColors.running },
    { name: 'Pending', value: clusterData?.pendingPods || 0, color: chartColors.pending },
    { name: 'Failed', value: clusterData?.failedPods || 0, color: chartColors.failed },
    { name: 'Unknown', value: clusterData?.unknownPods || 0, color: chartColors.unknown },
  ], [clusterData]);
  
  // Process service data to extract restart information
  const restartData = useMemo(() => {
    if (!servicesData || !Array.isArray(servicesData)) return [];
    
    const restartCounts = {
      '0': 0,
      '1-5': 0,
      '6-10': 0,
      '11+': 0
    };
    
    // Count pods in each restart category
    servicesData.forEach(service => {
      if (service.pods) {
        service.pods.forEach((pod: any) => {
          const restarts = pod.restarts || 0;
          if (restarts === 0) restartCounts['0']++;
          else if (restarts >= 1 && restarts <= 5) restartCounts['1-5']++;
          else if (restarts >= 6 && restarts <= 10) restartCounts['6-10']++;
          else restartCounts['11+']++;
        });
      }
    });
    
    // Convert to chart data format
    return [
      { name: '0', value: restartCounts['0'], color: chartColors.restartLow },
      { name: '1-5', value: restartCounts['1-5'], color: chartColors.restartMedium },
      { name: '6-10', value: restartCounts['6-10'], color: chartColors.restartHigh },
      { name: '11+', value: restartCounts['11+'], color: chartColors.restartCritical },
    ];
  }, [servicesData]);
  
  // Process namespace resource usage
  const namespaceData = useMemo(() => {
    if (!servicesData || !Array.isArray(servicesData)) return [];
    
    const namespaces: Record<string, { name: string, cpu: number, memory: number, pods: number }> = {};
    
    // Group by namespace and sum resources
    servicesData.forEach(service => {
      if (service.namespace) {
        if (!namespaces[service.namespace]) {
          namespaces[service.namespace] = {
            name: service.namespace,
            cpu: 0,
            memory: 0,
            pods: 0
          };
        }
        
        // Add resource estimates based on pod count
        const podCount = service.pods?.length || 0;
        namespaces[service.namespace].pods += podCount;
        namespaces[service.namespace].cpu += service.cpuUsage || (podCount * 0.1); // Estimate if no actual data
        namespaces[service.namespace].memory += service.memoryUsage || (podCount * 50); // Estimate in MB if no actual data
      }
    });
    
    // Convert to array and add colors
    const colors = [chartColors.cpu, chartColors.memory, chartColors.network, chartColors.storage, chartColors.default];
    return Object.values(namespaces).map((ns, index) => ({
      ...ns,
      color: colors[index % colors.length]
    }));
  }, [servicesData]);
  
  // Calculate available namespaces for filter dropdown
  const availableNamespaces = useMemo(() => {
    if (!servicesData || !Array.isArray(servicesData)) return [];
    
    const namespaces = new Set<string>();
    servicesData.forEach(service => {
      if (service.namespace) {
        namespaces.add(service.namespace);
      }
    });
    
    return Array.from(namespaces);
  }, [servicesData]);

  // Define subtitle color for text elements
  const subtitleColor = useSemanticToken('text.secondary');
  
  return (
    <GlassPanel>
      <Box
        p={6}
        bg={bgColor}
        borderRadius="lg"
        boxShadow="sm"
        borderWidth="1px"
        borderColor={borderColor}
      >
        {/* Namespace filter and refresh status */}
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <FormControl w="250px">
            <FormLabel fontSize="sm">Filter by Namespace</FormLabel>
            <Select
              size="sm"
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
            >
              <option value="all">All Namespaces</option>
              {availableNamespaces.map((namespace) => (
                <option key={namespace} value={namespace}>{namespace}</option>
              ))}
            </Select>
          </FormControl>

          <HStack>
            <Badge colorScheme="blue" variant="solid" px={2} py={1} borderRadius="md">
              Refresh: {refreshInterval}s
            </Badge>
            {isLoading && <Spinner size="sm" />}
          </HStack>
        </Flex>
        
        {/* Main content area with tabs */}
        <Tabs variant="soft-rounded" colorScheme="blue" mt={4}>
          <TabList mb={4}>
            <Tab>Cluster Overview</Tab>
            <Tab>Service Health</Tab>
            <Tab>Resource Analytics</Tab>
          </TabList>
          
          <TabPanels>
            {/* Cluster Overview Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                {/* Pod Status Distribution */}
                <Box>
                  <Text mb={2} fontWeight="medium" color={textColor}>Pod Status Distribution</Text>
                  <Box height="250px">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {utils.getGradientDef('podStatusGradient', chartColors.gradients.green)}
                        <Pie
                          data={podStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label
                        >
                          {podStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                
                {/* Restart Distribution */}
                <Box>
                  <Text mb={2} fontWeight="medium" color={textColor}>Pod Restart Distribution</Text>
                  <Box height="250px">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={restartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="url(#podStatusGradient)">
                          {restartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </SimpleGrid>
            </TabPanel>
            
            {/* Service Health Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {isLoading ? (
                  <Skeleton height="300px" />
                ) : (
                  <Box>
                    <Text mb={2} fontWeight="medium" color={textColor}>Service Health Overview</Text>
                    <Box height="300px">
                      {/* We'd implement a health score visualization here */}
                      <Text fontSize="sm" color={subtitleColor} textAlign="center">
                        Note: This section would integrate with the real health score calculation from the existing dashboard.
                      </Text>
                    </Box>
                  </Box>
                )}
                
                {isLoading ? (
                  <Skeleton height="300px" />
                ) : (
                  <Box>
                    <Text mb={2} fontWeight="medium" color={textColor}>Age Distribution</Text>
                    <Text fontSize="sm" color={subtitleColor} textAlign="center">
                      This would show pod age distribution based on real cluster data.
                    </Text>
                  </Box>
                )}
              </SimpleGrid>
            </TabPanel>
            
            {/* Resource Analytics Tab */}
            <TabPanel>
              <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                {/* Namespace Resource Usage */}
                <Box>
                  <Text mb={2} fontWeight="medium" color={textColor}>Namespace Resource Usage</Text>
                  <Box height="300px">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={namespaceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="cpu" name="CPU Usage" fill={chartColors.cpu} />
                        <Bar dataKey="memory" name="Memory Usage" fill={chartColors.memory} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
                
                {/* Resource Trends */}
                <Box>
                  <Text mb={2} fontWeight="medium" color={textColor}>Resource Trends</Text>
                  <Box height="300px">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cpuMemoryData}>
                        {utils.getGradientDef('cpuGradient', chartColors.gradients.blue)}
                        {utils.getGradientDef('memoryGradient', chartColors.gradients.purple)}
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="cpu" name="CPU Usage" stroke={chartColors.cpu} fillOpacity={1} fill="url(#cpuGradient)" />
                        <Area type="monotone" dataKey="memory" name="Memory Usage" stroke={chartColors.memory} fillOpacity={1} fill="url(#memoryGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </GlassPanel>
  );
};

export default KubernetesMonitoringPanel;
