import { NextApiRequest, NextApiResponse } from 'next';
import ConnectionPool from '../../../lib/connection-pool';
import PerformanceMonitor from '../../../lib/performance-monitor';

// IDE Memory Backend Configuration - use k3d cluster services
const KG_MCP_URL = process.env.KG_MCP_URL || 'http://localhost:8766';
const AHIS_URL = process.env.AHIS_BASE_URL || 'http://localhost:8888';
const REQUEST_TIMEOUT = 5000; // 5 seconds for health checks

// Use connection pool for efficient HTTP client management
const connectionPool = ConnectionPool.getInstance();
const performanceMonitor = PerformanceMonitor.getInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Get pooled HTTP clients
    const kgMcpClient = connectionPool.getClient(KG_MCP_URL, REQUEST_TIMEOUT);
    const ahisClient = connectionPool.getClient(AHIS_URL, REQUEST_TIMEOUT);
    
    // Check both KG-MCP and AHIS services health
    const [kgResponse, ahisResponse] = await Promise.allSettled([
      kgMcpClient.get('/health'),
      ahisClient.get('/health')
    ]);
    
    // Enhance health data with additional metrics
    const healthData = {
      status: 'healthy',
      services: {
        knowledge_graph: {
          status: kgResponse.status === 'fulfilled' ? 'connected' : 'disconnected',
          url: KG_MCP_URL,
          data: kgResponse.status === 'fulfilled' ? kgResponse.value.data : null
        },
        ahis: {
          status: ahisResponse.status === 'fulfilled' ? 'connected' : 'disconnected', 
          url: AHIS_URL,
          data: ahisResponse.status === 'fulfilled' ? ahisResponse.value.data : null
        }
      },
      dashboard_integration: {
        status: 'connected',
        api_version: '2.0.0',
        last_check: new Date().toISOString(),
        endpoints: [
          '/api/ide-memory/memories',
          '/api/ide-memory/health',
          '/api/ide-memory/stats',
          '/api/ide-memory/validate'
        ]
      },
      connectivity: {
        kg_mcp_url: KG_MCP_URL,
        ahis_url: AHIS_URL,
        timeout_ms: REQUEST_TIMEOUT
      }
    };

    // Track performance and log memory warnings
    performanceMonitor.trackRequest(startTime);
    performanceMonitor.logMemoryWarning();

    res.status(200).json(healthData);
  } catch (error: any) {
    console.error('IDE Memory Health Check Error:', error);
    
    // Track failed request
    performanceMonitor.trackRequest(startTime);
    
    // Return error response with fallback data
    res.status(503).json({
      status: 'error',
      error: 'Service health check failed',
      message: error.message,
      services: {
        knowledge_graph: { status: 'error', url: KG_MCP_URL },
        ahis: { status: 'error', url: AHIS_URL }
      },
      dashboard_integration: {
        status: 'disconnected',
        api_version: '2.0.0',
        last_check: new Date().toISOString(),
        endpoints: ['/api/ide-memory/memories', '/api/ide-memory/health', '/api/ide-memory/stats', '/api/ide-memory/validate']
      },
      connectivity: {
        kg_mcp_url: KG_MCP_URL,
        ahis_url: AHIS_URL,
        timeout_ms: REQUEST_TIMEOUT
      },
      performance: performanceMonitor.getMetrics()
    });
  }
}
