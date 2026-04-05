/**
 * Activity Feed Component
 * 
 * Displays child's activity timeline for parent monitoring
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Spinner,
  Button,
  Select,
  useToast,
  Divider,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import {
  FiEye,
  FiAlertTriangle,
  FiClock,
  FiSearch,
  FiMessageSquare,
  FiImage,
  FiShield,
  FiLogIn,
  FiLogOut,
  FiCheck,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Activity {
  id: string;
  activityType: string;
  activityData: any;
  service: string | null;
  timestamp: Date;
  flagged: boolean;
  parentReviewed: boolean;
}

interface ActivityFeedProps {
  childId: string;
  limit?: number;
}

const activityIcons: Record<string, any> = {
  page_view: FiEye,
  search: FiSearch,
  message: FiMessageSquare,
  image_generation: FiImage,
  blocked_attempt: FiShield,
  login: FiLogIn,
  logout: FiLogOut,
};

const activityLabels: Record<string, string> = {
  page_view: 'Viewed',
  search: 'Searched',
  message: 'Sent message',
  image_generation: 'Generated image',
  blocked_attempt: 'Blocked attempt',
  login: 'Logged in',
  logout: 'Logged out',
};

export default function ActivityFeed({ childId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const toast = useToast();
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');

  useEffect(() => {
    fetchActivities();
  }, [childId, filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        childId,
        limit: limit.toString(),
      });

      if (filter !== 'all') {
        if (filter === 'flagged') {
          params.append('flaggedOnly', 'true');
        } else {
          params.append('activityType', filter);
        }
      }

      const res = await fetch(`/api/activities/feed?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })));
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error loading activities',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (activityId: string) => {
    try {
      const res = await fetch('/api/activities/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });

      if (res.ok) {
        setActivities(prev =>
          prev.map(a =>
            a.id === activityId ? { ...a, parentReviewed: true } : a
          )
        );
      }
    } catch (error) {
      console.error('Error marking as reviewed:', error);
    }
  };

  const formatActivityText = (activity: Activity): string => {
    const label = activityLabels[activity.activityType] || activity.activityType;
    const data = activity.activityData;

    switch (activity.activityType) {
      case 'page_view':
        return `${label} ${data.path || 'a page'}`;
      case 'search':
        return `${label} for "${data.query}"`;
      case 'message':
        return `${label} in ${data.service || 'chat'}`;
      case 'image_generation':
        return `${label} with prompt`;
      case 'blocked_attempt':
        return `Tried to access ${data.serviceName || 'blocked service'}`;
      default:
        return label;
    }
  };

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4} color="gray.500">Loading activities...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* Filter */}
      <HStack>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          maxW="200px"
          size="sm"
        >
          <option value="all">All Activities</option>
          <option value="flagged">Flagged Only</option>
          <option value="page_view">Page Views</option>
          <option value="search">Searches</option>
          <option value="blocked_attempt">Blocked Attempts</option>
        </Select>
        <Button size="sm" onClick={fetchActivities} leftIcon={<Icon as={FiClock} />}>
          Refresh
        </Button>
      </HStack>

      {/* Activity List */}
      <VStack spacing={2} align="stretch">
        {activities.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">No activities to show</Text>
          </Box>
        ) : (
          activities.map((activity) => (
            <Box
              key={activity.id}
              bg={cardBg}
              p={4}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={activity.flagged ? 'orange.300' : borderColor}
              position="relative"
            >
              <HStack spacing={3} align="start">
                {/* Icon */}
                <Box
                  bg={activity.flagged ? 'orange.100' : 'blue.100'}
                  p={2}
                  borderRadius="md"
                >
                  <Icon
                    as={activityIcons[activity.activityType] || FiEye}
                    color={activity.flagged ? 'orange.600' : 'blue.600'}
                  />
                </Box>

                {/* Content */}
                <VStack flex={1} align="start" spacing={1}>
                  <HStack>
                    <Text fontWeight="medium">
                      {formatActivityText(activity)}
                    </Text>
                    {activity.flagged && (
                      <Badge colorScheme="orange" fontSize="xs">
                        <HStack spacing={1}>
                          <Icon as={FiAlertTriangle} boxSize={3} />
                          <Text>Flagged</Text>
                        </HStack>
                      </Badge>
                    )}
                  </HStack>
                  
                  <HStack spacing={2} fontSize="sm" color="gray.500">
                    <Text>{formatTimestamp(activity.timestamp)}</Text>
                    {activity.service && (
                      <>
                        <Text>•</Text>
                        <Text>{activity.service}</Text>
                      </>
                    )}
                  </HStack>
                </VStack>

                {/* Review Button */}
                {activity.flagged && !activity.parentReviewed && (
                  <Tooltip label="Mark as reviewed">
                    <IconButton
                      aria-label="Mark as reviewed"
                      icon={<FiCheck />}
                      size="sm"
                      colorScheme="green"
                      variant="ghost"
                      onClick={() => markAsReviewed(activity.id)}
                    />
                  </Tooltip>
                )}
              </HStack>
            </Box>
          ))
        )}
      </VStack>
    </VStack>
  );
}
