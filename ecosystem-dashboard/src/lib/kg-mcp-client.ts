/**
 * Knowledge Graph MCP Client class
 * 
 * @class KGMCPClient
 * @description Client for interacting with the Knowledge Graph service via MCP protocol
 * @implements AI Homelab Ecosystem integration standards v2.0
 * @requires global.__ahisClient to be initialized
 * @requires NEXT_PUBLIC_AI_GATEWAY_ENABLED environment variable to be 'true'
 */
/**
 * Knowledge Graph MCP Client
 * 
 * This module provides a client for interacting with the Knowledge Graph service 
 * through the Model Context Protocol (MCP). It handles communication with the 
 * Knowledge Graph service via the AI Gateway, with strict adherence to MCP protocol.
 * 
 * The client implementation follows the AI Homelab Ecosystem standards with 
 * strict adherence to ecosystem communication protocols as defined in:
 * /Users/eleazar/Projects/AIHomelab/core/knowledge-graph/docs/knowledge-graph-mcp-specification.md
 * 
 * NO FALLBACKS: This implementation strictly enforces MCP protocol communication via the AI Gateway
 * with no fallback mechanisms, as per AI Homelab Ecosystem standards.
 */

// Simple console logger fallback
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};
import { v4 as uuidv4 } from 'uuid';

/**
 * @module kg-mcp-client
 * @description Knowledge Graph MCP Client for AI Homelab Ecosystem
 * 
 * This client provides a standardized interface for interacting with the Knowledge Graph 
 * service strictly via MCP protocol through the AI Gateway. It enforces proper communication
 * protocols and provides robust error handling.
 * 
 * @version 1.0.0
 * @author AI Homelab Team
 * @example
 * ```typescript
 * // Basic usage example
 * const kgClient = new KGMCPClient();
 * 
 * // Reason over the Knowledge Graph
 * const result = await kgClient.reasonOverKnowledgeGraph(
 *   'How do services interact with the Knowledge Graph?',
 *   { detail_level: 'high' }
 * );
 * ```
 */

declare global {
  // Extend global namespace to include AHIS client
  var __ahisClient: any;
}

/**
 * Custom error class for MCP-related errors
 */
export class MCPError extends Error {
  /**
   * Error code identifying the type of error
   * @type {string}
   */
  code: string;
  
  /**
   * HTTP-like status code for the error
   * @type {number}
   */
  statusCode: number;
  
  /**
   * Unique request ID for tracing the error through the system
   * @type {string}
   */
  requestId?: string;

  /**
   * Creates an instance of MCPError.
   * @param {string} message - Human-readable error message
   * @param {string} code - Error code (e.g., 'MCP_COMMUNICATION_ERROR')
   * @param {number} statusCode - HTTP-like status code (e.g., 500)
   * @param {string} [requestId] - Unique request ID for tracing
   */
  constructor(message: string, code: string, statusCode: number, requestId?: string) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

/**
 * MCP Server Interface for AI Gateway communication
 */
interface MCPServer {
  /**
   * Executes a command on the MCP server
   * 
   * @param {string} commandName - Name of the MCP command to execute (e.g., 'mcp0_kg_reason')
   * @param {any} params - Parameters to pass to the command
   * @returns {Promise<any>} Promise resolving to the command result
   * @throws {MCPError} If the command execution fails
   */
  executeCommand(commandName: string, params: any): Promise<any>;
  
  /**
   * Checks if the MCP server is connected
   * 
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected(): boolean;
}

/**
 * Single instance of MCPServer for interacting with the AI Gateway
 * This is the core interface to the MCP protocol for Knowledge Graph communication
 */
const MCPServer: MCPServer = {
  isConnected(): boolean {
    try {
      // Get the AHIS client instance from the ecosystem
      const ahisClient = global.__ahisClient;
      if (!ahisClient) {
        logger.warn('[KG-MCP] No AHIS client found in global context');
        return false;
      }
      return ahisClient.isConnectedToServer();
    } catch (error) {
      logger.error('[KG-MCP] Error checking connection status', { error });
      return false;
    }
  },
  
  async executeCommand(commandName: string, params: any): Promise<any> {
    try {
      // Get the AHIS client instance from the ecosystem
      const ahisClient = global.__ahisClient;
      if (!ahisClient) {
        throw new MCPError(
          'AHIS client not initialized', 
          'MCP_CLIENT_ERROR',
          500
        );
      }
      
      logger.info(`[KG-MCP] Executing command via MCP: ${commandName}`, { params });
      const result = await ahisClient.executeCommand(commandName, params);
      return result;
    } catch (error: any) {
      logger.error(`[KG-MCP] Error executing command: ${commandName}`, { error, params });
      throw new MCPError(
        error.message || 'Unknown MCP error',
        error.code || 'MCP_COMMUNICATION_ERROR',
        error.statusCode || 500
      );
    }
  }
};

/**
 * Knowledge Graph MCP client configuration options
 */
export interface KGMCPClientConfig {
  timeout?: number;
  aiGatewayEnabled?: boolean;
}

/**
 * Knowledge Graph MCP client implementation
 * This class is the main entry point for interacting with the Knowledge Graph service
 * via the AI Gateway using MCP protocol.
 */
export class KGMCPClient {
  /**
   * MCP server instance for command execution
   * @private
   */
  private server: MCPServer;
  
