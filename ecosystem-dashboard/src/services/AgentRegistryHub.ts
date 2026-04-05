/**
 * Agent Registry Hub - Single Source of Truth for Agent Configurations
 * 
 * This service integrates with AHIS Server to provide centralized agent management
 * across the entire AI Homelab Ecosystem. All UIs and systems MUST use this service.
 * 
 * Architecture:
 * - Dashboard UI (Agent Settings) ←→ Agent Registry Hub ←→ AHIS Server ←→ PostgreSQL
 * - AI Gateway UI (Routing) ←→ Agent Registry Hub ←→ AHIS Server ←→ PostgreSQL  
 * - Inference Dashboard ←→ Agent Registry Hub ←→ AHIS Server ←→ PostgreSQL
 * - Agent Runtime ←→ Agent Registry Hub (WebSocket subscriptions)
 */

import EventEmitter from 'events';
import AHISServerManager from './AHISServerManager';

// Core agent configuration interface
export interface AgentConfiguration {
  // Core Identity
  agentId: string;
  name: string;
  description: string;
  instruction: string;
  
  // Model & Generation
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  thinkingBudget: number;
  streamingEnabled: boolean;
  
  // Capabilities
  agentClass: 'LlmAgent' | 'WorkflowAgent' | 'CustomAgent';
  tools: string[];
  subAgents: string[];
  
  // Safety & Behavior
  safetyEnabled: boolean;
  safetySettings: Array<{
    harmCategory: string;
    threshold: string;
  }>;
  callbacks: {
    beforeModel: boolean;
    beforeTool: boolean;
    afterModel: boolean;
  };
  
  // Features
  sessionMemory: boolean;
  voiceEnabled: boolean;
  outputKey: string;
  
  // Registry Metadata
  version: number;
  lastUpdated: string;
  updatedBy: string;
  isActive: boolean;
  registrationSource: 'dashboard_ui' | 'ai_gateway_ui' | 'inference_ui' | 'runtime' | 'api';
  
  // Ecosystem Integration
  ecosystem: {
    // AHIS Integration
    ahisRegistration: {
      registered: boolean;
      lastHeartbeat?: string;
      serviceEndpoint?: string;
    };
    
    // AI Gateway Configuration
    routing: {
      priority: 'high' | 'medium' | 'low';
      fallbackModels: string[];
      loadBalancing: boolean;
      rateLimiting?: {
        requestsPerMinute: number;
        burstLimit: number;
      };
    };
    
    // Dashboard Metrics
    monitoring: {
      enableMetrics: boolean;
      alertThresholds: {
        responseTime: number;
        errorRate: number;
        costPerRequest: number;
      };
      displayConfig: {
        showInDashboard: boolean;
        chartColor: string;
        groupCategory: string;
      };
    };
    
    // Knowledge Graph Integration
    knowledgeGraph: {
      trackInteractions: boolean;
      entityTypes: string[];
      relationships: string[];
    };
  };
}

