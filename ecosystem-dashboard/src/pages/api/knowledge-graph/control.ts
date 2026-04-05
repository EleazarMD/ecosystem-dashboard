import { NextApiRequest, NextApiResponse } from 'next';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

// Knowledge Graph project path
const KG_PROJECT_PATH = '/Users/eleazar/Projects/AIHomelab/core/knowledge-graph';
const SCRIPTS_PATH = path.join(KG_PROJECT_PATH, 'scripts');
const LOGS_PATH = path.join(KG_PROJECT_PATH, 'logs');
const PIDS_PATH = path.join(KG_PROJECT_PATH, 'pids');

// Service configuration - Updated with Memory Watcher integration
const SERVICES = {
  'neo4j': { port: 7474, name: 'Neo4j Database', category: 'database', healthEndpoint: '/health' },
  'kg-api': { port: 8765, name: 'Knowledge Graph API', category: 'core', healthEndpoint: '/health' },
  'memory-backend': { port: 9579, name: 'IDE Memory Backend', category: 'core', healthEndpoint: '/health' },
  'memory-watcher': { port: 9578, name: 'IDE Memory Watcher', category: 'core', healthEndpoint: '/health' },
  'ai-gateway': { port: 8777, name: 'AI Gateway', category: 'inference', healthEndpoint: '/health' },
  'orchestrator': { port: 41240, name: 'Orchestrator Agent', category: 'agent', healthEndpoint: '/health' },
  'graph-query': { port: 41241, name: 'Graph Query Agent', category: 'agent', healthEndpoint: '/health' },
  'vector-search': { port: 41242, name: 'Vector Search Agent', category: 'agent', healthEndpoint: '/health' },
  'documentation': { port: 41243, name: 'Documentation Agent', category: 'agent', healthEndpoint: '/health' },
  'reasoning': { port: 41244, name: 'Reasoning Agent', category: 'agent', healthEndpoint: '/health' },
  'memory': { port: 41245, name: 'Enhanced Memory Agent', category: 'agent', healthEndpoint: '/health' },
  'integration': { port: 41246, name: 'Integration Agent', category: 'agent', healthEndpoint: '/health' }
};

// Enhanced service health check with detailed information
async function checkServiceHealth(port: number, healthEndpoint: string = '/health'): Promise<{
  healthy: boolean;
  status?: string;
  details?: any;
  responseTime?: number;
  a2aEnabled?: boolean;
}> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`http://localhost:${port}${healthEndpoint}`, {
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
          status: data.status || 'ok',
          details: data,
          responseTime,
          a2aEnabled: data.a2a_enabled || false
        };
      } catch {
        return {
          healthy: true,
          status: 'ok',
          responseTime
        };
      }
    } else {
      return {
        healthy: false,
        status: `HTTP ${response.status}`,
        responseTime
      };
    }
  } catch (error: any) {
    return {
      healthy: false,
      status: error.message || 'Connection failed',
      responseTime: Date.now() - startTime
    };
  }
}

// Check A2A protocol capabilities for agents
async function checkA2ACapabilities(port: number): Promise<{
  enabled: boolean;
  capabilities?: string[];
  messageTypes?: string[];
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`http://localhost:${port}/a2a/capabilities`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      return {
        enabled: true,
        capabilities: data.capabilities || [],
        messageTypes: data.messageTypes || []
      };
    }
  } catch (error) {
    // A2A not available
  }
  
  return { enabled: false };
}

// Get comprehensive system status with enhanced monitoring
async function getSystemStatus() {
  const serviceStatuses = await Promise.all(
    Object.entries(SERVICES).map(async ([key, service]) => {
      const healthCheck = await checkServiceHealth(service.port, service.healthEndpoint);
      
      // Check A2A capabilities for agents
      let a2aInfo = null;
      if (service.category === 'agent') {
        a2aInfo = await checkA2ACapabilities(service.port);
      }
      
      return {
        key,
        name: service.name,
        port: service.port,
        category: service.category,
        status: healthCheck.healthy ? 'healthy' : 'stopped',
        healthy: healthCheck.healthy,
        responseTime: healthCheck.responseTime,
        details: healthCheck.details,
        a2a: a2aInfo,
        lastChecked: new Date().toISOString()
      };
    })
  );

  const healthyCount = serviceStatuses.filter(s => s.healthy).length;
  const totalCount = serviceStatuses.length;
  const a2aEnabledCount = serviceStatuses.filter(s => s.a2a?.enabled).length;
  const agentCount = serviceStatuses.filter(s => s.category === 'agent').length;
  
  // Calculate average response time for healthy services
  const healthyServices = serviceStatuses.filter(s => s.healthy && s.responseTime);
  const avgResponseTime = healthyServices.length > 0 
    ? Math.round(healthyServices.reduce((sum, s) => sum + (s.responseTime || 0), 0) / healthyServices.length)
    : 0;

  // Group services by category
  const servicesByCategory = serviceStatuses.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, typeof serviceStatuses>);
  
  return {
    services: serviceStatuses,
    servicesByCategory,
    summary: {
      healthy: healthyCount,
      total: totalCount,
      status: healthyCount === totalCount ? 'fully_operational' : 
              healthyCount > 0 ? 'partially_operational' : 'stopped',
      a2aEnabled: a2aEnabledCount,
      agentCount,
      avgResponseTime,
      lastUpdate: new Date().toISOString()
    },
    metrics: {
      uptime: healthyCount / totalCount,
      a2aCompliance: agentCount > 0 ? a2aEnabledCount / agentCount : 0,
      performance: avgResponseTime < 1000 ? 'excellent' : avgResponseTime < 3000 ? 'good' : 'slow'
    }
  };
}

