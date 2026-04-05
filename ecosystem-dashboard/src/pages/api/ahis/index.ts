/**
 * AHIS API Proxy Route
 * 
 * This API route serves as a proxy for AHIS server commands, implementing
 * ecosystem-first design principles for secure and standardized communication
 * through the Gateway service mesh.
 */
import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '@/lib/logger';
import getConfig from 'next/config';

// Get server runtime config
const { serverRuntimeConfig } = getConfig();

// Define the AHIS client configuration
interface AHISClientConfig {
  host: string;
  port: number;
  secure: boolean;
  basePath: string;
  authToken?: string;
}

// Get Gateway configuration from environment variables or server runtime config
const getGatewayConfig = (): AHISClientConfig => {
  return {
    host: serverRuntimeConfig.AI_GATEWAY_HOST || process.env.AI_GATEWAY_HOST || 'localhost',
    port: parseInt(serverRuntimeConfig.AI_GATEWAY_PORT || process.env.AI_GATEWAY_PORT || '8080', 10),
    secure: serverRuntimeConfig.AI_GATEWAY_SECURE === 'true' || process.env.AI_GATEWAY_SECURE === 'true',
    basePath: serverRuntimeConfig.AI_GATEWAY_BASE_PATH || process.env.AI_GATEWAY_BASE_PATH || '/api',
    authToken: serverRuntimeConfig.AI_GATEWAY_AUTH_TOKEN || process.env.AI_GATEWAY_AUTH_TOKEN
  };
};

// Build a URL for the Gateway
function buildGatewayUrl(path: string): string {
  const config = getGatewayConfig();
  const protocol = config.secure ? 'https' : 'http';
  const basePath = config.basePath.startsWith('/') 
    ? config.basePath 
    : `/${config.basePath}`;
  
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  return `${protocol}://${config.host}:${config.port}${basePath}/${pathWithoutLeadingSlash}`;
}

// Build headers for Gateway requests
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
 * Handle ecosystem scanner requests
 */
async function handleEcosystemScanner(
  req: NextApiRequest,
  res: NextApiResponse,
  params: any,
  requestId: string
) {
  try {
    const { action, projects, file_types, exclude_patterns } = params;
    
    logger.info(`Handling ecosystem scanner: ${action}`, { requestId, projects });
    
    if (action === 'scan_projects') {
      // Mock ecosystem scanning for now - in production this would scan actual filesystem
      const mockResults = projects.flatMap((project: string) => [
        {
          path: `${project}/README.md`,
          filename: 'README.md',
          type: 'markdown',
          size: 2048 + Math.floor(Math.random() * 3000),
          lastModified: new Date().toISOString(),
          status: Math.random() > 0.5 ? 'new' : 'updated',
          project,
          estimatedTokens: 512 + Math.floor(Math.random() * 1000)
        },
        {
          path: `${project}/docs/architecture.md`,
          filename: 'architecture.md',
          type: 'markdown',
          size: 4096 + Math.floor(Math.random() * 2000),
          lastModified: new Date().toISOString(),
          status: Math.random() > 0.7 ? 'new' : 'existing',
          project,
          estimatedTokens: 1024 + Math.floor(Math.random() * 500)
        },
        {
          path: `${project}/src/config.yaml`,
          filename: 'config.yaml',
          type: 'config',
          size: 1024 + Math.floor(Math.random() * 1000),
          lastModified: new Date().toISOString(),
          status: 'existing',
          project,
          estimatedTokens: 256 + Math.floor(Math.random() * 300)
        }
      ]);
      
      return res.status(200).json({
        jsonrpc: '2.0',
        id: requestId,
        result: mockResults
      });
    }
    
    if (action === 'get_scan_status') {
      const { scan_id } = params;
      return res.status(200).json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          scan_id,
          status: 'completed',
          progress: 100,
          found: 15,
          processed: 15,
          errors: []
        }
      });
    }
    
    return res.status(400).json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Invalid action for ecosystem_scanner',
        data: { action }
      }
    });
    
  } catch (error: any) {
    logger.error('Ecosystem scanner error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32603,
        message: 'Internal error in ecosystem scanner',
        data: { error: error.message }
      }
    });
  }
}

/**
 * AHIS API proxy handler
 * 
 * Executes commands on the AHIS server through the Gateway and returns the results.
 * This follows the ecosystem-first design principle by providing a
 * standardized interface for all dashboard components to communicate
 * with the AHIS server.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both direct command format and JSON-RPC format
    const { command, params, options, jsonrpc, method, id } = req.body;
    
    // Determine if this is a JSON-RPC request
    const isJsonRpc = jsonrpc === '2.0' && method;
    const commandName = isJsonRpc ? method : command;
    const commandParams = isJsonRpc ? params : (params || {});
    const requestId = isJsonRpc ? id : `ahis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Validate required parameters
    if (!commandName) {
      return res.status(400).json({ error: 'Command or method is required' });
    }

    // Handle ecosystem scanner requests directly
    if (commandName === 'ecosystem_scanner') {
      return handleEcosystemScanner(req, res, commandParams, requestId);
    }

    // Execute the command via Gateway or AHIS server
    const timeout = options?.timeout || 30000;
    
    // Create request object
    const requestData = isJsonRpc ? {
      jsonrpc: '2.0',
      id: requestId,
      method: commandName,
      params: commandParams
    } : {
      id: requestId,
      method: commandName,
      params: commandParams,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`Executing AHIS command: ${commandName}`, { requestId, params: commandParams });
    
    // Try direct AHIS server connection first
    let response;
    try {
      response = await axios.post(
        'http://localhost:8888/api/ahis/rpc',
        requestData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
    } catch (ahisError) {
      // Fallback to Gateway if direct connection fails
      logger.warn('Direct AHIS connection failed, trying Gateway', { error: ahisError.message });
      response = await axios.post(
        buildGatewayUrl(`ahis/${commandName}`),
        requestData,
        {
          headers: buildGatewayHeaders(),
          timeout,
          validateStatus: (status) => {
            return status >= 200 && status < 400;
          }
        }
      );
    }
    
    logger.info(`AHIS command executed successfully: ${commandName}`, { requestId });
    
    // Return the result in appropriate format
    if (isJsonRpc) {
      return res.status(200).json(response.data);
    } else {
      return res.status(200).json(response.data);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    logger.error(`Failed to execute AHIS command`, { error: errorMessage });
    
    // Return appropriate error response
    return res.status(error.response?.status || 500).json({
      error: 'Failed to execute AHIS command',
      message: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
}
