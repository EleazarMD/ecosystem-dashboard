/**
 * Admin Dashboard Panel
 * Right panel content for admin dashboard quick stats and activity
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Icon,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Button,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiGrid,
  FiActivity,
  FiClock,
  FiTrendingUp,
  FiExternalLink,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTenants: number;
  pendingApprovals: number;
  storageUsed: string;
  apiCallsToday: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  type: 'user' | 'tenant' | 'system';
}

export default function AdminDashboardPanel() {
  const { activeTab } = useRightPanel();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setStats({
        totalUsers: 4,
        activeUsers: 2,
        totalTenants: 3,
        pendingApprovals: 1,
        storageUsed: '1.69 GB',
        apiCallsToday: 342,
      });
      setActivities([
        { id: '1', action: 'User logged in', user: 'eleazar@example.com', timestamp: '2 min ago', type: 'user' },
        { id: '2', action: 'Tenant created', user: 'admin', timestamp: '1 hour ago', type: 'tenant' },
        { id: '3', action: 'Quota updated', user: 'system', timestamp: '3 hours ago', type: 'system' },
        { id: '4', action: 'New user registered', user: 'luca@example.com', timestamp: '1 day ago', type: 'user' },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return FiUsers;
      case 'tenant':
        return FiGrid;
      case 'system':
        return FiActivity;
      default:
        return FiActivity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'blue.500';
      case 'tenant':
        return 'purple.500';
      case 'system':
        return 'green.500';
      default:
        return 'gray.500';
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading admin stats...</Text>
      </Box>
    );
  }

  // Quick Stats Tab
  if (activeTab === 'quick-stats') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="lg">Admin Overview</Text>
          <Badge colorScheme="blue">Live</Badge>
        </HStack>

        <Divider />

        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Total Users</StatLabel>
            <StatNumber fontSize="xl">{stats?.totalUsers || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              <Icon as={FiUsers} mr={1} />
              {stats?.activeUsers} active
            </StatHelpText>
          </Stat>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Workspaces</StatLabel>
            <StatNumber fontSize="xl">{stats?.totalTenants || 0}</StatNumber>
            <StatHelpText fontSize="xs">
              <Icon as={FiGrid} mr={1} />
              tenants
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        <Box p={3} bg={bgSubtle} borderRadius="md">
          <Text fontSize="sm" fontWeight="medium" mb={2}>System Stats</Text>
          <VStack spacing={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Storage Used</Text>
              <Text fontSize="xs" fontWeight="bold">{stats?.storageUsed}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>API Calls Today</Text>
              <Text fontSize="xs" fontWeight="bold">{stats?.apiCallsToday}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="xs" color={textSecondary}>Pending Approvals</Text>
              <Badge colorScheme={stats?.pendingApprovals ? 'orange' : 'green'} size="sm">
                {stats?.pendingApprovals || 0}
              </Badge>
            </HStack>
          </VStack>
        </Box>

        <SimpleGrid columns={2} spacing={2}>
          <Button
            as={NextLink}
            href="/admin/users"
            size="sm"
            leftIcon={<FiUsers />}
            variant="outline"
          >
            Users
          </Button>
          <Button
            as={NextLink}
            href="/admin/tenants"
            size="sm"
            leftIcon={<FiGrid />}
            variant="outline"
          >
            Tenants
          </Button>
        </SimpleGrid>
      </VStack>
    );
  }

  // Recent Activity Tab
  if (activeTab === 'recent-activity') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Recent Activity</Text>
          <Badge colorScheme="blue">{activities.length}</Badge>
        </HStack>
        
        <VStack spacing={2} align="stretch">
          {activities.map((activity) => (
            <HStack key={activity.id} p={3} bg={bgSubtle} borderRadius="md" spacing={3}>
              <Icon as={getActivityIcon(activity.type)} color={getActivityColor(activity.type)} />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontSize="sm">{activity.action}</Text>
                <Text fontSize="xs" color={textSecondary}>{activity.user}</Text>
              </VStack>
              <HStack spacing={1}>
                <Icon as={FiClock} boxSize={3} color={textSecondary} />
                <Text fontSize="xs" color={textSecondary}>{activity.timestamp}</Text>
              </HStack>
            </HStack>
          ))}
        </VStack>

        <Button
          as={NextLink}
          href="/security/audit"
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          View All Activity
        </Button>
      </VStack>
    );
  }

  return null;
}
