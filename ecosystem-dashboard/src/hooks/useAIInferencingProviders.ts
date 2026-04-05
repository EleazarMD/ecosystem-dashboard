/**
 * Hook for AI Inferencing Service Integration
 * Fetches available providers and their models based on configured API keys
 */

import { useState, useEffect, useCallback } from 'react';
import AIInferencingIntegration, { ProviderAvailability, AIInferencingStats } from '../services/AIInferencingIntegration';

export interface UseAIInferencingProvidersResult {
  providers: ProviderAvailability[];
  stats: AIInferencingStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isProviderAvailable: (provider: string) => boolean;
  getAvailableModels: () => string[];
}

export function useAIInferencingProviders(
  serviceId?: string,
  projectId?: string
): UseAIInferencingProvidersResult {
  const [providers, setProviders] = useState<ProviderAvailability[]>([]);
  const [stats, setStats] = useState<AIInferencingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch both providers and stats in parallel
      const [providersData, statsData] = await Promise.all([
        AIInferencingIntegration.getAvailableProviders(serviceId, projectId),
        AIInferencingIntegration.getServiceStats(serviceId, projectId)
      ]);
      
      setProviders(providersData);
      setStats(statsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch provider data';
      setError(errorMessage);
      console.error('Error fetching AI Inferencing data:', err);
      
      // Set fallback defaults
      setProviders([
        {
          provider: 'ollama',
          available: true,
          providerDisplayName: 'Ollama (Local)',
          rateLimit: 200,
          costLimit: null,
          models: ['llama3.2:3b', 'mistral', 'mixtral']
        }
      ]);
      
    } finally {
      setLoading(false);
    }
  }, [serviceId, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const isProviderAvailable = useCallback((provider: string): boolean => {
    const providerInfo = providers.find(p => p.provider === provider);
    return providerInfo ? providerInfo.available : false;
  }, [providers]);

  const getAvailableModels = useCallback((): string[] => {
    const models: string[] = [];
    providers.forEach(provider => {
      if (provider.available) {
        models.push(...provider.models);
      }
    });
    return models;
  }, [providers]);

  return {
    providers,
    stats,
    loading,
    error,
    refresh,
    isProviderAvailable,
    getAvailableModels
  };
}

export default useAIInferencingProviders;
