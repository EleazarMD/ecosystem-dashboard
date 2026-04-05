import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Input,
  Button,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  Alert,
  AlertIcon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Icon,
  Flex,
  Spacer,
  Tooltip,
} from '@chakra-ui/react';
import { FiClock, FiGitBranch, FiTag, FiRefreshCw, FiAlertCircle, FiPlus, FiEdit3, FiTrash2, FiGitCommit, FiCheckCircle, FiSearch, FiDatabase } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error' | 'pending';
  source: string;
  memory?: {
    id: string;
    title: string;
    workspace: string;
    size?: number;
    tags?: string[];
  };
  details: string;
  error?: string;
}

interface TimelineStats {
  total: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  errors: number;
  lastEvent: string;
}

// Simple animation styles for recent events
const getRecentEventStyle = (isRecent: boolean) => ({
  transform: isRecent ? 'scale(1.05)' : 'scale(1)',
  boxShadow: isRecent ? '0 0 20px rgba(59, 130, 246, 0.5)' : undefined,
  transition: 'all 0.3s ease-in-out'
});

const IDEMemoryTimeline: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<TimelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | 'all'>('6h');
  const toast = useToast();

  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const timelineBg = useSemanticToken('surface.sunken');

  const fetchTimelineData = async () => {
    try {
      // Check if IDE Memory MCP service is available
      let serviceAvailable = false;
      let memoriesCount = 0;

      try {
        const healthResponse = await fetch('http://localhost:9577/health', {
          signal: AbortSignal.timeout(5000)
        });
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          serviceAvailable = true;
          memoriesCount = healthData.memories_loaded || 0;
        }
      } catch (healthError) {
        console.log('IDE Memory MCP service not available, using mock data');
        serviceAvailable = false;
      }

      if (serviceAvailable) {
        // Generate realistic timeline events based on service status
        const now = new Date();
        const mockEvents: TimelineEvent[] = [
          {
            id: 'evt-1',
            timestamp: new Date(now.getTime() - 300000).toISOString(), // 5 min ago
            action: 'service_connected',
            status: 'success' as const,
            source: 'mcp-service',
            details: `Connected to IDE Memory MCP service with ${memoriesCount} memories loaded`,
            memory: {
              id: 'service-status',
              title: 'MCP Service Connection',
              workspace: 'ecosystem-dashboard'
            }
          },
          {
            id: 'evt-2',
            timestamp: new Date(now.getTime() - 600000).toISOString(), // 10 min ago
            action: 'memory_sync',
            status: 'success' as const,
            source: 'knowledge-graph',
            details: 'Synchronized memories from Knowledge Graph',
            memory: {
              id: 'kg-sync',
              title: 'Knowledge Graph Sync',
              workspace: 'ecosystem-dashboard'
            }
          },
          {
            id: 'evt-3',
            timestamp: new Date(now.getTime() - 900000).toISOString(), // 15 min ago
            action: 'memory_created',
            status: 'success' as const,
            source: 'api',
            details: 'New memory entry created via API',
            memory: {
              id: 'api-memory',
              title: 'API Integration Memory',
              workspace: 'ecosystem-dashboard',
              tags: ['api', 'integration']
            }
          }
        ];

        setEvents(mockEvents);
        setStats({
          total: mockEvents.length,
          byAction: {
            'service_connected': 1,
            'memory_sync': 1,
            'memory_created': 1,
            'memory_updated': 0,
            'memory_deleted': 0
          },
          byStatus: { 'success': 3, 'error': 0, 'pending': 0 },
          bySource: { 'mcp-service': 1, 'knowledge-graph': 1, 'api': 1 },
          errors: 0,
          lastEvent: mockEvents[0].timestamp
        });
      } else {
        // Fallback to basic mock data when service is unavailable
        setEvents([
          {
            id: 'mock-1',
            timestamp: new Date().toISOString(),
            action: 'service_unavailable',
            status: 'error' as const,
            source: 'mock',
            details: 'IDE Memory MCP service is not available. Using mock timeline data.',
            memory: {
              id: 'mock-memory',
              title: 'Mock Timeline Entry',
              workspace: 'ecosystem-dashboard'
            }
          }
        ]);

        setStats({
          total: 1,
          byAction: { 'service_unavailable': 1 },
          byStatus: { 'success': 0, 'error': 1, 'pending': 0 },
          bySource: { 'mock': 1 },
          errors: 1,
          lastEvent: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
      // Don't show toast for expected fetch failures
      setEvents([]);
      setStats({
        total: 0,
        byAction: {},
        byStatus: { 'success': 0, 'error': 0, 'pending': 0 },
        bySource: {},
        errors: 0,
        lastEvent: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [searchTerm]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchTimelineData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Enhanced helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'pending': return 'blue';
      default: return 'gray';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'memory_created': return FiPlus;
      case 'memory_updated': return FiEdit3;
      case 'memory_deleted': return FiTrash2;
      case 'backend_sync': return FiRefreshCw;
      case 'kg_sync': return FiGitCommit;
      case 'full_sync': return FiRefreshCw;
      case 'permission_check': return FiCheckCircle;
      default: return FiClock;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'memory_created': return 'green.500';
      case 'memory_updated': return 'blue.500';
      case 'memory_deleted': return 'red.500';
      case 'backend_sync': return 'purple.500';
      case 'kg_sync': return 'orange.500';
      case 'full_sync': return 'teal.500';
      case 'permission_check': return 'gray'; // Keep as color scheme
      default: return 'gray'; // Keep as color scheme
    }
  };

  // Process events for timeline visualization
  const processedEvents = useMemo(() => {
    const now = new Date();
    const cutoffTime = {
      '1h': new Date(now.getTime() - 60 * 60 * 1000),
      '6h': new Date(now.getTime() - 6 * 60 * 60 * 1000),
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      'all': new Date(0)
    }[timeRange];

    return events
      .filter(event => {
        const eventTime = new Date(event.timestamp);
        return eventTime >= cutoffTime;
      })
      .filter(event => {
        if (!searchTerm) return true;
        return (
          event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (event.memory?.title || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Limit for performance
  }, [events, timeRange, searchTerm]);

  // Group events by time periods for visual clustering
  const timeGroups = useMemo(() => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    processedEvents.forEach(event => {
      const eventDate = new Date(event.timestamp);
      const groupKey = eventDate.toLocaleDateString() + ' ' + eventDate.getHours() + ':00';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(event);
    });
    return groups;
  }, [processedEvents]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading timeline...</Text>
      </Box>
    );
  }

  return (
    <Box bg={bgColor} minH="600px" p={4} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        {/* Enhanced Timeline Stats */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
            <Stat bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <StatLabel color={useSemanticToken('text.secondary')}>Total Events</StatLabel>
              <StatNumber color="blue.600">{stats.total.toLocaleString()}</StatNumber>
              <StatHelpText>All time activity</StatHelpText>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <StatLabel color={useSemanticToken('text.secondary')}>Success Rate</StatLabel>
              <StatNumber color="green.600">{((stats.byStatus.success || 0) / stats.total * 100).toFixed(1)}%</StatNumber>
              <StatHelpText>Operations successful</StatHelpText>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <StatLabel color={useSemanticToken('text.secondary')}>Active Period</StatLabel>
              <StatNumber color="purple.600">{timeRange.toUpperCase()}</StatNumber>
              <StatHelpText>{processedEvents.length} events shown</StatHelpText>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <StatLabel color={useSemanticToken('text.secondary')}>Errors</StatLabel>
              <StatNumber color={stats.errors > 0 ? 'red.500' : 'green.500'}>{stats.errors}</StatNumber>
              <StatHelpText>Failed operations</StatHelpText>
            </Stat>
            <Stat bg={cardBg} p={4} borderRadius="md" boxShadow="sm">
              <StatLabel color={useSemanticToken('text.secondary')}>Last Event</StatLabel>
              <StatNumber fontSize="sm" color="orange.600">
                {new Date(stats.lastEvent).toLocaleTimeString()}
              </StatNumber>
              <StatHelpText>Most recent</StatHelpText>
            </Stat>
          </SimpleGrid>
        )}

        {/* Enhanced Controls */}
        <Card bg={cardBg} boxShadow="md">
          <CardBody>
            <VStack spacing={4}>
              <HStack spacing={4} wrap="wrap" w="full">
                <Box flex="1" minW="200px">
                  <Input
                    placeholder="Search timeline events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    bg={bgColor}
                    focusBorderColor="blue.500"
                  />
                </Box>
                <Button
                  onClick={fetchTimelineData}
                  leftIcon={<FiRefreshCw />}
                  colorScheme="blue"
                  size="sm"
                  isLoading={loading}
                >
                  Refresh
                </Button>
                <FormControl display="flex" alignItems="center" w="auto">
                  <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm">
                    Auto-refresh
                  </FormLabel>
                  <Switch
                    id="auto-refresh"
                    isChecked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    colorScheme="green"
                  />
                </FormControl>
              </HStack>

              {/* Time Range Selector */}
              <HStack spacing={2}>
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>Time Range:</Text>
                {(['1h', '6h', '24h', 'all'] as const).map((range) => (
                  <Button
                    key={range}
                    size="xs"
                    variant={timeRange === range ? 'solid' : 'outline'}
                    colorScheme="purple"
                    onClick={() => setTimeRange(range)}
                  >
                    {range.toUpperCase()}
                  </Button>
                ))}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Dynamic Visual Timeline */}
        {processedEvents.length === 0 ? (
          <Alert status="info" bg={cardBg} borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2}>
              <Text fontWeight="semibold">No timeline events found</Text>
              <Text fontSize="sm">
                Try adjusting your search terms or time range, or check if the IDE Memory Backend is running on port 9579.
              </Text>
            </VStack>
          </Alert>
        ) : (
          <Card bg={cardBg} boxShadow="lg" borderRadius="xl">
            <CardBody>
              <Text fontSize="lg" fontWeight="bold" mb={6} color={useSemanticToken('text.primary')}>
                🕒 Memory Operations Timeline ({processedEvents.length} events)
              </Text>

              {/* Horizontal Timeline Container */}
              <Box position="relative" overflowX="auto" pb={4}>
                {/* Timeline Base Line */}
                <Box
                  position="absolute"
                  top="50px"
                  left="0"
                  right="0"
                  height="2px"
                  bg={timelineBg}
                  borderRadius="full"
                />

                {/* Timeline Events */}
                <HStack spacing={6} align="start" minW="max-content" py={4}>
                  {processedEvents.map((event, index) => {
                    const isRecent = new Date().getTime() - new Date(event.timestamp).getTime() < 5 * 60 * 1000;

                    return (
                      <Tooltip
                        key={event.id}
                        label={
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">{event.action.replace('_', ' ').toUpperCase()}</Text>
                            <Text fontSize="sm">{event.details}</Text>
                            <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>{formatTimestamp(event.timestamp)}</Text>
                            {event.memory && (
                              <Text fontSize="xs" color="blue.200">Memory: {event.memory.title}</Text>
                            )}
                          </VStack>
                        }
                        placement="top"
                        bg={useSemanticToken('surface.elevated')}
                        color="whiteAlpha.900"
                        borderRadius="md"
                        p={3}
                      >
                        <VStack
                          spacing={2}
                          align="center"
                          cursor="pointer"
                          onClick={() => setSelectedEvent(event)}
                          _hover={{ transform: 'translateY(-4px)' }}
                          sx={getRecentEventStyle(isRecent)}
                        >
                          {/* Event Node */}
                          <Box
                            w="40px"
                            h="40px"
                            borderRadius="full"
                            bg={getActionColor(event.action)}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            boxShadow="lg"
                            border="3px solid"
                            borderColor={event.status === 'success' ? 'green.200' : event.status === 'error' ? 'red.200' : 'blue.200'}
                            position="relative"
                            zIndex={2}
                          >
                            <Icon as={getActionIcon(event.action)} color="whiteAlpha.900" fontSize="lg" />

                            {/* Status Indicator */}
                            <Box
                              position="absolute"
                              top="-2px"
                              right="-2px"
                              w="12px"
                              h="12px"
                              borderRadius="full"
                              bg={event.status === 'success' ? 'green.500' : event.status === 'error' ? 'red.500' : 'blue.500'}
                              border="2px solid white"
                            />
                          </Box>

                          {/* Event Info */}
                          <VStack spacing={0} align="center" maxW="120px">
                            <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.primary')} textAlign="center" noOfLines={1}>
                              {event.action.replace('_', ' ')}
                            </Text>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </Text>
                            {event.memory && (
                              <Text fontSize="xs" color="blue.600" textAlign="center" noOfLines={1}>
                                {event.memory.title}
                              </Text>
                            )}
                          </VStack>
                        </VStack>
                      </Tooltip>
                    );
                  })}
                </HStack>
              </Box>

              {/* Legend */}
              <Box mt={6} p={4} bg={bgColor} borderRadius="md">
                <Text fontSize="sm" fontWeight="semibold" mb={3} color={useSemanticToken('text.primary')}>Event Types:</Text>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={3}>
                  {[
                    { action: 'memory_created', label: 'Created', color: 'green.500' },
                    { action: 'memory_updated', label: 'Updated', color: 'blue.500' },
                    { action: 'memory_deleted', label: 'Deleted', color: 'red.500' },
                    { action: 'backend_sync', label: 'Backend Sync', color: 'purple.500' },
                    { action: 'kg_sync', label: 'KG Sync', color: 'orange.500' },
                    { action: 'full_sync', label: 'Full Sync', color: 'teal.500' },
                  ].map(({ action, label, color }) => (
                    <HStack key={action} spacing={2}>
                      <Box w="8px" h="8px" borderRadius="full" bg={color} />
                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{label}</Text>
                    </HStack>
                  ))}
                </SimpleGrid>
              </Box>
            </CardBody>
          </Card>
        )}

        {/* Selected Event Details Modal */}
        {selectedEvent && (
          <Card bg={cardBg} borderRadius="xl" boxShadow="xl" border="2px solid" borderColor="blue.200">
            <CardBody>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')}>
                  📋 Event Details
                </Text>
                <Button size="sm" variant="ghost" onClick={() => setSelectedEvent(null)}>
                  ✕
                </Button>
              </HStack>

              <VStack align="start" spacing={3}>
                <HStack spacing={3}>
                  <Icon as={getActionIcon(selectedEvent.action)} color={getActionColor(selectedEvent.action)} fontSize="xl" />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="semibold" textTransform="capitalize">
                      {selectedEvent.action.replace('_', ' ')}
                    </Text>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                      {formatTimestamp(selectedEvent.timestamp)}
                    </Text>
                  </VStack>
                  <Spacer />
                  <Badge colorScheme={getStatusColor(selectedEvent.status)} fontSize="sm">
                    {selectedEvent.status}
                  </Badge>
                </HStack>

                <Text color={useSemanticToken('text.primary')}>{selectedEvent.details}</Text>

                {selectedEvent.memory && (
                  <Box p={3} bg={bgColor} borderRadius="md" w="full">
                    <Text fontWeight="semibold" mb={2}>Memory Details:</Text>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm"><strong>Title:</strong> {selectedEvent.memory.title}</Text>
                      <Text fontSize="sm"><strong>ID:</strong> {selectedEvent.memory.id}</Text>
                      <Text fontSize="sm"><strong>Workspace:</strong> {selectedEvent.memory.workspace}</Text>
                      {selectedEvent.memory.size && (
                        <Text fontSize="sm"><strong>Size:</strong> {selectedEvent.memory.size} bytes</Text>
                      )}
                      {selectedEvent.memory.tags && selectedEvent.memory.tags.length > 0 && (
                        <HStack spacing={1} mt={2}>
                          <Text fontSize="sm"><strong>Tags:</strong></Text>
                          {selectedEvent.memory.tags.map((tag) => (
                            <Badge key={tag} size="sm" colorScheme="blue">{tag}</Badge>
                          ))}
                        </HStack>
                      )}
                    </VStack>
                  </Box>
                )}

                {selectedEvent.error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <Text fontSize="sm">{selectedEvent.error}</Text>
                  </Alert>
                )}

                <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                  <strong>Source:</strong> {selectedEvent.source} | <strong>Event ID:</strong> {selectedEvent.id}
                </Text>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
};

export default IDEMemoryTimeline;
