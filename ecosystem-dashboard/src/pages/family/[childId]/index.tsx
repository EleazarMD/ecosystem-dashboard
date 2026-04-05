/**
 * Child Account Detail Page
 * 
 * View detailed information about a child account
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Avatar,
  Badge,
  Button,
  IconButton,
  useToast,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  Divider,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiSettings,
  FiActivity,
  FiClock,
  FiShield,
  FiCheckCircle,
  FiAlertTriangle,
  FiLock,
  FiUnlock,
  FiCalendar,
  FiTrendingUp,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withParent } from '@/lib/auth/withParent';

interface ChildDetails {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  dateOfBirth: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  parentId: string;
  parentName: string;
  parentEmail: string;
}

interface ParentalControls {
  contentFilterLevel: string;
  dailyUsageLimitMinutes: number;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  allowedDays: string[];
  allowedServices: string[];
  blockedServices: string[];
  requireApprovalForImageGeneration: boolean;
  requireApprovalForExternalLinks: boolean;
  logAllConversations: boolean;
  isActive: boolean;
}

interface DailyUsage {
  totalMinutes: number;
  conversationCount: number;
  messageCount: number;
  blockedAttempts: number;
  serviceUsage: Record<string, number>;
  firstActivityAt?: string;
  lastActivityAt?: string;
}

interface RecentActivity {
  id: string;
  activityType: string;
  serviceId?: string;
  wasFiltered: boolean;
  filterReason?: string;
  createdAt: string;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function ChildDetailPage() {
  const router = useRouter();
  const { childId } = router.query;
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<ChildDetails | null>(null);
  const [controls, setControls] = useState<ParentalControls | null>(null);
  const [todayUsage, setTodayUsage] = useState<DailyUsage | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const fetchChildDetails = async () => {
    if (!childId) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/family/children/${childId}`);
      const data = await res.json();
      
      if (res.ok) {
        setChild(data.child);
        setControls(data.controls);
        setTodayUsage(data.todayUsage);
        setPendingApprovals(data.pendingApprovals);
      } else {
        toast({ title: data.error, status: 'error' });
      }

      // Fetch recent activity
      const activityRes = await fetch(`/api/family/children/${childId}/activity?limit=10`);
      const activityData = await activityRes.json();
      if (activityRes.ok) {
        setRecentActivity(activityData.activities);
      }
    } catch (error) {
      toast({ title: 'Failed to fetch child details', status: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildDetails();
  }, [childId]);

  if (loading) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <Box textAlign="center" py={12}>
            <Spinner size="xl" />
            <Text mt={4} color={textSecondary}>Loading child details...</Text>
          </Box>
        </Container>
      </DashboardLayout>
    );
  }

  if (!child) {
    return (
      <DashboardLayout>
        <Container maxW="container.xl" py={6}>
          <Alert status="error">
            <AlertIcon />
            Child account not found
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  const age = calculateAge(child.dateOfBirth);
  const usagePercent = controls ? Math.min(100, ((todayUsage?.totalMinutes || 0) / controls.dailyUsageLimitMinutes) * 100) : 0;
  const remainingMinutes = controls ? Math.max(0, controls.dailyUsageLimitMinutes - (todayUsage?.totalMinutes || 0)) : 0;

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbItem>
              <BreadcrumbLink as={NextLink} href="/family">Family</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink>{child.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <HStack spacing={4}>
              <IconButton
                as={NextLink}
                href="/family"
                icon={<FiArrowLeft />}
                aria-label="Back"
                variant="ghost"
              />
              <Avatar size="lg" name={child.name} src={child.avatarUrl} />
              <VStack align="start" spacing={0}>
                <HStack>
                  <Heading size="lg">{child.name}</Heading>
                  <Badge colorScheme={child.status === 'active' ? 'green' : 'red'} fontSize="sm">
                    {child.status}
                  </Badge>
                </HStack>
                <Text color={textSecondary}>
                  {age} years old • {child.email}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={3}>
              <Button
                leftIcon={<FiRefreshCw />}
                onClick={fetchChildDetails}
                variant="outline"
              >
                Refresh
              </Button>
              <Button
                as={NextLink}
                href={`/family/${childId}/learning`}
                leftIcon={<FiTrendingUp />}
                colorScheme="purple"
              >
                Learning Insights
              </Button>
              <Button
                as={NextLink}
                href={`/family/${childId}/controls`}
                leftIcon={<FiSettings />}
                colorScheme="blue"
              >
                Edit Controls
              </Button>
            </HStack>
          </HStack>

          {/* Stats Overview */}
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Today's Usage</StatLabel>
                <StatNumber>{todayUsage?.totalMinutes || 0}m</StatNumber>
                <StatHelpText>
                  of {controls?.dailyUsageLimitMinutes || 120}m limit
                </StatHelpText>
              </Stat>
              <Progress
                value={usagePercent}
                size="sm"
                colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
                borderRadius="full"
                mt={2}
              />
            </GlassPanel>

            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Messages Today</StatLabel>
                <StatNumber>{todayUsage?.messageCount || 0}</StatNumber>
                <StatHelpText>
                  {todayUsage?.conversationCount || 0} conversations
                </StatHelpText>
              </Stat>
            </GlassPanel>

            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Blocked Attempts</StatLabel>
                <StatNumber color={(todayUsage?.blockedAttempts || 0) > 0 ? 'red.500' : undefined}>
                  {todayUsage?.blockedAttempts || 0}
                </StatNumber>
                <StatHelpText>today</StatHelpText>
              </Stat>
            </GlassPanel>

            <GlassPanel variant="light" p={4}>
              <Stat>
                <StatLabel>Pending Approvals</StatLabel>
                <StatNumber color={pendingApprovals > 0 ? 'orange.500' : undefined}>
                  {pendingApprovals}
                </StatNumber>
                <StatHelpText>
                  {pendingApprovals > 0 ? (
                    <Button
                      as={NextLink}
                      href={`/family/${childId}/approvals`}
                      size="xs"
                      colorScheme="orange"
                      variant="link"
                    >
                      Review now
                    </Button>
                  ) : 'all clear'}
                </StatHelpText>
              </Stat>
            </GlassPanel>
          </SimpleGrid>

          {/* Main Content Tabs */}
          <Tabs colorScheme="blue">
            <TabList>
              <Tab><HStack><FiShield /><Text>Controls</Text></HStack></Tab>
              <Tab><HStack><FiActivity /><Text>Activity</Text></HStack></Tab>
              <Tab><HStack><FiCalendar /><Text>Schedule</Text></HStack></Tab>
            </TabList>

            <TabPanels>
              {/* Controls Summary Tab */}
              <TabPanel px={0}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <HStack>
                        <Icon as={FiShield} color="blue.500" />
                        <Heading size="sm">Content Filtering</Heading>
                      </HStack>
                      <Divider />
                      <HStack justify="space-between">
                        <Text>Filter Level</Text>
                        <Badge colorScheme={
                          controls?.contentFilterLevel === 'strict' ? 'red' :
                          controls?.contentFilterLevel === 'moderate' ? 'yellow' : 'green'
                        }>
                          {controls?.contentFilterLevel || 'strict'}
                        </Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Log Conversations</Text>
                        <Icon
                          as={controls?.logAllConversations ? FiCheckCircle : FiAlertTriangle}
                          color={controls?.logAllConversations ? 'green.500' : 'gray.400'}
                        />
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Controls Active</Text>
                        <Icon
                          as={controls?.isActive ? FiLock : FiUnlock}
                          color={controls?.isActive ? 'green.500' : 'red.500'}
                        />
                      </HStack>
                    </VStack>
                  </GlassPanel>

                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <HStack>
                        <Icon as={FiClock} color="purple.500" />
                        <Heading size="sm">Time Limits</Heading>
                      </HStack>
                      <Divider />
                      <HStack justify="space-between">
                        <Text>Daily Limit</Text>
                        <Text fontWeight="medium">{controls?.dailyUsageLimitMinutes || 120} minutes</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Allowed Hours</Text>
                        <Text fontWeight="medium">
                          {controls ? `${formatTime(controls.allowedHoursStart)} - ${formatTime(controls.allowedHoursEnd)}` : '8:00 AM - 9:00 PM'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Remaining Today</Text>
                        <Text fontWeight="medium" color={remainingMinutes < 30 ? 'orange.500' : undefined}>
                          {remainingMinutes} minutes
                        </Text>
                      </HStack>
                    </VStack>
                  </GlassPanel>

                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <HStack>
                        <Icon as={FiCheckCircle} color="green.500" />
                        <Heading size="sm">Allowed Services</Heading>
                      </HStack>
                      <Divider />
                      <HStack wrap="wrap" gap={2}>
                        {(controls?.allowedServices || []).map((service) => (
                          <Badge key={service} colorScheme="green" variant="subtle">
                            {service}
                          </Badge>
                        ))}
                        {(!controls?.allowedServices || controls.allowedServices.length === 0) && (
                          <Text color={textSecondary} fontSize="sm">No services configured</Text>
                        )}
                      </HStack>
                    </VStack>
                  </GlassPanel>

                  <GlassPanel variant="light" p={5}>
                    <VStack align="stretch" spacing={4}>
                      <HStack>
                        <Icon as={FiAlertTriangle} color="red.500" />
                        <Heading size="sm">Blocked Services</Heading>
                      </HStack>
                      <Divider />
                      <HStack wrap="wrap" gap={2}>
                        {(controls?.blockedServices || []).map((service) => (
                          <Badge key={service} colorScheme="red" variant="subtle">
                            {service}
                          </Badge>
                        ))}
                        {(!controls?.blockedServices || controls.blockedServices.length === 0) && (
                          <Text color={textSecondary} fontSize="sm">No services blocked</Text>
                        )}
                      </HStack>
                    </VStack>
                  </GlassPanel>
                </SimpleGrid>
              </TabPanel>

              {/* Activity Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={0} overflow="hidden">
                  {recentActivity.length === 0 ? (
                    <Box p={8} textAlign="center">
                      <Icon as={FiActivity} boxSize={8} color="gray.400" mb={4} />
                      <Text color={textSecondary}>No recent activity</Text>
                    </Box>
                  ) : (
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Time</Th>
                          <Th>Activity</Th>
                          <Th>Service</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {recentActivity.map((activity) => (
                          <Tr key={activity.id}>
                            <Td>
                              <Text fontSize="sm">
                                {new Date(activity.createdAt).toLocaleString()}
                              </Text>
                            </Td>
                            <Td>
                              <Badge variant="subtle">
                                {activity.activityType.replace('_', ' ')}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm">{activity.serviceId || '-'}</Text>
                            </Td>
                            <Td>
                              {activity.wasFiltered ? (
                                <Badge colorScheme="red">Blocked</Badge>
                              ) : (
                                <Badge colorScheme="green">OK</Badge>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </GlassPanel>
                <Button
                  as={NextLink}
                  href={`/family/${childId}/activity`}
                  mt={4}
                  variant="outline"
                  leftIcon={<FiActivity />}
                >
                  View Full Activity Log
                </Button>
              </TabPanel>

              {/* Schedule Tab */}
              <TabPanel px={0}>
                <GlassPanel variant="light" p={5}>
                  <VStack align="stretch" spacing={4}>
                    <Heading size="sm">Weekly Schedule</Heading>
                    <Divider />
                    <SimpleGrid columns={7} spacing={2}>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                        const isAllowed = controls?.allowedDays?.includes(dayNames[idx]);
                        return (
                          <Box
                            key={day}
                            p={3}
                            textAlign="center"
                            borderRadius="md"
                            bg={isAllowed ? 'green.100' : 'gray.100'}
                            color={isAllowed ? 'green.700' : 'gray.500'}
                          >
                            <Text fontWeight="medium">{day}</Text>
                            <Icon
                              as={isAllowed ? FiCheckCircle : FiAlertTriangle}
                              mt={1}
                            />
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                    <HStack justify="center" pt={4}>
                      <Icon as={FiClock} />
                      <Text>
                        Active hours: {controls ? `${formatTime(controls.allowedHoursStart)} - ${formatTime(controls.allowedHoursEnd)}` : '8:00 AM - 9:00 PM'}
                      </Text>
                    </HStack>
                  </VStack>
                </GlassPanel>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Account Info */}
          <GlassPanel variant="light" p={5}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <VStack align="start">
                <Text fontSize="sm" color={textSecondary}>Account Created</Text>
                <Text fontWeight="medium">{new Date(child.createdAt).toLocaleDateString()}</Text>
              </VStack>
              <VStack align="start">
                <Text fontSize="sm" color={textSecondary}>Last Login</Text>
                <Text fontWeight="medium">
                  {child.lastLoginAt ? new Date(child.lastLoginAt).toLocaleString() : 'Never'}
                </Text>
              </VStack>
              <VStack align="start">
                <Text fontSize="sm" color={textSecondary}>Date of Birth</Text>
                <Text fontWeight="medium">{new Date(child.dateOfBirth).toLocaleDateString()}</Text>
              </VStack>
            </SimpleGrid>
          </GlassPanel>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export default withParent(ChildDetailPage);
