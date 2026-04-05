/**
 * AI Homelab Ecosystem Knowledge Graph MCP Monitoring Types
 * 
 * Type definitions for Knowledge Graph monitoring metrics, health status,
 * and related interfaces used throughout the monitoring system.
 * 
 * @implements AI Homelab Ecosystem Monitoring Standards v2.1
 */

/**
 * Knowledge Graph MCP Monitoring Metrics
 */
export interface KGMonitoringMetrics {
  // Core metrics
  operations: {
    total: number;
    success: number;
    failed: number;
    byType: Record<string, { count: number; avgDuration: number }>;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    dbConnections: number;
  };
  throughput: {
    requestsPerSecond: number;
    queriesPerSecond: number;
    nodesProcessed: number;
  };
  errors: {
    count: number;
    byType: Record<string, number>;
    byCode: Record<string, number>;
  };
  security: {
    activeRequests: number;
    deniedRequests: number;
    authFailures: number;
  };
  lastUpdated: string;
}

/**
 * Knowledge Graph MCP System Health Status
 */
export interface KGSystemHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    database: {
      status: 'healthy' | 'degraded' | 'critical' | 'offline';
      latency: number;
      connections: number;
      message?: string;
    };
    api: {
      status: 'healthy' | 'degraded' | 'critical' | 'offline';
      latency: number;
      message?: string;
    };
    indexer: {
      status: 'healthy' | 'degraded' | 'critical' | 'offline';
      backlogSize: number;
      message?: string;
    };
    queryEngine: {
      status: 'healthy' | 'degraded' | 'critical' | 'offline';
      cacheHitRate: number;
      message?: string;
    };
  };
  message?: string;
  lastChecked: string;
}

/**
 * Knowledge Graph Alert Severity
 */
export type KGAlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Knowledge Graph Alert
 */
export interface KGAlert {
  id: string;
  severity: KGAlertSeverity;
  message: string;
  timestamp: string;
  component?: string;
  details?: Record<string, any>;
}

/**
 * Knowledge Graph Query Performance
 */
export interface KGQueryPerformance {
  queryId: string;
  queryType: string;
  executionTime: number;
  nodesTraversed: number;
  relationshipsTraversed: number;
  resultCount: number;
  cached: boolean;
  timestamp: string;
}

/**
 * Knowledge Graph Operation Statistics
 */
export interface KGOperationStats {
  operationType: string;
  count: number;
  avgDuration: number;
  p95Duration: number;
  maxDuration: number;
  errorRate: number;
  timeWindow: '1m' | '5m' | '15m' | '1h' | '24h';
}

/**
 * Knowledge Graph Resource Utilization
 */
export interface KGResourceUtilization {
  memoryUsageMB: number;
  memoryAllocatedMB: number;
  cpuPercent: number;
  diskUsageMB: number;
  diskFreeMB: number;
  networkInKbps: number;
  networkOutKbps: number;
  timestamp: string;
}

/**
 * Knowledge Graph Node Type Statistics
 */
export interface KGNodeTypeStats {
  nodeType: string;
  count: number;
  avgConnections: number;
  medianConnections: number;
  maxConnections: number;
  lastUpdated: string;
}

/**
 * Knowledge Graph Relationship Type Statistics
 */
export interface KGRelationshipTypeStats {
  relType: string;
  count: number;
  avgWeight: number;
  sourceTypes: string[];
  targetTypes: string[];
  lastUpdated: string;
}
