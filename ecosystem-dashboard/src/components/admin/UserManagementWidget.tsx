/**
 * User Management Widget
 * Quick access to user management and statistics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  SimpleGrid,
  Avatar,
  AvatarGroup,
  Spinner,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiUserPlus,
  FiUserCheck,
  FiUserX,
  FiExternalLink,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface UserStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  pendingApprovals: number;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
  }>;
}

export default function UserManagementWidget() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading user data...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiUsers} boxSize={5} color="blue.500" />
            <Text fontSize="lg" fontWeight="bold">User Management</Text>
          </HStack>
          {stats && stats.pendingApprovals > 0 && (
            <Badge colorScheme="orange">{stats.pendingApprovals} pending</Badge>
          )}
        </HStack>

        <SimpleGrid columns={3} spacing={3}>
          <Box p={3} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiUsers} boxSize={6} color="blue.500" mb={2} />
            <Text fontSize="2xl" fontWeight="bold">{stats?.totalUsers || 0}</Text>
            <Text fontSize="xs" color={textSecondary}>Total Users</Text>
          </Box>

          <Box p={3} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiUserCheck} boxSize={6} color="green.500" mb={2} />
            <Text fontSize="2xl" fontWeight="bold">{stats?.activeToday || 0}</Text>
            <Text fontSize="xs" color={textSecondary}>Active Today</Text>
          </Box>

          <Box p={3} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiUserPlus} boxSize={6} color="purple.500" mb={2} />
            <Text fontSize="2xl" fontWeight="bold">{stats?.newThisWeek || 0}</Text>
            <Text fontSize="xs" color={textSecondary}>New This Week</Text>
          </Box>
        </SimpleGrid>

        {stats && stats.recentUsers.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Recent Users</Text>
            <HStack spacing={3}>
              <AvatarGroup size="sm" max={5}>
                {stats.recentUsers.map((user) => (
                  <Avatar
                    key={user.id}
                    name={user.name}
                    src={user.avatarUrl}
                    title={`${user.name} (${user.role})`}
                  />
                ))}
              </AvatarGroup>
              <Text fontSize="xs" color={textSecondary}>
                +{stats.recentUsers.length} recently joined
              </Text>
            </HStack>
          </Box>
        )}

        <HStack spacing={2}>
          <Button
            as={NextLink}
            href="/admin/users"
            size="sm"
            variant="outline"
            colorScheme="blue"
            flex={1}
            rightIcon={<FiExternalLink />}
          >
            Manage Users
          </Button>
          <Button
            as={NextLink}
            href="/admin/users/new"
            size="sm"
            colorScheme="blue"
            leftIcon={<FiUserPlus />}
          >
            Add User
          </Button>
        </HStack>
      </VStack>
    </GlassPanel>
  );
}
