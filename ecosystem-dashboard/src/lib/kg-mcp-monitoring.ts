/**
 * Knowledge Graph MCP Monitoring Module
 * 
 * This module provides monitoring and observability for the Knowledge Graph MCP client operations.
 * It tracks performance metrics, error rates, and operation status for integration with the
 * ecosystem's observability platform.
 * 
 * @module kg-mcp-monitoring
 */

import logger from './logger';

// Define metric types
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Metric data structure
 */
export interface Metric {
  name: string;
  value: number;
  type: MetricType;
  labels: Record<string, string>;
  timestamp: number;
}

/**
 * Operation tracking data
 */
export interface OperationMetrics {
  requestId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'in_progress' | 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Knowledge Graph MCP Monitoring Service
 * Tracks metrics for KG-MCP operations
 */
class KGMCPMonitoring {
  // Store active operations
  private activeOperations: Map<string, OperationMetrics>;
  
  // Store metrics for reporting
  private metrics: Metric[];
  
  // Metric reporting interval (ms)
  private reportingInterval: number;
  
  // Operation duration thresholds (ms)
  private thresholds: {
    warning: number;
    critical: number;
  };
  
  // Error rate calculation
  private errorCounts: {
    total: number;
    errors: number;
    window: number; // ms
  };
  
  constructor() {
    this.activeOperations = new Map();
    this.metrics = [];
    this.reportingInterval = 60000; // 1 minute
    this.thresholds = {
      warning: 1000, // 1 second
      critical: 5000  // 5 seconds
    };
    this.errorCounts = {
      total: 0,
      errors: 0,
      window: 300000 // 5 minutes
    };
    
    // Start periodic reporting
    this.startReporting();
    
    logger.info('[KG-MCP-MON] Monitoring service initialized');
  }
  
  /**
   * Start tracking an operation
   * 
   * @param operation Operation name
   * @param requestId Unique request ID
   * @returns The operation metrics
   */
  startOperation(operation: string, requestId: string): OperationMetrics {
    const metrics: OperationMetrics = {
      requestId,
      operation,
      startTime: Date.now(),
      status: 'in_progress'
    };
    
    this.activeOperations.set(requestId, metrics);
    
    this.recordMetric(`kg_mcp_operation_started`, 1, 'counter', {
      operation
    });
    
    return metrics;
  }
  
  /**
   * Complete tracking of an operation
   * 
   * @param requestId Unique request ID
   * @param status Success or error
   * @param error Optional error information
   */
  completeOperation(
    requestId: string, 
    status: 'success' | 'error', 
    error?: { code: string; message: string }
  ): void {
    const operation = this.activeOperations.get(requestId);
    
    if (!operation) {
      logger.warn(`[KG-MCP-MON] Attempted to complete unknown operation: ${requestId}`);
      return;
    }
    
    // Update operation metrics
    operation.endTime = Date.now();
    operation.duration = operation.endTime - operation.startTime;
    operation.status = status;
    
    if (error) {
      operation.errorCode = error.code;
      operation.errorMessage = error.message;
    }
    
    // Record operation completion metrics
    this.recordMetric(`kg_mcp_operation_completed`, 1, 'counter', {
      operation: operation.operation,
      status
    });
    
    // Record duration
    this.recordMetric(`kg_mcp_operation_duration`, operation.duration, 'histogram', {
      operation: operation.operation,
      status
    });
    
    // Update error rate tracking
    this.errorCounts.total++;
    if (status === 'error') {
      this.errorCounts.errors++;
    }
    
    // Alert on slow operations
    if (operation.duration && operation.duration > this.thresholds.critical) {
      logger.warn(`[KG-MCP-MON] Critical: Operation ${operation.operation} exceeded critical threshold`, {
        requestId,
        duration: operation.duration,
        threshold: this.thresholds.critical
      });
    } else if (operation.duration && operation.duration > this.thresholds.warning) {
      logger.info(`[KG-MCP-MON] Warning: Operation ${operation.operation} exceeded warning threshold`, {
        requestId,
        duration: operation.duration,
        threshold: this.thresholds.warning
      });
    }
    
    // Remove from active operations
    this.activeOperations.delete(requestId);
  }
    
