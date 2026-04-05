/**
 * ADK/A2A Compatible Agent Discovery Service
 * 
 * Provides Google ADK compatible agent discovery and registration
 * while leveraging AHIS server backend for real-time updates.
 */

import { EventEmitter } from 'events';
import { AgentRegistryClient, AgentRegistryEventType } from '../agent-registry-client';
import { BrowserAHISClient } from '../browser-ahis-client';

// ADK-compatible Agent Card format
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'assistant' | 'service' | 'tool' | 'workflow';
  capabilities: AgentCapability[];
  connection: ConnectionInfo;
  metadata: AgentMetadata;
  status: 'online' | 'offline' | 'busy' | 'error';
  lastSeen: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  category: 'communication' | 'data' | 'analysis' | 'automation' | 'monitoring';
  parameters?: CapabilityParameter[];
  returnType?: string;
  examples?: string[];
}

export interface CapabilityParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  default?: any;
}

export interface ConnectionInfo {
  protocol: 'a2a' | 'http' | 'websocket' | 'mcp';
  endpoint: string;
  port?: number;
  authentication?: {
    type: 'none' | 'bearer' | 'apikey' | 'oauth';
    required: boolean;
  };
  healthCheck?: string;
}

export interface AgentMetadata {
  platform: string;
  framework?: string;
  runtime: string;
  tags: string[];
  dependencies?: string[];
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  security?: {
    permissions: string[];
    isolation: boolean;
  };
}

// A2A Protocol Message Types for Agent Discovery
export interface A2ADiscoveryMessage {
  type: 'discover_agents' | 'agent_announce' | 'agent_heartbeat' | 'capability_query';
  source: string;
  target?: string;
  payload: any;
  timestamp: string;
  correlationId?: string;
}

export interface AgentDiscoveryFilter {
  type?: string[];
  capabilities?: string[];
  status?: string[];
  platform?: string[];
  tags?: string[];
}

export class AgentDiscoveryService extends EventEmitter {
  private registryClient: AgentRegistryClient;
  private agentCards = new Map<string, AgentCard>();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(ahisClient: BrowserAHISClient) {
    super();
    this.registryClient = new AgentRegistryClient(ahisClient);
    this.setupEventHandlers();
  }

