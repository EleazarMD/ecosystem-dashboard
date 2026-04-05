import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Box,
  Spinner,
  Alert,
  AlertIcon,
  Icon,
  Heading,
} from '@chakra-ui/react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useActivityFeed, ActivityEvent } from '@/context/ActivityFeedContext';
import {
  FiCpu, FiGitCommit, FiAlertTriangle, FiCheckCircle, FiInfo
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const getActivityIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'system':
      return FiCpu;
    case 'commit':
      return FiGitCommit;
    case 'alert':
      return FiAlertTriangle;
    case 'success':
      return FiCheckCircle;
    default:
      return FiInfo;
  }
};

const ActivityFeedWidget = () => {
  const { activities, loading, error } = useActivityFeed();
  const textColor = useSemanticToken('text.secondary');

  const renderContent = () => {
    if (loading) {
      return <Spinner />;
    }

    if (error) {
      return (
        <Alert status="error">
          <AlertIcon />
          Error loading activity feed.
        </Alert>
      );
    }

    if (!activities || activities.length === 0) {
        return <Text>No recent activity.</Text>;
    }

    const latestActivities = activities.slice(0, 5);

    return (
      <VStack align="stretch" spacing={4}>
        {latestActivities.map((activity) => (
          <GlassPanel key={activity.id} variant="light" elevation={1} p={3}>
            <HStack spacing={4} align="start">
              <Icon as={getActivityIcon(activity.type)} mt={1} />
              <Box>
                <Text>{activity.message}</Text>
                <Text fontSize="xs" color={textColor}>
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </Text>
              </Box>
            </HStack>
          </GlassPanel>
        ))}
      </VStack>
    );
  };

  return (
    <GlassPanel
      variant="medium"
      elevation={2}
      animated={true}
      hoverEffect={true}
      h="100%"
      p={4}
    >
      <VStack align="stretch" spacing={4} h="100%">
        <Heading size="md">Recent Activity</Heading>
        <Box overflowY="auto" flex={1}>
          {renderContent()}
        </Box>
      </VStack>
    </GlassPanel>
  );
};

export default ActivityFeedWidget;
