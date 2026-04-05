/**
 * COPY THIS FILE TO:
 * ecosystem-dashboard/src/pages/openclaw-browser-oversight.tsx
 * 
 * Then add navigation link in:
 * ecosystem-dashboard/src/config/navigation.ts
 * 
 * Add environment variables to:
 * ecosystem-dashboard/.env.local
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import {
  Box, VStack, HStack, Heading, Text, Badge, Button, 
  Alert, AlertIcon, AlertTitle, AlertDescription,
  Card, CardHeader, CardBody, CardFooter,
  Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Divider, Tag, Tooltip, IconButton, Progress,
  Flex, Spacer, Container, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  useToast,
} from '@chakra-ui/react';
import {
  FiEye, FiCheckCircle, FiXCircle, FiAlertTriangle,
  FiRefreshCw, FiExternalLink, FiActivity, FiShield,
  FiPlay, FiPause, FiMonitor, FiSmartphone,
} from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface BrowserSession {
  id: string;
  url: string;
  title: string;
  status: 'idle' | 'active' | 'awaiting_approval' | 'completed' | 'error';
  confidence: number;
  task: string;
  agent: string;
  startTime: string;
  lastActivity: string;
  requiresApproval: boolean;
  novncUrl: string;
}

interface ApprovalRequest {
  id: string;
  sessionId: string;
  type: 'checkout' | 'payment' | 'personal_info' | 'navigation';
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'denied';
}

// noVNC Viewer Component
function NoVNCViewer({ url, isActive }: { url: string; isActive: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    if (isActive && iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isActive]);

  return (
    <Box
      position="relative"
      width="100%"
      height="600px"
      borderRadius="lg"
      overflow="hidden"
      border="2px solid"
      borderColor={isActive ? 'blue.400' : 'gray.600'}
      boxShadow={isActive ? '0 0 20px rgba(66, 153, 225, 0.5)' : undefined}
    >
      {!isActive && (
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.700"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={10}
        >
          <VStack>
            <FiPause size={48} color="white" />
            <Text color="white" fontWeight="bold">Session Paused</Text>
          </VStack>
        </Box>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        width="100%"
        height="100%"
        style={{ border: 'none' }}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        title="OpenClaw Browser Preview"
      />
    </Box>
  );
}

// Approval Card Component
function ApprovalCard({ request, onApprove, onDeny }: {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  const bgCard = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  
  const typeColors: Record<string, string> = {
    checkout: 'orange',
    payment: 'red',
    personal_info: 'yellow',
    navigation: 'blue',
  };

  return (
    <Card bg={bgCard} borderLeft="4px solid" borderLeftColor={`${typeColors[request.type]}.400`}>
      <CardHeader pb={2}>
        <HStack>
          <Badge colorScheme={typeColors[request.type]}>{request.type}</Badge>
          <Text fontSize="sm" color="gray.500">
            {new Date(request.timestamp).toLocaleTimeString()}
          </Text>
          <Spacer />
          <Badge colorScheme={request.status === 'pending' ? 'yellow' : request.status === 'approved' ? 'green' : 'red'}>
            {request.status}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <Text color={textPrimary}>{request.description}</Text>
      </CardBody>
      {request.status === 'pending' && (
        <CardFooter pt={0}>
          <HStack spacing={2} width="100%">
            <Button
              leftIcon={<FiCheckCircle />}
              colorScheme="green"
              size="sm"
              flex={1}
              onClick={() => onApprove(request.id)}
            >
              Approve
            </Button>
            <Button
              leftIcon={<FiXCircle />}
              colorScheme="red"
              size="sm"
              flex={1}
              onClick={() => onDeny(request.id)}
            >
              Deny
            </Button>
          </HStack>
        </CardFooter>
      )}
    </Card>
  );
}

// Main Page Component
export default function OpenClawBrowserOversight() {
  const toast = useToast();
  const bgPage = useSemanticToken('surface.page');
  const bgCard = useSemanticToken('surface.elevated');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [sessions, setSessions] = useState<BrowserSession[]>([]);
  const [activeSession, setActiveSession] = useState<BrowserSession | null>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [isLoading, setIsLoading] = useState(false);

  // Get CloudFlare tunnel URL from env
  const novncBaseUrl = process.env.NEXT_PUBLIC_NOVNC_URL || 'https://openclaw-browser.your-tunnel.workers.dev';

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/openclaw/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        const active = data.sessions?.find((s: BrowserSession) => s.status === 'active');
        if (active && !activeSession) {
          setActiveSession(active);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [activeSession]);

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    try {
      const response = await fetch('/api/approvals?status=pending');
      if (response.ok) {
        const data = await response.json();
        const browserApprovals = data.approvals?.filter(
          (a: any) => a.category === 'browser' || a.category === 'commerce'
        ) || [];
        setApprovals(browserApprovals);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    }
  }, []);

  // Polling
  useEffect(() => {
    fetchSessions();
    fetchApprovals();
    const interval = setInterval(() => {
      fetchSessions();
      fetchApprovals();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSessions, fetchApprovals]);

  // Handle approval actions
  const handleApprove = async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/approve`, { method: 'POST' });
      if (response.ok) {
        toast({ title: 'Approved', status: 'success', duration: 3000 });
        fetchApprovals();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve', status: 'error', duration: 3000 });
    }
  };

  const handleDeny = async (approvalId: string) => {
    try {
      const response = await fetch(`/api/approvals/${approvalId}/reject`, { method: 'POST' });
      if (response.ok) {
        toast({ title: 'Denied', status: 'info', duration: 3000 });
        fetchApprovals();
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to deny', status: 'error', duration: 3000 });
    }
  };

  const requestOversight = async (sessionId: string) => {
    try {
      await fetch('/api/openclaw/oversight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason: 'manual_request' }),
      });
      toast({ title: 'Oversight Requested', description: 'Agent will pause for review', status: 'info', duration: 3000 });
    } catch (error) {
      console.error('Failed to request oversight:', error);
    }
  };

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const hasLowConfidenceSession = sessions.some(s => s.confidence < confidenceThreshold && s.status === 'active');

  return (
    <DashboardLayout>
      <Head>
        <title>OpenClaw Browser Oversight | AI Homelab</title>
      </Head>

      <Box bg={bgPage} minH="calc(100vh - 64px)" p={6}>
        <Container maxW="1600px">
          {/* Header */}
          <VStack align="stretch" spacing={6} mb={6}>
            <Flex align="center" wrap="wrap" gap={4}>
              <HStack>
                <FiMonitor size={28} />
                <Heading size="lg">OpenClaw Browser Oversight</Heading>
              </HStack>
              <Spacer />
              <HStack spacing={4}>
                <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                  <HStack spacing={1}>
                    <FiEye />
                    <span>{sessions.filter(s => s.status === 'active').length} Active</span>
                  </HStack>
                </Badge>
                {pendingApprovals.length > 0 && (
                  <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                    <HStack spacing={1}>
                      <FiAlertTriangle />
                      <span>{pendingApprovals.length} Pending</span>
                    </HStack>
                  </Badge>
                )}
                <Button leftIcon={<FiRefreshCw />} onClick={() => { fetchSessions(); fetchApprovals(); }} isLoading={isLoading}>
                  Refresh
                </Button>
              </HStack>
            </Flex>

            {hasLowConfidenceSession && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertTitle>Low Confidence Detected</AlertTitle>
                <AlertDescription>
                  One or more sessions have confidence below {confidenceThreshold}%
                </AlertDescription>
              </Alert>
            )}
          </VStack>

          <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={6}>
            {/* Left Panel */}
            <VStack align="stretch" spacing={4}>
              {/* Confidence Settings */}
              <Card bg={bgCard}>
                <CardHeader pb={2}>
                  <Heading size="sm">Quality Control Settings</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack align="stretch" spacing={4}>
                    <Box>
                      <Text fontSize="sm" mb={2} color={textSecondary}>
                        Confidence Threshold: {confidenceThreshold}%
                      </Text>
                      <Slider value={confidenceThreshold} onChange={setConfidenceThreshold} min={0} max={100} step={5}>
                        <SliderTrack><SliderFilledTrack /></SliderTrack>
                        <SliderThumb />
                      </Slider>
                      <Text fontSize="xs" color={textSecondary} mt={1}>
                        Sessions below this trigger oversight mode
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>

              {/* Active Sessions */}
              <Card bg={bgCard} flex={1}>
                <CardHeader pb={2}>
                  <Heading size="sm">Active Sessions</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack align="stretch" spacing={2}>
                    {sessions.length === 0 ? (
                      <Text color={textSecondary} textAlign="center" py={4}>No active sessions</Text>
                    ) : (
                      sessions.map(session => (
                        <Box
                          key={session.id}
                          p={3}
                          borderRadius="md"
                          bg={activeSession?.id === session.id ? 'blue.900' : 'transparent'}
                          border="1px solid"
                          borderColor={activeSession?.id === session.id ? 'blue.400' : 'gray.600'}
                          cursor="pointer"
                          onClick={() => setActiveSession(session)}
                        >
                          <HStack justify="space-between" mb={1}>
                            <Text fontWeight="bold" fontSize="sm" color={textPrimary}>{session.task}</Text>
                            <Badge size="sm" colorScheme={session.status === 'active' ? 'green' : 'orange'}>{session.status}</Badge>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="xs" color={textSecondary}>{session.agent} • {new Date(session.lastActivity).toLocaleTimeString()}</Text>
                            <Tag size="sm" colorScheme={session.confidence >= confidenceThreshold ? 'green' : 'orange'}>
                              {session.confidence}%
                            </Tag>
                          </HStack>
                          {session.confidence < confidenceThreshold && (
                            <Progress value={session.confidence} size="xs" colorScheme="orange" mt={2} borderRadius="full" />
                          )}
                        </Box>
                      ))
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* Pending Approvals */}
              {pendingApprovals.length > 0 && (
                <Card bg={bgCard}>
                  <CardHeader pb={2}>
                    <Heading size="sm">Pending Approvals ({pendingApprovals.length})</Heading>
                  </CardHeader>
                  <CardBody pt={0}>
                    <VStack align="stretch" spacing={3} maxH="300px" overflowY="auto">
                      {pendingApprovals.map(request => (
                        <ApprovalCard key={request.id} request={request} onApprove={handleApprove} onDeny={handleDeny} />
                      ))}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </VStack>

            {/* Center Panel - Browser Preview */}
            <Box gridColumn={{ xl: 'span 2' }}>
              <Card bg={bgCard} h="100%">
                <CardHeader pb={2}>
                  <HStack justify="space-between">
                    <HStack>
                      <FiMonitor />
                      <Heading size="sm">Preview: {activeSession?.task || 'No Active Session'}</Heading>
                    </HStack>
                    {activeSession && (
                      <HStack spacing={2}>
                        <Tag colorScheme="blue">{activeSession.agent}</Tag>
                        <Tooltip label="Open in new tab">
                          <IconButton
                            aria-label="Open in new tab"
                            icon={<FiExternalLink />}
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(activeSession.novncUrl || `${novncBaseUrl}/vnc.html?autoconnect=true`, '_blank')}
                          />
                        </Tooltip>
                        <Button size="sm" leftIcon={<FiEye />} onClick={() => requestOversight(activeSession.id)}>
                          Request Oversight
                        </Button>
                      </HStack>
                    )}
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  {activeSession ? (
                    <VStack align="stretch" spacing={4}>
                      <Box p={2} bg="gray.800" borderRadius="md" fontSize="sm" fontFamily="mono" color={textSecondary}>
                        {activeSession.url}
                      </Box>
                      <NoVNCViewer 
                        url={activeSession.novncUrl || `${novncBaseUrl}/vnc.html?autoconnect=true&resize=scale`}
                        isActive={activeSession.status === 'active'}
                      />
                      <SimpleGrid columns={4} spacing={4}>
                        <Stat size="sm">
                          <StatLabel fontSize="xs">Confidence</StatLabel>
                          <StatNumber fontSize="lg">{activeSession.confidence}%</StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel fontSize="xs">Duration</StatLabel>
                          <StatNumber fontSize="lg">
                            {Math.floor((Date.now() - new Date(activeSession.startTime).getTime()) / 60000)}m
                          </StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel fontSize="xs">Status</StatLabel>
                          <StatNumber fontSize="lg" textTransform="capitalize">{activeSession.status}</StatNumber>
                        </Stat>
                        <Stat size="sm">
                          <StatLabel fontSize="xs">Needs Approval</StatLabel>
                          <StatNumber fontSize="lg">{activeSession.requiresApproval ? 'Yes' : 'No'}</StatNumber>
                        </Stat>
                      </SimpleGrid>
                    </VStack>
                  ) : (
                    <Box h="600px" display="flex" alignItems="center" justifyContent="center" border="2px dashed" borderColor="gray.600" borderRadius="lg">
                      <VStack spacing={4}>
                        <FiMonitor size={64} color="gray" />
                        <Text color={textSecondary}>No active browser session to display</Text>
                        <Text fontSize="sm" color={textSecondary} textAlign="center" maxW="400px">
                          When Nova or OpenClaw starts a browser task (like ordering from Starbucks), 
                          it will appear here for oversight.
                        </Text>
                      </VStack>
                    </Box>
                  )}
                </CardBody>
              </Card>
            </Box>
          </SimpleGrid>

          {/* Instructions */}
          <Card bg={bgCard} mt={6}>
            <CardHeader><Heading size="sm">How Browser Oversight Works</Heading></CardHeader>
            <CardBody>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                <VStack align="start" spacing={2}>
                  <HStack><Box p={2} bg="blue.500" borderRadius="md"><FiActivity color="white" /></Box><Text fontWeight="bold">1. Agent Starts Task</Text></HStack>
                  <Text fontSize="sm" color={textSecondary}>Nova or OpenClaw begins a browser task (e.g., ordering Starbucks)</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <HStack><Box p={2} bg="orange.500" borderRadius="md"><FiEye color="white" /></Box><Text fontWeight="bold">2. Preview Appears</Text></HStack>
                  <Text fontSize="sm" color={textSecondary}>Browser view streams here via noVNC for real-time monitoring</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <HStack><Box p={2} bg="yellow.500" borderRadius="md"><FiShield color="white" /></Box><Text fontWeight="bold">3. Approval Required</Text></HStack>
                  <Text fontSize="sm" color={textSecondary}>For checkout, payment, or low-confidence actions, approval is requested</Text>
                </VStack>
                <VStack align="start" spacing={2}>
                  <HStack><Box p={2} bg="green.500" borderRadius="md"><FiCheckCircle color="white" /></Box><Text fontWeight="bold">4. You Decide</Text></HStack>
                  <Text fontSize="sm" color={textSecondary}>Approve or deny via dashboard or verbally to Nova. Full audit trail kept.</Text>
                </VStack>
              </SimpleGrid>
            </CardBody>
          </Card>
        </Container>
      </Box>
    </DashboardLayout>
  );
}
