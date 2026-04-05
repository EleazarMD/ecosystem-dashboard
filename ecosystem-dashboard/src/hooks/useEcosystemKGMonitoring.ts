/**
 * AI Homelab Ecosystem Knowledge Graph Monitoring Hook
 * 
 * React hook for real-time KG monitoring using the standardized 
 * AI Homelab Ecosystem WebSocket protocol.
 * 
 * @module useEcosystemKGMonitoring
 * @implements AI Homelab Ecosystem Communication Standards v2.5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getEcosystemWebSocket } from '@/lib/ecosystem-websocket';
import logger from '@/lib/logger';
import type { KGMonitoringMetrics, KGSystemHealth } from '../types/monitoring';

export interface KGAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  component?: string;
  details?: Record<string, any>;
}

interface UseEcosystemKGMonitoringOptions {
  maxAlerts?: number;
  autoSubscribe?: boolean;
}

/**
 * React hook for real-time KG Monitoring via AI Homelab Ecosystem WebSocket protocol
 */
export function useEcosystemKGMonitoring(options: UseEcosystemKGMonitoringOptions = {}) {
  // Default options
  const { maxAlerts = 50, autoSubscribe = true } = options;

  // State for metrics and connection status
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<KGMonitoringMetrics | null>(null);
  const [health, setHealth] = useState<KGSystemHealth | null>(null);
  const [alerts, setAlerts] = useState<KGAlert[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subscribed, setSubscribed] = useState<boolean>(false);

  // Keep track of subscription IDs
  const metricsSubscriptionId = useRef<string | null>(null);
  const alertsSubscriptionId = useRef<string | null>(null);
  const healthSubscriptionId = useRef<string | null>(null);

  // Get the ecosystem WebSocket client
  const wsClient = getEcosystemWebSocket();

  // Handle connection status changes
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      logger.info('[KG-Monitoring] Connected to ecosystem WebSocket');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setSubscribed(false);
      logger.info('[KG-Monitoring] Disconnected from ecosystem WebSocket');
    };

    const handleError = (error: any) => {
      logger.error('[KG-Monitoring] WebSocket connection error', { error });
      setIsConnected(false);
    };

    // Set initial connection status
    setIsConnected(wsClient.getStatus() === 'connected');

    // Subscribe to connection events
    wsClient.on('connected', handleConnected);
    wsClient.on('disconnected', handleDisconnected);
    wsClient.on('connection_error', handleError);

    return () => {
      // Clean up event listeners
      wsClient.off('connected', handleConnected);
      wsClient.off('disconnected', handleDisconnected);
      wsClient.off('connection_error', handleError);
    };
  }, []);

  // Subscribe to metrics channel
  const subscribeToMetrics = useCallback(() => {
    if (!isConnected || subscribed) return;

    // Subscribe to KG metrics channel
    metricsSubscriptionId.current = wsClient.subscribe('kg-metrics', (data: KGMonitoringMetrics) => {
      setMetrics(data);
      setLastUpdated(new Date());
      logger.debug('[KG-Monitoring] Received metrics update');
    });

    // Subscribe to KG alerts channel
    alertsSubscriptionId.current = wsClient.subscribe('kg-alerts', (data: KGAlert) => {
      setAlerts(prevAlerts => {
        const newAlerts = [data, ...prevAlerts].slice(0, maxAlerts);
        logger.info(`[KG-Monitoring] New alert: ${data.severity} - ${data.message}`);
        return newAlerts;
      });
    });

    // Subscribe to KG health channel
    healthSubscriptionId.current = wsClient.subscribe('kg-health', (data: KGSystemHealth) => {
      setHealth(data);
      logger.debug('[KG-Monitoring] Received health update');
    });

    setSubscribed(true);
    logger.info('[KG-Monitoring] Subscribed to KG monitoring channels');
  }, [isConnected, subscribed, maxAlerts]);

  // Unsubscribe from metrics channel
  const unsubscribeFromMetrics = useCallback(() => {
    if (!subscribed) return;

    if (metricsSubscriptionId.current) {
      wsClient.unsubscribe(metricsSubscriptionId.current);
      metricsSubscriptionId.current = null;
    }

    if (alertsSubscriptionId.current) {
      wsClient.unsubscribe(alertsSubscriptionId.current);
      alertsSubscriptionId.current = null;
    }

    if (healthSubscriptionId.current) {
      wsClient.unsubscribe(healthSubscriptionId.current);
      healthSubscriptionId.current = null;
    }

    setSubscribed(false);
    logger.info('[KG-Monitoring] Unsubscribed from KG monitoring channels');
  }, [subscribed]);

  // Auto subscribe/unsubscribe when connection status changes
  useEffect(() => {
    if (isConnected && autoSubscribe && !subscribed) {
      subscribeToMetrics();
    }
    
    return () => {
      if (subscribed) {
        unsubscribeFromMetrics();
      }
    };
  }, [isConnected, autoSubscribe, subscribed, subscribeToMetrics, unsubscribeFromMetrics]);

  // Add test alert for development purposes
  const addTestAlert = useCallback((severity: 'info' | 'warning' | 'error' | 'critical' = 'info') => {
    const testAlert: KGAlert = {
      id: `test-${Date.now()}`,
      severity,
      message: `Test ${severity} alert from KG Monitoring`,
      timestamp: new Date().toISOString(),
      component: 'KG-Monitor',
      details: { source: 'test', context: 'manual trigger' }
    };
    
    setAlerts(prevAlerts => [testAlert, ...prevAlerts].slice(0, maxAlerts));
  }, [maxAlerts]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    isConnected,
    metrics,
    health,
    alerts,
    lastUpdated,
    subscribed,
    subscribeToMetrics,
    unsubscribeFromMetrics,
    addTestAlert,
    clearAlerts
  };
}
