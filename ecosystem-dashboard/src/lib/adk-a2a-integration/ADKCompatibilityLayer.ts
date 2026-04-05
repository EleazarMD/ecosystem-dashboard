/**
 * ADK Compatibility Layer
 * 
 * Main orchestration layer that provides Google ADK-compatible
 * agent discovery, connection, and communication APIs while
 * leveraging AI Homelab's AHIS and A2A infrastructure.
 */

import { EventEmitter } from 'events';
import { BrowserAHISClient } from '../browser-ahis-client';
import { AgentToAgentCommunicationLayer } from '../agent-to-agent/communication-layer';
import { HomelabAIAgentClient } from '@ai-homelab/agent-client-sdk';
import AgentDiscoveryService, { AgentCard, AgentDiscoveryFilter } from './AgentDiscoveryService';
import MCPToolsetAdapter, { ADKTool, ToolCallRequest, ToolCallResponse } from './MCPToolsetAdapter';
import AgentConnectionManager, { AgentConnection, ConnectionRequest } from './AgentConnectionManager';

export interface ADKConfig {
  ahisServerUrl?: string;
  enableAutoDiscovery?: boolean;
  enableToolDiscovery?: boolean;
  maxConnections?: number;
  healthCheckInterval?: number;
  discoveryInterval?: number;
  authToken?: string;
}

export interface ADKStatus {
  initialized: boolean;
  ahisConnected: boolean;
  a2aLayerActive: boolean;
  discoveredAgents: number;
  activeConnections: number;
  availableTools: number;
  lastDiscovery: string | null;
}

export interface AgentRegistrationInfo {
  id: string;
  name: string;
  capabilities: string[];
  tools: string[];
  endpoint: string;
  metadata?: Record<string, any>;
}

/**
 * ADK Compatibility Layer - Main Integration Point
 * 
 * Provides a Google ADK-compatible API surface while using
 * AI Homelab's AHIS server and A2A protocols underneath.
 */
export class ADKCompatibilityLayer extends EventEmitter {
  private config: ADKConfig;
  private ahisClient: BrowserAHISClient | null = null;
  private homelabClient: HomelabAIAgentClient | null = null;
  private a2aLayer: AgentToAgentCommunicationLayer | null = null;
  private discoveryService: AgentDiscoveryService | null = null;
  private mcpAdapter: MCPToolsetAdapter | null = null;
  private connectionManager: AgentConnectionManager | null = null;
  private isInitialized = false;

  constructor(config: ADKConfig = {}) {
    super();
    this.config = {
      ahisServerUrl: 'http://localhost:8888',
      enableAutoDiscovery: true,
      enableToolDiscovery: true,
      maxConnections: 50,
      healthCheckInterval: 60000,
      discoveryInterval: 30000,
      ...config
    };
  }

  /**
   * Initialize the ADK compatibility layer
   */
  async initialize(): Promise<void> {
    try {
      console.log('[ADK Layer] Initializing ADK Compatibility Layer...');

      // Initialize AHIS client
      await this.initializeAHISClient();

      // Initialize Homelab client
      await this.initializeHomelabClient();

      // Initialize A2A communication layer
      await this.initializeA2ALayer();

      // Initialize discovery service
      await this.initializeDiscoveryService();

      // Initialize MCP toolset adapter
      await this.initializeMCPAdapter();

      // Initialize connection manager
      await this.initializeConnectionManager();

      this.isInitialized = true;
      console.log('[ADK Layer] ADK Compatibility Layer initialized successfully');
      this.emit('initialized', this.getStatus());

    } catch (error) {
      console.error('[ADK Layer] Failed to initialize ADK Compatibility Layer:', error);
      throw error;
    }
  }

  /**
   * Discover available agents (ADK-compatible API)
   */
  async discoverAgents(filter?: AgentDiscoveryFilter): Promise<AgentCard[]> {
    if (!this.isInitialized || !this.discoveryService) {
      console.warn('[ADK Layer] Discovery service not initialized, returning empty results');
      return [];
    }

    try {
      return await this.discoveryService.getAgentCards(filter);
    } catch (error) {
      console.error('[ADK Layer] Failed to discover agents:', error);
      return [];
    }
  }

  /**
   * Connect to an agent (ADK-compatible API)
   */
  async connectToAgent(agentId: string, options: Partial<ConnectionRequest> = {}): Promise<AgentConnection> {
    if (!this.isInitialized || !this.connectionManager) {
      throw new Error('ADK Layer not initialized');
    }

    try {
      return await this.connectionManager.connectToAgent({
        agentId,
        connectionType: 'auto',
        timeout: 30000,
        ...options
      });
    } catch (error) {
      console.error('[ADK Layer] Failed to connect to agent:', error);
      throw error;
    }
  }

