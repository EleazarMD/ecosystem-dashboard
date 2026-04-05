/**
 * AI Dashboard Agent Registration Service
 * 
 * Handles automatic registration of the AI Dashboard AI Agent with the
 * Agent Registry Service, making it discoverable by the Agent Development
 * Environment (ADE) and other ecosystem components.
 */

import axios from 'axios';
import logger from '@/lib/logger';

interface AgentRegistration {
  id: string;
  name: string;
  description: string;
  version: string;
  project: {
    id: string;
    name: string;
    description: string;
  };
  endpoints: {
    primary: string;
    health: string;
    api: string;
    websocket?: string;
  };
  capabilities: string[];
  parameters: {
    [key: string]: any;
  };
  isolation: 'shared' | 'dedicated' | 'sandboxed';
  role: 'assistant' | 'specialist' | 'coordinator' | 'monitor';
  status: 'active' | 'inactive' | 'maintenance';
  owner_id: string;
  access: 'public' | 'private' | 'restricted';
  tags: string[];
  metadata: {
    [key: string]: any;
  };
}

interface RegistrationResponse {
  success: boolean;
  message: string;
  data?: {
    agent: AgentRegistration;
    registered_at: string;
  };
  error?: string;
}

export class AgentRegistrationService {
  private registryUrl: string;
  private agentId: string;
  private registrationData: AgentRegistration;
  private isRegistered: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    this.registryUrl = process.env.AGENT_REGISTRY_URL || 'http://localhost:8888';
    this.agentId = 'ai-dashboard-agent';
    this.registrationData = this.createRegistrationData();
  }

  /**
   * Create the registration data for the AI Dashboard Agent
   */
  private createRegistrationData(): AgentRegistration {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8404';
    
    return {
      id: this.agentId,
      name: 'AI Dashboard Agent',
      description: 'Intelligent AI agent for AI Homelab Dashboard with Kubernetes infrastructure management, natural language processing, and ecosystem-wide coordination capabilities.',
      version: '1.0.0',
      project: {
        id: 'ai-homelab-dashboard',
        name: 'AI Homelab Dashboard',
        description: 'Comprehensive monitoring and management dashboard for AI Homelab ecosystem'
      },
      endpoints: {
        primary: `${baseUrl}/api/agent/process`,
        health: `${baseUrl}/api/health`,
        api: `${baseUrl}/api/agent`,
        websocket: `${baseUrl}/api/agent/websocket`
      },
      capabilities: [
        'natural_language_processing',
        'kubernetes_management',
        'infrastructure_optimization',
        'conversational_ai',
        'system_monitoring',
        'proactive_insights',
        'cost_analysis',
        'resource_optimization',
        'intelligent_recommendations',
        'multi_modal_interaction',
        'voice_processing',
        'ecosystem_coordination',
        'learning_system',
        'pattern_recognition'
      ],
      parameters: {
        supported_languages: ['en'],
        max_context_length: 4000,
        confidence_threshold: 0.7,
        response_timeout: 30000,
        kubernetes_integration: true,
        ahis_integration: true,
        google_adk_support: true,
        ollama_support: true,
        learning_enabled: true,
        proactive_monitoring: true
      },
      isolation: 'shared',
      role: 'assistant',
      status: 'active',
      owner_id: 'ai-homelab-system',
      access: 'public',
      tags: [
        'ai-agent',
        'dashboard',
        'kubernetes',
        'infrastructure',
        'nlp',
        'conversational',
        'monitoring',
        'optimization',
        'homelab',
        'ecosystem'
      ],
      metadata: {
        platform: 'ai-homelab-dashboard',
        runtime: 'nodejs',
        ui_framework: 'nextjs-react',
        ai_models: ['google-adk', 'ollama-gemma3'],
        integrations: ['kubernetes', 'ahis', 'agent-registry'],
        deployment_type: 'web-application',
        kubernetes_operator_port: 8081,
        ahis_server_port: 8895,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    };
  }

  /**
   * Register the AI Dashboard Agent with the Agent Registry Service
   */
  async registerAgent(): Promise<boolean> {
    try {
      logger.info('[AgentRegistration] Registering AI Dashboard Agent with Agent Registry Service...');

      const response = await axios.post(
        `${this.registryUrl}/api/v1/agents`,
        this.registrationData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Dashboard-Agent/1.0.0'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        this.isRegistered = true;
        logger.info(`[AgentRegistration] ✅ Successfully registered AI Dashboard Agent with ID: ${this.agentId}`);
        logger.info(`[AgentRegistration] Agent is now discoverable by ADE and other ecosystem components`);
        
        // Start heartbeat to maintain registration
        this.startHeartbeat();
        
        return true;
      } else {
        logger.error(`[AgentRegistration] ❌ Failed to register agent: ${response.data.message}`);
        return false;
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          logger.warn('[AgentRegistration] ⚠️ Agent Registry Service not available - will retry later');
        } else if (error.response?.status === 409) {
          logger.info('[AgentRegistration] 📝 Agent already registered - updating registration');
          return await this.updateAgent();
        } else {
          logger.error(`[AgentRegistration] ❌ Registration failed: ${error.message}`);
        }
      } else {
        logger.error(`[AgentRegistration] ❌ Unexpected error during registration: ${error}`);
      }
      return false;
    }
  }

  /**
   * Update existing agent registration
   */
  async updateAgent(): Promise<boolean> {
    try {
      logger.info('[AgentRegistration] Updating AI Dashboard Agent registration...');

      // Update the last_updated timestamp
      this.registrationData.metadata.last_updated = new Date().toISOString();

      const response = await axios.put(
        `${this.registryUrl}/api/v1/agents/${this.agentId}`,
        this.registrationData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Dashboard-Agent/1.0.0'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        this.isRegistered = true;
        logger.info(`[AgentRegistration] ✅ Successfully updated AI Dashboard Agent registration`);
        
        // Start heartbeat if not already running
        if (!this.heartbeatInterval) {
          this.startHeartbeat();
        }
        
        return true;
      } else {
        logger.error(`[AgentRegistration] ❌ Failed to update agent: ${response.data.message}`);
        return false;
      }

    } catch (error) {
      logger.error(`[AgentRegistration] ❌ Update failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /**
   * Unregister the agent from the registry
   */
  async unregisterAgent(): Promise<boolean> {
    try {
      logger.info('[AgentRegistration] Unregistering AI Dashboard Agent...');

      const response = await axios.delete(
        `${this.registryUrl}/api/v1/agents/${this.agentId}`,
        {
          headers: {
            'User-Agent': 'AI-Dashboard-Agent/1.0.0'
          },
          timeout: 10000
        }
      );

      if (response.data.success) {
        this.isRegistered = false;
        this.stopHeartbeat();
        logger.info(`[AgentRegistration] ✅ Successfully unregistered AI Dashboard Agent`);
        return true;
      } else {
        logger.error(`[AgentRegistration] ❌ Failed to unregister agent: ${response.data.message}`);
        return false;
      }

    } catch (error) {
      logger.error(`[AgentRegistration] ❌ Unregistration failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /**
   * Check if agent is currently registered
   */
  async checkRegistrationStatus(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.registryUrl}/api/v1/agents/${this.agentId}`,
        {
          headers: {
            'User-Agent': 'AI-Dashboard-Agent/1.0.0'
          },
          timeout: 5000
        }
      );

      return response.data.success && response.data.data?.agent;

    } catch (error) {
      return false;
    }
  }

  /**
   * Start heartbeat to maintain agent registration
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send heartbeat every 5 minutes
    this.heartbeatInterval = setInterval(async () => {
      try {
        const isRegistered = await this.checkRegistrationStatus();
        
        if (!isRegistered) {
          logger.warn('[AgentRegistration] ⚠️ Agent registration lost - attempting to re-register');
          await this.registerAgent();
        } else {
          logger.debug('[AgentRegistration] 💓 Heartbeat: Agent registration active');
        }
      } catch (error) {
        logger.debug('[AgentRegistration] Heartbeat check failed - will retry next cycle');
      }
    }, 5 * 60 * 1000); // 5 minutes

    logger.info('[AgentRegistration] 💓 Heartbeat monitoring started');
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
      logger.info('[AgentRegistration] 💓 Heartbeat monitoring stopped');
    }
  }

  /**
   * Sync agent to ADE (Agent Development Environment)
   */
  async syncToADE(): Promise<boolean> {
    try {
      logger.info('[AgentRegistration] Syncing AI Dashboard Agent to ADE...');

      const response = await axios.post(
        `${this.registryUrl}/api/v1/agents/ade/${this.agentId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Dashboard-Agent/1.0.0'
          },
          timeout: 15000
        }
      );

      if (response.data.success) {
        logger.info(`[AgentRegistration] ✅ Successfully synced AI Dashboard Agent to ADE`);
        logger.info(`[AgentRegistration] ADE Agent ID: ${response.data.data?.adeAgentId}`);
        return true;
      } else {
        logger.error(`[AgentRegistration] ❌ Failed to sync to ADE: ${response.data.message}`);
        return false;
      }

    } catch (error) {
      logger.error(`[AgentRegistration] ❌ ADE sync failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  /**
   * Get current registration status and information
   */
  getRegistrationInfo(): {
    isRegistered: boolean;
    agentId: string;
    registryUrl: string;
    registrationData: AgentRegistration;
    heartbeatActive: boolean;
  } {
    return {
      isRegistered: this.isRegistered,
      agentId: this.agentId,
      registryUrl: this.registryUrl,
      registrationData: this.registrationData,
      heartbeatActive: !!this.heartbeatInterval
    };
  }

  /**
   * Initialize the registration service
   */
  async initialize(): Promise<boolean> {
    logger.info('[AgentRegistration] Initializing AI Dashboard Agent Registration Service...');
    
    // Attempt to register the agent
    const registered = await this.registerAgent();
    
    if (registered) {
      // Also sync to ADE if possible
      setTimeout(async () => {
        await this.syncToADE();
      }, 2000); // Wait 2 seconds before ADE sync
    }
    
    return registered;
  }

  /**
   * Shutdown the registration service
   */
  async shutdown(): Promise<void> {
    logger.info('[AgentRegistration] Shutting down Agent Registration Service...');
    
    this.stopHeartbeat();
    
    if (this.isRegistered) {
      await this.unregisterAgent();
    }
    
    logger.info('[AgentRegistration] Agent Registration Service shutdown complete');
  }
}

// Export singleton instance
export const agentRegistrationService = new AgentRegistrationService();
export default agentRegistrationService;
