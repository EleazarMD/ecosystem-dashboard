/**
 * API route for fetching AI Gateway metrics
 * This proxies the request to the AI Gateway metrics endpoint
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
    
    // Get query parameters for time range
    const { timeRange = '1h', granularity = '5m' } = req.query;
    
    // Fetch the metrics from the AI Gateway
    const response = await axios.get(`${aiGatewayUrl}/api/v1/metrics`, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      },
      params: {
        timeRange,
        granularity
      }
    });
    
    // Process the response to extract relevant information
    const metricsData = response.data;
    
    // Format the response for the dashboard
    const formattedMetrics = {
      requests: {
        total: metricsData.requests?.total || 0,
        successful: metricsData.requests?.successful || 0,
        failed: metricsData.requests?.failed || 0,
        rate: metricsData.requests?.rate || 0,
        averageResponseTime: metricsData.requests?.averageResponseTime || 0,
        p95ResponseTime: metricsData.requests?.p95ResponseTime || 0,
        p99ResponseTime: metricsData.requests?.p99ResponseTime || 0
      },
      models: {
        totalRequests: metricsData.models?.totalRequests || 0,
        activeModels: metricsData.models?.activeModels || 0,
        averageTokensPerRequest: metricsData.models?.averageTokensPerRequest || 0,
        totalTokensProcessed: metricsData.models?.totalTokensProcessed || 0
      },
      system: {
        cpuUsage: metricsData.system?.cpuUsage || 0,
        memoryUsage: metricsData.system?.memoryUsage || 0,
        diskUsage: metricsData.system?.diskUsage || 0,
        networkIn: metricsData.system?.networkIn || 0,
        networkOut: metricsData.system?.networkOut || 0,
        uptime: metricsData.system?.uptime || 0
      },
      errors: {
        total: metricsData.errors?.total || 0,
        rate: metricsData.errors?.rate || 0,
        byType: metricsData.errors?.byType || {},
        recentErrors: metricsData.errors?.recent || []
      },
      timeSeries: metricsData.timeSeries || [],
      timeRange: timeRange as string,
      granularity: granularity as string,
      lastUpdated: new Date().toISOString(),
      endpoint: `${aiGatewayUrl}/api/v1/metrics`
    };
    
    return res.status(200).json(formattedMetrics);
  } catch (error) {
    console.error('Error fetching AI Gateway metrics:', error);
    
    // Return a graceful error response with mock data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout');
    
    // Generate mock metrics data for development
    const now = Date.now();
    const timeRange = (req.query.timeRange as string) || '1h';
    const granularity = (req.query.granularity as string) || '5m';
    
    // Generate time series data points
    const dataPoints = 12; // 12 points for 1 hour with 5-minute granularity
    const timeSeries = Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = new Date(now - (dataPoints - i - 1) * 5 * 60 * 1000);
      return {
        timestamp: timestamp.toISOString(),
        requests: Math.floor(Math.random() * 50) + 10,
        responseTime: Math.floor(Math.random() * 500) + 200,
        errors: Math.floor(Math.random() * 5),
        cpuUsage: Math.floor(Math.random() * 30) + 20,
        memoryUsage: Math.floor(Math.random() * 40) + 30,
        activeModels: 3
      };
    });
    
    const mockMetrics = {
      requests: {
        total: 1247,
        successful: 1189,
        failed: 58,
        rate: 2.3, // requests per second
        averageResponseTime: 342,
        p95ResponseTime: 890,
        p99ResponseTime: 1250
      },
      models: {
        totalRequests: 1247,
        activeModels: 3,
        averageTokensPerRequest: 156,
        totalTokensProcessed: 194532
      },
      system: {
        cpuUsage: 23.5,
        memoryUsage: 67.2,
        diskUsage: 45.8,
        networkIn: 1.2, // MB/s
        networkOut: 0.8, // MB/s
        uptime: 18000 // seconds
      },
      errors: {
        total: 58,
        rate: 0.05, // errors per second
        byType: {
          'timeout': 23,
          'rate_limit': 18,
          'model_error': 12,
          'auth_error': 5
        },
        recentErrors: [
          {
            timestamp: new Date(now - 300000).toISOString(),
            type: 'timeout',
            message: 'Request timeout after 30s',
            model: 'gpt-4'
          },
          {
            timestamp: new Date(now - 600000).toISOString(),
            type: 'rate_limit',
            message: 'Rate limit exceeded',
            model: 'claude-3'
          }
        ]
      },
      timeSeries,
      timeRange,
      granularity,
      lastUpdated: new Date().toISOString(),
      endpoint: `${process.env.AI_GATEWAY_URL || 'http://localhost:7777'}/api/v1/metrics`,
      error: 'Failed to fetch AI Gateway metrics',
      message: errorMessage,
      usingMockData: true,
      connectionError: isConnectionError
    };
    
    return res.status(isConnectionError ? 503 : 500).json(mockMetrics);
  }
}

export default async function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  // Validate the token
  const isValidToken = await validateToken(token);
  
  if (!isValidToken && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return handler(req, res);
}
