import React, { useState, useEffect } from 'react';
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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  IconButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
  Progress,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  SearchIcon,
  CopyIcon,
  ChatIcon,
  CheckCircleIcon,
} from '@chakra-ui/icons';
import { 
  FaBook, 
  FaDatabase,
  FaNetworkWired,
  FaChartLine,
  FaRobot,
  FaSync,
  FaPlay,
  FaStop,
} from 'react-icons/fa';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

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

export default function KnowledgeGraphRedesign() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const toast = useToast();
  const { setIsOpen } = useRightPanel();
  
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const codeBg = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');

  // Auto-open right panel for knowledge graph context
  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

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

    status.postgresql = status.ragAgent;

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 1000,
    });
  };

  return (
    <DashboardLayout>
      <Container maxW="container.2xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Page Header */}
          <HStack justify="space-between">
            <Box>
              <Heading size="xl" mb={2}>Knowledge Graph</Heading>
              <Text color={useSemanticToken('text.secondary')}>
                Search documentation, explore relationships, and discover insights across your AI Homelab
              </Text>
            </Box>
            {systemStatus && (
              <Badge 
                colorScheme={systemStatus.ragAgent ? 'green' : 'red'} 
                fontSize="md"
                px={4}
                py={2}
                borderRadius="md"
              >
                {systemStatus.ragAgent ? '● OPERATIONAL' : '● OFFLINE'}
              </Badge>
            )}
          </HStack>

          {/* Stats Dashboard */}
          {metrics && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FaBook} color="blue.500" />
                        <Text>Documents</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber>{metrics.documentCount}</StatNumber>
                    <StatHelpText>Indexed and searchable</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FaDatabase} color="green.500" />
                        <Text>Projects</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber>{metrics.projectsIndexed.length}</StatNumber>
                    <StatHelpText>Active knowledge bases</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FaRobot} color="purple.500" />
                        <Text>Queries</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber>{metrics.queriesProcessed}</StatNumber>
                    <StatHelpText>Total processed</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
              
              <Card>
                <CardBody>
                  <Stat>
                    <StatLabel>
                      <HStack>
                        <Icon as={FaChartLine} color="orange.500" />
                        <Text>Relevance</Text>
                      </HStack>
                    </StatLabel>
                    <StatNumber>{metrics.avgRelevanceScore}</StatNumber>
                    <StatHelpText>Average match quality</StatHelpText>
                  </Stat>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}

          {/* Main Search Interface */}
          <Card>
            <CardHeader>
              <Heading size="md">
                <HStack>
                  <Icon as={SearchIcon} />
                  <Text>Document Search & Retrieval</Text>
                </HStack>
              </Heading>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Select
                  placeholder="All Projects"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  size="lg"
                >
                  {projects.map((p) => (
                    <option key={p.project} value={p.project}>
                      {p.project} ({p.document_count} docs)
                    </option>
                  ))}
                </Select>

                <HStack>
                  <Input
                    placeholder="Ask anything: How do I deploy the dashboard? What are the agent capabilities?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRagSearch()}
                    size="lg"
                    flex={1}
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
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Quick examples:</Text>
                  <Badge 
                    cursor="pointer" 
                    colorScheme="blue"
                    onClick={() => setQuery("How do I deploy the dashboard?")}
                  >
                    Dashboard deployment
                  </Badge>
                  <Badge 
                    cursor="pointer"
                    colorScheme="purple"
                    onClick={() => setQuery("Agent configuration options")}
                  >
                    Agent setup
                  </Badge>
                  <Badge 
                    cursor="pointer"
                    colorScheme="green"
                    onClick={() => setQuery("Voice assistant integration")}
                  >
                    Voice assistant
                  </Badge>
                </HStack>
              </VStack>
            </CardBody>
          </Card>

          {/* Loading State */}
          {loading && (
            <Flex justify="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color="blue.500" thickness="4px" />
                <Text color={useSemanticToken('text.secondary')} fontSize="lg">
                  Searching knowledge graph...
                </Text>
                <Progress size="xs" isIndeterminate colorScheme="blue" w="200px" />
              </VStack>
            </Flex>
          )}

          {/* Search Results */}
          {!loading && results.length > 0 && (
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md">
                  <HStack>
                    <CheckCircleIcon color="green.500" />
                    <Text>Results ({results.length})</Text>
                  </HStack>
                </Heading>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Sorted by relevance
                </Text>
              </HStack>

              {results.map((result, idx) => (
                <Card key={idx} variant="outline" _hover={{ shadow: 'md', borderColor: 'blue.300' }}>
                  <CardHeader>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack spacing={3}>
                          <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
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
                          aria-label="Copy content"
                          icon={<CopyIcon />}
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(result.content || result.preview)}
                        />
                        <IconButton
                          aria-label="Discuss with AI"
                          icon={<ChatIcon />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                        />
                      </HStack>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <Accordion allowToggle>
                      <AccordionItem border="none">
                        <AccordionButton px={0}>
                          <Text flex="1" textAlign="left" fontSize="sm" color={textColor}>
                            {result.preview}
                          </Text>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel>
                          {result.content && (
                            <Code
                              display="block"
                              whiteSpace="pre-wrap"
                              p={4}
                              borderRadius="md"
                              fontSize="sm"
                              maxH="400px"
                              overflowY="auto"
                              bg={codeBg}
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

          {/* System Status */}
          {systemStatus && (
            <Card>
              <CardHeader>
                <Heading size="md">
                  <HStack>
                    <Icon as={FaNetworkWired} />
                    <Text>System Status</Text>
                  </HStack>
                </Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <VStack align="stretch" spacing={3}>
                    <Text fontWeight="semibold" fontSize="sm" color={useSemanticToken('text.secondary')}>
                      RAG System
                    </Text>
                    <HStack>
                      <Badge colorScheme={systemStatus.ragAgent ? 'green' : 'red'}>
                        {systemStatus.ragAgent ? '●' : '○'}
                      </Badge>
                      <Text flex={1}>RAG Agent</Text>
                      <Badge variant="outline">41247</Badge>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={systemStatus.mcpServer ? 'green' : 'red'}>
                        {systemStatus.mcpServer ? '●' : '○'}
                      </Badge>
                      <Text flex={1}>MCP Server</Text>
                      <Badge variant="outline">8768</Badge>
                    </HStack>
                  </VStack>
                  
                  <VStack align="stretch" spacing={3}>
                    <Text fontWeight="semibold" fontSize="sm" color={useSemanticToken('text.secondary')}>
                      Knowledge Graph Services
                    </Text>
                    <HStack>
                      <Badge colorScheme={systemStatus.neo4j ? 'green' : 'red'}>
                        {systemStatus.neo4j ? '●' : '○'}
                      </Badge>
                      <Text flex={1}>Neo4j</Text>
                      <Badge variant="outline">7687</Badge>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={systemStatus.postgresql ? 'green' : 'red'}>
                        {systemStatus.postgresql ? '●' : '○'}
                      </Badge>
                      <Text flex={1}>PostgreSQL</Text>
                      <Badge variant="outline">5432</Badge>
                    </HStack>
                    <HStack>
                      <Badge colorScheme={systemStatus.agents > 0 ? 'green' : 'red'}>
                        {systemStatus.agents > 0 ? '●' : '○'}
                      </Badge>
                      <Text flex={1}>KG Agents</Text>
                      <Badge colorScheme="green">{systemStatus.agents}/7</Badge>
                    </HStack>
                  </VStack>
                </SimpleGrid>
                
                <HStack mt={6} spacing={3}>
                  <Button
                    leftIcon={<Icon as={FaSync} />}
                    colorScheme="blue"
                    size="sm"
                    onClick={loadSystemStatus}
                  >
                    Refresh
                  </Button>
                  <Button
                    leftIcon={<Icon as={FaPlay} />}
                    colorScheme="green"
                    size="sm"
                    variant="outline"
                  >
                    Start System
                  </Button>
                  <Button
                    leftIcon={<Icon as={FaStop} />}
                    colorScheme="red"
                    size="sm"
                    variant="outline"
                  >
                    Stop System
                  </Button>
                </HStack>
              </CardBody>
            </Card>
          )}

          {/* Indexed Projects */}
          {projects.length > 0 && (
            <Card>
              <CardHeader>
                <Heading size="md">Indexed Projects</Heading>
              </CardHeader>
              <CardBody>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {projects.map((project) => (
                    <Card key={project.project} variant="outline" bg={bgColor}>
                      <CardBody>
                        <VStack align="stretch" spacing={2}>
                          <Heading size="sm">{project.project}</Heading>
                          {project.description && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              {project.description}
                            </Text>
                          )}
                          <HStack>
                            <Badge colorScheme="blue">{project.document_count} docs</Badge>
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
    </DashboardLayout>
  );
}
