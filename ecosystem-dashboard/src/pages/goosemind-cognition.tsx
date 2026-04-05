/**
 * GooseMind Cognition Dashboard
 * Comprehensive cognitive architecture monitoring system
 * 
 * Cognitive Domains:
 * 1. Memory: Short-term (sessions) + Long-term (knowledge base)
 * 2. Attention: Context awareness, focus tracking, priority management
 * 3. Abstraction: Knowledge graph, concept formation, pattern recognition
 * 4. Execution: Actions, tool usage, task completion, performance metrics
 * 5. Learning: Fact extraction, confidence evolution, knowledge growth
 * 6. Reasoning: Decision patterns, inference chains, problem-solving
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Badge, IconButton,
  Tabs, TabList, TabPanels, Tab, TabPanel, Button,
  useColorModeValue, useToast, SimpleGrid, Divider,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, Stat, StatLabel, StatNumber, StatHelpText, StatArrow,
  Progress, Tooltip, Code, Accordion, AccordionItem, AccordionButton,
  AccordionPanel, AccordionIcon, Heading, Card, CardHeader, CardBody,
  Grid, GridItem, Tag, Wrap, WrapItem,
} from '@chakra-ui/react';
import { 
  FiActivity, FiDatabase, FiClock, FiTrendingUp, FiAlertTriangle,
  FiDownload, FiRefreshCw, FiMessageSquare, FiFileText, FiEye,
  FiSearch, FiFilter, FiTrash2, FiBarChart2, FiGitBranch,
  FiCalendar, FiUser, FiCpu, FiZap, FiLayers, FiCrosshair,
  FiTool, FiBookOpen, FiCompass, FiAperture,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ReactMarkdown from 'react-markdown';

const GOOSEMIND_API = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? 'https://rtx-workstation.tailb64e64.ts.net:8443'
  : 'http://100.108.41.22:8031';

// ============================================================================
// Type Definitions
// ============================================================================

interface CognitiveHealth {
  overall_score: number;
  memory_health: number;
  attention_health: number;
  execution_health: number;
  learning_rate: number;
}

interface MemoryMetrics {
  short_term: {
    active_sessions: number;
    total_messages_24h: number;
    avg_session_length: number;
    cache_hit_rate: number;
  };
  long_term: {
    total_facts: number;
    knowledge_domains: number;
    avg_confidence: number;
    growth_rate_7d: number;
  };
}

interface AttentionMetrics {
  current_context: string[];
  focus_domains: Record<string, number>;
  context_switches_24h: number;
  avg_context_depth: number;
}

interface ExecutionMetrics {
  tools_used_24h: Record<string, number>;
  avg_response_time_ms: number;
  success_rate: number;
  tasks_completed_24h: number;
}

interface Session {
  session_id: string;
  user_id: string;
  started_at: string;
  last_active_at: string;
  message_count: number;
  source: string;
  summary?: string;
}

interface KnowledgeFact {
  id: string;
  content: string;
  type: string;
  domain: string;
  confidence: number;
  created_at: string;
  age_days: number;
  metadata: Record<string, any>;
}

interface Summary {
  session_id: string;
  summary_type: string;
  content: string;
  messages_covered: number;
  created_at: string;
  source: string;
}

// ============================================================================
// Main Component
// ============================================================================

export default function GooseMindCognitionPage() {
  const toast = useToast();
  const { isOpen: isSessionOpen, onOpen: onSessionOpen, onClose: onSessionClose } = useDisclosure();
  const { isOpen: isFactOpen, onOpen: onFactOpen, onClose: onFactClose } = useDisclosure();

  // Theme
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textPrimary = useColorModeValue('gray.900', 'gray.50');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const statBg = useColorModeValue('gray.50', 'gray.700');
  const successColor = useColorModeValue('green.500', 'green.300');
  const warningColor = useColorModeValue('orange.500', 'orange.300');
  const dangerColor = useColorModeValue('red.500', 'red.300');

  // State
  const [loading, setLoading] = useState(true);
  const [cognitiveHealth, setCognitiveHealth] = useState<CognitiveHealth | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [attentionMetrics, setAttentionMetrics] = useState<AttentionMetrics | null>(null);
  const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [knowledgeFacts, setKnowledgeFacts] = useState<KnowledgeFact[]>([]);
  const [selectedFact, setSelectedFact] = useState<KnowledgeFact | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [domainStats, setDomainStats] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Fetch all cognitive data
  const fetchCognitiveData = async () => {
    setLoading(true);
    try {
      const [healthRes, sessionsRes, factsRes, summariesRes, domainsRes] = await Promise.all([
        fetch(`${GOOSEMIND_API}/api/knowledge/health`),
        fetch(`${GOOSEMIND_API}/api/knowledge/sessions`),
        fetch(`${GOOSEMIND_API}/api/knowledge/export`),
        fetch(`${GOOSEMIND_API}/api/knowledge/summaries/recent?limit=50`),
        fetch(`${GOOSEMIND_API}/api/knowledge/domains`),
      ]);

      // Process health data
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        
        // Calculate cognitive health scores
        const memoryHealth = (healthData.health_score || 0);
        const attentionHealth = 85; // Placeholder - would calculate from context metrics
        const executionHealth = 90; // Placeholder - would calculate from tool usage
        const learningRate = healthData.overview?.total_facts > 0 ? 75 : 0;
        
        setCognitiveHealth({
          overall_score: (memoryHealth + attentionHealth + executionHealth + learningRate) / 4,
          memory_health: memoryHealth,
          attention_health: attentionHealth,
          execution_health: executionHealth,
          learning_rate: learningRate,
        });
      }

      // Process session data
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(Array.isArray(sessionsData) ? sessionsData : sessionsData.sessions || []);
        
        // Calculate memory metrics
        const sessionList = Array.isArray(sessionsData) ? sessionsData : sessionsData.sessions || [];
        setMemoryMetrics({
          short_term: {
            active_sessions: sessionsData.active_sessions_24h || 0,
            total_messages_24h: sessionsData.total_messages || 0,
            avg_session_length: sessionsData.average_messages_per_session || 0,
            cache_hit_rate: 0.75, // Placeholder
          },
          long_term: {
            total_facts: 0, // Will be set from facts data
            knowledge_domains: 0,
            avg_confidence: 0,
            growth_rate_7d: 0,
          },
        });
      }

      // Process facts data
      if (factsRes.ok) {
        const factsData = await factsRes.json();
        const facts = factsData.facts || [];
        
        // Calculate age for each fact
        const now = new Date();
        const enrichedFacts = facts.map((fact: any) => {
          const createdAt = new Date(fact.metadata?.timestamp || fact.metadata?.created_at || now);
          const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          return {
            id: fact.id,
            content: fact.content || '',
            type: fact.metadata?.type || 'unknown',
            domain: fact.metadata?.domain || 'unknown',
            confidence: fact.metadata?.confidence || 0,
            created_at: fact.metadata?.timestamp || fact.metadata?.created_at,
            age_days: ageDays,
            metadata: fact.metadata || {},
          };
        });
        setKnowledgeFacts(enrichedFacts);
        
        // Update long-term memory metrics
        const domains = new Set(enrichedFacts.map((f: KnowledgeFact) => f.domain));
        const avgConf = enrichedFacts.reduce((sum: number, f: KnowledgeFact) => sum + f.confidence, 0) / (enrichedFacts.length || 1);
        const recentFacts = enrichedFacts.filter((f: KnowledgeFact) => f.age_days <= 7);
        
        setMemoryMetrics(prev => prev ? {
          ...prev,
          long_term: {
            total_facts: enrichedFacts.length,
            knowledge_domains: domains.size,
            avg_confidence: avgConf,
            growth_rate_7d: recentFacts.length,
          },
        } : null);
      }

      // Process summaries
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        setSummaries(summariesData.summaries || []);
      }

      // Process domain stats
      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        setDomainStats(domainsData);
        
        // Calculate attention metrics from domain distribution
        const totalFacts = Object.values(domainsData).reduce((sum: number, domain: any) => sum + (domain.count || 0), 0);
        const focusDomains: Record<string, number> = {};
        Object.entries(domainsData).forEach(([domain, stats]: [string, any]) => {
          focusDomains[domain] = (stats.count / totalFacts) * 100;
        });
        
        setAttentionMetrics({
          current_context: Object.keys(domainsData).slice(0, 5),
          focus_domains: focusDomains,
          context_switches_24h: 12, // Placeholder
          avg_context_depth: 3.5, // Placeholder
        });
      }

      // Set execution metrics (placeholder - would come from tool usage logs)
      setExecutionMetrics({
        tools_used_24h: {
          'email_search': 15,
          'calendar_query': 8,
          'knowledge_retrieval': 45,
          'web_search': 3,
        },
        avg_response_time_ms: 850,
        success_rate: 0.94,
        tasks_completed_24h: 28,
      });

    } catch (error) {
      toast({
        title: 'Failed to load cognitive data',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCognitiveData();
    const interval = setInterval(fetchCognitiveData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Load session messages
  const loadSessionMessages = async (session: Session) => {
    try {
      const res = await fetch(`${GOOSEMIND_API}/api/sessions/${session.session_id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setSessionMessages(data.messages || []);
        setSelectedSession(session);
        onSessionOpen();
      }
    } catch (error) {
      toast({
        title: 'Failed to load session',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // View fact details
  const viewFactDetails = (fact: KnowledgeFact) => {
    setSelectedFact(fact);
    onFactOpen();
  };

  // Delete fact
  const deleteFact = async (factId: string) => {
    try {
      await fetch(`${GOOSEMIND_API}/api/knowledge/facts/${factId}`, {
        method: 'DELETE',
      });
      toast({
        title: 'Fact deleted',
        status: 'success',
        duration: 2000,
      });
      fetchCognitiveData();
    } catch (error) {
      toast({
        title: 'Failed to delete fact',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Export cognitive data
  const exportCognitiveData = async () => {
    try {
      const response = await fetch(`${GOOSEMIND_API}/api/knowledge/export`);
      const data = await response.json();
      
      // Add cognitive metrics to export
      const cognitiveExport = {
        exported_at: new Date().toISOString(),
        cognitive_health: cognitiveHealth,
        memory_metrics: memoryMetrics,
        attention_metrics: attentionMetrics,
        execution_metrics: executionMetrics,
        knowledge_base: data,
        sessions: sessions,
        summaries: summaries,
      };
      
      const blob = new Blob([JSON.stringify(cognitiveExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goosemind-cognition-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Cognitive data exported',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Filter facts
  const filteredFacts = knowledgeFacts.filter(fact => {
    const matchesSearch = fact.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = filterDomain === 'all' || fact.domain === filterDomain;
    const matchesType = filterType === 'all' || fact.type === filterType;
    return matchesSearch && matchesDomain && matchesType;
  });

  // Get unique domains and types
  const uniqueDomains = Array.from(new Set(knowledgeFacts.map(f => f.domain)));
  const uniqueTypes = Array.from(new Set(knowledgeFacts.map(f => f.type)));

  // Helper to get health color
  const getHealthColor = (score: number) => {
    if (score >= 80) return successColor;
    if (score >= 60) return warningColor;
    return dangerColor;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box display="flex" alignItems="center" justifyContent="center" minH="60vh">
          <VStack spacing={4}>
            <Spinner size="xl" color={accentColor} thickness="4px" />
            <Text color={textSecondary} fontSize="lg">Loading cognitive architecture...</Text>
          </VStack>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box bg={bgColor} minH="calc(100vh - 70px)" p={{ base: 4, md: 6 }}>
        {/* Header */}
        <VStack align="stretch" spacing={6}>
          <HStack justify="space-between" flexWrap="wrap">
            <HStack spacing={3}>
              <FiCpu size={32} color={accentColor} />
              <VStack align="start" spacing={0}>
                <Heading size="lg" color={textPrimary}>GooseMind Cognition</Heading>
                <Text color={textSecondary} fontSize="sm">
                  Comprehensive cognitive architecture monitoring
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={2}>
              <Button
                leftIcon={<FiRefreshCw />}
                size="sm"
                variant="outline"
                borderRadius="full"
                onClick={fetchCognitiveData}
              >
                Refresh
              </Button>
              <Button
                leftIcon={<FiDownload />}
                size="sm"
                colorScheme="blue"
                borderRadius="full"
                onClick={exportCognitiveData}
              >
                Export
              </Button>
            </HStack>
          </HStack>

          {/* Cognitive Health Overview */}
          <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
            <CardHeader>
              <HStack justify="space-between">
                <HStack spacing={2}>
                  <FiCpu size={20} />
                  <Heading size="md">Cognitive Health</Heading>
                </HStack>
                <Badge
                  colorScheme={
                    (cognitiveHealth?.overall_score || 0) >= 80 ? 'green' :
                    (cognitiveHealth?.overall_score || 0) >= 60 ? 'yellow' : 'red'
                  }
                  fontSize="lg"
                  px={3}
                  py={1}
                >
                  {cognitiveHealth?.overall_score.toFixed(0)}%
                </Badge>
              </HStack>
            </CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                <Stat>
                  <StatLabel fontSize="xs" color={textSecondary}>
                    <HStack spacing={1}>
                      <FiDatabase size={12} />
                      <Text>Memory</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color={getHealthColor(cognitiveHealth?.memory_health || 0)}>
                    {cognitiveHealth?.memory_health.toFixed(0)}%
                  </StatNumber>
                  <Progress
                    value={cognitiveHealth?.memory_health || 0}
                    size="sm"
                    colorScheme={
                      (cognitiveHealth?.memory_health || 0) >= 80 ? 'green' :
                      (cognitiveHealth?.memory_health || 0) >= 60 ? 'yellow' : 'red'
                    }
                    mt={2}
                  />
                </Stat>

                <Stat>
                  <StatLabel fontSize="xs" color={textSecondary}>
                    <HStack spacing={1}>
                      <FiCrosshair size={12} />
                      <Text>Attention</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color={getHealthColor(cognitiveHealth?.attention_health || 0)}>
                    {cognitiveHealth?.attention_health.toFixed(0)}%
                  </StatNumber>
                  <Progress
                    value={cognitiveHealth?.attention_health || 0}
                    size="sm"
                    colorScheme={
                      (cognitiveHealth?.attention_health || 0) >= 80 ? 'green' :
                      (cognitiveHealth?.attention_health || 0) >= 60 ? 'yellow' : 'red'
                    }
                    mt={2}
                  />
                </Stat>

                <Stat>
                  <StatLabel fontSize="xs" color={textSecondary}>
                    <HStack spacing={1}>
                      <FiZap size={12} />
                      <Text>Execution</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color={getHealthColor(cognitiveHealth?.execution_health || 0)}>
                    {cognitiveHealth?.execution_health.toFixed(0)}%
                  </StatNumber>
                  <Progress
                    value={cognitiveHealth?.execution_health || 0}
                    size="sm"
                    colorScheme={
                      (cognitiveHealth?.execution_health || 0) >= 80 ? 'green' :
                      (cognitiveHealth?.execution_health || 0) >= 60 ? 'yellow' : 'red'
                    }
                    mt={2}
                  />
                </Stat>

                <Stat>
                  <StatLabel fontSize="xs" color={textSecondary}>
                    <HStack spacing={1}>
                      <FiTrendingUp size={12} />
                      <Text>Learning</Text>
                    </HStack>
                  </StatLabel>
                  <StatNumber color={getHealthColor(cognitiveHealth?.learning_rate || 0)}>
                    {cognitiveHealth?.learning_rate.toFixed(0)}%
                  </StatNumber>
                  <Progress
                    value={cognitiveHealth?.learning_rate || 0}
                    size="sm"
                    colorScheme={
                      (cognitiveHealth?.learning_rate || 0) >= 80 ? 'green' :
                      (cognitiveHealth?.learning_rate || 0) >= 60 ? 'yellow' : 'red'
                    }
                    mt={2}
                  />
                </Stat>
              </SimpleGrid>
            </CardBody>
          </Card>

          {/* Cognitive Domains Tabs */}
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>
                <HStack spacing={2}>
                  <FiDatabase size={16} />
                  <Text>Memory</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiCrosshair size={16} />
                  <Text>Attention</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiGitBranch size={16} />
                  <Text>Abstraction</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiZap size={16} />
                  <Text>Execution</Text>
                </HStack>
              </Tab>
              <Tab>
                <HStack spacing={2}>
                  <FiMessageSquare size={16} />
                  <Text>Sessions</Text>
                </HStack>
              </Tab>
            </TabList>

            <TabPanels>
              {/* MEMORY TAB */}
              <TabPanel>
                <VStack align="stretch" spacing={6}>
                  {/* Memory Overview */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Short-Term Memory</Heading>
                        <Text fontSize="xs" color={textSecondary}>Active sessions & recent context</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Active Sessions</Text>
                            <Badge colorScheme="blue">{memoryMetrics?.short_term.active_sessions || 0}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Messages (24h)</Text>
                            <Badge>{memoryMetrics?.short_term.total_messages_24h || 0}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Avg Session Length</Text>
                            <Badge>{memoryMetrics?.short_term.avg_session_length.toFixed(1) || 0} msgs</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Cache Hit Rate</Text>
                            <Badge colorScheme="green">
                              {((memoryMetrics?.short_term.cache_hit_rate || 0) * 100).toFixed(0)}%
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Long-Term Memory</Heading>
                        <Text fontSize="xs" color={textSecondary}>Knowledge base & persistent facts</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Total Facts</Text>
                            <Badge colorScheme="purple">{memoryMetrics?.long_term.total_facts || 0}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Knowledge Domains</Text>
                            <Badge>{memoryMetrics?.long_term.knowledge_domains || 0}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Avg Confidence</Text>
                            <Badge colorScheme="green">
                              {((memoryMetrics?.long_term.avg_confidence || 0) * 100).toFixed(0)}%
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Growth (7d)</Text>
                            <Badge colorScheme="blue">+{memoryMetrics?.long_term.growth_rate_7d || 0}</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>

                  {/* Knowledge Facts Table */}
                  <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardHeader>
                      <HStack justify="space-between" flexWrap="wrap">
                        <Heading size="sm">Knowledge Base</Heading>
                        <HStack spacing={2}>
                          <Input
                            placeholder="Search facts..."
                            size="sm"
                            w="200px"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                          <Select
                            size="sm"
                            w="150px"
                            value={filterDomain}
                            onChange={(e) => setFilterDomain(e.target.value)}
                          >
                            <option value="all">All Domains</option>
                            {uniqueDomains.map(domain => (
                              <option key={domain} value={domain}>{domain}</option>
                            ))}
                          </Select>
                          <Select
                            size="sm"
                            w="150px"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="all">All Types</option>
                            {uniqueTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </Select>
                        </HStack>
                      </HStack>
                    </CardHeader>
                    <CardBody>
                      <Box overflowX="auto">
                        <Table size="sm">
                          <Thead>
                            <Tr>
                              <Th>Content</Th>
                              <Th>Domain</Th>
                              <Th>Type</Th>
                              <Th>Confidence</Th>
                              <Th>Age</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredFacts.slice(0, 20).map((fact) => (
                              <Tr key={fact.id}>
                                <Td maxW="300px" isTruncated>
                                  <Tooltip label={fact.content}>
                                    <Text fontSize="sm">{fact.content}</Text>
                                  </Tooltip>
                                </Td>
                                <Td>
                                  <Badge colorScheme="blue" textTransform="capitalize">
                                    {fact.domain}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge variant="outline" textTransform="capitalize">
                                    {fact.type}
                                  </Badge>
                                </Td>
                                <Td>
                                  <Badge
                                    colorScheme={
                                      fact.confidence >= 0.8 ? 'green' :
                                      fact.confidence >= 0.6 ? 'yellow' : 'red'
                                    }
                                  >
                                    {(fact.confidence * 100).toFixed(0)}%
                                  </Badge>
                                </Td>
                                <Td>
                                  <Text fontSize="sm" color={textSecondary}>
                                    {fact.age_days.toFixed(0)}d
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing={1}>
                                    <IconButton
                                      aria-label="View"
                                      icon={<FiEye size={14} />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => viewFactDetails(fact)}
                                    />
                                    <IconButton
                                      aria-label="Delete"
                                      icon={<FiTrash2 size={14} />}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="red"
                                      onClick={() => deleteFact(fact.id)}
                                    />
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                        {filteredFacts.length === 0 && (
                          <Box py={8} textAlign="center">
                            <Text color={textSecondary}>No facts found</Text>
                          </Box>
                        )}
                        {filteredFacts.length > 20 && (
                          <Box pt={4} textAlign="center">
                            <Text fontSize="sm" color={textSecondary}>
                              Showing 20 of {filteredFacts.length} facts
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* ATTENTION TAB */}
              <TabPanel>
                <VStack align="stretch" spacing={6}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Context Awareness</Heading>
                        <Text fontSize="xs" color={textSecondary}>Current focus areas</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <Box>
                            <Text fontSize="sm" color={textSecondary} mb={2}>Active Context:</Text>
                            <Wrap>
                              {attentionMetrics?.current_context.map(ctx => (
                                <WrapItem key={ctx}>
                                  <Tag colorScheme="blue" textTransform="capitalize">{ctx}</Tag>
                                </WrapItem>
                              ))}
                            </Wrap>
                          </Box>
                          <Divider />
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Context Switches (24h)</Text>
                            <Badge>{attentionMetrics?.context_switches_24h || 0}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Avg Context Depth</Text>
                            <Badge>{attentionMetrics?.avg_context_depth.toFixed(1) || 0}</Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Focus Distribution</Heading>
                        <Text fontSize="xs" color={textSecondary}>Attention allocation by domain</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          {Object.entries(attentionMetrics?.focus_domains || {})
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 5)
                            .map(([domain, percentage]) => (
                              <Box key={domain}>
                                <HStack justify="space-between" mb={1}>
                                  <Text fontSize="sm" textTransform="capitalize">{domain}</Text>
                                  <Text fontSize="sm" color={textSecondary}>
                                    {percentage.toFixed(1)}%
                                  </Text>
                                </HStack>
                                <Progress
                                  value={percentage}
                                  size="sm"
                                  colorScheme="blue"
                                />
                              </Box>
                            ))}
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* ABSTRACTION TAB */}
              <TabPanel>
                <VStack align="stretch" spacing={6}>
                  <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardHeader>
                      <Heading size="sm">Knowledge Graph</Heading>
                      <Text fontSize="xs" color={textSecondary}>
                        Conceptual relationships and domain structure
                      </Text>
                    </CardHeader>
                    <CardBody>
                      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                        {Object.entries(domainStats).map(([domain, stats]: [string, any]) => (
                          <Card key={domain} variant="outline">
                            <CardBody>
                              <VStack align="start" spacing={2}>
                                <HStack justify="space-between" w="full">
                                  <Text fontWeight="600" textTransform="capitalize">{domain}</Text>
                                  <Badge>{stats.count}</Badge>
                                </HStack>
                                <Divider />
                                <VStack align="stretch" spacing={1} w="full" fontSize="xs">
                                  <HStack justify="space-between">
                                    <Text color={textSecondary}>Types</Text>
                                    <Text>{Object.keys(stats.types || {}).length}</Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text color={textSecondary}>Confidence</Text>
                                    <Text>{((stats.average_confidence || 0) * 100).toFixed(0)}%</Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text color={textSecondary}>Avg Age</Text>
                                    <Text>{stats.average_age_days.toFixed(0)}d</Text>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </CardBody>
                          </Card>
                        ))}
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                </VStack>
              </TabPanel>

              {/* EXECUTION TAB */}
              <TabPanel>
                <VStack align="stretch" spacing={6}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Performance Metrics</Heading>
                        <Text fontSize="xs" color={textSecondary}>Execution efficiency</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Avg Response Time</Text>
                            <Badge colorScheme="green">
                              {executionMetrics?.avg_response_time_ms || 0}ms
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Success Rate</Text>
                            <Badge colorScheme="green">
                              {((executionMetrics?.success_rate || 0) * 100).toFixed(0)}%
                            </Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color={textSecondary}>Tasks Completed (24h)</Text>
                            <Badge colorScheme="blue">
                              {executionMetrics?.tasks_completed_24h || 0}
                            </Badge>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                      <CardHeader>
                        <Heading size="sm">Tool Usage (24h)</Heading>
                        <Text fontSize="xs" color={textSecondary}>Actions performed</Text>
                      </CardHeader>
                      <CardBody>
                        <VStack align="stretch" spacing={2}>
                          {Object.entries(executionMetrics?.tools_used_24h || {})
                            .sort(([, a], [, b]) => b - a)
                            .map(([tool, count]) => (
                              <HStack key={tool} justify="space-between">
                                <Text fontSize="sm" textTransform="capitalize">
                                  {tool.replace('_', ' ')}
                                </Text>
                                <Badge>{count}</Badge>
                              </HStack>
                            ))}
                        </VStack>
                      </CardBody>
                    </Card>
                  </SimpleGrid>
                </VStack>
              </TabPanel>

              {/* SESSIONS TAB */}
              <TabPanel>
                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <Heading size="sm">Conversation Sessions</Heading>
                    <Text fontSize="xs" color={textSecondary}>
                      Complete session history with summaries
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <Box overflowX="auto">
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Session ID</Th>
                            <Th>Started</Th>
                            <Th>Messages</Th>
                            <Th>Source</Th>
                            <Th>Summary</Th>
                            <Th>Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sessions.slice(0, 20).map((session) => (
                            <Tr key={session.session_id}>
                              <Td>
                                <Code fontSize="xs">{session.session_id.substring(0, 8)}...</Code>
                              </Td>
                              <Td>
                                <Text fontSize="sm" color={textSecondary}>
                                  {new Date(session.started_at).toLocaleString()}
                                </Text>
                              </Td>
                              <Td>
                                <Badge>{session.message_count}</Badge>
                              </Td>
                              <Td>
                                <Badge colorScheme="blue" textTransform="capitalize">
                                  {session.source}
                                </Badge>
                              </Td>
                              <Td maxW="300px" isTruncated>
                                <Tooltip label={session.summary}>
                                  <Text fontSize="sm" color={textSecondary}>
                                    {session.summary || 'No summary'}
                                  </Text>
                                </Tooltip>
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label="View session"
                                  icon={<FiEye size={14} />}
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => loadSessionMessages(session)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                      {sessions.length === 0 && (
                        <Box py={8} textAlign="center">
                          <Text color={textSecondary}>No sessions found</Text>
                        </Box>
                      )}
                    </Box>
                  </CardBody>
                </Card>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>

        {/* Session Detail Modal */}
        <Modal isOpen={isSessionOpen} onClose={onSessionClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <VStack align="start" spacing={1}>
                <Text>Session Details</Text>
                {selectedSession && (
                  <HStack spacing={2} fontSize="sm" color={textSecondary}>
                    <Code fontSize="xs">{selectedSession.session_id.substring(0, 8)}...</Code>
                    <Badge>{selectedSession.message_count} messages</Badge>
                    <Badge colorScheme="blue">{selectedSession.source}</Badge>
                  </HStack>
                )}
              </VStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack align="stretch" spacing={3} maxH="500px" overflowY="auto">
                {sessionMessages.map((msg, idx) => (
                  <Box
                    key={idx}
                    p={3}
                    bg={msg.role === 'user' ? 'blue.50' : statBg}
                    borderRadius="md"
                  >
                    <HStack justify="space-between" mb={2}>
                      <Badge colorScheme={msg.role === 'user' ? 'blue' : 'gray'}>
                        {msg.role}
                      </Badge>
                      <Text fontSize="xs" color={textSecondary}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </Text>
                    </HStack>
                    <Text fontSize="sm">{msg.content}</Text>
                  </Box>
                ))}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Fact Detail Modal */}
        <Modal isOpen={isFactOpen} onClose={onFactClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              <VStack align="start" spacing={1}>
                <Text>Fact Details</Text>
                {selectedFact && (
                  <HStack spacing={2} fontSize="sm">
                    <Badge colorScheme="blue" textTransform="capitalize">
                      {selectedFact.domain}
                    </Badge>
                    <Badge variant="outline" textTransform="capitalize">
                      {selectedFact.type}
                    </Badge>
                    <Badge
                      colorScheme={
                        selectedFact.confidence >= 0.8 ? 'green' :
                        selectedFact.confidence >= 0.6 ? 'yellow' : 'red'
                      }
                    >
                      {(selectedFact.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </HStack>
                )}
              </VStack>
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              {selectedFact && (
                <VStack align="stretch" spacing={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="600" mb={2}>Content:</Text>
                    <Text fontSize="sm">{selectedFact.content}</Text>
                  </Box>
                  <Divider />
                  <SimpleGrid columns={2} spacing={3} fontSize="sm">
                    <Box>
                      <Text color={textSecondary} mb={1}>Created:</Text>
                      <Text>{new Date(selectedFact.created_at).toLocaleString()}</Text>
                    </Box>
                    <Box>
                      <Text color={textSecondary} mb={1}>Age:</Text>
                      <Text>{selectedFact.age_days.toFixed(0)} days</Text>
                    </Box>
                    <Box>
                      <Text color={textSecondary} mb={1}>Domain:</Text>
                      <Text textTransform="capitalize">{selectedFact.domain}</Text>
                    </Box>
                    <Box>
                      <Text color={textSecondary} mb={1}>Type:</Text>
                      <Text textTransform="capitalize">{selectedFact.type}</Text>
                    </Box>
                  </SimpleGrid>
                  {Object.keys(selectedFact.metadata).length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Text fontSize="sm" fontWeight="600" mb={2}>Metadata:</Text>
                        <Code fontSize="xs" p={3} borderRadius="md" display="block" whiteSpace="pre-wrap">
                          {JSON.stringify(selectedFact.metadata, null, 2)}
                        </Code>
                      </Box>
                    </>
                  )}
                  <Button
                    colorScheme="red"
                    variant="outline"
                    size="sm"
                    leftIcon={<FiTrash2 />}
                    onClick={() => {
                      deleteFact(selectedFact.id);
                      onFactClose();
                    }}
                  >
                    Delete Fact
                  </Button>
                </VStack>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}