  /**
   * Disconnect from an agent
   */
  async disconnectFromAgent(agentId: string): Promise<void> {
    if (!this.isInitialized || !this.connectionManager) {
      throw new Error('ADK Layer not initialized');
    }

    try {
      await this.connectionManager.disconnectFromAgent(agentId);
    } catch (error) {
      console.error('[ADK Layer] Failed to disconnect from agent:', error);
      throw error;
    }
  }

  /**
   * Get available tools (MCPToolset-compatible API)
   */
  getAvailableTools(agentId?: string): ADKTool[] {
    if (!this.isInitialized || !this.mcpAdapter) {
      console.warn('[ADK Layer] MCP adapter not initialized, returning empty tools');
      return [];
    }

    try {
      return this.mcpAdapter.getAvailableTools(
        agentId ? { agentId } : undefined
      );
    } catch (error) {
      console.error('[ADK Layer] Failed to get available tools:', error);
      return [];
    }
  }

  /**
   * Call a tool (MCPToolset-compatible API)
   */
  async callTool(toolRequest: ToolCallRequest): Promise<ToolCallResponse> {
    if (!this.isInitialized || !this.mcpAdapter) {
      throw new Error('ADK Layer not initialized');
    }

    try {
      return await this.mcpAdapter.callTool(toolRequest);
    } catch (error) {
      console.error('[ADK Layer] Failed to call tool:', error);
      throw error;
    }
  }

  /**
   * Invoke agent capability via A2A
   */
  async invokeCapability(agentId: string, capabilityName: string, parameters: Record<string, any> = {}): Promise<any> {
    if (!this.connectionManager) {
      throw new Error('ADK Layer not initialized');
    }

    const response = await this.connectionManager.invokeCapability(agentId, capabilityName, parameters);
    return response.data;
  }

  /**
   * Register this dashboard as an agent (ADK-compatible)
   */
  async registerAsAgent(info: AgentRegistrationInfo): Promise<string> {
    if (!this.discoveryService || !this.a2aLayer) {
      throw new Error('ADK Layer not initialized');
    }

    try {
      // Register capabilities with A2A layer
      const capabilities = info.capabilities.map(cap => ({
        name: cap,
        description: `Dashboard ${cap} capability`,
        parameters: {}
      }));

      this.a2aLayer.registerCapabilities(capabilities);

      console.log(`[ADK Layer] Registered dashboard as agent: ${info.name}`);
      this.emit('agent_registered', info);
      return info.id;

    } catch (error) {
      console.error('[ADK Layer] Failed to register as agent:', error);
      throw error;
    }
  }

  /**
   * Send A2A broadcast message
   */
  async broadcastMessage(content: any, type: 'notification' | 'broadcast' = 'broadcast'): Promise<void> {
    if (!this.a2aLayer) {
      throw new Error('ADK Layer not initialized');
    }

    return this.a2aLayer.broadcast(content, type);
  }

  /**
   * Get all active connections
   */
  getConnections(): AgentConnection[] {
    if (!this.connectionManager) {
      return [];
    }

    return this.connectionManager.getConnections();
  }

  /**
   * Get connection by agent ID
   */
  getConnection(agentId: string): AgentConnection | null {
    if (!this.connectionManager) {
      return null;
    }

    return this.connectionManager.getConnection(agentId);
  }

  /**
   * Check if layer is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && 
           this.discoveryService !== null && 
           this.mcpAdapter !== null && 
           this.connectionManager !== null;
  }

  /**
   * Get layer status
   */
  getStatus(): ADKStatus {
    return {
      initialized: this.isInitialized,
      ahisConnected: this.ahisClient?.isConnected() || false,
      a2aLayerActive: this.a2aLayer?.getStatus().initialized || false,
      discoveredAgents: 0, // Will be populated when services are ready
      activeConnections: 0, // Will be populated when services are ready
      availableTools: 0, // Will be populated when services are ready
      lastDiscovery: null
    };
  }

  /**
   * Refresh agent discovery
   */
  async refreshDiscovery(): Promise<AgentCard[]> {
    if (!this.discoveryService) {
      throw new Error('ADK Layer not initialized');
    }

    const agents = await this.discoveryService.discoverAgents();
    this.emit('discovery_refreshed', agents);
    return agents;
  }

  /**
   * Initialize AHIS client
   */
  private async initializeAHISClient(): Promise<void> {
    try {
      this.ahisClient = new BrowserAHISClient({
        serverUrl: this.config.ahisServerUrl!,
        autoReconnect: true,
        retryAttempts: 3,
        retryDelay: 2000
      });

      await this.ahisClient.initialize();
      console.log('[ADK Layer] AHIS client connected successfully');

    } catch (error) {
      console.warn('[ADK Layer] AHIS client initialization failed, using fallback mode:', error);
      // Create fallback client that doesn't require server connection
      this.ahisClient = new BrowserAHISClient({
        serverUrl: this.config.ahisServerUrl!,
        fallbackMode: true
      });
    }
  }

