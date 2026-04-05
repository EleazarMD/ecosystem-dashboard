/**
 * Connection Pool Manager for Dashboard APIs
 * Prevents memory leaks from excessive HTTP client creation
 */

import axios, { AxiosInstance } from 'axios';

interface PooledClient {
  client: AxiosInstance;
  lastUsed: number;
  requestCount: number;
}

class ConnectionPool {
  private static instance: ConnectionPool;
  private pools = new Map<string, PooledClient>();
  private readonly maxIdleTime = 300000; // 5 minutes
  private readonly maxRequestsPerClient = 1000;
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up idle connections every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 120000);
  }

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  getClient(baseURL: string, timeout = 5000): AxiosInstance {
    const key = `${baseURL}_${timeout}`;
    const now = Date.now();
    
    let pooledClient = this.pools.get(key);
    
    // Create new client if none exists or if current one is overused
    if (!pooledClient || pooledClient.requestCount > this.maxRequestsPerClient) {
      if (pooledClient) {
        this.pools.delete(key);
      }
      
      pooledClient = {
        client: axios.create({
          baseURL,
          timeout,
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=5, max=1000'
          }
        }),
        lastUsed: now,
        requestCount: 0
      };
      
      this.pools.set(key, pooledClient);
    }
    
    // Update usage stats
    pooledClient.lastUsed = now;
    pooledClient.requestCount++;
    
    return pooledClient.client;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Convert entries to array to avoid iterator issues
    const poolEntries = Array.from(this.pools.entries());
    
    for (const [key, pooledClient] of poolEntries) {
      if (now - pooledClient.lastUsed > this.maxIdleTime) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.pools.delete(key);
    });
    
    // Only log if significant cleanup occurred
    if (keysToDelete.length > 5) {
      console.log(`[ConnectionPool] Cleaned up ${keysToDelete.length} idle connections`);
    }
  }

  // Add method to get active connection count
  getActiveConnectionCount(): number {
    return this.pools.size;
  }

  // Force cleanup of all connections
  forceCleanup(): void {
    const count = this.pools.size;
    this.pools.clear();
    if (count > 0) {
      console.log(`[ConnectionPool] Force cleaned up ${count} connections`);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.pools.clear();
  }

  getStats() {
    return {
      activeConnections: this.pools.size,
      totalRequests: Array.from(this.pools.values()).reduce((sum, client) => sum + client.requestCount, 0)
    };
  }
}

export default ConnectionPool;
