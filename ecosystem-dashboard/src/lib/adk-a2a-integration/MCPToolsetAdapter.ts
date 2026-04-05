/**
 * MCP Toolset Adapter for ADK Compatibility
 * 
 * Provides Google ADK MCPToolset-style tool discovery and adaptation
 * while integrating with AI Homelab's A2A communication layer.
 */

import { EventEmitter } from 'events';
import { AgentToAgentCommunicationLayer, A2ARequest, A2AResponse } from '../agent-to-agent/communication-layer';

// ADK-compatible tool definitions
export interface ADKTool {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  category: 'data' | 'communication' | 'analysis' | 'automation' | 'monitoring';
  source: 'mcp' | 'native' | 'a2a';
  agentId?: string;
  endpoint?: string;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required?: string[];
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: any[];
  default?: any;
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolCallRequest {
  toolName: string;
  parameters: Record<string, any>;
  agentId?: string;
  timeout?: number;
}

export interface ToolCallResponse {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface MCPServerConnection {
  id: string;
  name: string;
  type: 'local' | 'remote';
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: ADKTool[];
  lastDiscovery: Date;
}

export interface ToolFilter {
  category?: string[];
  source?: string[];
  agentId?: string;
  namePattern?: string;
}

export class MCPToolsetAdapter extends EventEmitter {
  private a2aLayer: AgentToAgentCommunicationLayer;
  private discoveredTools = new Map<string, ADKTool>();
  private mcpConnections = new Map<string, MCPServerConnection>();
  private toolFilters: ToolFilter[] = [];
  private isInitialized = false;

  constructor(a2aLayer: AgentToAgentCommunicationLayer) {
    super();
    this.a2aLayer = a2aLayer;
    this.setupEventHandlers();
  }

