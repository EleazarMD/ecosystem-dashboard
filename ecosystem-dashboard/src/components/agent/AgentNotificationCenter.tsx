/**
 * Agent Notification Center Component
 * 
 * Displays real-time notifications from the Knowledge Graph Agent
 * with toast notifications and a notification panel.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  useToast,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  Divider,
  Flex,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import {
  FaBell,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
  FaCog,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import { useAgentWebSocket, AgentNotification } from '../../hooks/useAgentWebSocket';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AgentNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  showToasts?: boolean;
}

const getNotificationIcon = (type: AgentNotification['type'], severity: AgentNotification['severity']) => {
  if (severity === 'error') return FaTimes;
  if (severity === 'warning') return FaExclamationTriangle;
  if (severity === 'success') return FaCheck;

  switch (type) {
    case 'task_completed': return FaCheck;
    case 'task_failed': return FaTimes;
    case 'task_started': return FaCog;
    case 'workflow_update': return FaCog;
    default: return FaInfoCircle;
  }
};

const getNotificationColor = (severity: AgentNotification['severity']) => {
  switch (severity) {
    case 'error': return 'red';
    case 'warning': return 'orange';
    case 'success': return 'green';
    default: return 'blue';
  }
};

export const AgentNotificationCenter: React.FC<AgentNotificationCenterProps> = ({
  isOpen,
  onClose,
  showToasts = true
}) => {
  const toast = useToast();
  const [viewedNotifications, setViewedNotifications] = useState<Set<string>>(new Set());

  const {
    isConnected,
    connectionError,
    notifications,
    activeTasks,
    clearNotifications,
    removeNotification
  } = useAgentWebSocket({
    autoConnect: true,
    onNotification: (notification) => {
      if (showToasts) {
        toast({
          title: notification.title,
          description: notification.message,
          status: notification.severity,
          duration: notification.severity === 'error' ? 8000 : 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
    }
  });

  const unviewedCount = notifications.filter(n => !viewedNotifications.has(n.id)).length;

  const markAsViewed = (notificationId: string) => {
    setViewedNotifications(prev => new Set([...Array.from(prev), notificationId]));
  };

  const markAllAsViewed = () => {
    setViewedNotifications(new Set([...notifications.map(n => n.id)]));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          <HStack>
            <Icon as={FaBell} />
            <Text>Agent Notifications</Text>
            {unviewedCount > 0 && (
              <Badge colorScheme="red" borderRadius="full">
                {unviewedCount}
              </Badge>
            )}
          </HStack>
        </DrawerHeader>

        <DrawerBody>
          <VStack spacing={4} align="stretch">
            {/* Connection Status */}
            <Box p={3} bg={isConnected ? 'green.50' : 'red.50'} borderRadius="md">
              <HStack>
                <Box
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={isConnected ? 'green.500' : 'red.500'}
                />
                <Text fontSize="sm" color={isConnected ? 'green.700' : 'red.700'}>
                  {isConnected ? 'Connected to Agent' : connectionError || 'Disconnected'}
                </Text>
              </HStack>
            </Box>

            {/* Active Tasks */}
            {activeTasks.length > 0 && (
              <Box>
                <Text fontWeight="bold" mb={2}>Active Tasks ({activeTasks.length})</Text>
                <VStack spacing={2} align="stretch">
                  {activeTasks.map(task => (
                    <Box key={task.taskId} p={3} bg="blue.50" borderRadius="md">
                      <HStack justify="space-between">
                        <VStack align="start" spacing={1}>
                          <Text fontSize="sm" fontWeight="medium">{task.command}</Text>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{task.taskId}</Text>
                        </VStack>
                        <Badge colorScheme={task.status === 'in_progress' ? 'blue' : 'gray'}>
                          {task.status}
                        </Badge>
                      </HStack>
                      {task.progress !== undefined && (
                        <Box mt={2}>
                          <Box bg={useSemanticToken('surface.elevated')} borderRadius="full" h={2}>
                            <Box
                              bg="blue.500"
                              h={2}
                              borderRadius="full"
                              width={`${task.progress}%`}
                            />
                          </Box>
                          <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                            {task.progress}% complete
                          </Text>
                        </Box>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Notification Actions */}
            <HStack>
              <Button size="sm" onClick={markAllAsViewed} isDisabled={unviewedCount === 0}>
                <Icon as={FaEye} mr={2} />
                Mark All Read
              </Button>
              <Button size="sm" onClick={clearNotifications} variant="outline" colorScheme="red">
                <Icon as={FaTrash} mr={2} />
                Clear All
              </Button>
            </HStack>

            <Divider />

            {/* Notifications List */}
            <VStack spacing={3} align="stretch">
              {notifications.length === 0 ? (
                <Box textAlign="center" py={8}>
                  <Icon as={FaBell} size="2xl" color={useSemanticToken('text.tertiary')} mb={2} />
                  <Text color={useSemanticToken('text.secondary')}>No notifications yet</Text>
                </Box>
              ) : (
                notifications.map(notification => {
                  const isViewed = viewedNotifications.has(notification.id);
                  const IconComponent = getNotificationIcon(notification.type, notification.severity);
                  const color = getNotificationColor(notification.severity);

                  return (
                    <Box
                      key={notification.id}
                      p={4}
                      bg={isViewed ? 'gray.50' : 'white'}
                      border="1px"
                      borderColor={isViewed ? 'gray.200' : `${color}.200`}
                      borderRadius="md"
                      position="relative"
                      onClick={() => markAsViewed(notification.id)}
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                    >
                      {!isViewed && (
                        <Box
                          position="absolute"
                          top={2}
                          right={2}
                          w={2}
                          h={2}
                          bg={`${color}.500`}
                          borderRadius="full"
                        />
                      )}

                      <HStack align="start" spacing={3}>
                        <Icon as={IconComponent} color={`${color}.500`} mt={1} />
                        <VStack align="start" spacing={1} flex={1}>
                          <HStack justify="space-between" w="full">
                            <Text fontWeight="medium" fontSize="sm">
                              {notification.title}
                            </Text>
                            <Tooltip label={new Date(notification.timestamp).toLocaleString()}>
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {formatTimestamp(notification.timestamp)}
                              </Text>
                            </Tooltip>
                          </HStack>

                          <Text fontSize="sm" color={useSemanticToken('text.primary')}>
                            {notification.message}
                          </Text>

                          {notification.taskId && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                              Task: {notification.taskId}
                            </Text>
                          )}

                          <HStack>
                            <Badge size="sm" colorScheme={color}>
                              {notification.type.replace('_', ' ')}
                            </Badge>
                            <Badge size="sm" variant="outline">
                              {notification.severity}
                            </Badge>
                          </HStack>
                        </VStack>

                        <IconButton
                          size="xs"
                          aria-label="Remove notification"
                          icon={<FaTimes />}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          variant="ghost"
                          colorScheme="gray"
                        />
                      </HStack>
                    </Box>
                  );
                })
              )}
            </VStack>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
