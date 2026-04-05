import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardHeader,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  useToast,
  Progress,
  VStack,
  HStack,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Switch,
  useColorModeValue,
} from '@chakra-ui/react';
import { RefreshCw, Shield, AlertTriangle, DollarSign, Zap, Lock, Unlock } from 'lucide-react';

interface BudgetConfig {
  enabled: boolean;
  maxTokensPerSession: number;
  maxTokensPerHour: number;
  maxTokensPerDay: number;
  maxCostPerHour: number;
  maxCostPerDay: number;
  maxToolCallsPerSession: number;
  maxConsecutiveToolCalls: number;
}

interface BudgetStatus {
  enabled: boolean;
  config: BudgetConfig;
  hourlyUsage: { tokens: number; cost: number; resetAt: number };
  dailyUsage: { tokens: number; cost: number; resetAt: number };
  activeSessions: number;
  blockedSessions: number;
}

interface SessionDetails {
  sessionId: string;
  userId: string;
  startedAt: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  toolCalls: Record<string, number>;
  blocked: boolean;
  blockReason?: string;
}

interface BudgetEvent {
  type: 'budget_warning' | 'budget_exceeded' | 'loop_detected' | 'session_blocked';
  sessionId: string;
  userId: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export default function BudgetGuardPage() {
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [sessions, setSessions] = useState<SessionDetails[]>([]);
  const [events, setEvents] = useState<BudgetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [configEditing, setConfigEditing] = useState(false);
  const [editedConfig, setEditedConfig] = useState<Partial<BudgetConfig>>({});
  const toast = useToast();

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, sessionsRes, eventsRes] = await Promise.all([
        fetch('/api/openclaw/budget?action=status'),
        fetch('/api/openclaw/budget?action=sessions'),
        fetch('/api/openclaw/budget?action=events'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
        setEditedConfig(statusData.config);
      }
      if (sessionsRes.ok) {
        setSessions(await sessionsRes.json());
      }
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      toast({
        title: 'Error fetching budget data',
        description: 'Could not connect to OpenClaw Gateway',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleUnblockSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/openclaw/budget?action=unblock-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        toast({ title: 'Session unblocked', status: 'success', duration: 3000 });
        fetchData();
      } else {
        throw new Error('Failed to unblock session');
      }
    } catch (error) {
      toast({ title: 'Error unblocking session', status: 'error', duration: 5000 });
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/openclaw/budget?action=update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedConfig),
      });
      if (res.ok) {
        toast({ title: 'Configuration saved', status: 'success', duration: 3000 });
        setConfigEditing(false);
        fetchData();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({ title: 'Error saving configuration', status: 'error', duration: 5000 });
    }
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
  const formatTokens = (tokens: number) => tokens.toLocaleString();
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'budget_warning': return 'yellow';
      case 'budget_exceeded': return 'red';
      case 'loop_detected': return 'orange';
      case 'session_blocked': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <SecurityLayout>
        <Box p={8} textAlign="center">
          <Text>Loading budget guard data...</Text>
        </Box>
      </SecurityLayout>
    );
  }

  const hourlyTokenPercent = status ? (status.hourlyUsage.tokens / status.config.maxTokensPerHour) * 100 : 0;
  const dailyTokenPercent = status ? (status.dailyUsage.tokens / status.config.maxTokensPerDay) * 100 : 0;
  const hourlyCostPercent = status ? (status.hourlyUsage.cost / status.config.maxCostPerHour) * 100 : 0;
  const dailyCostPercent = status ? (status.dailyUsage.cost / status.config.maxCostPerDay) * 100 : 0;

  return (
    <SecurityLayout>
      <Head>
        <title>Budget Guard | Security | AI Homelab</title>
        <meta name="description" content="OpenClaw Budget Guard - Token and cost limits" />
      </Head>

      <Box p={6}>
        <HStack justify="space-between" mb={6}>
          <VStack align="start" spacing={1}>
            <Heading size="lg">Budget Guard</Heading>
            <Text color="gray.500">Token budget limits and cost circuit breakers for OpenClaw</Text>
          </VStack>
          <HStack>
            <Badge colorScheme={status?.enabled ? 'green' : 'red'} fontSize="md" px={3} py={1}>
              {status?.enabled ? 'ACTIVE' : 'DISABLED'}
            </Badge>
            <Button leftIcon={<RefreshCw size={16} />} onClick={fetchData} size="sm">
              Refresh
            </Button>
          </HStack>
        </HStack>

        {status?.blockedSessions && status.blockedSessions > 0 && (
          <Alert status="warning" mb={6} borderRadius="md">
            <AlertIcon />
            <AlertTitle>{status.blockedSessions} session(s) blocked</AlertTitle>
            <AlertDescription>
              Sessions have been blocked due to budget limits. Review and unblock if needed.
            </AlertDescription>
          </Alert>
        )}

        <Tabs>
          <TabList>
            <Tab>Overview</Tab>
            <Tab>Sessions ({sessions.length})</Tab>
            <Tab>Events ({events.length})</Tab>
            <Tab>Configuration</Tab>
          </TabList>

          <TabPanels>
            {/* Overview Tab */}
            <TabPanel px={0}>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={6}>
                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Hourly Tokens</StatLabel>
                      <StatNumber>{formatTokens(status?.hourlyUsage.tokens ?? 0)}</StatNumber>
                      <StatHelpText>of {formatTokens(status?.config.maxTokensPerHour ?? 0)}</StatHelpText>
                      <Progress value={hourlyTokenPercent} colorScheme={hourlyTokenPercent > 80 ? 'red' : 'blue'} size="sm" mt={2} />
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Daily Tokens</StatLabel>
                      <StatNumber>{formatTokens(status?.dailyUsage.tokens ?? 0)}</StatNumber>
                      <StatHelpText>of {formatTokens(status?.config.maxTokensPerDay ?? 0)}</StatHelpText>
                      <Progress value={dailyTokenPercent} colorScheme={dailyTokenPercent > 80 ? 'red' : 'blue'} size="sm" mt={2} />
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Hourly Cost</StatLabel>
                      <StatNumber>{formatCost(status?.hourlyUsage.cost ?? 0)}</StatNumber>
                      <StatHelpText>of {formatCost(status?.config.maxCostPerHour ?? 0)}</StatHelpText>
                      <Progress value={hourlyCostPercent} colorScheme={hourlyCostPercent > 80 ? 'red' : 'green'} size="sm" mt={2} />
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Daily Cost</StatLabel>
                      <StatNumber>{formatCost(status?.dailyUsage.cost ?? 0)}</StatNumber>
                      <StatHelpText>of {formatCost(status?.config.maxCostPerDay ?? 0)}</StatHelpText>
                      <Progress value={dailyCostPercent} colorScheme={dailyCostPercent > 80 ? 'red' : 'green'} size="sm" mt={2} />
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardHeader>
                    <HStack>
                      <Shield size={20} />
                      <Heading size="sm">Session Stats</Heading>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <SimpleGrid columns={2} spacing={4}>
                      <Stat>
                        <StatLabel>Active Sessions</StatLabel>
                        <StatNumber>{status?.activeSessions ?? 0}</StatNumber>
                      </Stat>
                      <Stat>
                        <StatLabel>Blocked Sessions</StatLabel>
                        <StatNumber color={status?.blockedSessions ? 'red.500' : undefined}>
                          {status?.blockedSessions ?? 0}
                        </StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                  <CardHeader>
                    <HStack>
                      <Zap size={20} />
                      <Heading size="sm">Reset Times</Heading>
                    </HStack>
                  </CardHeader>
                  <CardBody>
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm">
                        <strong>Hourly reset:</strong> {status ? formatTime(status.hourlyUsage.resetAt) : 'N/A'}
                      </Text>
                      <Text fontSize="sm">
                        <strong>Daily reset:</strong> {status ? formatTime(status.dailyUsage.resetAt) : 'N/A'}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </TabPanel>

            {/* Sessions Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                <CardBody>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Session ID</Th>
                        <Th>User</Th>
                        <Th isNumeric>Tokens</Th>
                        <Th isNumeric>Cost</Th>
                        <Th isNumeric>Tool Calls</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sessions.map((session) => (
                        <Tr key={session.sessionId}>
                          <Td fontFamily="mono" fontSize="xs">{session.sessionId.slice(0, 16)}...</Td>
                          <Td>{session.userId}</Td>
                          <Td isNumeric>{formatTokens(session.tokenUsage.totalTokens)}</Td>
                          <Td isNumeric>{formatCost(session.tokenUsage.estimatedCost)}</Td>
                          <Td isNumeric>{Object.values(session.toolCalls).reduce((a, b) => a + b, 0)}</Td>
                          <Td>
                            <Badge colorScheme={session.blocked ? 'red' : 'green'}>
                              {session.blocked ? 'BLOCKED' : 'ACTIVE'}
                            </Badge>
                          </Td>
                          <Td>
                            {session.blocked && (
                              <Button
                                size="xs"
                                leftIcon={<Unlock size={12} />}
                                onClick={() => handleUnblockSession(session.sessionId)}
                              >
                                Unblock
                              </Button>
                            )}
                          </Td>
                        </Tr>
                      ))}
                      {sessions.length === 0 && (
                        <Tr>
                          <Td colSpan={7} textAlign="center" color="gray.500">
                            No active sessions
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Events Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                <CardBody>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Time</Th>
                        <Th>Type</Th>
                        <Th>Session</Th>
                        <Th>User</Th>
                        <Th>Details</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {events.slice().reverse().map((event, idx) => (
                        <Tr key={idx}>
                          <Td fontSize="xs">{formatTime(event.timestamp)}</Td>
                          <Td>
                            <Badge colorScheme={getEventBadgeColor(event.type)}>
                              {event.type.replace(/_/g, ' ')}
                            </Badge>
                          </Td>
                          <Td fontFamily="mono" fontSize="xs">{event.sessionId.slice(0, 12)}...</Td>
                          <Td>{event.userId}</Td>
                          <Td fontSize="xs">{JSON.stringify(event.details).slice(0, 50)}...</Td>
                        </Tr>
                      ))}
                      {events.length === 0 && (
                        <Tr>
                          <Td colSpan={5} textAlign="center" color="gray.500">
                            No recent events
                          </Td>
                        </Tr>
                      )}
                    </Tbody>
                  </Table>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Configuration Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg} borderColor={borderColor} borderWidth={1}>
                <CardHeader>
                  <HStack justify="space-between">
                    <Heading size="sm">Budget Guard Configuration</Heading>
                    <HStack>
                      {configEditing ? (
                        <>
                          <Button size="sm" onClick={() => setConfigEditing(false)}>Cancel</Button>
                          <Button size="sm" colorScheme="blue" onClick={handleSaveConfig}>Save</Button>
                        </>
                      ) : (
                        <Button size="sm" onClick={() => setConfigEditing(true)}>Edit</Button>
                      )}
                    </HStack>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <FormControl>
                      <FormLabel>Enabled</FormLabel>
                      <Switch
                        isChecked={editedConfig.enabled}
                        onChange={(e) => setEditedConfig({ ...editedConfig, enabled: e.target.checked })}
                        isDisabled={!configEditing}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Tokens Per Session</FormLabel>
                      <NumberInput
                        value={editedConfig.maxTokensPerSession}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxTokensPerSession: val })}
                        isDisabled={!configEditing}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Tokens Per Hour</FormLabel>
                      <NumberInput
                        value={editedConfig.maxTokensPerHour}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxTokensPerHour: val })}
                        isDisabled={!configEditing}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Tokens Per Day</FormLabel>
                      <NumberInput
                        value={editedConfig.maxTokensPerDay}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxTokensPerDay: val })}
                        isDisabled={!configEditing}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Cost Per Hour ($)</FormLabel>
                      <NumberInput
                        value={editedConfig.maxCostPerHour}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxCostPerHour: val })}
                        isDisabled={!configEditing}
                        precision={2}
                        step={0.5}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Cost Per Day ($)</FormLabel>
                      <NumberInput
                        value={editedConfig.maxCostPerDay}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxCostPerDay: val })}
                        isDisabled={!configEditing}
                        precision={2}
                        step={1}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Tool Calls Per Session</FormLabel>
                      <NumberInput
                        value={editedConfig.maxToolCallsPerSession}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxToolCallsPerSession: val })}
                        isDisabled={!configEditing}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>

                    <FormControl>
                      <FormLabel>Max Consecutive Tool Calls (Loop Detection)</FormLabel>
                      <NumberInput
                        value={editedConfig.maxConsecutiveToolCalls}
                        onChange={(_, val) => setEditedConfig({ ...editedConfig, maxConsecutiveToolCalls: val })}
                        isDisabled={!configEditing}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                  </SimpleGrid>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/budget-guard',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};