  /**
   * Initialize Homelab client
   */
  private async initializeHomelabClient(): Promise<void> {
    try {
      // Initialize with mock or actual Homelab client
      console.log('[ADK Layer] Homelab client initialized (mock)');
      // In real implementation, this would connect to actual Homelab client
      this.homelabClient = {
        on: () => {},
        off: () => {},
        emit: () => {},
        sendMessage: async () => ({ success: true }),
        connect: async () => {},
        disconnect: async () => {},
        isConnected: () => false,
        getStatus: () => ({
          agentId: 'dashboard-agent-001',
          connected: false,
          status: 'initialized',
          lastActivity: new Date().toISOString()
        }),
        discoverServices: async () => []
      } as any;

    } catch (error) {
      console.warn('[ADK Layer] Homelab client initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize A2A communication layer
   */
  private async initializeA2ALayer(): Promise<void> {
    if (!this.homelabClient) {
      throw new Error('Homelab client required for A2A layer');
    }

    this.a2aLayer = new AgentToAgentCommunicationLayer(this.homelabClient);
    await this.a2aLayer.initialize();
    console.log('[ADK Layer] A2A communication layer initialized');
  }

  /**
   * Initialize discovery service
   */
  private async initializeDiscoveryService(): Promise<void> {
    if (!this.ahisClient) {
      throw new Error('AHIS client required for discovery service');
    }

    this.discoveryService = new AgentDiscoveryService(this.ahisClient);
    await this.discoveryService.initialize();
    console.log('[ADK Layer] Agent discovery service initialized');

    // Set up event forwarding
    this.discoveryService.on('agent_registered', (agent) => this.emit('agent_discovered', agent));
    this.discoveryService.on('agent_removed', (agent) => this.emit('agent_lost', agent));
  }

  /**
   * Initialize MCP toolset adapter
   */
  private async initializeMCPAdapter(): Promise<void> {
    if (!this.a2aLayer) {
      throw new Error('A2A layer required for MCP adapter');
    }

    this.mcpAdapter = new MCPToolsetAdapter(this.a2aLayer);
    await this.mcpAdapter.initialize();
    console.log('[ADK Layer] MCP toolset adapter initialized');

    // Set up event forwarding
    this.mcpAdapter.on('tools_discovered', (tools) => this.emit('tools_discovered', tools));
  }

  /**
   * Initialize connection manager
   */
  private async initializeConnectionManager(): Promise<void> {
    if (!this.discoveryService || !this.mcpAdapter || !this.a2aLayer) {
      throw new Error('Discovery service, MCP adapter, and A2A layer required for connection manager');
    }

    this.connectionManager = new AgentConnectionManager(
      this.discoveryService,
      this.mcpAdapter,
      this.a2aLayer
    );
    await this.connectionManager.initialize();
    console.log('[ADK Layer] Agent connection manager initialized');

    // Set up event forwarding
    this.connectionManager.on('agent_connected', (connection) => this.emit('agent_connected', connection));
    this.connectionManager.on('agent_disconnected', (connection) => this.emit('agent_disconnected', connection));
    this.connectionManager.on('agent_unhealthy', (connection) => this.emit('agent_unhealthy', connection));
  }

  /**
   * Shutdown the compatibility layer
   */
  async shutdown(): Promise<void> {
    console.log('[ADK Layer] Shutting down ADK Compatibility Layer...');

    const shutdownPromises: Promise<void>[] = [];

    if (this.connectionManager) {
      shutdownPromises.push(this.connectionManager.shutdown());
    }

    if (this.mcpAdapter) {
      shutdownPromises.push(this.mcpAdapter.shutdown());
    }

    if (this.discoveryService) {
      shutdownPromises.push(this.discoveryService.shutdown());
    }

    if (this.a2aLayer) {
      shutdownPromises.push(this.a2aLayer.shutdown());
    }

    if (this.ahisClient) {
      shutdownPromises.push(this.ahisClient.disconnect());
    }

    await Promise.allSettled(shutdownPromises);

    this.isInitialized = false;
    this.emit('shutdown');
    console.log('[ADK Layer] ADK Compatibility Layer shut down successfully');
  }
}

/**
 * Create and configure ADK compatibility layer
 */
export function createADKCompatibilityLayer(config?: ADKConfig): ADKCompatibilityLayer {
  return new ADKCompatibilityLayer(config);
}

/**
 * Global ADK compatibility layer instance
 */
let globalADKLayer: ADKCompatibilityLayer | null = null;

/**
 * Get or create global ADK compatibility layer
 */
export function getADKCompatibilityLayer(config?: ADKConfig): ADKCompatibilityLayer {
  if (!globalADKLayer) {
    globalADKLayer = createADKCompatibilityLayer(config);
  }
  return globalADKLayer;
}

export default ADKCompatibilityLayer;