  /**
   * Timeout for MCP command execution in milliseconds
   * @private
   */
  private timeout: number;
  
  /**
   * Creates an instance of KGMCPClient.
   * @throws {MCPError} If AI Gateway is not enabled or AHIS client is not available
   */
  constructor(config: KGMCPClientConfig = {}) {
    // Ensure AI Gateway communication is enabled
    if (process.env.NEXT_PUBLIC_AI_GATEWAY_ENABLED !== 'true' && !config.aiGatewayEnabled) {
      throw new MCPError(
        'AI Gateway communication must be enabled for KGMCPClient',
        'GATEWAY_DISABLED',
        500
      );
    }
    
    // Configure timeout from env or use default
    this.timeout = config.timeout || parseInt(process.env.NEXT_PUBLIC_KG_TIMEOUT || '30000', 10);
    
    // Set up MCP server singleton
    this.server = {
      executeCommand: async (commandName: string, params: any): Promise<any> => {
        try {
          const ahisClient = global.__ahisClient;
          if (!ahisClient) {
            throw new MCPError(
              'AHIS client not initialized', 
              'MCP_CLIENT_ERROR',
              500
            );
          }
          
          logger.info(`[KG-MCP] Executing command via MCP: ${commandName}`, { params });
          const result = await ahisClient.executeCommand(commandName, params);
          return result;
        } catch (error: any) {
          logger.error(`[KG-MCP] Error executing command: ${commandName}`, { error, params });
          throw new MCPError(
            error.message || 'Unknown MCP error',
            error.code || 'MCP_COMMUNICATION_ERROR',
            error.statusCode || 500
          );
        }
      },
      isConnected: MCPServer.isConnected
    };
    
    logger.info('[KG-MCP] Client initialized with MCP protocol');
  }
  
  /**
   * Private method to call an MCP tool with logging and error handling
   * 
   * @private
   * @param {string} tool - The MCP tool to call (without the 'mcp0_kg_' prefix)
   * @param {any} params - Parameters to pass to the tool
   * @returns {Promise<any>} Promise resolving to the tool result
   * @throws {MCPError} If the tool call fails or times out
   */
  private async callTool(tool: string, params: any): Promise<any> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      logger.info(`[KG-MCP] Calling tool: ${tool}`, { 
        requestId, 
        params,
        timeout: this.timeout
      });
      
