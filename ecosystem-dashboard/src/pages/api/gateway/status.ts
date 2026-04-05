/**
 * API route for fetching AI Gateway status
 * This proxies the request to the AI Gateway health endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
// Simple middleware for API authentication
const validateToken = async (token: string | undefined): Promise<boolean> => {
  if (!token) return false;
  
  // In a production environment, you would validate the token
  // against your authentication service
  // For now, we'll accept any non-empty token
  return token.length > 0;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the AI Gateway URL from environment variables or use default
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:7777';
    
    // Fetch the health status from the AI Gateway
    const response = await axios.get(`${aiGatewayUrl}/health`, {
      timeout: 5000, // 5 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      }
    });
    
    // Process the response to extract relevant information
    const healthData = response.data;
    
    // Calculate uptime in human-readable format
    const uptimeSeconds = healthData.uptime || 0;
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m`;
    
    // Format the response for the dashboard
    const statusData = {
      isOnline: healthData.status === 'healthy',
      status: healthData.status || 'unknown',
      uptime: uptimeFormatted,
      uptimeSeconds: uptimeSeconds,
      version: healthData.version || '2.0.0',
      lastChecked: new Date().toISOString(),
      timestamp: healthData.timestamp,
      endpoint: aiGatewayUrl,
      responseTime: Date.now() - Date.parse(healthData.timestamp || new Date().toISOString()),
      // Additional status information
      models: {
        total: 0, // Will be populated by separate models endpoint
        active: 0,
        loading: 0
      },
      requests: {
        total: 0, // Will be populated by metrics endpoint
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      }
    };
    
    return res.status(200).json(statusData);
  } catch (error) {
    console.error('Error fetching AI Gateway status:', error);
    
    // Return a graceful error response with more detailed information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
    
    return res.status(503).json({
      isOnline: false,
      error: 'Failed to fetch AI Gateway status',
      message: errorMessage,
      status: 'offline',
      uptime: 'N/A',
      version: 'N/A',
      lastChecked: new Date().toISOString(),
      endpoint: process.env.AI_GATEWAY_URL || 'http://localhost:7777',
      connectionError: isConnectionError,
      models: {
        total: 0,
        active: 0,
        loading: 0
      },
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      }
    });
  }
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  
  // Skip authentication in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev && (!authHeader || !(await validateToken(authHeader.split(' ')[1])))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Call the handler function
  return handler(req, res);
}
