/**
 * Model Registry Hook
 * 
 * React hook for accessing the single source of truth for available LLMs
 * Connects to AI Gateway model registry with caching and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';

interface ModelInfo {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic' | 'google' | 'local';
  type: 'chat' | 'completion' | 'embedding' | 'vision' | 'multimodal';
  status: 'available' | 'downloading' | 'unavailable' | 'error';
  size?: string;
  parameters?: number;
  capabilities?: string[];
  contextWindow?: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
  metadata?: {
    description?: string;
    version?: string;
    updated?: string;
    tags?: string[];
  };
}

interface ModelRegistry {
  models: ModelInfo[];
  providers: {
    ollama: { available: boolean; url: string; models: string[] };
    openai: { available: boolean; models: string[] };
    anthropic: { available: boolean; models: string[] };
    google: { available: boolean; models: string[] };
  };
  lastUpdated: string;
  cacheExpiry: string;
}

interface UseModelRegistryReturn {
  models: ModelInfo[];
  availableModels: ModelInfo[];
  modelsByProvider: Record<string, ModelInfo[]>;
  providers: ModelRegistry['providers'];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refreshModels: () => Promise<void>;
  getModelById: (id: string) => ModelInfo | undefined;
  getModelsByType: (type: ModelInfo['type']) => ModelInfo[];
  getModelsByCapability: (capability: string) => ModelInfo[];
}

export function useModelRegistry(
  serviceId?: string,
  projectId?: string
): UseModelRegistryReturn {
  const [registry, setRegistry] = useState<ModelRegistry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load model registry from AI Gateway
  const loadModelRegistry = useCallback(async () => {
    try {
      setError(null);
      
      // Build URL with agent-specific parameters
      const params = new URLSearchParams();
      if (serviceId) params.append('serviceId', serviceId);
      if (projectId) params.append('projectId', projectId);
      
      const url = `/api/ai-gateway/models${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRegistry(data.registry);
        console.log('✅ Model registry loaded:', {
          models: data.registry.models.length,
          providers: Object.values(data.registry.providers).filter((p: any) => p.available).length,
          cached: data.cached
        });
      } else {
        throw new Error(data.error || 'Failed to load model registry');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Failed to load model registry:', errorMessage);
      setError(errorMessage);
      
      // Fallback to hardcoded models if registry fails
      setRegistry(createFallbackRegistry());
    } finally {
      setIsLoading(false);
    }
  }, [serviceId, projectId]);

  // Initial load
  useEffect(() => {
    loadModelRegistry();
  }, [loadModelRegistry]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        console.log('🔄 Auto-refreshing model registry...');
        loadModelRegistry();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadModelRegistry, isLoading]);

  // Derived data
  const models = registry?.models || [];
  const availableModels = models.filter(model => model.status === 'available');
  const providers = registry?.providers || { ollama: { available: false, url: '', models: [] }, openai: { available: false, models: [] }, anthropic: { available: false, models: [] }, google: { available: false, models: [] } };
  const lastUpdated = registry?.lastUpdated || null;

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  // Helper functions
  const getModelById = useCallback((id: string) => {
    return models.find(model => model.id === id);
  }, [models]);

  const getModelsByType = useCallback((type: ModelInfo['type']) => {
    return models.filter(model => model.type === type);
  }, [models]);

  const getModelsByCapability = useCallback((capability: string) => {
    return models.filter(model => 
      model.capabilities?.includes(capability)
    );
  }, [models]);

  const refreshModels = useCallback(async () => {
    setIsLoading(true);
    await loadModelRegistry();
  }, [loadModelRegistry]);

  return {
    models,
    availableModels,
    modelsByProvider,
    providers,
    isLoading,
    error,
    lastUpdated,
    refreshModels,
    getModelById,
    getModelsByType,
    getModelsByCapability
  };
}

/**
 * Create fallback registry when AI Gateway is unavailable
 * Returns empty registry - cloud models require API keys and proper configuration
 */
function createFallbackRegistry(): ModelRegistry {
  console.warn('⚠️ Using fallback empty registry - configure API keys in AI Inferencing Service');
  
  return {
    models: [],
    providers: {
      ollama: { 
        available: false, 
        url: 'http://localhost:11434',
        models: []
      },
      openai: { 
        available: false,
        models: []
      },
      anthropic: { 
        available: false,
        models: []
      },
      google: { 
        available: false,
        models: []
      }
    },
    lastUpdated: new Date().toISOString(),
    cacheExpiry: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
}
