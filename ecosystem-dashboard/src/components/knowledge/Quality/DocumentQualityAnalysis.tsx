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
  Table,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  TableContainer,
  Select,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiTarget, FiBarChart, FiAlertCircle } from 'react-icons/fi';
import { Line, Radar, Bar } from 'react-chartjs-2';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
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
  RadialLinearScale,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface QualityMetrics {
  overall: number;
  entityDensity: number;
  relationshipQuality: number;
  consistencyScore: number;
  completeness: number;
  duplicateRatio: number;
}

interface DocumentQuality {
  id: string;
  name: string;
  category: string;
  qualityScore: number;
  metrics: QualityMetrics;
  issues: Array<{
    type: 'missing_entities' | 'low_density' | 'inconsistent_naming' | 'poor_relationships';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion: string;
  }>;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

interface QualityTrend {
  timestamp: string;
  overallQuality: number;
  entityDensity: number;
  consistencyScore: number;
  documentsAnalyzed: number;
}

interface CategoryQuality {
  category: string;
  averageQuality: number;
  documentCount: number;
  topIssues: string[];
  improvement: number;
}

const DocumentQualityAnalysis: React.FC = () => {
  const [documentQualities, setDocumentQualities] = useState<DocumentQuality[]>([]);
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [categoryQualities, setCategoryQualities] = useState<CategoryQuality[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const loadQualityAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/knowledge-graph/quality-analysis?category=${selectedCategory}&timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load quality analysis: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setDocumentQualities(result.data.documents);
        setQualityTrends(result.data.trends);
        setCategoryQualities(result.data.categories);
      } else {
        throw new Error(result.message || 'Invalid quality data');
      }
    } catch (err: any) {
      console.error('Error loading quality analysis:', err);
      setError(err.message);
      
      // Generate sample data for development
      generateSampleQualityData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleQualityData = () => {
    const sampleDocuments: DocumentQuality[] = [
      {
        id: 'doc1',
        name: 'Knowledge Graph Architecture',
        category: 'core',
        qualityScore: 94,
        metrics: {
          overall: 94,
          entityDensity: 92,
          relationshipQuality: 96,
          consistencyScore: 98,
          completeness: 89,
          duplicateRatio: 5
        },
        issues: [
          {
            type: 'missing_entities',
            severity: 'low',
            description: 'Could extract more technology entities',
            suggestion: 'Review technology stack mentions for entity extraction'
          }
        ],
        trend: 'improving',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'doc2',
        name: 'Agent Development Environment',
        category: 'agents',
        qualityScore: 78,
        metrics: {
          overall: 78,
          entityDensity: 75,
          relationshipQuality: 82,
          consistencyScore: 73,
          completeness: 80,
          duplicateRatio: 15
        },
        issues: [
          {
            type: 'inconsistent_naming',
            severity: 'medium',
            description: 'Entity naming varies across document',
            suggestion: 'Standardize entity naming conventions'
          },
          {
            type: 'low_density',
            severity: 'medium',
            description: 'Low entity extraction rate',
            suggestion: 'Improve entity detection for agent-specific terms'
          }
        ],
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'doc3',
        name: 'Port Registry Specification',
        category: 'infrastructure',
        qualityScore: 91,
        metrics: {
          overall: 91,
          entityDensity: 95,
          relationshipQuality: 88,
          consistencyScore: 94,
          completeness: 87,
          duplicateRatio: 8
        },
        issues: [
          {
            type: 'poor_relationships',
            severity: 'low',
            description: 'Some port-service relationships unclear',
            suggestion: 'Enhance relationship extraction for port assignments'
          }
        ],
        trend: 'improving',
        lastUpdated: new Date().toISOString()
      }
    ];

    const sampleTrends: QualityTrend[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      sampleTrends.push({
        timestamp: date.toISOString(),
        overallQuality: Math.random() * 10 + 85,
        entityDensity: Math.random() * 15 + 80,
        consistencyScore: Math.random() * 8 + 90,
        documentsAnalyzed: Math.floor(Math.random() * 3) + (7 - i) * 2
      });
    }

    const sampleCategories: CategoryQuality[] = [
      {
        category: 'core',
        averageQuality: 92,
        documentCount: 3,
        topIssues: ['missing_entities', 'poor_relationships'],
        improvement: 5.2
      },
      {
        category: 'agents',
        averageQuality: 76,
        documentCount: 4,
        topIssues: ['inconsistent_naming', 'low_density'],
        improvement: -2.1
      },
      {
        category: 'infrastructure',
        averageQuality: 88,
        documentCount: 2,
        topIssues: ['poor_relationships'],
        improvement: 3.8
      },
      {
        category: 'services',
        averageQuality: 83,
        documentCount: 3,
        topIssues: ['low_density', 'missing_entities'],
        improvement: 1.4
      }
    ];

    setDocumentQualities(sampleDocuments);
    setQualityTrends(sampleTrends);
    setCategoryQualities(sampleCategories);
  };

  useEffect(() => {
    loadQualityAnalysis();
  }, [selectedCategory, timeRange]);

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 75) return 'orange';
    return 'red';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return FiTrendingUp;
      case 'declining': return FiTrendingDown;
      default: return FiTarget;
    }
  };

  const getOverallQuality = () => {
    if (documentQualities.length === 0) return 0;
    return documentQualities.reduce((sum, doc) => sum + doc.qualityScore, 0) / documentQualities.length;
  };

  // Chart data for quality trends
  const trendChartData = {
    labels: qualityTrends.map(t => new Date(t.timestamp).toLocaleDateString()),
    datasets: [
      {
        label: 'Overall Quality',
        data: qualityTrends.map(t => t.overallQuality),
        borderColor: '#4299E1',
        backgroundColor: 'rgba(66, 153, 225, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Entity Density',
        data: qualityTrends.map(t => t.entityDensity),
        borderColor: '#48BB78',
        backgroundColor: 'rgba(72, 187, 120, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Consistency Score',
        data: qualityTrends.map(t => t.consistencyScore),
        borderColor: '#9F7AEA',
        backgroundColor: 'rgba(159, 122, 234, 0.1)',
        tension: 0.3,
      }
    ]
  };

  // Radar chart for quality metrics comparison
  const avgQualityMetrics = documentQualities.length > 0 ? {
    entityDensity: documentQualities.reduce((sum, doc) => sum + doc.metrics.entityDensity, 0) / documentQualities.length,
    relationshipQuality: documentQualities.reduce((sum, doc) => sum + doc.metrics.relationshipQuality, 0) / documentQualities.length,
    consistencyScore: documentQualities.reduce((sum, doc) => sum + doc.metrics.consistencyScore, 0) / documentQualities.length,
    completeness: documentQualities.reduce((sum, doc) => sum + doc.metrics.completeness, 0) / documentQualities.length,
  } : null;

  const radarChartData = avgQualityMetrics ? {
    labels: ['Entity Density', 'Relationship Quality', 'Consistency Score', 'Completeness'],
    datasets: [{
      label: 'Quality Metrics',
      data: [
        avgQualityMetrics.entityDensity,
        avgQualityMetrics.relationshipQuality,
        avgQualityMetrics.consistencyScore,
        avgQualityMetrics.completeness
      ],
      backgroundColor: 'rgba(66, 153, 225, 0.2)',
      borderColor: '#4299E1',
      pointBackgroundColor: '#4299E1',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: '#4299E1'
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

  if (isLoading && documentQualities.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="xl" />
        <Text mt={4}>Analyzing document quality...</Text>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">Document Quality Analysis</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Quality scoring, trend analysis, and improvement recommendations
          </Text>
        </Box>
        <HStack>
          <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} size="sm" width="150px">
            <option value="all">All Categories</option>
            <option value="core">Core</option>
            <option value="agents">Agents</option>
            <option value="services">Services</option>
            <option value="infrastructure">Infrastructure</option>
          </Select>
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="sm" width="100px">
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
          </Select>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadQualityAnalysis}
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
        {/* Quality Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Overall Quality</StatLabel>
                <StatNumber color={getQualityColor(getOverallQuality()) + '.500'}>
                  {getOverallQuality().toFixed(1)}%
                </StatNumber>
                <StatHelpText>
                  <StatArrow type="increase" />
                  Knowledge graph health
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Documents Analyzed</StatLabel>
                <StatNumber>{documentQualities.length}</StatNumber>
                <StatHelpText>
                  Quality assessment complete
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Issues Identified</StatLabel>
                <StatNumber color="orange.500">
                  {documentQualities.reduce((sum, doc) => sum + doc.issues.length, 0)}
                </StatNumber>
                <StatHelpText>
                  Actionable improvements
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Avg Entity Density</StatLabel>
                <StatNumber>
                  {avgQualityMetrics ? avgQualityMetrics.entityDensity.toFixed(1) : 0}%
                </StatNumber>
                <StatHelpText>
                  Extraction effectiveness
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Quality Trends */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Quality Trends</Heading>
            </CardHeader>
            <CardBody>
              <Box height="300px">
                <Line data={trendChartData} options={chartOptions} />
              </Box>
            </CardBody>
          </Card>

          {radarChartData && (
            <Card>
              <CardHeader>
                <Heading size="md">Quality Metrics Breakdown</Heading>
              </CardHeader>
              <CardBody>
                <Box height="300px">
                  <Radar data={radarChartData} options={radarOptions} />
                </Box>
              </CardBody>
            </Card>
          )}
        </SimpleGrid>

        {/* Category Quality Comparison */}
        <Card>
          <CardHeader>
            <Heading size="md">Quality by Category</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Category</Th>
                    <Th>Average Quality</Th>
                    <Th>Documents</Th>
                    <Th>Top Issues</Th>
                    <Th>Improvement</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {categoryQualities.map((category) => (
                    <Tr key={category.category}>
                      <Td>
                        <Text fontWeight="bold" textTransform="capitalize">
                          {category.category}
                        </Text>
                      </Td>
                      <Td>
                        <Flex align="center" gap={2}>
                          <Badge colorScheme={getQualityColor(category.averageQuality)}>
                            {category.averageQuality.toFixed(1)}%
                          </Badge>
                          <Progress 
                            value={category.averageQuality} 
                            size="sm" 
                            width="60px"
                            colorScheme={getQualityColor(category.averageQuality)}
                          />
                        </Flex>
                      </Td>
                      <Td>{category.documentCount}</Td>
                      <Td>
                        <HStack wrap="wrap" spacing={1}>
                          {category.topIssues.slice(0, 2).map((issue, idx) => (
                            <Badge key={idx} size="sm" colorScheme="gray">
                              {issue.replace('_', ' ')}
                            </Badge>
                          ))}
                        </HStack>
                      </Td>
                      <Td>
                        <Flex align="center" gap={1}>
                          <Icon 
                            as={category.improvement > 0 ? FiTrendingUp : FiTrendingDown} 
                            color={category.improvement > 0 ? 'green.500' : 'red.500'}
                          />
                          <Text 
                            color={category.improvement > 0 ? 'green.500' : 'red.500'}
                            fontSize="sm"
                          >
                            {category.improvement > 0 ? '+' : ''}{category.improvement.toFixed(1)}%
                          </Text>
                        </Flex>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>

        {/* Document Quality Details */}
        <Card>
          <CardHeader>
            <Heading size="md">Document Quality Details</Heading>
          </CardHeader>
          <CardBody>
            <Accordion allowMultiple>
              {documentQualities.map((doc) => (
                <AccordionItem key={doc.id}>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      <Flex align="center" gap={3}>
                        <Icon as={getTrendIcon(doc.trend)} />
                        <Text fontWeight="bold">{doc.name}</Text>
                        <Badge colorScheme="blue">{doc.category}</Badge>
                        <Badge colorScheme={getQualityColor(doc.qualityScore)}>
                          {doc.qualityScore}%
                        </Badge>
                        {doc.issues.length > 0 && (
                          <Badge colorScheme="orange">{doc.issues.length} issues</Badge>
                        )}
                      </Flex>
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={4}>
                    <VStack align="stretch" spacing={4}>
                      {/* Quality Metrics */}
                      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">Entity Density</Text>
                          <Progress value={doc.metrics.entityDensity} size="sm" colorScheme="blue" />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{doc.metrics.entityDensity}%</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">Relationships</Text>
                          <Progress value={doc.metrics.relationshipQuality} size="sm" colorScheme="green" />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{doc.metrics.relationshipQuality}%</Text>
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">Consistency</Text>
                          <Progress value={doc.metrics.consistencyScore} size="sm" colorScheme="purple" />
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{doc.metrics.consistencyScore}%</Text>
                        </Box>
                      </SimpleGrid>

                      {/* Issues and Recommendations */}
                      {doc.issues.length > 0 && (
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" mb={2}>Issues & Recommendations</Text>
                          <List spacing={2}>
                            {doc.issues.map((issue, idx) => (
                              <ListItem key={idx}>
                                <ListIcon 
                                  as={FiAlertCircle} 
                                  color={getSeverityColor(issue.severity) + '.500'} 
                                />
                                <VStack align="start" spacing={1} display="inline-block">
                                  <Text fontSize="sm">
                                    <Badge colorScheme={getSeverityColor(issue.severity)} size="sm" mr={2}>
                                      {issue.severity}
                                    </Badge>
                                    {issue.description}
                                  </Text>
                                  <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontStyle="italic">
                                    💡 {issue.suggestion}
                                  </Text>
                                </VStack>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default DocumentQualityAnalysis;
