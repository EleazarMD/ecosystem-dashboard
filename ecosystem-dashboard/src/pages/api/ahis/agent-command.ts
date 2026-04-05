/**
 * Agent Command API Endpoint
 * 
 * This API endpoint handles agent command execution requests, connecting 
 * the frontend to the AHIS server for Knowledge Graph and LLM operations.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';
import { getAHISClient } from '@/lib/ahis-service';

/**
 * Execute agent commands to the AHIS server
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    // Validate request body
    const { command, params } = req.body;
    
    if (!command) {
      return res.status(400).json({
        success: false,
        error: 'Command is required',
        code: 'INVALID_PARAMETERS'
      });
    }

    logger.info(`[AHIS Agent API] Processing command: ${command}`, { params });
    
    // Check if AHIS client is available
    const ahisClient = global.__ahisClient;
    if (!ahisClient) {
      logger.error('[AHIS Agent API] AHIS client not initialized');
      return res.status(503).json({
        success: false,
        error: 'AHIS client not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }
    
    // Generate a unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Map agent commands to AHIS methods
    const methodMap: Record<string, string> = {
      'kg_query': 'agent:kg_query',
      'kg_reason': 'agent:kg_reason',
    };
    
    // Get the actual method name to call
    const method = methodMap[command] || `agent:${command}`;

    // Execute the command on AHIS
    try {
      // Prepare JSON-RPC 2.0 payload
      const jsonRpcPayload = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params: params || {}
      };
      
      logger.info(`[AHIS Agent API] Sending command to AHIS: ${method}`, { 
        requestId,
        params: JSON.stringify(params).substring(0, 200) 
      });
      
      // Create promise that will resolve when we get a response with matching ID
      const responsePromise = new Promise((resolve, reject) => {
        // Set timeout to avoid hanging requests
        const timeout = setTimeout(() => {
          ahisClient.off('ahis:response', responseHandler);
          reject(new Error('Request timed out after 30 seconds'));
        }, 30000);
        
        // Response handler
        const responseHandler = (response: any) => {
          // Check if this is our response
          if (response && response.id === requestId) {
            clearTimeout(timeout);
            ahisClient.off('ahis:response', responseHandler);
            
            if (response.error) {
              reject(response.error);
            } else {
              resolve(response.result);
            }
          }
        };
        
        // Listen for response events
        ahisClient.on('ahis:response', responseHandler);
        
        // Send the command
        ahisClient.emit('ahis:command', jsonRpcPayload);
      });
      
      // Wait for response or timeout
      const result = await responsePromise;
      
      logger.info(`[AHIS Agent API] Command executed successfully: ${method}`, { requestId });
      
      // Return successful response
      return res.status(200).json({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error(`[AHIS Agent API] Error executing command: ${method}`, { 
        requestId,
        error: error.message || 'Unknown error'
      });
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Error executing agent command',
        code: error.code || 'EXECUTION_ERROR'
      });
    }
  } catch (error: any) {
    logger.error('[AHIS Agent API] Unexpected error processing request:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
}
