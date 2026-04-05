import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import {
  FiPlay, 
  FiPause, 
  FiRefreshCw, 
  FiCpu, 
  FiDatabase, 
  FiUsers, 
  FiTrendingUp, 
  FiCheckCircle, 
  FiClock,
  FiActivity,
  FiServer
} from 'react-icons/fi';

interface ADKAgent {
  name: string;
  model: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'busy';
  capabilities: string[];
  currentTask?: string;
  responseTime?: number;
}

interface ADKPipelineStatus {
  isLiveData: boolean;
  pipeline: {
    status: 'idle' | 'running' | 'paused' | 'error';
    orchestrator: {
      model: string;
      agent: string;
      port: number;
      status: string;
      activeWorkflows: number;
    };
    subagents: ADKAgent[];
    progress: {
      totalDocuments: number;
      processedDocuments: number;
      currentBatch: string;
      currentPhase: string;
      estimatedTimeRemaining: number;
    };
    modelAssignments: Record<string, string>;
    realtimeActivity: Array<{
      timestamp: string;
      agent: string;
      model: string;
      document: string;
      status: string;
      entities?: number;
      processingTime?: number;
      error?: string;
    }>;
  };
  agentConnectivity: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
}

const ADKIngestionPipeline: React.FC = () => {
  const [pipelineStatus, setPipelineStatus] = useState<ADKPipelineStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.base');

  const loadPipelineStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agentic-control/ingestion-pipeline');
      
      if (!response.ok) {
        throw new Error(`Failed to load pipeline status: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setPipelineStatus(result.data);
        if (!result.data.isLiveData) {
          setError('ADK agents connectivity check completed. Showing enhanced pipeline visualization.');
        }
      } else {
        throw new Error(result.error || 'Failed to load pipeline status');
      }
    } catch (err: any) {
      console.error('Error loading ADK pipeline status:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const controlPipeline = async (action: 'start' | 'pause') => {
    try {
      const response = await fetch('/api/agentic-control/ingestion-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, batch: 'ai-homelab-ecosystem' })
      });
      
      if (response.ok) {
        toast({
          title: `Pipeline ${action}ed`,
          description: `ADK ingestion pipeline has been ${action}ed successfully`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadPipelineStatus();
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
    loadPipelineStatus();
    const interval = setInterval(loadPipelineStatus, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'running': return 'blue';
      case 'busy': return 'orange';
      case 'unhealthy': return 'red';
      case 'success': return 'green';
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'processing': return 'blue';
      default: return 'gray';
    }
  };

  const formatModelName = (model: string) => {
    const modelMap: Record<string, string> = {
      'mistral:latest': '🧠 Mistral (Orchestration)',
      'llama:latest': '⚡ Llama (Processing)',
      'llama3.2:3b': '⚡ Llama 3.2 (Processing)'
    };
    return modelMap[model] || model;
  };

  if (isLoading && !pipelineStatus) {
    return (
      <Box p={6} textAlign="center">
        <CircularProgress isIndeterminate />
        <Text mt={4}>Loading ADK Ingestion Pipeline...</Text>
      </Box>
    );
  }

  if (!pipelineStatus) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Pipeline Status Unavailable</AlertTitle>
          <AlertDescription>Could not load ADK ingestion pipeline status.</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const { pipeline, agentConnectivity } = pipelineStatus;
  const progressPercentage = Math.round((pipeline.progress.processedDocuments / pipeline.progress.totalDocuments) * 100);

  return (
    <Box p={6}>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading as="h2" size="lg">ADK Ingestion Pipeline</Heading>
          <Text color={useSemanticToken('text.secondary')}>
            Complete transparency into Mistral orchestrator + Llama subagents processing
          </Text>
        </Box>
        <HStack>
          {!pipelineStatus.isLiveData && (
            <Badge colorScheme="orange">Enhanced Mock Data</Badge>
          )}
          <Button
            leftIcon={<Icon as={FiRefreshCw} />}
            onClick={loadPipelineStatus}
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
              Pause Pipeline
            </Button>
          ) : (
            <Button
              leftIcon={<Icon as={FiPlay} />}
              onClick={() => controlPipeline('start')}
              colorScheme="green"
              size="sm"
            >
              Start Pipeline
            </Button>
          )}
        </HStack>
      </Flex>

      {error && (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Pipeline Visualization Active</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}

      <VStack spacing={6} align="stretch">
        {/* Pipeline Overview */}
        <Card>
          <CardHeader>
            <Heading size="md">Pipeline Overview</Heading>
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
                <StatLabel>Agent Health</StatLabel>
                <StatNumber color={agentConnectivity.healthy === agentConnectivity.total ? 'green.500' : 'orange.500'}>
                  {agentConnectivity.healthy}/{agentConnectivity.total}
                </StatNumber>
                <StatHelpText>Agents operational</StatHelpText>
              </Stat>

              <Stat>
                <StatLabel>ETA</StatLabel>
                <StatNumber>{pipeline.progress.estimatedTimeRemaining.toFixed(1)}h</StatNumber>
                <StatHelpText>Estimated completion</StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Model Architecture */}
        <Card>
          <CardHeader>
            <Heading size="md">Model Architecture</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {/* Orchestrator */}
              <Card variant="outline" bg={pipeline.orchestrator.status === 'healthy' ? 'green.50' : 'red.50'}>
                <CardBody>
                  <Flex justify="space-between" align="center">
                    <HStack spacing={4}>
                      <Icon as={FiCpu} boxSize={6} color="purple.500" />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">Orchestrator Agent</Text>
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                          {formatModelName(pipeline.orchestrator.model)} • Port {pipeline.orchestrator.port}
                        </Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={getStatusColor(pipeline.orchestrator.status)}>
                        {pipeline.orchestrator.status}
                      </Badge>
                      {pipeline.orchestrator.activeWorkflows > 0 && (
                        <Badge colorScheme="blue">{pipeline.orchestrator.activeWorkflows} workflows</Badge>
                      )}
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>

              <Divider />
              
              {/* Subagents */}
              <Text fontWeight="bold" mb={2}>Processing Agents (Llama Model)</Text>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                {pipeline.subagents.map((agent) => (
                  <Card key={agent.name} variant="outline" bg={agent.status === 'healthy' ? 'green.50' : 'red.50'}>
                    <CardBody>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <HStack>
                            <Icon as={FiServer} color="blue.500" />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="medium" fontSize="sm">{agent.name}</Text>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {formatModelName(agent.model)} • Port {agent.port}
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

        {/* Progress Visualization */}
        <Card>
          <CardHeader>
            <Heading size="md">Processing Progress</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Flex justify="space-between" mb={2}>
                  <Text>AI Homelab Ecosystem Ingestion</Text>
                  <Text fontWeight="bold">
                    {pipeline.progress.processedDocuments} / {pipeline.progress.totalDocuments}
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
                    {pipeline.progress.currentPhase}
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Current Phase</Text>
                </VStack>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Real-time Activity */}
        <Card>
          <CardHeader>
            <Heading size="md">Real-time Activity Log</Heading>
          </CardHeader>
          <CardBody>
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Agent & Model</Th>
                    <Th>Task</Th>
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
                        <VStack align="start" spacing={0}>
                          <Text fontSize="xs" fontWeight="medium">{activity.agent}</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>({activity.model})</Text>
                        </VStack>
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
    </Box>
  );
};

export default ADKIngestionPipeline;
