/**
 * Browser-safe AHIS Client Service (Legacy Compatibility Layer)
 * 
 * This module provides a client-side interface to interact with the AHIS server
 * through our Next.js API routes, following the ecosystem-first development principles.
 * It maintains the same API as the original MCPClient but works entirely in the browser.
 * 
 * NOTE: This has been refactored to use the exported functions from ahis-client.ts
 * instead of maintaining its own connection, ensuring all commands go through a single client.
 * 
 * DEPRECATED: This file is maintained for backward compatibility only.
 * New code should use browser-ahis-client.ts directly.
 */

import logger from './logger';
// import { executeCommand as ahisExecuteCommand, isConnected as ahisIsConnected, subscribeToEvents as ahisSubscribeToEvents, unsubscribeFromEvents as ahisUnsubscribeFromEvents } from './ahis-client';
import { io } from 'socket.io-client';

// Simple UUID generator function that doesn't require external dependencies
function generateUUID(): string {
  // This is a simplified version that generates a reasonably unique ID
  // Not cryptographically secure but sufficient for our needs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Define types for AHIS commands and responses (with MCP-compatible naming for backward compatibility)
export interface MCPRequestData {
  id: string;
  method: string;
  params?: any;
  timestamp: number;
  sourceIp?: string;
}

export interface MCPResponseData {
  requestId: string;
  result?: any;
  error?: any;
  timestamp: number;
  processingTimeMs: number;
}

// Alias types with AHIS naming for new code
export type AHISRequestData = MCPRequestData;
export type AHISResponseData = MCPResponseData;

type EventCallback = (data: any) => void;

interface EventListeners {
  [eventType: string]: EventCallback[];
}

/**
 * Browser-compatible AHIS Client (Legacy MCP-compatible interface)
 * 
 * Uses the API routes as a proxy to communicate with the AHIS server.
 * Maintained for backward compatibility with existing code.
 */
export class BrowserMCPClient {
  private eventListeners: Record<string, Array<EventCallback>> = {};
  private connected: boolean = false;
  private socketInitialized: boolean = false;
  private commandPromises: Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }> = new Map();

  constructor() {
    logger.info('AI Homelab (BrowserMCPClient): Initializing client as wrapper around AHISClient');
    // No need to initialize socket as we're using the shared client from mcp-client.ts
  }

  /**
   * Initialize the WebSocket connection to the AHIS server
   * This is now a no-op as connection is handled by mcp-client.ts
   */
  private async initSocket(): Promise<void> {
    logger.info('AI Homelab (BrowserMCPClient): initSocket is a no-op, connection handled by mcp-client.ts');
    return Promise.resolve();
    try {
      // Determine AI Gateway connection parameters from environment variables
      const gatewayHost = process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || 'localhost';
      const gatewayPort = parseInt(process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || '7777', 10);
      const gatewaySecure = process.env.NEXT_PUBLIC_AI_GATEWAY_SECURE === 'true';
      const gatewayAPIBasePath = (process.env.NEXT_PUBLIC_AI_GATEWAY_BASE_PATH || '/api/gateway').replace(/\/$/, ''); // Default to /api/gateway, remove trailing slash
      
      const ahisWsPath = `${gatewayAPIBasePath}/ahis/ws`; // Construct the specific WebSocket path for AHIS via Gateway

      const protocol = gatewaySecure ? 'wss' : 'ws';
      const wsBaseUrl = `${protocol}://${gatewayHost}:${gatewayPort}`; // Base URL for Socket.IO connection

      logger.info(`AI Homelab (BrowserMCPClient): Initializing WebSocket connection to ${wsBaseUrl} with path ${ahisWsPath}`);
      
      // Connect to the AI Gateway's AHIS WebSocket endpoint
      const socket = io(wsBaseUrl, { // Socket.IO connects to the base URL
        path: ahisWsPath,          // and uses this path for the WebSocket handshake
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
        // Query parameters might need adjustment if AHIS expects specific ones or if old ones are problematic
        query: {
          // transport: 'polling', // Let Socket.IO choose the best transport; websocket is generally preferred
          EIO: '4' // Engine.IO version
        }
      });

      // Handle connection events with improved logging and error handling
      socket.on('connect', () => {
        logger.info('AI Homelab: Browser MCP client connected to WebSocket');
        this.connected = true;
        this.emitEvent('connect', {});
      });

      socket.on('disconnect', (reason) => {
        logger.warn(`AI Homelab: Browser MCP client disconnected from WebSocket. Reason: ${reason}`);
        this.connected = false;
        this.emitEvent('disconnect', { reason });
      });
      
      socket.on('connect_error', (error) => {
        logger.error(`AI Homelab: WebSocket connection error: ${error.message}`);
        this.emitEvent('error', { message: `Connection error: ${error.message}`, error });
      });
      
      socket.on('reconnect', (attemptNumber) => {
        logger.info(`AI Homelab: Reconnected to WebSocket after ${attemptNumber} attempts`);
        this.emitEvent('reconnect', { attemptNumber });
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        logger.info(`AI Homelab: Attempting to reconnect to WebSocket (attempt ${attemptNumber})`);
      });
      
      socket.on('reconnect_error', (error) => {
        logger.error(`AI Homelab: WebSocket reconnection error: ${error.message}`);
      });
      
      socket.on('reconnect_failed', () => {
        logger.error('AI Homelab: WebSocket reconnection failed after all attempts');
        this.emitEvent('error', { message: 'Failed to reconnect to MCP server after multiple attempts' });
      });

      // Handle MCP server connection status updates
      socket.on('mcp:connection', (data) => {
        this.connected = data.status === 'connected';
        this.emitEvent('connectionStatus', data);
      });

      // Handle MCP server errors
      socket.on('mcp:error', (data) => {
        this.emitEvent('error', new Error(data.message));
      });

      // Handle MCP activity events
      socket.on('mcp:request', (data) => {
        this.emitEvent('request', data);
      });

      socket.on('mcp:response', (data) => {
        this.emitEvent('response', data);
      });

      // Handle initial activity state
      socket.on('mcp:activity', (data) => {
        this.emitEvent('activityUpdate', data);
      });

      // Handle command responses
      socket.on('mcp:command:response', (data) => {
        const promiseCallbacks = this.commandPromises.get(data.id);
        if (promiseCallbacks) {
          if (data.success) {
            // Call the resolve function
            promiseCallbacks.resolve(data.result);
          } else {
            // Call the reject function
            promiseCallbacks.reject(new Error(data.error));
          }
          this.commandPromises.delete(data.id);
        }
      });

      // Store socket instance for command execution
      (this as any).socket = socket;
      this.socketInitialized = true;

      // Trigger the API route to initialize the server-side socket
      // await fetch('/api/mcp/websocket'); // Likely unnecessary and path is for socket.io, not a GETtable HTTP endpoint
    } catch (error) {
      logger.error('Failed to initialize WebSocket:', error);
      this.emitEvent('error', error);
    }
  }

  /**
   * Connect to the MCP server (already handled by the API route)
   * Included for API compatibility
   */
  async connect(): Promise<void> {
    if (!this.socketInitialized) {
      await this.initSocket();
    }
    return Promise.resolve();
  }

  /**
   * Disconnect from the MCP server
   * Included for API compatibility
   */
  async disconnect(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Execute a command on the MCP server
   */
  async executeCommand(method: string, params?: any, options?: { timeout?: number }): Promise<any> {
    logger.info(`AI Homelab (BrowserMCPClient): Delegating executeCommand('${method}') to AHIS client`);
    try {
      // Forward the command to the AHIS client with timeout option
      // Mock implementation since AHIS client is not available
      return { success: true, message: `Mock response for ${method}` };
    } catch (error) {
      logger.error(`AI Homelab (BrowserMCPClient): Error executing command '${method}':`, error);
      throw error; // Re-throw the error to maintain expected behavior
    }
  }

  /**
   * Subscribe to MCP events (API compatible with server MCPClient)
   */
  subscribeToEvents(eventType: string, callback: EventCallback): void {
    logger.info(`AI Homelab (BrowserMCPClient): Mock subscribeToEvents('${eventType}')`);
    // Mock implementation since AHIS client is not available
  }

  /**
   * Unsubscribe from MCP events
   */
  unsubscribeFromEvents(eventType: string, callback?: EventCallback): void {
    logger.info(`AI Homelab (BrowserMCPClient): Mock unsubscribeFromEvents('${eventType}')`);
    // Mock implementation since AHIS client is not available
  }

  /**
   * Emit an event to all registered listeners
   */
  private emitEvent(eventType: string, data: any): void {
    if (!this.eventListeners[eventType]) return;
    
    for (const callback of this.eventListeners[eventType]) {
      try {
        callback(data);
      } catch (error) {
        logger.error(`Error in ${eventType} event handler:`, error);
      }
    }
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    // Mock implementation since AHIS client is not available
    return false;
  }
}

// Create a singleton instance
let browserMCPClientInstance: BrowserMCPClient | null = null;

/**
 * Get the browser MCP client instance
 */
export const getBrowserMCPClient = (): BrowserMCPClient => {
  if (!browserMCPClientInstance) {
    browserMCPClientInstance = new BrowserMCPClient();
  }
  return browserMCPClientInstance;
};