  /**
   * Initialize the agent discovery service
   */
  async initialize(): Promise<void> {
    try {
      console.log('[ADK Discovery] Initializing Agent Discovery Service...');

      // Perform initial agent discovery
      await this.discoverAgents();

      // Start periodic discovery updates
      this.discoveryInterval = setInterval(async () => {
        await this.discoverAgents();
      }, 30000); // Every 30 seconds

      this.isInitialized = true;
      console.log('[ADK Discovery] Agent Discovery Service initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('[ADK Discovery] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Discover all available agents and convert to ADK format
   */
  async discoverAgents(): Promise<AgentCard[]> {
    try {
      const agents = await this.registryClient.getAgents();
      const agentCards: AgentCard[] = [];

      for (const agent of agents) {
        const agentCard = this.convertToAgentCard(agent);
        this.agentCards.set(agentCard.id, agentCard);
        agentCards.push(agentCard);
      }

      console.log(`[ADK Discovery] Discovered ${agentCards.length} agents`);
      this.emit('agents_discovered', agentCards);
      return agentCards;

    } catch (error) {
      console.error('[ADK Discovery] Agent discovery failed:', error);
      return [];
    }
  }

  /**
   * Get all discovered agent cards
   */
  getAgentCards(filter?: AgentDiscoveryFilter): AgentCard[] {
    let cards = Array.from(this.agentCards.values());

    if (filter) {
      cards = cards.filter(card => {
        if (filter.type && !filter.type.includes(card.type)) return false;
        if (filter.status && !filter.status.includes(card.status)) return false;
        if (filter.platform && !filter.platform.includes(card.metadata.platform)) return false;
        if (filter.capabilities) {
          const hasCapability = filter.capabilities.some(cap =>
            card.capabilities.some(c => c.name.includes(cap))
          );
          if (!hasCapability) return false;
        }
        if (filter.tags) {
          const hasTag = filter.tags.some(tag =>
            card.metadata.tags.includes(tag)
          );
          if (!hasTag) return false;
        }
        return true;
      });
    }

    return cards;
  }

  /**
   * Get agent card by ID
   */
  getAgentCard(agentId: string): AgentCard | null {
    return this.agentCards.get(agentId) || null;
  }

  /**
   * Find agents by capability
   */
  findAgentsByCapability(capabilityName: string): AgentCard[] {
    return this.getAgentCards({
      capabilities: [capabilityName]
    });
  }

  /**
   * Convert AHIS agent data to ADK-compatible Agent Card
   */
  private convertToAgentCard(agent: any): AgentCard {
    return {
      id: agent.id || agent.agentId || `agent-${Date.now()}`,
      name: agent.name || agent.displayName || 'Unknown Agent',
      description: agent.description || `${agent.type || 'Agent'} in the AI Homelab ecosystem`,
      version: agent.version || '1.0.0',
      type: this.mapAgentType(agent.type || agent.agentType),
      capabilities: this.extractCapabilities(agent),
      connection: this.extractConnectionInfo(agent),
      metadata: this.extractMetadata(agent),
      status: this.mapAgentStatus(agent.status),
      lastSeen: agent.lastSeen || agent.lastHeartbeat || new Date().toISOString()
    };
  }

  /**
   * Map AHIS agent type to ADK agent type
   */
  private mapAgentType(type: string): AgentCard['type'] {
    const typeMap: Record<string, AgentCard['type']> = {
      'dashboard': 'assistant',
      'ui-assistant': 'assistant',
      'service': 'service',
      'tool': 'tool',
      'workflow': 'workflow',
      'api': 'service',
      'gateway': 'service',
      'monitor': 'service'
    };

    return typeMap[type.toLowerCase()] || 'service';
  }

  /**
   * Map AHIS agent status to ADK status
   */
  private mapAgentStatus(status: string): AgentCard['status'] {
    const statusMap: Record<string, AgentCard['status']> = {
      'active': 'online',
      'healthy': 'online',
      'running': 'online',
      'inactive': 'offline',
      'stopped': 'offline',
      'unhealthy': 'error',
      'failed': 'error',
      'busy': 'busy',
      'processing': 'busy'
    };

    return statusMap[status?.toLowerCase()] || 'offline';
  }

  /**
   * Extract capabilities from AHIS agent data
   */
  private extractCapabilities(agent: any): AgentCapability[] {
    const capabilities: AgentCapability[] = [];

    // Extract from capabilities array
    if (agent.capabilities && Array.isArray(agent.capabilities)) {
      agent.capabilities.forEach((cap: any) => {
        if (typeof cap === 'string') {
          capabilities.push({
            name: cap,
            description: `${cap} capability`,
            category: this.categorizeCapability(cap)
          });
        } else if (typeof cap === 'object') {
          capabilities.push({
            name: cap.name || cap.capability,
            description: cap.description || `${cap.name} capability`,
            category: this.categorizeCapability(cap.name || cap.capability),
            parameters: cap.parameters,
            returnType: cap.returnType,
            examples: cap.examples
          });
        }
      });
    }

    // Add default capabilities based on agent type
    if (agent.type) {
      const defaultCapabilities = this.getDefaultCapabilities(agent.type);
      capabilities.push(...defaultCapabilities);
    }

    return capabilities;
  }

  /**
   * Categorize capability by name
   */
  private categorizeCapability(capabilityName: string): AgentCapability['category'] {
    const name = capabilityName.toLowerCase();
    
    if (name.includes('monitor') || name.includes('health') || name.includes('metrics')) {
      return 'monitoring';
    }
    if (name.includes('chat') || name.includes('conversation') || name.includes('message')) {
      return 'communication';
    }
    if (name.includes('data') || name.includes('query') || name.includes('search') || name.includes('database')) {
      return 'data';
    }
    if (name.includes('analysis') || name.includes('analyze') || name.includes('insight')) {
      return 'analysis';
    }
    if (name.includes('workflow') || name.includes('automation') || name.includes('deploy')) {
      return 'automation';
    }
    
    return 'data'; // Default category
  }

  /**
   * Get default capabilities for agent type
   */
  private getDefaultCapabilities(agentType: string): AgentCapability[] {
    const defaultCapabilities: Record<string, AgentCapability[]> = {
      'dashboard': [
        {
          name: 'ui_interaction',
          description: 'User interface interaction and management',
          category: 'communication'
        },
        {
          name: 'system_monitoring',
          description: 'System status monitoring and reporting',
          category: 'monitoring'
        }
      ],
      'knowledge-graph': [
        {
          name: 'semantic_query',
          description: 'Semantic knowledge graph queries',
          category: 'data'
        },
        {
          name: 'relationship_analysis',
          description: 'Entity relationship analysis',
          category: 'analysis'
        }
      ],
      'voice-assistant': [
        {
          name: 'speech_recognition',
          description: 'Convert speech to text',
          category: 'communication'
        },
        {
          name: 'text_to_speech',
          description: 'Convert text to speech',
          category: 'communication'
        }
      ]
    };

    return defaultCapabilities[agentType.toLowerCase()] || [];
  }

  /**
   * Extract connection information
   */
  private extractConnectionInfo(agent: any): ConnectionInfo {
    return {
      protocol: 'a2a', // Default to A2A protocol
      endpoint: agent.endpoint || agent.url || `http://localhost:${agent.port || 8080}`,
      port: agent.port || 8080,
      authentication: {
        type: agent.authType || 'none',
        required: Boolean(agent.authRequired || agent.requiresAuth)
      },
      healthCheck: agent.healthEndpoint || agent.healthCheck || '/health'
    };
  }

  /**
   * Extract metadata
   */
  private extractMetadata(agent: any): AgentMetadata {
    return {
      platform: agent.platform || 'ai-homelab',
      framework: agent.framework,
      runtime: agent.runtime || 'Node.js',
      tags: agent.tags || [],
      dependencies: agent.dependencies,
      resources: agent.resources,
      security: {
        permissions: agent.permissions || [],
        isolation: Boolean(agent.isolated || agent.sandboxed)
      }
    };
  }

  /**
   * Setup event handlers for real-time updates
   */
  private setupEventHandlers(): void {
    // Agent registration events
    this.registryClient.subscribe(AgentRegistryEventType.AGENT_REGISTERED, (data) => {
      const agentCard = this.convertToAgentCard(data.agent || data);
      this.agentCards.set(agentCard.id, agentCard);
      console.log(`[ADK Discovery] Agent registered: ${agentCard.name}`);
      this.emit('agent_registered', agentCard);
    });

    // Agent update events
    this.registryClient.subscribe(AgentRegistryEventType.AGENT_UPDATED, (data) => {
      const agentCard = this.convertToAgentCard(data.agent || data);
      this.agentCards.set(agentCard.id, agentCard);
      console.log(`[ADK Discovery] Agent updated: ${agentCard.name}`);
      this.emit('agent_updated', agentCard);
    });

    // Agent removal events
    this.registryClient.subscribe(AgentRegistryEventType.AGENT_REMOVED, (data) => {
      const agentId = data.agentId || data.id;
      if (this.agentCards.has(agentId)) {
        const removedCard = this.agentCards.get(agentId)!;
        this.agentCards.delete(agentId);
        console.log(`[ADK Discovery] Agent removed: ${removedCard.name}`);
        this.emit('agent_removed', removedCard);
      }
    });

    // Capability events
    this.registryClient.subscribe(AgentRegistryEventType.CAPABILITY_REGISTERED, (data) => {
      console.log('[ADK Discovery] New capability registered:', data);
      this.emit('capability_registered', data);
    });
  }

  /**
   * Send A2A discovery message
   */
  async sendDiscoveryMessage(message: A2ADiscoveryMessage): Promise<void> {
    try {
      // This would integrate with the A2A communication layer
      console.log('[ADK Discovery] Sending A2A discovery message:', message.type);
      this.emit('discovery_message', message);
    } catch (error) {
      console.error('[ADK Discovery] Failed to send discovery message:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[ADK Discovery] Shutting down Agent Discovery Service...');
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    this.agentCards.clear();
    this.isInitialized = false;
    this.emit('shutdown');
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    agentCount: number;
    lastDiscovery: string | null;
  } {
    return {
      initialized: this.isInitialized,
      agentCount: this.agentCards.size,
      lastDiscovery: this.isInitialized ? new Date().toISOString() : null
    };
  }
}

export default AgentDiscoveryService;
