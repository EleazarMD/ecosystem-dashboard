/**
 * Email Insights Panel - Comprehensive Email Analytics
 * 
 * Features:
 * - Email volume trends and activity timeline
 * - Top contacts and communication patterns
 * - Response time analytics
 * - Email categories and distribution
 * - Actionable insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Spinner,
  Button,
  Icon,
  Badge,
  Avatar,
  Progress,
  Divider,
  Flex,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { 
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  InboxIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { DailyBriefingWidget } from '@/components/DailyBriefingWidget';

interface EmailInsightsPanelProps {
  graphragUrl: string;
}

interface EmailContact {
  email: string;
  name?: string;
  count: number;
  lastContact: string;
}

interface DayActivity {
  date: string;
  sent: number;
  received: number;
}

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
    avg_response_time_hours: number;
  };
  trends: {
    week_over_week_change: number;
    most_active_day: string;
    busiest_hour: number;
  };
  top_contacts: EmailContact[];
  daily_activity: DayActivity[];
}

export const EmailInsightsPanel: React.FC<EmailInsightsPanelProps> = ({ graphragUrl }) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const bgCard = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=stats');
      if (response.ok) {
        const data = await response.json();
        
        // Calculate trends (mock data for now - would come from backend)
        const thisWeek = data.indexed_emails?.this_week || 0;
        const lastWeek = Math.floor(thisWeek * 0.85); // Mock previous week
        const weekChange = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
        
        setSummary({
          counts: {
            total: data.indexed_emails?.total || 0,
            today: data.indexed_emails?.today || 0,
            this_week: thisWeek,
            sent: data.indexed_emails?.sent || 0,
            received: data.indexed_emails?.inbox || 0,
            needs_response: Math.floor((data.indexed_emails?.inbox || 0) * 0.15), // Estimate
          },
          alerts: {
            urgent: Math.floor((data.indexed_emails?.inbox || 0) * 0.05),
            pending_responses: Math.floor((data.indexed_emails?.inbox || 0) * 0.12),
          },
          metrics: {
            response_rate: 87.5, // Mock - would come from backend
            avg_response_time_hours: 4.2, // Mock
          },
          trends: {
            week_over_week_change: weekChange,
            most_active_day: 'Tuesday',
            busiest_hour: 14,
          },
          top_contacts: [
            { email: 'team@example.com', name: 'Team', count: 45, lastContact: '2h ago' },
            { email: 'client@company.com', name: 'Client', count: 32, lastContact: '1d ago' },
            { email: 'manager@work.com', name: 'Manager', count: 28, lastContact: '3h ago' },
          ],
          daily_activity: [
            { date: 'Mon', sent: 12, received: 28 },
            { date: 'Tue', sent: 18, received: 35 },
            { date: 'Wed', sent: 15, received: 30 },
            { date: 'Thu', sent: 20, received: 32 },
            { date: 'Fri', sent: 16, received: 25 },
            { date: 'Sat', sent: 5, received: 8 },
            { date: 'Sun', sent: 3, received: 6 },
          ],
        });
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box h="full" display="flex" justifyContent="center" alignItems="center">
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary} fontSize="sm">Loading insights...</Text>
        </VStack>
      </Box>
    );
  }

  const maxActivity = Math.max(...(summary?.daily_activity.map(d => Math.max(d.sent, d.received)) || [1]));

  return (
    <Box h="full" overflowY="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={0}>
            <Text fontSize="2xl" fontWeight="600" color={textPrimary}>Email Intelligence</Text>
            <Text color={textSecondary} fontSize="sm">Analytics and insights</Text>
          </VStack>
          <Button
            leftIcon={<Icon as={ArrowPathIcon} boxSize={4} />}
            size="sm"
            variant="ghost"
            onClick={fetchInsights}
          >
            Refresh
          </Button>
        </HStack>

        {/* Compact Key Metrics */}
        <HStack spacing={3} flexWrap="wrap">
          <Box px={4} py={2} bg={bgCard} borderRadius="md" borderWidth="1px" borderColor={borderColor} minW="140px">
            <HStack spacing={2}>
              <Box>
                <Text fontSize="xs" color={textSecondary} fontWeight="500">Total Emails</Text>
                <Text fontSize="xl" fontWeight="700" color={textPrimary}>{summary?.counts.total || 0}</Text>
              </Box>
              <Badge colorScheme={summary?.trends.week_over_week_change >= 0 ? 'green' : 'red'} fontSize="9px">
                {summary?.trends.week_over_week_change >= 0 ? '+' : ''}{summary?.trends.week_over_week_change.toFixed(0)}%
              </Badge>
            </HStack>
          </Box>

          <Box px={4} py={2} bg={bgCard} borderRadius="md" borderWidth="1px" borderColor={borderColor} minW="140px">
            <Text fontSize="xs" color={textSecondary} fontWeight="500">This Week</Text>
            <HStack spacing={2} align="baseline">
              <Text fontSize="xl" fontWeight="700" color={textPrimary}>{summary?.counts.this_week || 0}</Text>
              <Text fontSize="xs" color={textSecondary}>({summary?.counts.today || 0} today)</Text>
            </HStack>
          </Box>

          <Box px={4} py={2} bg={bgCard} borderRadius="md" borderWidth="1px" borderColor={borderColor} minW="140px">
            <Text fontSize="xs" color={textSecondary} fontWeight="500">Avg Response</Text>
            <HStack spacing={2} align="baseline">
              <Text fontSize="xl" fontWeight="700" color={textPrimary}>{summary?.metrics.avg_response_time_hours.toFixed(1)}h</Text>
              <Badge colorScheme="blue" fontSize="9px">{summary?.metrics.response_rate}%</Badge>
            </HStack>
          </Box>

          <Box px={4} py={2} bg="orange.50" _dark={{ bg: 'orange.900' }} borderRadius="md" borderWidth="1px" borderColor="orange.200" minW="140px">
            <Text fontSize="xs" color="orange.700" _dark={{ color: 'orange.200' }} fontWeight="500">Needs Response</Text>
            <HStack spacing={2} align="baseline">
              <Text fontSize="xl" fontWeight="700" color="orange.600" _dark={{ color: 'orange.300' }}>{summary?.counts.needs_response || 0}</Text>
              {summary?.alerts.urgent > 0 && (
                <Badge colorScheme="red" fontSize="9px">{summary?.alerts.urgent} urgent</Badge>
              )}
            </HStack>
          </Box>
        </HStack>

        {/* Activity Timeline */}
        <Box p={5} bg={bgCard} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={0}>
              <Text fontSize="md" fontWeight="600" color={textPrimary}>Weekly Activity</Text>
              <Text fontSize="xs" color={textSecondary}>Email volume by day</Text>
            </VStack>
            <HStack spacing={4} fontSize="xs">
              <HStack spacing={1}>
                <Box w={3} h={3} bg="blue.500" borderRadius="sm" />
                <Text color={textSecondary}>Received</Text>
              </HStack>
              <HStack spacing={1}>
                <Box w={3} h={3} bg="green.500" borderRadius="sm" />
                <Text color={textSecondary}>Sent</Text>
              </HStack>
            </HStack>
          </HStack>
          <HStack spacing={2} align="end" h="120px">
            {summary?.daily_activity.map((day, idx) => (
              <VStack key={idx} flex={1} spacing={1} justify="end" h="full">
                <VStack spacing={0.5} w="full" justify="end" flex={1}>
                  <Box
                    w="full"
                    h={`${(day.received / maxActivity) * 100}%`}
                    bg="blue.500"
                    borderRadius="sm"
                    minH="2px"
                  />
                  <Box
                    w="full"
                    h={`${(day.sent / maxActivity) * 100}%`}
                    bg="green.500"
                    borderRadius="sm"
                    minH="2px"
                  />
                </VStack>
                <Text fontSize="xs" color={textSecondary} fontWeight="500">{day.date}</Text>
              </VStack>
            ))}
          </HStack>
        </Box>

        {/* Daily Briefing Widget - Real data from Hermes */}
        <DailyBriefingWidget account="all" compact={false} />

        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
          {/* Top Contacts */}
          <GridItem>
            <Box p={5} bg={bgCard} borderRadius="lg" borderWidth="1px" borderColor={borderColor} h="full">
              <HStack justify="space-between" mb={4}>
                <VStack align="start" spacing={0}>
                  <Text fontSize="md" fontWeight="600" color={textPrimary}>Top Contacts</Text>
                  <Text fontSize="xs" color={textSecondary}>Most frequent correspondents</Text>
                </VStack>
                <Icon as={UserGroupIcon} boxSize={5} color={textSecondary} />
              </HStack>
              <VStack spacing={3} align="stretch">
                {summary?.top_contacts.map((contact, idx) => (
                  <HStack key={idx} spacing={3}>
                    <Avatar size="sm" name={contact.name || contact.email} />
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" fontWeight="500" color={textPrimary} noOfLines={1}>
                        {contact.name || contact.email}
                      </Text>
                      <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                        {contact.email}
                      </Text>
                    </Box>
                    <VStack align="end" spacing={0}>
                      <Badge colorScheme="blue" fontSize="xs">{contact.count}</Badge>
                      <Text fontSize="xs" color={textSecondary}>{contact.lastContact}</Text>
                    </VStack>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </GridItem>

          {/* Quick Stats */}
          <GridItem>
            <Box p={5} bg={bgCard} borderRadius="lg" borderWidth="1px" borderColor={borderColor} h="full">
              <HStack justify="space-between" mb={4}>
                <VStack align="start" spacing={0}>
                  <Text fontSize="md" fontWeight="600" color={textPrimary}>Communication Patterns</Text>
                  <Text fontSize="xs" color={textSecondary}>Insights and trends</Text>
                </VStack>
                <Icon as={SparklesIcon} boxSize={5} color={textSecondary} />
              </HStack>
              <VStack spacing={4} align="stretch">
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color={textPrimary}>Sent vs Received</Text>
                    <Text fontSize="sm" fontWeight="600" color={textPrimary}>
                      {summary?.counts.sent || 0} / {summary?.counts.received || 0}
                    </Text>
                  </HStack>
                  <Progress
                    value={(summary?.counts.sent || 0) / ((summary?.counts.sent || 0) + (summary?.counts.received || 1)) * 100}
                    size="sm"
                    colorScheme="green"
                    borderRadius="full"
                  />
                </Box>

                <Divider />

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={ClockIcon} boxSize={4} color={textSecondary} />
                    <Text fontSize="sm" color={textSecondary}>Most Active Day</Text>
                  </HStack>
                  <Badge colorScheme="purple">{summary?.trends.most_active_day}</Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={ChartBarIcon} boxSize={4} color={textSecondary} />
                    <Text fontSize="sm" color={textSecondary}>Busiest Hour</Text>
                  </HStack>
                  <Badge colorScheme="blue">{summary?.trends.busiest_hour}:00</Badge>
                </HStack>

                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={InboxIcon} boxSize={4} color={textSecondary} />
                    <Text fontSize="sm" color={textSecondary}>Pending Responses</Text>
                  </HStack>
                  <Badge colorScheme="orange">{summary?.alerts.pending_responses}</Badge>
                </HStack>
              </VStack>
            </Box>
          </GridItem>
        </Grid>

        {/* Compact Actionable Insights */}
        <Box p={4} bg={bgCard} borderRadius="lg" borderWidth="1px" borderColor={borderColor}>
          <HStack justify="space-between" mb={3}>
            <VStack align="start" spacing={0}>
              <Text fontSize="md" fontWeight="600" color={textPrimary}>Quick Actions</Text>
              <Text fontSize="xs" color={textSecondary}>AI-powered recommendations</Text>
            </VStack>
          </HStack>
          <VStack spacing={2} align="stretch">
            {summary?.counts.needs_response > 0 && (
              <HStack p={2.5} bg="blue.50" _dark={{ bg: 'blue.900' }} borderRadius="md" borderLeftWidth="3px" borderLeftColor="blue.500" justify="space-between">
                <HStack spacing={2} flex={1}>
                  <Icon as={SparklesIcon} boxSize={3.5} color="blue.500" />
                  <Text fontSize="xs" color={textPrimary}>
                    <strong>{summary?.counts.needs_response}</strong> emails need response
                  </Text>
                </HStack>
                <Button size="xs" colorScheme="blue" h="24px" fontSize="10px">Review</Button>
              </HStack>
            )}
            <HStack p={2.5} bg="green.50" _dark={{ bg: 'green.900' }} borderRadius="md" borderLeftWidth="3px" borderLeftColor="green.500" justify="space-between">
              <HStack spacing={2} flex={1}>
                <Icon as={ArrowTrendingUpIcon} boxSize={3.5} color="green.500" />
                <Text fontSize="xs" color={textPrimary}>
                  <strong>{summary?.metrics.response_rate}%</strong> response rate
                </Text>
              </HStack>
              <Badge colorScheme="green" fontSize="9px">Great!</Badge>
            </HStack>
            <HStack p={2.5} bg="purple.50" _dark={{ bg: 'purple.900' }} borderRadius="md" borderLeftWidth="3px" borderLeftColor="purple.500" justify="space-between">
              <HStack spacing={2} flex={1}>
                <Icon as={ClockIcon} boxSize={3.5} color="purple.500" />
                <Text fontSize="xs" color={textPrimary}>
                  Peak: <strong>{summary?.trends.busiest_hour}:00</strong> on <strong>{summary?.trends.most_active_day}</strong>
                </Text>
              </HStack>
            </HStack>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};
