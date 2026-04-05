/**
 * AI Homelab Ecosystem - MCP Gateway Adapter for Dashboard
 * 
 * This adapter provides a standardized integration with the MCP server through the AI Gateway
 * following ecosystem-first design principles.
 * 
 * Implements the JSON-RPC 2.0 protocol for standardized communication.
 * https://www.jsonrpc.org/specification
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Define service information for the dashboard
const serviceInfo = {
  id: 'mcp-dashboard',
  name: 'MCP Dashboard',
  type: 'web-app',
  version: '1.0.0',
  description: 'Dashboard for monitoring and managing the AI Homelab Ecosystem',
  capabilities: [
    'mcp-monitoring',
    'ecosystem-visualization',
    'project-management',
    'documentation-access'
  ],
  endpoints: [
    {
      url: '/api/ws-proxy',
      type: 'ws',
      description: 'WebSocket proxy for MCP server communication'
    },
    {
      url: '/api/mcp',
      type: 'http',
      description: 'HTTP API proxy for MCP server commands'
    }
  ]
};

// JSON-RPC 2.0 error codes
const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVICE_NOT_FOUND: -32000,
  CONNECTION_ERROR: -32001,
  UNAUTHORIZED: -32002,
  TIMEOUT: -32003
};

// Define Gateway configuration interface
export interface GatewayConfig {
  host: string;
  port: number;
  secure: boolean;
  basePath: string;
  authToken?: string;
}

// Get Gateway configuration from environment variables
const getGatewayConfig = (): GatewayConfig => {
  // Get configuration from environment variables
  const isServer = typeof window === 'undefined';
  
  // Use appropriate environment variables based on environment
  const host = isServer 
    ? process.env.AI_GATEWAY_HOST || 'localhost'
    : process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || 'localhost';
    
  const port = isServer
    ? parseInt(process.env.AI_GATEWAY_PORT || '3000', 10)
    : parseInt(process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || '3000', 10);
    
  const secure = isServer
    ? process.env.AI_GATEWAY_SECURE === 'true'
    : process.env.NEXT_PUBLIC_AI_GATEWAY_SECURE === 'true';
    
  const basePath = isServer
    ? process.env.AI_GATEWAY_BASE_PATH || '/api'
    : process.env.NEXT_PUBLIC_AI_GATEWAY_BASE_PATH || '/api';
  
  return {
    host,
    port,
    secure,
    basePath
  };
};

// Get MCP server configuration from environment variables
const getMCPConfig = () => {
  const isServer = typeof window === 'undefined';
  
  // Use appropriate environment variables based on environment
  const host = isServer 
    ? process.env.MCP_SERVER_HOST || 'localhost'
    : process.env.NEXT_PUBLIC_MCP_SERVER_HOST || 'localhost';
    
  const port = isServer
    ? parseInt(process.env.MCP_SERVER_PORT || '8888', 10)
    : parseInt(process.env.NEXT_PUBLIC_MCP_SERVER_PORT || '8888', 10);
    
  return {
    host,
    port
  };
};

/**
 * Build a URL for the Gateway
 */
function buildGatewayUrl(path: string): string {
  const config = getGatewayConfig();
  const protocol = config.secure ? 'https' : 'http';
  const basePath = config.basePath.startsWith('/') 
    ? config.basePath 
    : `/${config.basePath}`;
  
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  return `${protocol}://${config.host}:${config.port}${basePath}/${pathWithoutLeadingSlash}`;
}

/**
 * Build headers for Gateway requests
 */
function buildGatewayHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization if available
  const config = getGatewayConfig();
  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  
  return headers;
}

/**
 * Create a JSON-RPC 2.0 request object
 */
