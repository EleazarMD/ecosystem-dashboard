import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerConfig } from '../../../../lib/server-config';

/**
 * API Proxy for Agent Registry Service
 * 
 * This API route proxies requests from the dashboard frontend to the Agent Registry Service.
 * It handles authentication and CORS issues by proxying the requests through the Next.js server.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get server configuration
  const config = getServerConfig();
  
  // Get the path from the request
  const { path } = req.query;
  
  // Construct the target URL
  const targetPath = Array.isArray(path) ? path.join('/') : path;
  const targetUrl = `${config.agentRegistryUrl}/${targetPath}`;
  
  try {
    // Forward the request to the Agent Registry Service
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.agentRegistryAuthToken}`,
        // Forward user-agent and other necessary headers
        'User-Agent': req.headers['user-agent'] || 'AI-Homelab-Dashboard',
      },
      // Forward request body for POST, PUT, PATCH methods
      data: ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? req.body : undefined,
      // Forward query parameters
      params: req.query,
      // Set timeout
      timeout: 10000, // 10 seconds
    });
    
    // Return the response from the Agent Registry Service
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Error proxying request to ${targetUrl}:`, error);
    
    // Handle axios error responses
    if (axios.isAxiosError(error) && error.response) {
      // Forward the error status and data from the Agent Registry Service
      res.status(error.response.status).json(error.response.data);
    } else {
      // Handle network errors or other issues
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to communicate with Agent Registry Service',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}
