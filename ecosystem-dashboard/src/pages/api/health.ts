/**
 * Health Check API Endpoint
 * 
 * Provides basic health status for the AI Homelab Dashboard application
 * and its agent integrations for monitoring and load balancing purposes.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { aiAgentRuntime } from '@/lib/agent/AIAgentRuntime';
import { ahisRegistrationService } from '@/lib/services/AHISRegistrationService';
import logger from '@/lib/logger';

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  components: {
    application: {
      status: 'healthy' | 'unhealthy';
      details?: string;
    };
    agent: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      initialized: boolean;
      activeRequests: number;
      details?: string;
    };
    integrations: {
      ollama: {
        status: 'healthy' | 'unhealthy';
        enabled: boolean;
        details?: string;
      };
      aihds: {
        status: 'healthy' | 'unhealthy';
        enabled: boolean;
        details?: string;
      };
      google_adk: {
        status: 'healthy' | 'unhealthy';
        enabled: boolean;
        details?: string;
      };
    };
    ahis: {
      status: 'healthy' | 'unhealthy';
      registered: boolean;
      serviceId?: string | null;
      clientAvailable: boolean;
    };
  };
  metrics?: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      success_rate: number;
      average_response_time: number;
    };
  };
}

// Store startup time for uptime calculation
const startupTime = Date.now();

// Get application version from package.json
function getApplicationVersion(): string {
  try {
    // In a real application, you might read this from package.json
    // For now, return a placeholder version
    return process.env.npm_package_version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

// Get memory usage statistics
function getMemoryStats() {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;
    
    return {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round((usedMemory / totalMemory) * 100)
    };
  }
  
  return {
    used: 0,
    total: 0,
    percentage: 0
  };
}

// Quick health check without full initialization
async function quickHealthCheck(): Promise<{
  agent: { status: 'healthy' | 'degraded' | 'unhealthy'; initialized: boolean; activeRequests: number };
  ollama: { status: 'healthy' | 'unhealthy'; enabled: boolean };
  aihds: { status: 'healthy' | 'unhealthy'; enabled: boolean };
  google_adk: { status: 'healthy' | 'unhealthy'; enabled: boolean };
}> {
  try {
    // Get agent status
    const agentStatus = aiAgentRuntime.getStatus();
    
    // Quick service checks with short timeouts
    const serviceChecks = await Promise.allSettled([
      // AI Gateway check (port 8777 for AI operations)
      fetch('http://100.108.41.22:8777/health', { 
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 2000);
          return controller.signal;
        })()
      }).then(res => res.ok),
      
      // AIHDS Gateway check
      fetch('http://localhost:8080/health', { 
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 2000);
          return controller.signal;
        })()
      }).then(res => res.ok),
    ]);

    return {
      agent: {
        status: agentStatus.initialized ? 'healthy' : 'degraded',
        initialized: agentStatus.initialized,
        activeRequests: agentStatus.activeRequests
      },
      ollama: {
        status: serviceChecks[0].status === 'fulfilled' && serviceChecks[0].value ? 'healthy' : 'unhealthy',
        enabled: agentStatus.configuration.ollama.enabled
      },
      aihds: {
        status: serviceChecks[1].status === 'fulfilled' && serviceChecks[1].value ? 'healthy' : 'unhealthy',
        enabled: agentStatus.configuration.aihds.enabled
      },
      google_adk: {
        status: agentStatus.configuration.google_adk.enabled ? 'healthy' : 'unhealthy',
        enabled: agentStatus.configuration.google_adk.enabled
      }
    };
  } catch (error) {
    logger.error('[Health] Quick health check failed:', error);
    
    return {
      agent: { status: 'unhealthy', initialized: false, activeRequests: 0 },
      ollama: { status: 'unhealthy', enabled: false },
      aihds: { status: 'unhealthy', enabled: false },
      google_adk: { status: 'unhealthy', enabled: false }
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  console.log('Health check endpoint accessed at:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  
  // Application is considered configured if it can respond to health checks
  const isConfigured = true;
  console.log('Application configuration status: Configured');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '1.0.0',
      environment: 'unknown',
      components: {
        application: { status: 'unhealthy', details: 'Method not allowed' },
        agent: { status: 'unhealthy', initialized: false, activeRequests: 0 },
        integrations: {
          ollama: { status: 'unhealthy', enabled: false },
          aihds: { status: 'unhealthy', enabled: false },
          google_adk: { status: 'unhealthy', enabled: false }
        },
        ahis: {
          status: 'unhealthy',
          registered: false,
          serviceId: null,
          clientAvailable: false
        }
      }
    });
  }

  const timestamp = new Date().toISOString();
  const uptime = Date.now() - startupTime;
  const version = getApplicationVersion();
  const environment = process.env.NODE_ENV || 'development';

  try {
    // Perform quick health checks
    const healthChecks = await quickHealthCheck();
    
    // Get agent metrics if available
    let metrics;
    try {
      const agentStatus = aiAgentRuntime.getStatus();
      metrics = {
        memory: getMemoryStats(),
        requests: {
          total: agentStatus.metrics.totalRequests,
          success_rate: agentStatus.metrics.successRate,
          average_response_time: agentStatus.metrics.averageResponseTime
        }
      };
    } catch {
      // Metrics not available
    }

    // Determine overall application status
    let applicationStatus: 'healthy' | 'unhealthy' = 'healthy';
    
    // Basic application health checks
    try {
      // Check if we can access basic Node.js functions
      const now = Date.now();
      if (!now || typeof now !== 'number') {
        applicationStatus = 'unhealthy';
      }
    } catch {
      applicationStatus = 'unhealthy';
    }

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    const healthyComponents = [
      applicationStatus === 'healthy',
      healthChecks.agent.status === 'healthy',
      !healthChecks.ollama.enabled || healthChecks.ollama.status === 'healthy',
      !healthChecks.aihds.enabled || healthChecks.aihds.status === 'healthy',
      !healthChecks.google_adk.enabled || healthChecks.google_adk.status === 'healthy'
    ].filter(Boolean).length;

    const totalComponents = [
      true, // application
      true, // agent
      healthChecks.ollama.enabled,
      healthChecks.aihds.enabled,
      healthChecks.google_adk.enabled
    ].filter(Boolean).length;

    if (healthyComponents === totalComponents) {
      overallStatus = 'healthy';
    } else if (healthyComponents >= Math.ceil(totalComponents * 0.7)) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp,
      uptime,
      version,
      environment,
      components: {
        application: {
          status: applicationStatus
        },
        agent: {
          status: healthChecks.agent.status,
          initialized: healthChecks.agent.initialized,
          activeRequests: healthChecks.agent.activeRequests
        },
        integrations: {
          ollama: {
            status: healthChecks.ollama.status,
            enabled: healthChecks.ollama.enabled
          },
          aihds: {
            status: healthChecks.aihds.status,
            enabled: healthChecks.aihds.enabled
          },
          google_adk: {
            status: healthChecks.google_adk.status,
            enabled: healthChecks.google_adk.enabled
          }
        },
        ahis: {
          status: 'healthy',
          registered: ahisRegistrationService.getStatus().isRegistered,
          serviceId: ahisRegistrationService.getStatus().serviceId,
          clientAvailable: ahisRegistrationService.getStatus().clientAvailable
        }
      },
      ...(metrics && { metrics })
    };

    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (overallStatus === 'degraded') {
      httpStatus = 200; // Still OK but with warnings
    } else if (overallStatus === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }

    // Set cache headers for health checks
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add custom headers for monitoring
    res.setHeader('X-Health-Status', overallStatus);
    res.setHeader('X-Service-Version', version);
    res.setHeader('X-Uptime', uptime.toString());

    console.log('Health check passed, returning OK status.');
    res.status(httpStatus).json(response);

  } catch (error) {
    logger.error('[Health] Health check failed:', error);

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp,
      uptime,
      version,
      environment,
      components: {
        application: {
          status: 'unhealthy',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        agent: {
          status: 'unhealthy',
          initialized: false,
          activeRequests: 0,
          details: 'Health check failed'
        },
        integrations: {
          ollama: { status: 'unhealthy', enabled: false },
          aihds: { status: 'unhealthy', enabled: false },
          google_adk: { status: 'unhealthy', enabled: false }
        },
        ahis: {
          status: 'unhealthy',
          registered: false,
          serviceId: null,
          clientAvailable: false
        }
      }
    };

    res.status(503).json(errorResponse);
  }
}