  /**
   * Initialize the MCP toolset adapter
   */
  async initialize(): Promise<void> {
    try {
      console.log('[MCP Adapter] Initializing MCP Toolset Adapter...');

      // Discover tools from registered agents
      await this.discoverToolsFromAgents();

      // Set up periodic tool discovery
      setInterval(async () => {
        await this.discoverToolsFromAgents();
      }, 60000); // Every minute

      this.isInitialized = true;
      console.log('[MCP Adapter] MCP Toolset Adapter initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('[MCP Adapter] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Discover tools from all registered agents via A2A
   */
  async discoverToolsFromAgents(): Promise<ADKTool[]> {
    try {
      const agents = this.a2aLayer.getAvailableAgents();
      const discoveredTools: ADKTool[] = [];

      for (const agent of agents) {
        try {
          // Request tool list from each agent
          const response = await this.a2aLayer.sendRequest({
            targetAgent: agent.id,
            action: 'list_tools',
            timeout: 10000
          });

          if (response.success && response.data?.tools) {
            const agentTools = this.adaptToolsFromAgent(response.data.tools, agent.id);
            discoveredTools.push(...agentTools);
          }
        } catch (error) {
          console.warn(`[MCP Adapter] Failed to discover tools from agent ${agent.id}:`, error);
        }
      }

      // Store discovered tools
      discoveredTools.forEach(tool => {
        this.discoveredTools.set(tool.name, tool);
      });

      console.log(`[MCP Adapter] Discovered ${discoveredTools.length} tools from ${agents.length} agents`);
      this.emit('tools_discovered', discoveredTools);
      return discoveredTools;

    } catch (error) {
      console.error('[MCP Adapter] Tool discovery failed:', error);
      return [];
    }
  }

  /**
   * Get available tools with optional filtering
   */
  getAvailableTools(filter?: ToolFilter): ADKTool[] {
    let tools = Array.from(this.discoveredTools.values());

    if (filter) {
      tools = tools.filter(tool => {
        if (filter.category && !filter.category.includes(tool.category)) return false;
        if (filter.source && !filter.source.includes(tool.source)) return false;
        if (filter.agentId && tool.agentId !== filter.agentId) return false;
        if (filter.namePattern) {
          const pattern = new RegExp(filter.namePattern, 'i');
          if (!pattern.test(tool.name)) return false;
        }
        return true;
      });
    }

    // Apply global filters
    for (const globalFilter of this.toolFilters) {
      tools = tools.filter(tool => this.matchesFilter(tool, globalFilter));
    }

    return tools;
  }

  /**
   * Call a tool via A2A communication
   */
  async callTool(request: ToolCallRequest): Promise<ToolCallResponse> {
    const startTime = Date.now();

    try {
      const tool = this.discoveredTools.get(request.toolName);
      if (!tool) {
        throw new Error(`Tool '${request.toolName}' not found`);
      }

      // Validate parameters
      this.validateToolParameters(tool, request.parameters);

      let response: A2AResponse;

      if (tool.source === 'a2a' && tool.agentId) {
        // Call tool via A2A protocol
        response = await this.a2aLayer.sendRequest({
          targetAgent: tool.agentId,
          action: 'call_tool',
          parameters: {
            toolName: request.toolName,
            arguments: request.parameters
          },
          timeout: request.timeout || 30000
        });
      } else if (tool.source === 'mcp' && tool.endpoint) {
        // Call tool via MCP protocol
        response = await this.callMCPTool(tool, request.parameters);
      } else {
        throw new Error(`Unsupported tool source: ${tool.source}`);
      }

      const executionTime = Date.now() - startTime;

      if (response.success) {
        return {
          success: true,
          result: response.data,
          executionTime,
          metadata: {
            agentId: tool.agentId,
            toolSource: tool.source
          }
        };
      } else {
        return {
          success: false,
          error: response.error || 'Tool call failed',
          executionTime
        };
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Add tool filter
   */
  addToolFilter(filter: ToolFilter): void {
    this.toolFilters.push(filter);
    console.log('[MCP Adapter] Added tool filter:', filter);
    this.emit('filter_added', filter);
  }

  /**
   * Remove tool filter
   */
  removeToolFilter(index: number): void {
    if (index >= 0 && index < this.toolFilters.length) {
      const removed = this.toolFilters.splice(index, 1)[0];
      console.log('[MCP Adapter] Removed tool filter:', removed);
      this.emit('filter_removed', removed);
    }
  }

  /**
   * Clear all tool filters
   */
  clearToolFilters(): void {
    this.toolFilters = [];
    console.log('[MCP Adapter] Cleared all tool filters');
    this.emit('filters_cleared');
  }

  /**
   * Connect to MCP server
   */
  async connectToMCPServer(serverInfo: {
    id: string;
    name: string;
    endpoint: string;
    type: 'local' | 'remote';
  }): Promise<MCPServerConnection> {
    try {
      console.log(`[MCP Adapter] Connecting to MCP server: ${serverInfo.name}`);

      // Simulate MCP server connection
      const connection: MCPServerConnection = {
        id: serverInfo.id,
        name: serverInfo.name,
        type: serverInfo.type,
        endpoint: serverInfo.endpoint,
        status: 'connected',
        tools: [],
        lastDiscovery: new Date()
      };

      // Discover tools from MCP server
      const tools = await this.discoverMCPTools(connection);
      connection.tools = tools;

      this.mcpConnections.set(connection.id, connection);
      
      // Add tools to main tool registry
      tools.forEach(tool => {
        this.discoveredTools.set(tool.name, tool);
      });

      console.log(`[MCP Adapter] Connected to MCP server ${serverInfo.name}, discovered ${tools.length} tools`);
      this.emit('mcp_connected', connection);
      return connection;

    } catch (error) {
      console.error(`[MCP Adapter] Failed to connect to MCP server ${serverInfo.name}:`, error);
      throw error;
    }
  }

  /**
   * Adapt tools from agent response to ADK format
   */
  private adaptToolsFromAgent(agentTools: any[], agentId: string): ADKTool[] {
    return agentTools.map(tool => ({
      name: tool.name || tool.function?.name || 'unknown_tool',
      description: tool.description || tool.function?.description || 'No description available',
      parameters: this.adaptParameterSchema(tool.parameters || tool.function?.parameters),
      category: this.categorizeToolByName(tool.name || tool.function?.name),
      source: 'a2a' as const,
      agentId
    }));
  }

  /**
   * Adapt parameter schema to ADK format
   */
  private adaptParameterSchema(params: any): ToolParameterSchema {
    if (!params || typeof params !== 'object') {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    return {
      type: 'object',
      properties: params.properties || {},
      required: params.required || []
    };
  }

  /**
   * Categorize tool by name
   */
  private categorizeToolByName(toolName: string): ADKTool['category'] {
    const name = toolName.toLowerCase();
    
    if (name.includes('monitor') || name.includes('health') || name.includes('status')) {
      return 'monitoring';
    }
    if (name.includes('send') || name.includes('message') || name.includes('notify')) {
      return 'communication';
    }
    if (name.includes('analyze') || name.includes('insight') || name.includes('report')) {
      return 'analysis';
    }
    if (name.includes('deploy') || name.includes('workflow') || name.includes('execute')) {
      return 'automation';
    }
    
    return 'data'; // Default category
  }

  /**
   * Validate tool parameters
   */
  private validateToolParameters(tool: ADKTool, parameters: Record<string, any>): void {
    const schema = tool.parameters;
    const required = schema.required || [];

    // Check required parameters
    for (const param of required) {
      if (!(param in parameters)) {
        throw new Error(`Missing required parameter: ${param}`);
      }
    }

    // Validate parameter types
    for (const [key, value] of Object.entries(parameters)) {
      if (schema.properties[key]) {
        this.validateParameterType(key, value, schema.properties[key]);
      }
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(name: string, value: any, schema: ToolParameter): void {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (schema.type !== actualType) {
      throw new Error(`Parameter '${name}' expected type ${schema.type}, got ${actualType}`);
    }

    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`Parameter '${name}' must be one of: ${schema.enum.join(', ')}`);
    }
  }

  /**
   * Check if tool matches filter
   */
  private matchesFilter(tool: ADKTool, filter: ToolFilter): boolean {
    if (filter.category && !filter.category.includes(tool.category)) return false;
    if (filter.source && !filter.source.includes(tool.source)) return false;
    if (filter.agentId && tool.agentId !== filter.agentId) return false;
    if (filter.namePattern) {
      const pattern = new RegExp(filter.namePattern, 'i');
      if (!pattern.test(tool.name)) return false;
    }
    return true;
  }

  /**
   * Discover tools from MCP server
   */
  private async discoverMCPTools(connection: MCPServerConnection): Promise<ADKTool[]> {
    try {
      // Simulate MCP tool discovery
      // In real implementation, this would make MCP list_tools call
      console.log(`[MCP Adapter] Discovering tools from MCP server: ${connection.name}`);
      
      // Mock MCP tools for demonstration
      const mockTools: ADKTool[] = [
        {
          name: `${connection.name}_query`,
          description: `Query tool for ${connection.name}`,
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Query string' }
            },
            required: ['query']
          },
          category: 'data',
          source: 'mcp',
          endpoint: connection.endpoint
        }
      ];

      return mockTools;
    } catch (error) {
      console.error(`[MCP Adapter] Failed to discover tools from MCP server ${connection.name}:`, error);
      return [];
    }
  }

  /**
   * Call MCP tool
   */
  private async callMCPTool(tool: ADKTool, parameters: Record<string, any>): Promise<A2AResponse> {
    try {
      // Simulate MCP tool call
      // In real implementation, this would make MCP call_tool request
      console.log(`[MCP Adapter] Calling MCP tool: ${tool.name}`);
      
      return {
        success: true,
        data: { result: 'MCP tool call result', parameters },
        executionTime: 100,
        fromAgent: 'mcp-server'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'MCP tool call failed',
        executionTime: 0,
        fromAgent: 'mcp-server'
      };
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.a2aLayer.on('connected', () => {
      console.log('[MCP Adapter] A2A layer connected, discovering tools...');
      this.discoverToolsFromAgents().catch(console.error);
    });

    this.a2aLayer.on('agent_registered', () => {
      console.log('[MCP Adapter] New agent registered, rediscovering tools...');
      this.discoverToolsFromAgents().catch(console.error);
    });
  }

  /**
   * Get adapter status
   */
  getStatus(): {
    initialized: boolean;
    toolCount: number;
    mcpConnections: number;
    filters: number;
  } {
    return {
      initialized: this.isInitialized,
      toolCount: this.discoveredTools.size,
      mcpConnections: this.mcpConnections.size,
      filters: this.toolFilters.length
    };
  }

  /**
   * Shutdown the adapter
   */
  async shutdown(): Promise<void> {
    console.log('[MCP Adapter] Shutting down MCP Toolset Adapter...');
    
    // Disconnect from MCP servers
    for (const connection of this.mcpConnections.values()) {
      connection.status = 'disconnected';
    }

    this.discoveredTools.clear();
    this.mcpConnections.clear();
    this.toolFilters = [];
    this.isInitialized = false;
    this.emit('shutdown');
  }
}

export default MCPToolsetAdapter;
