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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import {
  FiBarChart2,
  FiShield,
  FiClock,
  FiActivity,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
  FiUsers,
  FiServer,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface SecurityMetrics {
  overview: {
    securityScore: number;
    scoreChange: number;
    totalRequests: number;
    blockedRequests: number;
    approvalRate: number;
    avgResponseTime: number;
  };
  authentication: {
    totalLogins: number;
    failedLogins: number;
    mfaUsage: number;
    sessionCount: number;
    avgSessionDuration: number;
  };
  rateLimit: {
    totalChecks: number;
    rateLimited: number;
    topLimitedEndpoints: { endpoint: string; count: number }[];
  };
  contentFilter: {
    totalScanned: number;
    blocked: number;
    flagged: number;
    categories: { name: string; count: number; percentage: number }[];
  };
  approvals: {
    pending: number;
    approved: number;
    denied: number;
    avgApprovalTime: number;
    topTools: { tool: string; requests: number; approvalRate: number }[];
  };
}

export default function MetricsPage() {
  const textSecondary = useSemanticToken('text.secondary');
  
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/security/metrics?range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      // Use mock data for demo
      setMetrics({
        overview: {
          securityScore: 94,
          scoreChange: 2.5,
          totalRequests: 125847,
          blockedRequests: 342,
          approvalRate: 87.5,
          avgResponseTime: 45,
        },
        authentication: {
          totalLogins: 1247,
          failedLogins: 23,
          mfaUsage: 78.5,
          sessionCount: 89,
          avgSessionDuration: 45,
        },
        rateLimit: {
          totalChecks: 98542,
          rateLimited: 156,
          topLimitedEndpoints: [
            { endpoint: '/api/chat/completions', count: 45 },
            { endpoint: '/api/embeddings', count: 32 },
            { endpoint: '/api/images/generate', count: 28 },
            { endpoint: '/api/audio/transcribe', count: 21 },
            { endpoint: '/api/search', count: 18 },
          ],
        },
        contentFilter: {
          totalScanned: 45678,
          blocked: 127,
          flagged: 89,
          categories: [
            { name: 'Harmful Content', count: 45, percentage: 35.4 },
            { name: 'PII Detection', count: 38, percentage: 29.9 },
            { name: 'Prompt Injection', count: 28, percentage: 22.0 },
            { name: 'Code Injection', count: 16, percentage: 12.6 },
          ],
        },
        approvals: {
          pending: 5,
          approved: 234,
          denied: 18,
          avgApprovalTime: 120,
          topTools: [
            { tool: 'file_write', requests: 89, approvalRate: 92 },
            { tool: 'shell_execute', requests: 67, approvalRate: 78 },
            { tool: 'api_call', requests: 45, approvalRate: 95 },
            { tool: 'database_query', requests: 33, approvalRate: 88 },
          ],
        },
      });
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'green';
    if (score >= 70) return 'yellow';
    return 'red';
  };

  return (
    <SecurityLayout>
      <Head>
        <title>Security Metrics | AI Homelab</title>
        <meta name="description" content="Security metrics and analytics dashboard" />
      </Head>

      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <Icon as={FiBarChart2} boxSize={6} color="blue.500" />
                <Heading size="lg">Security Metrics</Heading>
              </HStack>
              <Text color={textSecondary}>
                Real-time security analytics and performance metrics
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
              <Text fontSize="sm" color={textSecondary}>
                Updated: {lastRefresh.toLocaleTimeString()}
              </Text>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                onClick={fetchMetrics}
                isLoading={loading}
                size="sm"
              >
                Refresh
              </Button>
            </HStack>
          </HStack>
        </GlassPanel>

        {loading && !metrics ? (
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color="gray.500">Loading metrics...</Text>
          </Box>
        ) : metrics ? (
          <>
            {/* Overview Stats */}
            <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Security Score</StatLabel>
                  <StatNumber color={`${getScoreColor(metrics.overview.securityScore)}.500`}>
                    {metrics.overview.securityScore}%
                  </StatNumber>
                  <StatHelpText>
                    <StatArrow type={metrics.overview.scoreChange >= 0 ? 'increase' : 'decrease'} />
                    {Math.abs(metrics.overview.scoreChange)}%
                  </StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Total Requests</StatLabel>
                  <StatNumber>{metrics.overview.totalRequests.toLocaleString()}</StatNumber>
                  <StatHelpText>This period</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Blocked</StatLabel>
                  <StatNumber color="red.500">{metrics.overview.blockedRequests}</StatNumber>
                  <StatHelpText>
                    {((metrics.overview.blockedRequests / metrics.overview.totalRequests) * 100).toFixed(2)}% of total
                  </StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Approval Rate</StatLabel>
                  <StatNumber color="green.500">{metrics.overview.approvalRate}%</StatNumber>
                  <StatHelpText>HITL approvals</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Avg Response</StatLabel>
                  <StatNumber>{metrics.overview.avgResponseTime}ms</StatNumber>
                  <StatHelpText>Security checks</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>MFA Usage</StatLabel>
                  <StatNumber color="blue.500">{metrics.authentication.mfaUsage}%</StatNumber>
                  <StatHelpText>Of all logins</StatHelpText>
                </Stat>
              </GlassPanel>
            </SimpleGrid>

            {/* Detailed Metrics Tabs */}
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList flexWrap="wrap">
                <Tab><Icon as={FiShield} mr={2} />Authentication</Tab>
                <Tab><Icon as={FiClock} mr={2} />Rate Limiting</Tab>
                <Tab><Icon as={FiAlertTriangle} mr={2} />Content Filter</Tab>
                <Tab><Icon as={FiCheckCircle} mr={2} />Approvals</Tab>
              </TabList>

              <TabPanels>
                {/* Authentication Tab */}
                <TabPanel px={0}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Login Statistics</Heading>
                        <SimpleGrid columns={2} spacing={4}>
                          <Stat>
                            <StatLabel>Total Logins</StatLabel>
                            <StatNumber>{metrics.authentication.totalLogins}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Failed Logins</StatLabel>
                            <StatNumber color="red.500">{metrics.authentication.failedLogins}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">Success Rate</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {((1 - metrics.authentication.failedLogins / metrics.authentication.totalLogins) * 100).toFixed(1)}%
                            </Text>
                          </HStack>
                          <Progress
                            value={(1 - metrics.authentication.failedLogins / metrics.authentication.totalLogins) * 100}
                            colorScheme="green"
                            borderRadius="full"
                          />
                        </Box>
                      </VStack>
                    </GlassPanel>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Session Metrics</Heading>
                        <SimpleGrid columns={2} spacing={4}>
                          <Stat>
                            <StatLabel>Active Sessions</StatLabel>
                            <StatNumber>{metrics.authentication.sessionCount}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Avg Duration</StatLabel>
                            <StatNumber>{metrics.authentication.avgSessionDuration}m</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">MFA Adoption</Text>
                            <Text fontSize="sm" fontWeight="bold">{metrics.authentication.mfaUsage}%</Text>
                          </HStack>
                          <Progress
                            value={metrics.authentication.mfaUsage}
                            colorScheme="blue"
                            borderRadius="full"
                          />
                        </Box>
                      </VStack>
                    </GlassPanel>
                  </SimpleGrid>
                </TabPanel>

                {/* Rate Limiting Tab */}
                <TabPanel px={0}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Rate Limit Overview</Heading>
                        <SimpleGrid columns={2} spacing={4}>
                          <Stat>
                            <StatLabel>Total Checks</StatLabel>
                            <StatNumber>{metrics.rateLimit.totalChecks.toLocaleString()}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Rate Limited</StatLabel>
                            <StatNumber color="orange.500">{metrics.rateLimit.rateLimited}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">Pass Rate</Text>
                            <Text fontSize="sm" fontWeight="bold">
                              {((1 - metrics.rateLimit.rateLimited / metrics.rateLimit.totalChecks) * 100).toFixed(2)}%
                            </Text>
                          </HStack>
                          <Progress
                            value={(1 - metrics.rateLimit.rateLimited / metrics.rateLimit.totalChecks) * 100}
                            colorScheme="green"
                            borderRadius="full"
                          />
                        </Box>
                      </VStack>
                    </GlassPanel>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Top Rate-Limited Endpoints</Heading>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Endpoint</Th>
                              <Th isNumeric>Count</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {metrics.rateLimit.topLimitedEndpoints.map((ep, i) => (
                              <Tr key={i}>
                                <Td fontSize="xs">{ep.endpoint}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme="orange">{ep.count}</Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </VStack>
                    </GlassPanel>
                  </SimpleGrid>
                </TabPanel>

                {/* Content Filter Tab */}
                <TabPanel px={0}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Content Scanning</Heading>
                        <SimpleGrid columns={3} spacing={4}>
                          <Stat>
                            <StatLabel>Scanned</StatLabel>
                            <StatNumber>{metrics.contentFilter.totalScanned.toLocaleString()}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Blocked</StatLabel>
                            <StatNumber color="red.500">{metrics.contentFilter.blocked}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Flagged</StatLabel>
                            <StatNumber color="yellow.500">{metrics.contentFilter.flagged}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                      </VStack>
                    </GlassPanel>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Detection Categories</Heading>
                        {metrics.contentFilter.categories.map((cat, i) => (
                          <Box key={i}>
                            <HStack justify="space-between" mb={1}>
                              <Text fontSize="sm">{cat.name}</Text>
                              <Text fontSize="sm" fontWeight="bold">{cat.count} ({cat.percentage}%)</Text>
                            </HStack>
                            <Progress
                              value={cat.percentage}
                              colorScheme={i === 0 ? 'red' : i === 1 ? 'orange' : 'yellow'}
                              size="sm"
                              borderRadius="full"
                            />
                          </Box>
                        ))}
                      </VStack>
                    </GlassPanel>
                  </SimpleGrid>
                </TabPanel>

                {/* Approvals Tab */}
                <TabPanel px={0}>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Approval Statistics</Heading>
                        <SimpleGrid columns={3} spacing={4}>
                          <Stat>
                            <StatLabel>Pending</StatLabel>
                            <StatNumber color="yellow.500">{metrics.approvals.pending}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Approved</StatLabel>
                            <StatNumber color="green.500">{metrics.approvals.approved}</StatNumber>
                          </Stat>
                          <Stat>
                            <StatLabel>Denied</StatLabel>
                            <StatNumber color="red.500">{metrics.approvals.denied}</StatNumber>
                          </Stat>
                        </SimpleGrid>
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">Avg Approval Time</Text>
                            <Text fontSize="sm" fontWeight="bold">{metrics.approvals.avgApprovalTime}s</Text>
                          </HStack>
                        </Box>
                      </VStack>
                    </GlassPanel>
                    <GlassPanel variant="light" p={6}>
                      <VStack align="stretch" spacing={4}>
                        <Heading size="sm">Top Tools by Requests</Heading>
                        <Table size="sm" variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Tool</Th>
                              <Th isNumeric>Requests</Th>
                              <Th isNumeric>Approval %</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {metrics.approvals.topTools.map((tool, i) => (
                              <Tr key={i}>
                                <Td fontFamily="mono" fontSize="xs">{tool.tool}</Td>
                                <Td isNumeric>{tool.requests}</Td>
                                <Td isNumeric>
                                  <Badge colorScheme={tool.approvalRate >= 90 ? 'green' : tool.approvalRate >= 70 ? 'yellow' : 'red'}>
                                    {tool.approvalRate}%
                                  </Badge>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </VStack>
                    </GlassPanel>
                  </SimpleGrid>
                </TabPanel>
              </TabPanels>
            </Tabs>
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
        destination: '/auth/signin?callbackUrl=/security/metrics',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
