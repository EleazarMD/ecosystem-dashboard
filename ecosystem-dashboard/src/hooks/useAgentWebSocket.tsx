/**
 * WebSocket Hook for Real-time Agent Status Updates
 * 
 * Manages WebSocket connections to the Knowledge Graph Agent backend
 * for real-time task status updates and notifications.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AgentNotification {
  id: string;
  type: 'task_completed' | 'task_failed' | 'task_started' | 'agent_status' | 'workflow_update';
  title: string;
  message: string;
  taskId?: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  data?: any;
}

export interface AgentTaskStatus {
  taskId: string;
  command: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  results?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface UseAgentWebSocketProps {
  agentUrl?: string;
  autoConnect?: boolean;
  onNotification?: (notification: AgentNotification) => void;
  onTaskUpdate?: (task: AgentTaskStatus) => void;
}

export const useAgentWebSocket = ({
  agentUrl = process.env.NEXT_PUBLIC_A2A_AGENT_URL || 'ws://localhost:8888',
  autoConnect = true,
  onNotification,
  onTaskUpdate
}: UseAgentWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [activeTasks, setActiveTasks] = useState<Map<string, AgentTaskStatus>>(new Map());
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Skip WebSocket connection on server-side
    if (typeof window === 'undefined') {
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = agentUrl.replace(/^http/, 'ws') + '/ws';
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Agent WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to agent notifications
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          channels: ['task_updates', 'agent_status', 'workflow_events']
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'notification':
              const notification: AgentNotification = {
                id: data.id || `notif-${Date.now()}`,
                type: data.notificationType || 'agent_status',
                title: data.title,
                message: data.message,
                taskId: data.taskId,
                severity: data.severity || 'info',
                timestamp: data.timestamp || new Date().toISOString(),
                data: data.data
              };
              
              setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
              onNotification?.(notification);
              break;
              
            case 'task_update':
              const taskUpdate: AgentTaskStatus = {
                taskId: data.taskId,
                command: data.command,
                status: data.status,
                progress: data.progress,
                results: data.results,
                error: data.error,
                startedAt: data.startedAt,
                completedAt: data.completedAt
              };
              
              setActiveTasks(prev => new Map(prev.set(data.taskId, taskUpdate)));
              onTaskUpdate?.(taskUpdate);
              
              // Create notification for task completion
              if (data.status === 'completed' || data.status === 'failed') {
                const taskNotification: AgentNotification = {
                  id: `task-${data.taskId}`,
                  type: data.status === 'completed' ? 'task_completed' : 'task_failed',
                  title: `Task ${data.status === 'completed' ? 'Completed' : 'Failed'}`,
                  message: `${data.command} ${data.status === 'completed' ? 'completed successfully' : 'failed'}`,
                  taskId: data.taskId,
                  severity: data.status === 'completed' ? 'success' : 'error',
                  timestamp: new Date().toISOString(),
                  data: data.results || data.error
                };
                
                setNotifications(prev => [taskNotification, ...prev.slice(0, 49)]);
                onNotification?.(taskNotification);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Agent WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          setConnectionError('Max reconnection attempts reached');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('Agent WebSocket error:', error);
        setConnectionError('WebSocket connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to connect to agent');
    }
  }, [agentUrl, onNotification, onTaskUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return;
    }
    
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    notifications,
    activeTasks: Array.from(activeTasks.values()),
    connect,
    disconnect,
    sendMessage,
    clearNotifications,
    removeNotification
  };
};
