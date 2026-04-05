/**
 * useAgentConfiguration Hook
 * Loads and manages agent configuration from database
 * Shared across all three agents: workspace-ai, page-agent, dashboard-ai
 */

import { useState, useEffect, useCallback } from 'react';

export interface AgentConfiguration {
  agentId: string;
  agentName: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabledTools: string[];
  agencyMode: string;
  isActive: boolean;
  mcpServers: {
    workspace: boolean;
    notion: boolean;
    github: boolean;
    filesystem: boolean;
    knowledgeGraph: boolean;
    perplexity: boolean;
    custom: string[];
  };

  // Advanced Settings - Session Management
  maxTurns?: number;
  contextStrategy?: 'summarize' | 'prompt' | 'truncate';
  autoCompactThreshold?: number;
  sessionAutosave?: boolean;

  // Advanced Settings - Multi-Model
  enableLeadWorker?: boolean;
  leadModel?: string;
  leadTurns?: number;
  enablePlanning?: boolean;
  plannerModel?: string;

  // Advanced Settings - Tool Behavior
  toolExecutionMode?: string;
  enableRouter?: boolean;
  enableToolshim?: boolean;
  toolOutputPriority?: number;

  // Advanced Settings - Security & Monitoring
  securityPromptEnabled?: boolean;
  securityThreshold?: number;
  debugEnabled?: boolean;
  showCosts?: boolean;

  // Advanced Settings - Performance Optimizations
  enableToolCaching?: boolean;
  cacheDefaultTTL?: number;  // in seconds
  enableStreaming?: boolean;
  enableParallelTools?: boolean;
  maxParallelTools?: number;
  enableRetryLogic?: boolean;
  maxRetryAttempts?: number;
  enableToolMonitoring?: boolean;
}

export interface UseAgentConfigurationResult {
  config: AgentConfiguration | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  updateConfig: (newConfig: Partial<AgentConfiguration>) => Promise<void>;
}

/**
 * Load agent configuration from database
 * 
 * @param agentId - The agent ID (workspace-ai, page-agent, dashboard-ai)
 * @returns Configuration object with loading state
 */
export function useAgentConfiguration(agentId: string): UseAgentConfigurationResult {
  const [config, setConfig] = useState<AgentConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    if (!agentId) {
      setError('No agent ID provided');
      setLoading(false);
      return;
    }

    console.log(`🔧 [useAgentConfiguration] Loading config for: ${agentId}`);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/goose/settings/${agentId}`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }

      const data = await response.json();
      const enabledTools = data.enabledTools || [];

      // Convert enabledTools array to mcpServers object
      const mcpServers = {
        workspace: enabledTools.includes('workspace'),
        notion: enabledTools.includes('notion'),
        github: enabledTools.includes('github'),
        filesystem: enabledTools.includes('filesystem'),
        knowledgeGraph: enabledTools.includes('knowledgeGraph'),
        perplexity: enabledTools.includes('perplexity'),
        custom: enabledTools.filter((t: string) =>
          !['workspace', 'notion', 'github', 'filesystem', 'knowledgeGraph', 'perplexity', 'developer', 'screen', 'memory'].includes(t)
        ),
      };

      const configuration: AgentConfiguration = {
        agentId: data.agentId || agentId,
        agentName: data.agentName || agentId,
        model: data.model || 'claude-haiku-4-5',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens || 4096,
        enabledTools,
        agencyMode: data.agencyMode || 'autonomous',  // Fixed: was 'auto', now matches available options
        isActive: data.isActive ?? true,
        mcpServers,
      };

      setConfig(configuration);
      console.log(`✅ [useAgentConfiguration] Loaded config for ${agentId}:`, {
        enabledTools,
        agencyMode: configuration.agencyMode,
        mcpServers,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ [useAgentConfiguration] Error loading config for ${agentId}:`, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const updateConfig = useCallback(async (newConfig: Partial<AgentConfiguration>) => {
    if (!agentId) return;

    try {
      // Optimistic update
      setConfig(prev => prev ? { ...prev, ...newConfig } as AgentConfiguration : null);

      const response = await fetch(`/api/goose/settings/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error(`Failed to update configuration: ${response.statusText}`);
      }

      // Reload to ensure sync
      await loadConfiguration();
    } catch (err) {
      console.error(`❌ [useAgentConfiguration] Error updating config:`, err);
      // Revert on error (reload)
      loadConfiguration();
      throw err;
    }
  }, [agentId, loadConfiguration]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    config,
    loading,
    error,
    reload: loadConfiguration,
    updateConfig,
  };
}
