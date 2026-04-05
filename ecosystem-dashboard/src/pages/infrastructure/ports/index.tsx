import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import {
  Container,
  Heading,
  Spinner,
  Card,
  CardBody,
  Grid,
  Box,
  Tag,
  Text,
  Alert,
  AlertIcon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  HStack,
  VStack,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Flex,
  Tooltip,
  Icon,
  Divider,
  SimpleGrid
} from '@chakra-ui/react';
import StatWrapper from '@/components/ui/StatWrapper';
import { FiInfo, FiAlertTriangle, FiCheckCircle, FiActivity } from 'react-icons/fi';
import { portRegistryApi } from '../../../lib/api';
import { formatDateTime } from '@/lib/utils';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Types for port registry data
interface PortData {
  port: number;
  service: string;
  component: string;
  description: string;
  environment_variable: string;
  docker_service: string;
  status: string;
}

interface PortStats {
  totalPorts: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
  byRange: Record<string, number>;
  lastUpdated: string;
  registryVersion: string;
}

interface PortAnalysis {
  totalPorts: number;
  standardCompliant: number;
  nonStandardPorts: Array<{
    port: number;
    service: string;
    currentRange: string;
    recommendedRange: string;
    serviceType: string;
  }>;
  portConflicts: Array<{
    port: number;
    services: Array<{
      service: string;
      component: string;
      status: string;
    }>;
  }>;
  migrationRecommendations: Array<{
    currentPort: number;
    service: string;
    serviceType: string;
    recommendedRange: string;
    migrationImpact: string;
    reason?: string;
  }>;
  compliancePercentage: number;
}

