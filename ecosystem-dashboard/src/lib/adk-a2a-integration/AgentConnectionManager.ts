/**
 * Agent Connection Manager for ADK/A2A Integration
 * 
 * Manages connections between the dashboard and discovered agents,
 * implementing both ADK-style connections and A2A protocol communication.
 */

import { EventEmitter } from 'events';
import AgentDiscoveryService, { AgentCard } from './AgentDiscoveryService';
import MCPToolsetAdapter, { ADKTool, ToolCallRequest, ToolCallResponse } from './MCPToolsetAdapter';
import { AgentToAgentCommunicationLayer, A2ARequest, A2AResponse } from '../agent-to-agent/communication-layer';

// Connection types and interfaces
export interface AgentConnection {
  id: string;
  agentCard: AgentCard;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectionType: 'a2a' | 'http' | 'websocket' | 'mcp';
  capabilities: string[];
  tools: ADKTool[];
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface ConnectionRequest {
  agentId: string;
  connectionType?: 'auto' | 'a2a' | 'http' | 'websocket' | 'mcp';
  timeout?: number;
  authentication?: {
    type: 'none' | 'bearer' | 'apikey';
    token?: string;
  };
}

export interface AgentTask {
  id: string;
  agentId: string;
  type: 'tool_call' | 'capability_invoke' | 'health_check' | 'configuration';
  payload: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

export interface ConnectionPool {
  activeConnections: Map<string, AgentConnection>;
  connectionQueue: ConnectionRequest[];
  maxConnections: number;
  idleTimeout: number;
}

export class AgentConnectionManager extends EventEmitter {
  private discoveryService: AgentDiscoveryService;
  private mcpAdapter: MCPToolsetAdapter;
  private a2aLayer: AgentToAgentCommunicationLayer;
  private connections = new Map<string, AgentConnection>();
  private activeTasks = new Map<string, AgentTask>();
  private connectionPool: ConnectionPool;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    discoveryService: AgentDiscoveryService,
    mcpAdapter: MCPToolsetAdapter,
    a2aLayer: AgentToAgentCommunicationLayer
  ) {
    super();
    this.discoveryService = discoveryService;
    this.mcpAdapter = mcpAdapter;
    this.a2aLayer = a2aLayer;
    
    this.connectionPool = {
      activeConnections: new Map(),
      connectionQueue: [],
      maxConnections: 50,
      idleTimeout: 300000 // 5 minutes
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the connection manager
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Connection Manager] Initializing Agent Connection Manager...');

      // Auto-connect to high-priority agents
      await this.autoConnectToAgents();

      // Start health checking
      this.startHealthChecking();

      // Start connection pool management
      this.startConnectionPoolManagement();

      this.isInitialized = true;
      console.log('[Connection Manager] Agent Connection Manager initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('[Connection Manager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Connect to an agent
   */
  async connectToAgent(request: ConnectionRequest): Promise<AgentConnection> {
    try {
      const agentCard = this.discoveryService.getAgentCard(request.agentId);
      if (!agentCard) {
        throw new Error(`Agent ${request.agentId} not found`);
      }

      console.log(`[Connection Manager] Connecting to agent: ${agentCard.name}`);

      // Check if already connected
      if (this.connections.has(request.agentId)) {
        const existingConnection = this.connections.get(request.agentId)!;
        if (existingConnection.status === 'connected') {
          return existingConnection;
        }
      }

      // Determine connection type
      const connectionType = this.determineConnectionType(request, agentCard);

      // Create connection
      const connection: AgentConnection = {
        id: `conn_${request.agentId}_${Date.now()}`,
        agentCard,
        status: 'connecting',
        connectionType,
        capabilities: agentCard.capabilities.map(cap => cap.name),
        tools: [],
        lastActivity: new Date(),
        metadata: {
          connectionRequest: request,
          attempts: 0
        }
      };

      this.connections.set(request.agentId, connection);
      this.emit('connection_attempt', connection);

      // Establish connection based on type
      switch (connectionType) {
        case 'a2a':
          await this.establishA2AConnection(connection);
          break;
        case 'http':
          await this.establishHTTPConnection(connection);
          break;
        case 'websocket':
          await this.establishWebSocketConnection(connection);
          break;
        case 'mcp':
          await this.establishMCPConnection(connection);
          break;
        default:
          throw new Error(`Unsupported connection type: ${connectionType}`);
      }

      // Discover agent tools
      await this.discoverAgentTools(connection);

      connection.status = 'connected';
      connection.lastActivity = new Date();
      
      console.log(`[Connection Manager] Successfully connected to agent: ${agentCard.name}`);
      this.emit('agent_connected', connection);
      return connection;

    } catch (error) {
      console.error(`[Connection Manager] Failed to connect to agent ${request.agentId}:`, error);
      
      // Update connection status
      const connection = this.connections.get(request.agentId);
      if (connection) {
        connection.status = 'error';
        connection.metadata = { ...connection.metadata, error: error instanceof Error ? error.message : 'Unknown error' };
        this.emit('connection_error', { connection, error });
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from an agent
   */
  async disconnectFromAgent(agentId: string): Promise<void> {
    const connection = this.connections.get(agentId);
    if (!connection) {
      console.warn(`[Connection Manager] No connection found for agent: ${agentId}`);
      return;
    }

    console.log(`[Connection Manager] Disconnecting from agent: ${connection.agentCard.name}`);

    // Cancel any active tasks for this agent
    const agentTasks = Array.from(this.activeTasks.values()).filter(task => task.agentId === agentId);
    for (const task of agentTasks) {
      this.cancelTask(task.id);
    }

    // Update connection status
    connection.status = 'disconnected';
    connection.lastActivity = new Date();

    this.emit('agent_disconnected', connection);
    console.log(`[Connection Manager] Disconnected from agent: ${connection.agentCard.name}`);
  }

  /**
   * Execute a tool call on a connected agent
   */
  async executeToolCall(agentId: string, toolRequest: ToolCallRequest): Promise<ToolCallResponse> {
    const connection = this.connections.get(agentId);
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    // Create task
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      agentId,
      type: 'tool_call',
      payload: toolRequest,
      status: 'pending',
      startTime: new Date()
    };

    this.activeTasks.set(task.id, task);
    this.emit('task_started', task);

    try {
      task.status = 'running';
      
      // Execute via MCP adapter
      const response = await this.mcpAdapter.callTool(toolRequest);
      
      task.status = 'completed';
      task.result = response;
      task.endTime = new Date();
      
      // Update connection activity
      connection.lastActivity = new Date();
      
      this.emit('task_completed', task);
      return response;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = new Date();
      
      this.emit('task_failed', task);
      throw error;
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Invoke agent capability via A2A
   */
  async invokeCapability(agentId: string, capabilityName: string, parameters: Record<string, any>): Promise<A2AResponse> {
    const connection = this.connections.get(agentId);
    if (!connection || connection.status !== 'connected') {
      throw new Error(`Agent ${agentId} is not connected`);
    }

    // Create task
    const task: AgentTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      agentId,
      type: 'capability_invoke',
      payload: { capabilityName, parameters },
      status: 'pending',
      startTime: new Date()
    };

    this.activeTasks.set(task.id, task);
    this.emit('task_started', task);

    try {
      task.status = 'running';
      
      // Send A2A request
      const response = await this.a2aLayer.sendRequest({
        targetAgent: agentId,
        action: capabilityName,
        parameters
      });
      
      task.status = 'completed';
      task.result = response;
      task.endTime = new Date();
      
      // Update connection activity
      connection.lastActivity = new Date();
      
      this.emit('task_completed', task);
      return response;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.endTime = new Date();
      
      this.emit('task_failed', task);
      throw error;
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Get all connections
   */
  getConnections(): AgentConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by agent ID
   */
  getConnection(agentId: string): AgentConnection | null {
    return this.connections.get(agentId) || null;
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task && task.status === 'running') {
      task.status = 'failed';
      task.error = 'Task cancelled';
      task.endTime = new Date();
      this.activeTasks.delete(taskId);
      this.emit('task_cancelled', task);
      return true;
    }
    return false;
  }

  /**
   * Auto-connect to high-priority agents
   */
  private async autoConnectToAgents(): Promise<void> {
    const agentCards = this.discoveryService.getAgentCards({
      status: ['online']
    });

    const highPriorityAgents = agentCards.filter(agent => 
      agent.type === 'assistant' || 
      agent.metadata.tags.includes('high-priority') ||
      agent.capabilities.some(cap => cap.category === 'monitoring')
    );

    console.log(`[Connection Manager] Auto-connecting to ${highPriorityAgents.length} high-priority agents`);

    for (const agentCard of highPriorityAgents) {
      try {
        await this.connectToAgent({
          agentId: agentCard.id,
          connectionType: 'auto',
          timeout: 10000
        });
      } catch (error) {
        console.warn(`[Connection Manager] Failed to auto-connect to ${agentCard.name}:`, error);
      }
    }
  }

  /**
   * Determine best connection type for agent
   */
  private determineConnectionType(request: ConnectionRequest, agentCard: AgentCard): AgentConnection['connectionType'] {
    if (request.connectionType && request.connectionType !== 'auto') {
      return request.connectionType;
    }

    // Auto-determine based on agent capabilities and connection info
    if (agentCard.connection.protocol === 'a2a') {
      return 'a2a';
    }
    if (agentCard.connection.protocol === 'mcp') {
      return 'mcp';
    }
    if (agentCard.connection.protocol === 'websocket') {
      return 'websocket';
    }
    
    return 'http'; // Default fallback
  }

  /**
   * Establish A2A connection
   */
  private async establishA2AConnection(connection: AgentConnection): Promise<void> {
    console.log(`[Connection Manager] Establishing A2A connection to ${connection.agentCard.name}`);
    
    // A2A connections are managed by the A2A layer
    // Just verify agent is reachable via A2A
    try {
      const response = await this.a2aLayer.sendRequest({
        targetAgent: connection.agentCard.id,
        action: 'ping',
        timeout: 5000
      });
      
      if (!response.success) {
        throw new Error(`A2A ping failed: ${response.error}`);
      }
    } catch (error) {
      throw new Error(`A2A connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Establish HTTP connection
   */
  private async establishHTTPConnection(connection: AgentConnection): Promise<void> {
    console.log(`[Connection Manager] Establishing HTTP connection to ${connection.agentCard.name}`);
    
    try {
      const response = await fetch(`${connection.agentCard.connection.endpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP health check failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`HTTP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async establishWebSocketConnection(connection: AgentConnection): Promise<void> {
    console.log(`[Connection Manager] Establishing WebSocket connection to ${connection.agentCard.name}`);
    
    // WebSocket connection would be implemented here
    // For now, simulate successful connection
    console.log(`[Connection Manager] WebSocket connection established (simulated)`);
  }

  /**
   * Establish MCP connection
   */
  private async establishMCPConnection(connection: AgentConnection): Promise<void> {
    console.log(`[Connection Manager] Establishing MCP connection to ${connection.agentCard.name}`);
    
    try {
      await this.mcpAdapter.connectToMCPServer({
        id: connection.agentCard.id,
        name: connection.agentCard.name,
        endpoint: connection.agentCard.connection.endpoint,
        type: 'remote'
      });
    } catch (error) {
      throw new Error(`MCP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Discover tools from connected agent
   */
  private async discoverAgentTools(connection: AgentConnection): Promise<void> {
    try {
      const tools = this.mcpAdapter.getAvailableTools({
        agentId: connection.agentCard.id
      });
      
      connection.tools = tools;
      console.log(`[Connection Manager] Discovered ${tools.length} tools from ${connection.agentCard.name}`);
      
    } catch (error) {
      console.warn(`[Connection Manager] Failed to discover tools from ${connection.agentCard.name}:`, error);
      connection.tools = [];
    }
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const connection of this.connections.values()) {
        if (connection.status === 'connected') {
          await this.performHealthCheck(connection);
        }
      }
    }, 60000); // Every minute
  }

  /**
   * Perform health check on connection
   */
  private async performHealthCheck(connection: AgentConnection): Promise<void> {
    try {
      // Create health check task
      const task: AgentTask = {
        id: `health_${connection.agentCard.id}_${Date.now()}`,
        agentId: connection.agentCard.id,
        type: 'health_check',
        payload: {},
        status: 'running',
        startTime: new Date()
      };

      let isHealthy = false;

      if (connection.connectionType === 'a2a') {
        const response = await this.a2aLayer.sendRequest({
          targetAgent: connection.agentCard.id,
          action: 'health_check',
          timeout: 5000
        });
        isHealthy = response.success;
      } else if (connection.connectionType === 'http') {
        const response = await fetch(`${connection.agentCard.connection.endpoint}/health`, {
          timeout: 5000
        });
        isHealthy = response.ok;
      } else {
        isHealthy = true; // Assume healthy for other types
      }

      if (isHealthy) {
        connection.lastActivity = new Date();
        task.status = 'completed';
      } else {
        connection.status = 'error';
        task.status = 'failed';
        task.error = 'Health check failed';
        this.emit('agent_unhealthy', connection);
      }

      task.endTime = new Date();

    } catch (error) {
      connection.status = 'error';
      this.emit('agent_unhealthy', connection);
      console.warn(`[Connection Manager] Health check failed for ${connection.agentCard.name}:`, error);
    }
  }

  /**
   * Start connection pool management
   */
  private startConnectionPoolManagement(): void {
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Every minute
  }

  /**
   * Cleanup idle connections
   */
  private cleanupIdleConnections(): void {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [agentId, connection] of this.connections.entries()) {
      const idleTime = now.getTime() - connection.lastActivity.getTime();
      
      if (idleTime > this.connectionPool.idleTimeout && connection.status === 'connected') {
        connectionsToRemove.push(agentId);
      }
    }

    for (const agentId of connectionsToRemove) {
      console.log(`[Connection Manager] Cleaning up idle connection: ${agentId}`);
      this.disconnectFromAgent(agentId);
      this.connections.delete(agentId);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.discoveryService.on('agent_registered', (agentCard) => {
      console.log(`[Connection Manager] New agent discovered: ${agentCard.name}`);
      // Auto-connect to high-priority agents
      if (agentCard.metadata.tags.includes('high-priority')) {
        this.connectToAgent({
          agentId: agentCard.id,
          connectionType: 'auto'
        }).catch(error => {
          console.warn(`[Connection Manager] Failed to auto-connect to new agent ${agentCard.name}:`, error);
        });
      }
    });

    this.discoveryService.on('agent_removed', (agentCard) => {
      console.log(`[Connection Manager] Agent removed: ${agentCard.name}`);
      this.disconnectFromAgent(agentCard.id);
      this.connections.delete(agentCard.id);
    });
  }

  /**
   * Get manager status
   */
  getStatus(): {
    initialized: boolean;
    totalConnections: number;
    activeConnections: number;
    activeTasks: number;
    healthCheckEnabled: boolean;
  } {
    const activeConnections = Array.from(this.connections.values()).filter(
      conn => conn.status === 'connected'
    ).length;

    return {
      initialized: this.isInitialized,
      totalConnections: this.connections.size,
      activeConnections,
      activeTasks: this.activeTasks.size,
      healthCheckEnabled: this.healthCheckInterval !== null
    };
  }

  /**
   * Shutdown the connection manager
   */
  async shutdown(): Promise<void> {
    console.log('[Connection Manager] Shutting down Agent Connection Manager...');
    
    // Stop health checking
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Disconnect all agents
    const disconnectPromises = Array.from(this.connections.keys()).map(agentId =>
      this.disconnectFromAgent(agentId)
    );
    await Promise.allSettled(disconnectPromises);

    // Cancel all active tasks
    for (const taskId of this.activeTasks.keys()) {
      this.cancelTask(taskId);
    }

    this.connections.clear();
    this.activeTasks.clear();
    this.isInitialized = false;
    this.emit('shutdown');
  }
}

export default AgentConnectionManager;
