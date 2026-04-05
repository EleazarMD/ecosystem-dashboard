/**
 * GooseMind Memory Dashboard
 * Transparent view of agent memories, summaries, and knowledge health
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Badge, IconButton,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useColorModeValue, useToast, SimpleGrid,
  Progress, Tooltip, Button, Collapse,
} from '@chakra-ui/react';
import { 
  FiDatabase, FiClock, FiTrendingUp, FiAlertTriangle,
  FiDownload, FiTrash2, FiRefreshCw, FiBarChart2,
  FiMessageSquare, FiFileText, FiChevronDown, FiChevronUp
} from 'react-icons/fi';

const GOOSEMIND_API = typeof window !== 'undefined' && window.location.protocol === 'https:'
  ? 'https://rtx-workstation.tailb64e64.ts.net:8031'
  : 'http://100.108.41.22:8031';

interface KnowledgeOverview {
  total_facts: number;
  stale_facts: number;
  staleness_percentage: number;
  average_age_days: number;
  average_confidence: number;
  domains: Record<string, number>;
  types: Record<string, number>;
  age_distribution: Record<string, number>;
  staleness_threshold_days: number;
}

interface SessionStats {
  total_sessions: number;
  active_sessions_24h: number;
  total_messages: number;
  average_messages_per_session: number;
  sessions_by_source: Record<string, number>;
  sessions_with_summaries: number;
  total_summaries: number;
  daily_activity: Array<{ date: string; count: number }>;
}

interface StaleFact {
  id: string;
  content: string;
  age_days: number;
  created_at: string;
  metadata: Record<string, any>;
}

interface Summary {
  session_id: string;
  summary_type: string;
  content: string;
  messages_covered: number;
  created_at: string;
  user_id: string;
  source: string;
  total_messages: number;
}

export default function MemoryDashboard() {
  const toast = useToast();
  
  const [overview, setOverview] = useState<KnowledgeOverview | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [staleFacts, setStaleFacts] = useState<StaleFact[]>([]);
  const [recentSummaries, setRecentSummaries] = useState<Summary[]>([]);
  const [domainStats, setDomainStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Theme colors
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textPrimary = useColorModeValue('gray.900', 'gray.50');
  const textSecondary = useColorModeValue('gray.600', 'gray.400');
  const statBg = useColorModeValue('gray.50', 'gray.700');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewRes, sessionRes, staleRes, summariesRes, domainsRes, healthRes] = await Promise.all([
        fetch(`${GOOSEMIND_API}/api/knowledge/overview`),
        fetch(`${GOOSEMIND_API}/api/knowledge/sessions`),
        fetch(`${GOOSEMIND_API}/api/knowledge/stale-facts?limit=10`),
        fetch(`${GOOSEMIND_API}/api/knowledge/summaries/recent?limit=5`),
        fetch(`${GOOSEMIND_API}/api/knowledge/domains`),
        fetch(`${GOOSEMIND_API}/api/knowledge/health`)
      ]);

      if (!overviewRes.ok || !sessionRes.ok) {
        throw new Error("Failed to fetch knowledge data");
      }

      const overviewData = await overviewRes.json();
      const sessionData = await sessionRes.json();
      const staleData = await staleRes.json();
      const summariesData = await summariesRes.json();
      const domainsData = await domainsRes.json();
      const healthData = await healthRes.json();

      setOverview(overviewData);
      setSessionStats(sessionData);
      setStaleFacts(staleData.facts || []);
      setRecentSummaries(summariesData.summaries || []);
      setDomainStats(domainsData);
      setHealthScore(healthData.health_score || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast({
        title: "Failed to load memory data",
        description: err instanceof Error ? err.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    try {
      const response = await fetch(`${GOOSEMIND_API}/api/knowledge/export`);
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `goosemind-knowledge-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Knowledge exported",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Export failed",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleDeleteFact = async (factId: string) => {
    try {
      await fetch(`${GOOSEMIND_API}/api/knowledge/facts/${factId}`, {
        method: "DELETE"
      });
      
      toast({
        title: "Fact deleted",
        status: "success",
        duration: 2000,
      });
      
      fetchData();
    } catch (err) {
      toast({
        title: "Delete failed",
        status: "error",
        duration: 3000,
      });
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "green.500";
    if (score >= 60) return "yellow.500";
    return "red.500";
  };

  if (loading) {
    return (
      <Box p={6} bg={cardBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
        <VStack spacing={3}>
          <Spinner size="md" color={accentColor} />
          <Text color={textSecondary} fontSize="sm">Loading memory data...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.50" borderRadius="lg" border="1px solid" borderColor="red.200">
        <HStack spacing={2}>
          <FiAlertTriangle color="red" />
          <Text color="red.700" fontSize="sm">{error}</Text>
        </HStack>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Header with expand/collapse */}
      <HStack justify="space-between">
        <HStack spacing={2}>
          <FiDatabase size={20} color={accentColor} />
          <Text fontWeight="600" fontSize="lg" color={textPrimary}>
            Memory Dashboard
          </Text>
          <Badge colorScheme={healthScore >= 80 ? "green" : healthScore >= 60 ? "yellow" : "red"}>
            Health: {healthScore.toFixed(0)}%
          </Badge>
        </HStack>
        <HStack spacing={1}>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw size={16} />}
              size="sm"
              variant="ghost"
              onClick={fetchData}
            />
          </Tooltip>
          <Tooltip label="Export">
            <IconButton
              aria-label="Export"
              icon={<FiDownload size={16} />}
              size="sm"
              variant="ghost"
              onClick={handleExport}
            />
          </Tooltip>
          <IconButton
            aria-label={isExpanded ? "Collapse" : "Expand"}
            icon={isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </HStack>
      </HStack>

      {/* Compact Overview */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        <Box p={3} bg={statBg} borderRadius="md">
          <VStack align="start" spacing={1}>
            <HStack spacing={1}>
              <FiDatabase size={14} />
              <Text fontSize="xs" color={textSecondary}>Facts</Text>
            </HStack>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              {overview?.total_facts || 0}
            </Text>
          </VStack>
        </Box>

        <Box p={3} bg={statBg} borderRadius="md">
          <VStack align="start" spacing={1}>
            <HStack spacing={1}>
              <FiClock size={14} />
              <Text fontSize="xs" color={textSecondary}>Avg Age</Text>
            </HStack>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              {overview?.average_age_days.toFixed(0) || 0}d
            </Text>
          </VStack>
        </Box>

        <Box p={3} bg={statBg} borderRadius="md">
          <VStack align="start" spacing={1}>
            <HStack spacing={1}>
              <FiAlertTriangle size={14} />
              <Text fontSize="xs" color={textSecondary}>Stale</Text>
            </HStack>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              {overview?.stale_facts || 0}
            </Text>
          </VStack>
        </Box>

        <Box p={3} bg={statBg} borderRadius="md">
          <VStack align="start" spacing={1}>
            <HStack spacing={1}>
              <FiMessageSquare size={14} />
              <Text fontSize="xs" color={textSecondary}>Sessions (24h)</Text>
            </HStack>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              {sessionStats?.active_sessions_24h || 0}
            </Text>
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Expanded Details */}
      <Collapse in={isExpanded} animateOpacity>
        <Tabs size="sm" variant="soft-rounded" colorScheme="blue">
          <TabList>
            <Tab fontSize="xs"><FiBarChart2 size={12} style={{ marginRight: 4 }} /> Domains</Tab>
            <Tab fontSize="xs"><FiClock size={12} style={{ marginRight: 4 }} /> Stale</Tab>
            <Tab fontSize="xs"><FiFileText size={12} style={{ marginRight: 4 }} /> Summaries</Tab>
            <Tab fontSize="xs"><FiMessageSquare size={12} style={{ marginRight: 4 }} /> Sessions</Tab>
          </TabList>

          <TabPanels>
            {/* Domains */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={2}>
                {Object.entries(domainStats).slice(0, 5).map(([domain, stats]: [string, any]) => (
                  <Box key={domain} p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" fontWeight="600" textTransform="capitalize">{domain}</Text>
                      <Badge>{stats.count} facts</Badge>
                    </HStack>
                    <SimpleGrid columns={3} spacing={2} fontSize="xs">
                      <Box>
                        <Text color={textSecondary}>Age</Text>
                        <Text fontWeight="600">{stats.average_age_days.toFixed(0)}d</Text>
                      </Box>
                      <Box>
                        <Text color={textSecondary}>Confidence</Text>
                        <Text fontWeight="600">{(stats.average_confidence * 100).toFixed(0)}%</Text>
                      </Box>
                      <Box>
                        <Text color={textSecondary}>Stale</Text>
                        <Text fontWeight="600">{stats.stale_count}</Text>
                      </Box>
                    </SimpleGrid>
                  </Box>
                ))}
              </VStack>
            </TabPanel>

            {/* Stale Facts */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={2}>
                {staleFacts.slice(0, 5).map((fact) => (
                  <Box key={fact.id} p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                    <HStack justify="space-between" align="start" mb={1}>
                      <Text fontSize="sm" flex={1}>{fact.content}</Text>
                      <IconButton
                        aria-label="Delete"
                        icon={<FiTrash2 size={12} />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={() => handleDeleteFact(fact.id)}
                      />
                    </HStack>
                    <HStack spacing={3} fontSize="xs" color={textSecondary}>
                      <Text>{fact.age_days.toFixed(0)} days old</Text>
                      <Text>{fact.metadata.domain}</Text>
                      <Text>{fact.metadata.type}</Text>
                    </HStack>
                  </Box>
                ))}
                {staleFacts.length === 0 && (
                  <Text fontSize="sm" color={textSecondary} textAlign="center" py={4}>
                    No stale facts. Knowledge base is fresh!
                  </Text>
                )}
              </VStack>
            </TabPanel>

            {/* Summaries */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={2}>
                {recentSummaries.slice(0, 5).map((summary) => (
                  <Box key={summary.session_id} p={3} bg={cardBg} borderRadius="md" border="1px solid" borderColor={borderColor}>
                    <HStack justify="space-between" mb={2}>
                      <HStack spacing={2}>
                        <Badge variant="outline">{summary.summary_type}</Badge>
                        <Badge colorScheme="blue">{summary.source}</Badge>
                      </HStack>
                      <Text fontSize="xs" color={textSecondary}>
                        {new Date(summary.created_at).toLocaleDateString()}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" mb={2}>{summary.content}</Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {summary.messages_covered}/{summary.total_messages} messages
                    </Text>
                  </Box>
                ))}
                {recentSummaries.length === 0 && (
                  <Text fontSize="sm" color={textSecondary} textAlign="center" py={4}>
                    No summaries yet. Summaries are created every 10 messages.
                  </Text>
                )}
              </VStack>
            </TabPanel>

            {/* Sessions */}
            <TabPanel px={0}>
              <SimpleGrid columns={2} spacing={3}>
                <Box p={3} bg={statBg} borderRadius="md">
                  <VStack align="start" spacing={2}>
                    <Text fontSize="xs" color={textSecondary} fontWeight="600">Overview</Text>
                    <VStack align="stretch" spacing={1} w="full" fontSize="xs">
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Total</Text>
                        <Text fontWeight="600">{sessionStats?.total_sessions || 0}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Messages</Text>
                        <Text fontWeight="600">{sessionStats?.total_messages || 0}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text color={textSecondary}>Avg/Session</Text>
                        <Text fontWeight="600">{sessionStats?.average_messages_per_session.toFixed(1) || 0}</Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Box>

                <Box p={3} bg={statBg} borderRadius="md">
                  <VStack align="start" spacing={2}>
                    <Text fontSize="xs" color={textSecondary} fontWeight="600">By Source</Text>
                    <VStack align="stretch" spacing={1} w="full" fontSize="xs">
                      {Object.entries(sessionStats?.sessions_by_source || {}).map(([source, count]) => (
                        <HStack key={source} justify="space-between">
                          <Text color={textSecondary} textTransform="capitalize">{source}</Text>
                          <Text fontWeight="600">{count}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                </Box>
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Collapse>
    </VStack>
  );
}
