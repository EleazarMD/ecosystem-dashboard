/**
 * Children Activity Widget
 * Shows summary of children's activities for parent users
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Avatar,
  Badge,
  Progress,
  Button,
  SimpleGrid,
  Spinner,
} from '@chakra-ui/react';
import {
  FiUsers,
  FiClock,
  FiShield,
  FiAlertTriangle,
  FiExternalLink,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface ChildActivity {
  id: string;
  name: string;
  avatarUrl?: string;
  todayUsageMinutes: number;
  dailyLimitMinutes: number;
  blockedAttempts: number;
  pendingApprovals: number;
  controlsActive: boolean;
}

export default function ChildrenActivityWidget() {
  const [children, setChildren] = useState<ChildActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');

  useEffect(() => {
    fetchChildrenActivity();
  }, []);

  const fetchChildrenActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family/children/activity-summary');
      if (res.ok) {
        const result = await res.json();
        setChildren(result.children || []);
      }
    } catch (error) {
      console.error('Failed to fetch children activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading children's activity...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  if (children.length === 0) {
    return null; // Don't show widget if no children
  }

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiUsers} boxSize={5} color="purple.500" />
            <Text fontSize="lg" fontWeight="bold">Children's Activity</Text>
          </HStack>
          <Badge colorScheme="purple">{children.length} {children.length === 1 ? 'child' : 'children'}</Badge>
        </HStack>

        <VStack spacing={3} align="stretch">
          {children.map((child) => {
            const usagePercent = Math.min(100, (child.todayUsageMinutes / child.dailyLimitMinutes) * 100);
            const hasAlerts = child.blockedAttempts > 0 || child.pendingApprovals > 0;

            return (
              <Box
                key={child.id}
                p={4}
                bg={bgSubtle}
                borderRadius="md"
                border="1px solid"
                borderColor={hasAlerts ? 'orange.200' : 'transparent'}
              >
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <HStack>
                      <Avatar size="sm" name={child.name} src={child.avatarUrl} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">{child.name}</Text>
                        <HStack spacing={2}>
                          <HStack spacing={1}>
                            <Icon
                              as={FiShield}
                              boxSize={3}
                              color={child.controlsActive ? 'green.500' : 'red.500'}
                            />
                            <Text fontSize="xs" color={textSecondary}>
                              {child.controlsActive ? 'Protected' : 'Unprotected'}
                            </Text>
                          </HStack>
                        </HStack>
                      </VStack>
                    </HStack>
                    <Button
                      as={NextLink}
                      href={`/family/${child.id}`}
                      size="xs"
                      variant="ghost"
                      rightIcon={<FiExternalLink />}
                    >
                      View
                    </Button>
                  </HStack>

                  <Box>
                    <HStack justify="space-between" mb={1}>
                      <HStack spacing={1}>
                        <Icon as={FiClock} boxSize={3} color={textSecondary} />
                        <Text fontSize="xs" color={textSecondary}>Usage Today</Text>
                      </HStack>
                      <Text fontSize="xs" fontWeight="medium">
                        {child.todayUsageMinutes}m / {child.dailyLimitMinutes}m
                      </Text>
                    </HStack>
                    <Progress
                      value={usagePercent}
                      size="sm"
                      colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
                      borderRadius="full"
                    />
                  </Box>

                  {hasAlerts && (
                    <HStack spacing={2} flexWrap="wrap">
                      {child.blockedAttempts > 0 && (
                        <Badge colorScheme="red" fontSize="xs">
                          <HStack spacing={1}>
                            <Icon as={FiAlertTriangle} boxSize={3} />
                            <Text>{child.blockedAttempts} blocked</Text>
                          </HStack>
                        </Badge>
                      )}
                      {child.pendingApprovals > 0 && (
                        <Badge colorScheme="orange" fontSize="xs">
                          {child.pendingApprovals} pending approval{child.pendingApprovals > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </HStack>
                  )}
                </VStack>
              </Box>
            );
          })}
        </VStack>

        <Button
          as={NextLink}
          href="/family"
          size="sm"
          variant="outline"
          colorScheme="purple"
        >
          Manage All Children
        </Button>
      </VStack>
    </GlassPanel>
  );
}
