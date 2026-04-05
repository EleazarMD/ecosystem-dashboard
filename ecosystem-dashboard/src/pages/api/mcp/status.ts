import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';
import { v4 as uuidv4 } from 'uuid';

/**
 * API handler for retrieving Knowledge Graph MCP system status
 * Provides operational metrics and health status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
  }

  const requestId = uuidv4();
  
  try {
    // Security audit
    const securityResult = KGMCPSecurity.auditRequest({
      requestId,
      endpoint: 'status',
      method: req.method,
      headers: req.headers,
      params: req.query,
      body: req.body
    });

    if (!securityResult.allowed) {
      logger.warn(`[KG-MCP-API] Security check failed: ${securityResult.reason}`, {
        requestId,
        endpoint: 'status',
        security: securityResult
      });
      return res.status(403).json({
        error: 'Security check failed',
        code: 'SECURITY_CHECK_FAILED',
        details: securityResult.reason
      });
    }

    // Start monitoring
    const operation = kgMCPMonitoring.startOperation('get_status', requestId);

    // Get metrics from monitoring service
    const metrics = kgMCPMonitoring.getMetrics();
    
    // System health check (modify these thresholds as needed)
    const health = {
      status: metrics.errorRate < 10 && metrics.alertCount === 0 ? 'healthy' : 'warning',
      lastUpdated: new Date().toISOString(),
      components: {
        knowledgeGraph: {
          status: metrics.errorRate < 5 ? 'healthy' : 'warning',
          metrics: {
            errorRate: metrics.errorRate,
            averageDuration: metrics.averageDuration
          }
        },
        mcp: {
          status: metrics.alertCount === 0 ? 'healthy' : 'warning',
          metrics: {
            activeOperations: metrics.activeOperations
          }
        },
        gateway: {
          status: KGMCPSecurity.isGatewayEnabled() ? 'enabled' : 'disabled'
        }
      },
      alerts: metrics.alertCount > 0 ? [
        {
          level: 'warning',
          message: `${metrics.alertCount} operations exceeded performance thresholds`
        }
      ] : []
    };

    // Get additional system information
    const systemInfo = {
      version: process.env.NEXT_PUBLIC_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    // Complete monitoring
    kgMCPMonitoring.completeOperation(requestId, 'success');
    
    // Return status response
    return res.status(200).json({
      requestId,
      timestamp: new Date().toISOString(),
      health,
      metrics,
      systemInfo
    });
  } catch (error: any) {
    logger.error('[KG-MCP-API] Error getting system status', {
      requestId,
      error: error.message || error
    });
    
    // Complete monitoring with error
    kgMCPMonitoring.completeOperation(requestId, 'error', {
      code: 'STATUS_ERROR',
      message: error.message || 'Unknown error'
    });
    
    return res.status(500).json({
      error: 'Failed to get system status',
      code: 'STATUS_ERROR',
      message: error.message || 'Unknown error'
    });
  }
}