function createJsonRpcRequest(method: string, params: any): any {
  return {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params
  };
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; initialDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 5000;
  
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      retries++;
      
      // Check if we've exceeded max retries
      if (retries >= maxRetries) {
        throw error;
      }
      
      // Don't retry if it's a client error (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * 2, maxDelay);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      delay = delay + jitter;
      
      console.debug(`Retry ${retries}/${maxRetries} after ${delay}ms`);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Execute an MCP command through the Gateway
 */
export async function executeMCPCommand<T = any>(
  command: string,
  params: any
): Promise<T> {
  // Strict service mesh: always target AI Gateway MCP endpoint
  const mcpPath = (typeof window === 'undefined'
    ? process.env.AI_GATEWAY_MCP_PATH
    : process.env.NEXT_PUBLIC_AI_GATEWAY_MCP_PATH) || '/api/v1/mcp';
  const sanitizedPath = mcpPath.startsWith('/') ? mcpPath.substring(1) : mcpPath;
  const url = buildGatewayUrl(sanitizedPath);
  
  // Create a JSON-RPC 2.0 request
  const request = createJsonRpcRequest(command, {
    ...params,
    _serviceId: serviceInfo.id,
    _timestamp: new Date().toISOString()
  });
  
  try {
    // Execute the command with retry logic
    const result = await retryWithBackoff(async () => {
      // Execute the command through the Gateway
      const response = await axios.post(url, request, {
        headers: {
          ...buildGatewayHeaders(),
          'X-Service-ID': serviceInfo.id
        },
        timeout: 30000 // 30 second timeout
      });
      
      // Check for JSON-RPC error
      if (response.data.error) {
        const error: any = new Error(response.data.error.message || 'Unknown error');
        error.code = response.data.error.code;
        error.data = response.data.error.data;
        throw error;
      }
      
      // Return the result
      return response.data.result;
    }, {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000
    });
    
    return result as T;
  } catch (error: any) {
    console.error(`Failed to execute MCP command ${command}:`, error);
    throw error;
  }
}

/**
 * Track progress with AIHDS integration
 */
export async function trackProgress(
  projectId: string,
  taskId: string,
  percentage: number,
  status: string,
  message?: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Validate percentage range
  if (percentage < 0 || percentage > 100) {
    throw new Error('Percentage must be between 0 and 100');
  }
  
  // Validate status
  const validStatuses = ['not_started', 'in_progress', 'completed', 'failed', 'blocked'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
  }
  
  try {
    // Execute the aihds_progress_tracker command using JSON-RPC 2.0
    await executeMCPCommand('aihds_progress_tracker', {
      projectId,
      taskId,
      action: 'update_progress',
      data: {
        percentage,
        status,
        message: message || '',
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to track progress:', error);
    throw error;
  }
}

/**
 * Update documentation
 */
export async function updateDocumentation(
  projectId: string,
  docType: string,
  docPath: string,
  changeDescription: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Validate docType
  const validDocTypes = ['technical', 'api', 'architecture', 'user', 'progress', 'strategic'];
  if (!validDocTypes.includes(docType)) {
    throw new Error(`Invalid docType: ${docType}. Must be one of: ${validDocTypes.join(', ')}`);
  }
  
  try {
    // Execute the documentation_finder command using JSON-RPC 2.0
    await executeMCPCommand('documentation_finder', {
      action: 'update',
      projectId,
      docType,
      docPath,
      changeDescription,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Failed to update documentation:', error);
    throw error;
  }
}

/**
 * Disconnect MCP adapter
 */
export async function disconnectMCP(): Promise<void> {
  try {
    // Use the JSON-RPC 2.0 protocol to disconnect
    await executeMCPCommand('disconnect', {
      serviceId: serviceInfo.id
    });
    
    console.info('Successfully disconnected from MCP server');
  } catch (error: any) {
    console.error('Failed to disconnect MCP adapter:', error);
    // Don't rethrow the error as disconnection failures shouldn't break the application
  }
}

/**
 * Connect to the MCP server through the Gateway
 */
export async function connectMCP(): Promise<void> {
  try {
    // Always connect via AI Gateway connect endpoint
    const mcpPath = (typeof window === 'undefined'
      ? process.env.AI_GATEWAY_MCP_PATH
      : process.env.NEXT_PUBLIC_AI_GATEWAY_MCP_PATH) || '/api/v1/mcp';
    const connectPath = `${mcpPath.replace(/\/$/, '')}/connect`;
    const sanitizedPath = connectPath.startsWith('/') ? connectPath.substring(1) : connectPath;
    await axios.post(
      buildGatewayUrl(sanitizedPath),
      serviceInfo,
      {
        headers: buildGatewayHeaders()
      }
    );
    
    console.info(`Successfully connected to MCP server as ${serviceInfo.id}`);
  } catch (error: any) {
    console.error('Failed to connect to MCP server:', error);
    throw error;
  }
}

/**
 * Initialize the MCP Gateway adapter
 */
export async function initializeMCPAdapter(): Promise<void> {
  try {
    // Connect to the MCP server
    await connectMCP();
    
    // Set up automatic disconnection on process exit
    if (typeof process !== 'undefined') {
      process.on('SIGTERM', async () => {
        console.info('SIGTERM received, disconnecting from MCP server');
        await disconnectMCP();
      });
      
      process.on('SIGINT', async () => {
        console.info('SIGINT received, disconnecting from MCP server');
        await disconnectMCP();
      });
    }
    
    // Set up automatic disconnection on window unload in browser environments
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // We can't await here due to beforeunload constraints
        disconnectMCP();
      });
    }
    
    console.info('MCP Gateway adapter initialized successfully');
  } catch (error: any) {
    console.error('Failed to initialize MCP Gateway adapter:', error);
    throw error;
  }
}

// Export the adapter functions
export default {
  executeMCPCommand,
  trackProgress,
  updateDocumentation,
  connectMCP,
  disconnectMCP,
  initializeMCPAdapter
};
