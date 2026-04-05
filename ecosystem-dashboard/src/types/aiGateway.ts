/**
 * AI Gateway Types
 * Types and interfaces for the AI Gateway component
 */

export interface AIModel {
  id: string;
  provider: string;
  type: string;
  capabilities: string[];
  configured: boolean;
}

export interface AIGatewayStatus {
  isOnline: boolean;
  status: string;
  version: string;
  uptime: string;
  uptimeSeconds?: number;
  requestRate?: number;
  models: number | {
    total: number;
    active: number;
    loading: number;
  };
  requests?: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  lastUpdated: Date | null;
  lastChecked?: string;
  timestamp?: string;
  endpoint?: string;
  responseTime?: number;
  error?: string;
  message?: string;
  connectionError?: boolean;
}

/**
 * Time series data point with a timestamp and value
 */
export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

/**
 * Token usage data point with timestamp and separate prompt/completion counts
 */
export interface TokenUsageDataPoint {
  timestamp: string;
  prompt: number;
  completion: number;
}

/**
 * Model usage statistics
 */
export interface ModelUsageDataPoint {
  model: string;
  requests: number;
  tokens: number;
}

/**
 * Complete metrics for AI Gateway visualization
 */
export interface AIMetrics {
  requestsPerMinute: TimeSeriesDataPoint[];
  responseTimeMs: TimeSeriesDataPoint[];
  tokenUsage: TokenUsageDataPoint[];
  errorRate: TimeSeriesDataPoint[];
  modelUsage: ModelUsageDataPoint[];
}

/**
 * Configuration for the AI Gateway
 */
export interface AIGatewayConfig {
  general: {
    port: number;
    host: string;
    logLevel: string;
    maxConcurrentRequests: number;
  };
  security: {
    authEnabled: boolean;
    apiKeyRequired: boolean;
    rateLimiting: boolean;
    ipAllowlist: string[];
  };
  providers: {
    name: string;
    enabled: boolean;
    apiKey: string;
    models: string[];
  }[];
  advanced: {
    cacheEnabled: boolean;
    cacheTtlSeconds: number;
    timeoutMs: number;
    retries: number;
  };
}

export enum ModelType {
  CHAT = 'chat',
  TEXT = 'text',
  EMBEDDING = 'embedding',
  IMAGE = 'image',
  CODE = 'code',
}

export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  HUGGINGFACE = 'huggingface',
  COHERE = 'cohere',
}

export enum CapabilityType {
  CHAT = 'chat',
  TEXT_GENERATION = 'text-generation',
  CODE = 'code',
  EMBEDDING = 'embedding',
  FUNCTION_CALLING = 'function-calling',
  IMAGE_GENERATION = 'image-generation',
}
