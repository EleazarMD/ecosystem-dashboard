/**
 * API endpoint for AI Gateway interface metrics
 * Returns real-time status of API interfaces and protocols
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface InterfaceMetrics {
  endpoint: string;
  protocol: string;
  port: number;
  active_connections: number;
  requests_per_second: number;
  avg_response_time: number;
  error_rate: number;
  status: 'healthy' | 'degraded' | 'error';
  total_requests: number;
  uptime_seconds: number;
}

// Fetch interface metrics from AI Gateway
async function fetchInterfaceMetrics(): Promise<InterfaceMetrics[]> {
  const aiGatewayUrl = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:8777';
  const apiKey = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024';
  
  try {
    const response = await fetch(`${aiGatewayUrl}/admin/interfaces/metrics`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.interfaces || [];
  } catch (error) {
    console.error('Failed to fetch interface metrics:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const interfaces = await fetchInterfaceMetrics();
    
    // Calculate aggregate metrics
    const totalConnections = interfaces.reduce((sum, iface) => sum + iface.active_connections, 0);
    const totalRequests = interfaces.reduce((sum, iface) => sum + iface.total_requests, 0);
    const avgResponseTime = interfaces.length > 0 ? 
      interfaces.reduce((sum, iface) => sum + iface.avg_response_time, 0) / interfaces.length : 0;
    const totalRPS = interfaces.reduce((sum, iface) => sum + iface.requests_per_second, 0);
    const avgErrorRate = interfaces.length > 0 ? 
      interfaces.reduce((sum, iface) => sum + iface.error_rate, 0) / interfaces.length : 0;

    // Group by protocol
    const protocolStats = interfaces.reduce((acc, iface) => {
      if (!acc[iface.protocol]) {
        acc[iface.protocol] = {
          count: 0,
          active_connections: 0,
          total_requests: 0,
          avg_response_time: 0,
          error_rate: 0
        };
      }
      acc[iface.protocol].count += 1;
      acc[iface.protocol].active_connections += iface.active_connections;
      acc[iface.protocol].total_requests += iface.total_requests;
      acc[iface.protocol].avg_response_time += iface.avg_response_time;
      acc[iface.protocol].error_rate += iface.error_rate;
      return acc;
    }, {} as Record<string, any>);

    // Calculate averages for protocol stats
    Object.keys(protocolStats).forEach(protocol => {
      const stats = protocolStats[protocol];
      stats.avg_response_time = Math.round(stats.avg_response_time / stats.count);
      stats.error_rate = stats.error_rate / stats.count;
    });

    // Health status summary
    const healthyInterfaces = interfaces.filter(i => i.status === 'healthy').length;
    const degradedInterfaces = interfaces.filter(i => i.status === 'degraded').length;
    const errorInterfaces = interfaces.filter(i => i.status === 'error').length;

    res.status(200).json({
      timestamp: new Date().toISOString(),
      interfaces,
      summary: {
        total_interfaces: interfaces.length,
        total_active_connections: totalConnections,
        total_requests: totalRequests,
        total_requests_per_second: Math.round(totalRPS * 100) / 100,
        avg_response_time: Math.round(avgResponseTime),
        avg_error_rate: Math.round(avgErrorRate * 10000) / 10000,
        health_status: {
          healthy: healthyInterfaces,
          degraded: degradedInterfaces,
          error: errorInterfaces
        }
      },
      by_protocol: protocolStats,
      ports: {
        internal: 7777,
        external: 8777,
        ahis: 8888
      }
    });
  } catch (error: any) {
    console.error('Interface metrics API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interface metrics', 
      message: error.message 
    });
  }
}
