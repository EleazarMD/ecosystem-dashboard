/**
 * AHIS Port Registry API Endpoint
 * 
 * Proxies port registry requests to the AHIS server running in k3d cluster
 * Follows the AHIS Dashboard Integration Handoff specifications
 */

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// AHIS server configuration from handoff guide
const AHIS_BASE_URL = process.env.AHIS_BASE_URL || 'http://ahis-server.aihomelab-core.svc.cluster.local:8888';
const AHIS_FALLBACK_URL = process.env.AHIS_FALLBACK_URL || 'http://localhost:8888';

// Port registry interface based on handoff guide
interface AHISPort {
  port: number;
  service: string;
  protocol: 'HTTP' | 'HTTPS' | 'TCP' | 'UDP' | 'WebSocket';
  status: 'active' | 'inactive' | 'reserved' | 'conflict';
  description: string;
  registeredBy: string;
  registeredAt: string;
  lastChecked: string;
  health: {
    reachable: boolean;
    responseTime: number;
    lastCheck: string;
  };
  usage: {
    connections: number;
    bandwidth: number;
    requests: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetPorts(req, res);
  } else if (req.method === 'POST') {
    return handleRegisterPort(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle GET /api/ahis/ports - Fetch all registered ports
 */
async function handleGetPorts(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Try primary AHIS endpoint first (k3d cluster)
    let response;
    let endpoint = AHIS_BASE_URL;
    
    try {
      response = await axios.get(`${AHIS_BASE_URL}/api/ahis/v1/port-registry/ports`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    } catch (primaryError) {
      console.warn('Primary AHIS endpoint failed, trying fallback:', primaryError);
      
      // Try fallback endpoint (localhost)
      endpoint = AHIS_FALLBACK_URL;
      response = await axios.get(`${AHIS_FALLBACK_URL}/api/ahis/v1/port-registry/ports`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AI-Homelab-Dashboard/1.0'
        }
      });
    }
    
    const portsData = response.data;
    
    // Enhance ports data with dashboard-specific information
    const enhancedPorts = Array.isArray(portsData) ? portsData.map((port: any) => ({
      port: port.port || 0,
      service: port.service || 'Unknown Service',
      protocol: port.protocol || 'HTTP',
      status: port.status || 'inactive',
      description: port.description || '',
      registeredBy: port.registeredBy || 'system',
      registeredAt: port.registeredAt || new Date().toISOString(),
      lastChecked: port.lastChecked || new Date().toISOString(),
      health: {
        reachable: port.health?.reachable || false,
        responseTime: port.health?.responseTime || 0,
        lastCheck: port.health?.lastCheck || new Date().toISOString()
      },
      usage: {
        connections: port.usage?.connections || 0,
        bandwidth: port.usage?.bandwidth || 0,
        requests: port.usage?.requests || 0
      }
    })) : [];
    
    // Calculate summary statistics
    const summary = {
      total: enhancedPorts.length,
      active: enhancedPorts.filter(p => p.status === 'active').length,
      inactive: enhancedPorts.filter(p => p.status === 'inactive').length,
      conflicts: enhancedPorts.filter(p => p.status === 'conflict').length,
      reachable: enhancedPorts.filter(p => p.health.reachable).length,
      protocols: Array.from(new Set(enhancedPorts.map(p => p.protocol))),
      portRanges: {
        system: enhancedPorts.filter(p => p.port < 1024).length,
        user: enhancedPorts.filter(p => p.port >= 1024 && p.port < 49152).length,
        dynamic: enhancedPorts.filter(p => p.port >= 49152).length
      }
    };
    
    return res.status(200).json({
      success: true,
      ports: enhancedPorts,
      summary,
      endpoint,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching AHIS ports:', error);
    
    // Return graceful error response with mock data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                             errorMessage.includes('timeout') || 
                             errorMessage.includes('ENOTFOUND');
    
    // Provide mock ports data when AHIS is unavailable
    const mockPorts: AHISPort[] = [
      {
        port: 7777,
        service: 'AI Gateway',
        protocol: 'HTTP',
        status: 'active',
        description: 'Central AI model gateway and proxy service',
        registeredBy: 'ai-gateway-service',
        registeredAt: new Date(Date.now() - 86400000).toISOString(),
        lastChecked: new Date().toISOString(),
        health: {
          reachable: true,
          responseTime: 45,
          lastCheck: new Date().toISOString()
        },
        usage: {
          connections: 23,
          bandwidth: 1.2,
          requests: 15420
        }
      },
      {
        port: 8404,
        service: 'Ecosystem Dashboard',
        protocol: 'HTTP',
        status: 'active',
        description: 'Central monitoring and management dashboard',
        registeredBy: 'ecosystem-dashboard',
        registeredAt: new Date(Date.now() - 3600000).toISOString(),
        lastChecked: new Date().toISOString(),
        health: {
          reachable: true,
          responseTime: 12,
          lastCheck: new Date().toISOString()
        },
        usage: {
          connections: 5,
          bandwidth: 0.3,
          requests: 2340
        }
      },
      {
        port: 8888,
        service: 'AHIS Server',
        protocol: 'HTTP',
        status: 'active',
        description: 'AI Homelab Information System - Ecosystem Brain',
        registeredBy: 'ahis-server',
        registeredAt: new Date(Date.now() - 172800000).toISOString(),
        lastChecked: new Date().toISOString(),
        health: {
          reachable: true,
          responseTime: 8,
          lastCheck: new Date().toISOString()
        },
        usage: {
          connections: 12,
          bandwidth: 0.8,
          requests: 8930
        }
      },
      {
        port: 9000,
        service: 'Authentik',
        protocol: 'HTTP',
        status: 'active',
        description: 'Authentication and authorization service',
        registeredBy: 'authentik-server',
        registeredAt: new Date(Date.now() - 259200000).toISOString(),
        lastChecked: new Date().toISOString(),
        health: {
          reachable: true,
          responseTime: 67,
          lastCheck: new Date().toISOString()
        },
        usage: {
          connections: 8,
          bandwidth: 0.5,
          requests: 1240
        }
      },
      {
        port: 7474,
        service: 'Neo4j Browser',
        protocol: 'HTTP',
        status: 'active',
        description: 'Neo4j graph database browser interface',
        registeredBy: 'knowledge-graph-service',
        registeredAt: new Date(Date.now() - 345600000).toISOString(),
        lastChecked: new Date().toISOString(),
        health: {
          reachable: true,
          responseTime: 89,
          lastCheck: new Date().toISOString()
        },
        usage: {
          connections: 3,
          bandwidth: 0.2,
          requests: 456
        }
      }
    ];
    
    const mockSummary = {
      total: mockPorts.length,
      active: mockPorts.filter(p => p.status === 'active').length,
      inactive: mockPorts.filter(p => p.status === 'inactive').length,
      conflicts: mockPorts.filter(p => p.status === 'conflict').length,
      reachable: mockPorts.filter(p => p.health.reachable).length,
      protocols: Array.from(new Set(mockPorts.map(p => p.protocol))),
      portRanges: {
        system: mockPorts.filter(p => p.port < 1024).length,
        user: mockPorts.filter(p => p.port >= 1024 && p.port < 49152).length,
        dynamic: mockPorts.filter(p => p.port >= 49152).length
      }
    };
    
    return res.status(isConnectionError ? 503 : 500).json({
      success: false,
      ports: mockPorts,
      summary: mockSummary,
      endpoint: 'mock',
      lastUpdated: new Date().toISOString(),
      error: 'AHIS server unavailable',
      message: errorMessage,
      usingMockData: true,
      connectionError: isConnectionError
    });
  }
}

/**
 * Handle POST /api/ahis/ports - Register new port
 */
async function handleRegisterPort(req: NextApiRequest, res: NextApiResponse) {
  try {
    const portData = req.body;
    
    const response = await axios.post(`${AHIS_BASE_URL}/api/ahis/v1/port-registry/register`, portData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Homelab-Dashboard/1.0'
      }
    });
    
    return res.status(201).json({
      success: true,
      port: response.data,
      message: 'Port registered successfully'
    });
    
  } catch (error) {
    console.error('Error registering AHIS port:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to register port',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
