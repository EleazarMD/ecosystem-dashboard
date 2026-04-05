/**
 * React Hook for Agent Model Management
 * Easy-to-use interface for per-agent LLM model configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { agentModelManager } from '../lib/AgentModelManager';

interface UseAgentModelReturn {
  // Current state
  model: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateModel: (newModel: string) => Promise<void>;
  resetToDefault: () => Promise<void>;
  
  // Metadata
  allAgentModels: Record<string, string>;
  lastUpdated: Date | null;
}

/**
 * Hook for managing a specific agent's LLM model
 */
export function useAgentModel(agentId: string): UseAgentModelReturn {
  const [model, setModel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allAgentModels, setAllAgentModels] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Load initial model
  useEffect(() => {
    if (!agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentModel = agentModelManager.getAgentModel(agentId);
      setModel(currentModel);
      setAllAgentModels(agentModelManager.getAllAgentModels());
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`❌ Failed to load model for ${agentId}:`, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // Subscribe to model changes for this agent
  useEffect(() => {
    const unsubscribe = agentModelManager.onModelChange((changedAgentId, newModel, oldModel) => {
      if (changedAgentId === agentId) {
        console.log(`🔄 Agent ${agentId} model changed: ${oldModel} → ${newModel}`);
        setModel(newModel);
        setLastUpdated(new Date());
        setError(null);
      }
      
      // Always update the all-agents map
      setAllAgentModels(agentModelManager.getAllAgentModels());
    });

    return unsubscribe;
  }, [agentId]);

  // Update model action
  const updateModel = useCallback(async (newModel: string): Promise<void> => {
    if (!agentId || !newModel) return;

    setIsLoading(true);
    setError(null);

    try {
      await agentModelManager.updateAgentModel(agentId, newModel, 'ui');
      // State will be updated via the listener
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update model';
      setError(errorMessage);
      console.error(`❌ Failed to update model for ${agentId}:`, errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // Reset to default action
  const resetToDefault = useCallback(async (): Promise<void> => {
    if (!agentId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get the default model and update to it
      const defaultModel = agentModelManager['getDefaultModel'](agentId);
      await agentModelManager.updateAgentModel(agentId, defaultModel, 'ui');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset to default';
      setError(errorMessage);
      console.error(`❌ Failed to reset ${agentId} to default:`, errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  return {
    model,
    isLoading,
    error,
    updateModel,
    resetToDefault,
    allAgentModels,
    lastUpdated
  };
}

/**
 * Hook for managing multiple agents' models
 */
export function useAllAgentModels() {
  const [allModels, setAllModels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllModels(agentModelManager.getAllAgentModels());
    setIsLoading(false);

    // Subscribe to any agent model changes
    const unsubscribe = agentModelManager.onModelChange(() => {
      setAllModels(agentModelManager.getAllAgentModels());
    });

    return unsubscribe;
  }, []);

  const updateMultiple = useCallback(async (
    updates: Array<{ agentId: string; model: string }>
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await agentModelManager.updateMultipleAgents(updates, 'ui');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk update failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetAllToDefaults = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await agentModelManager.resetAllToDefaults();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reset all failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    allModels,
    isLoading,
    error,
    updateMultiple,
    resetAllToDefaults
  };
}
