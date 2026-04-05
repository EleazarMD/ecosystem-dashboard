/**
 * Knowledge Graph Monitoring WebSocket Hook
 * 
 * This hook provides real-time communication with the Knowledge Graph MCP monitoring WebSocket.
 * It handles connection, reconnection, subscription, and data updates.
 * 
 * @module useKGMonitoringSocket
 */

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/lib/logger';

export interface KGMetrics {
  operationCount: number;
  errorRate: number;
  averageDuration: number;
  activeOperations: number;
  alertCount: number;
}

export interface SystemAlert {
  id: string;
  type: string; 
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
}

export interface KGMonitoringSocketHook {
  metrics: KGMetrics | null;
  alerts: SystemAlert[];
  isConnected: boolean;
  lastUpdated: Date | null;
  subscribeToMetrics: () => void;
  unsubscribeFromMetrics: () => void;
}

/**
 * React hook for KG Monitoring WebSocket connection
 * 
 * @returns KGMonitoringSocketHook object with metrics, connection status, and control functions
 */
export const useKGMonitoringSocket = (): KGMonitoringSocketHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [metrics, setMetrics] = useState<KGMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize socket connection
  useEffect(() => {
    // Create socket connection
    const socketInstance = io({
      path: '/api/socket',
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      logger.info('[KG-Socket] Connected to WebSocket server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      logger.info('[KG-Socket] Disconnected from WebSocket server');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      logger.error('[KG-Socket] Connection error', error);
      setIsConnected(false);
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      logger.info('[KG-Socket] Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []);

  // Handle real-time metrics updates
  useEffect(() => {
    if (!socket) return;

    const handleMetricsUpdate = (newMetrics: KGMetrics) => {
      logger.debug('[KG-Socket] Received metrics update', newMetrics);
      setMetrics(newMetrics);
      setLastUpdated(new Date());
    };

    const handleSystemAlert = (alert: SystemAlert) => {
      logger.info('[KG-Socket] Received system alert', alert);
      setAlerts((prev) => [alert, ...prev].slice(0, 100)); // Keep last 100 alerts
    };

    // Register event listeners
    socket.on('kg-metrics-update', handleMetricsUpdate);
    socket.on('system-alert', handleSystemAlert);

    // Clean up listeners
    return () => {
      socket.off('kg-metrics-update', handleMetricsUpdate);
      socket.off('system-alert', handleSystemAlert);
    };
  }, [socket]);

  // Subscribe to real-time metrics updates
  const subscribeToMetrics = useCallback(() => {
    if (socket && isConnected) {
      logger.info('[KG-Socket] Subscribing to KG metrics');
      socket.emit('subscribe:kg-metrics');
    } else {
      logger.warn('[KG-Socket] Cannot subscribe: Socket not connected');
    }
  }, [socket, isConnected]);

  // Unsubscribe from real-time metrics updates
  const unsubscribeFromMetrics = useCallback(() => {
    if (socket && isConnected) {
      logger.info('[KG-Socket] Unsubscribing from KG metrics');
      socket.emit('unsubscribe:kg-metrics');
    }
  }, [socket, isConnected]);

  return {
    metrics,
    alerts,
    isConnected,
    lastUpdated,
    subscribeToMetrics,
    unsubscribeFromMetrics
  };
};

export default useKGMonitoringSocket;
