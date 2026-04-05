/**
 * usePlatformConfig Hook
 * 
 * Provides access to platform configuration for managing
 * services, agents, LLMs, and UI features.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  PlatformConfig,
  ServiceConfig,
  AgentConfig,
  LLMConfig,
  UIFeatureConfig,
  IntegrationConfig,
  createDefaultPlatformConfig,
} from '@/lib/platform/types';

export interface UsePlatformConfigResult {
  config: PlatformConfig | null;
  loading: boolean;
  error: string | null;
  isDefault: boolean;
  
  // Reload
  reload: () => Promise<void>;
  
  // Services
  updateService: (serviceId: string, updates: Partial<ServiceConfig>) => Promise<void>;
  toggleService: (serviceId: string, enabled: boolean) => Promise<void>;
  
  // Agents
  updateAgent: (agentId: string, updates: Partial<AgentConfig>) => Promise<void>;
  toggleAgent: (agentId: string, enabled: boolean) => Promise<void>;
  
  // LLMs
  updateLLM: (llmId: string, updates: Partial<LLMConfig>) => Promise<void>;
  toggleLLM: (llmId: string, enabled: boolean) => Promise<void>;
  setDefaultLLM: (llmId: string) => Promise<void>;
  
  // UI Features
  updateUIFeature: (featureId: string, updates: Partial<UIFeatureConfig>) => Promise<void>;
  toggleUIFeature: (featureId: string, enabled: boolean) => Promise<void>;
  
  // Integrations
  updateIntegration: (integrationId: string, updates: Partial<IntegrationConfig>) => Promise<void>;
  toggleIntegration: (integrationId: string, enabled: boolean) => Promise<void>;
  
  // Global
  updateGlobalSettings: (settings: Partial<PlatformConfig['globalSettings']>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

export function usePlatformConfig(environment: string = 'development'): UsePlatformConfigResult {
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load config
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/platform/config?environment=${environment}`);
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        setIsDefault(data.isDefault || false);
      } else {
        setError(data.error || 'Failed to load configuration');
        setConfig(createDefaultPlatformConfig());
        setIsDefault(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setConfig(createDefaultPlatformConfig());
      setIsDefault(true);
    } finally {
      setLoading(false);
    }
  }, [environment]);
  
  // Load on mount
  useEffect(() => {
    reload();
  }, [reload]);
  
  // Save config to backend
  const saveConfig = useCallback(async () => {
    if (!config) return;
    
    try {
      const response = await fetch('/api/platform/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, updatedBy: 'dashboard-user' }),
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      
      setHasChanges(false);
      setIsDefault(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      throw err;
    }
  }, [config]);
  
  // Update helpers
  const updateConfig = useCallback((updater: (c: PlatformConfig) => PlatformConfig) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      updated.lastUpdated = new Date().toISOString();
      setHasChanges(true);
      return updated;
    });
  }, []);
  
  // Service methods
  const updateService = useCallback(async (serviceId: string, updates: Partial<ServiceConfig>) => {
    updateConfig((c) => ({
      ...c,
      services: c.services.map((s) => (s.id === serviceId ? { ...s, ...updates } : s)),
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  const toggleService = useCallback(async (serviceId: string, enabled: boolean) => {
    await updateService(serviceId, { enabled });
  }, [updateService]);
  
  // Agent methods
  const updateAgent = useCallback(async (agentId: string, updates: Partial<AgentConfig>) => {
    updateConfig((c) => ({
      ...c,
      agents: c.agents.map((a) => (a.id === agentId ? { ...a, ...updates } : a)),
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  const toggleAgent = useCallback(async (agentId: string, enabled: boolean) => {
    await updateAgent(agentId, { enabled });
  }, [updateAgent]);
  
  // LLM methods
  const updateLLM = useCallback(async (llmId: string, updates: Partial<LLMConfig>) => {
    updateConfig((c) => ({
      ...c,
      llms: c.llms.map((l) => (l.id === llmId ? { ...l, ...updates } : l)),
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  const toggleLLM = useCallback(async (llmId: string, enabled: boolean) => {
    await updateLLM(llmId, { enabled });
  }, [updateLLM]);
  
  const setDefaultLLM = useCallback(async (llmId: string) => {
    updateConfig((c) => ({
      ...c,
      llms: c.llms.map((l) => ({ ...l, isDefault: l.id === llmId })),
      globalSettings: { ...c.globalSettings, defaultLLM: llmId },
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  // UI Feature methods
  const updateUIFeature = useCallback(async (featureId: string, updates: Partial<UIFeatureConfig>) => {
    updateConfig((c) => ({
      ...c,
      uiFeatures: c.uiFeatures.map((f) => (f.id === featureId ? { ...f, ...updates } : f)),
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  const toggleUIFeature = useCallback(async (featureId: string, enabled: boolean) => {
    await updateUIFeature(featureId, { enabled });
  }, [updateUIFeature]);
  
  // Integration methods
  const updateIntegration = useCallback(async (integrationId: string, updates: Partial<IntegrationConfig>) => {
    updateConfig((c) => ({
      ...c,
      integrations: c.integrations.map((i) => (i.id === integrationId ? { ...i, ...updates } : i)),
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  const toggleIntegration = useCallback(async (integrationId: string, enabled: boolean) => {
    await updateIntegration(integrationId, { enabled });
  }, [updateIntegration]);
  
  // Global settings
  const updateGlobalSettings = useCallback(async (settings: Partial<PlatformConfig['globalSettings']>) => {
    updateConfig((c) => ({
      ...c,
      globalSettings: { ...c.globalSettings, ...settings },
    }));
    await saveConfig();
  }, [updateConfig, saveConfig]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await fetch('/api/platform/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment }),
      });
      
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
        setIsDefault(true);
        setHasChanges(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    }
  }, [environment]);
  
  return {
    config,
    loading,
    error,
    isDefault,
    reload,
    updateService,
    toggleService,
    updateAgent,
    toggleAgent,
    updateLLM,
    toggleLLM,
    setDefaultLLM,
    updateUIFeature,
    toggleUIFeature,
    updateIntegration,
    toggleIntegration,
    updateGlobalSettings,
    resetToDefaults,
    saveConfig,
  };
}
