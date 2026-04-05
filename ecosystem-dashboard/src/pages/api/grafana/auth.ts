import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '@/lib/logger';

interface GrafanaAuthRequest {
  userId?: string;
  email?: string;
  timestamp?: string;
}

/**
 * API route that generates an authenticated URL for Grafana
 * This follows the service mesh integration pattern required by the AI Homelab Ecosystem
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Grafana auth request missing authorization header');
      return res.status(401).json({ error: 'Missing authorization header' });
    }
    
    // Get user information from request body
    const { userId, email, timestamp } = req.body as GrafanaAuthRequest;
    
    // Get environment variables
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://ai-gateway:8080';
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:9876';
    
    // Request a Grafana authentication token through the AI Gateway
    // This follows the service mesh pattern by routing through the AI Gateway
    const response = await axios.post(`${aiGatewayUrl}/v1/auth/grafana/token`, {
      userId,
      email,
      timestamp,
      redirectUrl: `${grafanaUrl}/login/generic_oauth`
    }, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Generated Grafana auth URL for user ${userId || 'unknown'}`);
    
    // Return the authentication URL with additional metadata
    return res.status(200).json({
      authUrl: response.data.authUrl,
      expiresIn: response.data.expiresIn || 300, // Default 5 minutes if not provided
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error generating Grafana auth URL:', {
      error: error.message,
      details: error.response?.data,
      status: error.response?.status
    });
    
    // Return appropriate error response
    return res.status(error.response?.status || 500).json({
      error: 'Failed to generate Grafana authentication URL',
      details: error.response?.data || error.message,
      timestamp: new Date().toISOString()
    });
  }
}
