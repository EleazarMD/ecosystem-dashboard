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
  Table,
  Tbody,
  Tr,
  Td,
  TableContainer,
  Progress,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
  Select,
} from '@chakra-ui/react';
import { FiRefreshCw, FiTarget, FiGitBranch, FiUsers, FiTrendingUp } from 'react-icons/fi';
import { Bar, Radar } from 'react-chartjs-2';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface EntityAnalysis {
  id: string;
  name: string;
  type: string;
  centralityScore: number;
  connections: number;
  influence: number;
  documentReach: number;
  cluster?: string;
  importance: 'high' | 'medium' | 'low';
}

interface ClusterAnalysis {
  id: string;
  name: string;
  entities: string[];
  centralNode: string;
  cohesion: number;
  size: number;
  category: string;
}

interface NetworkMetrics {
  density: number;
  clustering: number;
  avgPathLength: number;
  modularity: number;
  components: number;
}

const EntityNetworkAnalysis: React.FC = () => {
  const [entityAnalysis, setEntityAnalysis] = useState<EntityAnalysis[]>([]);
  const [clusters, setClusters] = useState<ClusterAnalysis[]>([]);
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'centrality' | 'clusters' | 'influence'>('centrality');
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const loadNetworkAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge-graph/network-analysis');
      
      if (!response.ok) {
        throw new Error(`Failed to load network analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setEntityAnalysis(result.data.entities);
        setClusters(result.data.clusters);
        setNetworkMetrics(result.data.metrics);
      } else {
        throw new Error(result.message || 'Invalid data format');
      }
    } catch (err: any) {
      console.error('Error loading network analysis:', err);
      setError(err.message);
      
      // Load sample data for development
      generateSampleAnalysis();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleAnalysis = () => {
    // Generate sample entity analysis based on current knowledge graph
    const sampleEntities: EntityAnalysis[] = [
      {
        id: 'Service_KnowledgeGraph',
        name: 'Knowledge Graph',
        type: 'Service',
        centralityScore: 0.95,
        connections: 12,
        influence: 0.88,
        documentReach: 8,
        cluster: 'core-services',
        importance: 'high'
      },
      {
        id: 'Port_8080',
        name: 'Port 8080',
        type: 'Port',
        centralityScore: 0.87,
        connections: 9,
        influence: 0.75,
        documentReach: 6,
        cluster: 'infrastructure',
        importance: 'high'
      },
      {
        id: 'Service_Gateway',
        name: 'AI Gateway',
        type: 'Service',
        centralityScore: 0.82,
        connections: 11,
        influence: 0.79,
        documentReach: 7,
        cluster: 'core-services',
        importance: 'high'
      },
      {
        id: 'Port_8765',
        name: 'Port 8765',
        type: 'Port',
        centralityScore: 0.73,
        connections: 7,
        influence: 0.68,
        documentReach: 5,
        cluster: 'infrastructure',
        importance: 'medium'
      },
      {
        id: 'Technology_Neo4j',
        name: 'Neo4j',
        type: 'Technology',
        centralityScore: 0.68,
        connections: 6,
        influence: 0.72,
        documentReach: 4,
        cluster: 'databases',
        importance: 'medium'
      },
      {
        id: 'Service_Dashboard',
        name: 'Ecosystem Dashboard',
        type: 'Service',
        centralityScore: 0.64,
        connections: 8,
        influence: 0.61,
        documentReach: 5,
        cluster: 'monitoring',
        importance: 'medium'
      }
    ];

    const sampleClusters: ClusterAnalysis[] = [
      {
        id: 'core-services',
        name: 'Core Services',
        entities: ['Service_KnowledgeGraph', 'Service_Gateway', 'Service_Orchestrator'],
        centralNode: 'Service_KnowledgeGraph',
        cohesion: 0.89,
        size: 3,
        category: 'services'
      },
      {
        id: 'infrastructure',
        name: 'Infrastructure',
        entities: ['Port_8080', 'Port_8765', 'Port_8404'],
        centralNode: 'Port_8080',
        cohesion: 0.76,
        size: 3,
        category: 'infrastructure'
      },
      {
        id: 'databases',
        name: 'Data Layer',
        entities: ['Technology_Neo4j', 'Technology_PostgreSQL', 'Technology_Redis'],
        centralNode: 'Technology_Neo4j',
        cohesion: 0.82,
        size: 3,
        category: 'technology'
      },
      {
        id: 'monitoring',
        name: 'Monitoring & Analytics',
        entities: ['Service_Dashboard', 'Service_Metrics'],
        centralNode: 'Service_Dashboard',
        cohesion: 0.71,
        size: 2,
        category: 'monitoring'
      }
    ];

    const sampleMetrics: NetworkMetrics = {
      density: 0.34,
      clustering: 0.67,
      avgPathLength: 2.8,
      modularity: 0.45,
      components: 3
    };

    setEntityAnalysis(sampleEntities);
    setClusters(sampleClusters);
    setNetworkMetrics(sampleMetrics);
  };

  useEffect(() => {
    loadNetworkAnalysis();
  }, []);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getTopEntities = (type: 'centrality' | 'influence' | 'connections') => {
    return entityAnalysis
      .sort((a, b) => {
        switch (type) {
          case 'centrality': return b.centralityScore - a.centralityScore;
          case 'influence': return b.influence - a.influence;
          case 'connections': return b.connections - a.connections;
          default: return 0;
        }
      })
      .slice(0, 10);
  };

  // Chart data for centrality analysis
  const centralityChartData = {
    labels: getTopEntities('centrality').map(e => e.name),
    datasets: [{
      label: 'Centrality Score',
      data: getTopEntities('centrality').map(e => e.centralityScore * 100),
      backgroundColor: 'rgba(66, 153, 225, 0.6)',
      borderColor: '#4299E1',
      borderWidth: 1,
    }]
  };

  // Chart data for network metrics
  const networkMetricsData = networkMetrics ? {
    labels: ['Density', 'Clustering', 'Modularity', 'Connectivity'],
    datasets: [{
      label: 'Network Health',
      data: [
        networkMetrics.density * 100,
        networkMetrics.clustering * 100,
        networkMetrics.modularity * 100,
        (1 / Math.max(1, networkMetrics.avgPathLength)) * 100
      ],
      backgroundColor: 'rgba(159, 122, 234, 0.2)',
      borderColor: '#9F7AEA',
      pointBackgroundColor: '#9F7AEA',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#9F7AEA'
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  if (isLoading && entityAnalysis.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Analyzing entity network...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Entity Network Analysis</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Centrality analysis, clustering, and influence mapping
          </Text>
        </Box>
        <HStack>
          <Select value={analysisType} onChange={(e) => setAnalysisType(e.target.value as any)} size="sm" width="200px">
            <option value="centrality">Centrality Analysis</option>
            <option value="clusters">Cluster Analysis</option>
            <option value="influence">Influence Mapping</option>
          </Select>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadNetworkAnalysis}
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

      <VStack spacing={6} align="stretch">
        {/* Network Health Metrics */}
        {networkMetrics && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                  {(networkMetrics.density * 100).toFixed(1)}%
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Network Density</Text>
                <Progress value={networkMetrics.density * 100} size="sm" colorScheme="blue" mt={2} />
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="green.500">
                  {(networkMetrics.clustering * 100).toFixed(1)}%
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Clustering Coefficient</Text>
                <Progress value={networkMetrics.clustering * 100} size="sm" colorScheme="green" mt={2} />
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                  {networkMetrics.avgPathLength.toFixed(1)}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Avg Path Length</Text>
              </CardBody>
            </Card>

            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                  {networkMetrics.components}
                </Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Connected Components</Text>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Analysis Content Based on Type */}
        {analysisType === 'centrality' && (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Centrality Chart */}
            <Card>
              <CardHeader>
                <Heading size="md">Entity Centrality Ranking</Heading>
              </CardHeader>
              <CardBody>
                <Box height="300px">
                  <Bar data={centralityChartData} options={chartOptions} />
                </Box>
              </CardBody>
            </Card>

            {/* Top Entities Table */}
            <Card>
              <CardHeader>
                <Heading size="md">Most Central Entities</Heading>
              </CardHeader>
              <CardBody>
                <TableContainer>
                  <Table size="sm">
                    <Tbody>
                      {getTopEntities('centrality').slice(0, 8).map((entity, index) => (
                        <Tr key={entity.id}>
                          <Td>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="sm">{entity.name}</Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{entity.type}</Text>
                            </VStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={getImportanceColor(entity.importance)}>
                              {entity.importance}
                            </Badge>
                          </Td>
                          <Td isNumeric>
                            <Text fontWeight="bold">{(entity.centralityScore * 100).toFixed(0)}%</Text>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {analysisType === 'clusters' && (
          <Card>
            <CardHeader>
              <Heading size="md">Entity Clusters</Heading>
            </CardHeader>
            <CardBody>
              <Accordion allowMultiple>
                {clusters.map((cluster) => (
                  <AccordionItem key={cluster.id}>
                    <AccordionButton>
                      <Box flex="1" textAlign="left">
                        <Flex align="center" gap={3}>
                          <Icon as={FiUsers} />
                          <Text fontWeight="bold">{cluster.name}</Text>
                          <Badge colorScheme="blue">{cluster.size} entities</Badge>
                          <Badge colorScheme="green">{(cluster.cohesion * 100).toFixed(0)}% cohesion</Badge>
                        </Flex>
                      </Box>
                      <AccordionIcon />
                    </AccordionButton>
                    <AccordionPanel pb={4}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          <strong>Central Node:</strong> {cluster.centralNode}
                        </Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          <strong>Category:</strong> {cluster.category}
                        </Text>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" mb={2}>Entities in this cluster:</Text>
                          <HStack wrap="wrap" spacing={2}>
                            {cluster.entities.map((entityId) => {
                              const entity = entityAnalysis.find(e => e.id === entityId);
                              return (
                                <Badge 
                                  key={entityId} 
                                  colorScheme={entity?.id === cluster.centralNode ? "purple" : "gray"}
                                >
                                  {entity?.name || entityId}
                                </Badge>
                              );
                            })}
                          </HStack>
                        </Box>
                      </VStack>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardBody>
          </Card>
        )}

        {analysisType === 'influence' && (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Network Health Radar */}
            {networkMetricsData && (
              <Card>
                <CardHeader>
                  <Heading size="md">Network Health Profile</Heading>
                </CardHeader>
                <CardBody>
                  <Box height="300px">
                    <Radar data={networkMetricsData} options={radarOptions} />
                  </Box>
                </CardBody>
              </Card>
            )}

            {/* Influence Leaders */}
            <Card>
              <CardHeader>
                <Heading size="md">Influence Leaders</Heading>
              </CardHeader>
              <CardBody>
                <VStack spacing={3} align="stretch">
                  {getTopEntities('influence').slice(0, 6).map((entity, index) => (
                    <Box key={entity.id} p={3} bg={cardBg} borderRadius="md">
                      <Flex justify="space-between" align="center">
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="bold">{entity.name}</Text>
                          <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{entity.type}</Text>
                        </VStack>
                        <VStack align="end" spacing={0}>
                          <Text fontSize="sm" fontWeight="bold">
                            {(entity.influence * 100).toFixed(0)}%
                          </Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {entity.documentReach} docs
                          </Text>
                        </VStack>
                      </Flex>
                      <Progress 
                        value={entity.influence * 100} 
                        size="sm" 
                        colorScheme="purple" 
                        mt={2}
                      />
                    </Box>
                  ))}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        )}

        {/* Key Insights */}
        <Card>
          <CardHeader>
            <Heading size="md">Network Analysis Insights</Heading>
          </CardHeader>
          <CardBody>
            <List spacing={2}>
              <ListItem>
                <ListIcon as={FiTarget} color="green.500" />
                <strong>Knowledge Graph Service</strong> is the most central entity with 95% centrality score
              </ListItem>
              <ListItem>
                <ListIcon as={FiGitBranch} color="blue.500" />
                <strong>{clusters.length} distinct clusters</strong> identified with average cohesion of {clusters.length > 0 ? (clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length * 100).toFixed(0) : 0}%
              </ListItem>
              <ListItem>
                <ListIcon as={FiTrendingUp} color="purple.500" />
                <strong>Port entities</strong> show high infrastructure connectivity across the ecosystem
              </ListItem>
              <ListItem>
                <ListIcon as={FiUsers} color="orange.500" />
                Core services cluster shows the highest cohesion at {clusters.find(c => c.id === 'core-services')?.cohesion ? (clusters.find(c => c.id === 'core-services')!.cohesion * 100).toFixed(0) : 89}%
              </ListItem>
            </List>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default EntityNetworkAnalysis;
