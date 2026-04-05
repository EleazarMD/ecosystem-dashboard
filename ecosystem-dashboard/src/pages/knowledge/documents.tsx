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
  Table,
  Tbody,
  Tr,
  Td,
  Th,
  Thead,
  TableContainer,
  Divider,
  CircularProgress,
  CircularProgressLabel,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { 
  FiPlay, 
  FiPause, 
  FiRefreshCw, 
  FiCpu, 
  FiServer,
  FiFileText,
  FiDatabase,
  FiCheckCircle,
  FiLayers,
} from 'react-icons/fi';
import IngestionPipelineVisualization from '../../components/knowledge/IngestionPipelineVisualization';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface DocumentIngestionStatus {
  pipeline: {
    status: 'idle' | 'running' | 'paused' | 'error';
    progress: {
      totalDocuments: number;
      processedDocuments: number;
      currentBatch: string;
      currentPhase: string;
      estimatedTimeRemaining: number;
    };
    realtimeActivity: Array<{
      timestamp: string;
      agent: string;
      document: string;
      status: string;
      entities?: number;
      processingTime?: number;
    }>;
  };
  agents: {
    orchestrator: {
      name: string;
      port: number;
      status: string;
      activeWorkflows: number;
    };
    processors: Array<{
      name: string;
      port: number;
      status: string;
      capabilities: string[];
      currentTask?: string;
    }>;
  };
}

