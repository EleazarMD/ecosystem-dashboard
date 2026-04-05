/**
 * Performance Monitor for Dashboard Server
 * Tracks memory usage, request timing, and resource cleanup
 */

interface PerformanceMetrics {
  memoryUsage: NodeJS.MemoryUsage;
  requestCount: number;
  averageResponseTime: number;
  activeConnections: number;
  timestamp: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private requestTimes: number[] = [];
  private requestCount = 0;
  private activeTimeouts = new Set<NodeJS.Timeout>();
  private activeIntervals = new Set<NodeJS.Timeout>();
  private activeProcesses = new Set<any>();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  trackRequest(startTime: number): void {
    const responseTime = Date.now() - startTime;
    this.requestTimes.push(responseTime);
    this.requestCount++;
    
    // Keep only last 100 request times to prevent memory growth
    if (this.requestTimes.length > 100) {
      this.requestTimes = this.requestTimes.slice(-100);
    }
  }

  registerTimeout(timeout: NodeJS.Timeout): NodeJS.Timeout {
    this.activeTimeouts.add(timeout);
    return timeout;
  }

  registerInterval(interval: NodeJS.Timeout): NodeJS.Timeout {
    this.activeIntervals.add(interval);
    return interval;
  }

  registerProcess(process: any): any {
    this.activeProcesses.add(process);
    return process;
  }

  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
    this.activeTimeouts.delete(timeout);
  }

  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    this.activeIntervals.delete(interval);
  }

  removeProcess(process: any): void {
    this.activeProcesses.delete(process);
  }

  getMetrics(): PerformanceMetrics {
    const avgResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;

    return {
      memoryUsage: process.memoryUsage(),
      requestCount: this.requestCount,
      averageResponseTime: Math.round(avgResponseTime),
      activeConnections: this.activeTimeouts.size + this.activeIntervals.size + this.activeProcesses.size,
      timestamp: new Date().toISOString()
    };
  }

  cleanup(): void {
    // Clear all tracked timeouts and intervals
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeIntervals.forEach(interval => clearInterval(interval));
    this.activeProcesses.forEach(process => {
      if (process.kill) process.kill();
    });
    
    this.activeTimeouts.clear();
    this.activeIntervals.clear();
    this.activeProcesses.clear();
  }

  logMemoryWarning(): void {
    const memory = process.memoryUsage();
    const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
    const rssUsedMB = Math.round(memory.rss / 1024 / 1024);
    
    if (heapUsedMB > 500 || rssUsedMB > 300) {
      console.error(`[Performance Monitor] CRITICAL memory usage: Heap ${heapUsedMB}MB, RSS ${rssUsedMB}MB`);
      console.error(`[Performance Monitor] Active resources: ${this.activeTimeouts.size + this.activeIntervals.size + this.activeProcesses.size}`);
      
      // Force garbage collection if available
      if (global.gc) {
        console.log('[Performance Monitor] Forcing garbage collection...');
        global.gc();
      }
    } else if (heapUsedMB > 200 || rssUsedMB > 200) {
      console.warn(`[Performance Monitor] High memory usage: Heap ${heapUsedMB}MB, RSS ${rssUsedMB}MB`);
      console.warn(`[Performance Monitor] Active resources: ${this.activeTimeouts.size + this.activeIntervals.size + this.activeProcesses.size}`);
    }
  }
}

export default PerformanceMonitor;
