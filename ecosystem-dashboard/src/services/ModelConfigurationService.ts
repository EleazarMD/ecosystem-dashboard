/**
 * Model Configuration Service
 * Handles ecosystem-wide model selection events and propagation
 */

import EventEmitter from 'events';

interface AgentConfiguration {
  name: string;
  description: string;
  instruction: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  sessionMemory: boolean;
  voiceEnabled: boolean;
  safetyEnabled: boolean;
  streamingEnabled: boolean;
  thinkingBudget: number;
  outputKey: string;
  agentClass: 'LlmAgent' | 'WorkflowAgent' | 'CustomAgent';
  safetySettings: {
    harmCategory: string;
    threshold: string;
  }[];
  callbacks: {
    beforeModel: boolean;
    beforeTool: boolean;
    afterModel: boolean;
  };
  tools: string[];
  subAgents: string[];
}

export interface ModelChangeEvent {
  agentId: string;
  previousModel: string;
  newModel: string;
  configuration: AgentConfiguration;
  timestamp: string;
  triggeredBy: 'user' | 'system' | 'fallback';
}

class ModelConfigurationService extends EventEmitter {
  private static instance: ModelConfigurationService;
  private activeModels: Map<string, AgentConfiguration> = new Map();

  static getInstance(): ModelConfigurationService {
    if (!ModelConfigurationService.instance) {
      ModelConfigurationService.instance = new ModelConfigurationService();
    }
    return ModelConfigurationService.instance;
  }

  /**
   * Update agent model configuration and broadcast changes
   */
  async updateAgentModel(agentId: string, newConfig: AgentConfiguration): Promise<void> {
    const previousConfig = this.activeModels.get(agentId);
    const previousModel = previousConfig?.model || 'unknown';

    // Update local cache
    this.activeModels.set(agentId, newConfig);

    // Create model change event
    const event: ModelChangeEvent = {
      agentId,
      previousModel,
      newModel: newConfig.model,
      configuration: newConfig,
      timestamp: new Date().toISOString(),
      triggeredBy: 'user'
    };

    console.log(`🔄 Model change detected for ${agentId}: ${previousModel} → ${newConfig.model}`);

    // Broadcast to all registered listeners
    this.emit('model:changed', event);
    this.emit(`model:changed:${agentId}`, event);

    // Specific downstream updates
    await this.notifyAgentRuntime(event);
    await this.notifyAIGateway(event);
    await this.notifyDashboard(event);
    await this.notifyKnowledgeGraph(event);
  }

  /**
   * Get current active models across the ecosystem
   */
  getActiveModels(): Record<string, AgentConfiguration> {
    const result: Record<string, AgentConfiguration> = {};
    this.activeModels.forEach((config, agentId) => {
      result[agentId] = config;
    });
    return result;
  }

  /**
   * Get model usage statistics
   */
  async getModelUsageStats(): Promise<Record<string, any>> {
    const usage: Record<string, any> = {};
    
    for (const [agentId, config] of this.activeModels) {
      const model = config.model;
      if (!usage[model]) {
        usage[model] = {
          agents: [],
          totalAgents: 0,
          estimatedCost: 0,
          requestCount: 0
        };
      }
      usage[model].agents.push(agentId);
      usage[model].totalAgents++;
    }

    return usage;
  }

  /**
   * Notify agent runtime of model changes
   */
  private async notifyAgentRuntime(event: ModelChangeEvent): Promise<void> {
    try {
      await fetch('/api/agents/runtime/model-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      console.log(`✅ Agent runtime notified for ${event.agentId}`);
    } catch (error) {
      console.error('❌ Failed to notify agent runtime:', error);
    }
  }

  /**
   * Notify AI Gateway of routing changes
   */
  private async notifyAIGateway(event: ModelChangeEvent): Promise<void> {
    try {
      const routingUpdate = {
        agentId: event.agentId,
        model: event.newModel,
        routing: {
          primary: event.newModel,
          fallback: this.getFallbackModels(event.newModel),
          priority: 'high'
        },
        generationConfig: {
          temperature: event.configuration.temperature,
          maxOutputTokens: event.configuration.maxTokens,
          topP: event.configuration.topP,
          topK: event.configuration.topK
        }
      };

      await fetch('/api/ai-gateway/routing/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingUpdate)
      });
      console.log(`✅ AI Gateway routing updated for ${event.agentId}`);
    } catch (error) {
      console.error('❌ Failed to notify AI Gateway:', error);
    }
  }

  /**
   * Notify dashboard for real-time metrics
   */
  private async notifyDashboard(event: ModelChangeEvent): Promise<void> {
    try {
      // Update real-time metrics
      this.emit('dashboard:model:update', {
        agentId: event.agentId,
        model: event.newModel,
        timestamp: event.timestamp,
        stats: await this.getModelUsageStats()
      });
      console.log(`✅ Dashboard metrics updated for ${event.agentId}`);
    } catch (error) {
      console.error('❌ Failed to notify dashboard:', error);
    }
  }

  /**
   * Log to Knowledge Graph for observability
   */
  private async notifyKnowledgeGraph(event: ModelChangeEvent): Promise<void> {
    try {
      await fetch('/api/knowledge-graph/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MODEL_CONFIGURATION_CHANGE',
          entity: `agent:${event.agentId}`,
          event: event,
          metadata: {
            impact: 'runtime_configuration',
            category: 'system_change',
            severity: 'info'
          }
        })
      });
      console.log(`✅ Knowledge Graph updated for ${event.agentId}`);
    } catch (error) {
      console.error('❌ Failed to notify Knowledge Graph:', error);
    }
  }

  /**
   * Get fallback models for reliability
   */
  private getFallbackModels(primaryModel: string): string[] {
    const fallbackMap: Record<string, string[]> = {
      'gemini-2.0-flash-thinking-exp': ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
      'gemini-2.0-flash-exp': ['gemini-1.5-pro', 'gemini-1.5-flash'],
      'gemini-1.5-pro': ['gemini-1.5-flash', 'gemini-2.0-flash-exp'],
      'gemini-1.5-flash': ['gemini-1.5-pro', 'gemini-2.0-flash-exp']
    };
    return fallbackMap[primaryModel] || ['gemini-1.5-flash'];
  }

  /**
   * Initialize service with existing agent configurations
   */
  async initialize(): Promise<void> {
    try {
      const response = await fetch('/api/agents');
      const { agents } = await response.json();
      
      for (const agent of agents) {
        const configResponse = await fetch(`/api/agent-settings?agentId=${agent.id}`);
        const { settings } = await configResponse.json();
        if (settings && !settings.isDefault) {
          this.activeModels.set(agent.id, settings);
        }
      }
      
      console.log(`🚀 ModelConfigurationService initialized with ${this.activeModels.size} agent configurations`);
    } catch (error) {
      console.error('❌ Failed to initialize ModelConfigurationService:', error);
    }
  }
}

export default ModelConfigurationService;
