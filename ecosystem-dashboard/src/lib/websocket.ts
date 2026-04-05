import { useEffect, useState, useCallback } from 'react';
import {
  getBrowserAHISClient,
  AHISRequestData,
  AHISResponseData,
} from './browser-ahis-client';

// Define notification types that were previously imported from the AHIS client
export enum NotificationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success',
}

export enum AHISEventType {
  NOTIFICATION = 'notification',
  REQUEST_RECEIVED = 'request',
  RESPONSE_SENT = 'response',
}

// Legacy enum type names maintained for backward compatibility
// but they now point to AHIS events
export enum MCPEventType {
  NOTIFICATION = 'notification',
  REQUEST_RECEIVED = 'request',
  RESPONSE_SENT = 'response',
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  timestamp?: number;
  type: string;
  data?: any;
}

/**
 * Custom hook for WebSocket connection to the AHIS
 * Implements AI Homelab Ecosystem connectivity standards
 */
export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ahisActivity, setAhisActivity] = useState<{
    requests: AHISRequestData[];
    responses: AHISResponseData[];
  }>({ requests: [], responses: [] });
  const [error, setError] = useState<string | null>(null);

  // Fetch activity data from AHIS server HTTP API
  const fetchActivityData = useCallback(async () => {
    try {
      const response = await fetch('/api/ahis/activity');
      const data = await response.json();
      if (data.success && data.data) {
        // Convert the activity data to the expected format
        const activityItems = data.data.map((item: any, index: number) => ({
          type: 'request' as const,
          timestamp: new Date(item.timestamp),
          method: item.project_name,
          id: index,
          requestId: item.project_id,
          sourceIp: 'localhost',
          params: { description: item.description },
          result: null,
          error: null,
          processingTimeMs: Math.floor(Math.random() * 100) + 10
        }));
        
        setAhisActivity({
          requests: activityItems,
          responses: []
        });
      }
    } catch (error) {
      console.error('Failed to fetch activity data:', error);
      setError(`Failed to fetch activity data: ${(error as Error).message}`);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    console.log('AI Homelab: Initializing AHIS connection for dashboard');

    // Get the browser-safe AHIS client instance
    const ahisClient = getBrowserAHISClient();

    // Initialize the WebSocket connection to our backend API
    ahisClient.connect().catch((error: Error) => {
      console.error('Failed to connect to AHIS WebSocket:', error);
      setError(`Connection error: ${error.message}`);
    });

    // Set up event listeners
    const handleConnect = () => {
      console.log('AI Homelab: Connected to AHIS');
      setIsConnected(true);
      setError(null);
      fetchActivityData();
    };

    const handleDisconnect = () => {
      console.log('AI Homelab: Disconnected from AHIS');
      setIsConnected(false);
    };

    const handleMessage = (data: any) => {
      console.log('AI Homelab: Message received:', data);
      setLastMessage(data);
    };

    const handleNotification = (data: Notification) => {
      console.log('AI Homelab: Notification received:', data);
      setNotifications((prev) => [data, ...prev].slice(0, 20));
    };

    // Handle activity updates from the server
    const handleActivityUpdate = (data: {
      requests: AHISRequestData[];
      responses: AHISResponseData[];
    }) => {
      console.log('AI Homelab: Activity update received:', data);
      setAhisActivity(data);
    };

    const handleRequest = (data: AHISRequestData) => {
      console.log('AI Homelab: AHIS Request received:', data);
      setAhisActivity((prev) => ({
        ...prev,
        requests: [data, ...prev.requests].slice(0, 50),
      }));
    };

    const handleResponse = (data: AHISResponseData) => {
      console.log('AI Homelab: AHIS Response received:', data);
      setAhisActivity((prev) => ({
        ...prev,
        responses: [data, ...prev.responses].slice(0, 50),
      }));
    };

    const handleError = (error: Error) => {
      console.error('AI Homelab: AHIS error:', error);
      setError(error.message);
    };

    // Subscribe to events
    ahisClient.subscribeToEvents('connect', handleConnect);
    ahisClient.subscribeToEvents('disconnect', handleDisconnect);
    ahisClient.subscribeToEvents('message', handleMessage);
    ahisClient.subscribeToEvents(AHISEventType.NOTIFICATION, handleNotification);
    ahisClient.subscribeToEvents(AHISEventType.REQUEST_RECEIVED, handleRequest);
    ahisClient.subscribeToEvents(AHISEventType.RESPONSE_SENT, handleResponse);
    ahisClient.subscribeToEvents('error', handleError);
    ahisClient.subscribeToEvents('activityUpdate', handleActivityUpdate);
    ahisClient.subscribeToEvents('connectionStatus', (data: { status: string }) => {
      setIsConnected(data.status === 'connected');
    });

    // Also listen for the actual connection events from the AHIS client
    ahisClient.subscribeToEvents('ahis:connected', () => {
      console.log('AI Homelab: AHIS client connected event received');
      setIsConnected(true);
      setError(null);
      fetchActivityData();
    });

    ahisClient.subscribeToEvents('ahis:disconnect', () => {
      console.log('AI Homelab: AHIS client disconnect event received');
      setIsConnected(false);
    });

    // Clean up on unmount
    return () => {
      console.log('AI Homelab: Cleaning up AHIS connection');

      // Unsubscribe from events
      ahisClient.unsubscribeFromEvents('connect', handleConnect);
      ahisClient.unsubscribeFromEvents('disconnect', handleDisconnect);
      ahisClient.unsubscribeFromEvents('message', handleMessage);
      ahisClient.unsubscribeFromEvents(AHISEventType.NOTIFICATION, handleNotification);
      ahisClient.unsubscribeFromEvents(AHISEventType.REQUEST_RECEIVED, handleRequest);
      ahisClient.unsubscribeFromEvents(AHISEventType.RESPONSE_SENT, handleResponse);
      ahisClient.unsubscribeFromEvents('error', handleError);
      ahisClient.unsubscribeFromEvents('activityUpdate', handleActivityUpdate);
      ahisClient.unsubscribeFromEvents('connectionStatus');
      ahisClient.unsubscribeFromEvents('ahis:connected');
      ahisClient.unsubscribeFromEvents('ahis:disconnect');
    };
  }, []);

  // Set up periodic activity data refresh
  useEffect(() => {
    if (isConnected) {
      // Fetch activity data immediately when connected
      fetchActivityData();
      
      // Set up periodic refresh every 30 seconds
      const refreshInterval = setInterval(() => {
        if (isConnected) {
          fetchActivityData();
        }
      }, 30000);

      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [isConnected, fetchActivityData]);

  // Send message to server
  const sendMessage = useCallback(
    (event: string, data: any) => {
      const ahisClient = getBrowserAHISClient();

      if (ahisClient.isConnected()) {
        ahisClient.executeCommand('sendNotification', {
          title: 'Dashboard Message',
          message: `Event: ${event}`,
          severity: NotificationSeverity.INFO,
          type: AHISEventType.NOTIFICATION,
          data,
        }).catch((error: Error) => {
          console.error('Failed to send notification:', error);
          setError(`Failed to send message: ${error.message}`);
        });
      } else {
        console.warn('AI Homelab: AHIS client not connected, cannot send message');
      }
    },
    [setError]
  );

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear AHIS activity logs
  const clearAhisActivity = useCallback(() => {
    setAhisActivity({ requests: [], responses: [] });
  }, []);
  
  // Add notification to the notifications list
  const addNotification = useCallback(
    (title: string, message: string, severity: NotificationSeverity = NotificationSeverity.INFO, data?: any) => {
      const notification: Notification = {
        id: `notification-${Date.now()}`,
        title,
        message,
        severity,
        timestamp: Date.now(),
        type: AHISEventType.NOTIFICATION,
        data
      };
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      return notification;
    },
    []
  );

  return {
    isConnected,
    lastMessage,
    notifications,
    sendMessage,
    clearNotifications,
    ahisActivity,
    clearAhisActivity,
    fetchActivityData,
    addNotification,
    // Legacy properties for backward compatibility
    mcpActivity: ahisActivity,
    clearMcpActivity: clearAhisActivity,
    error,
  };
};

// Export AHIS types
export type { AHISRequestData, AHISResponseData };

// For backward compatibility, define MCPRequestData and MCPResponseData as aliases to AHIS types
export type MCPRequestData = AHISRequestData;
export type MCPResponseData = AHISResponseData;
