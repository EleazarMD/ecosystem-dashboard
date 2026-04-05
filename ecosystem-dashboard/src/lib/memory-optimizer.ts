/**
 * Memory Optimizer - Aggressive memory leak prevention and garbage collection
 */

class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private lastGC: number = 0;

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  private startMemoryMonitoring(): void {
    // Force garbage collection every 30 seconds
    this.gcInterval = setInterval(() => {
      this.forceGarbageCollection();
    }, 30000);

    // Check memory usage every 10 seconds
    this.memoryCheckInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000);
  }

  private forceGarbageCollection(): void {
    const now = Date.now();
    if (now - this.lastGC < 15000) return; // Don't GC more than every 15 seconds

    if (global.gc) {
      const beforeMemory = process.memoryUsage();
      global.gc();
      const afterMemory = process.memoryUsage();
      
      const heapFreed = Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024);
      if (heapFreed > 10) {
        console.log(`[MemoryOptimizer] GC freed ${heapFreed}MB heap memory`);
      }
      
      this.lastGC = now;
    }
  }

  private checkMemoryUsage(): void {
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const rssUsedMB = Math.round(memory.rss / 1024 / 1024);

    // Aggressive memory management
    if (heapUsedMB > 800) {
      console.error(`[MemoryOptimizer] CRITICAL: Heap at ${heapUsedMB}MB - forcing immediate GC`);
      this.forceGarbageCollection();
    } else if (heapUsedMB > 400) {
      console.warn(`[MemoryOptimizer] HIGH: Heap at ${heapUsedMB}MB - scheduling GC`);
      setTimeout(() => this.forceGarbageCollection(), 1000);
    }
  }

  // Clean up large objects and arrays
  cleanupLargeObjects(): void {
    // Force cleanup of any cached data
    if (global.gc) {
      global.gc();
    }
  }

  // Get current memory stats
  getMemoryStats() {
    const memory = process.memoryUsage();
    return {
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
      rssUsedMB: Math.round(memory.rss / 1024 / 1024),
      externalMB: Math.round(memory.external / 1024 / 1024)
    };
  }

  destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }
}

export default MemoryOptimizer;
