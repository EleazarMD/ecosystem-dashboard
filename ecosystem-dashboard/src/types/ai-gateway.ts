/**
 * Shared TypeScript interfaces for AI Gateway Dashboard components
 */

export interface Trace {
  traceId: string;
  spanId: string;
  timestamp: string;
  duration: number;
  status: 'completed' | 'error' | 'in_progress';
  statusCode: number;
  request: {
    method: string;
    model: string;
    provider: string;
    stream: boolean;
  };
  client: {
    id: string;
    ip: string;
  };
  routing: {
    strategy: string;
    selectedProvider: string;
    retries: number;
  };
  response?: {
    model: string;
    provider: string;
    content: string;
  };
  error?: {
    message: string;
    code: string;
  };
  metrics: {
    tokenCount: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency: {
      routing: number;
      provider: number;
      total: number;
    };
    cost: {
      total: number;
    };
  };
}

export interface CostSummary {
  total: number;
  totalTokens: number;
  totalRequests: number;
  avgCostPerRequest: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byClient: Record<string, number>;
  trend: Array<{
    timestamp: string;
    cost: number;
    requests: number;
  }>;
}

export interface LiveMetrics {
  total_requests: number;
  requests_per_second: number;
  active_connections: number;
  avg_latency: number;
  error_rate: number;
  uptime: number;
}

export interface ProviderStatus {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'offline';
  latency: number;
  requests_per_minute: number;
  error_rate: number;
  last_request: string;
}

export interface Alert {
  id: string;
  ruleName: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  metric: string;
  currentValue: string | number;
  threshold: string | number;
  timestamp: string;
  status: 'active' | 'cleared';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface RequestFlowDataPoint {
  timestamp: string;
  requests: number;
  errors: number;
}

export interface LatencyDataPoint {
  provider: string;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface ProviderLoadDataPoint {
  provider: string;
  requests: number;
  percentage: number;
}
