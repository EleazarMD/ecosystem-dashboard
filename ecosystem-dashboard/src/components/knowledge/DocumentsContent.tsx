/**
 * Documents Content - Full Ingestion Pipeline Control
 * Real-time document ingestion monitoring and control panel
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  HStack,
  VStack,
  Button,
  Select,
  Progress,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useToast,
  Flex,
  Spinner,
  Alert,
  AlertIcon,
  Code,
} from '@chakra-ui/react';
import {
  FiDatabase,
  FiClock,
  FiAlertCircle,
  FiPlay,
  FiPause,
  FiRefreshCw,
  FiActivity,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
} from 'react-icons/fi';
import IngestionPipelineFlow from './IngestionPipelineFlow';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface IngestionStats {
  total: number;
  processed: number;
  pending: number;
  errors: number;
  currentBatch: string;
  documentsPerSecond: number;
  isRunning: boolean;
}

interface AgentStatus {
  port: number;
  name: string;
  status: 'healthy' | 'error' | 'offline';
  documentsProcessed: number;
}

interface PipelineDocument {
  path: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  currentAgent?: string;
  progress: number;
  timestamp: string;
}

interface CategoryStats {
  total: number;
  processed: number;
  pending: number;
}

const DocumentsContent: React.FC = () => {
  const [isIngesting, setIsIngesting] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState('architecture');
  const [stats, setStats] = useState<IngestionStats>({
    total: 3238,
    processed: 0,
    pending: 3238,
    errors: 0,
    currentBatch: 'none',
    documentsPerSecond: 0,
    isRunning: false,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, CategoryStats>>({
    architecture: { total: 4, processed: 0, pending: 4 },
    agents: { total: 4, processed: 0, pending: 4 },
    services: { total: 2, processed: 0, pending: 2 },
    all: { total: 3238, processed: 0, pending: 3238 },
  });
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [recentDocs, setRecentDocs] = useState<PipelineDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Fetch agent status
  const fetchAgents = async () => {
    try {
      const agentPorts = [
        { port: 41240, name: 'Orchestrator' },
        { port: 41241, name: 'Graph Query' },
        { port: 41242, name: 'Vector Search' },
        { port: 41243, name: 'Documentation' },
        { port: 41244, name: 'Reasoning' },
        { port: 41245, name: 'Memory' },
        { port: 41246, name: 'Integration' },
      ];
      // Note: Dashboard AI (41247) removed - using Goose Agent with MCP instead

      const agentStatuses = await Promise.all(
        agentPorts.map(async ({ port, name }) => {
          try {
            const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(2000) });
            if (res.ok) {
              return { port, name, status: 'healthy' as const, documentsProcessed: 0 };
            }
          } catch (e) {
            // Agent offline
          }
          return { port, name, status: 'offline' as const, documentsProcessed: 0 };
        })
      );

      setAgents(agentStatuses);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  // Fetch ingestion stats and sync backend state
  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:8765/api/ingestion/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        // Sync frontend state with backend state
        if (data.isRunning !== undefined) {
          setIsIngesting(data.isRunning);
        }
      }
    } catch (error) {
      // Stats endpoint not available, using defaults
    } finally {
      setLoading(false);
    }
  };

  // Fetch category stats
  const fetchCategoryStats = async () => {
    try {
      const res = await fetch('http://localhost:8765/api/ingestion/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoryStats(data.categories);
      }
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchStats();
    fetchCategoryStats();

    const interval = setInterval(() => {
      fetchAgents();
      fetchStats();
      fetchCategoryStats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartIngestion = async () => {
    try {
      toast({
        title: 'Starting Ingestion',
        description: `Batch: ${selectedBatch}`,
        status: 'info',
        duration: 3000,
      });

      // Trigger ingestion via API
      const res = await fetch('http://localhost:8765/api/ingestion/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: selectedBatch }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to start ingestion');
      }

      const data = await res.json();
      console.log('Ingestion started:', data);
      
      // Immediately fetch stats to sync state
      await fetchStats();
    } catch (error) {
      console.error('Failed to start ingestion:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start ingestion',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleStopIngestion = async () => {
    try {
      const res = await fetch('http://localhost:8765/api/ingestion/stop', { method: 'POST' });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to stop ingestion');
      }
      
      toast({
        title: 'Ingestion Stopped',
        status: 'warning',
        duration: 3000,
      });
      
      // Immediately fetch stats to sync state
      await fetchStats();
    } catch (error) {
      toast({
        title: 'Failed to stop ingestion',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const healthyAgents = agents.filter(a => a.status === 'healthy').length;
  const progressPercent = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="purple.500" />
      </Flex>
    );
  }

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <VStack align="start" spacing={1}>
          <Heading size="lg">Document Ingestion Pipeline</Heading>
          <Text color={useSemanticToken('text.secondary')} fontSize="sm">
            Real-time monitoring and control for ecosystem documentation
          </Text>
        </VStack>

        {/* System Status Alert */}
        {healthyAgents < 7 && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1} flex="1">
              <Text fontWeight="bold">
                {healthyAgents}/7 Agents Running
              </Text>
              <Text fontSize="sm">
                Some agents are offline. Start them with:{' '}
                <Code fontSize="sm">node src/agents/start-all-agents.js</Code>
              </Text>
            </VStack>
          </Alert>
        )}

        {/* Real-time Pipeline Visualization */}
        <IngestionPipelineFlow />

        {/* Statistics Overview */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Documents</StatLabel>
                <StatNumber>{stats.total.toLocaleString()}</StatNumber>
                <StatHelpText>In ecosystem</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Processed</StatLabel>
                <StatNumber color="green.500">{stats.processed.toLocaleString()}</StatNumber>
                <StatHelpText>{progressPercent.toFixed(1)}% complete</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Pending</StatLabel>
                <StatNumber color="orange.500">{stats.pending.toLocaleString()}</StatNumber>
                <StatHelpText>Awaiting processing</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Errors</StatLabel>
                <StatNumber color="red.500">{stats.errors}</StatNumber>
                <StatHelpText>Failed documents</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Live Processing Metrics */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Card>
            <CardHeader>
              <Heading size="md">Processing Speed</Heading>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Real-time performance</Text>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontSize="sm">Documents/second:</Text>
                  <Badge colorScheme="blue" fontSize="md">{stats.documentsPerSecond.toFixed(2)}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Estimated time remaining:</Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {stats.isRunning && stats.documentsPerSecond > 0
                      ? `${Math.ceil(stats.pending / stats.documentsPerSecond / 60)} minutes`
                      : 'N/A'}
                  </Text>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Current batch:</Text>
                  <Badge colorScheme="purple">{stats.currentBatch}</Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text fontSize="sm">Success rate:</Text>
                  <Badge colorScheme={stats.errors === 0 ? 'green' : 'orange'}>
                    {stats.processed > 0 ? ((stats.processed / (stats.processed + stats.errors)) * 100).toFixed(1) : 100}%
                  </Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">System Health</Heading>
              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Agent pipeline status</Text>
            </CardHeader>
            <CardBody>
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontSize="sm">Active agents:</Text>
                  <Badge colorScheme={healthyAgents === 7 ? 'green' : 'red'} fontSize="md">
                    {healthyAgents}/7
                  </Badge>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {agents.slice(0, 3).map((agent) => (
                    <HStack key={agent.name} justify="space-between" fontSize="sm">
                      <Text>{agent.name}</Text>
                      <Badge size="sm" colorScheme={agent.status === 'healthy' ? 'green' : 'red'}>
                        {agent.status}
                      </Badge>
                    </HStack>
                  ))}
                  {agents.length > 3 && (
                    <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                      +{agents.length - 3} more agents
                    </Text>
                  )}
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Overall Progress */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Flex justify="space-between" align="center">
                <Text fontWeight="bold">Overall Progress</Text>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  {stats.processed} / {stats.total} documents
                </Text>
              </Flex>
              <Progress
                value={progressPercent}
                colorScheme="purple"
                size="lg"
                borderRadius="md"
                hasStripe
                isAnimated={isIngesting}
              />
            </VStack>
          </CardBody>
        </Card>

        {/* Control Panel */}
        <Card bg="purple.50" _dark={{ bg: 'purple.900' }}>
          <CardHeader>
            <Heading size="md">Ingestion Control</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack>
                <Select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  isDisabled={isIngesting}
                  maxW="400px"
                >
                  <option value="architecture">
                    Architecture ({categoryStats.architecture?.processed || 0}/{categoryStats.architecture?.total || 4} processed)
                  </option>
                  <option value="agents">
                    Agents ({categoryStats.agents?.processed || 0}/{categoryStats.agents?.total || 4} processed)
                  </option>
                  <option value="services">
                    Services ({categoryStats.services?.processed || 0}/{categoryStats.services?.total || 2} processed)
                  </option>
                  <option value="all">
                    🌐 ALL Documents ({categoryStats.all?.processed || 0}/{categoryStats.all?.total || 3238} processed) - Full Ecosystem
                  </option>
                </Select>

                {!isIngesting ? (
                  <Button
                    leftIcon={<Icon as={FiPlay} />}
                    colorScheme="purple"
                    onClick={handleStartIngestion}
                    isDisabled={healthyAgents < 7}
                  >
                    Start Ingestion
                  </Button>
                ) : (
                  <Button
                    leftIcon={<Icon as={FiPause} />}
                    colorScheme="orange"
                    onClick={handleStopIngestion}
                  >
                    Stop Ingestion
                  </Button>
                )}
              </HStack>

              {isIngesting && (
                <HStack spacing={4} fontSize="sm">
                  <HStack>
                    <Icon as={FiActivity} color="green.500" />
                    <Text>Processing: {stats.currentBatch}</Text>
                  </HStack>
                  <HStack>
                    <Icon as={FiClock} color="blue.500" />
                    <Text>{stats.documentsPerSecond.toFixed(2)} docs/sec</Text>
                  </HStack>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Agent Status */}
        <Card>
          <CardHeader>
            <Heading size="md">Agent Pipeline Status</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={3}>
              {agents.map((agent) => (
                <Box
                  key={agent.port}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={agent.status === 'healthy' ? 'green.200' : 'red.200'}
                  bg={agent.status === 'healthy' ? 'green.50' : 'red.50'}
                  _dark={{
                    bg: agent.status === 'healthy' ? 'green.900' : 'red.900',
                  }}
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')} _dark={{ color: 'gray.400' }}>
                        Port {agent.port}
                      </Text>
                      <Text fontWeight="bold" fontSize="sm">
                        {agent.name}
                      </Text>
                    </VStack>
                    <Icon
                      as={agent.status === 'healthy' ? FiCheckCircle : FiXCircle}
                      color={agent.status === 'healthy' ? 'green.500' : 'red.500'}
                    />
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <Heading size="md">Recent Documents</Heading>
          </CardHeader>
          <CardBody>
            {recentDocs.length === 0 ? (
              <Text color={useSemanticToken('text.secondary')} textAlign="center" py={8}>
                No recent activity. Start ingestion to see documents flowing through the pipeline.
              </Text>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Document</Th>
                    <Th>Status</Th>
                    <Th>Current Agent</Th>
                    <Th>Progress</Th>
                    <Th>Time</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {recentDocs.map((doc, idx) => (
                    <Tr key={idx}>
                      <Td>
                        <Text fontSize="sm" noOfLines={1}>
                          {doc.path.split('/').pop()}
                        </Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            doc.status === 'completed'
                              ? 'green'
                              : doc.status === 'error'
                              ? 'red'
                              : doc.status === 'processing'
                              ? 'blue'
                              : 'gray'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </Td>
                      <Td fontSize="xs">{doc.currentAgent || '-'}</Td>
                      <Td>
                        <Progress value={doc.progress} size="sm" colorScheme="purple" />
                      </Td>
                      <Td fontSize="xs">{new Date(doc.timestamp).toLocaleTimeString()}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default DocumentsContent;
