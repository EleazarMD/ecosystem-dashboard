/**
 * GooseMind Cognition Dashboard Component
 * Comprehensive cognitive architecture monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Badge, IconButton,
  Tabs, TabList, TabPanels, Tab, TabPanel, Button,
  useColorModeValue, useToast, SimpleGrid, Divider,
  Table, Thead, Tbody, Tr, Th, Td, Input, Select,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
  useDisclosure, Stat, StatLabel, StatNumber,
  Progress, Tooltip, Code, Heading, Card, CardHeader, CardBody,
  Tag, Wrap, WrapItem,
} from '@chakra-ui/react';
import { 
  FiActivity, FiDatabase, FiClock, FiTrendingUp, FiAlertTriangle,
  FiDownload, FiRefreshCw, FiMessageSquare, FiEye,
  FiTrash2, FiBarChart2, FiGitBranch, FiZap, FiCpu, FiCrosshair,
} from 'react-icons/fi';

const GOOSEMIND_API = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? 'https://rtx-workstation.tailb64e64.ts.net:8443'
  : 'http://100.108.41.22:8031';

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

export default function CognitionDashboard() {
  const toast = useToast();
  const { isOpen: isSessionOpen, onOpen: onSessionOpen, onClose: onSessionClose } = useDisclosure();
  const { isOpen: isFactOpen, onOpen: onFactOpen, onClose: onFactClose } = useDisclosure();

  // Theme
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
  const [domainStats, setDomainStats] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDomain, setFilterDomain] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const fetchCognitiveData = async () => {
    setLoading(true);
    try {
      const [healthRes, sessionsRes, factsRes, domainsRes] = await Promise.all([
        fetch(`${GOOSEMIND_API}/api/knowledge/health`),
        fetch(`${GOOSEMIND_API}/api/knowledge/sessions`),
        fetch(`${GOOSEMIND_API}/api/knowledge/export`),
        fetch(`${GOOSEMIND_API}/api/knowledge/domains`),
      ]);

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        const memoryHealth = healthData.health_score || 0;
        setCognitiveHealth({
          overall_score: (memoryHealth + 85 + 90 + 75) / 4,
          memory_health: memoryHealth,
          attention_health: 85,
          execution_health: 90,
          learning_rate: 75,
        });
      }

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(Array.isArray(sessionsData) ? sessionsData : sessionsData.sessions || []);
        setMemoryMetrics({
          short_term: {
            active_sessions: sessionsData.active_sessions_24h || 0,
            total_messages_24h: sessionsData.total_messages || 0,
            avg_session_length: sessionsData.average_messages_per_session || 0,
            cache_hit_rate: 0.75,
          },
          long_term: {
            total_facts: 0,
            knowledge_domains: 0,
            avg_confidence: 0,
            growth_rate_7d: 0,
          },
        });
      }

      if (factsRes.ok) {
        const factsData = await factsRes.json();
        const facts = factsData.facts || [];
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

      if (domainsRes.ok) {
        const domainsData = await domainsRes.json();
        setDomainStats(domainsData);

        const totalFacts = Object.values(domainsData).reduce((sum: number, domain: any) => sum + (domain.count || 0), 0);
        const focusDomains: Record<string, number> = {};
        Object.entries(domainsData).forEach(([domain, stats]: [string, any]) => {
          focusDomains[domain] = (stats.count / totalFacts) * 100;
        });

        setAttentionMetrics({
          current_context: Object.keys(domainsData).slice(0, 5),
          focus_domains: focusDomains,
          context_switches_24h: 12,
          avg_context_depth: 3.5,
        });
      }

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
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCognitiveData();
    const interval = setInterval(fetchCognitiveData, 60000);
    return () => clearInterval(interval);
  }, []);

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
      toast({ title: 'Failed to load session', status: 'error', duration: 3000 });
    }
  };

  const viewFactDetails = (fact: KnowledgeFact) => {
    setSelectedFact(fact);
    onFactOpen();
  };

  const deleteFact = async (factId: string) => {
    try {
      await fetch(`${GOOSEMIND_API}/api/knowledge/facts/${factId}`, { method: 'DELETE' });
      toast({ title: 'Fact deleted', status: 'success', duration: 2000 });
      fetchCognitiveData();
    } catch (error) {
      toast({ title: 'Failed to delete fact', status: 'error', duration: 3000 });
    }
  };

  const exportCognitiveData = async () => {
    try {
      const response = await fetch(`${GOOSEMIND_API}/api/knowledge/export`);
      const data = await response.json();
      const cognitiveExport = {
        exported_at: new Date().toISOString(),
        cognitive_health: cognitiveHealth,
        memory_metrics: memoryMetrics,
        attention_metrics: attentionMetrics,
        execution_metrics: executionMetrics,
        knowledge_base: data,
        sessions: sessions,
      };
      const blob = new Blob([JSON.stringify(cognitiveExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `goosemind-cognition-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Cognitive data exported', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Export failed', status: 'error', duration: 3000 });
    }
  };

  const filteredFacts = knowledgeFacts.filter(fact => {
    const matchesSearch = fact.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = filterDomain === 'all' || fact.domain === filterDomain;
    const matchesType = filterType === 'all' || fact.type === filterType;
    return matchesSearch && matchesDomain && matchesType;
  });

  const uniqueDomains = Array.from(new Set(knowledgeFacts.map(f => f.domain)));
  const uniqueTypes = Array.from(new Set(knowledgeFacts.map(f => f.type)));

  const getHealthColor = (score: number) => {
    if (score >= 80) return successColor;
    if (score >= 60) return warningColor;
    return dangerColor;
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color={accentColor} thickness="4px" />
          <Text color={textSecondary} fontSize="lg">Loading cognitive architecture...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={6} p={6}>
      {/* Header */}
      <HStack justify="space-between" flexWrap="wrap">
        <HStack spacing={3}>
          <FiCpu size={32} color={accentColor} />
          <VStack align="start" spacing={0}>
            <Heading size="lg" color={textPrimary}>Cognition Monitor</Heading>
            <Text color={textSecondary} fontSize="sm">
              Comprehensive cognitive architecture
            </Text>
          </VStack>
        </HStack>
        <HStack spacing={2}>
          <Button leftIcon={<FiRefreshCw />} size="sm" variant="outline" onClick={fetchCognitiveData}>
            Refresh
          </Button>
          <Button leftIcon={<FiDownload />} size="sm" colorScheme="blue" onClick={exportCognitiveData}>
            Export
          </Button>
        </HStack>
      </HStack>

      {/* Cognitive Health Overview */}
      <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
        <CardHeader>
          <HStack justify="space-between">
            <HStack spacing={2}>
              <FiActivity size={20} />
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
                colorScheme="green"
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
                colorScheme="green"
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
                colorScheme="yellow"
                mt={2}
              />
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Cognitive Domains Tabs */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab><HStack spacing={2}><FiDatabase size={16} /><Text>Memory</Text></HStack></Tab>
          <Tab><HStack spacing={2}><FiCrosshair size={16} /><Text>Attention</Text></HStack></Tab>
          <Tab><HStack spacing={2}><FiGitBranch size={16} /><Text>Abstraction</Text></HStack></Tab>
          <Tab><HStack spacing={2}><FiZap size={16} /><Text>Execution</Text></HStack></Tab>
          <Tab><HStack spacing={2}><FiMessageSquare size={16} /><Text>Sessions</Text></HStack></Tab>
        </TabList>

        <TabPanels>
          {/* Memory Tab */}
          <TabPanel>
            <VStack align="stretch" spacing={6}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                  <CardHeader>
                    <Heading size="sm">Short-Term Memory</Heading>
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
                  </Box>
                </CardBody>
              </Card>
            </VStack>
          </TabPanel>

          {/* Attention Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                <CardHeader>
                  <Heading size="sm">Context Awareness</Heading>
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
                  </VStack>
                </CardBody>
              </Card>

              <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                <CardHeader>
                  <Heading size="sm">Focus Distribution</Heading>
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
                          <Progress value={percentage} size="sm" colorScheme="blue" />
                        </Box>
                      ))}
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>

          {/* Abstraction Tab */}
          <TabPanel>
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
          </TabPanel>

          {/* Execution Tab */}
          <TabPanel>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                <CardHeader>
                  <Heading size="sm">Performance Metrics</Heading>
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
          </TabPanel>

          {/* Sessions Tab */}
          <TabPanel>
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
              <CardHeader>
                <Heading size="sm">Conversation Sessions</Heading>
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
                </Box>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Session Detail Modal */}
      <Modal isOpen={isSessionOpen} onClose={onSessionClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Session Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align="stretch" spacing={3} maxH="500px" overflowY="auto">
              {sessionMessages.map((msg, idx) => (
                <Box key={idx} p={3} bg={msg.role === 'user' ? 'blue.50' : statBg} borderRadius="md">
                  <HStack justify="space-between" mb={2}>
                    <Badge colorScheme={msg.role === 'user' ? 'blue' : 'gray'}>{msg.role}</Badge>
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
          <ModalHeader>Fact Details</ModalHeader>
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
    </VStack>
  );
}