// Start Knowledge Graph system
async function startKnowledgeGraph(): Promise<{ success: boolean; message: string; logs?: string[] }> {
  try {
    const startScript = path.join(SCRIPTS_PATH, 'start-complete-system.sh');
    
    // Check if script exists
    if (!fs.existsSync(startScript)) {
      return {
        success: false,
        message: 'Start script not found. Please ensure the Knowledge Graph automation scripts are installed.'
      };
    }

    // Execute start script
    const { stdout, stderr } = await execAsync(`cd "${KG_PROJECT_PATH}" && ./scripts/start-complete-system.sh`, {
      timeout: 120000 // 2 minute timeout
    });

    return {
      success: true,
      message: 'Knowledge Graph system startup initiated successfully',
      logs: [stdout, stderr].filter(Boolean)
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to start Knowledge Graph system: ${error.message}`,
      logs: error.stdout ? [error.stdout, error.stderr].filter(Boolean) : undefined
    };
  }
}

// Stop Knowledge Graph system
async function stopKnowledgeGraph(): Promise<{ success: boolean; message: string; logs?: string[] }> {
  try {
    const stopScript = path.join(SCRIPTS_PATH, 'stop-complete-system.sh');
    
    // Check if script exists
    if (!fs.existsSync(stopScript)) {
      return {
        success: false,
        message: 'Stop script not found. Please ensure the Knowledge Graph automation scripts are installed.'
      };
    }

    // Execute stop script
    const { stdout, stderr } = await execAsync(`cd "${KG_PROJECT_PATH}" && ./scripts/stop-complete-system.sh`, {
      timeout: 60000 // 1 minute timeout
    });

    return {
      success: true,
      message: 'Knowledge Graph system shutdown completed successfully',
      logs: [stdout, stderr].filter(Boolean)
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to stop Knowledge Graph system: ${error.message}`,
      logs: error.stdout ? [error.stdout, error.stderr].filter(Boolean) : undefined
    };
  }
}

// Get system logs
async function getSystemLogs(service?: string, lines: number = 50) {
  try {
    const logs: { [key: string]: string } = {};
    
    if (service && SERVICES[service]) {
      // Get specific service log
      const logFile = path.join(LOGS_PATH, `${service}.log`);
      if (fs.existsSync(logFile)) {
        const { stdout } = await execAsync(`tail -n ${lines} "${logFile}"`);
        logs[service] = stdout;
      }
    } else {
      // Get all service logs
      for (const [key] of Object.entries(SERVICES)) {
        const logFile = path.join(LOGS_PATH, `${key}.log`);
        if (fs.existsSync(logFile)) {
          try {
            const { stdout } = await execAsync(`tail -n ${Math.min(lines, 20)} "${logFile}"`);
            logs[key] = stdout;
          } catch (error) {
            logs[key] = `Error reading log: ${error}`;
          }
        }
      }
    }
    
    return { success: true, logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req;

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (method === 'GET') {
      const action = query.action as string;
      
      if (action === 'status') {
        // Simplified status response for now
        const services = Object.entries(SERVICES).map(([key, service]) => ({
          key,
          name: service.name,
          port: service.port,
          category: service.category,
          status: 'stopped',
          healthy: false,
          responseTime: 0,
          details: null,
          a2aEnabled: false,
          capabilities: [],
          messageTypes: []
        }));
        
        const summary = {
          healthy: 0,
          total: services.length,
          status: 'stopped' as const
        };
        
        return res.status(200).json({
          success: true,
          services,
          summary,
          timestamp: new Date().toISOString()
        });
      } else if (action === 'logs') {
        return res.status(200).json({
          success: true,
          logs: {}
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Use "status" or "logs"' 
        });
      }
    } else if (method === 'POST') {
      const { action } = req.body;
      
      if (action === 'start') {
        return res.status(200).json({
          success: true,
          message: 'Knowledge Graph system start initiated (mock response)',
          logs: ['🚀 Starting Knowledge Graph system...', '⏳ This is a mock response for testing']
        });
      } else if (action === 'stop') {
        return res.status(200).json({
          success: true,
          message: 'Knowledge Graph system stop initiated (mock response)',
          logs: ['🛑 Stopping Knowledge Graph system...', '⏳ This is a mock response for testing']
        });
      } else if (action === 'restart') {
        return res.status(200).json({
          success: true,
          message: 'Knowledge Graph system restart completed (mock response)',
          logs: ['🔄 Restarting Knowledge Graph system...', '⏳ This is a mock response for testing']
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid action. Use "start", "stop", or "restart"' 
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ 
        success: false, 
        message: `Method ${method} not allowed` 
      });
    }
  } catch (error: any) {
    console.error('Knowledge Graph control API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
