/**
 * AI Homelab Ecosystem WebSocket Client
 * 
 * This module implements the standardized WebSocket client following the 
 * AI Homelab Ecosystem communication protocol standards.
 * 
 * @module ecosystem-websocket
 * @implements AI Homelab Ecosystem Communication Standards v2.5
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import logger from './logger';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketConfig {
  endpoint: string;
  namespace?: string;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  autoConnect?: boolean;
  auth?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  id: string;
  timestamp: string;
  source?: string;
  target?: string;
}

/**
 * AI Homelab Ecosystem WebSocket Client
 * Implements standardized WebSocket communication for the ecosystem
 */
class EcosystemWebSocket extends EventEmitter {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private serviceId: string;
  private subscriptions: Map<string, (data: any) => void> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error' = 'disconnected';
  private reconnectTimer: NodeJS.Timeout | null = null;
  // Track channel -> set of subscription IDs
  private channelSubscriptions: Map<string, Set<string>> = new Map();
  // Track channel -> shared message handler reference for proper removal
  private channelHandlers: Map<string, (message: WebSocketMessage) => void> = new Map();

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
      ...config
    };
    this.serviceId = `dashboard-${uuidv4().substring(0, 8)}`;

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (this.socket || this.connectionStatus === 'connecting') return;

    this.connectionStatus = 'connecting';
    logger.info('[Ecosystem-WS] Connecting to WebSocket server', { endpoint: this.config.endpoint });

    try {
      const path = this.config.namespace ? `/${this.config.namespace}` : '/socket';
      
      this.socket = io(this.config.endpoint, {
        path,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        auth: {
          ...this.config.auth,
          serviceId: this.serviceId,
          serviceType: 'monitoring-dashboard',
          version: process.env.NEXT_PUBLIC_VERSION || 'development'
        }
      });

      this.setupEventHandlers();
    } catch (error) {
      logger.error('[Ecosystem-WS] Error connecting to WebSocket server', { error });
      this.connectionStatus = 'error';
      this.emit('connection_error', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
    this.connectionStatus = 'disconnected';
    logger.info('[Ecosystem-WS] Disconnected from WebSocket server');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clean up any channel handlers to prevent listener accumulation across reconnects
    this.cleanupAllChannelHandlers();
  }

  /**
   * Subscribe to a specific channel
   * @param channel Channel to subscribe to
   * @param callback Callback to execute when messages are received
   * @returns Subscription ID
   */
  public subscribe(channel: string, callback: (data: any) => void): string {
    if (!this.socket) {
      this.connect();
    }

    const subscriptionId = `sub_${uuidv4()}`;
    this.subscriptions.set(subscriptionId, callback);

    // Track subscription under the channel
    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
    }
    this.channelSubscriptions.get(channel)!.add(subscriptionId);

    if (this.socket && this.connectionStatus === 'connected') {
      this.socket.emit('ecosystem:subscribe', { channel, subscriptionId });
      logger.info(`[Ecosystem-WS] Subscribed to channel: ${channel}`, { subscriptionId });
    } else {
      // Queue the subscription for when connection is established
      this.once('connected', () => {
        if (this.socket) {
          this.socket.emit('ecosystem:subscribe', { channel, subscriptionId });
          logger.info(`[Ecosystem-WS] Subscribed to channel: ${channel}`, { subscriptionId });
        }
      });
    }

    // Set up a single shared message handler per channel if not already done
    if (this.socket && !this.channelHandlers.has(channel)) {
      const evt = `ecosystem:message:${channel}`;
      const handler = (message: WebSocketMessage) => {
        logger.debug(`[Ecosystem-WS] Received message on channel: ${channel}`, { messageId: message.id });

        const subs = this.channelSubscriptions.get(channel);
        if (!subs || subs.size === 0) return;

        // Forward message only to subscribers registered under this channel
        subs.forEach((subId) => {
          const cb = this.subscriptions.get(subId);
          if (!cb) return;
          try {
            cb(message.payload);
          } catch (error) {
            logger.error(`[Ecosystem-WS] Error in subscription handler for ${subId}`, { error });
          }
        });
      };
      this.channelHandlers.set(channel, handler);
      this.socket.on(evt, handler);
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from a channel using the subscription ID
   * @param subscriptionId Subscription ID to unsubscribe
   */
  public unsubscribe(subscriptionId: string): void {
    if (!this.subscriptions.has(subscriptionId)) {
      return;
    }

    // Find the channel this subscription belongs to and remove it
    let channelToClean: string | null = null;
    for (const [channel, subs] of this.channelSubscriptions.entries()) {
      if (subs.has(subscriptionId)) {
        subs.delete(subscriptionId);
        channelToClean = channel;
        if (subs.size === 0) {
          // Remove socket listener for the channel when no subscribers remain
          this.removeChannelHandler(channel);
          this.channelSubscriptions.delete(channel);
        }
        break;
      }
    }

    this.subscriptions.delete(subscriptionId);

    if (this.socket && this.connectionStatus === 'connected') {
      this.socket.emit('ecosystem:unsubscribe', { subscriptionId, channel: channelToClean || undefined });
      logger.info(`[Ecosystem-WS] Unsubscribed: ${subscriptionId}`);
    }
  }

  /**
   * Publish a message to a channel
   * @param channel Channel to publish to
   * @param data Data to publish
   * @param target Optional target service
   */
  public publish(channel: string, data: any, target?: string): void {
    if (!this.socket || this.connectionStatus !== 'connected') {
      logger.warn('[Ecosystem-WS] Cannot publish: not connected');
      return;
    }

    const message: WebSocketMessage = {
      type: 'data',
      payload: data,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      source: this.serviceId,
      target
    };

    this.socket.emit('ecosystem:publish', { channel, message });
    logger.debug(`[Ecosystem-WS] Published to channel: ${channel}`, { messageId: message.id });
  }

  /**
   * Get current connection status
   */
  public getStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    return this.connectionStatus;
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('[Ecosystem-WS] Connected to WebSocket server');
      this.connectionStatus = 'connected';
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      logger.info(`[Ecosystem-WS] Disconnected from WebSocket server: ${reason}`);
      this.connectionStatus = 'disconnected';
      this.emit('disconnected', reason);

      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.scheduleReconnect();
      }

      // Ensure listeners do not pile up across reconnects
      this.cleanupAllChannelHandlers();
    });

    this.socket.on('connect_error', (error) => {
      logger.error('[Ecosystem-WS] Connection error', { error });
      this.connectionStatus = 'error';
      this.emit('connection_error', error);
      this.scheduleReconnect();
    });

    this.socket.on('ecosystem:error', (error) => {
      logger.error('[Ecosystem-WS] Server error', { error });
      this.emit('server_error', error);
    });

    // Handle service discovery and heartbeat
    this.socket.on('ecosystem:discovery', (data) => {
      this.socket?.emit('ecosystem:discovery:response', {
        serviceId: this.serviceId,
        serviceType: 'monitoring-dashboard',
        capabilities: ['monitoring', 'kg-metrics'],
        version: process.env.NEXT_PUBLIC_VERSION || 'development'
      });
    });

    this.socket.on('ecosystem:heartbeat', () => {
      this.socket?.emit('ecosystem:heartbeat:response', {
        serviceId: this.serviceId,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      logger.info('[Ecosystem-WS] Attempting to reconnect...');
      this.connect();
    }, this.config.reconnectionDelay);
  }

  /**
   * Remove socket listener for a specific channel, if present
   */
  private removeChannelHandler(channel: string): void {
    if (!this.socket) return;
    const handler = this.channelHandlers.get(channel);
    if (handler) {
      const evt = `ecosystem:message:${channel}`;
      this.socket.off(evt, handler);
      this.channelHandlers.delete(channel);
      logger.debug(`[Ecosystem-WS] Removed channel handler for ${channel}`);
    }
  }

  /**
   * Cleanup all per-channel listeners and empty maps
   */
  private cleanupAllChannelHandlers(): void {
    if (this.socket) {
      for (const [channel, handler] of this.channelHandlers.entries()) {
        const evt = `ecosystem:message:${channel}`;
        this.socket.off(evt, handler);
      }
    }
    this.channelHandlers.clear();
    // Do not clear channelSubscriptions here; active subscribers may still exist logically
  }

  /**
   * Destroy the websocket client completely (for app shutdown)
   */
  public destroy(): void {
    // Prevent any future reconnects
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupAllChannelHandlers();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.removeAllListeners();
    this.connectionStatus = 'disconnected';
    this.subscriptions.clear();
    this.channelSubscriptions.clear();
  }
}

// Create singleton instance for the monitoring dashboard
let websocketInstance: EcosystemWebSocket | null = null;

/**
 * Get or create the ecosystem WebSocket instance
 */
export function getEcosystemWebSocket(config?: WebSocketConfig): EcosystemWebSocket {
  if (!websocketInstance && config) {
    websocketInstance = new EcosystemWebSocket(config);
  } else if (!websocketInstance) {
    // Default configuration for dashboard
    websocketInstance = new EcosystemWebSocket({
      endpoint: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8404',
      namespace: 'api/ecosystem-ws',
      reconnectionAttempts: 15,
      reconnectionDelay: 3000
    });
  }

  return websocketInstance;
}

export default {
  getEcosystemWebSocket
};
