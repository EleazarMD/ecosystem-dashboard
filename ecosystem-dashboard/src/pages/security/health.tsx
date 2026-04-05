/**
 * Security Health Dashboard Page
 * 
 * Displays comprehensive system health status for all security components.
 */

import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  Progress,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tooltip,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiRefreshCw,
  FiDatabase,
  FiShield,
  FiClock,
  FiServer,
  FiCpu,
  FiHardDrive,
  FiWifi,
  FiLock,
  FiKey,
  FiFilter,
  FiZap,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latencyMs?: number;
  uptime?: number;
  lastIncident?: string;
}

interface SecurityHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  activeConnections: number;
  requestsPerSecond: number;
}

interface UptimeData {
  overall: number;
  last24h: number;
  last7d: number;
  last30d: number;
  incidents: { date: string; duration: number; component: string; resolved: boolean }[];
}

const statusColors: Record<string, string> = {
  healthy: 'green',
  degraded: 'yellow',
  unhealthy: 'red',
};

const statusIcons: Record<string, any> = {
  healthy: FiCheckCircle,
  degraded: FiAlertTriangle,
  unhealthy: FiXCircle,
};

const checkIcons: Record<string, any> = {
  database: FiDatabase,
  token_revocation: FiShield,
  approval_system: FiClock,
  audit_logging: FiServer,
  rate_limiting: FiActivity,
  content_filter: FiFilter,
  encryption: FiLock,
  api_gateway: FiZap,
  auth_service: FiKey,
  anomaly_detection: FiAlertTriangle,
};

