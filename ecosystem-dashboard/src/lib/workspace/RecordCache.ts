/**
 * RecordCache - Notion-style LRU cache for blocks
 * Stores accessed blocks locally for faster rendering and offline capability
 */

interface CacheEntry<T> {
  data: T;
  version: number;
  timestamp: number;
}

export class RecordCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
  }

  /**
   * Get record from cache
   */
  get(recordId: string): T | null {
    const entry = this.cache.get(recordId);
    
    if (!entry) {
      return null;
    }

    // Update access order (LRU)
    this.updateAccessOrder(recordId);
    
    return entry.data;
  }

  /**
   * Get record with version
   */
  getWithVersion(recordId: string): { data: T; version: number } | null {
    const entry = this.cache.get(recordId);
    
    if (!entry) {
      return null;
    }

    this.updateAccessOrder(recordId);
    
    return {
      data: entry.data,
      version: entry.version
    };
  }

  /**
   * Set record in cache
   */
  set(recordId: string, data: T, version: number): void {
    // If cache is full, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(recordId)) {
      this.evictLRU();
    }

    this.cache.set(recordId, {
      data,
      version,
      timestamp: Date.now()
    });

    this.updateAccessOrder(recordId);
  }

  /**
   * Check if record exists and get version
   */
  getVersion(recordId: string): number | null {
    const entry = this.cache.get(recordId);
    return entry ? entry.version : null;
  }

  /**
   * Check if cached version is stale
   */
  isStale(recordId: string, serverVersion: number): boolean {
    const cachedVersion = this.getVersion(recordId);
    return cachedVersion === null || cachedVersion < serverVersion;
  }

  /**
   * Invalidate record
   */
  invalidate(recordId: string): void {
    this.cache.delete(recordId);
    this.accessOrder = this.accessOrder.filter(id => id !== recordId);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Prefetch multiple records
   */
  prefetch(records: Array<{ id: string; data: T; version: number }>): void {
    records.forEach(({ id, data, version }) => {
      this.set(id, data, version);
    });
  }

  /**
   * Get multiple records
   */
  getMany(recordIds: string[]): Map<string, T> {
    const results = new Map<string, T>();
    
    recordIds.forEach(id => {
      const data = this.get(id);
      if (data) {
        results.set(id, data);
      }
    });

    return results;
  }

  /**
   * Get stale record IDs that need syncing
   */
  getStaleIds(serverVersions: Map<string, number>): string[] {
    const staleIds: string[] = [];

    serverVersions.forEach((serverVersion, recordId) => {
      if (this.isStale(recordId, serverVersion)) {
        staleIds.push(recordId);
      }
    });

    return staleIds;
  }

  // Private methods

  private updateAccessOrder(recordId: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(id => id !== recordId);
    // Add to end (most recently used)
    this.accessOrder.push(recordId);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    // Remove least recently used (first in array)
    const lruId = this.accessOrder.shift();
    if (lruId) {
      this.cache.delete(lruId);
      console.log('[RecordCache] Evicted LRU record:', lruId);
    }
  }

  private calculateHitRate(): number {
    // Simple implementation - could be enhanced
    return this.cache.size / this.maxSize;
  }
}

/**
 * Global RecordCache instance for blocks
 */
export const blockCache = new RecordCache<any>(1000);

/**
 * Cache manager with automatic sync
 */
export class CacheManager {
  private cache: RecordCache<any>;
  private pendingSync: Set<string>;
  private syncCallbacks: Map<string, Function>;

  constructor(cache: RecordCache<any>) {
    this.cache = cache;
    this.pendingSync = new Set();
    this.syncCallbacks = new Map();
  }

  /**
   * Get record with automatic sync if stale
   */
  async getWithSync(
    recordId: string,
    serverVersion: number,
    fetchFn: (id: string) => Promise<any>
  ): Promise<any> {
    // Check cache first
    const cached = this.cache.getWithVersion(recordId);

    if (cached && cached.version >= serverVersion) {
      // Cache is fresh
      return cached.data;
    }

    // Cache is stale or missing, fetch from server
    if (!this.pendingSync.has(recordId)) {
      this.pendingSync.add(recordId);
      
      try {
        const data = await fetchFn(recordId);
        this.cache.set(recordId, data, serverVersion);
        this.pendingSync.delete(recordId);
        
        // Trigger callbacks
        const callback = this.syncCallbacks.get(recordId);
        if (callback) {
          callback(data);
          this.syncCallbacks.delete(recordId);
        }
        
        return data;
      } catch (error) {
        this.pendingSync.delete(recordId);
        throw error;
      }
    }

    // Sync already in progress, wait for it
    return new Promise((resolve) => {
      this.syncCallbacks.set(recordId, resolve);
    });
  }

  /**
   * Batch sync multiple records
   */
  async syncRecords(
    recordVersions: Map<string, number>,
    batchFetchFn: (ids: string[]) => Promise<any[]>
  ): Promise<void> {
    const staleIds = this.cache.getStaleIds(recordVersions);

    if (staleIds.length === 0) {
      console.log('[CacheManager] All records up to date');
      return;
    }

    console.log(`[CacheManager] Syncing ${staleIds.length} stale records`);

    try {
      const records = await batchFetchFn(staleIds);
      
      records.forEach((record) => {
        const version = recordVersions.get(record.id) || 0;
        this.cache.set(record.id, record, version);
      });

      console.log('[CacheManager] Sync complete');
    } catch (error) {
      console.error('[CacheManager] Sync failed:', error);
      throw error;
    }
  }
}

export const blockCacheManager = new CacheManager(blockCache);