// Event types for ecosystem-wide notifications
export interface AgentRegistryEvent {
  type: 'agent:registered' | 'agent:updated' | 'agent:deactivated' | 'agent:configuration:changed';
  agentId: string;
  configuration: AgentConfiguration;
  previousConfiguration?: AgentConfiguration;
  changedFields?: string[];
  source: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class AgentRegistryHub extends EventEmitter {
  private static instance: AgentRegistryHub;
  private ahisBaseUrl: string;
  private registryCache: Map<string, AgentConfiguration> = new Map();
  private subscriptions: Map<string, WebSocket> = new Map();
  private isInitialized = false;
  private ahisManager: AHISServerManager;

  constructor() {
    super();
    // AHIS Server endpoint from SERVICE_REGISTRY.yml
    this.ahisBaseUrl = process.env.AHIS_SERVER_URL || 'http://localhost:8888';
    this.ahisManager = AHISServerManager.getInstance();
  }

  static getInstance(): AgentRegistryHub {
    if (!AgentRegistryHub.instance) {
      AgentRegistryHub.instance = new AgentRegistryHub();
    }
    return AgentRegistryHub.instance;
  }

  /**
   * Initialize the Agent Registry Hub
   * - Start AHIS Server if needed
   * - Connect to AHIS Server
   * - Load existing agent configurations
   * - Setup real-time subscriptions
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Agent Registry Hub...');
      
      // 1. Initialize AHIS Server Management
      await this.ahisManager.initialize();
      
      // 2. Verify AHIS Server connectivity (with retries)
      await this.verifyAHISConnection();
      
      // 3. Load existing agent configurations
      await this.loadExistingConfigurations();
      
      // 4. Setup real-time subscriptions
      await this.setupRealtimeSubscriptions();
      
      // 5. Register this dashboard as an agent registry client
      await this.registerWithAHIS();
      
      this.isInitialized = true;
      console.log('✅ Agent Registry Hub initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Agent Registry Hub:', error);
      
      // Emit warning but don't throw - allow graceful degradation
      this.emit('initialization_warning', {
        message: 'Agent Registry Hub initialization failed, operating in fallback mode',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Mark as initialized in fallback mode
      this.isInitialized = true;
    }
  }

  /**
   * Register or update agent configuration
   * This is the SINGLE point of truth for all agent configuration changes
   */
  async registerAgent(config: Partial<AgentConfiguration>, source: string): Promise<AgentConfiguration> {
    const fullConfig: AgentConfiguration = {
      ...this.getDefaultConfiguration(config.agentId!),
      ...config,
      version: (config.version || 0) + 1,
      lastUpdated: new Date().toISOString(),
      registrationSource: source as any,
    } as AgentConfiguration;

    // Validate configuration
    await this.validateConfiguration(fullConfig);

    try {
      // Try to store in AHIS Server (single source of truth)
      const response = await fetch(`${this.ahisBaseUrl}/api/ahis/v1/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: fullConfig,
          source,
          ecosystem_integration: true
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`AHIS registration failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Agent ${fullConfig.agentId} registered in AHIS ecosystem registry`);
      
    } catch (error) {
      console.warn(`⚠️ AHIS Server unavailable, using local registry for agent ${fullConfig.agentId}:`, error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback: Save to legacy agent-settings API
      try {
        const fallbackResponse = await fetch('/api/agent-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            agentId: fullConfig.agentId, 
            ...fullConfig 
          })
        });
        
        if (fallbackResponse.ok) {
          console.log(`✅ Agent ${fullConfig.agentId} saved to fallback agent-settings storage`);
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback to agent-settings also failed:', fallbackError);
      }
      
      // Continue with local registration - don't fail the entire operation
    }

    // Always update local cache and emit events (whether AHIS succeeded or not)
    this.registryCache.set(fullConfig.agentId, fullConfig);

    // Create registry event
    const event: AgentRegistryEvent = {
      type: this.registryCache.has(fullConfig.agentId) ? 'agent:updated' : 'agent:registered',
      agentId: fullConfig.agentId,
      configuration: fullConfig,
      source,
      timestamp: fullConfig.lastUpdated
    };

    console.log(`✅ Agent ${fullConfig.agentId} registered in local registry`);

    try {
      // Try to broadcast to ecosystem components (but don't fail if this fails)
      await this.broadcastToEcosystem(event);
    } catch (broadcastError) {
      console.warn('⚠️ Failed to broadcast to ecosystem, continuing with local registration:', broadcastError);
    }
    
    // Emit local events
    this.emit('agent:registry:changed', event);
    this.emit(`agent:${fullConfig.agentId}:changed`, event);

    return fullConfig;
  }

  /**
   * Get agent configuration - reads from cache or AHIS
   */
  async getAgent(agentId: string): Promise<AgentConfiguration | null> {
    // Check cache first
    if (this.registryCache.has(agentId)) {
      return this.registryCache.get(agentId)!;
    }

    try {
      // Fetch from AHIS Server
      const response = await fetch(`${this.ahisBaseUrl}/api/ahis/v1/agents/${agentId}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`AHIS fetch failed: ${response.statusText}`);
      }

      const { agent } = await response.json();
      
      // Update cache
      if (agent) {
        this.registryCache.set(agentId, agent);
      }
      
      return agent || null;
      
    } catch (error) {
      console.error(`❌ Failed to fetch agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Get all active agents in the ecosystem
   */
  async getAllAgents(): Promise<Record<string, AgentConfiguration>> {
    try {
      const response = await fetch(`${this.ahisBaseUrl}/api/ahis/v1/agents`);
      
      if (!response.ok) {
        throw new Error(`AHIS fetch failed: ${response.statusText}`);
      }

      const { agents } = await response.json();
      
      // Update cache
      const agentMap: Record<string, AgentConfiguration> = {};
      agents.forEach((agent: AgentConfiguration) => {
        this.registryCache.set(agent.agentId, agent);
        agentMap[agent.agentId] = agent;
      });
      
      return agentMap;
      
    } catch (error) {
      console.error('❌ Failed to fetch all agents:', error);
      return {};
    }
  }

  /**
   * Subscribe to agent configuration changes
   * Used by UI components and runtime systems
   */
  subscribeToAgent(agentId: string, callback: (event: AgentRegistryEvent) => void): () => void {
    const eventName = `agent:${agentId}:changed`;
    this.on(eventName, callback);
    
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to ecosystem-wide agent changes
   */
  subscribeToRegistry(callback: (event: AgentRegistryEvent) => void): () => void {
    this.on('agent:registry:changed', callback);
    return () => this.off('agent:registry:changed', callback);
  }

  // Private helper methods
  
  private async verifyAHISConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.ahisBaseUrl}/api/ahis/health`);
      if (!response.ok) {
        throw new Error(`AHIS health check failed: ${response.statusText}`);
      }
      console.log('✅ AHIS Server connection verified');
    } catch (error) {
      console.error('❌ AHIS Server not available:', error);
      throw new Error('AHIS Server is required for Agent Registry Hub');
    }
  }

