/**
 * Parent/Family Home Page
 * 
 * Streamlined dashboard for parents with family overview and quick access
 * to productivity tools. Uses the standard DashboardLayout with filtered navigation.
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
  Icon,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiMessageSquare,
  FiCalendar,
  FiMail,
  FiEdit3,
  FiImage,
  FiMic,
  FiSettings,
  FiChevronRight,
  FiShield,
} from 'react-icons/fi';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ChildSummary {
  id: string;
  name: string;
  avatarEmoji?: string;
  todayUsageMinutes: number;
  dailyLimitMinutes: number;
  messageCount: number;
  blockedAttempts: number;
  pendingApprovals: number;
  status: string;
  lastActivityAt?: string;
}

interface FamilyOverview {
  children: ChildSummary[];
  totalUsageToday: number;
  totalBlockedToday: number;
  totalPendingApprovals: number;
}

const QUICK_ACTIONS = [
  { id: 'workspace', label: 'Workspace', icon: FiEdit3, path: '/workspace', color: 'blue' },
  { id: 'email', label: 'Email', icon: FiMail, path: '/email', color: 'teal' },
  { id: 'calendar', label: 'Calendar', icon: FiCalendar, path: '/calendar', color: 'green' },
  { id: 'ai-chat', label: 'AI Chat', icon: FiMessageSquare, path: '/openclaw', color: 'purple' },
  { id: 'image-studio', label: 'Image Studio', icon: FiImage, path: '/image-studio', color: 'pink' },
  { id: 'settings', label: 'Settings', icon: FiSettings, path: '/settings', color: 'gray' },
];

function ChildCard({ child, onViewDetails }: { child: ChildSummary; onViewDetails: () => void }) {
  const textSecondary = useSemanticToken('text.secondary');
  const usagePercent = Math.min(100, (child.todayUsageMinutes / child.dailyLimitMinutes) * 100);
  const remainingMinutes = Math.max(0, child.dailyLimitMinutes - child.todayUsageMinutes);

  const getUsageColor = () => {
    if (usagePercent > 80) return 'red';
    if (usagePercent > 50) return 'orange';
    return 'green';
  };

  return (
    <GlassPanel variant="light" p={4}>
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <HStack spacing={3}>
            <Box
              fontSize="2xl"
              bg="purple.100"
              borderRadius="full"
              w="45px"
              h="45px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {child.avatarEmoji || '🦊'}
            </Box>
            <VStack align="start" spacing={0}>
              <HStack>
                <Text fontWeight="bold">{child.name}</Text>
                {child.status !== 'active' && (
                  <Badge colorScheme="red" size="sm">{child.status}</Badge>
                )}
              </HStack>
              <Text fontSize="xs" color={textSecondary}>
                {child.lastActivityAt 
                  ? `Last active ${new Date(child.lastActivityAt).toLocaleTimeString()}`
                  : 'No activity today'}
              </Text>
            </VStack>
          </HStack>
          
          {child.pendingApprovals > 0 && (
            <Badge colorScheme="orange" variant="solid">
              {child.pendingApprovals} pending
            </Badge>
          )}
        </HStack>

        {/* Usage Bar */}
        <Box>
          <HStack justify="space-between" fontSize="xs" mb={1}>
            <Text color={textSecondary}>{child.todayUsageMinutes}m used</Text>
            <Text color={textSecondary}>{remainingMinutes}m left</Text>
          </HStack>
          <Progress
            value={usagePercent}
            size="sm"
            colorScheme={getUsageColor()}
            borderRadius="full"
          />
        </Box>

        {/* Quick Stats */}
        <HStack justify="space-between" fontSize="sm">
          <HStack spacing={1} color={textSecondary}>
            <Icon as={FiMessageSquare} />
            <Text>{child.messageCount} msgs</Text>
          </HStack>
          {child.blockedAttempts > 0 && (
            <HStack spacing={1} color="red.500">
              <Icon as={FiAlertTriangle} />
              <Text>{child.blockedAttempts} blocked</Text>
            </HStack>
          )}
          {child.blockedAttempts === 0 && (
            <HStack spacing={1} color="green.500">
              <Icon as={FiCheckCircle} />
              <Text>All good</Text>
            </HStack>
          )}
        </HStack>

        <Button
          size="sm"
          variant="ghost"
          rightIcon={<FiChevronRight />}
          onClick={onViewDetails}
          justifyContent="space-between"
        >
          View Details
        </Button>
      </VStack>
    </GlassPanel>
  );
}

function QuickActionCard({ action, onClick }: { action: typeof QUICK_ACTIONS[0]; onClick: () => void }) {
  return (
    <Box
      as="button"
      onClick={onClick}
      bg="white"
      borderRadius="xl"
      p={4}
      textAlign="center"
      boxShadow="md"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-4px)', boxShadow: 'lg' }}
    >
      <Icon as={action.icon} boxSize={8} color={`${action.color}.500`} mb={2} />
      <Text fontWeight="medium" fontSize="sm">{action.label}</Text>
    </Box>
  );
}

