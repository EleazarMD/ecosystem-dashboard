import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { 
  Heading, 
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Badge,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Tooltip,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Code,
  Divider,
} from '@chakra-ui/react';
import { TimeIcon, SearchIcon, DownloadIcon } from '@chakra-ui/icons';
import {
  FiActivity,
  FiShield,
  FiAlertTriangle,
  FiUser,
  FiServer,
  FiRefreshCw,
  FiEye,
  FiFilter,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: string;
  category: 'authentication' | 'authorization' | 'data_access' | 'configuration' | 'security' | 'system';
  severity: 'info' | 'warning' | 'error' | 'critical';
  actor: string;
  actorType: 'user' | 'system' | 'agent' | 'api';
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'denied';
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  criticalEvents: number;
  failedEvents: number;
  topActors: { actor: string; count: number }[];
  eventsByCategory: Record<string, number>;
}

const categoryColors: Record<string, string> = {
  authentication: 'blue',
  authorization: 'purple',
  data_access: 'cyan',
  configuration: 'orange',
  security: 'red',
  system: 'gray',
};

const severityColors: Record<string, string> = {
  info: 'blue',
  warning: 'yellow',
  error: 'orange',
  critical: 'red',
};

const outcomeColors: Record<string, string> = {
  success: 'green',
  failure: 'red',
  denied: 'orange',
};

const categoryIcons: Record<string, any> = {
  authentication: FiUser,
  authorization: FiShield,
  data_access: FiServer,
  configuration: FiActivity,
  security: FiAlertTriangle,
  system: FiServer,
};

