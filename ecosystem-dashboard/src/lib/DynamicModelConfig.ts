/**
 * Dynamic Model Configuration Manager
 * Updates LLM variables on-the-fly and notifies all agents
 */

class DynamicModelConfig {
  private static instance: DynamicModelConfig;
  private currentModel: string;
  private listeners: Set<(model: string) => void> = new Set();
  private configPath: string;

  constructor() {
    this.currentModel = process.env.NEXT_PUBLIC_AI_MODEL || 
                       process.env.NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL || 
                       'mistral:latest';
    this.configPath = process.cwd() + '/.env';
  }

  static getInstance(): DynamicModelConfig {
    if (!DynamicModelConfig.instance) {
      DynamicModelConfig.instance = new DynamicModelConfig();
    }
    return DynamicModelConfig.instance;
  }

  /**
   * Update the global LLM model dynamically
   */
  async updateModel(newModel: string, source: 'ui' | 'api' | 'agent' = 'ui'): Promise<void> {
    console.log(`🔄 [${source}] Updating global model: ${this.currentModel} → ${newModel}`);
    
    const previousModel = this.currentModel;
    this.currentModel = newModel;

    try {
      // 1. Update runtime environment
      process.env.NEXT_PUBLIC_AI_MODEL = newModel;
      process.env.NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL = newModel;

      // 2. Persist to .env file
      await this.updateEnvFile(newModel);

      // 3. Notify all agents/components
      this.notifyListeners(newModel);

      // 4. Update AI Gateway default
      await this.updateAIGatewayDefault(newModel);

      // 5. Broadcast to Knowledge Graph agents
      await this.broadcastToAgents(newModel);

      console.log(`✅ Global model updated successfully to: ${newModel}`);
      
    } catch (error) {
      console.error(`❌ Failed to update model to ${newModel}:`, error);
      // Rollback on failure
      this.currentModel = previousModel;
      process.env.NEXT_PUBLIC_AI_MODEL = previousModel;
      throw error;
    }
  }

  /**
   * Get current model (single source of truth)
   */
  getCurrentModel(): string {
    return this.currentModel;
  }

  /**
   * Subscribe to model changes
   */
  onModelChange(callback: (model: string) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Update .env file with new model
   */
  private async updateEnvFile(newModel: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      let envContent = '';
      
      try {
        envContent = await fs.readFile(this.configPath, 'utf8');
      } catch {
        // Create new .env if it doesn't exist
        envContent = '';
      }

      // Update or add the model variables
      const lines = envContent.split('\n');
      const updatedLines: string[] = [];
      let foundAIModel = false;
      let foundGatewayModel = false;

      for (const line of lines) {
        if (line.startsWith('NEXT_PUBLIC_AI_MODEL=')) {
          updatedLines.push(`NEXT_PUBLIC_AI_MODEL=${newModel}`);
          foundAIModel = true;
        } else if (line.startsWith('NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL=')) {
          updatedLines.push(`NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL=${newModel}`);
          foundGatewayModel = true;
        } else {
          updatedLines.push(line);
        }
      }

      // Add missing variables
      if (!foundAIModel) {
        updatedLines.push(`NEXT_PUBLIC_AI_MODEL=${newModel}`);
      }
      if (!foundGatewayModel) {
        updatedLines.push(`NEXT_PUBLIC_AI_GATEWAY_DEFAULT_MODEL=${newModel}`);
      }

      await fs.writeFile(this.configPath, updatedLines.join('\n'));
      console.log(`📝 Updated .env file with model: ${newModel}`);
      
    } catch (error) {
      console.error('❌ Failed to update .env file:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Notify all registered listeners
   */
  private notifyListeners(newModel: string): void {
    for (const listener of this.listeners) {
      try {
        listener(newModel);
      } catch (error) {
        console.error('❌ Error in model change listener:', error);
      }
    }
  }

  /**
   * Update AI Gateway default model
   */
  private async updateAIGatewayDefault(newModel: string): Promise<void> {
    try {
      const response = await fetch('/api/ai-gateway/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultModel: newModel,
          action: 'update_default_model'
        })
      });

      if (response.ok) {
        console.log(`✅ AI Gateway default model updated to: ${newModel}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not update AI Gateway default (non-critical):', error);
    }
  }

  /**
   * Broadcast model change to all Knowledge Graph agents
   */
  private async broadcastToAgents(newModel: string): Promise<void> {
    const agentPorts = [41240, 41241, 41242, 41243, 41244, 41245, 41246];
    
    const broadcasts = agentPorts.map(async (port) => {
      try {
        const response = await fetch(`http://localhost:${port}/config/model`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: newModel }),
          timeout: 3000
        });
        
        if (response.ok) {
          console.log(`✅ Agent on port ${port} updated to model: ${newModel}`);
        }
      } catch (error) {
        // Agents might not be running - non-critical
        console.debug(`⚠️ Could not update agent on port ${port}:`, error.message);
      }
    });

    await Promise.allSettled(broadcasts);
  }

  /**
   * Force reload all agent configurations
   */
  async reloadAllAgents(): Promise<void> {
    console.log('🔄 Reloading all agent configurations...');
    
    try {
      // Notify UI components to reload
      this.notifyListeners(this.currentModel);
      
      // Update agent settings in persistent storage
      const response = await fetch('/api/agent-settings/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.currentModel,
          updateAllAgents: true
        })
      });

      if (response.ok) {
        console.log('✅ All agent configurations reloaded');
      }
    } catch (error) {
      console.error('❌ Failed to reload agent configurations:', error);
    }
  }
}

export default DynamicModelConfig;
export const modelConfig = DynamicModelConfig.getInstance();