  /**
   * Record a metric for later reporting
   * 
   * @param name Metric name
   * @param value Metric value
   * @param type Metric type
   * @param labels Additional labels for the metric
   */
  recordMetric(
    name: string, 
    value: number, 
    type: MetricType = 'gauge',
    labels: Record<string, string> = {}
  ): void {
    this.metrics.push({
      name,
      value,
      type,
      labels,
      timestamp: Date.now()
    });
  }
  
  /**
   * Start periodic metric reporting
   */
  private startReporting(): void {
    // Set up interval for reporting
    setInterval(() => {
      this.reportMetrics();
    }, this.reportingInterval);
  }
  
  /**
   * Report collected metrics to observability platform
   */
  private reportMetrics(): void {
    if (this.metrics.length === 0) {
      return;
    }
    
    // Calculate current error rate
    const errorRate = this.errorCounts.total > 0 ? 
      (this.errorCounts.errors / this.errorCounts.total) : 0;
    
    // Add error rate metric
    this.recordMetric('kg_mcp_error_rate', errorRate, 'gauge');
    
    // Calculate active operations
    const activeOperationsCount = this.activeOperations.size;
    this.recordMetric('kg_mcp_active_operations', activeOperationsCount, 'gauge');
    
    // Reset error counters periodically
    const oldestValidTime = Date.now() - this.errorCounts.window;
    const oldMetrics = this.metrics.filter(m => m.timestamp < oldestValidTime);
    if (oldMetrics.length > 0) {
      // Reset error counts if we have metrics older than the window
      this.errorCounts.errors = 0;
      this.errorCounts.total = 0;
    }
    
    // Log metrics summary for observability
    const metricsByType = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.type]) {
        acc[metric.type] = [];
      }
      acc[metric.type].push(metric);
      return acc;
    }, {} as Record<MetricType, Metric[]>);
    
    logger.info('[KG-MCP-MON] Metrics report', {
      timestamp: new Date().toISOString(),
      metricCount: this.metrics.length,
      errorRate,
      activeOperations: activeOperationsCount,
      summary: {
        counters: (metricsByType.counter || []).length,
        gauges: (metricsByType.gauge || []).length,
        histograms: (metricsByType.histogram || []).length
      }
    });
    
    // In a real implementation, would send metrics to external system here
    // this.sendMetricsToObservabilityPlatform(this.metrics);
    
    // Clear metrics after reporting
    this.metrics = [];
  }
  
  /**
   * Get current error rate
   * 
   * @returns Current error rate as a value between 0 and 1
   */
  getErrorRate(): number {
    return this.errorCounts.total > 0 ? 
      (this.errorCounts.errors / this.errorCounts.total) : 0;
  }
  
  /**
   * Get all active operations
   * 
   * @returns Map of active operations by request ID
   */
  getActiveOperations(): Map<string, OperationMetrics> {
    return new Map(this.activeOperations);
  }
  
  /**
   * Get current monitoring metrics
   * 
   * @returns Object containing monitoring metrics
   */
  getMetrics(): { 
    operationCount: number; 
    errorRate: number; 
    averageDuration: number; 
    activeOperations: number;
    alertCount: number;
  } {
    // Calculate current error rate
    const errorRate = this.errorCounts.total > 0 ? 
      (this.errorCounts.errors / this.errorCounts.total) * 100 : 0;
      
    // Calculate average duration from histogram metrics
    const durationMetrics = this.metrics.filter(m => 
      m.name === 'kg_mcp_operation_duration' && 
      m.timestamp > Date.now() - 300000 // Last 5 minutes
    );
    
    const totalDuration = durationMetrics.reduce((sum, m) => sum + m.value, 0);
    const avgDuration = durationMetrics.length > 0 ? 
      totalDuration / durationMetrics.length : 0;
      
    // Count alert-worthy metrics (slow operations)
    const alertMetrics = durationMetrics.filter(m => 
      m.value > this.thresholds.warning
    );
    
    return {
      operationCount: this.errorCounts.total,
      errorRate,
      averageDuration: avgDuration,
      activeOperations: this.activeOperations.size,
      alertCount: alertMetrics.length
    };
  }
  
  /**
   * Set operation thresholds
   * 
   * @param warning Warning threshold in ms
   * @param critical Critical threshold in ms
   */
  setThresholds(warning: number, critical: number): void {
    this.thresholds = { warning, critical };
    logger.info('[KG-MCP-MON] Updated operation thresholds', { warning, critical });
  }
}

// Export singleton instance
const kgMCPMonitoring = new KGMCPMonitoring();
export default kgMCPMonitoring;
