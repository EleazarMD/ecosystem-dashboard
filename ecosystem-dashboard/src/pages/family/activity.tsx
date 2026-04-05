/**
 * Family Activity Dashboard
 * 
 * Aggregate view of all children's activity for parents
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Icon,
  Badge,
  Avatar,
  Spinner,
  useToast,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  Divider,
  Progress,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiClock,
  FiMessageSquare,
  FiAlertTriangle,
  FiImage,
  FiArrowLeft,
  FiRefreshCw,
  FiUser,
  FiCheckCircle,
} from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChildStats {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  dateOfBirth: string;
  stats: {
    totalUsageMinutes: number;
    totalConversations: number;
    totalBlockedAttempts: number;
    totalImagesGenerated: number;
    lastActivity: string | null;
    todayUsageMinutes: number;
    todayBlockedAttempts: number;
    pendingApprovals: number;
  };
}

interface DailyUsage {
  date: string;
  usageMinutes: number;
  conversations: number;
  blockedAttempts: number;
  imagesGenerated: number;
}

interface RecentActivity {
  id: string;
  childId: string;
  childName: string;
  type: string;
  metadata: any;
  timestamp: string;
}

interface ActivityData {
  children: ChildStats[];
  summary: {
    totalUsageMinutes: number;
    totalConversations: number;
    totalBlockedAttempts: number;
    totalImagesGenerated: number;
    totalPendingApprovals: number;
  };
  dailyUsage: DailyUsage[];
  recentActivity: RecentActivity[];
  period: string;
}

export default function FamilyActivityPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/family/activity?period=${period}`);
      const result = await res.json();
      
      if (res.ok) {
        setData(result);
      } else {
        toast({ title: result.error, status: 'error' });
      }
    } catch (error) {
      toast({ title: 'Failed to load activity', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [period]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation': return FiMessageSquare;
      case 'blocked_content': return FiAlertTriangle;
      case 'image_generated': return FiImage;
      case 'session_duration': return FiClock;
      default: return FiActivity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'conversation': return 'blue';
      case 'blocked_content': return 'red';
      case 'image_generated': return 'purple';
      case 'session_duration': return 'green';
      default: return 'gray';
    }
  };

  const formatActivityText = (activity: RecentActivity) => {
    switch (activity.type) {
      case 'conversation':
        return `Started a conversation`;
      case 'blocked_content':
        return `Blocked content attempt: ${activity.metadata?.reason || 'Policy violation'}`;
      case 'image_generated':
        return `Generated an image`;
      case 'session_duration':
        return `Active session: ${activity.metadata?.duration_minutes || 0} minutes`;
      case 'account_created':
        return `Account created`;
      default:
        return activity.type.replace(/_/g, ' ');
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <VStack spacing={4} py={20}>
            <Spinner size="xl" />
            <Text color={textSecondary}>Loading activity data...</Text>
          </VStack>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <HStack spacing={4}>
              <Button
                as={NextLink}
                href="/family"
                variant="ghost"
                leftIcon={<FiArrowLeft />}
                size="sm"
              >
                Back
              </Button>
              <VStack align="start" spacing={0}>
                <Heading size="lg">Family Activity</Heading>
                <Text color={textSecondary}>Monitor your children's usage and activity</Text>
              </VStack>
            </HStack>
            <HStack spacing={3}>
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                size="sm"
                w="auto"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </Select>
              <Button
                leftIcon={<FiRefreshCw />}
                variant="outline"
                size="sm"
                onClick={fetchActivity}
                isLoading={loading}
              >
                Refresh
              </Button>
            </HStack>
          </HStack>

          {/* Summary Stats */}
          {data && (
            <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Total Usage</StatLabel>
                  <StatNumber>{formatDuration(data.summary.totalUsageMinutes)}</StatNumber>
                  <StatHelpText>combined</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Conversations</StatLabel>
                  <StatNumber>{data.summary.totalConversations}</StatNumber>
                  <StatHelpText>total</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Images Generated</StatLabel>
                  <StatNumber>{data.summary.totalImagesGenerated}</StatNumber>
                  <StatHelpText>total</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Blocked Attempts</StatLabel>
                  <StatNumber color={data.summary.totalBlockedAttempts > 0 ? 'red.500' : undefined}>
                    {data.summary.totalBlockedAttempts}
                  </StatNumber>
                  <StatHelpText>{data.summary.totalBlockedAttempts > 0 ? 'review needed' : 'all clear'}</StatHelpText>
                </Stat>
              </GlassPanel>
              <GlassPanel variant="light" p={4}>
                <Stat>
                  <StatLabel>Pending Approvals</StatLabel>
                  <StatNumber color={data.summary.totalPendingApprovals > 0 ? 'orange.500' : undefined}>
                    {data.summary.totalPendingApprovals}
                  </StatNumber>
                  <StatHelpText>{data.summary.totalPendingApprovals > 0 ? 'needs attention' : 'none'}</StatHelpText>
                </Stat>
              </GlassPanel>
            </SimpleGrid>
          )}

          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
            {/* Per-Child Stats */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FiUser} color="purple.500" />
                    <Heading size="sm">Children</Heading>
                  </HStack>
                  <Badge>{data?.children.length || 0}</Badge>
                </HStack>

                {data?.children.length === 0 ? (
                  <Box p={8} textAlign="center">
                    <Icon as={FiUser} boxSize={8} color="gray.300" mb={2} />
                    <Text color={textSecondary}>No children found</Text>
                  </Box>
                ) : (
                  <VStack align="stretch" spacing={3}>
                    {data?.children.map((child) => (
                      <Box
                        key={child.id}
                        p={4}
                        borderRadius="md"
                        border="1px"
                        borderColor="gray.200"
                        bg="white"
                        _dark={{ bg: 'gray.800', borderColor: 'gray.600' }}
                      >
                        <HStack justify="space-between" mb={3}>
                          <HStack spacing={3}>
                            <Avatar size="sm" name={child.name} src={child.avatarUrl} />
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="medium">{child.name}</Text>
                              <Text fontSize="xs" color={textSecondary}>
                                {child.stats.lastActivity 
                                  ? `Last active ${new Date(child.stats.lastActivity).toLocaleDateString()}`
                                  : 'No recent activity'}
                              </Text>
                            </VStack>
                          </HStack>
                          {child.stats.pendingApprovals > 0 && (
                            <Badge colorScheme="orange">{child.stats.pendingApprovals} pending</Badge>
                          )}
                        </HStack>

                        <SimpleGrid columns={4} spacing={2} fontSize="sm">
                          <VStack spacing={0}>
                            <Text fontWeight="bold">{formatDuration(child.stats.todayUsageMinutes)}</Text>
                            <Text fontSize="xs" color={textSecondary}>Today</Text>
                          </VStack>
                          <VStack spacing={0}>
                            <Text fontWeight="bold">{child.stats.totalConversations}</Text>
                            <Text fontSize="xs" color={textSecondary}>Chats</Text>
                          </VStack>
                          <VStack spacing={0}>
                            <Text fontWeight="bold">{child.stats.totalImagesGenerated}</Text>
                            <Text fontSize="xs" color={textSecondary}>Images</Text>
                          </VStack>
                          <VStack spacing={0}>
                            <Text fontWeight="bold" color={child.stats.totalBlockedAttempts > 0 ? 'red.500' : undefined}>
                              {child.stats.totalBlockedAttempts}
                            </Text>
                            <Text fontSize="xs" color={textSecondary}>Blocked</Text>
                          </VStack>
                        </SimpleGrid>

                        <HStack mt={3} spacing={2}>
                          <Button
                            as={NextLink}
                            href={`/family/${child.id}/controls`}
                            size="xs"
                            variant="outline"
                          >
                            Controls
                          </Button>
                          <Button
                            as={NextLink}
                            href={`/family/${child.id}/activity`}
                            size="xs"
                            variant="outline"
                          >
                            Details
                          </Button>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </VStack>
            </GlassPanel>

            {/* Recent Activity Feed */}
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <HStack spacing={2}>
                    <Icon as={FiActivity} color="blue.500" />
                    <Heading size="sm">Recent Activity</Heading>
                  </HStack>
                </HStack>

                {data?.recentActivity.length === 0 ? (
                  <Box p={8} textAlign="center">
                    <Icon as={FiCheckCircle} boxSize={8} color="green.300" mb={2} />
                    <Text color={textSecondary}>No recent activity</Text>
                  </Box>
                ) : (
                  <VStack align="stretch" spacing={2} maxH="500px" overflowY="auto">
                    {data?.recentActivity.slice(0, 20).map((activity) => (
                      <HStack
                        key={activity.id}
                        p={3}
                        borderRadius="md"
                        bg={`${getActivityColor(activity.type)}.50`}
                        _dark={{ bg: `${getActivityColor(activity.type)}.900` }}
                        spacing={3}
                      >
                        <Icon
                          as={getActivityIcon(activity.type)}
                          color={`${getActivityColor(activity.type)}.500`}
                        />
                        <VStack align="start" spacing={0} flex={1}>
                          <HStack spacing={2}>
                            <Text fontWeight="medium" fontSize="sm">{activity.childName}</Text>
                            <Text fontSize="xs" color={textSecondary}>
                              {new Date(activity.timestamp).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color={textSecondary}>
                            {formatActivityText(activity)}
                          </Text>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>
            </GlassPanel>
          </SimpleGrid>

          {/* Daily Usage Chart (simplified) */}
          {data && data.dailyUsage.length > 0 && (
            <GlassPanel variant="light" p={5}>
              <VStack align="stretch" spacing={4}>
                <HStack spacing={2}>
                  <Icon as={FiClock} color="green.500" />
                  <Heading size="sm">Daily Usage</Heading>
                </HStack>

                <VStack align="stretch" spacing={2}>
                  {data.dailyUsage.slice(-7).map((day) => (
                    <HStack key={day.date} spacing={4}>
                      <Text fontSize="sm" w="80px" color={textSecondary}>
                        {new Date(day.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Box flex={1}>
                        <Progress
                          value={Math.min(day.usageMinutes, 180)}
                          max={180}
                          colorScheme="purple"
                          borderRadius="full"
                          size="sm"
                        />
                      </Box>
                      <Text fontSize="sm" fontWeight="medium" w="50px" textAlign="right">
                        {formatDuration(day.usageMinutes)}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </GlassPanel>
          )}
        </VStack>
      </Container>
    </DashboardLayout>
  );
}
