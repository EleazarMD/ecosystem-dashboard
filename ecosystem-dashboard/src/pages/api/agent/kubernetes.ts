/**
 * Kubernetes Agent API Endpoint
 * 
 * Dedicated endpoint for Kubernetes infrastructure management through the AI Agent.
 * Provides direct access to Kubernetes-specific capabilities including cluster management,
 * optimization recommendations, and intelligent operations.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { aiAgentRuntime, AgentRequest } from '@/lib/agent/AIAgentRuntime';
import logger from '@/lib/logger';

interface KubernetesAgentRequest {
  action: 'query' | 'command' | 'status' | 'optimize' | 'health';
  content: string;
  clusterId?: string;
  context?: {
    userActivity?: 'low' | 'medium' | 'high';
    override?: boolean;
    currentPage?: string;
    systemState?: Record<string, any>;
  };
  sessionId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

interface KubernetesAgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  response?: {
    id: string;
    type: string;
    content: string;
    confidence: number;
    actions?: any[];
    followUp?: string[];
    executionTime: number;
    timestamp: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KubernetesAgentResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const kubernetesRequest: KubernetesAgentRequest = req.body;

    // Validate request
    if (!kubernetesRequest.action || !kubernetesRequest.content) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: action and content'
      });
      return;
    }

    logger.info(`[K8sAgent API] Processing ${kubernetesRequest.action} request`);

    // Create agent request with Kubernetes context
    const agentRequest: AgentRequest = {
      id: `k8s_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: kubernetesRequest.action === 'command' ? 'command' : 'query',
      content: kubernetesRequest.content,
      context: {
        currentPage: 'kubernetes-infrastructure',
        systemState: {
          kubernetesContext: true,
          clusterId: kubernetesRequest.clusterId,
          ...kubernetesRequest.context?.systemState
        },
        recentActions: [],
        userPreferences: {},
        ...kubernetesRequest.context
      },
      sessionId: kubernetesRequest.sessionId || `k8s_session_${Date.now()}`,
      priority: kubernetesRequest.priority || 'medium'
    };

    // Process request through AI Agent Runtime
    const agentResponse = await aiAgentRuntime.processRequest(agentRequest);

    // Handle special actions
    let additionalData = {};
    
    if (kubernetesRequest.action === 'status') {
      // Get comprehensive Kubernetes status
      additionalData = await getKubernetesStatus();
    } else if (kubernetesRequest.action === 'health') {
      // Get Kubernetes plugin health
      additionalData = await getKubernetesHealth();
    } else if (kubernetesRequest.action === 'optimize') {
      // Get optimization recommendations
      additionalData = await getOptimizationRecommendations();
    }

    res.status(200).json({
      success: true,
      response: {
        id: agentResponse.id,
        type: agentResponse.type,
        content: typeof agentResponse.content === 'string' ? agentResponse.content : JSON.stringify(agentResponse.content),
        confidence: agentResponse.confidence,
        actions: agentResponse.actions,
        followUp: agentResponse.followUp,
        executionTime: agentResponse.executionTime,
        timestamp: agentResponse.timestamp.toISOString()
      },
      data: additionalData
    });

  } catch (error) {
    logger.error('[K8sAgent API] Request processing failed:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

/**
 * Get comprehensive Kubernetes status
 */
async function getKubernetesStatus() {
  try {
    // This would typically call the Kubernetes operator directly
    // For now, return mock status data
    return {
      clusters: [
        {
          clusterId: 'production',
          status: 'running',
          health: 'healthy',
          nodes: 3,
          pods: 12,
          services: 8,
          lastUpdated: new Date().toISOString()
        },
        {
          clusterId: 'development',
          status: 'running',
          health: 'healthy',
          nodes: 1,
          pods: 5,
          services: 3,
          lastUpdated: new Date().toISOString()
        }
      ],
      summary: {
        totalClusters: 2,
        healthyClusters: 2,
        totalPods: 17,
        totalServices: 11
      }
    };
  } catch (error) {
    logger.error('[K8sAgent API] Failed to get Kubernetes status:', error);
    return { error: 'Failed to retrieve Kubernetes status' };
  }
}

/**
 * Get Kubernetes plugin health information
 */
async function getKubernetesHealth() {
  try {
    const agentStatus = aiAgentRuntime.getStatus();
    const healthCheck = await aiAgentRuntime.getHealthCheck();
    
    return {
      agentInitialized: agentStatus.initialized,
      kubernetesCapabilities: {
        kubernetesManagement: agentStatus.capabilities.kubernetesManagement,
        intelligentInfrastructure: agentStatus.capabilities.intelligentInfrastructure
      },
      services: healthCheck.services,
      overallHealth: healthCheck.status,
      activeRequests: agentStatus.activeRequests,
      metrics: agentStatus.metrics
    };
  } catch (error) {
    logger.error('[K8sAgent API] Failed to get health information:', error);
    return { error: 'Failed to retrieve health information' };
  }
}

/**
 * Get optimization recommendations
 */
async function getOptimizationRecommendations() {
  try {
    // This would typically analyze current cluster state and provide recommendations
    // For now, return mock optimization data
    return {
      recommendations: [
        {
          type: 'cost_optimization',
          severity: 'medium',
          title: 'Underutilized Resources Detected',
          description: 'Development cluster is running at 23% capacity',
          estimatedSavings: '$45/month',
          confidence: 0.85,
          actions: [
            {
              action: 'scale_down',
              target: 'development',
              description: 'Scale down development cluster to save costs'
            }
          ]
        },
        {
          type: 'performance_optimization',
          severity: 'low',
          title: 'Resource Allocation Optimization',
          description: 'Production cluster memory allocation can be optimized',
          estimatedImpact: '15% performance improvement',
          confidence: 0.72,
          actions: [
            {
              action: 'rebalance_resources',
              target: 'production',
              description: 'Rebalance memory allocation across nodes'
            }
          ]
        }
      ],
      summary: {
        totalRecommendations: 2,
        potentialSavings: '$45/month',
        performanceGains: '15%',
        confidenceScore: 0.79
      }
    };
  } catch (error) {
    logger.error('[K8sAgent API] Failed to get optimization recommendations:', error);
    return { error: 'Failed to retrieve optimization recommendations' };
  }
}
