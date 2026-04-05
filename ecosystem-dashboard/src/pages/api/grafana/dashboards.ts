import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import logger from '@/lib/logger';

/**
 * API route that proxies requests to Grafana through the AI Gateway
 * This follows the service mesh integration pattern required by the AI Homelab Ecosystem
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Grafana dashboards request missing authorization header');
      return res.status(401).json({ 
        error: 'Missing authorization header',
        timestamp: new Date().toISOString()
      });
    }
    
    // Get environment variables
    const aiGatewayUrl = process.env.AI_GATEWAY_URL || 'http://ai-gateway:8080';
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:9876';
    
    logger.info('Fetching Grafana dashboards through AI Gateway service mesh');
    
    // Proxy the request to Grafana through the AI Gateway following the service mesh pattern
    const response = await axios.get(`${aiGatewayUrl}/v1/proxy/grafana/api/search`, {
      headers: {
        Authorization: authHeader,
        'X-Target-Service': 'grafana',
        'X-Target-Url': `${grafanaUrl}/api/search`,
        'X-Request-ID': req.headers['x-request-id'] || `grafana-dash-${Date.now()}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });
    
    // Transform the response to match our expected format
    const dashboards = response.data.map((dashboard: any) => ({
      id: dashboard.id.toString(),
      uid: dashboard.uid,
      title: dashboard.title,
      description: dashboard.tags?.includes('generated') 
        ? 'Auto-generated dashboard' 
        : dashboard.description || `Dashboard for ${dashboard.title}`,
      tags: dashboard.tags || [],
      url: `${grafanaUrl}/d/${dashboard.uid}`,
      category: dashboard.folderTitle || 'General'
    }));
    
    logger.info(`Successfully fetched ${dashboards.length} Grafana dashboards`);
    
    return res.status(200).json({
      dashboards,
      timestamp: new Date().toISOString(),
      source: 'ai-gateway-service-mesh'
    });
  } catch (error: any) {
    console.error('Error proxying request to Grafana:', error.response?.data || error.message);
    
    // Return appropriate error response
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch Grafana dashboards',
      details: error.response?.data || error.message
    });
  }
}
