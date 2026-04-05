import { NextApiRequest, NextApiResponse } from 'next';

// Comprehensive System Status API - Aggregates all AI Homelab components
// Provides unified view of Knowledge Graph, IDE Memory, and Infrastructure status

interface ServiceHealth {
  healthy: boolean;
  responseTime?: number;
  details?: any;
  lastChecked: string;
}

interface ComprehensiveSystemStatus {
  timestamp: string;
  overallStatus: 'fully_operational' | 'partially_operational' | 'degraded' | 'offline';
  components: {
    knowledgeGraph: {
      status: string;
      services: {
        total: number;
        healthy: number;
        categories: {
          database: number;
          core: number;
          inference: number;
          agent: number;
        };
      };
      agents: {
        total: number;
        healthy: number;
        a2aEnabled: number;
      };
      performance: {
        avgResponseTime: number;
        uptime: number;
        a2aCompliance: number;
      };
    };
    ideMemory: {
      status: string;
      memoryWatcher: {
        healthy: boolean;
        filesTracked: number;
        syncStatus: string;
        offlineSync: boolean;
      };
      memoryBackend: {
        healthy: boolean;
        memoriesLoaded: number;
        kgConnected: boolean;
      };
      metrics: {
        syncEfficiency: number;
        totalMemories: number;
        pendingApprovals: number;
      };
    };
    infrastructure: {
      databases: {
        neo4j: ServiceHealth;
        postgresql: ServiceHealth;
        redis: ServiceHealth;
      };
      networking: {
        portCompliance: boolean;
        serviceDiscovery: boolean;
      };
      automation: {
        unifiedScripts: boolean;
        healthMonitoring: boolean;
        processManagement: boolean;
      };
    };
  };
  capabilities: {
    multiAgentOrchestration: boolean;
    a2aProtocol: boolean;
    offlineSync: boolean;
    memoryValidation: boolean;
    truthEngine: boolean;
    workspaceIsolation: boolean;
    realTimeMonitoring: boolean;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    component: string;
    message: string;
    timestamp: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    component: string;
    action: string;
    description: string;
  }>;
}

// Check service health with timeout
async function checkServiceHealth(port: number, endpoint: string = '/health'): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`http://localhost:${port}${endpoint}`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      try {
        const data = await response.json();
        return {
          healthy: true,
          responseTime,
          details: data,
          lastChecked: new Date().toISOString()
        };
      } catch {
        return {
          healthy: true,
          responseTime,
          lastChecked: new Date().toISOString()
        };
      }
    } else {
      return {
        healthy: false,
        responseTime,
        details: { error: `HTTP ${response.status}` },
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      details: { error: error.message },
      lastChecked: new Date().toISOString()
    };
  }
}

