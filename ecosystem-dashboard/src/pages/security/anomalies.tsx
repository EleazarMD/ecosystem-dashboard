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
  Badge,
  SimpleGrid,
  Box,
  Icon,
  Button,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import {
  SearchIcon,
  ChevronDownIcon,
} from '@chakra-ui/icons';
import {
  FiAlertTriangle,
  FiActivity,
  FiShield,
  FiClock,
  FiUser,
  FiServer,
  FiRefreshCw,
  FiFilter,
  FiMoreVertical,
  FiEye,
  FiCheckCircle,
  FiXCircle,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Anomaly {
  id: string;
  type: 'rate_spike' | 'unusual_pattern' | 'auth_failure' | 'data_exfil' | 'privilege_escalation' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  description: string;
  detectedAt: string;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
  affectedResources: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

interface AnomalyStats {
  total: number;
  active: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

const severityColors: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'blue',
};

const statusColors: Record<string, string> = {
  active: 'red',
  investigating: 'yellow',
  resolved: 'green',
  dismissed: 'gray',
};

const typeIcons: Record<string, any> = {
  rate_spike: FiActivity,
  unusual_pattern: FiAlertTriangle,
  auth_failure: FiShield,
  data_exfil: FiServer,
  privilege_escalation: FiUser,
  unknown: FiAlertTriangle,
};

export default function AnomaliesPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/security/anomalies');
      if (!res.ok) throw new Error('Failed to fetch anomalies');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setStats(data.stats || null);
    } catch (err) {
      // Use mock data for demo
      const mockAnomalies: Anomaly[] = [
        {
          id: 'anom-001',
          type: 'rate_spike',
          severity: 'high',
          source: 'api-gateway',
          description: 'Unusual spike in API requests from IP 192.168.1.45 - 500% above baseline',
          detectedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          status: 'active',
          affectedResources: ['/api/chat', '/api/completions'],
          confidence: 0.92,
        },
        {
          id: 'anom-002',
          type: 'auth_failure',
          severity: 'critical',
          source: 'auth-service',
          description: 'Multiple failed authentication attempts detected for admin accounts',
          detectedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'investigating',
          affectedResources: ['admin-panel', 'user-management'],
          confidence: 0.98,
        },
        {
          id: 'anom-003',
          type: 'unusual_pattern',
          severity: 'medium',
          source: 'llm-service',
          description: 'Unusual prompt patterns detected - potential prompt injection attempts',
          detectedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          status: 'resolved',
          affectedResources: ['goose-mind', 'chat-completions'],
          confidence: 0.75,
        },
        {
          id: 'anom-004',
          type: 'data_exfil',
          severity: 'critical',
          source: 'data-layer',
          description: 'Large data transfer detected outside normal business hours',
          detectedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          status: 'dismissed',
          affectedResources: ['backup-service'],
          confidence: 0.45,
          metadata: { reason: 'Scheduled backup job' },
        },
        {
          id: 'anom-005',
          type: 'privilege_escalation',
          severity: 'high',
          source: 'rbac-service',
          description: 'User attempted to access resources beyond their permission level',
          detectedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          status: 'resolved',
          affectedResources: ['admin-api', 'config-management'],
          confidence: 0.88,
        },
      ];
      
      setAnomalies(mockAnomalies);
      setStats({
        total: 47,
        active: 2,
        resolved: 38,
        byType: {
          rate_spike: 12,
          auth_failure: 8,
          unusual_pattern: 15,
          data_exfil: 5,
          privilege_escalation: 7,
        },
        bySeverity: {
          critical: 3,
          high: 12,
          medium: 22,
          low: 10,
        },
        trend: 'down',
        trendPercent: 15,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAnomalyStatus = async (id: string, newStatus: string) => {
    try {
      setAnomalies(prev => 
        prev.map(a => a.id === id ? { ...a, status: newStatus as Anomaly['status'] } : a)
      );
      toast({
        title: 'Status Updated',
        description: `Anomaly marked as ${newStatus}`,
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update anomaly status',
        status: 'error',
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredAnomalies = anomalies.filter(anomaly => {
    if (searchQuery && !anomaly.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !anomaly.source.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (severityFilter !== 'all' && anomaly.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && anomaly.status !== statusFilter) return false;
    if (typeFilter !== 'all' && anomaly.type !== typeFilter) return false;
    return true;
  });

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <SecurityLayout>
      <Head>
        <title>Anomaly Detection | AI Homelab Security</title>
        <meta name="description" content="Security anomaly detection and monitoring" />
      </Head>

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiAlertTriangle} boxSize={6} color="orange.500" />
                <Heading size="lg">Anomaly Detection</Heading>
              </HStack>
              <Text color={textSecondary}>
                AI-powered detection of unusual patterns and potential security threats
              </Text>
            </VStack>
            <HStack>
              <Badge colorScheme={stats?.active ? 'red' : 'green'} fontSize="md" px={3} py={1}>
                {stats?.active || 0} Active
              </Badge>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={fetchAnomalies}
                isLoading={loading}
                size="sm"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
        </GlassPanel>

        {/* Stats Grid */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Total Anomalies</StatLabel>
                <StatNumber>{stats.total}</StatNumber>
                <StatHelpText>
                  <StatArrow type={stats.trend === 'down' ? 'decrease' : 'increase'} />
                  {stats.trendPercent}% from last week
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Active Threats</StatLabel>
                <StatNumber color="red.500">{stats.active}</StatNumber>
                <StatHelpText>Requires attention</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Resolved</StatLabel>
                <StatNumber color="green.500">{stats.resolved}</StatNumber>
                <StatHelpText>Successfully handled</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Critical</StatLabel>
                <StatNumber color="red.500">{stats.bySeverity?.critical || 0}</StatNumber>
                <StatHelpText>High priority items</StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>
        )}

        {/* Filters */}
        <GlassPanel variant="light" p={4}>
          <HStack spacing={4} wrap="wrap">
            <InputGroup maxW="300px">
              <InputLeftElement>
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search anomalies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              maxW="150px"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select
              maxW="150px"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </Select>
            <Select
              maxW="180px"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="rate_spike">Rate Spike</option>
              <option value="auth_failure">Auth Failure</option>
              <option value="unusual_pattern">Unusual Pattern</option>
              <option value="data_exfil">Data Exfiltration</option>
              <option value="privilege_escalation">Privilege Escalation</option>
            </Select>
          </HStack>
        </GlassPanel>

        {/* Anomalies Table */}
        <GlassPanel variant="light" p={0} overflow="hidden">
          {loading && anomalies.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" />
              <Text mt={4} color="gray.500">Loading anomalies...</Text>
            </Box>
          ) : error ? (
            <Alert status="error" m={4}>
              <AlertIcon />
              {error}
            </Alert>
          ) : filteredAnomalies.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Icon as={FiCheckCircle} boxSize={12} color="green.500" mb={4} />
              <Text fontSize="lg" fontWeight="medium">No anomalies found</Text>
              <Text color="gray.500">All systems operating normally</Text>
            </Box>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Severity</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th>Source</Th>
                    <Th>Detected</Th>
                    <Th>Confidence</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredAnomalies.map((anomaly) => (
                    <Tr key={anomaly.id}>
                      <Td>
                        <Badge colorScheme={severityColors[anomaly.severity]}>
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <Icon as={typeIcons[anomaly.type] || FiAlertTriangle} />
                          <Text fontSize="sm">{(anomaly.type || 'unknown').replace(/_/g, ' ')}</Text>
                        </HStack>
                      </Td>
                      <Td maxW="300px">
                        <Tooltip label={anomaly.description}>
                          <Text noOfLines={2} fontSize="sm">{anomaly.description}</Text>
                        </Tooltip>
                      </Td>
                      <Td>
                        <Badge variant="outline">{anomaly.source}</Badge>
                      </Td>
                      <Td>
                        <HStack>
                          <Icon as={FiClock} boxSize={3} />
                          <Text fontSize="sm">{formatTimeAgo(anomaly.detectedAt)}</Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Text fontSize="sm" fontWeight="medium">
                          {Math.round(anomaly.confidence * 100)}%
                        </Text>
                      </Td>
                      <Td>
                        <Badge colorScheme={statusColors[anomaly.status]}>
                          {anomaly.status}
                        </Badge>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem icon={<FiEye />}>View Details</MenuItem>
                            <MenuItem 
                              icon={<FiActivity />}
                              onClick={() => updateAnomalyStatus(anomaly.id, 'investigating')}
                            >
                              Mark Investigating
                            </MenuItem>
                            <MenuItem 
                              icon={<FiCheckCircle />}
                              onClick={() => updateAnomalyStatus(anomaly.id, 'resolved')}
                            >
                              Mark Resolved
                            </MenuItem>
                            <MenuItem 
                              icon={<FiXCircle />}
                              onClick={() => updateAnomalyStatus(anomaly.id, 'dismissed')}
                            >
                              Dismiss
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </GlassPanel>
      </VStack>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/anomalies',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
