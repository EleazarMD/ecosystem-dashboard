/**
 * Agent Status API Endpoint
 * 
 * Provides comprehensive status information about the AI Agent Runtime
 * including capabilities, metrics, health status, and configuration.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { aiAgentRuntime } from '@/lib/agent/AIAgentRuntime';
import logger from '@/lib/logger';

interface AgentStatusResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  initialized: boolean;
  capabilities: {
    naturalLanguageProcessing: boolean;
    speechRecognition: boolean;
    speechSynthesis: boolean;
    systemMonitoring: boolean;
    serviceManagement: boolean;
    proactiveInsights: boolean;
    multimodalAnalysis: boolean;
    conversationalAI: boolean;
  };
  services: {
    [key: string]: boolean;
  };
  metrics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    averageConfidence: number;
    capabilityUsage: Record<string, number>;
    errorRate: number;
  };
  configuration: {
    google_adk: {
      enabled: boolean;
      configured: boolean;
    };
    aihds: {
      enabled: boolean;
      gateway_url: string;
    };
    ollama: {
      enabled: boolean;
      base_url: string;
      model: string;
    };
    proactive: {
      enabled: boolean;
      auto_resolution_enabled: boolean;
    };
  };
  uptime: number;
  lastHealthCheck: string;
  activeRequests: number;
  environment: 'development' | 'staging' | 'production';
}

// Store startup time for uptime calculation
const startupTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentStatusResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    logger.info('[API] Agent status requested');

    // Auto-initialize if not already initialized
    const agentStatus = aiAgentRuntime.getStatus();
    if (!agentStatus.initialized) {
      logger.info('[API] Auto-initializing AI Agent Runtime...');
      try {
        await aiAgentRuntime.initialize();
      } catch (initError) {
        logger.warn('[API] Auto-initialization failed:', initError);
      }
    }
    
    // Get health check results
    const healthCheck = await aiAgentRuntime.getHealthCheck();

    // Calculate uptime
    const uptime = Date.now() - startupTime;

    // Determine environment
    const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';

    // Check configuration status
    const configuration = {
      google_adk: {
        enabled: agentStatus.configuration.google_adk.enabled,
        configured: !!(
          process.env.GOOGLE_ADK_PROJECT_ID && 
          process.env.GOOGLE_ADK_CLIENT_ID &&
          !process.env.GOOGLE_ADK_PROJECT_ID.includes('your-') &&
          !process.env.GOOGLE_ADK_CLIENT_ID.includes('your-')
        )
      },
      aihds: {
        enabled: agentStatus.configuration.aihds.enabled,
        gateway_url: agentStatus.configuration.aihds.gateway_url
      },
      ollama: {
        enabled: agentStatus.configuration.ollama.enabled,
        base_url: agentStatus.configuration.ollama.base_url,
        model: agentStatus.configuration.ollama.model
      },
      proactive: {
        enabled: agentStatus.configuration.proactive.enabled,
        auto_resolution_enabled: agentStatus.configuration.proactive.auto_resolution_enabled
      }
    };

    const response: AgentStatusResponse = {
      status: healthCheck.status,
      initialized: agentStatus.initialized,
      capabilities: agentStatus.capabilities,
      services: healthCheck.services,
      metrics: agentStatus.metrics,
      configuration,
      uptime,
      lastHealthCheck: new Date().toISOString(),
      activeRequests: agentStatus.activeRequests,
      environment
    };

    // Set appropriate cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json(response);

  } catch (error) {
    logger.error('[API] Failed to get agent status:', error);
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
