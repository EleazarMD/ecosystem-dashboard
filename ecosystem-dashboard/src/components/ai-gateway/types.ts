/**
 * AI Gateway Component Types
 * 
 * This file contains shared type definitions for the AI Gateway UI components
 * in the AI Homelab Ecosystem Dashboard.
 */

import { AIModel, AIMetrics, AIGatewayStatus } from '@/types/aiGateway';

/**
 * Common props for AI Gateway header component
 */
export interface AIGatewayHeaderProps {
  /** Current gateway status information */
  status: AIGatewayStatus | null;
  /** Whether the status is currently loading */
  loading?: boolean;
  /** Error message if status retrieval failed */
  error?: Error | null;
  /** Callback for refreshing status information */
  onRefreshStatus?: () => void;
  /** Gateway name (defaults to "AI Gateway") */
  gatewayName?: string;
}

/**
 * Props for AI Gateway models tab
 */
export interface AIGatewayModelsTabProps {
  /** List of AI models available through the gateway */
  models?: AIModel[];
  /** Whether models data is currently loading */
  loading?: boolean;
  /** Error that occurred during model data fetching */
  error?: Error | null;
  /** Callback for refreshing model data */
  onRefreshModels?: () => void;
}

/**
 * Props for AI Gateway metrics tab
 */
export interface AIGatewayMetricsTabProps {
  /** Current gateway status information */
  status?: AIGatewayStatus | null;
  /** Metrics data for visualization */
  metrics?: AIMetrics;
  /** Whether metrics data is currently loading */
  loading?: boolean;
  /** Error that occurred during metrics data fetching */
  error?: Error | null;
  /** Callback for refreshing metrics data */
  onRefreshMetrics?: () => void;
  /** Time range to display (e.g., '1h', '24h', '7d') */
  timeRange?: string;
  /** Callback when time range is changed */
  onTimeRangeChange?: (timeRange: string) => void;
}

/**
 * Props for AI Gateway config tab
 */
export interface AIGatewayConfigTabProps {
  /** Current configuration settings */
  config?: Record<string, any>;
  /** Whether config data is currently loading */
  loading?: boolean;
  /** Error that occurred during config data fetching */
  error?: Error | null;
  /** Callback for saving configuration changes */
  onSaveConfig?: (config: Record<string, any>) => Promise<void>;
}

/**
 * Props for AI Gateway logs tab
 */
export interface AIGatewayLogsTabProps {
  /** Current log entries */
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
    details?: Record<string, any>;
  }>;
  /** Whether logs are currently loading */
  loading?: boolean;
  /** Error that occurred during logs fetching */
  error?: Error | null;
  /** Callback for refreshing logs */
  onRefreshLogs?: () => void;
  /** Log level filter */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Callback when log level filter changes */
  onLogLevelChange?: (level: 'debug' | 'info' | 'warn' | 'error') => void;
}