  private async loadExistingConfigurations(): Promise<void> {
    console.log('📄 Loading existing agent configurations from AHIS...');
    const agents = await this.getAllAgents();
    console.log(`✅ Loaded ${Object.keys(agents).length} agent configurations`);
  }

  private async setupRealtimeSubscriptions(): Promise<void> {
    // Setup WebSocket connection to AHIS for real-time updates
    const wsUrl = this.ahisBaseUrl.replace('http', 'ws') + '/ws/agents';
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const registryEvent: AgentRegistryEvent = JSON.parse(event.data);
        this.handleRealtimeUpdate(registryEvent);
      };
      
      ws.onopen = () => {
        console.log('✅ Real-time agent registry subscription established');
      };
      
      ws.onerror = (error) => {
        console.warn('⚠️ Real-time subscription error (continuing without):', error);
      };
      
    } catch (error) {
      console.warn('⚠️ Real-time subscriptions not available (continuing without):', error);
    }
  }

  private async registerWithAHIS(): Promise<void> {
    await fetch(`${this.ahisBaseUrl}/api/ahis/v1/clients/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'ecosystem-dashboard',
        clientType: 'agent_registry_hub',
        capabilities: ['agent_configuration', 'ui_management', 'real_time_updates'],
        version: '2.0.0'
      })
    });
  }

  private async broadcastToEcosystem(event: AgentRegistryEvent): Promise<void> {
    // Notify all ecosystem components of the change
    const notifications = [
      // AI Gateway - Update routing
      this.notifyAIGateway(event),
      // Dashboard - Update metrics
      this.notifyDashboard(event),
      // Knowledge Graph - Log change
      this.notifyKnowledgeGraph(event),
      // Agent Runtime - Hot reload config
      this.notifyAgentRuntime(event)
    ];

    await Promise.allSettled(notifications);
  }

  private async notifyAIGateway(event: AgentRegistryEvent): Promise<void> {
    try {
      // Call real AI Gateway v2.2.1 for agent registration
      const aiGatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'http://localhost:8777';
      const apiKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
      
      await fetch(`${aiGatewayUrl}/api/v1/agents/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          agentId: event.agentId,
          name: event.configuration.name,
          description: event.configuration.description,
          agentClass: event.configuration.agentClass,
          tools: event.configuration.tools,
          model: event.configuration.model,
          status: event.type === 'agent:registered' ? 'active' : 'inactive',
          eventType: event.type,
        })
      });
    } catch (error) {
      console.warn('⚠️ AI Gateway notification failed:', error);
    }
  }

  private async notifyDashboard(event: AgentRegistryEvent): Promise<void> {
    try {
      // Update dashboard metrics and UI
      this.emit('dashboard:agent:update', event);
    } catch (error) {
      console.warn('⚠️ Dashboard notification failed:', error);
    }
  }

  private async notifyKnowledgeGraph(event: AgentRegistryEvent): Promise<void> {
    try {
      await fetch('/api/knowledge-graph/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AGENT_CONFIGURATION_CHANGE',
          entity: `agent:${event.agentId}`,
          event: event
        })
      });
    } catch (error) {
      console.warn('⚠️ Knowledge Graph notification failed:', error);
    }
  }

  private async notifyAgentRuntime(event: AgentRegistryEvent): Promise<void> {
    try {
      await fetch('/api/agentic-control/runtime/configuration-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.warn('⚠️ Agent Runtime notification failed:', error);
    }
  }

  private handleRealtimeUpdate(event: AgentRegistryEvent): void {
    // Update local cache
    this.registryCache.set(event.agentId, event.configuration);
    
    // Emit to local subscribers
    this.emit('agent:registry:changed', event);
    this.emit(`agent:${event.agentId}:changed`, event);
  }

  /**
   * Validate agent configuration against available models
   */
  private async validateConfiguration(config: AgentConfiguration): Promise<void> {
    if (!config.agentId) throw new Error('Agent ID is required');
    if (!config.name) throw new Error('Agent name is required');
    if (!config.model) throw new Error('Model selection is required');
    
    // Validate model format  
    if (typeof config.model !== 'string' || config.model.length < 2) {
      throw new Error('Invalid model specification');
    }
    
    // Validate model availability against PostgreSQL-connected AI Gateway
    try {
      const response = await fetch('/api/ai-gateway/models');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.registry) {
          const availableModels = data.registry.models.map((m: any) => m.id);
          if (!availableModels.includes(config.model)) {
            console.warn(`⚠️ Model ${config.model} not found in AI Gateway registry. Available models:`, availableModels);
            // Don't throw error, just warn - allow for development flexibility
          } else {
            console.log(`✅ Model ${config.model} validated against AI Gateway registry`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not validate model against AI Gateway registry:', error);
      // Continue without validation if registry is unavailable
    }
    
    // Validate temperature range
    if (config.temperature < 0 || config.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }
    
    // Validate token limits
    if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 100000)) {
      throw new Error('Max tokens must be between 1 and 100,000');
    }
  }

  private getDefaultConfiguration(agentId: string): Partial<AgentConfiguration> {
    return {
      agentId,
      name: agentId.replace(/_/g, ' '),
      description: `AI Agent: ${agentId}`,
      instruction: 'You are a helpful AI assistant.',
      model: 'mistral:latest', // Use model available in PostgreSQL-connected AI Gateway
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.95,
      topK: 40,
      thinkingBudget: 10000,
      streamingEnabled: true,
      agentClass: 'LlmAgent',
      tools: [],
      subAgents: [],
      safetyEnabled: true,
      safetySettings: [
        { harmCategory: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ],
      callbacks: { beforeModel: false, beforeTool: false, afterModel: false },
      sessionMemory: true,
      voiceEnabled: false,
      outputKey: '',
      version: 1,
      isActive: true,
      ecosystem: {
        ahisRegistration: { registered: false },
        routing: { priority: 'medium', fallbackModels: [], loadBalancing: false },
        monitoring: { 
          enableMetrics: true, 
          alertThresholds: { responseTime: 5000, errorRate: 0.05, costPerRequest: 0.01 },
          displayConfig: { showInDashboard: true, chartColor: '#3B82F6', groupCategory: 'General' }
        },
        knowledgeGraph: { trackInteractions: true, entityTypes: [], relationships: [] }
      }
    };
  }
}

export default AgentRegistryHub;
