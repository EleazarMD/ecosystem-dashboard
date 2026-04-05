/**
 * useDGXSparkStream - React hook for real-time AI Training Hub SSE streaming
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { HubStatus, trainingHubApi } from '@/services/dgxSparkApi';

interface UseDGXSparkStreamOptions {
  enabled?: boolean;
  onError?: (error: Event) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface UseDGXSparkStreamResult {
  data: HubStatus | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

export function useDGXSparkStream(options: UseDGXSparkStreamOptions = {}): UseDGXSparkStreamResult {
  const {
    enabled = true,
    onError,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [data, setData] = useState<HubStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsConnecting(true);
    setError(null);

    try {
      const eventSource = trainingHubApi.createStream(
        (newData) => {
          setData(newData);
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          reconnectAttemptsRef.current = 0;
        },
        (err) => {
          setIsConnected(false);
          setIsConnecting(false);
          
          if (onError) {
            onError(err);
          }

          // Attempt reconnection
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            setError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay);
          } else {
            setError('Max reconnection attempts reached. Click to retry.');
          }
        }
      );

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };
    } catch (err) {
      setIsConnecting(false);
      setError('Failed to create stream connection');
    }
  }, [onError, reconnectDelay, maxReconnectAttempts]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    data,
    isConnected,
    isConnecting,
    error,
    reconnect,
    disconnect,
  };
}

export default useDGXSparkStream;