const PortRegistryPage: NextPage = () => {
  // State for port data
  const [ports, setPorts] = useState<PortData[] | null>(null);
  const [portStats, setPortStats] = useState<PortStats | null>(null);
  const [portAnalysis, setPortAnalysis] = useState<PortAnalysis | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Color mode values
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Fetch port registry data
  useEffect(() => {
    const fetchPortData = async () => {
      try {
        setLoading(true);
        
        // Fetch ports and stats in parallel
        const [portsResponse, statsResponse] = await Promise.all([
          portRegistryApi.getAllPorts(),
          portRegistryApi.getPortStats()
        ]);
        
        if (portsResponse.success && portsResponse.data) {
          setPorts(portsResponse.data);
        } else {
          setError('Failed to fetch port registry data');
        }
        
        if (statsResponse.success && statsResponse.data) {
          setPortStats(statsResponse.data);
        }
      } catch (e: any) {
        console.error('Error fetching port registry data:', e);
        setError(e.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPortData();
  }, []);
  
  // Function to analyze port assignments
  const analyzePortAssignments = async () => {
    try {
      setAnalyzing(true);
      setAnalysisError(null);
      
      const response = await portRegistryApi.analyzePortAssignments();
      
      if (response.success && response.analysis) {
        setPortAnalysis(response.analysis);
      } else {
        setAnalysisError('Failed to analyze port assignments');
      }
    } catch (e: any) {
      console.error('Error analyzing port assignments:', e);
      setAnalysisError(e.message || 'An unexpected error occurred');
    } finally {
      setAnalyzing(false);
    }
  };
  
  // Get impact color based on migration impact
  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'low':
        return 'green';
      case 'medium':
        return 'yellow';
      case 'high':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  // Get status color based on port status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'green';
      case 'planned':
        return 'blue';
      case 'deprecated':
        return 'orange';
      case 'reserved':
        return 'purple';
      default:
        return 'gray';
    }
  };

  return (
    <>
      <Head>
        <title>Port Registry | AI Homelab Dashboard</title>
      </Head>
      
      <Container maxW="container.xl" py={6}>
        <Heading as="h1" size="xl" mb={6}>Port Registry</Heading>
        
        {loading ? (
          <Flex justify="center" align="center" minH="300px" direction="column">
            <Spinner size="xl" mb={4} />
            <Text>Loading port registry data...</Text>
          </Flex>
        ) : error ? (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        ) : (
          <>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList mb={4}>
                <Tab>Overview</Tab>
                <Tab>Compliance</Tab>
                <Tab>Registry</Tab>
              </TabList>
              
              <TabPanels>
                {/* Overview Tab */}
                <TabPanel>
                  <Box mb={4}>
                    <Heading as="h2" size="lg" mb={2}>Port Registry Overview</Heading>
                    <Text mb={4}>
                      The port registry tracks all ports used across the AI Homelab ecosystem to prevent conflicts and ensure consistent service configuration.
                    </Text>
                  </Box>
                  
                  {portStats && (
                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={6} mb={6}>
                      <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                          <StatWrapper>
                            <StatLabel>Total Registered Ports</StatLabel>
                            <StatNumber>{portStats.totalPorts}</StatNumber>
                            <StatHelpText>
                              <HStack spacing={1}>
                                <Icon as={FiActivity} />
                                <Text>{`Last updated: ${formatDateTime(portStats.lastUpdated)}`}</Text>
                              </HStack>
                            </StatHelpText>
                          </StatWrapper>
                        </CardBody>
                      </Card>
                      
                      <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                          <StatWrapper>
                            <StatLabel>Registry Version</StatLabel>
                            <StatNumber>{portStats.registryVersion}</StatNumber>
                            <StatHelpText>
                              <HStack spacing={1}>
                                <Icon as={FiInfo} />
                                <Text>Standardized port ranges</Text>
                              </HStack>
                            </StatHelpText>
                          </StatWrapper>
                        </CardBody>
                      </Card>
                      
                      <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                          <StatWrapper>
                            <StatLabel>Service Types</StatLabel>
                            <StatNumber>{Object.keys(portStats.byService).length}</StatNumber>
                            <StatHelpText>
                              <HStack spacing={1}>
                                <Icon as={FiCheckCircle} />
                                <Text>Distinct service categories</Text>
                              </HStack>
                            </StatHelpText>
                          </StatWrapper>
                        </CardBody>
                      </Card>
                    </Grid>
                  )}
                  
                  {/* Visualizations */}
                  <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} mb={8}>
                    <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                      <CardBody>
                        <h3 style={{ marginBottom: '16px' }}>Distribution by Service Type</h3>
                        <div style={{ height: '300px' }}>
                          {portStats && portStats.byService && (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={Object.entries(portStats.byService).map(([type, count]) => ({
                                  name: type,
                                  count: count
                                }))}
                                margin={{ top: 5, right: 30, left: 20, bottom: 70 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                                <YAxis />
                                <RechartsTooltip 
                                  formatter={(value: any) => [`${value} ports`, "Count"]} 
                                  labelFormatter={(label: any) => `Service Type: ${label}`}
                                />
                                <Bar dataKey="count" fill="#3182CE" name="Number of Ports" />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                          <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '8px', textAlign: 'center' }}>
                            Distribution of ports across different service types in the ecosystem.
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                    
                    <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                      <CardBody>
                        <h3 style={{ marginBottom: '16px' }}>Distribution by Status</h3>
                        <div style={{ height: '300px' }}>
                          {portStats && portStats.byStatus && (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={Object.entries(portStats.byStatus).map(([status, count]) => ({
                                    name: status,
                                    value: count
                                  }))}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={true}
                                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {Object.entries(portStats.byStatus).map(([status], index) => {
                                    const COLORS = ['#38A169', '#3182CE', '#DD6B20', '#805AD5'];
                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                  })}
                                </Pie>
                                <RechartsTooltip formatter={(value: any) => [`${value} ports`, 'Count']} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                          <div style={{ fontSize: '0.875rem', color: '#718096', marginTop: '8px', textAlign: 'center' }}>
                            Distribution of ports by their current status.
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </Grid>
                </TabPanel>
                
                {/* Compliance Tab */}
                <TabPanel>
                  <Box mb={4}>
                    <Heading as="h2" size="lg" mb={2}>Port Compliance</Heading>
                    <Text mb={4}>Analyze port assignments for compliance with standardized ranges.</Text>
                    
                    <Button 
                      colorScheme="blue" 
                      mb={4} 
                      onClick={analyzePortAssignments}
                      isLoading={analyzing}
                      loadingText="Analyzing"
                    >
                      Analyze Port Assignments
                    </Button>
                  </Box>
                  
                  {analysisError && (
                    <Alert status="error" mb={6}>
                      <AlertIcon />
                      {analysisError}
                    </Alert>
                  )}
                  
                  {portAnalysis ? (
                    <>
                      <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px" mb={6}>
                        <CardBody>
                          <Heading as="h3" size="md" mb={4}>Compliance Overview</Heading>
                          
                          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
                            <Box>
                              <Text mb={2}>Port compliance with standardized ranges:</Text>
                              <Progress
                                value={portAnalysis.compliancePercentage}
                                size="lg"
                                colorScheme={portAnalysis.compliancePercentage >= 75 ? "green" : portAnalysis.compliancePercentage >= 50 ? "yellow" : "red"}
                                borderRadius="md"
                              />
                              <Text mt={2} fontSize="sm" color={useSemanticToken('text.secondary')}>
                                {portAnalysis.standardCompliant} of {portAnalysis.totalPorts} ports ({portAnalysis.compliancePercentage}%) follow standardized ranges
                              </Text>
                            </Box>
                            
                            <div style={{ height: '200px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Compliant', value: portAnalysis.standardCompliant },
                                      { name: 'Non-Compliant', value: portAnalysis.totalPorts - portAnalysis.standardCompliant }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    <Cell fill="#38A169" />
                                    <Cell fill="#E53E3E" />
                                  </Pie>
                                  <RechartsTooltip formatter={(value: any) => [`${value} ports`, 'Count']} />
                                  <Legend />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          </Grid>
                        </CardBody>
                      </Card>
                      
                      {/* Migration Recommendations */}
                      {portAnalysis.migrationRecommendations.length > 0 && (
                        <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px" mb={6}>
                          <CardBody>
                            <Heading as="h3" size="md" mb={4}>Migration Recommendations</Heading>
                            
                            <Table variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Service</Th>
                                  <Th>Current Port</Th>
                                  <Th>Service Type</Th>
                                  <Th>Recommended Range</Th>
                                  <Th>Impact</Th>
                                  <Th>Reason</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {portAnalysis.migrationRecommendations.map((rec, index) => (
                                  <Tr key={index}>
                                    <Td fontWeight="bold">{rec.service}</Td>
                                    <Td>{rec.currentPort}</Td>
                                    <Td>{rec.serviceType}</Td>
                                    <Td>{rec.recommendedRange}</Td>
                                    <Td>
                                      <Badge colorScheme={getImpactColor(rec.migrationImpact)}>
                                        {rec.migrationImpact}
                                      </Badge>
                                    </Td>
                                    <Td>{rec.reason || 'Non-standard port'}</Td>
                                  </Tr>
                                ))}
                              </Tbody>
                            </Table>
                          </CardBody>
                        </Card>
                      )}
                      
                      {/* Port Conflicts */}
                      {portAnalysis.portConflicts.length > 0 && (
                        <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                          <CardBody>
                            <Heading as="h3" size="md" mb={4}>Port Conflicts</Heading>
                            
                            <VStack spacing={4} align="stretch">
                              {portAnalysis.portConflicts.map((conflict) => (
                                <Box key={conflict.port} p={4} borderWidth="1px" borderRadius="md" borderColor="red.300" bg="red.50">
                                  <Flex align="center" mb={2}>
                                    <Icon as={FiAlertTriangle} color="red.500" mr={2} />
                                    <Heading as="h4" size="sm">Conflict on Port {conflict.port}</Heading>
                                  </Flex>
                                  
                                  <Text mb={2}>The following services are using the same port:</Text>
                                  
                                  <VStack spacing={2} align="stretch" pl={4}>
                                    {conflict.services.map((service, index) => (
                                      <HStack key={index} spacing={2}>
                                        <Badge colorScheme={getStatusColor(service.status)}>{service.status}</Badge>
                                        <Text fontWeight="bold">{service.service}</Text>
                                        <Text>({service.component})</Text>
                                      </HStack>
                                    ))}
                                  </VStack>
                                </Box>
                              ))}
                            </VStack>
                          </CardBody>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                      <CardBody>
                        <Flex direction="column" align="center" justify="center" py={8}>
                          <Icon as={FiInfo} boxSize={12} color="blue.500" mb={4} />
                          <Heading as="h3" size="md" mb={2} textAlign="center">Port Compliance Analysis</Heading>
                          <Text textAlign="center" mb={4}>
                            Click the "Analyze Port Assignments" button to check compliance with standardized port ranges
                            and get migration recommendations.
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  )}
                </TabPanel>
                
                {/* Registry Tab */}
                <TabPanel>
                  <Box mb={4}>
                    <Heading as="h2" size="lg" mb={2}>Port Registry</Heading>
                    <Text mb={4}>Complete list of registered ports in the AI Homelab ecosystem.</Text>
                  </Box>
                  
                  {ports && ports.length > 0 ? (
                    <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                      <CardBody>
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Port</Th>
                              <Th>Service</Th>
                              <Th>Component</Th>
                              <Th>Status</Th>
                              <Th>Description</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {ports.map((port) => (
                              <Tr key={port.port}>
                                <Td fontWeight="bold">{port.port}</Td>
                                <Td>{port.service}</Td>
                                <Td>{port.component}</Td>
                                <Td>
                                  <Badge colorScheme={getStatusColor(port.status)}>
                                    {port.status}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Tooltip label={port.description} placement="top">
                                    <Text noOfLines={1}>{port.description}</Text>
                                  </Tooltip>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </CardBody>
                    </Card>
                  ) : (
                    <Card bg={cardBg} boxShadow="md" borderColor={borderColor} borderWidth="1px">
                      <CardBody>
                        <Flex direction="column" align="center" justify="center" py={8}>
                          <Icon as={FiInfo} boxSize={12} color="blue.500" mb={4} />
                          <Heading as="h3" size="md" mb={2} textAlign="center">No Ports Registered</Heading>
                          <Text textAlign="center" mb={4}>
                            There are currently no ports registered in the system.
                          </Text>
                        </Flex>
                      </CardBody>
                    </Card>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </>
        )}
      </Container>
    </>
  );
};

export default PortRegistryPage;
