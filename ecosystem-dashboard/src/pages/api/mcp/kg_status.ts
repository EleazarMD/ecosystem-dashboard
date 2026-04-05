import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';
import { KGMCPClient, MCPError } from '@/lib/kg-mcp-client';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';
import { v4 as uuidv4 } from 'uuid';

/**
 * Knowledge Graph status API endpoint
 * 
 * This API checks the connection status to the Knowledge Graph service
 * and returns basic metrics about the knowledge graph.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      code: 'METHOD_NOT_ALLOWED' 
    });
  }

  // Generate a unique request ID for tracking
  const requestId = uuidv4();

  try {
    // Start monitoring the operation
    kgMCPMonitoring.startOperation('kg_status_check', requestId);
    
    // Perform security audit on the operation
    KGMCPSecurity.auditOperation('kg_status_check', {
      requestId,
      source: 'api_endpoint'
    });

    logger.info('Checking Knowledge Graph status', { requestId });
    
    // Create a KGMCPClient instance with default configuration
    const client = new KGMCPClient();
    
    const startTime = Date.now();
    
    // Simple query to test connection and get basic stats
    const result = await client.queryKnowledgeGraph(`
      MATCH (n) 
      RETURN 
        count(n) as nodeCount, 
        count(labels(n)) as labelCount
    `);
    
    // Additional queries could be done in parallel for more comprehensive status

    const duration = Date.now() - startTime;
    
    // Get operational metrics
    const metrics = kgMCPMonitoring.getMetrics();
    
    // Complete the monitoring operation successfully
    kgMCPMonitoring.completeOperation(requestId, 'success');
    
    // Log successful completion with metrics
    logger.info('Knowledge Graph status check completed successfully', {
      requestId,
      duration,
      metrics: {
        operationCount: metrics.operationCount,
        errorRate: metrics.errorRate,
        averageDuration: metrics.averageDuration
      }
    });
    
    // Return status with metrics
    return res.status(200).json({
      status: 'available',
      requestId,
      response_time_ms: duration,
      metrics: {
        node_count: result?.results?.[0]?.nodeCount || 0,
        label_count: result?.results?.[0]?.labelCount || 0
      },
      client_metrics: {
        operations: metrics.operationCount,
        error_rate: metrics.errorRate,
        average_duration_ms: Math.round(metrics.averageDuration)
      },
      security: {
        gateway_enabled: KGMCPSecurity.isGatewayEnabled(),
        protocol: 'MCP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Generate a request ID if not already available
    const requestId = error.requestId || uuidv4();
    
    // Complete monitoring operation with error
    kgMCPMonitoring.completeOperation(
      requestId,
      'error',
      { code: error.code || 'STATUS_CHECK_ERROR', message: error.message }
    );
    
    logger.error(`Error checking Knowledge Graph status: ${error.message}`, {
      requestId,
      code: error.code,
      stack: error.stack
    });
    
    return res.status(error.statusCode || 500).json({
      status: 'error',
      error: error.message,
      code: error.code || 'STATUS_CHECK_ERROR',
      requestId
    });
  }
}
