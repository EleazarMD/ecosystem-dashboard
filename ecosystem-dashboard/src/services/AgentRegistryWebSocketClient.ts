/**
 * Agent Registry WebSocket Client
 * 
 * Real-time WebSocket client for agent registry updates
 * Provides live notifications when agents register, update, or change configuration
 */

import EventEmitter from 'events';

export interface AgentRegistryWSEvent {
  type: 'agent:registered' | 'agent:updated' | 'agent:deactivated' | 'agent:configuration:changed' | 'system:status';
  agentId?: string;
  agent?: any;
  configuration?: any;
  previousConfiguration?: any;
  changedFields?: string[];
  timestamp: string;
  source?: string;
  metadata?: Record<string, any>;
}

interface WSConnectionOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableCompression?: boolean;
  debug?: boolean;
}

class AgentRegistryWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private isDestroyed = false;
  
  private options: Required<WSConnectionOptions>;

  constructor(baseUrl: string = 'ws://localhost:8888', options: WSConnectionOptions = {}) {
    super();
    
    this.baseUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    this.options = {
      reconnectInterval: options.reconnectInterval || 3000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      heartbeatInterval: options.heartbeatInterval || 30000,
      enableCompression: options.enableCompression || true,
      debug: options.debug || false
    };
  }

  /**
   * Connect to Agent Registry WebSocket
   */
  async connect(): Promise<void> {
    if (this.isDestroyed || this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.log('🔄 Connecting to Agent Registry WebSocket...', this.baseUrl);

    try {
      // Create WebSocket connection to AHIS server
      const wsUrl = `${this.baseUrl}/ws/agent-registry`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.log('✅ Agent Registry WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Subscribe to agent registry events
        this.subscribe();
        
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data: AgentRegistryWSEvent = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          this.log('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        this.log('❌ Agent Registry WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = (event) => {
        this.log('🔌 Agent Registry WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        
        if (!this.isDestroyed && event.code !== 1000) {
          // Abnormal closure, attempt reconnect
          this.scheduleReconnect();
        }
        
        this.emit('disconnected', event);
      };

    } catch (error) {
      this.log('❌ Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to agent registry events
   */
  private subscribe(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscriptionMessage = {
        type: 'subscribe',
        topics: [
          'agent:registered',
          'agent:updated', 
          'agent:deactivated',
          'agent:configuration:changed',
          'system:status'
        ],
        clientId: 'ecosystem-dashboard',
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(subscriptionMessage));
      this.log('📡 Subscribed to agent registry events');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: AgentRegistryWSEvent): void {
    this.log('📨 Received agent registry event:', data.type, data.agentId);

    // Emit specific event types
    this.emit(data.type, data);
    
    // Emit general registry event
    this.emit('registry:event', data);

    // Handle specific event types
    switch (data.type) {
      case 'agent:registered':
        this.emit('agent:discovered', data.agent);
        break;
      case 'agent:configuration:changed':
        this.emit('configuration:changed', {
          agentId: data.agentId,
          configuration: data.configuration,
          changedFields: data.changedFields
        });
        break;
      case 'system:status':
        this.emit('system:update', data.metadata);
        break;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log('❌ Max reconnection attempts reached, giving up');
      this.emit('max_reconnect_attempts');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.min(this.reconnectAttempts, 5); // Exponential backoff, max 5x

    this.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Send message to server
   */
  send(message: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.log('❌ Failed to send WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    reconnectAttempts: number;
    readyState?: number;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws?.readyState
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.log('🔌 Disconnecting Agent Registry WebSocket');
    this.isDestroyed = true;
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.removeAllListeners();
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[AgentRegistryWS]', ...args);
    }
  }
}

export default AgentRegistryWebSocketClient;
