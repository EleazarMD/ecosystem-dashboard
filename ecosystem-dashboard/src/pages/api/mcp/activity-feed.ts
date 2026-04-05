import { NextApiRequest, NextApiResponse } from 'next';
import logger from '@/lib/logger';
import { KGMCPSecurity } from '@/lib/kg-mcp-security';
import kgMCPMonitoring from '@/lib/kg-mcp-monitoring';
import { v4 as uuidv4 } from 'uuid';

interface ActivityItem {
  id: string;
  timestamp: string;
  type: string;
  category: string;
  title: string;
  description: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
  metadata?: Record<string, any>;
}

/**
 * API handler for retrieving recent activity updates from Knowledge Graph MCP
 * Provides recent operations and changes to the knowledge graph
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
      endpoint: 'get_recent_updates',
      method: req.method,
      headers: req.headers,
      params: req.query,
      body: req.body
    });

    if (!securityResult.allowed) {
      logger.warn(`[KG-MCP-API] Security check failed: ${securityResult.reason}`, {
        requestId,
        endpoint: 'get_recent_updates',
        security: securityResult
      });
      return res.status(403).json({
        error: 'Security check failed',
        code: 'SECURITY_CHECK_FAILED',
        details: securityResult.reason
      });
    }

    // Start monitoring
    const operation = kgMCPMonitoring.startOperation('get_recent_updates', requestId);

    // Get active operations from monitoring
    const activeOperations = kgMCPMonitoring.getActiveOperations();
    
    // Get operation metrics
    const metrics = kgMCPMonitoring.getMetrics();
    
    // Generate recent updates (in a real system, this would fetch from a database)
    // For now, we'll generate sample activity items based on our monitoring data
    const activities: ActivityItem[] = [];
    
    // Add recent error alerts if any
    if (metrics.errorRate > 0) {
      activities.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'alert',
        category: 'error',
        title: 'Knowledge Graph API Error Rate',
        description: `Error rate of ${metrics.errorRate.toFixed(2)}% detected in Knowledge Graph operations`,
        source: 'kg-mcp-monitoring',
        priority: metrics.errorRate > 10 ? 'high' : 'medium'
      });
    }
    
    // Add performance alerts if any
    if (metrics.alertCount > 0) {
      activities.push({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        type: 'alert',
        category: 'performance',
        title: 'Knowledge Graph Performance Alert',
        description: `${metrics.alertCount} operations exceeded performance thresholds`,
        source: 'kg-mcp-monitoring',
        priority: metrics.alertCount > 5 ? 'high' : 'medium'
      });
    }
    
    // Add active operations
    activeOperations.forEach((op, requestId) => {
      activities.push({
        id: requestId,
        timestamp: new Date(op.startTime).toISOString(),
        type: 'operation',
        category: 'in_progress',
        title: `Operation in progress: ${op.operation}`,
        description: `Request ${requestId.substring(0, 8)} - ${op.operation} started ${Math.floor((Date.now() - op.startTime) / 1000)} seconds ago`,
        source: 'kg-mcp',
        priority: 'low',
        status: 'in_progress',
        metadata: {
          operation: op.operation,
          requestId
        }
      });
    });
    
    // Add some sample Knowledge Graph updates
    const kgUpdates: ActivityItem[] = [
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        type: 'update',
        category: 'knowledge_graph',
        title: 'Knowledge Graph Updated',
        description: 'New nodes added to Knowledge Graph from documentation ingestion',
        source: 'kg-mcp-docs',
        priority: 'medium',
        status: 'completed',
        metadata: {
          nodesAdded: 12,
          relationshipsCreated: 28
        }
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        type: 'update',
        category: 'knowledge_graph',
        title: 'Knowledge Graph Analysis',
        description: 'Centrality analysis completed on Knowledge Graph',
        source: 'kg-mcp-analyze',
        priority: 'low',
        status: 'completed'
      }
    ];
    
    activities.push(...kgUpdates);
    
    // Sort by timestamp, newest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit to requested amount or default to 20
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const limitedActivities = activities.slice(0, limit);

    // Complete monitoring
    kgMCPMonitoring.completeOperation(requestId, 'success');
    
    // Return activities
    return res.status(200).json({
      requestId,
      timestamp: new Date().toISOString(),
      activities: limitedActivities,
      total: activities.length,
      returned: limitedActivities.length
    });
  } catch (error: any) {
    logger.error('[KG-MCP-API] Error getting recent updates', {
      requestId,
      error: error.message || error
    });
    
    // Complete monitoring with error
    kgMCPMonitoring.completeOperation(requestId, 'error', {
      code: 'GET_RECENT_UPDATES_ERROR',
      message: error.message || 'Unknown error'
    });
    
    return res.status(500).json({
      error: 'Failed to get recent updates',
      code: 'GET_RECENT_UPDATES_ERROR',
      message: error.message || 'Unknown error'
    });
  }
}
