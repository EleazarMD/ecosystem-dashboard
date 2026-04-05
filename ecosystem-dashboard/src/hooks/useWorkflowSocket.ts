// Design based on: /Users/eleazar/CascadeProjects/ai-homelab-ecosystem/docs/technical/REALTIME_WORKFLOW_STATUS_WEBSOCKET_INTEGRATION.md

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// This should match the AI Gateway's base URL where WebSocket server is running
// The path /ws/agentic-workflows/ will be appended by socket.io-client options
const AI_GATEWAY_WS_URL = process.env.NEXT_PUBLIC_AI_GATEWAY_WS_URL || 'http://localhost:3001'; 
const WS_PATH = '/ws/agentic-workflows/'; // Must match server path configuration in AI Gateway

export interface WorkflowStatusUpdatePayload {
  workflowId: string;
  status: string;
  domain: string;
  workflowName: string;
  startTime: string;
  endTime?: string | null;
  lastUpdated: string;
  contextSnapshot?: any; // Optional, if changed
  result?: any; // If COMPLETED
  error?: { message: string; details?: string }; // If FAILED
}

interface SubscriptionAck {
  workflowId: string;
  room: string;
  status: 'subscribed' | 'unsubscribed';
}

interface SubscriptionError {
  workflowId: string;
  message: string;
}

interface ServerError {
  message: string;
  details?: string;
}

interface UseWorkflowSocketReturn {
  subscribeToWorkflow: (workflowId: string, callback: (update: WorkflowStatusUpdatePayload) => void) => void;
  unsubscribeFromWorkflow: (workflowId: string) => void;
  isConnected: boolean;
  lastSocketError?: string | null;
}

export const useWorkflowSocket = (): UseWorkflowSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSocketError, setLastSocketError] = useState<string | null>(null);
  // Stores callbacks for each subscribed workflowId
  const callbackMapRef = useRef<Map<string, (update: WorkflowStatusUpdatePayload) => void>>(new Map());

  useEffect(() => {
    // Retrieve auth token (e.g., from localStorage, Zustand, Redux, or React Context)
    // For now, using a placeholder. Replace with actual token retrieval logic.
    const authToken = localStorage.getItem('ahis_auth_token') || 'DUMMY_AUTH_TOKEN_REPLACE_ME'; 

    if (!authToken) {
      console.warn('AI Homelab: Auth token not found for WebSocket connection.');
      setLastSocketError('Authentication token not available.');
      return;
    }

    // Initialize the socket connection
    socketRef.current = io(AI_GATEWAY_WS_URL, {
      path: WS_PATH,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket'], // Prefer WebSocket directly
      auth: {
        token: authToken,
      },
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      setLastSocketError(null);
      console.log('AI Homelab: Connected to AI Gateway WebSocket via', WS_PATH);
      // Re-subscribe to all workflows that had active callbacks upon reconnection
      callbackMapRef.current.forEach((_, workflowId) => {
        console.log(`AI Homelab: Re-subscribing to ${workflowId} after reconnection`);
        socket.emit('subscribe_workflow_status', { workflowId });
      });
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      setLastSocketError(`Disconnected: ${reason}`);
      console.log('AI Homelab: Disconnected from AI Gateway WebSocket:', reason);
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setLastSocketError(`Connection Error: ${err.message}`);
      console.error('AI Homelab: WebSocket connection error:', err);
    });

    // Listen for custom events from the server
    socket.on('workflow_status_update', (data: WorkflowStatusUpdatePayload) => {
      console.log('AI Homelab: Received workflow_status_update:', data);
      const callback = callbackMapRef.current.get(data.workflowId);
      if (callback) {
        callback(data);
      }
    });

    socket.on('subscription_ack', (data: SubscriptionAck) => {
      console.log('AI Homelab: Subscription ACK:', data);
    });
    
    socket.on('unsubscription_ack', (data: SubscriptionAck) => {
      console.log('AI Homelab: Unsubscription ACK:', data);
    });

    socket.on('subscription_error', (data: SubscriptionError) => {
      console.error('AI Homelab: Subscription Error:', data);
      setLastSocketError(`Subscription error for ${data.workflowId}: ${data.message}`);
      // Optionally, remove the callback for this workflowId if subscription fails critically
      // callbackMapRef.current.delete(data.workflowId);
    });

    socket.on('server_error', (data: ServerError) => {
      console.error('AI Homelab: Server Error:', data);
      setLastSocketError(`Server error from WebSocket: ${data.message}`);
    });

    // Cleanup on component unmount
    return () => {
      if (socketRef.current) {
        console.log('AI Homelab: Disconnecting WebSocket on component unmount.');
        socketRef.current.disconnect();
        callbackMapRef.current.clear();
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  const subscribeToWorkflow = useCallback((workflowId: string, callback: (update: WorkflowStatusUpdatePayload) => void) => {
    if (!workflowId) {
        console.error('AI Homelab: workflowId is required to subscribe.');
        return;
    }
    if (socketRef.current?.connected) {
      console.log(`AI Homelab: Emitting 'subscribe_workflow_status' for ${workflowId}`);
      socketRef.current.emit('subscribe_workflow_status', { workflowId });
      callbackMapRef.current.set(workflowId, callback);
    } else {
      // Handle case where socket is not yet connected - queue subscription or log warning
      console.warn('AI Homelab: Socket not connected. Subscription attempt for', workflowId, 'deferred or failed.');
      setLastSocketError('Cannot subscribe: WebSocket not connected.');
      // Optionally, you could add to a queue and process on 'connect' event
    }
  }, []);

  const unsubscribeFromWorkflow = useCallback((workflowId: string) => {
    if (!workflowId) {
        console.error('AI Homelab: workflowId is required to unsubscribe.');
        return;
    }
    if (socketRef.current?.connected) {
      console.log(`AI Homelab: Emitting 'unsubscribe_workflow_status' for ${workflowId}`);
      socketRef.current.emit('unsubscribe_workflow_status', { workflowId });
      callbackMapRef.current.delete(workflowId);
    } else {
      console.warn('AI Homelab: Socket not connected. Unsubscription attempt for', workflowId, 'deferred or failed.');
       // No need to set error here as it might be a normal part of cleanup or workflow change
    }
  }, []);

  return { subscribeToWorkflow, unsubscribeFromWorkflow, isConnected, lastSocketError };
};
