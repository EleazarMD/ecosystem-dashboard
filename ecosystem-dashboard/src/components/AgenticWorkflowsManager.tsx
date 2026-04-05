import React, { useState, useEffect, useCallback } from 'react';
import { WorkflowStatus } from '../pages/api/get-workflow-status'; // Import the interface
import { io } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext'; // CHANGED: Import useAuth instead of useAuth0
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  HStack,
  Badge,
  Code,
  Divider,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
} from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { OpenClawWorkflowsPanel } from '@/components/openclaw';
import IntelligenceWorkflowsPanel from '@/components/IntelligenceWorkflowsPanel';

// Interfaces for WebSocket event data based on REALTIME_WORKFLOW_STATUS_WEBSOCKET_INTEGRATION.md
interface SubscriptionAckData {
  workflowId: string;
  room: string;
  status: 'subscribed' | 'unsubscribed';
}

interface SubscriptionErrorData {
  workflowId: string;
  message: string;
}

interface ServerErrorData {
  message: string;
  details?: string;
}

const AI_GATEWAY_WS_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_WS_URL || 'http://localhost:3000';
const WS_PATH = '/ws/agentic-workflows/';

// Base Socket.IO connection options (static part)
const baseSocketOptions = {
  path: WS_PATH,
  transports: ['websocket'], // Force WebSocket transport only
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  withCredentials: true, // Important for CORS with credentials
};

