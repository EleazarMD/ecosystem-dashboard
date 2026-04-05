import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  Container,
  Heading,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  CardHeader,
  Badge,
  SimpleGrid,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Spinner,
  Select,
  useToast,
  Flex,
  Icon,
  Divider,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Textarea,
  Alert,
  AlertIcon,
  Spacer,
} from '@chakra-ui/react';
import {
  SearchIcon,
  InfoIcon,
  CheckCircleIcon,
  WarningIcon,
  CopyIcon,
  ExternalLinkIcon,
  ChatIcon,
} from '@chakra-ui/icons';
import {
  FaBook, 
  FaProjectDiagram, 
  FaRobot, 
  FaChartLine, 
  FaDatabase,
  FaNetworkWired,
  FaCog,
  FaPlay,
  FaStop,
  FaSync
} from 'react-icons/fa';

interface SearchResult {
  title: string;
  file: string;
  project: string;
  relevance: string;
  preview: string;
  content?: string;
}

interface Project {
  project: string;
  description?: string;
  document_count: number;
  file_count: number;
}

interface AgentMetrics {
  queriesProcessed: number;
  documentsRetrieved: number;
  avgRelevanceScore: string;
  avgResponseTime: string;
  documentCount: number;
  projectsIndexed: string[];
}

interface SystemStatus {
  ragAgent: boolean;
  mcpServer: boolean;
  neo4j: boolean;
  postgresql: boolean;
  agents: number;
}

