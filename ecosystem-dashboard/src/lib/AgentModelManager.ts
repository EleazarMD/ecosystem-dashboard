/**
 * Agent Model Manager
 * Per-agent LLM model configuration with persistent memory
 */

interface AgentModelConfig {
  agentId: string;
  model: string;
  lastUpdated: string;
  source: 'ui' | 'api' | 'agent' | 'startup';
}

interface AgentModelListener {
  (agentId: string, newModel: string, oldModel: string): void;
}

class AgentModelManager {
  private static instance: AgentModelManager;
  private agentModels: Map<string, string> = new Map();
  private listeners: Set<AgentModelListener> = new Set();
  private settingsDir: string;

  constructor() {
    this.settingsDir = process.cwd() + '/.agent-settings';
    this.initialize();
  }

  static getInstance(): AgentModelManager {
    if (!AgentModelManager.instance) {
      AgentModelManager.instance = new AgentModelManager();
    }
    return AgentModelManager.instance;
  }

  /**
   * Initialize by loading all agent models from persistent storage
   */
  private async initialize(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      
      // Ensure settings directory exists
      try {
        await fs.mkdir(this.settingsDir, { recursive: true });
      } catch { /* ignore if exists */ }

      // Load all agent settings files
      const files = await fs.readdir(this.settingsDir);
      const settingsFiles = files.filter(f => f.endsWith('.json'));

      for (const file of settingsFiles) {
        const agentId = file.replace('.json', '');
        await this.loadAgentModel(agentId);
      }

      console.log(`📚 Loaded models for ${this.agentModels.size} agents from persistent storage`);
    } catch (error) {
      console.error('❌ Failed to initialize AgentModelManager:', error);
    }
  }

  /**
   * Load a specific agent's model from persistent storage
   */
  private async loadAgentModel(agentId: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const filePath = `${this.settingsDir}/${agentId}.json`;
      
      const data = await fs.readFile(filePath, 'utf8');
      const settings = JSON.parse(data);
      
      if (settings.model) {
        this.agentModels.set(agentId, settings.model);
        console.log(`📖 Loaded model for ${agentId}: ${settings.model}`);
      }
    } catch (error) {
      // If no settings file exists, use default
      const defaultModel = this.getDefaultModel(agentId);
      this.agentModels.set(agentId, defaultModel);
      console.log(`🎯 Using default model for ${agentId}: ${defaultModel}`);
    }
  }

  /**
   * Get agent-specific default model
   */
  private getDefaultModel(agentId: string): string {
    // Agent-specific defaults based on their capabilities
    const agentDefaults: Record<string, string> = {
      'dashboard_ai_coordinator': 'llama3.2:3b',        // Multi-modal capabilities
      'reasoning-agent': 'gemini-2.0-flash-exp',        // Complex reasoning
      'vector-search-agent': 'gemma3:4b',               // Fast retrieval
      'documentation-agent': 'mistral:latest',           // Text generation
      'memory-agent': 'llama3.2:3b',                    // Context management
      'graph-query-agent': 'gemma3:4b',                 // Structured queries
      'integration-agent': 'mistral:latest'              // API handling
    };

    return agentDefaults[agentId] || 
           process.env.NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL || 
           'mistral:latest';
  }

  /**
   * Update a specific agent's model
   */
  async updateAgentModel(
    agentId: string, 
    newModel: string, 
    source: 'ui' | 'api' | 'agent' | 'startup' = 'ui'
  ): Promise<void> {
    const oldModel = this.agentModels.get(agentId);
    
    if (oldModel === newModel) {
      console.log(`⚪ No change needed for ${agentId}: already using ${newModel}`);
      return;
    }

    console.log(`🔄 [${source}] Updating ${agentId} model: ${oldModel || 'default'} → ${newModel}`);

    try {
      // 1. Update in-memory cache
      this.agentModels.set(agentId, newModel);

      // 2. Persist to storage
      await this.persistAgentModel(agentId, newModel, source);

      // 3. Notify running agent
      await this.notifyAgent(agentId, newModel);

      // 4. Notify listeners (UI components)
      this.notifyListeners(agentId, newModel, oldModel || 'default');

      console.log(`✅ Successfully updated ${agentId} to model: ${newModel}`);

    } catch (error) {
      // Rollback on failure
      if (oldModel) {
        this.agentModels.set(agentId, oldModel);
      } else {
        this.agentModels.delete(agentId);
      }
      console.error(`❌ Failed to update ${agentId} model:`, error);
      throw error;
    }
  }

  /**
   * Get current model for an agent
   */
  getAgentModel(agentId: string): string {
    const model = this.agentModels.get(agentId);
    if (!model) {
      // Load on demand if not in cache
      this.loadAgentModel(agentId);
      return this.getDefaultModel(agentId);
    }
    return model;
  }

  /**
   * Get all agent models
   */
  getAllAgentModels(): Record<string, string> {
    return Object.fromEntries(this.agentModels);
  }

  /**
   * Persist agent model to storage
   */
  private async persistAgentModel(
    agentId: string, 
    model: string, 
    source: string
  ): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const filePath = `${this.settingsDir}/${agentId}.json`;
      
      let settings: any = {};
      
      // Load existing settings if they exist
      try {
        const data = await fs.readFile(filePath, 'utf8');
        settings = JSON.parse(data);
      } catch {
        // Create new settings if file doesn't exist
        settings = {
          agentId,
          name: agentId.replace(/_/g, ' '),
          description: `AI Agent: ${agentId}`,
          instruction: 'You are a helpful AI assistant.',
          temperature: 0.7,
          maxTokens: 2000,
          sessionMemory: true,
          voiceEnabled: false,
          safetyEnabled: true,
        };
      }

      // Update model and metadata
      settings.model = model;
      settings.lastUpdated = new Date().toISOString();
      settings.modelUpdateSource = source;

      // Write back to file
      await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
      console.log(`💾 Persisted ${agentId} model to storage: ${model}`);

    } catch (error) {
      console.error(`❌ Failed to persist ${agentId} model:`, error);
      throw error;
    }
  }

  /**
   * Notify running agent of model change
   */
  private async notifyAgent(agentId: string, newModel: string): Promise<void> {
    // Get agent's port from configuration
    const agentPorts: Record<string, number> = {
      'orchestrator': 41240,
      'graph-query': 41241,
      'vector-search': 41242,
      'documentation': 41243,
      'reasoning': 41244,
      'memory': 41245,
      'integration': 41246
    };

    const normalizedId = agentId.replace('_agent', '').replace('-agent', '');
    const port = agentPorts[normalizedId];

    if (!port) {
      console.log(`⚪ No running agent port found for ${agentId}, skipping live update`);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://localhost:${port}/config/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: newModel }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`🔗 Notified running agent ${agentId}:${port} of model change to: ${newModel}`);
      } else {
        console.warn(`⚠️ Agent ${agentId}:${port} responded with ${response.status}`);
      }
    } catch (error) {
      // Agent might not be running - this is okay
      console.debug(`⚪ Could not notify agent ${agentId}:${port} (likely offline):`, error.message);
    }
  }

  /**
   * Subscribe to agent model changes
   */
  onModelChange(callback: AgentModelListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of model change
   */
  private notifyListeners(agentId: string, newModel: string, oldModel: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(agentId, newModel, oldModel);
      } catch (error) {
        console.error('❌ Error in agent model change listener:', error);
      }
    });
  }

  /**
   * Bulk update multiple agents
   */
  async updateMultipleAgents(
    updates: Array<{ agentId: string; model: string }>,
    source: 'ui' | 'api' = 'ui'
  ): Promise<void> {
    console.log(`🔄 Bulk updating ${updates.length} agent models...`);

    const updatePromises = updates.map(({ agentId, model }) => 
      this.updateAgentModel(agentId, model, source)
    );

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    console.log(`✅ Bulk update complete: ${successful} successful, ${failed} failed`);
  }

  /**
   * Reset all agents to defaults
   */
  async resetAllToDefaults(): Promise<void> {
    console.log('🔄 Resetting all agents to default models...');
    
    const resets = Array.from(this.agentModels.keys()).map(agentId => ({
      agentId,
      model: this.getDefaultModel(agentId)
    }));

    await this.updateMultipleAgents(resets, 'api');
  }
}

export default AgentModelManager;
export const agentModelManager = AgentModelManager.getInstance();
