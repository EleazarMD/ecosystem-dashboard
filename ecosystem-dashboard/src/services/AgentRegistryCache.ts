/**
 * Agent Registry Cache Service
 * 
 * High-performance caching layer for Agent Registry Hub
 * Implements intelligent cache invalidation and optimization
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  compressionEnabled: boolean;
}

class AgentRegistryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 60000, // 1 minute
      maxSize: config.maxSize || 1000,
      cleanupInterval: config.cleanupInterval || 300000, // 5 minutes
      compressionEnabled: config.compressionEnabled || false
    };

    this.startCleanupTimer();
  }

  /**
   * Get cached value with automatic TTL and LRU management
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check TTL
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics for LRU
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached value with optional TTL override
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.config.defaultTTL;

    // Enforce cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data: this.config.compressionEnabled ? this.compress(data) : data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let invalidated = 0;

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      maxSize: this.config.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Cached agent configuration getter with intelligent invalidation
   */
  getAgentConfig(agentId: string) {
    return this.get<any>(`agent:config:${agentId}`);
  }

  /**
   * Cached agent configuration setter with dependency tracking
   */
  setAgentConfig(agentId: string, config: any, ttl?: number) {
    this.set(`agent:config:${agentId}`, config, ttl);
    
    // Invalidate related cache entries
    this.invalidatePattern(`metrics:*`);
    this.invalidatePattern(`stats:*`);
  }

  /**
   * Cached metrics with short TTL for real-time updates
   */
  getMetrics(key: string) {
    return this.get(`metrics:${key}`);
  }

  setMetrics(key: string, metrics: any) {
    // Shorter TTL for metrics (30 seconds)
    this.set(`metrics:${key}`, metrics, 30000);
  }

  /**
   * Cached model statistics with medium TTL
   */
  getModelStats() {
    return this.get('stats:model_distribution');
  }

  setModelStats(stats: any) {
    // Medium TTL for stats (2 minutes)
    this.set('stats:model_distribution', stats, 120000);
  }

  /**
   * Preload cache with essential data
   */
  async preload(agentIds: string[]) {
    console.log('🔄 Preloading agent registry cache...');
    
    const preloadPromises = agentIds.map(async (agentId) => {
      try {
        // This would fetch from actual source if not cached
        const response = await fetch(`/api/ahis/agents?agentId=${agentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.agent) {
            this.setAgentConfig(agentId, data.agent);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to preload agent ${agentId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('✅ Cache preload completed');
  }

  // Private helper methods

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  private compress<T>(data: T): T {
    // Simple compression - could use actual compression library
    if (typeof data === 'string' && data.length > 1000) {
      // For demo purposes, just return as-is
      // In production, use libraries like pako for gzip compression
      return data;
    }
    return data;
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      totalSize += key.length * 2; // Unicode characters are 2 bytes
      totalSize += JSON.stringify(entry.data).length * 2;
      totalSize += 64; // Metadata overhead estimate
    }

    return totalSize;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Global cache instance
export const agentRegistryCache = new AgentRegistryCache({
  defaultTTL: 60000, // 1 minute
  maxSize: 500,      // 500 entries
  cleanupInterval: 300000, // 5 minutes
  compressionEnabled: false
});

export default AgentRegistryCache;