const AgenticWorkflowsManager: React.FC = () => {
  // CHANGED: Use Authentik-based auth hook
  const {
    isAuthenticated,
    isLoading: authIsLoading, // Renamed to avoid conflict if other isLoading states exist
    user, // User object from Authentik, might be useful later
    token, // Access token from Authentik
    login, // Added for prompting login
  } = useAuth();

  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [socket, setSocket] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [subscribedWorkflowIds, setSubscribedWorkflowIds] = useState<Set<string>>(new Set());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  // Fetch initial workflow data
  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        setError(null); // Clear previous errors
        const response = await fetch('/api/get-workflow-status');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: WorkflowStatus[] = await response.json();
        setWorkflows(data);
      } catch (err) {
        console.error('Failed to fetch initial workflows:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred fetching workflows');
      } finally {
        setInitialLoadComplete(true);
      }
    };

    fetchWorkflows();
  }, []);

  // Effect for WebSocket connection and event handling
  useEffect(() => {
    if (typeof window === 'undefined' || authIsLoading) {
      return;
    }

    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const dynamicSocketOptions = {
      ...baseSocketOptions,
      auth: { token },
      extraHeaders: { 'Origin': window.location.origin },
    };

    const newSocket = io(AI_GATEWAY_WS_URL, dynamicSocketOptions);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO: Connected to AI Gateway', newSocket.id);
      setSocketConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Socket.IO: Disconnected. Reason:', reason);
      setSocketConnected(false);
      setSubscribedWorkflowIds(new Set());
      setError(`Disconnected: ${reason}.`);
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('Socket.IO: Connection Error:', err.message);
      setError(`Socket connection error: ${err.message}`);
      setSocketConnected(false);
    });

    newSocket.on('server_error', (data: ServerErrorData) => {
      console.error('Socket.IO: Server Error:', data);
      setError(`Server error from WebSocket: ${data.message}`);
    });

    newSocket.on('workflow_status_update', (update: WorkflowStatus) => {
      setWorkflows(prev => {
        const index = prev.findIndex(wf => wf.id === update.id);
        if (index !== -1) {
          const newWorkflows = [...prev];
          newWorkflows[index] = { ...newWorkflows[index], ...update };
          return newWorkflows;
        }
        return [...prev, update];
      });
    });

    newSocket.on('subscription_ack', (data: SubscriptionAckData) => {
      if (data.status === 'subscribed') {
        setSubscribedWorkflowIds(prev => new Set(prev).add(data.workflowId));
      }
    });

    newSocket.on('subscription_error', (data: SubscriptionErrorData) => {
      console.error('Socket.IO: Subscription Error:', data);
      setError(`Subscription error for ${data.workflowId}: ${data.message}`);
    });

    return () => {
      console.log('Socket.IO: Disconnecting WebSocket on cleanup.');
      newSocket.disconnect();
      setSocket(null);
      setSocketConnected(false);
      setSubscribedWorkflowIds(new Set());
    };
  }, [isAuthenticated, token, authIsLoading]);

  // Subscribe to individual workflows when they appear in the list
  useEffect(() => {
    if (socketConnected && socket) {
      workflows.forEach(wf => {
        if (!subscribedWorkflowIds.has(wf.id)) {
          console.log(`Socket.IO: Subscribing to workflow ${wf.id}`);
          socket.emit('subscribe_workflow_status', { workflowId: wf.id });
        }
      });
    }
  }, [workflows, socketConnected, socket, subscribedWorkflowIds]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running': return 'blue';
      case 'pending': return 'yellow';
      case 'completed': return 'green';
      case 'failed': return 'red';
      case 'queued': return 'orange';
      case 'processing': return 'cyan';
      default: return 'gray';
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'yyyy-MM-dd HH:mm:ss');
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  return (
    <DashboardLayout>
      <Box p={5}>
        <Heading mb={6}>Agentic Workflows</Heading>

        <Tabs variant="enclosed" colorScheme="blue" isLazy>
          <TabList>
            <Tab>Intelligence Workflows</Tab>
            <Tab>Workflow Status</Tab>
            <Tab>OpenClaw Agent</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <IntelligenceWorkflowsPanel />
            </TabPanel>

            <TabPanel px={0}>
              {authIsLoading && (
                <VStack spacing={4} align="stretch">
                  <HStack>
                    <Spinner size="md" />
                    <Text>Authenticating...</Text>
                  </HStack>
                </VStack>
              )}

              {error && (
                <Alert status="error" mb={4}>
                  <AlertIcon />
                  <AlertTitle>Error!</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!authIsLoading && !isAuthenticated && (
                <Alert status="warning" mb={4}>
                  <AlertIcon />
                  <AlertTitle>Not Authenticated</AlertTitle>
                  <AlertDescription>
                    You need to be logged in to view workflow statuses and connect to real-time updates.
                    <Button colorScheme="teal" variant="link" ml={2} onClick={() => login()}>
                      Log In
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!authIsLoading && isAuthenticated && !initialLoadComplete && (
                <VStack spacing={4} align="stretch">
                  <HStack>
                    <Spinner size="md" />
                    <Text>Loading workflow data...</Text>
                  </HStack>
                </VStack>
              )}

              {!authIsLoading && isAuthenticated && initialLoadComplete && (
                <>
                  <Alert status={socketConnected ? "success" : "warning"} mb={4}>
                    <AlertIcon />
                    <AlertTitle>
                      WebSocket {socketConnected ? "Connected" : "Disconnected"}
                    </AlertTitle>
                    <AlertDescription>
                      {socketConnected
                        ? "Real-time updates enabled. Subscribed to workflow changes."
                        : "Real-time updates disabled. Using polling for updates."}
                    </AlertDescription>
                  </Alert>

                  {workflows.length === 0 ? (
                    <Text fontSize="lg" color={useSemanticToken('text.secondary')}>
                      No workflows found.
                    </Text>
                  ) : (
                    <VStack spacing={4} align="stretch">
                      {workflows.map((workflow) => (
                        <Box
                          key={workflow.id}
                          p={4}
                          bg={cardBg}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor={borderColor}
                          shadow="sm"
                        >
                          <HStack justifyContent="space-between" mb={2}>
                            <VStack align="start" spacing={1}>
                              <Text fontWeight="bold" fontSize="lg">
                                {workflow.name}
                              </Text>
                              <Code fontSize="sm" colorScheme="gray">
                                {workflow.id}
                              </Code>
                            </VStack>
                            <Badge
                              colorScheme={getStatusColor(workflow.status)}
                              fontSize="md"
                              px={3}
                              py={1}
                              borderRadius="full"
                            >
                              {workflow.status}
                            </Badge>
                          </HStack>

                          <Divider my={3} />

                          <VStack align="start" spacing={2}>
                            <HStack>
                              <Text fontWeight="semibold">Details:</Text>
                              <Text>{workflow.details || 'No details available'}</Text>
                            </HStack>
                            
                            <HStack>
                              <Text fontWeight="semibold">Started:</Text>
                              <Text>{workflow.startTime ? format(parseISO(workflow.startTime), 'PPpp') : 'Unknown'}</Text>
                            </HStack>

                            <HStack>
                              <Text fontWeight="semibold">Last Updated:</Text>
                              <Text>{format(parseISO(workflow.lastUpdate), 'PPpp')}</Text>
                            </HStack>

                            {workflow.endTime && (
                              <HStack>
                                <Text fontWeight="semibold">Ended:</Text>
                                <Text>{format(parseISO(workflow.endTime), 'PPpp')}</Text>
                              </HStack>
                            )}

                            {workflow.progress !== undefined && (
                              <HStack>
                                <Text fontWeight="semibold">Progress:</Text>
                                <Text>{workflow.progress}%</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </>
              )}
            </TabPanel>

            <TabPanel px={0}>
              <OpenClawWorkflowsPanel />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </DashboardLayout>
  );
};

export default AgenticWorkflowsManager;