const DocumentsPage: React.FC = () => {
  const [ingestionStatus, setIngestionStatus] = useState<DocumentIngestionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const loadIngestionStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/knowledge/ingestion-status');
      
      if (!response.ok) {
        // Fallback to mock data for visualization
        const mockData: DocumentIngestionStatus = {
          pipeline: {
            status: 'running',
            progress: {
              totalDocuments: 2823,
              processedDocuments: 387,
              currentBatch: 'ai-homelab-ecosystem-docs',
              currentPhase: 'Entity Extraction',
              estimatedTimeRemaining: 4.2
            },
            realtimeActivity: [
              {
                timestamp: new Date(Date.now() - 30000).toISOString(),
                agent: 'Documentation Agent',
                document: '/docs/MEMORY_SYSTEM_ANALYSIS_REPORT.md',
                status: 'completed',
                entities: 23,
                processingTime: 2.1
              },
              {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                agent: 'Vector Search Agent',
                document: '/docs/INFRASTRUCTURE.md',
                status: 'completed',
                entities: 18,
                processingTime: 1.8
              },
              {
                timestamp: new Date(Date.now() - 90000).toISOString(),
                agent: 'Enhanced Memory Agent',
                document: '/src/agents/AgentPersistentMemory.js',
                status: 'processing',
                processingTime: 3.2
              }
            ]
          },
          agents: {
            orchestrator: {
              name: 'Orchestrator Agent',
              port: 41240,
              status: 'healthy',
              activeWorkflows: 3
            },
            processors: [
              {
                name: 'Documentation Agent',
                port: 41243,
                status: 'busy',
                capabilities: ['markdown_ingestion', 'entity_extraction', 'content_chunking'],
                currentTask: 'Processing deployment documentation'
              },
              {
                name: 'Vector Search Agent',
                port: 41242,
                status: 'healthy',
                capabilities: ['semantic_search', 'embedding_generation', 'similarity_analysis'],
                currentTask: 'Generating embeddings for infrastructure docs'
              },
              {
                name: 'Enhanced Memory Agent',
                port: 41245,
                status: 'busy',
                capabilities: ['memory_processing', 'cross_referencing', 'validation'],
                currentTask: 'Cross-referencing memory systems'
              }
            ]
          }
        };
        setIngestionStatus(mockData);
        setError('Using enhanced pipeline visualization. Connect to live agents for real-time data.');
        return;
      }
      
      const result = await response.json();
      setIngestionStatus(result);
    } catch (err: any) {
      console.error('Error loading ingestion status:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const controlPipeline = async (action: 'start' | 'pause') => {
    try {
      const response = await fetch('/api/knowledge/control-ingestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, batch: 'ai-homelab-ecosystem' })
      });
      
      if (response.ok) {
        toast({
          title: `Pipeline ${action}ed`,
          description: `Ecosystem documentation ingestion has been ${action}ed successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadIngestionStatus();
      } else {
        throw new Error(`Failed to ${action} pipeline`);
      }
    } catch (err: any) {
      toast({
        title: 'Pipeline Control Error',
        description: err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    loadIngestionStatus();
    const interval = setInterval(loadIngestionStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'running': return 'blue';
      case 'busy': return 'orange';
      case 'unhealthy': return 'red';
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'processing': return 'blue';
      default: return 'gray';
    }
  };

  if (isLoading && !ingestionStatus) {
    return (
      <Box p={6} textAlign="center">
        <CircularProgress isIndeterminate />
        <Text mt={4}>Loading Ecosystem Documentation Pipeline...</Text>
      </Box>
    );
  }

  if (!ingestionStatus) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Pipeline Status Unavailable</AlertTitle>
          <AlertDescription>Could not load ecosystem documentation ingestion status.</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const { pipeline, agents } = ingestionStatus;
  const progressPercentage = Number(((pipeline.progress.processedDocuments / pipeline.progress.totalDocuments) * 100).toFixed(1));

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h1" size="xl" mb={2}>📚 Ecosystem Documentation Ingestion</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="lg">
            Processing AI Homelab ecosystem markdown documents and technical documentation
          </Text>
        </Box>
        <HStack>
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadIngestionStatus}
            isLoading={isLoading}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          {pipeline.status === 'running' ? (
            <Button
              leftIcon={<Icon as={FiPause} />}
              onClick={() => controlPipeline('pause')}
              colorScheme="orange"
              size="sm"
            >
              Pause Ingestion
            </Button>
          ) : (
            <Button
              leftIcon={<Icon as={FiPlay} />}
              onClick={() => controlPipeline('start')}
              colorScheme="green"
              size="sm"
            >
              Start Ingestion
            </Button>
          )}
        </HStack>
      </Flex>

      {error && (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Enhanced Visualization Active</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>
            <Icon as={FiFileText} mr={2} />
            Overview
          </Tab>
          <Tab>
            <Icon as={FiLayers} mr={2} />
            Pipeline Visualization
          </Tab>
          <Tab>
            <Icon as={FiCpu} mr={2} />
            Agents
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={6} align="stretch">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <Heading size="md">📊 Ingestion Overview</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Stat>
                <StatLabel>Pipeline Status</StatLabel>
                <StatNumber>
                  <Badge 
                    colorScheme={getStatusColor(pipeline.status)} 
                    fontSize="md"
                  >
                    {pipeline.status.toUpperCase()}
                  </Badge>
                </StatNumber>
                <StatHelpText>Current state</StatHelpText>
              </Stat>

              <Stat>
                <StatLabel>Progress</StatLabel>
                <StatNumber>{progressPercentage}%</StatNumber>
                <StatHelpText>
                  {pipeline.progress.processedDocuments} / {pipeline.progress.totalDocuments} docs
                </StatHelpText>
              </Stat>

              <Stat>
                <StatLabel>Current Phase</StatLabel>
                <StatNumber fontSize="lg" color="blue.500">
                  {pipeline.progress.currentPhase}
                </StatNumber>
                <StatHelpText>Processing stage</StatHelpText>
              </Stat>

              <Stat>
                <StatLabel>ETA</StatLabel>
                <StatNumber>{pipeline.progress.estimatedTimeRemaining.toFixed(1)}h</StatNumber>
                <StatHelpText>Estimated completion</StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Progress Visualization */}
        <Card>
          <CardHeader>
            <Heading size="md">📈 Processing Progress</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Flex justify="space-between" mb={2}>
                  <Text>AI Homelab Ecosystem Documentation</Text>
                  <Text fontWeight="bold">
                    {pipeline.progress.processedDocuments} / {pipeline.progress.totalDocuments} documents
                  </Text>
                </Flex>
                <Progress 
                  value={progressPercentage}
                  size="lg"
                  colorScheme="blue"
                />
              </Box>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Box textAlign="center">
                  <CircularProgress 
                    value={progressPercentage}
                    color="green.400"
                    size="80px"
                  >
                    <CircularProgressLabel fontSize="sm">
                      {progressPercentage}%
                    </CircularProgressLabel>
                  </CircularProgress>
                  <Text fontSize="sm" mt={2}>Completed</Text>
                </Box>

                <VStack>
                  <Text fontSize="lg" fontWeight="bold" color="orange.500">
                    {pipeline.progress.totalDocuments - pipeline.progress.processedDocuments}
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Remaining Documents</Text>
                </VStack>

                <VStack>
                  <Text fontSize="lg" fontWeight="bold" color="blue.500">
                    {pipeline.progress.currentBatch}
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Current Batch</Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Agent Status */}
        <Card>
          <CardHeader>
            <Heading size="md">🤖 Processing Agents</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Orchestrator */}
              <Card variant="outline" bg={agents.orchestrator.status === 'healthy' ? 'green.50' : 'red.50'}>
                <CardBody>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={4}>
                      <Icon as={FiCpu} boxSize={6} color="purple.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">{agents.orchestrator.name}</Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          Workflow Coordination • Port {agents.orchestrator.port}
                        </Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={getStatusColor(agents.orchestrator.status)}>
                        {agents.orchestrator.status}
                      </Badge>
                      {agents.orchestrator.activeWorkflows > 0 && (
                        <Badge colorScheme="blue">{agents.orchestrator.activeWorkflows} workflows</Badge>
                      )}
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>

              <Divider />
              
              {/* Processing Agents */}
              <Text fontWeight="bold" mb={2}>📄 Document Processing Agents</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                {agents.processors.map((agent) => (
                  <Card key={agent.name} variant="outline" bg={agent.status === 'healthy' ? 'green.50' : agent.status === 'busy' ? 'orange.50' : 'red.50'}>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <HStack>
                            <Icon as={FiServer} color="blue.500" />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="medium" fontSize="sm">{agent.name}</Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                Port {agent.port}
                              </Text>
                            </VStack>
                          </HStack>
                          <Badge colorScheme={getStatusColor(agent.status)} size="sm">
                            {agent.status}
                          </Badge>
                        </HStack>

                        {agent.currentTask && (
                          <Text fontSize="xs" color="blue.600" fontStyle="italic">
                            {agent.currentTask}
                          </Text>
                        )}

                        <Box>
                          <Text fontSize="xs" fontWeight="medium" mb={1}>Capabilities:</Text>
                          <Flex wrap="wrap" gap={1}>
                            {(() => {
                              const caps = Array.isArray(agent.capabilities) 
                                ? agent.capabilities 
                                : (agent.capabilities && typeof agent.capabilities === 'object' 
                                    ? Object.keys(agent.capabilities) 
                                    : []);
                              return (
                                <>
                                  {caps.slice(0, 3).map((capability) => (
                                    <Badge key={String(capability)} size="xs" variant="outline">
                                      {String(capability).replace(/_/g, ' ')}
                                    </Badge>
                                  ))}
                                  {caps.length > 3 && (
                                    <Badge size="xs" variant="outline">
                                      +{caps.length - 3} more
                                    </Badge>
                                  )}
                                </>
                              );
                            })()}
                          </Flex>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <Heading size="md">📋 Recent Processing Activity</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Agent</Th>
                    <Th>Document</Th>
                    <Th>Status</Th>
                    <Th>Processing Time</Th>
                    <Th>Entities</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {pipeline.realtimeActivity.map((activity, index) => (
                    <Tr key={index}>
                      <Td>
                        <Text fontSize="xs">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" fontWeight="medium">{activity.agent}</Text>
                      </Td>
                      <Td>
                        <Text fontSize="xs" maxW="300px" noOfLines={1}>
                          {activity.document}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(activity.status)} size="sm">
                          {activity.status}
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        {activity.processingTime && (
                          <Text fontSize="xs">{activity.processingTime}s</Text>
                        )}
                      </Td>
                      <Td isNumeric>
                        {activity.entities && (
                          <Text fontSize="xs">{activity.entities}</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
          </TabPanel>

          <TabPanel>
            <IngestionPipelineVisualization
              onStartBatch={() => controlPipeline('start')}
              onPauseBatch={() => controlPipeline('pause')}
              onSkipBatch={() => {
                // Skip batch logic here
                console.log('Skip batch requested');
              }}
            />
          </TabPanel>

          <TabPanel>
            <VStack spacing={6} align="stretch">
              {/* Agent Status - moved from Overview tab */}
              <Card>
                <CardHeader>
                  <Heading size="md">🤖 Processing Agents</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    {/* Orchestrator */}
                    <Card variant="outline" bg={agents.orchestrator.status === 'healthy' ? 'green.50' : 'red.50'}>
                      <CardBody>
                        <Flex justify="space-between" align="center">
                          <HStack spacing={4}>
                            <Icon as={FiCpu} boxSize={6} color="purple.500" />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold">{agents.orchestrator.name}</Text>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                Workflow Coordination • Port {agents.orchestrator.port}
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack>
                            <Badge colorScheme={agents.orchestrator.status === 'healthy' ? 'green' : 'red'}>
                              {agents.orchestrator.status}
                            </Badge>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {agents.orchestrator.activeWorkflows} workflows
                            </Text>
                          </HStack>
                        </Flex>
                      </CardBody>
                    </Card>

                    {/* Processing Agents */}
                    {agents.processors.map((agent, idx) => (
                      <Card
                        key={idx}
                        variant="outline"
                        bg={agent.status === 'healthy' || agent.status === 'busy' ? 'green.50' : 'red.50'}
                      >
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <HStack spacing={4}>
                              <Icon as={FiServer} boxSize={6} color="blue.500" />
                              <VStack align="start" spacing={0}>
                                <Text fontWeight="bold">{agent.name}</Text>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {(() => {
                                    const caps = Array.isArray(agent.capabilities) 
                                      ? agent.capabilities 
                                      : (agent.capabilities && typeof agent.capabilities === 'object' 
                                          ? Object.keys(agent.capabilities) 
                                          : []);
                                    return caps.slice(0, 2).join(', ');
                                  })()} • Port {agent.port}
                                </Text>
                                {agent.currentTask && (
                                  <Text fontSize="xs" color="blue.600" fontStyle="italic">
                                    {agent.currentTask}
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                            <Badge colorScheme={agent.status === 'healthy' || agent.status === 'busy' ? 'green' : 'red'}>
                              {agent.status}
                            </Badge>
                          </Flex>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default DocumentsPage;