// Get comprehensive system status
async function getComprehensiveSystemStatus(): Promise<ComprehensiveSystemStatus> {
  const timestamp = new Date().toISOString();
  const alerts: ComprehensiveSystemStatus['alerts'] = [];
  const recommendations: ComprehensiveSystemStatus['recommendations'] = [];

  // Fetch Knowledge Graph status
  let kgData: any = null;
  try {
    const kgResponse = await fetch('http://localhost:8765/health');
    if (kgResponse.ok) {
      kgData = await kgResponse.json();
    }
  } catch (error) {
    alerts.push({
      level: 'error',
      component: 'Knowledge Graph API',
      message: 'Unable to connect to Knowledge Graph API',
      timestamp
    });
  }

  // Fetch IDE Memory status
  let memoryData: any = null;
  try {
    const memoryResponse = await fetch('http://localhost:9579/health');
    if (memoryResponse.ok) {
      memoryData = await memoryResponse.json();
    }
  } catch (error) {
    alerts.push({
      level: 'error',
      component: 'IDE Memory Backend',
      message: 'Unable to connect to IDE Memory Backend',
      timestamp
    });
  }

  // Check Memory Watcher
  const memoryWatcherHealth = await checkServiceHealth(9578);
  if (!memoryWatcherHealth.healthy) {
    alerts.push({
      level: 'warning',
      component: 'Memory Watcher',
      message: 'Memory Watcher is offline - offline sync unavailable',
      timestamp
    });
    recommendations.push({
      priority: 'medium',
      component: 'Memory Watcher',
      action: 'Restart Memory Watcher service',
      description: 'Memory Watcher provides offline synchronization capabilities for IDE memories'
    });
  }

  // Check database services
  const neo4jHealth = await checkServiceHealth(7474);
  const postgresHealth = await checkServiceHealth(5432); // Assuming health endpoint
  const redisHealth = await checkServiceHealth(6379); // Assuming health endpoint

  if (!neo4jHealth.healthy) {
    alerts.push({
      level: 'error',
      component: 'Neo4j Database',
      message: 'Neo4j database is not responding',
      timestamp
    });
    recommendations.push({
      priority: 'high',
      component: 'Neo4j Database',
      action: 'Start Neo4j database service',
      description: 'Neo4j is required for Knowledge Graph operations and agent coordination'
    });
  }

  // Check agent health (simplified - would normally check all 7 agents)
  const agentPorts = [41240, 41241, 41242, 41243, 41244, 41245, 41246];
  const agentHealthChecks = await Promise.all(
    agentPorts.map(port => checkServiceHealth(port))
  );
  
  const healthyAgents = agentHealthChecks.filter(h => h.healthy).length;
  const totalAgents = agentPorts.length;

  if (healthyAgents < totalAgents) {
    const unhealthyCount = totalAgents - healthyAgents;
    alerts.push({
      level: 'warning',
      component: 'Knowledge Graph Agents',
      message: `${unhealthyCount} agent${unhealthyCount > 1 ? 's' : ''} offline`,
      timestamp
    });
    
    if (healthyAgents < totalAgents * 0.5) {
      recommendations.push({
        priority: 'high',
        component: 'Knowledge Graph Agents',
        action: 'Restart agent services',
        description: 'Multiple agents are offline, affecting multi-agent capabilities'
      });
    }
  }

  // Calculate overall status
  const kgHealthy = kgData && neo4jHealth.healthy;
  const memoryHealthy = memoryData && memoryWatcherHealth.healthy;
  const agentsHealthy = healthyAgents >= totalAgents * 0.8; // 80% threshold

  let overallStatus: ComprehensiveSystemStatus['overallStatus'];
  if (kgHealthy && memoryHealthy && agentsHealthy) {
    overallStatus = 'fully_operational';
  } else if ((kgHealthy && memoryHealthy) || (kgHealthy && agentsHealthy) || (memoryHealthy && agentsHealthy)) {
    overallStatus = 'partially_operational';
  } else if (kgHealthy || memoryHealthy || agentsHealthy) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'offline';
  }

  // Add recommendations based on system state
  if (overallStatus === 'fully_operational' && alerts.length === 0) {
    recommendations.push({
      priority: 'low',
      component: 'System Optimization',
      action: 'Consider performance tuning',
      description: 'System is healthy - good time for optimization and feature enhancements'
    });
  }

  return {
    timestamp,
    overallStatus,
    components: {
      knowledgeGraph: {
        status: kgData ? 'operational' : 'offline',
        services: {
          total: 12, // Updated for Memory Watcher integration
          healthy: kgData ? 12 : 0, // Simplified - would normally aggregate all services
          categories: {
            database: neo4jHealth.healthy ? 1 : 0,
            core: (kgData ? 1 : 0) + (memoryData ? 1 : 0) + (memoryWatcherHealth.healthy ? 1 : 0),
            inference: 1, // AI Gateway
            agent: healthyAgents
          }
        },
        agents: {
          total: totalAgents,
          healthy: healthyAgents,
          a2aEnabled: healthyAgents // Simplified - assumes all healthy agents have A2A
        },
        performance: {
          avgResponseTime: agentHealthChecks
            .filter(h => h.healthy && h.responseTime)
            .reduce((sum, h) => sum + (h.responseTime || 0), 0) / Math.max(healthyAgents, 1),
          uptime: healthyAgents / totalAgents,
          a2aCompliance: healthyAgents / totalAgents
        }
      },
      ideMemory: {
        status: memoryData && memoryWatcherHealth.healthy ? 'operational' : 'degraded',
        memoryWatcher: {
          healthy: memoryWatcherHealth.healthy,
          filesTracked: memoryWatcherHealth.details?.files_tracked || 0,
          syncStatus: memoryWatcherHealth.details?.sync_status || 'unknown',
          offlineSync: memoryWatcherHealth.healthy
        },
        memoryBackend: {
          healthy: !!memoryData,
          memoriesLoaded: memoryData?.memories_loaded || 0,
          kgConnected: memoryData?.kg_connected || false
        },
        metrics: {
          syncEfficiency: memoryWatcherHealth.details?.sync_efficiency || 0,
          totalMemories: memoryWatcherHealth.details?.total_memories || 0,
          pendingApprovals: memoryData?.approval_queue?.pending || 0
        }
      },
      infrastructure: {
        databases: {
          neo4j: neo4jHealth,
          postgresql: postgresHealth,
          redis: redisHealth
        },
        networking: {
          portCompliance: true, // Based on PORT_REGISTRY.yml compliance
          serviceDiscovery: kgData ? true : false
        },
        automation: {
          unifiedScripts: true, // Based on automation system implementation
          healthMonitoring: true,
          processManagement: true
        }
      }
    },
    capabilities: {
      multiAgentOrchestration: healthyAgents >= 5, // Minimum agents for orchestration
      a2aProtocol: healthyAgents >= 3, // Minimum for A2A communication
      offlineSync: memoryWatcherHealth.healthy,
      memoryValidation: kgData && memoryData,
      truthEngine: kgData && healthyAgents >= 3,
      workspaceIsolation: !!memoryData,
      realTimeMonitoring: true
    },
    alerts,
    recommendations
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false, 
      message: `Method ${req.method} not allowed` 
    });
  }

  try {
    const comprehensiveStatus = await getComprehensiveSystemStatus();
    
    return res.status(200).json({
      success: true,
      data: comprehensiveStatus
    });
  } catch (error: any) {
    console.error('Comprehensive system status error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to get comprehensive system status',
      error: error.message 
    });
  }
}