      // Set up timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new MCPError(
            `Knowledge Graph MCP request timed out after ${this.timeout}ms`,
            'REQUEST_TIMEOUT',
            408,
            requestId
          ));
        }, this.timeout);
      });
      
      // Set up MCP command promise
      const commandPromise = this.server.executeCommand(`mcp0_kg_${tool}`, params);
      
      // Race between timeout and command
      const result = await Promise.race([commandPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      logger.info(`[KG-MCP] Tool call completed: ${tool}`, { 
        requestId, 
        duration,
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[KG-MCP] Tool call failed: ${tool}`, { 
        requestId, 
        duration,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        },
        params
      });
      
      throw new MCPError(
        error.message || `Error executing Knowledge Graph operation: ${tool}`,
        error.code || 'MCP_COMMUNICATION_ERROR',
        error.statusCode || 500,
        requestId
      );
    }
  }
  
  /**
   * Execute a Knowledge Graph tool via MCP
   * @param toolName - Name of the Knowledge Graph tool to execute
   * @param params - Parameters for the tool
   * @returns Promise with the result
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    return await this.callTool(toolName, params);
  }
  
  /**
   * Get a resource from the Knowledge Graph service via MCP
   * @param resourceName - Name of the resource to retrieve
   * @returns Promise with the resource
   */
  async getResource(resourceName: string): Promise<any> {
    logger.info(`[KG-MCP] Retrieving resource: ${resourceName}`);
    
    try {
      return await this.callTool('resource', {
        name: resourceName
      });
    } catch (error: any) {
      logger.error(`[KG-MCP] Error retrieving resource: ${resourceName}`, { error });
      throw new MCPError(
        `Failed to retrieve Knowledge Graph resource: ${error.message}`,
        'KG_RESOURCE_ERROR',
        error.statusCode || 500
      );
    }
  }
  
  /**
   * Query the Knowledge Graph using natural language or Cypher
   * @param query - Natural language query to execute
   * @param options - Optional query parameters
   * @returns Promise with the query results
   */
  async queryKnowledgeGraph(query: string, options: {
    context?: string;
    output_format?: 'json' | 'table' | 'summary';
    limit?: number;
  } = {}): Promise<any> {
    const params = {
      query,
      context: options.context,
      format: options.output_format || 'json',
      limit: options.limit || 10
    };
    
    return await this.callTool('query', params);
  }
  
  /**
   * Apply reasoning over Knowledge Graph data
   * @param question - Complex question requiring reasoning
   * @param options - Optional options for reasoning including context and detail level
   * @returns Promise with the reasoning results
   */
  async reasonOverKnowledgeGraph(question: string, options: {
    context?: string;
    detail_level?: 'low' | 'medium' | 'high';
  } | string = {}): Promise<any> {
    const opts = typeof options === 'string' 
      ? { context: options } 
      : options;
    
    return await this.callTool('reason', {
      question,
      context: opts.context,
      detail_level: opts.detail_level || 'medium'
    });
  }
  
  /**
   * Legacy alias for reasonOverKnowledgeGraph
   */
  async applyReasoning(question: string, options: {
    context?: string;
    detail_level?: 'low' | 'medium' | 'high';
  } | string = {}): Promise<any> {
    return await this.reasonOverKnowledgeGraph(question, options);
  }
  
  /**
   * Generate visualization of Knowledge Graph data
   * @param query - Query to visualize
   * @param format - Visualization format
   * @returns Promise with the visualization data
   */
  async visualizeKnowledgeGraph(query: string, format: 'mermaid' | 'dot' | 'json' = 'mermaid'): Promise<any> {
    return await this.callTool('visualize', {
      query,
      format
    });
  }
  
  /**
   * Find patterns in Knowledge Graph data
   * @param analysisType - Type of pattern analysis
   * @returns Promise with the pattern analysis results
   */
  async findPatterns(analysisType: 'anomalies' | 'patterns' | 'clusters' | 'orphans' | 'hubs' | 'bridges'): Promise<any> {
    return await this.callTool('patterns', {
      analysis_type: analysisType,
      format: 'json'
    });
  }
  
  /**
   * Run analytics on Knowledge Graph data
   * @param algorithm - Analytics algorithm to run
   * @returns Promise with the analytics results
   */
  async runAnalytics(algorithm: 'pagerank' | 'betweenness' | 'closeness' | 'degree' | 'louvain' | 'label_propagation' | 'clustering'): Promise<any> {
    return await this.callTool('analyze', {
      algorithm,
      format: 'json'
    });
  }
  
  /**
   * Search the Knowledge Graph
   * @param query - Search terms for infrastructure components
   * @param options - Optional search parameters
   * @returns Promise with the search results
   */
  async searchKnowledgeGraph(query: string, options: {
    category?: string;
    limit?: number;
  } = {}): Promise<any> {
    return await this.callTool('search', {
      query,
      category: options.category,
      limit: options.limit || 10,
      format: 'json'
    });
  }
  
  /**
   * Find paths between nodes in the Knowledge Graph
   * @param sourceNode - Source node name or ID
   * @param targetNode - Target node name or ID
   * @param options - Optional pathfinding options
   * @returns Promise with path results
   */
  async findPaths(sourceNode: string, targetNode: string, options: {
    algorithm?: 'shortest' | 'all_paths' | 'dijkstra' | 'weighted';
    max_depth?: number;
  } = {}): Promise<any> {
    return await this.callTool('pathfind', {
      source: sourceNode,
      target: targetNode,
      algorithm: options.algorithm || 'shortest',
      max_depth: options.max_depth || 5,
      format: 'json'
    });
  }
}

/**
 * End of Knowledge Graph MCP client implementation
 * 
 * This client strictly enforces MCP protocol communication via the AI Gateway
 * with no fallback mechanisms, as per AI Homelab Ecosystem standards.
 */
