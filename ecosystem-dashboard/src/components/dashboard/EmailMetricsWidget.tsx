/**
 * Email Metrics Widget - Dashboard component for email intelligence
 * 
 * Displays key email metrics, action queue, and quick actions.
 * Uses the /dashboard/summary API for consolidated data.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Progress,
  Divider,
  Button,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  EnvelopeIcon,
  InboxArrowDownIcon,
  PaperAirplaneIcon,
  BellAlertIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

interface DashboardSummary {
  counts: {
    total: number;
    today: number;
    this_week: number;
    sent: number;
    received: number;
    needs_response: number;
  };
  alerts: {
    urgent: number;
    pending_responses: number;
  };
  metrics: {
    response_rate: number;
  };
  top_senders: Array<{ name: string; email: string; count: number }>;
}

interface ActionQueueItem {
  id: string;
  subject: string;
  from_name: string;
  priority: string;
  overdue: boolean;
}

export const EmailMetricsWidget: React.FC = () => {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [actionQueue, setActionQueue] = useState<ActionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const urgentBg = useColorModeValue('red.50', 'red.900');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, queueRes] = await Promise.all([
        fetch(`${GRAPHRAG_URL}/dashboard/summary`),
        fetch(`${GRAPHRAG_URL}/action-queue?limit=5`),
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      if (queueRes.ok) {
        const data = await queueRes.json();
        setActionQueue(data.emails || []);
      }
    } catch (e) {
      console.error('Email metrics fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text>Loading email metrics...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  if (!summary) {
    return (
      <GlassPanel p={6}>
        <Text color="gray.500">Email service unavailable</Text>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel p={6}>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Box as={EnvelopeIcon} w={6} h={6} color="blue.500" />
            <Heading size="md">Email Intelligence</Heading>
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push('/email')}
          >
            View All
          </Button>
        </HStack>

        {/* Quick Stats */}
        <SimpleGrid columns={3} spacing={4}>
          <Stat size="sm">
            <StatLabel>
              <HStack spacing={1}>
                <Box as={InboxArrowDownIcon} w={4} h={4} />
                <Text>Inbox</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{summary.counts.received.toLocaleString()}</StatNumber>
            <StatHelpText>{summary.counts.today} today</StatHelpText>
          </Stat>

          <Stat size="sm">
            <StatLabel>
              <HStack spacing={1}>
                <Box as={PaperAirplaneIcon} w={4} h={4} />
                <Text>Sent</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{summary.counts.sent.toLocaleString()}</StatNumber>
          </Stat>

          <Stat size="sm">
            <StatLabel>
              <HStack spacing={1}>
                <Box as={ArrowTrendingUpIcon} w={4} h={4} />
                <Text>Response</Text>
              </HStack>
            </StatLabel>
            <StatNumber>{summary.metrics.response_rate}%</StatNumber>
            <StatHelpText>rate</StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Alerts */}
        {(summary.alerts.urgent > 0 || summary.alerts.pending_responses > 5) && (
          <HStack
            p={3}
            bg={urgentBg}
            borderRadius="md"
            borderWidth="1px"
            borderColor="red.300"
          >
            <Box as={BellAlertIcon} w={5} h={5} color="red.500" />
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight="medium" fontSize="sm">
                {summary.alerts.urgent > 0
                  ? `${summary.alerts.urgent} urgent emails`
                  : `${summary.alerts.pending_responses} pending responses`}
              </Text>
              <Text fontSize="xs" color="gray.600">
                Needs attention
              </Text>
            </VStack>
            <Button
              size="xs"
              colorScheme="red"
              variant="outline"
              onClick={() => router.push('/email')}
            >
              Review
            </Button>
          </HStack>
        )}

        <Divider />

        {/* Action Queue */}
        <VStack align="stretch" spacing={2}>
          <HStack>
            <Box as={ClockIcon} w={4} h={4} />
            <Text fontWeight="medium" fontSize="sm">
              Action Queue
            </Text>
            <Badge colorScheme="orange">{actionQueue.length}</Badge>
          </HStack>

          {actionQueue.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No pending actions
            </Text>
          ) : (
            actionQueue.slice(0, 3).map((item) => (
              <HStack
                key={item.id}
                p={2}
                bg={cardBg}
                borderRadius="md"
                borderWidth="1px"
                borderColor={item.overdue ? 'orange.300' : borderColor}
                cursor="pointer"
                _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                onClick={() =>
                  router.push(`/email?email_id=${encodeURIComponent(item.id)}`)
                }
              >
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {item.from_name}
                  </Text>
                </VStack>
                {item.overdue && (
                  <Badge colorScheme="orange" size="sm">
                    Overdue
                  </Badge>
                )}
                {item.priority === 'high' && (
                  <Badge colorScheme="red" size="sm">
                    High
                  </Badge>
                )}
              </HStack>
            ))
          )}
        </VStack>

        {/* Quick Actions */}
        <HStack spacing={2}>
          <Button
            size="sm"
            flex={1}
            variant="outline"
            onClick={() => router.push('/email')}
          >
            Open Client
          </Button>
          <Button
            size="sm"
            flex={1}
            colorScheme="blue"
            onClick={() => router.push('/email')}
          >
            Intelligence Hub
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
};

export default EmailMetricsWidget;
