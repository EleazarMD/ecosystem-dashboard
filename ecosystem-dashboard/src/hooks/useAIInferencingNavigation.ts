/**
 * AI Inferencing Navigation Hook
 * Smart navigation flows between pages with context preservation
 */

import { useCallback } from 'react';

interface NavigationContext {
  provider?: string;
  model?: string;
  service?: string;
  costRange?: [number, number];
  timeRange?: string;
}

export function useAIInferencingNavigation(
  onNavigate: (section: string, context?: NavigationContext) => void
) {
  // Navigate from Provider Performance to LLM Providers (filtered by provider)
  const goToProvider = useCallback(
    (providerId: string) => {
      onNavigate('llm-providers', { provider: providerId });
    },
    [onNavigate]
  );

  // Navigate from Model Usage to LLM Providers (filtered by provider)
  const goToModelProvider = useCallback(
    (providerId: string) => {
      onNavigate('llm-providers', { provider: providerId });
    },
    [onNavigate]
  );

  // Navigate from any page to Model Usage (filtered by model)
  const goToModel = useCallback(
    (modelId: string) => {
      onNavigate('model-usage', { model: modelId });
    },
    [onNavigate]
  );

  // Navigate from Cost Optimization to Model Usage (filtered by cost)
  const goToHighCostModels = useCallback(
    (minCost: number = 0, maxCost: number = 10) => {
      onNavigate('model-usage', { costRange: [minCost, maxCost] });
    },
    [onNavigate]
  );

  // Navigate from Activity Logs to Model Usage (filtered by model)
  const goToModelFromLog = useCallback(
    (modelId: string) => {
      onNavigate('model-usage', { model: modelId });
    },
    [onNavigate]
  );

  // Navigate from any page to Activity Logs (filtered by service/model/provider)
  const goToLogs = useCallback(
    (filters: { service?: string; model?: string; provider?: string }) => {
      onNavigate('activity-logs', filters);
    },
    [onNavigate]
  );

  // Navigate from Provider Performance to Provider Details
  const viewProviderDetails = useCallback(
    (providerId: string) => {
      onNavigate('llm-providers', { provider: providerId });
    },
    [onNavigate]
  );

  // Navigate to API Keys for a specific provider
  const goToAPIKeys = useCallback(
    (providerId?: string) => {
      onNavigate('api-keys', providerId ? { provider: providerId } : undefined);
    },
    [onNavigate]
  );

  // Navigate to Cost Optimization with context
  const goToCostOptimization = useCallback(
    (context?: { model?: string; provider?: string }) => {
      onNavigate('cost-optimization', context);
    },
    [onNavigate]
  );

  return {
    goToProvider,
    goToModelProvider,
    goToModel,
    goToHighCostModels,
    goToModelFromLog,
    goToLogs,
    viewProviderDetails,
    goToAPIKeys,
    goToCostOptimization,
  };
}
