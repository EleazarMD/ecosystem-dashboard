/**
 * AHIS Command Execution API Route
 * 
 * This API route provides a way to execute commands on the AHIS server.
 * It follows the ecosystem-first development principles by routing all communication
 * through the AHIS server.
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

// Get AHIS configuration from environment variables or server runtime config
const getAHISConfig = (): AHISClientConfig => {
  return {
    host: serverRuntimeConfig.AHIS_HOST || process.env.AHIS_HOST || 'localhost',
    port: parseInt(serverRuntimeConfig.AHIS_PORT || process.env.AHIS_PORT || '8888', 10),
    secure: serverRuntimeConfig.AHIS_SECURE === 'true' || process.env.AHIS_SECURE === 'true',
    basePath: serverRuntimeConfig.AHIS_BASE_PATH || process.env.AHIS_BASE_PATH || '/api',
    authToken: serverRuntimeConfig.AHIS_AUTH_TOKEN || process.env.AHIS_AUTH_TOKEN
  };
};

// Build a URL for the AHIS server
function buildAHISUrl(path: string): string {
  const config = getAHISConfig();
  const protocol = config.secure ? 'https' : 'http';
  const basePath = config.basePath.startsWith('/') 
    ? config.basePath 
    : `/${config.basePath}`;
  
  const pathWithoutLeadingSlash = path.startsWith('/') ? path.substring(1) : path;
  
  return `${protocol}://${config.host}:${config.port}${basePath}/${pathWithoutLeadingSlash}`;
}

// Build headers for AHIS requests
function buildAHISHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add authorization if available
  const config = getAHISConfig();
  if (config.authToken) {
    headers['Authorization'] = `Bearer ${config.authToken}`;
  }
  
  return headers;
}

/**
 * Execute a command on the AHIS server
 */
async function executeAHISCommand(method: string, params: any): Promise<any> {
  try {
    // Generate a unique request ID for tracking
    const requestId = `ahis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Build the URL for the AHIS server
    const url = buildAHISUrl('ahis/execute');
    
    logger.info(`Executing AHIS command: ${method}`, { requestId, params });
    
    // Prepare JSON-RPC 2.0 payload
    const jsonRpcPayload = {
      jsonrpc: '2.0',
      id: requestId,
      method: method,
      params: params || {}
    };
    
    // Make the request
    const response = await axios({
      method: 'POST',
      url,
      headers: buildAHISHeaders(),
      data: jsonRpcPayload,
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => {
        // Allow redirects for service mesh routing
        return status >= 200 && status < 400;
      }
    });
    
    logger.info(`AHIS command executed successfully: ${method}`, { requestId });
    
    // Check for JSON-RPC error in response
    if (response.data.error) {
      throw new Error(response.data.error.message || 'AHIS command returned error');
    }
    
    // Return the result from JSON-RPC response
    return response.data.result;
  } catch (error: any) {
    // Get a meaningful error message
    const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Unknown error';
    
    logger.error(`Failed to execute AHIS command: ${method}`, { error: errorMessage });
    
    throw new Error(`AHIS command execution failed: ${errorMessage}`);
  }
}

/**
 * API handler for executing AHIS commands
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { method, params } = req.body;
    
    // Validate required fields
    if (!method) {
      return res.status(400).json({ success: false, error: 'Method is required' });
    }
    
    // Execute the command
    const result = await executeAHISCommand(method, params || {});
    
    // Return the result
    return res.status(200).json({ success: true, result });
  } catch (error: any) {
    logger.error('Error in AHIS execute API route:', error);
    
    // Return error response
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Unknown error',
        code: error.code || 'INTERNAL_ERROR'
      }
    });
  }
}