export default function FamilyHomePage() {
  const router = useRouter();
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FamilyOverview | null>(null);

  useEffect(() => {
    fetchFamilyOverview();
  }, []);

  const fetchFamilyOverview = async () => {
    try {
      const res = await fetch('/api/family/overview');
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
      }
    } catch (error) {
      console.error('Failed to fetch family overview:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">Family Dashboard</Heading>
              <Text color={textSecondary}>
                Overview of your family's activity
              </Text>
            </Box>
            <Button
              as={NextLink}
              href="/family"
              leftIcon={<FiUsers />}
              colorScheme="blue"
              variant="outline"
            >
              Manage Family
            </Button>
          </HStack>

          {loading ? (
            <Box textAlign="center" py={12}>
              <Spinner size="xl" />
            </Box>
          ) : (
            <>
              {/* Summary Stats */}
              {overview && overview.children.length > 0 && (
                <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                  <GlassPanel variant="light" p={4}>
                    <Stat size="sm">
                      <StatLabel>Children</StatLabel>
                      <StatNumber>{overview.children.length}</StatNumber>
                      <StatHelpText>accounts</StatHelpText>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel variant="light" p={4}>
                    <Stat size="sm">
                      <StatLabel>Total Usage</StatLabel>
                      <StatNumber>{overview.totalUsageToday}m</StatNumber>
                      <StatHelpText>today</StatHelpText>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel variant="light" p={4}>
                    <Stat size="sm">
                      <StatLabel>Blocked</StatLabel>
                      <StatNumber color={overview.totalBlockedToday > 0 ? 'red.500' : undefined}>
                        {overview.totalBlockedToday}
                      </StatNumber>
                      <StatHelpText>attempts</StatHelpText>
                    </Stat>
                  </GlassPanel>
                  <GlassPanel variant="light" p={4}>
                    <Stat size="sm">
                      <StatLabel>Pending</StatLabel>
                      <StatNumber color={overview.totalPendingApprovals > 0 ? 'orange.500' : undefined}>
                        {overview.totalPendingApprovals}
                      </StatNumber>
                      <StatHelpText>approvals</StatHelpText>
                    </Stat>
                  </GlassPanel>
                </SimpleGrid>
              )}

              {/* Pending Approvals Alert */}
              {overview && overview.totalPendingApprovals > 0 && (
                <Alert status="warning" borderRadius="lg">
                  <AlertIcon />
                  <HStack justify="space-between" flex={1}>
                    <Text>
                      You have {overview.totalPendingApprovals} pending approval request{overview.totalPendingApprovals > 1 ? 's' : ''}
                    </Text>
                    <Button
                      as={NextLink}
                      href="/family"
                      size="sm"
                      colorScheme="orange"
                    >
                      Review
                    </Button>
                  </HStack>
                </Alert>
              )}

              {/* Children Cards */}
              {overview && overview.children.length > 0 && (
                <Box>
                  <HStack justify="space-between" mb={4}>
                    <Heading size="md">Children</Heading>
                    <Button
                      as={NextLink}
                      href="/family"
                      size="sm"
                      variant="ghost"
                      rightIcon={<FiChevronRight />}
                    >
                      View All
                    </Button>
                  </HStack>
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                    {overview.children.slice(0, 3).map((child) => (
                      <ChildCard
                        key={child.id}
                        child={child}
                        onViewDetails={() => router.push(`/family/${child.id}`)}
                      />
                    ))}
                  </SimpleGrid>
                </Box>
              )}

              {/* No Children */}
              {overview && overview.children.length === 0 && (
                <GlassPanel variant="light" p={8}>
                  <VStack spacing={4}>
                    <Icon as={FiUsers} boxSize={12} color="gray.400" />
                    <Heading size="md">No Child Accounts</Heading>
                    <Text color={textSecondary} textAlign="center">
                      Add child accounts to monitor their activity and set parental controls
                    </Text>
                    <Button
                      as={NextLink}
                      href="/family"
                      colorScheme="blue"
                      leftIcon={<FiUsers />}
                    >
                      Add Child Account
                    </Button>
                  </VStack>
                </GlassPanel>
              )}

              <Divider />

              {/* Quick Actions */}
              <Box>
                <Heading size="md" mb={4}>Quick Actions</Heading>
                <SimpleGrid columns={{ base: 3, md: 6 }} spacing={4}>
                  {QUICK_ACTIONS.map((action) => (
                    <QuickActionCard
                      key={action.id}
                      action={action}
                      onClick={() => router.push(action.path)}
                    />
                  ))}
                </SimpleGrid>
              </Box>
            </>
          )}
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return { props: {} };
};
