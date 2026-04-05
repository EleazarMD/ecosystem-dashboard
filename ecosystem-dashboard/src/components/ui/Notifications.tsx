import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  CloseButton,
  Flex,
  Text,
  useDisclosure,
  Badge,
  IconButton,
  Slide,
  Stack
} from '@chakra-ui/react';
import { BellIcon, CloseIcon } from '@chakra-ui/icons';
import { useWebSocket } from '@/lib/websocket';

// Define notification types locally since they're not exported from websocket
export enum NotificationSeverity {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp: string;
}

interface NotificationsProps {
  maxNotifications?: number;
}

const Notifications: React.FC<NotificationsProps> = ({ maxNotifications = 5 }) => {
  const { notifications } = useWebSocket();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);

  // Process notifications from WebSocket
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      // Get only new notifications that aren't already in the queue
      const existingIds = new Set(notificationQueue.map(n => n.id));
      
      // Convert websocket notifications to our local Notification type
      const newNotifications = notifications
        .filter(n => n.id && !existingIds.has(n.id))
        .map(n => {
          // Ensure timestamp is always a string
          const timestamp = typeof n.timestamp === 'string' 
            ? n.timestamp 
            : new Date().toISOString();
            
          return {
            id: n.id || `notification-${Date.now()}-${Math.random()}`,
            title: n.title || 'Notification',
            message: n.message || '',
            severity: (n.severity as NotificationSeverity) || NotificationSeverity.INFO,
            timestamp
          };
        })
        .slice(0, maxNotifications);
      
      if (newNotifications.length > 0) {
        setNotificationQueue(prev => [...newNotifications, ...prev].slice(0, maxNotifications) as Notification[]);
      }
    }
  }, [notifications, maxNotifications, notificationQueue]);

  // Process notification queue
  useEffect(() => {
    if (notificationQueue.length > 0 && !currentNotification) {
      // Get the next notification from the queue
      const nextNotification = notificationQueue[0];
      const updatedQueue = notificationQueue.slice(1);
      
      setCurrentNotification(nextNotification);
      setNotificationQueue(updatedQueue);
      onOpen();
    }
  }, [notificationQueue, currentNotification, onOpen]);

  // Handle closing the notification
  const handleClose = () => {
    onClose();
    // Use a timeout to match the animation duration
    setTimeout(() => {
      setCurrentNotification(null);
    }, 300); // Slightly longer than Chakra's default transition
  };

  // Map notification severity to Alert status
  const mapSeverity = (severity: NotificationSeverity): "error" | "warning" | "success" | "info" => {
    switch (severity) {
      case NotificationSeverity.ERROR:
        return 'error';
      case NotificationSeverity.WARNING:
        return 'warning';
      case NotificationSeverity.SUCCESS:
        return 'success';
      case NotificationSeverity.INFO:
      default:
        return 'info';
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Notification Badge */}
      <Box position="relative" display="inline-block" cursor="pointer">
        <IconButton
          aria-label="Notifications"
          icon={<BellIcon />}
          variant="ghost"
          size="md"
        />
        {(notifications?.length || 0) > 0 && (
          <Badge
            position="absolute"
            top="0"
            right="0"
            colorScheme="red"
            borderRadius="full"
            transform="translate(25%, -25%)"
          >
            {notifications?.length || 0}
          </Badge>
        )}
      </Box>

      {/* Current Notification */}
      {currentNotification && (
        <Box
          position="fixed"
          top="4"
          right="4"
          zIndex="toast"
          maxWidth="sm"
          width="100%"
        >
          <Slide
            direction="right"
            in={isOpen}
            style={{ position: 'relative' }}
          >
            <Alert
              status={mapSeverity(currentNotification.severity)}
              variant="solid"
              borderRadius="md"
              boxShadow="md"
            >
              <Stack spacing={1}>
                <Flex justify="space-between" align="center">
                  <Flex align="center">
                    <AlertIcon />
                    <Text fontWeight="bold" ml={2}>
                      {currentNotification.title}
                    </Text>
                  </Flex>
                  <CloseButton size="sm" onClick={handleClose} />
                </Flex>
                <Text>{currentNotification.message}</Text>
                <Text fontSize="xs" opacity={0.8}>
                  {formatTime(currentNotification.timestamp)}
                </Text>
              </Stack>
            </Alert>
          </Slide>
        </Box>
      )}
    </>
  );
};

export default Notifications;
