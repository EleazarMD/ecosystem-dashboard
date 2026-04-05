import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  HStack,
  VStack,
  useToast,
  Icon,
  Spinner,
  Badge,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Select,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Divider,
} from '@chakra-ui/react';
import { FiRefreshCw, FiClock, FiZap, FiDatabase, FiCpu, FiActivity, FiTrendingUp } from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface PerformanceMetrics {
  timestamp: string;
  throughput: number;
  latency: number;
  cpuUsage: number;
  memoryUsage: number;
  diskIo: number;
  networkIo: number;
  errorRate: number;
  queueDepth: number;
}

interface BottleneckAnalysis {
  component: string;
  severity: 'low' | 'medium' | 'high';
  impact: number;
  description: string;
  recommendation: string;
}

interface ProcessingStats {
  avgProcessingTime: number;
  peakThroughput: number;
  totalDocuments: number;
  successRate: number;
  bottlenecks: BottleneckAnalysis[];
  resourceUtilization: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

const IngestionPerformanceAnalytics: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [selectedMetric, setSelectedMetric] = useState<string>('throughput');
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const cardBg = useSemanticToken('surface.base');

  const loadPerformanceAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/knowledge-graph/performance-analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load performance analytics: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setPerformanceMetrics(result.data.metrics);
        setProcessingStats(result.data.stats);
      } else {
        throw new Error(result.message || 'Invalid performance data');
      }
    } catch (err: any) {
      console.error('Error loading performance analytics:', err);
      setError(err.message);
      
      // Generate sample data for development
      generateSamplePerformanceData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSamplePerformanceData = () => {
    const metrics: PerformanceMetrics[] = [];
    const now = new Date();
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const interval = timeRange === '24h' ? 1 : timeRange === '7d' ? 4 : 24;
    
    for (let i = hours; i >= 0; i -= interval) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      metrics.push({
        timestamp: timestamp.toISOString(),
        throughput: Math.random() * 3 + 1.5 + Math.sin(i / 6) * 0.5,
        latency: Math.random() * 2 + 1 + Math.sin(i / 4) * 0.3,
        cpuUsage: Math.random() * 30 + 40 + Math.sin(i / 8) * 10,
        memoryUsage: Math.random() * 20 + 60 + Math.sin(i / 12) * 5,
        diskIo: Math.random() * 50 + 20,
        networkIo: Math.random() * 100 + 50,
        errorRate: Math.random() * 5 + 2,
        queueDepth: Math.floor(Math.random() * 30 + 10)
      });
    }

    const stats: ProcessingStats = {
      avgProcessingTime: 2.4,
      peakThroughput: 4.2,
      totalDocuments: 14,
      successRate: 92.8,
      bottlenecks: [
        {
          component: 'Entity Extraction',
          severity: 'medium',
          impact: 35,
          description: 'NLP processing consuming high CPU during entity extraction',
          recommendation: 'Consider batch processing or GPU acceleration for NLP workloads'
        },
        {
          component: 'Neo4j Write Operations',
          severity: 'low',
          impact: 15,
          description: 'Graph database writes showing minor latency spikes',
          recommendation: 'Optimize Cypher queries and consider write batching'
        },
        {
          component: 'File I/O',
          severity: 'low',
          impact: 12,
          description: 'Document reading from filesystem showing occasional delays',
          recommendation: 'Implement parallel file reading for large documents'
        }
      ],
      resourceUtilization: {
        cpu: 68,
        memory: 74,
        disk: 35,
        network: 22
      }
    };

    setPerformanceMetrics(metrics);
    setProcessingStats(stats);
  };

  useEffect(() => {
    loadPerformanceAnalytics();
  }, [timeRange]);

  const getBottleneckColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getMetricData = () => {
    const labels = performanceMetrics.map(m => {
      const date = new Date(m.timestamp);
      return timeRange === '24h' 
        ? date.toLocaleTimeString() 
        : date.toLocaleDateString();
    });

    const datasets = [];
    
    if (selectedMetric === 'throughput' || selectedMetric === 'all') {
      datasets.push({
        label: 'Throughput (docs/min)',
        data: performanceMetrics.map(m => m.throughput),
        borderColor: '#4299E1',
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        tension: 0.3,
      });
    }
    
    if (selectedMetric === 'latency' || selectedMetric === 'all') {
      datasets.push({
        label: 'Latency (s)',
        data: performanceMetrics.map(m => m.latency),
        borderColor: '#48BB78',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        tension: 0.3,
        yAxisID: selectedMetric === 'all' ? 'y1' : 'y',
      });
    }
    
    if (selectedMetric === 'resources') {
      datasets.push(
        {
          label: 'CPU Usage (%)',
          data: performanceMetrics.map(m => m.cpuUsage),
          borderColor: '#ED8936',
          backgroundColor: 'rgba(237, 137, 54, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Memory Usage (%)',
          data: performanceMetrics.map(m => m.memoryUsage),
          borderColor: '#9F7AEA',
          backgroundColor: 'rgba(159, 122, 234, 0.1)',
          tension: 0.3,
        }
      );
    }

    return { labels, datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      ...(selectedMetric === 'all' && {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
        }
      })
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  // Resource utilization chart
  const resourceData = processingStats ? {
    labels: ['CPU', 'Memory', 'Disk I/O', 'Network I/O'],
    datasets: [{
      data: [
        processingStats.resourceUtilization.cpu,
        processingStats.resourceUtilization.memory,
        processingStats.resourceUtilization.disk,
        processingStats.resourceUtilization.network
      ],
      backgroundColor: [
        '#ED8936',
        '#9F7AEA',
        '#4299E1',
        '#48BB78'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  } : null;

  if (isLoading && !processingStats) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Loading performance analytics...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Ingestion Performance Analytics</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            System performance monitoring and bottleneck analysis
          </Text>
        </Box>
        <HStack>
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="sm" width="120px">
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
          </Select>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadPerformanceAnalytics}
            isLoading={isLoading}
            colorScheme="blue"
            size="sm"
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {error && (
        <Alert status="warning" mb={6}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Using sample data</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      {processingStats && (
        <VStack spacing={6} align="stretch">
          {/* Performance Overview */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Avg Processing Time</StatLabel>
                  <StatNumber>{processingStats.avgProcessingTime}s</StatNumber>
                  <StatHelpText>
                    <Icon as={FiClock} mr={1} />
                    Per document
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Peak Throughput</StatLabel>
                  <StatNumber>{processingStats.peakThroughput}</StatNumber>
                  <StatHelpText>
                    <Icon as={FiZap} mr={1} />
                    docs/min
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Success Rate</StatLabel>
                  <StatNumber color={processingStats.successRate > 90 ? 'green.500' : 'orange.500'}>
                    {processingStats.successRate}%
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={processingStats.successRate > 90 ? 'increase' : 'decrease'} />
                    Processing quality
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Bottlenecks</StatLabel>
                  <StatNumber color="orange.500">
                    {processingStats.bottlenecks.length}
                  </StatNumber>
                  <StatHelpText>
                    <Icon as={FiActivity} mr={1} />
                    Components
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>Performance Trends</Tab>
              <Tab>Resource Utilization</Tab>
              <Tab>Bottleneck Analysis</Tab>
            </TabList>

            <TabPanels>
              {/* Performance Trends */}
              <TabPanel>
                <Card>
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Heading size="md">Performance Metrics Over Time</Heading>
                      <Select 
                        value={selectedMetric} 
                        onChange={(e) => setSelectedMetric(e.target.value)}
                        size="sm" 
                        width="200px"
                      >
                        <option value="throughput">Throughput</option>
                        <option value="latency">Latency</option>
                        <option value="resources">Resource Usage</option>
                        <option value="all">All Metrics</option>
                      </Select>
                    </Flex>
                  </CardHeader>
                  <CardBody>
                    <Box height="400px">
                      <Line data={getMetricData()} options={chartOptions} />
                    </Box>
                  </CardBody>
                </Card>
              </TabPanel>

              {/* Resource Utilization */}
              <TabPanel>
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
                  <Card>
                    <CardHeader>
                      <Heading size="md">Current Resource Usage</Heading>
                    </CardHeader>
                    <CardBody>
                      {resourceData && (
                        <Box height="300px">
                          <Doughnut 
                            data={resourceData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                },
                              },
                            }}
                          />
                        </Box>
                      )}
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Heading size="md">Resource Details</Heading>
                    </CardHeader>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Box>
                          <Flex justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiCpu} color="orange.500" />
                              <Text>CPU Usage</Text>
                            </HStack>
                            <Text fontWeight="bold">{processingStats.resourceUtilization.cpu}%</Text>
                          </Flex>
                          <Progress 
                            value={processingStats.resourceUtilization.cpu} 
                            colorScheme="orange" 
                            size="sm"
                          />
                        </Box>

                        <Box>
                          <Flex justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiDatabase} color="purple.500" />
                              <Text>Memory Usage</Text>
                            </HStack>
                            <Text fontWeight="bold">{processingStats.resourceUtilization.memory}%</Text>
                          </Flex>
                          <Progress 
                            value={processingStats.resourceUtilization.memory} 
                            colorScheme="purple" 
                            size="sm"
                          />
                        </Box>

                        <Box>
                          <Flex justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiActivity} color="blue.500" />
                              <Text>Disk I/O</Text>
                            </HStack>
                            <Text fontWeight="bold">{processingStats.resourceUtilization.disk}%</Text>
                          </Flex>
                          <Progress 
                            value={processingStats.resourceUtilization.disk} 
                            colorScheme="blue" 
                            size="sm"
                          />
                        </Box>

                        <Box>
                          <Flex justify="space-between" mb={2}>
                            <HStack>
                              <Icon as={FiTrendingUp} color="green.500" />
                              <Text>Network I/O</Text>
                            </HStack>
                            <Text fontWeight="bold">{processingStats.resourceUtilization.network}%</Text>
                          </Flex>
                          <Progress 
                            value={processingStats.resourceUtilization.network} 
                            colorScheme="green" 
                            size="sm"
                          />
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </SimpleGrid>
              </TabPanel>

              {/* Bottleneck Analysis */}
              <TabPanel>
                <Card>
                  <CardHeader>
                    <Heading size="md">Performance Bottlenecks</Heading>
                  </CardHeader>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      {processingStats.bottlenecks.map((bottleneck, index) => (
                        <Box 
                          key={index}
                          p={4} 
                          border="1px" 
                          borderColor={useSemanticToken('border.default')} 
                          borderRadius="md"
                          bg={cardBg}
                        >
                          <Flex justify="space-between" align="start" mb={3}>
                            <Box>
                              <HStack mb={2}>
                                <Text fontWeight="bold" fontSize="lg">
                                  {bottleneck.component}
                                </Text>
                                <Badge colorScheme={getBottleneckColor(bottleneck.severity)}>
                                  {bottleneck.severity} impact
                                </Badge>
                              </HStack>
                              <Text color={useSemanticToken('text.secondary')} mb={2}>
                                {bottleneck.description}
                              </Text>
                            </Box>
                            <Box textAlign="right">
                              <Text fontSize="2xl" fontWeight="bold" color={getBottleneckColor(bottleneck.severity) + '.500'}>
                                {bottleneck.impact}%
                              </Text>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>impact</Text>
                            </Box>
                          </Flex>
                          
                          <Divider mb={3} />
                          
                          <Box bg="blue.50" p={3} borderRadius="md">
                            <HStack mb={1}>
                              <Icon as={FiZap} color="blue.500" />
                              <Text fontWeight="bold" color="blue.700">Recommendation</Text>
                            </HStack>
                            <Text fontSize="sm" color="blue.700">
                              {bottleneck.recommendation}
                            </Text>
                          </Box>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      )}
    </Box>
  );
};

export default IngestionPerformanceAnalytics;
