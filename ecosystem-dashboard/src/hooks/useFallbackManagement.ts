/**
 * React hooks for Fallback Management
 * 
 * Provides state management and API integration for fallback system controls
 */

import { useState, useEffect, useCallback } from 'react';

// Types
interface FallbackConfig {
  appId: string;
  appName: string;
  environment: 'development' | 'staging' | 'production' | 'testing';
  enabled: boolean;
  mode: 'static' | 'custom' | 'cache' | 'hybrid' | 'disabled';
  lastUsed?: string;
  statistics?: {
    totalFallbacks: number;
    cacheHits: number;
    staticResponses: number;
    customResponses: number;
  };
  configuration?: any;
}

interface GlobalFallbackSettings {
  globallyEnabled: boolean;
  environment: string;
  environmentControls: {
    development: boolean;
    staging: boolean;
    production: boolean;
    testing: boolean;
  };
  statistics: {
    totalFallbacks: number;
    cacheHits: number;
    staticResponses: number;
    customResponses: number;
  };
}

interface FallbackTemplate {
  name: string;
  description: string;
  config: any;
}

// Custom hook for fallback management
export const useFallbackManagement = () => {
  const [globalSettings, setGlobalSettings] = useState<GlobalFallbackSettings | null>(null);
  const [appConfigs, setAppConfigs] = useState<FallbackConfig[]>([]);
  const [templates, setTemplates] = useState<Record<string, FallbackTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch global settings
  const fetchGlobalSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=global-settings');
      const result = await response.json();
      
      if (result.success) {
        setGlobalSettings(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch global settings');
      }
    } catch (err) {
      console.error('Error fetching global settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Fetch app configurations
  const fetchAppConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=app-configs');
      const result = await response.json();
      
      if (result.success) {
        setAppConfigs(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch app configurations');
      }
    } catch (err) {
      console.error('Error fetching app configurations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=templates');
      const result = await response.json();
      
      if (result.success) {
        setTemplates(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  // Toggle global fallbacks
  const toggleGlobalFallbacks = useCallback(async (enabled: boolean) => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=toggle-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ globalEnabled: enabled }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGlobalSettings(result.data);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to toggle global fallbacks');
      }
    } catch (err) {
      console.error('Error toggling global fallbacks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Toggle environment fallbacks
  const toggleEnvironmentFallbacks = useCallback(async (environment: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=toggle-environment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ environment, environmentEnabled: enabled }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGlobalSettings(result.data);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to toggle environment fallbacks');
      }
    } catch (err) {
      console.error('Error toggling environment fallbacks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Toggle app fallbacks
  const toggleAppFallbacks = useCallback(async (appId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=toggle-app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appId, enabled }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the app config in state
        setAppConfigs(prev => 
          prev.map(config => 
            config.appId === appId 
              ? { ...config, enabled, mode: enabled ? 'hybrid' : 'disabled' }
              : config
          )
        );
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to toggle app fallbacks');
      }
    } catch (err) {
      console.error('Error toggling app fallbacks:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Apply template to apps
  const applyTemplate = useCallback(async (templateName: string, appIds: string[]) => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=apply-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateName, appIds }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Refresh app configs to reflect changes
        await fetchAppConfigs();
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to apply template');
      }
    } catch (err) {
      console.error('Error applying template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [fetchAppConfigs]);

  // Emergency disable all fallbacks
  const emergencyDisableAll = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-gateway/fallback-management?action=emergency-disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGlobalSettings(result.data.global);
        setAppConfigs(result.data.apps);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to emergency disable');
      }
    } catch (err) {
      console.error('Error in emergency disable:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchGlobalSettings(),
        fetchAppConfigs(),
        fetchTemplates()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [fetchGlobalSettings, fetchAppConfigs, fetchTemplates]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // State
    globalSettings,
    appConfigs,
    templates,
    loading,
    error,
    
    // Actions
    toggleGlobalFallbacks,
    toggleEnvironmentFallbacks,
    toggleAppFallbacks,
    applyTemplate,
    emergencyDisableAll,
    refreshData,
    
    // Utilities
    clearError: () => setError(null),
  };
};

// Hook for individual app fallback management
export const useAppFallbackConfig = (appId: string) => {
  const [config, setConfig] = useState<FallbackConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!appId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/ai-gateway/fallback-management?action=app-config&appId=${appId}`);
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch app configuration');
      }
    } catch (err) {
      console.error('Error fetching app configuration:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  const updateConfig = useCallback(async (updates: Partial<FallbackConfig>) => {
    if (!appId) return { success: false, error: 'No app ID provided' };
    
    try {
      const response = await fetch(`/api/ai-gateway/fallback-management?appId=${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConfig(result.data);
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to update configuration');
      }
    } catch (err) {
      console.error('Error updating app configuration:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [appId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    loading,
    error,
    updateConfig,
    refreshConfig: fetchConfig,
    clearError: () => setError(null),
  };
};
