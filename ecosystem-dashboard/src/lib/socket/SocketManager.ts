/**
 * SocketManager - Notion-style WebSocket client
 * Maintains persistent connection for real-time updates
 */

import { io, Socket } from 'socket.io-client';

export interface RecordVersionUpdate {
  recordId: string;
  version: number;
  type: 'block' | 'page' | 'database';
  workspaceId: string;
}

export interface TransactionResult {
  success: boolean;
  recordId: string;
  version: number;
  timestamp: number;
}

type EventCallback = (data: any) => void;

export class SocketManager {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private subscribers: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private pendingWorkspaceId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private url: string;

  constructor(url?: string) {
    // Use provided URL, or derive from window location, or fallback to localhost
    if (url) {
      this.url = url;
    } else if (typeof window !== 'undefined') {
      // Use the current origin to support access from any IP/hostname
      this.url = window.location.origin;
    } else {
      this.url = 'http://localhost:8404';
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(workspaceId?: string): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Already connected
    if (this.socket?.connected) {
      if (workspaceId) {
        this.joinWorkspace(workspaceId);
      }
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve) => {
      const connectionTimeout = setTimeout(() => {
        console.warn('[SocketManager] ⚠️ Connection timeout - resolving anyway (will retry in background)');
        this.connectionPromise = null;
        resolve(); // Don't block the app on WebSocket connection
      }, 5000); // 5 second timeout

      console.log('[SocketManager] Connecting to:', this.url);

      this.socket = io(this.url, {
        transports: ['polling', 'websocket'], // Try polling first, then upgrade
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
        forceNew: false,
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('[SocketManager] ✅ Connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.connectionPromise = null;

        // Join workspace room if provided
        if (workspaceId) {
          this.joinWorkspace(workspaceId);
        } else if (this.pendingWorkspaceId) {
          this.joinWorkspace(this.pendingWorkspaceId);
          this.pendingWorkspaceId = null;
        }

        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[SocketManager] ❌ Disconnected:', reason);
        this.connected = false;
        this.connectionPromise = null;
      });

      this.socket.on('connect_error', (error) => {
        // Silently handle connection errors - don't spam console
        if (this.reconnectAttempts === 0) {
          console.warn('[SocketManager] ⚠️ Connection error (will retry in background):', error.message);
        }
        this.reconnectAttempts++;

        // Don't reject on errors - let it retry in background
        // App should work without WebSocket
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`[SocketManager] ♻️ Reconnected after ${attemptNumber} attempts`);
        this.connected = true;
        this.reconnectAttempts = 0;

        // Re-join workspace if we had one
        if (this.pendingWorkspaceId) {
          this.joinWorkspace(this.pendingWorkspaceId);
        }
      });

      // Setup record version listeners
      this.socket.on('record:version_update', (data: RecordVersionUpdate) => {
        console.log('[SocketManager] 📦 Version update:', data);
        this.emit('record:version_update', data);
      });

      this.socket.on('block:created', (data) => {
        console.log('[SocketManager] 🆕 Block created:', data);
        this.emit('block:created', data);
      });

      this.socket.on('block:updated', (data) => {
        console.log('[SocketManager] ✏️ Block updated:', data);
        this.emit('block:updated', data);
      });

      this.socket.on('block:deleted', (data) => {
        console.log('[SocketManager] 🗑️ Block deleted:', data);
        this.emit('block:deleted', data);
      });
    });

    return this.connectionPromise;
  }

  /**
   * Join workspace room for targeted updates
   */
  joinWorkspace(workspaceId: string): void {
    this.pendingWorkspaceId = workspaceId;

    if (!this.socket) {
      console.warn('[SocketManager] Socket not initialized, workspace join will happen on connect');
      return;
    }

    if (!this.socket.connected) {
      console.warn('[SocketManager] Socket not connected, workspace join will happen on reconnect');
      return;
    }

    console.log('[SocketManager] Joining workspace:', workspaceId);
    this.socket.emit('join:workspace', { workspaceId });
  }

  /**
   * Leave workspace room
   */
  leaveWorkspace(workspaceId: string): void {
    if (!this.socket) return;

    console.log('[SocketManager] Leaving workspace:', workspaceId);
    this.socket.emit('leave:workspace', { workspaceId });
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }

    this.subscribers.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Emit event to subscribers
   */
  private emit(event: string, data: any): void {
    const callbacks = this.subscribers.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Send transaction to server (Notion-style saveTransaction)
   */
  async saveTransaction(transaction: {
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      recordId: string;
      recordType: 'block' | 'page';
      data?: any;
    }>;
    workspaceId: string;
  }): Promise<TransactionResult[]> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Transaction timeout'));
      }, 10000);

      this.socket!.emit('transaction:save', transaction, (response: any) => {
        clearTimeout(timeout);

        if (response.success) {
          resolve(response.results);
        } else {
          reject(new Error(response.error || 'Transaction failed'));
        }
      });
    });
  }

  /**
   * Request sync for specific records (Notion-style syncRecordValues)
   */
  async syncRecordValues(recordIds: string[]): Promise<any[]> {
    if (!this.socket?.connected) {
      throw new Error('Socket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Sync timeout'));
      }, 10000);

      this.socket!.emit('sync:records', { recordIds }, (response: any) => {
        clearTimeout(timeout);

        if (response.success) {
          resolve(response.records);
        } else {
          reject(new Error(response.error || 'Sync failed'));
        }
      });
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('[SocketManager] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      connected: this.connected,
      reconnectAttempts: this.reconnectAttempts,
      subscriberCount: Array.from(this.subscribers.values())
        .reduce((sum, set) => sum + set.size, 0)
    };
  }
}

/**
 * Global socket manager instance
 */
export const socketManager = new SocketManager();
