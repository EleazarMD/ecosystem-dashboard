/**
 * AI Homelab Ecosystem - Notifications Component
 * 
 * This component displays real-time notifications from the AIHDS progress tracking system.
 * It integrates with the ProgressContext to show updates on project and task progress.
 * 
 * Updated to make notifications more subtle and transient with auto-dismissal.
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  CloseButton,
  Box,
  VStack,
  Button,
  useToast,
  AlertIcon,
  AlertDescription,
  Fade
} from '@chakra-ui/react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  dismissed?: boolean;
  timestamp?: string;
}

// Maximum number of notifications to show at once
const MAX_VISIBLE_NOTIFICATIONS = 2;

// Auto-dismiss duration in milliseconds
const AUTO_DISMISS_DURATION = 5000; // 5 seconds

export default function Notifications() {
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);
  const toast = useToast();

  // For now, we'll use an empty notifications array since the ProgressContext doesn't have notifications
  const notifications: Notification[] = [];
  
  const dismissNotification = (id: string) => {
    // Simple dismiss function - in a real implementation this would update the notifications state
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const activeNotifications = notifications
      .filter(n => !n.dismissed)
      .slice(0, MAX_VISIBLE_NOTIFICATIONS);
    setVisibleNotifications(activeNotifications);
    
    // Set up auto-dismissal for each notification
    activeNotifications.forEach(notification => {
      if (!notification.dismissed) {
        setTimeout(() => {
          dismissNotification(notification.id);
        }, AUTO_DISMISS_DURATION);
      }
    });
  }, [notifications, dismissNotification]);

  const handleClose = (id: string) => {
    dismissNotification(id);
  };

  const handleShowAll = () => {
    const activeNotifications = notifications.filter(n => !n.dismissed);
    setVisibleNotifications(activeNotifications);
  };

  return (
    <Box position="fixed" bottom={4} right={4} zIndex={2000}>
      <VStack spacing={2} align="stretch" maxW="280px">
        {visibleNotifications.map((notification) => (
          <Fade key={notification.id} in={true} unmountOnExit>
            <Alert
              status={notification.type}
              variant="subtle"
              borderRadius="md"
              position="relative"
              boxShadow="sm"
              opacity={0.9}
              _hover={{ opacity: 1 }}
              transition="all 0.2s ease"
              size="sm"
            >
              <Box pr={8}>
                <AlertIcon boxSize="16px" />
                <AlertTitle fontSize="sm" fontWeight="medium" mb={0}>
                  {notification.title}
                </AlertTitle>
                <AlertDescription fontSize="xs">
                  {notification.message}
                </AlertDescription>
              </Box>
              <CloseButton
                position="absolute"
                right={1}
                top={1}
                size="sm"
                onClick={() => handleClose(notification.id)}
              />
            </Alert>
          </Fade>
        ))}
        {notifications.filter(n => !n.dismissed).length > MAX_VISIBLE_NOTIFICATIONS && (
          <Box textAlign="right">
            <Button size="xs" onClick={handleShowAll} variant="ghost" colorScheme="gray">
              {notifications.filter(n => !n.dismissed).length - MAX_VISIBLE_NOTIFICATIONS} more
            </Button>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