export default function AuditLogPage() {
  const textSecondary = useSemanticToken('text.secondary');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('24h');

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/security/audit-log?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || null);
    } catch (err) {
      // Use mock data
      const mockEvents: AuditEvent[] = [
        {
          id: 'evt-001',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          eventType: 'login_success',
          category: 'authentication',
          severity: 'info',
          actor: 'admin@homelab.local',
          actorType: 'user',
          resource: '/auth/login',
          action: 'LOGIN',
          outcome: 'success',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        {
          id: 'evt-002',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          eventType: 'tool_execution_denied',
          category: 'authorization',
          severity: 'warning',
          actor: 'goose-agent',
          actorType: 'agent',
          resource: 'shell_execute',
          action: 'EXECUTE',
          outcome: 'denied',
          details: { reason: 'High risk operation requires approval', command: 'rm -rf /tmp/*' },
        },
        {
          id: 'evt-003',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          eventType: 'config_change',
          category: 'configuration',
          severity: 'info',
          actor: 'admin@homelab.local',
          actorType: 'user',
          resource: '/api/security/config',
          action: 'UPDATE',
          outcome: 'success',
          details: { changed: ['rateLimit.requestsPerMinute'], oldValue: 60, newValue: 100 },
        },
        {
          id: 'evt-004',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          eventType: 'rate_limit_exceeded',
          category: 'security',
          severity: 'warning',
          actor: 'api-key-prod-****',
          actorType: 'api',
          resource: '/api/chat/completions',
          action: 'REQUEST',
          outcome: 'denied',
          ipAddress: '10.0.0.50',
          details: { limit: 60, current: 65 },
        },
        {
          id: 'evt-005',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          eventType: 'login_failed',
          category: 'authentication',
          severity: 'error',
          actor: 'unknown',
          actorType: 'user',
          resource: '/auth/login',
          action: 'LOGIN',
          outcome: 'failure',
          ipAddress: '203.0.113.45',
          details: { reason: 'Invalid credentials', attempts: 3 },
        },
        {
          id: 'evt-006',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          eventType: 'anomaly_detected',
          category: 'security',
          severity: 'critical',
          actor: 'security-monitor',
          actorType: 'system',
          resource: 'anomaly-detection',
          action: 'ALERT',
          outcome: 'success',
          details: { type: 'rate_spike', confidence: 0.92, source: 'api-gateway' },
        },
        {
          id: 'evt-007',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          eventType: 'data_export',
          category: 'data_access',
          severity: 'info',
          actor: 'admin@homelab.local',
          actorType: 'user',
          resource: '/api/export/logs',
          action: 'EXPORT',
          outcome: 'success',
          details: { format: 'csv', records: 1500 },
        },
      ];
      
      setEvents(mockEvents);
      setStats({
        totalEvents: 15847,
        todayEvents: 342,
        criticalEvents: 3,
        failedEvents: 28,
        topActors: [
          { actor: 'admin@homelab.local', count: 156 },
          { actor: 'goose-agent', count: 89 },
          { actor: 'api-key-prod', count: 67 },
        ],
        eventsByCategory: {
          authentication: 234,
          authorization: 156,
          data_access: 89,
          configuration: 45,
          security: 67,
          system: 23,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
    const interval = setInterval(fetchAuditLog, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const filteredEvents = events.filter(event => {
    if (searchQuery && 
        !event.actor.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.resource.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.eventType.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== 'all' && event.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false;
    if (outcomeFilter !== 'all' && event.outcome !== outcomeFilter) return false;
    return true;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const viewEventDetails = (event: AuditEvent) => {
    setSelectedEvent(event);
    onOpen();
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Event Type', 'Category', 'Severity', 'Actor', 'Resource', 'Action', 'Outcome'].join(','),
      ...filteredEvents.map(e => [
        e.timestamp, e.eventType, e.category, e.severity, e.actor, e.resource, e.action, e.outcome
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <SecurityLayout>
      <Head>
        <title>Security Audit Log | AI Homelab</title>
        <meta name="description" content="Security event audit log" />
      </Head>
      
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <TimeIcon />
                <Heading size="lg">Security Audit Log</Heading>
              </HStack>
              <Text color={textSecondary}>
                Complete history of security events and actions
              </Text>
            </VStack>
            <HStack>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                w="120px"
                size="sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </Select>
              <Button
                leftIcon={<DownloadIcon />}
                variant="outline"
                size="sm"
                onClick={exportLogs}
              >
                Export
              </Button>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                size="sm"
                onClick={fetchAuditLog}
                isLoading={loading}
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
        </GlassPanel>

        {/* Stats */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Events</StatLabel>
                <StatNumber>{(stats.totalEvents ?? 0).toLocaleString()}</StatNumber>
                <StatHelpText>All time</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Today</StatLabel>
                <StatNumber>{stats.todayEvents}</StatNumber>
                <StatHelpText>Events logged</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Critical</StatLabel>
                <StatNumber color="red.500">{stats.criticalEvents}</StatNumber>
                <StatHelpText>Requires attention</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Failed</StatLabel>
                <StatNumber color="orange.500">{stats.failedEvents}</StatNumber>
                <StatHelpText>Failed operations</StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>
        )}

        {/* Filters */}
        <GlassPanel variant="light" p={4}>
          <HStack spacing={4} wrap="wrap">
            <InputGroup maxW="250px">
              <InputLeftElement>
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              maxW="150px"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="authentication">Authentication</option>
              <option value="authorization">Authorization</option>
              <option value="data_access">Data Access</option>
              <option value="configuration">Configuration</option>
              <option value="security">Security</option>
              <option value="system">System</option>
            </Select>
            <Select
              maxW="130px"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severity</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </Select>
            <Select
              maxW="130px"
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="denied">Denied</option>
            </Select>
            {(categoryFilter !== 'all' || severityFilter !== 'all' || outcomeFilter !== 'all' || searchQuery) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCategoryFilter('all');
                  setSeverityFilter('all');
                  setOutcomeFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear
              </Button>
            )}
            <Text fontSize="sm" color={textSecondary} ml="auto">
              {filteredEvents.length} events
            </Text>
          </HStack>
        </GlassPanel>

        {/* Events Table */}
        <GlassPanel variant="light" p={0} overflow="hidden">
          {loading && events.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" />
              <Text mt={4} color="gray.500">Loading audit log...</Text>
            </Box>
          ) : filteredEvents.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Icon as={FiInfo} boxSize={12} color="gray.400" mb={4} />
              <Text fontSize="lg" fontWeight="medium">No events found</Text>
              <Text color="gray.500">Try adjusting your filters</Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Time</Th>
                    <Th>Category</Th>
                    <Th>Event</Th>
                    <Th>Actor</Th>
                    <Th>Resource</Th>
                    <Th>Outcome</Th>
                    <Th>Severity</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredEvents.map((event) => (
                    <Tr key={event.id} _hover={{ bg: 'whiteAlpha.100' }}>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontSize="xs">{formatTime(event.timestamp)}</Text>
                          <Text fontSize="xs" color="gray.500">{formatDate(event.timestamp)}</Text>
                        </VStack>
                      </Td>
                      <Td>
                        <HStack>
                          <Icon as={categoryIcons[event.category] || FiActivity} boxSize={4} />
                          <Badge colorScheme={categoryColors[event.category]} fontSize="xs">
                            {event.category}
                          </Badge>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontFamily="mono">
                          {(event.eventType || 'unknown').replace(/_/g, ' ')}
                        </Text>
                      </Td>
                      <Td>
                        <Tooltip label={`Type: ${event.actorType}`}>
                          <Text fontSize="sm" noOfLines={1} maxW="150px">
                            {event.actor}
                          </Text>
                        </Tooltip>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontFamily="mono" noOfLines={1} maxW="150px">
                          {event.resource}
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={outcomeColors[event.outcome]} fontSize="xs">
                          {event.outcome}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge colorScheme={severityColors[event.severity]} fontSize="xs">
                          {event.severity}
                        </Badge>
                      </Td>
                      <Td>
                        <IconButton
                          aria-label="View details"
                          icon={<FiEye />}
                          size="sm"
                          variant="ghost"
                          onClick={() => viewEventDetails(event)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </GlassPanel>
      </VStack>

      {/* Event Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Event Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedEvent && (
              <VStack align="stretch" spacing={4}>
                <SimpleGrid columns={2} spacing={4}>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Event ID</Text>
                    <Code>{selectedEvent.id}</Code>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Timestamp</Text>
                    <Text>{new Date(selectedEvent.timestamp).toLocaleString()}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Event Type</Text>
                    <Text fontFamily="mono">{selectedEvent.eventType}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Category</Text>
                    <Badge colorScheme={categoryColors[selectedEvent.category]}>
                      {selectedEvent.category}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Severity</Text>
                    <Badge colorScheme={severityColors[selectedEvent.severity]}>
                      {selectedEvent.severity}
                    </Badge>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Outcome</Text>
                    <Badge colorScheme={outcomeColors[selectedEvent.outcome]}>
                      {selectedEvent.outcome}
                    </Badge>
                  </Box>
                </SimpleGrid>
                
                <Divider />
                
                <Box>
                  <Text fontSize="sm" color="gray.500">Actor</Text>
                  <HStack>
                    <Text>{selectedEvent.actor}</Text>
                    <Badge variant="outline">{selectedEvent.actorType}</Badge>
                  </HStack>
                </Box>
                
                <Box>
                  <Text fontSize="sm" color="gray.500">Resource</Text>
                  <Code>{selectedEvent.resource}</Code>
                </Box>
                
                <Box>
                  <Text fontSize="sm" color="gray.500">Action</Text>
                  <Text>{selectedEvent.action}</Text>
                </Box>
                
                {selectedEvent.ipAddress && (
                  <Box>
                    <Text fontSize="sm" color="gray.500">IP Address</Text>
                    <Code>{selectedEvent.ipAddress}</Code>
                  </Box>
                )}
                
                {selectedEvent.details && (
                  <Box>
                    <Text fontSize="sm" color="gray.500" mb={2}>Details</Text>
                    <Code display="block" p={3} borderRadius="md" whiteSpace="pre-wrap">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </Code>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/audit-log',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