export default function KnowledgeGraphUnified() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [cypherQuery, setCypherQuery] = useState('');
  const [graphResults, setGraphResults] = useState<any>(null);
  const toast = useToast();

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadMetrics();
    loadSystemStatus();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('http://localhost:41247/a2a/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'list_projects',
          payload: {},
          requestId: `list-projects-${Date.now()}`,
          sender: 'dashboard-ui'
        })
      });

      const data = await response.json();
      if (data.result?.success) {
        setProjects(data.result.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('http://localhost:41247/a2a/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'get_metrics',
          payload: {},
          requestId: `metrics-${Date.now()}`,
          sender: 'dashboard-ui'
        })
      });

      const data = await response.json();
      if (data.result?.success) {
        setMetrics(data.result.metrics);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const loadSystemStatus = async () => {
    // Check various services
    const status: SystemStatus = {
      ragAgent: false,
      mcpServer: false,
      neo4j: false,
      postgresql: false,
      agents: 0
    };

    try {
      const ragCheck = await fetch('http://localhost:41247/health');
      status.ragAgent = ragCheck.ok;
    } catch {}

    try {
      const mcpCheck = await fetch('http://localhost:8768/health');
      status.mcpServer = mcpCheck.ok;
    } catch {}

    try {
      const neo4jCheck = await fetch('http://localhost:7474');
      status.neo4j = neo4jCheck.ok;
    } catch {}

    // Assume postgres is running if RAG agent is (since it depends on it)
    status.postgresql = status.ragAgent;

    // Check agents (41240-41246)
    for (let port = 41240; port <= 41246; port++) {
      try {
        const agentCheck = await fetch(`http://localhost:${port}/health`);
        if (agentCheck.ok) status.agents++;
      } catch {}
    }

    setSystemStatus(status);
  };

  const handleRagSearch = async () => {
    if (!query.trim()) {
      toast({
        title: 'Empty query',
        description: 'Please enter a search query',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch('http://localhost:41247/a2a/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'document_query',
          payload: {
            question: query,
            project: selectedProject || undefined,
            limit: 5,
            includeContext: true
          },
          requestId: `search-${Date.now()}`,
          sender: 'dashboard-ui'
        })
      });

      const data = await response.json();
      
      if (data.result?.success) {
        setResults(data.result.results || []);
        setTimeout(loadMetrics, 1000);
        
        toast({
          title: 'Search complete',
          description: `Found ${data.result.results?.length || 0} results`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGraphQuery = async () => {
    if (!cypherQuery.trim()) {
      toast({
        title: 'Empty query',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8765/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cypherQuery })
      });

      const data = await response.json();
      setGraphResults(data);
      
      toast({
        title: 'Query executed',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Query failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 1000,
    });
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Box>
            <Heading size="xl">Knowledge Graph & Document Intelligence</Heading>
            <Text color={useSemanticToken('text.secondary')}>
              Search documentation, query relationships, and manage the knowledge system
            </Text>
          </Box>
          <HStack>
            {systemStatus && (
              <Badge 
                colorScheme={systemStatus.ragAgent ? 'green' : 'red'} 
                fontSize="md"
                px={3}
                py={1}
              >
                {systemStatus.ragAgent ? '● OPERATIONAL' : '● OFFLINE'}
              </Badge>
            )}
          </HStack>
        </HStack>

        {/* Main Tabs */}
        <Tabs colorScheme="blue" variant="enclosed">
          <TabList>
            <Tab>
              <Icon as={FaBook} mr={2} />
              Document Search
            </Tab>
            <Tab>
              <Icon as={FaNetworkWired} mr={2} />
              Graph Query
            </Tab>
            <Tab>
              <Icon as={FaCog} mr={2} />
              System Control
            </Tab>
            <Tab>
              <Icon as={FaChartLine} mr={2} />
              Analytics
            </Tab>
          </TabList>

          <TabPanels>
            {/* TAB 1: Document Search (RAG) */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Stats Cards */}
                {metrics && (
                  <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Documents</StatLabel>
                          <StatNumber>{metrics.documentCount}</StatNumber>
                          <StatHelpText>Indexed</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Projects</StatLabel>
                          <StatNumber>{metrics.projectsIndexed.length}</StatNumber>
                          <StatHelpText>Active</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Queries</StatLabel>
                          <StatNumber>{metrics.queriesProcessed}</StatNumber>
                          <StatHelpText>Processed</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Avg Relevance</StatLabel>
                          <StatNumber>{metrics.avgRelevanceScore}</StatNumber>
                          <StatHelpText>Match Quality</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                )}

                {/* Search Interface */}
                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading size="md">Ask Anything About Your AI Homelab</Heading>
                      
                      <Select
                        placeholder="All Projects"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                      >
                        {projects.map((p) => (
                          <option key={p.project} value={p.project}>
                            {p.project} ({p.document_count} docs)
                          </option>
                        ))}
                      </Select>

                      <HStack>
                        <Input
                          placeholder="How do I deploy the dashboard? What are the agent capabilities?"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRagSearch()}
                          size="lg"
                        />
                        <Button
                          colorScheme="blue"
                          onClick={handleRagSearch}
                          isLoading={loading}
                          leftIcon={<SearchIcon />}
                          size="lg"
                          px={8}
                        >
                          Search
                        </Button>
                      </HStack>

                      <HStack spacing={2} flexWrap="wrap">
                        <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Try:</Text>
                        <Badge 
                          cursor="pointer" 
                          onClick={() => setQuery("How do I deploy the dashboard?")}
                        >
                          Dashboard deployment
                        </Badge>
                        <Badge 
                          cursor="pointer"
                          onClick={() => setQuery("Agent configuration options")}
                        >
                          Agent config
                        </Badge>
                        <Badge 
                          cursor="pointer"
                          onClick={() => setQuery("Voice assistant setup")}
                        >
                          Voice setup
                        </Badge>
                      </HStack>
                    </VStack>
                  </CardBody>
                </Card>

                {/* Loading State */}
                {loading && (
                  <Flex justify="center" py={8}>
                    <VStack>
                      <Spinner size="xl" color="blue.500" />
                      <Text color={useSemanticToken('text.secondary')}>Searching knowledge base...</Text>
                    </VStack>
                  </Flex>
                )}

                {/* Results */}
                {!loading && results.length > 0 && (
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Results ({results.length})</Heading>

                    {results.map((result, idx) => (
                      <Card key={idx} variant="outline">
                        <CardHeader>
                          <HStack justify="space-between" align="start">
                            <VStack align="start" spacing={2} flex={1}>
                              <HStack spacing={3}>
                                <Badge colorScheme="blue" fontSize="md">
                                  {result.relevance}
                                </Badge>
                                <Heading size="sm">{result.title}</Heading>
                              </HStack>
                              <HStack spacing={2}>
                                <Badge colorScheme="green">{result.project}</Badge>
                                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                  {result.file}
                                </Text>
                              </HStack>
                            </VStack>
                            <HStack>
                              <IconButton
                                aria-label="Copy"
                                icon={<CopyIcon />}
                                size="sm"
                                onClick={() => copyToClipboard(result.content || result.preview)}
                              />
                              <IconButton
                                aria-label="Chat"
                                icon={<ChatIcon />}
                                size="sm"
                                colorScheme="blue"
                              />
                            </HStack>
                          </HStack>
                        </CardHeader>
                        <CardBody>
                          <Accordion allowToggle>
                            <AccordionItem border="none">
                              <AccordionButton px={0}>
                                <Text flex="1" textAlign="left" fontSize="sm">
                                  {result.preview}
                                </Text>
                                <AccordionIcon />
                              </AccordionButton>
                              <AccordionPanel>
                                {result.content && (
                                  <Code
                                    display="block"
                                    whiteSpace="pre-wrap"
                                    p={3}
                                    borderRadius="md"
                                    fontSize="sm"
                                    maxH="400px"
                                    overflowY="auto"
                                  >
                                    {result.content}
                                  </Code>
                                )}
                              </AccordionPanel>
                            </AccordionItem>
                          </Accordion>
                        </CardBody>
                      </Card>
                    ))}
                  </VStack>
                )}
              </VStack>
            </TabPanel>

            {/* TAB 2: Graph Query */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Alert status="info">
                  <AlertIcon />
                  Query the Neo4j knowledge graph using Cypher or natural language
                </Alert>

                <Card>
                  <CardBody>
                    <VStack spacing={4} align="stretch">
                      <Heading size="md">Graph Query</Heading>
                      <Textarea
                        placeholder="MATCH (n) RETURN n LIMIT 10"
                        value={cypherQuery}
                        onChange={(e) => setCypherQuery(e.target.value)}
                        rows={6}
                        fontFamily="monospace"
                      />
                      <Button
                        colorScheme="purple"
                        onClick={handleGraphQuery}
                        isLoading={loading}
                        leftIcon={<FaDatabase />}
                      >
                        Execute Query
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                {graphResults && (
                  <Card>
                    <CardBody>
                      <Code display="block" whiteSpace="pre-wrap" p={4}>
                        {JSON.stringify(graphResults, null, 2)}
                      </Code>
                    </CardBody>
                  </Card>
                )}
              </VStack>
            </TabPanel>

            {/* TAB 3: System Control */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* System Status */}
                {systemStatus && (
                  <>
                    <Card>
                      <CardHeader>
                        <Heading size="md">RAG System Status</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack>
                            <Badge colorScheme={systemStatus.ragAgent ? 'green' : 'red'}>
                              {systemStatus.ragAgent ? '●' : '○'}
                            </Badge>
                            <Text flex={1}>RAG Agent (41247)</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {systemStatus.ragAgent ? 'Running' : 'Offline'}
                            </Text>
                          </HStack>
                          <HStack>
                            <Badge colorScheme={systemStatus.mcpServer ? 'green' : 'red'}>
                              {systemStatus.mcpServer ? '●' : '○'}
                            </Badge>
                            <Text flex={1}>MCP Server (8768)</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {systemStatus.mcpServer ? 'Running' : 'Offline'}
                            </Text>
                          </HStack>
                          {metrics && (
                            <HStack>
                              <Badge colorScheme="blue">●</Badge>
                              <Text flex={1}>Vector Store</Text>
                              <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                                {metrics.documentCount} documents
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardHeader>
                        <Heading size="md">Knowledge Graph Services</Heading>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack>
                            <Badge colorScheme={systemStatus.neo4j ? 'green' : 'red'}>
                              {systemStatus.neo4j ? '●' : '○'}
                            </Badge>
                            <Text flex={1}>Neo4j (7687)</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {systemStatus.neo4j ? 'Running' : 'Offline'}
                            </Text>
                          </HStack>
                          <HStack>
                            <Badge colorScheme={systemStatus.postgresql ? 'green' : 'red'}>
                              {systemStatus.postgresql ? '●' : '○'}
                            </Badge>
                            <Text flex={1}>PostgreSQL (5432)</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {systemStatus.postgresql ? 'Running' : 'Offline'}
                            </Text>
                          </HStack>
                          <HStack>
                            <Badge colorScheme={systemStatus.agents > 0 ? 'green' : 'red'}>
                              {systemStatus.agents > 0 ? '●' : '○'}
                            </Badge>
                            <Text flex={1}>Knowledge Graph Agents</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              {systemStatus.agents}/7 healthy
                            </Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card>
                      <CardBody>
                        <HStack spacing={4}>
                          <Button
                            leftIcon={<Icon as={FaSync} />}
                            colorScheme="blue"
                            onClick={loadSystemStatus}
                          >
                            Refresh Status
                          </Button>
                          <Button
                            leftIcon={<Icon as={FaPlay} />}
                            colorScheme="green"
                          >
                            Start System
                          </Button>
                          <Button
                            leftIcon={<Icon as={FaStop} />}
                            colorScheme="red"
                          >
                            Stop System
                          </Button>
                        </HStack>
                      </CardBody>
                    </Card>
                  </>
                )}
              </VStack>
            </TabPanel>

            {/* TAB 4: Analytics */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Heading size="md">Coming Soon</Heading>
                <Text color={useSemanticToken('text.secondary')}>
                  Analytics dashboard with query patterns, performance metrics, and usage statistics.
                </Text>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Projects List */}
        {projects.length > 0 && (
          <Card>
            <CardHeader>
              <Heading size="md">Indexed Projects</Heading>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                {projects.map((project) => (
                  <Card key={project.project} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={2}>
                        <Heading size="sm">{project.project}</Heading>
                        {project.description && (
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                            {project.description}
                          </Text>
                        )}
                        <HStack>
                          <Badge>{project.document_count} docs</Badge>
                          <Badge colorScheme="green">{project.file_count} files</Badge>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </SimpleGrid>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Container>
  );
}
