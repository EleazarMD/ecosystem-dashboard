/**
 * Real-Time Security WebSocket Hook
 * Connects to AI Gateway WebSocket for live security updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SecurityAlert {
  alert_id: string;
  rule_id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  status: string;
  triggered_at: string;
  context?: Record<string, unknown>;
}

export interface SecurityAnomaly {
  anomaly_id: string;
  anomaly_type: string;
  severity: string;
  description: string;
  detected_at: string;
  status: string;
  context?: Record<string, unknown>;
}

export interface AuditEvent {
  event_id: string;
  event_type: string;
  actor: string;
  action: string;
  resource: string;
  outcome: string;
  severity: string;
  timestamp: string;
}

export interface HealthUpdate {
  status: string;
  uptime: number;
  providers?: Record<string, unknown>;
}

export interface MetricsUpdate {
  websocket: {
    connectedClients: number;
  };
  requests?: {
    total: number;
    success: number;
    failed: number;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSecurityWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  channels?: string[];
}

interface UseSecurityWebSocketReturn {
  status: ConnectionStatus;
  clientId: string | null;
  alerts: SecurityAlert[];
  anomalies: SecurityAnomaly[];
  auditEvents: AuditEvent[];
  health: HealthUpdate | null;
  metrics: MetricsUpdate | null;
  connect: () => void;
  disconnect: () => void;
  clearAlerts: () => void;
  clearAnomalies: () => void;
  clearAuditEvents: () => void;
}

const DEFAULT_CHANNELS = [
  'security:alerts',
  'security:anomalies', 
  'security:audit',
  'health',
  'metrics'
];

const MAX_EVENTS_BUFFER = 100;

export function useSecurityWebSocket(
  options: UseSecurityWebSocketOptions = {}
): UseSecurityWebSocketReturn {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    channels = DEFAULT_CHANNELS
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [clientId, setClientId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityAnomaly[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<HealthUpdate | null>(null);
  const [metrics, setMetrics] = useState<MetricsUpdate | null>(null);

  const getWebSocketUrl = useCallback(() => {
    const gatewayHost = process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || 'localhost';
    const gatewayInternalPort = process.env.NEXT_PUBLIC_AI_GATEWAY_INTERNAL_PORT || '7777';
    const apiKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'dashboard-main-2024-prod-key';
    
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${gatewayHost}:${gatewayInternalPort}/ws?apiKey=${apiKey}`;
  }, []);

  const subscribeToChannels = useCallback((ws: WebSocket) => {
    channels.forEach(channel => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel
      }));
    });
  }, [channels]);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'connection':
          setClientId(message.clientId);
          console.log('[SecurityWS] Connected:', message.clientId);
          break;

        case 'subscribed':
          console.log('[SecurityWS] Subscribed to:', message.channel);
          break;

        case 'security:alert':
          setAlerts(prev => {
            const newAlerts = [message.data, ...prev];
            return newAlerts.slice(0, MAX_EVENTS_BUFFER);
          });
          break;

        case 'security:anomaly':
          setAnomalies(prev => {
            const newAnomalies = [message.data, ...prev];
            return newAnomalies.slice(0, MAX_EVENTS_BUFFER);
          });
          break;

        case 'security:audit':
          setAuditEvents(prev => {
            const newEvents = [message.data, ...prev];
            return newEvents.slice(0, MAX_EVENTS_BUFFER);
          });
          break;

        case 'health':
          setHealth(message.data);
          break;

        case 'metrics':
          setMetrics(message.data);
          break;

        case 'error':
          console.error('[SecurityWS] Error:', message.error);
          break;

        default:
          console.log('[SecurityWS] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[SecurityWS] Failed to parse message:', error);
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    
    try {
      const url = getWebSocketUrl();
      console.log('[SecurityWS] Connecting to:', url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        subscribeToChannels(ws);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (error) => {
        console.error('[SecurityWS] WebSocket error:', error);
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        setClientId(null);
        wsRef.current = null;

        // Auto-reconnect logic
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[SecurityWS] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.log('[SecurityWS] Max reconnect attempts reached');
        }
      };
    } catch (error) {
      console.error('[SecurityWS] Failed to connect:', error);
      setStatus('error');
    }
  }, [getWebSocketUrl, handleMessage, subscribeToChannels, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStatus('disconnected');
    setClientId(null);
  }, [maxReconnectAttempts]);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const clearAnomalies = useCallback(() => setAnomalies([]), []);
  const clearAuditEvents = useCallback(() => setAuditEvents([]), []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    clientId,
    alerts,
    anomalies,
    auditEvents,
    health,
    metrics,
    connect,
    disconnect,
    clearAlerts,
    clearAnomalies,
    clearAuditEvents
  };
}
