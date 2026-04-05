/**
 * Nova Cache Intelligence Panel
 * Displays cache statistics, OpenClaw recommendations, and warming schedules
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Text,
  Badge,
  VStack,
  HStack,
  Progress,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Alert,
  AlertIcon,
  Spinner,
  Tooltip,
  useColorMode,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  Icon,
  Code,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useToast,
  Flex,
  Tag,
  TagLabel,
  TagLeftIcon,
} from '@chakra-ui/react';
import {
  Brain,
  Database,
  Zap,
  Clock,
  TrendingUp,
  RefreshCw,
  Sun,
  Cloud,
  Calendar,
  Mail,
  Server,
  Lightbulb,
  Target,
  Activity,
  ThermometerSun,
  Leaf,
} from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';

interface CacheStats {
  hits: number;
  misses: number;
  hit_rate: string;
  evictions: number;
  entries: number;
  max_size: number;
  patterns_learned: number;
  ttls_adapted: number;
  adaptive_adjustments: number;
  warm_hits: number;
}

interface WarmingSchedule {
  name: string;
  tool: string;
  hours: number[];
  days: number[] | null;
  last_run: string | null;
}

interface UpcomingWarming {
  name: string;
  tool: string;
  scheduled_for: string;
  minutes_until: number;
}

interface SeasonalContext {
  season: string;
  month: number;
  is_dst: boolean;
  daylight_hours: number;
  weather_concerns: string[];
  suggested_queries: string[];
}

interface OrchestratorStatus {
  running: boolean;
  last_analysis: string | null;
  recommendations_count: number;
  analysis_interval_hours: number;
  next_analysis_in: string;
}

interface Recommendation {
  schedule_changes?: Array<{
    action: string;
    name: string;
    tool: string;
    hours?: number[];
    days?: number[];
    reason: string;
  }>;
  ttl_adjustments?: Array<{
    tool: string;
    current_ttl: number;
    recommended_ttl: number;
    reason: string;
  }>;
  prewarm_suggestions?: Array<{
    tool: string;
    args: Record<string, unknown>;
    when: string;
    reason: string;
  }>;
  eviction_priorities?: Array<{
    tool: string;
    priority: string;
    reason: string;
  }>;
  insights?: string;
}

const NovaCacheIntelligence: React.FC = () => {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [warmingStatus, setWarmingStatus] = useState<{ schedules: WarmingSchedule[]; season: string } | null>(null);
  const [upcomingWarmings, setUpcomingWarmings] = useState<UpcomingWarming[]>([]);
  const [seasonalContext, setSeasonalContext] = useState<SeasonalContext | null>(null);
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const [statsRes, warmingRes, upcomingRes, seasonalRes, orchRes, recsRes] = await Promise.all([
        fetch('/api/nova/cache/stats'),
        fetch('/api/nova/cache/warming?endpoint=status'),
        fetch('/api/nova/cache/warming?endpoint=upcoming&hours=6'),
        fetch('/api/nova/cache/warming?endpoint=seasonal'),
        fetch('/api/nova/cache/orchestrator?endpoint=status'),
        fetch('/api/nova/cache/orchestrator?endpoint=recommendations'),
      ]);

      if (statsRes.ok) setCacheStats(await statsRes.json());
      if (warmingRes.ok) setWarmingStatus(await warmingRes.json());
      if (upcomingRes.ok) {
        const data = await upcomingRes.json();
        setUpcomingWarmings(data.upcoming || []);
      }
      if (seasonalRes.ok) setSeasonalContext(await seasonalRes.json());
      if (orchRes.ok) setOrchestratorStatus(await orchRes.json());
      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || null);
      }
    } catch (err) {
      setError('Failed to connect to Nova Cache API');
      console.error('Cache intelligence fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/nova/cache/orchestrator?endpoint=analyze', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.result || null);
        toast({
          title: 'Analysis Complete',
          description: 'OpenClaw has analyzed cache patterns and applied recommendations.',
          status: 'success',
          duration: 5000,
        });
        fetchData();
      }
    } catch (err) {
      toast({
        title: 'Analysis Failed',
        description: 'Could not reach OpenClaw for analysis.',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring': return Leaf;
      case 'summer': return Sun;
      case 'fall': return Cloud;
      case 'winter': return ThermometerSun;
      default: return Sun;
    }
  };

  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'spring': return 'green';
      case 'summer': return 'orange';
      case 'fall': return 'yellow';
      case 'winter': return 'blue';
      default: return 'gray';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.400" />
          <Text color="gray.500">Loading Nova Cache Intelligence...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Header with Refresh */}
      <HStack justify="space-between">
        <HStack spacing={3}>
          <Icon as={Brain} boxSize={6} color="purple.400" />
          <Text fontSize="lg" fontWeight="bold">Nova Cache Intelligence</Text>
          {orchestratorStatus?.running && (
            <Badge colorScheme="green" variant="subtle">OpenClaw Active</Badge>
          )}
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={fetchData}
            variant="ghost"
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Brain size={14} />}
            onClick={triggerAnalysis}
            isLoading={analyzing}
            loadingText="Analyzing..."
            colorScheme="purple"
          >
            Run Analysis
          </Button>
        </HStack>
      </HStack>

      {/* Cache Statistics */}
      <SimpleGrid columns={{ base: 2, md: 4, lg: 6 }} spacing={3}>
        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">Hit Rate</StatLabel>
            <StatNumber fontSize="xl" color="green.400">{cacheStats?.hit_rate || '0%'}</StatNumber>
            <StatHelpText fontSize="xs">{cacheStats?.hits || 0} hits / {cacheStats?.misses || 0} misses</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">Cache Entries</StatLabel>
            <StatNumber fontSize="xl">{cacheStats?.entries || 0}</StatNumber>
            <StatHelpText fontSize="xs">of {cacheStats?.max_size || 500} max</StatHelpText>
          </Stat>
          <Progress 
            value={((cacheStats?.entries || 0) / (cacheStats?.max_size || 500)) * 100} 
            size="xs" 
            colorScheme="blue" 
            mt={2}
            borderRadius="full"
          />
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">Patterns Learned</StatLabel>
            <StatNumber fontSize="xl" color="purple.400">{cacheStats?.patterns_learned || 0}</StatNumber>
            <StatHelpText fontSize="xs">Query patterns</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">TTLs Adapted</StatLabel>
            <StatNumber fontSize="xl" color="orange.400">{cacheStats?.ttls_adapted || 0}</StatNumber>
            <StatHelpText fontSize="xs">{cacheStats?.adaptive_adjustments || 0} adjustments</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">Warm Hits</StatLabel>
            <StatNumber fontSize="xl" color="cyan.400">{cacheStats?.warm_hits || 0}</StatNumber>
            <StatHelpText fontSize="xs">Pre-warmed cache hits</StatHelpText>
          </Stat>
        </GlassPanel>

        <GlassPanel p={3}>
          <Stat size="sm">
            <StatLabel fontSize="xs" color="gray.500">Evictions</StatLabel>
            <StatNumber fontSize="xl" color="red.400">{cacheStats?.evictions || 0}</StatNumber>
            <StatHelpText fontSize="xs">LRU evictions</StatHelpText>
          </Stat>
        </GlassPanel>
      </SimpleGrid>

      {/* Seasonal Context & Orchestrator Status */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {/* Seasonal Context */}
        <GlassPanel p={4}>
          <HStack mb={3}>
            <Icon as={getSeasonIcon(seasonalContext?.season || 'spring')} color={`${getSeasonColor(seasonalContext?.season || 'spring')}.400`} />
            <Text fontWeight="semibold">Seasonal Context</Text>
            <Badge colorScheme={getSeasonColor(seasonalContext?.season || 'spring')} textTransform="capitalize">
              {seasonalContext?.season || 'Unknown'}
            </Badge>
          </HStack>
          
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack justify="space-between">
              <Text color="gray.500">Daylight Hours</Text>
              <Text>{seasonalContext?.daylight_hours?.toFixed(1) || '—'}h</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">DST Active</Text>
              <Badge colorScheme={seasonalContext?.is_dst ? 'green' : 'gray'}>
                {seasonalContext?.is_dst ? 'Yes' : 'No'}
              </Badge>
            </HStack>
            <Divider my={1} />
            <Text color="gray.500" fontSize="xs">Weather Concerns</Text>
            <HStack wrap="wrap" spacing={1}>
              {seasonalContext?.weather_concerns?.map((concern, i) => (
                <Tag key={i} size="sm" colorScheme="orange" variant="subtle">
                  <TagLabel>{concern}</TagLabel>
                </Tag>
              ))}
            </HStack>
            <Text color="gray.500" fontSize="xs" mt={1}>Suggested Queries</Text>
            <HStack wrap="wrap" spacing={1}>
              {seasonalContext?.suggested_queries?.map((query, i) => (
                <Tag key={i} size="sm" colorScheme="blue" variant="subtle">
                  <TagLabel>{query}</TagLabel>
                </Tag>
              ))}
            </HStack>
          </VStack>
        </GlassPanel>

        {/* Orchestrator Status */}
        <GlassPanel p={4}>
          <HStack mb={3}>
            <Icon as={Brain} color="purple.400" />
            <Text fontWeight="semibold">OpenClaw Orchestrator</Text>
            <Badge colorScheme={orchestratorStatus?.running ? 'green' : 'red'}>
              {orchestratorStatus?.running ? 'Running' : 'Stopped'}
            </Badge>
          </HStack>
          
          <VStack align="stretch" spacing={2} fontSize="sm">
            <HStack justify="space-between">
              <Text color="gray.500">Last Analysis</Text>
              <Text>
                {orchestratorStatus?.last_analysis 
                  ? new Date(orchestratorStatus.last_analysis).toLocaleString()
                  : 'Never'}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">Next Analysis</Text>
              <Badge colorScheme="purple">{orchestratorStatus?.next_analysis_in || 'Pending'}</Badge>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">Analysis Interval</Text>
              <Text>{orchestratorStatus?.analysis_interval_hours || 6}h</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="gray.500">Recommendations</Text>
              <Badge colorScheme="blue">{orchestratorStatus?.recommendations_count || 0}</Badge>
            </HStack>
          </VStack>
        </GlassPanel>
      </SimpleGrid>

      {/* Upcoming Warmings */}
      <GlassPanel p={4}>
        <HStack mb={3}>
          <Icon as={Zap} color="yellow.400" />
          <Text fontWeight="semibold">Upcoming Cache Warmings</Text>
          <Badge colorScheme="yellow">{upcomingWarmings.length} scheduled</Badge>
        </HStack>
        
        {upcomingWarmings.length > 0 ? (
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Schedule</Th>
                <Th>Tool</Th>
                <Th>Scheduled For</Th>
                <Th isNumeric>In</Th>
              </Tr>
            </Thead>
            <Tbody>
              {upcomingWarmings.slice(0, 8).map((warming, i) => (
                <Tr key={i}>
                  <Td>
                    <HStack spacing={2}>
                      <Icon 
                        as={warming.tool === 'get_weather' ? Cloud : warming.tool === 'check_studio' ? Calendar : Server} 
                        boxSize={3} 
                        color="gray.400" 
                      />
                      <Text fontSize="sm">{warming.name}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    <Code fontSize="xs">{warming.tool}</Code>
                  </Td>
                  <Td fontSize="sm">{formatTime(warming.scheduled_for)}</Td>
                  <Td isNumeric>
                    <Badge colorScheme={warming.minutes_until < 60 ? 'green' : 'gray'}>
                      {warming.minutes_until < 60 
                        ? `${warming.minutes_until}m` 
                        : `${Math.floor(warming.minutes_until / 60)}h ${warming.minutes_until % 60}m`}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500" fontSize="sm">No warmings scheduled in the next 6 hours</Text>
        )}
      </GlassPanel>

      {/* OpenClaw Recommendations */}
      {recommendations && (
        <GlassPanel p={4}>
          <HStack mb={3}>
            <Icon as={Lightbulb} color="yellow.400" />
            <Text fontWeight="semibold">OpenClaw Recommendations</Text>
          </HStack>

          <Accordion allowMultiple>
            {/* Insights */}
            {recommendations.insights && (
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1">
                    <Icon as={Brain} boxSize={4} color="purple.400" />
                    <Text fontWeight="medium">AI Insights</Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Text fontSize="sm" color="gray.300" whiteSpace="pre-wrap">
                    {recommendations.insights}
                  </Text>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* Schedule Changes */}
            {recommendations.schedule_changes && recommendations.schedule_changes.length > 0 && (
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1">
                    <Icon as={Calendar} boxSize={4} color="blue.400" />
                    <Text fontWeight="medium">Schedule Changes</Text>
                    <Badge colorScheme="blue">{recommendations.schedule_changes.length}</Badge>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={2}>
                    {recommendations.schedule_changes.map((change, i) => (
                      <Box key={i} p={2} bg={isDark ? 'whiteAlpha.50' : 'gray.50'} borderRadius="md">
                        <HStack mb={1}>
                          <Badge colorScheme={change.action === 'add' ? 'green' : change.action === 'remove' ? 'red' : 'yellow'}>
                            {change.action}
                          </Badge>
                          <Text fontWeight="medium" fontSize="sm">{change.name}</Text>
                          <Code fontSize="xs">{change.tool}</Code>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">{change.reason}</Text>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* TTL Adjustments */}
            {recommendations.ttl_adjustments && recommendations.ttl_adjustments.length > 0 && (
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1">
                    <Icon as={Clock} boxSize={4} color="orange.400" />
                    <Text fontWeight="medium">TTL Adjustments</Text>
                    <Badge colorScheme="orange">{recommendations.ttl_adjustments.length}</Badge>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Tool</Th>
                        <Th isNumeric>Current</Th>
                        <Th isNumeric>Recommended</Th>
                        <Th>Reason</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {recommendations.ttl_adjustments.map((adj, i) => (
                        <Tr key={i}>
                          <Td><Code fontSize="xs">{adj.tool}</Code></Td>
                          <Td isNumeric>{adj.current_ttl}s</Td>
                          <Td isNumeric>
                            <Badge colorScheme={adj.recommended_ttl > adj.current_ttl ? 'green' : 'red'}>
                              {adj.recommended_ttl}s
                            </Badge>
                          </Td>
                          <Td fontSize="xs" color="gray.500" maxW="300px" isTruncated>
                            <Tooltip label={adj.reason}>
                              <Text>{adj.reason}</Text>
                            </Tooltip>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* Pre-warm Suggestions */}
            {recommendations.prewarm_suggestions && recommendations.prewarm_suggestions.length > 0 && (
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1">
                    <Icon as={Zap} boxSize={4} color="cyan.400" />
                    <Text fontWeight="medium">Pre-warm Suggestions</Text>
                    <Badge colorScheme="cyan">{recommendations.prewarm_suggestions.length}</Badge>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={2}>
                    {recommendations.prewarm_suggestions.map((sug, i) => (
                      <Box key={i} p={2} bg={isDark ? 'whiteAlpha.50' : 'gray.50'} borderRadius="md">
                        <HStack mb={1}>
                          <Code fontSize="xs">{sug.tool}</Code>
                          <Text fontSize="xs" color="gray.500">{sug.when}</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">{sug.reason}</Text>
                      </Box>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}

            {/* Eviction Priorities */}
            {recommendations.eviction_priorities && recommendations.eviction_priorities.length > 0 && (
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <HStack flex="1">
                    <Icon as={Target} boxSize={4} color="red.400" />
                    <Text fontWeight="medium">Eviction Priorities</Text>
                    <Badge colorScheme="red">{recommendations.eviction_priorities.length}</Badge>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack align="stretch" spacing={2}>
                    {recommendations.eviction_priorities.map((ev, i) => (
                      <HStack key={i} justify="space-between">
                        <HStack>
                          <Code fontSize="xs">{ev.tool}</Code>
                          <Badge 
                            colorScheme={ev.priority === 'high' ? 'green' : ev.priority === 'low' ? 'red' : 'yellow'}
                          >
                            {ev.priority} priority
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color="gray.500" maxW="300px" isTruncated>
                          {ev.reason}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            )}
          </Accordion>
        </GlassPanel>
      )}

      {/* Active Warming Schedules */}
      <GlassPanel p={4}>
        <HStack mb={3}>
          <Icon as={Activity} color="green.400" />
          <Text fontWeight="semibold">Active Warming Schedules</Text>
          <Badge colorScheme="green">{warmingStatus?.schedules?.length || 0}</Badge>
        </HStack>
        
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={2}>
          {warmingStatus?.schedules?.map((schedule, i) => (
            <Box 
              key={i} 
              p={2} 
              bg={isDark ? 'whiteAlpha.50' : 'gray.50'} 
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor={schedule.tool === 'get_weather' ? 'blue.400' : schedule.tool === 'check_studio' ? 'purple.400' : 'green.400'}
            >
              <Text fontSize="sm" fontWeight="medium" isTruncated>{schedule.name}</Text>
              <HStack spacing={1} mt={1}>
                <Code fontSize="xs">{schedule.tool}</Code>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Hours: {schedule.hours?.join(', ')}
              </Text>
              {schedule.days && (
                <Text fontSize="xs" color="gray.500">
                  Days: {schedule.days.map(d => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d]).join(', ')}
                </Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </GlassPanel>
    </VStack>
  );
};

export default NovaCacheIntelligence;
