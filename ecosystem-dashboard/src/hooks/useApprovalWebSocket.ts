'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { ApprovalEvent } from '@/lib/websocket/approval-events';

interface UseApprovalWebSocketOptions {
  onApprovalCreated?: (event: ApprovalEvent) => void;
  onApprovalApproved?: (event: ApprovalEvent) => void;
  onApprovalDenied?: (event: ApprovalEvent) => void;
  onApprovalExpired?: (event: ApprovalEvent) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface UseApprovalWebSocketReturn {
  isConnected: boolean;
  lastEvent: ApprovalEvent | null;
  error: string | null;
  reconnect: () => void;
}

/**
 * Hook for real-time approval updates via WebSocket
 * 
 * Falls back to polling if WebSocket is not available
 */
export function useApprovalWebSocket(
  options: UseApprovalWebSocketOptions = {}
): UseApprovalWebSocketReturn {
  const {
    onApprovalCreated,
    onApprovalApproved,
    onApprovalDenied,
    onApprovalExpired,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ApprovalEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usePolling, setUsePolling] = useState(false);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.event?.startsWith('approval:')) {
        const approvalEvent = message.data as ApprovalEvent;
        setLastEvent(approvalEvent);

        switch (message.event) {
          case 'approval:created':
            onApprovalCreated?.(approvalEvent);
            break;
          case 'approval:approved':
            onApprovalApproved?.(approvalEvent);
            break;
          case 'approval:denied':
            onApprovalDenied?.(approvalEvent);
            break;
          case 'approval:expired':
            onApprovalExpired?.(approvalEvent);
            break;
        }
      }
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err);
    }
  }, [onApprovalCreated, onApprovalApproved, onApprovalDenied, onApprovalExpired]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!session?.user?.id) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/approvals`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setUsePolling(false);
        
        // Authenticate the connection
        ws.send(JSON.stringify({
          event: 'auth',
          data: { userId: session.user.id },
        }));
      };

      ws.onmessage = handleMessage;

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Fall back to polling or reconnect
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            // Try WebSocket first, fall back to polling after 3 attempts
            connect();
          }, reconnectInterval);
        }
      };

    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setUsePolling(true);
      setError('WebSocket not available, using polling');
    }
  }, [session?.user?.id, handleMessage, autoReconnect, reconnectInterval]);

  // Polling fallback
  const poll = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/security/approvals?status=pending&limit=10');
      if (response.ok) {
        const data = await response.json();
        
        // Check for new approvals
        if (data.approvals?.length > 0) {
          const latestApproval = data.approvals[0];
          
          // Only trigger if it's a new approval
          if (!lastEvent || latestApproval.id !== lastEvent.approvalId) {
            const event: ApprovalEvent = {
              type: 'approval:created',
              approvalId: latestApproval.id,
              userId: session.user.id,
              timestamp: latestApproval.createdAt,
              data: {
                toolName: latestApproval.toolName,
                agentId: latestApproval.agentId,
                riskLevel: latestApproval.riskLevel,
                status: latestApproval.status,
              },
            };
            setLastEvent(event);
            onApprovalCreated?.(event);
          }
        }
      }
    } catch (err) {
      console.error('[Polling] Error:', err);
    }
  }, [session?.user?.id, lastEvent, onApprovalCreated]);

  // Start polling if WebSocket is not available
  useEffect(() => {
    if (usePolling && session?.user?.id) {
      poll(); // Initial poll
      pollIntervalRef.current = setInterval(poll, 5000);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [usePolling, session?.user?.id, poll]);

  // Connect on mount
  useEffect(() => {
    if (session?.user?.id) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [session?.user?.id, connect]);

  const reconnect = useCallback(() => {
    setUsePolling(false);
    connect();
  }, [connect]);

  return {
    isConnected: isConnected || usePolling,
    lastEvent,
    error,
    reconnect,
  };
}
