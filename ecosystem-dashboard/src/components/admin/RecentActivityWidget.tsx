/**
 * Recent Activity Widget
 * Shows recent platform-wide activities and events
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Avatar,
  Button,
  Spinner,
} from '@chakra-ui/react';
import {
  FiActivity,
  FiUserPlus,
  FiAlertTriangle,
  FiCheckCircle,
  FiSettings,
  FiExternalLink,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface ActivityEvent {
  id: string;
  type: 'user_created' | 'tenant_created' | 'alert' | 'system_event';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  severity?: 'info' | 'warning' | 'error';
}

export default function RecentActivityWidget() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const textSecondary = useSemanticToken('text.secondary');
  const bgSubtle = useSemanticToken('surface.subtle');

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/activity/recent?limit=10');
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created': return FiUserPlus;
      case 'tenant_created': return FiSettings;
      case 'alert': return FiAlertTriangle;
      default: return FiCheckCircle;
    }
  };

  const getActivityColor = (severity?: string) => {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      default: return 'blue';
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="light" p={6}>
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text color={textSecondary}>Loading activity...</Text>
        </VStack>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="light" p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <HStack>
            <Icon as={FiActivity} boxSize={5} color="purple.500" />
            <Text fontSize="lg" fontWeight="bold">Recent Activity</Text>
          </HStack>
          <Badge colorScheme="purple">Live</Badge>
        </HStack>

        <VStack spacing={2} align="stretch" maxH="400px" overflowY="auto">
          {activities.length === 0 ? (
            <Text fontSize="sm" color={textSecondary} textAlign="center" py={4}>
              No recent activity
            </Text>
          ) : (
            activities.map((activity) => (
              <Box
                key={activity.id}
                p={3}
                bg={bgSubtle}
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor={`${getActivityColor(activity.severity)}.500`}
              >
                <HStack spacing={3} align="start">
                  <Icon
                    as={getActivityIcon(activity.type)}
                    boxSize={4}
                    color={`${getActivityColor(activity.severity)}.500`}
                    mt={1}
                  />
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      {activity.title}
                    </Text>
                    <Text fontSize="xs" color={textSecondary}>
                      {activity.description}
                    </Text>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color={textSecondary}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </Text>
                      {activity.userName && (
                        <Badge fontSize="xs" colorScheme="gray">
                          {activity.userName}
                        </Badge>
                      )}
                    </HStack>
                  </VStack>
                </HStack>
              </Box>
            ))
          )}
        </VStack>

        <Button
          as={NextLink}
          href="/admin/activity-log"
          size="sm"
          variant="outline"
          colorScheme="purple"
          rightIcon={<FiExternalLink />}
        >
          View Full Activity Log
        </Button>
      </VStack>
    </GlassPanel>
  );
}
