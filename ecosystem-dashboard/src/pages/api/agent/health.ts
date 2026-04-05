/**
 * Agent Health Endpoint
 * 
 * Provides health status for the AI Homelab Dashboard Agent
 * Required for AHIS registration and service discovery
 */

import { NextApiRequest, NextApiResponse } from 'next';

export interface AgentHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  agent_id: string;
  agent_name: string;
  capabilities: string[];
  services: {
    dashboard: boolean;
    ai_gateway: boolean;
    knowledge_graph: boolean;
    ahis: boolean;
  };
  metrics: {
    memory_usage: NodeJS.MemoryUsage;
    active_sessions: number;
    total_requests: number;
    error_rate: number;
  };
  endpoints: {
    query: string;
    overview: string;
    status: string;
    websocket: string;
  };
}

const startTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AgentHealthResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: '2.0.0',
      agent_id: 'dashboard-ai-agent',
      agent_name: 'AI Homelab Dashboard Agent',
      capabilities: [],
      services: { dashboard: false, ai_gateway: false, knowledge_graph: false, ahis: false },
      metrics: { memory_usage: process.memoryUsage(), active_sessions: 0, total_requests: 0, error_rate: 0 },
      endpoints: { query: '', overview: '', status: '', websocket: '' }
    } as any);
  }

  try {
    const uptime = Date.now() - startTime;
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;

    // Check service availability
    const services = {
      dashboard: true, // Always true if this endpoint responds
      ai_gateway: await checkServiceHealth('http://localhost:7777/health'),
      knowledge_graph: await checkServiceHealth('http://localhost:8765/health'),
      ahis: await checkServiceHealth('http://localhost:8888/health')
    };

    // Calculate overall health status
    const healthyServices = Object.values(services).filter(Boolean).length;
    const totalServices = Object.keys(services).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      status = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthResponse: AgentHealthResponse = {
      status,
      timestamp: new Date().toISOString(),
      uptime,
      version: '2.0.0',
      agent_id: 'dashboard-ai-agent',
      agent_name: 'AI Homelab Dashboard Agent',
      capabilities: [
        'natural_language_processing',
        'system_monitoring',
        'service_management',
        'knowledge_graph_queries',
        'proactive_insights',
        'conversation_management'
      ],
      services,
      metrics: {
        memory_usage: process.memoryUsage(),
        active_sessions: 0, // TODO: Track from session manager
        total_requests: 0, // TODO: Track from request counter
        error_rate: 0 // TODO: Calculate from error tracking
      },
      endpoints: {
        query: `${baseUrl}/api/agent/query`,
        overview: `${baseUrl}/api/agent/overview`,
        status: `${baseUrl}/api/agent/status`,
        websocket: `ws://${req.headers.host}/api/agent/ws`
      }
    };

    res.status(200).json(healthResponse);

  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      version: '2.0.0',
      agent_id: 'dashboard-ai-agent',
      agent_name: 'AI Homelab Dashboard Agent',
      capabilities: [],
      services: {
        dashboard: false,
        ai_gateway: false,
        knowledge_graph: false,
        ahis: false
      },
      metrics: {
        memory_usage: process.memoryUsage(),
        active_sessions: 0,
        total_requests: 0,
        error_rate: 1.0
      },
      endpoints: {
        query: '',
        overview: '',
        status: '',
        websocket: ''
      }
    });
  }
}

async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}