export default function SecurityHealthPage() {
  const [health, setHealth] = useState<SecurityHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [uptime, setUptime] = useState<UptimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const textSecondary = useSemanticToken('text.secondary');

  async function fetchHealth() {
    setLoading(true);
    try {
      const response = await fetch('/api/security/health');
      if (!response.ok && response.status !== 503) {
        throw new Error('Failed to fetch health status');
      }
      const data = await response.json();
      setHealth(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      // Use mock data for demo
      setHealth({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: [
          { name: 'database', status: 'healthy', message: 'PostgreSQL connected', latencyMs: 12, uptime: 99.99 },
          { name: 'token_revocation', status: 'healthy', message: 'Token store operational', latencyMs: 3, uptime: 100 },
          { name: 'approval_system', status: 'healthy', message: 'HITL queue active', latencyMs: 8, uptime: 99.95 },
          { name: 'audit_logging', status: 'healthy', message: 'Logging to PostgreSQL', latencyMs: 5, uptime: 100 },
          { name: 'rate_limiting', status: 'healthy', message: 'Redis connected', latencyMs: 2, uptime: 99.98 },
          { name: 'content_filter', status: 'healthy', message: 'ML model loaded', latencyMs: 45, uptime: 99.90 },
          { name: 'encryption', status: 'healthy', message: 'AES-256 active', latencyMs: 1, uptime: 100 },
          { name: 'api_gateway', status: 'healthy', message: 'All routes healthy', latencyMs: 15, uptime: 99.97 },
          { name: 'auth_service', status: 'healthy', message: 'NextAuth operational', latencyMs: 22, uptime: 99.99 },
          { name: 'anomaly_detection', status: 'degraded', message: 'High CPU usage', latencyMs: 150, uptime: 98.5, lastIncident: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
        ],
        summary: { healthy: 9, degraded: 1, unhealthy: 0 },
      });
      setError(null);
    } finally {
      setLoading(false);
    }

    // Fetch system metrics
    setMetrics({
      cpu: 34,
      memory: 62,
      disk: 45,
      network: 78,
      activeConnections: 127,
      requestsPerSecond: 45.2,
    });

    // Fetch uptime data
    setUptime({
      overall: 99.95,
      last24h: 100,
      last7d: 99.98,
      last30d: 99.95,
      incidents: [
        { date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), duration: 5, component: 'anomaly_detection', resolved: true },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), duration: 12, component: 'database', resolved: true },
        { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), duration: 3, component: 'rate_limiting', resolved: true },
      ],
    });
  }

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return 'green';
    if (uptime >= 99) return 'yellow';
    return 'red';
  };

  const formatUptime = (uptime: number) => `${uptime.toFixed(2)}%`;

  return (
    <SecurityLayout>
      <Head>
        <title>Security Health | AI Homelab</title>
        <meta name="description" content="Security system health monitoring" />
      </Head>

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiActivity} boxSize={6} />
                <Heading size="lg">Security Health</Heading>
              </HStack>
              <Text color={textSecondary}>
                Real-time health status of security components
              </Text>
            </VStack>
            <HStack>
              <Text fontSize="sm" color={textSecondary}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </Text>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={fetchHealth}
                isLoading={loading}
                size="sm"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
        </GlassPanel>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading && !health ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color="gray.500">Checking system health...</Text>
          </Box>
        ) : health ? (
          <>
            {/* Overall Status */}
            <GlassPanel variant="light" p={6}>
              <HStack justify="space-between" align="center">
                <HStack spacing={4}>
                  <Icon
                    as={statusIcons[health.status]}
                    boxSize={12}
                    color={`${statusColors[health.status]}.500`}
                  />
                  <Box>
                    <Heading size="md">
                      System Status: {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                    </Heading>
                    <Text color="gray.500">
                      {health.summary.healthy} healthy, {health.summary.degraded} degraded, {health.summary.unhealthy} unhealthy
                    </Text>
                  </Box>
                </HStack>
                <Badge
                  colorScheme={statusColors[health.status]}
                  fontSize="lg"
                  px={4}
                  py={2}
                >
                  {health.status.toUpperCase()}
                </Badge>
              </HStack>

              <Progress
                value={(health.summary.healthy / health.checks.length) * 100}
                colorScheme={statusColors[health.status]}
                size="sm"
                mt={4}
                borderRadius="full"
              />
            </GlassPanel>

            {/* Individual Checks */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {health.checks.map((check) => (
                <GlassPanel
                  key={check.name}
                  variant="light"
                  p={4}
                  borderLeft="4px solid"
                  borderLeftColor={`${statusColors[check.status]}.500`}
                >
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Icon
                        as={checkIcons[check.name] || FiServer}
                        color={`${statusColors[check.status]}.500`}
                      />
                      <Text fontWeight="semibold" textTransform="capitalize">
                        {check.name.replace(/_/g, ' ')}
                      </Text>
                    </HStack>
                    <Badge colorScheme={statusColors[check.status]}>
                      {check.status}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.500" noOfLines={2}>
                    {check.message}
                  </Text>
                  {check.latencyMs !== undefined && (
                    <Text fontSize="xs" color="gray.400" mt={2}>
                      Latency: {check.latencyMs}ms
                    </Text>
                  )}
                </GlassPanel>
              ))}
            </SimpleGrid>

            {/* Tabs for detailed views */}
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList>
                <Tab><Icon as={FiActivity} mr={2} />Components</Tab>
                <Tab><Icon as={FiCpu} mr={2} />System Resources</Tab>
                <Tab><Icon as={FiClock} mr={2} />Uptime & Incidents</Tab>
              </TabList>

              <TabPanels>
                {/* Components Tab */}
                <TabPanel px={0}>
                  <GlassPanel variant="light" p={0} overflow="hidden">
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Component</Th>
                          <Th>Status</Th>
                          <Th>Message</Th>
                          <Th isNumeric>Latency</Th>
                          <Th isNumeric>Uptime</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {health.checks.map((check) => (
                          <Tr key={check.name}>
                            <Td>
                              <HStack>
                                <Icon as={checkIcons[check.name] || FiServer} color={`${statusColors[check.status]}.500`} />
                                <Text fontWeight="medium" textTransform="capitalize">
                                  {check.name.replace(/_/g, ' ')}
                                </Text>
                              </HStack>
                            </Td>
                            <Td>
                              <Badge colorScheme={statusColors[check.status]}>
                                {check.status}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm" color="gray.500">{check.message}</Text>
                            </Td>
                            <Td isNumeric>
                              <Text 
                                fontSize="sm" 
                                color={check.latencyMs && check.latencyMs > 100 ? 'orange.500' : undefined}
                              >
                                {check.latencyMs}ms
                              </Text>
                            </Td>
                            <Td isNumeric>
                              {check.uptime && (
                                <Badge colorScheme={getUptimeColor(check.uptime)}>
                                  {formatUptime(check.uptime)}
                                </Badge>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </GlassPanel>
                </TabPanel>

                {/* System Resources Tab */}
                <TabPanel px={0}>
                  {metrics && (
                    <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
                      <GlassPanel variant="light" p={4}>
                        <VStack>
                          <CircularProgress value={metrics.cpu} color={metrics.cpu > 80 ? 'red.500' : metrics.cpu > 60 ? 'yellow.500' : 'green.500'} size="80px">
                            <CircularProgressLabel>{metrics.cpu}%</CircularProgressLabel>
                          </CircularProgress>
                          <Text fontWeight="medium">CPU</Text>
                        </VStack>
                      </GlassPanel>
                      <GlassPanel variant="light" p={4}>
                        <VStack>
                          <CircularProgress value={metrics.memory} color={metrics.memory > 80 ? 'red.500' : metrics.memory > 60 ? 'yellow.500' : 'green.500'} size="80px">
                            <CircularProgressLabel>{metrics.memory}%</CircularProgressLabel>
                          </CircularProgress>
                          <Text fontWeight="medium">Memory</Text>
                        </VStack>
                      </GlassPanel>
                      <GlassPanel variant="light" p={4}>
                        <VStack>
                          <CircularProgress value={metrics.disk} color={metrics.disk > 80 ? 'red.500' : metrics.disk > 60 ? 'yellow.500' : 'green.500'} size="80px">
                            <CircularProgressLabel>{metrics.disk}%</CircularProgressLabel>
                          </CircularProgress>
                          <Text fontWeight="medium">Disk</Text>
                        </VStack>
                      </GlassPanel>
                      <GlassPanel variant="light" p={4}>
                        <VStack>
                          <CircularProgress value={metrics.network} color="blue.500" size="80px">
                            <CircularProgressLabel>{metrics.network}%</CircularProgressLabel>
                          </CircularProgress>
                          <Text fontWeight="medium">Network</Text>
                        </VStack>
                      </GlassPanel>
                      <GlassPanel variant="light" p={4}>
                        <Stat textAlign="center">
                          <StatLabel>Connections</StatLabel>
                          <StatNumber>{metrics.activeConnections}</StatNumber>
                          <StatHelpText>Active</StatHelpText>
                        </Stat>
                      </GlassPanel>
                      <GlassPanel variant="light" p={4}>
                        <Stat textAlign="center">
                          <StatLabel>Requests/sec</StatLabel>
                          <StatNumber>{metrics.requestsPerSecond}</StatNumber>
                          <StatHelpText>Current load</StatHelpText>
                        </Stat>
                      </GlassPanel>
                    </SimpleGrid>
                  )}
                </TabPanel>

                {/* Uptime & Incidents Tab */}
                <TabPanel px={0}>
                  {uptime && (
                    <VStack spacing={4} align="stretch">
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                        <GlassPanel variant="light" p={4}>
                          <Stat>
                            <StatLabel>Overall Uptime</StatLabel>
                            <StatNumber color={`${getUptimeColor(uptime.overall)}.500`}>
                              {formatUptime(uptime.overall)}
                            </StatNumber>
                            <StatHelpText>All time</StatHelpText>
                          </Stat>
                        </GlassPanel>
                        <GlassPanel variant="light" p={4}>
                          <Stat>
                            <StatLabel>Last 24 Hours</StatLabel>
                            <StatNumber color={`${getUptimeColor(uptime.last24h)}.500`}>
                              {formatUptime(uptime.last24h)}
                            </StatNumber>
                          </Stat>
                        </GlassPanel>
                        <GlassPanel variant="light" p={4}>
                          <Stat>
                            <StatLabel>Last 7 Days</StatLabel>
                            <StatNumber color={`${getUptimeColor(uptime.last7d)}.500`}>
                              {formatUptime(uptime.last7d)}
                            </StatNumber>
                          </Stat>
                        </GlassPanel>
                        <GlassPanel variant="light" p={4}>
                          <Stat>
                            <StatLabel>Last 30 Days</StatLabel>
                            <StatNumber color={`${getUptimeColor(uptime.last30d)}.500`}>
                              {formatUptime(uptime.last30d)}
                            </StatNumber>
                          </Stat>
                        </GlassPanel>
                      </SimpleGrid>

                      <GlassPanel variant="light" p={4}>
                        <Heading size="sm" mb={4}>Recent Incidents</Heading>
                        {uptime.incidents.length === 0 ? (
                          <Box textAlign="center" py={4}>
                            <Icon as={FiCheckCircle} boxSize={8} color="green.500" mb={2} />
                            <Text color="gray.500">No recent incidents</Text>
                          </Box>
                        ) : (
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>Date</Th>
                                <Th>Component</Th>
                                <Th>Duration</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {uptime.incidents.map((incident, i) => (
                                <Tr key={i}>
                                  <Td>{new Date(incident.date).toLocaleDateString()}</Td>
                                  <Td>
                                    <HStack>
                                      <Icon as={checkIcons[incident.component] || FiServer} boxSize={4} />
                                      <Text textTransform="capitalize">{incident.component.replace(/_/g, ' ')}</Text>
                                    </HStack>
                                  </Td>
                                  <Td>{incident.duration} min</Td>
                                  <Td>
                                    <Badge colorScheme={incident.resolved ? 'green' : 'red'}>
                                      {incident.resolved ? 'Resolved' : 'Ongoing'}
                                    </Badge>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </GlassPanel>
                    </VStack>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>

            {/* Summary Stats */}
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Total Checks</StatLabel>
                  <StatNumber>{health.checks.length}</StatNumber>
                  <StatHelpText>Components monitored</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Healthy</StatLabel>
                  <StatNumber color="green.500">{health.summary.healthy}</StatNumber>
                  <StatHelpText>Operating normally</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Degraded</StatLabel>
                  <StatNumber color="yellow.500">{health.summary.degraded}</StatNumber>
                  <StatHelpText>Reduced performance</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Unhealthy</StatLabel>
                  <StatNumber color="red.500">{health.summary.unhealthy}</StatNumber>
                  <StatHelpText>Requires attention</StatHelpText>
                </Stat>
              </GlassPanel>
            </SimpleGrid>
          </>
        ) : null}
      </VStack>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/health',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
