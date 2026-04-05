/**
 * API endpoint for AI Gateway live metrics
 * Returns real-time performance and system metrics
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface LiveMetrics {
  timestamp: string;
  total_requests: number;
  requests_per_second: number;
  active_connections: number;
  avg_latency: number;
  error_rate: number;
  uptime_seconds: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  response_times: {
    p50: number;
    p95: number;
    p99: number;
  };
  error_breakdown: {
    [key: string]: number;
  };
  request_breakdown: {
    [key: string]: number;
  };
}

// Fetch live metrics from AI Gateway
async function fetchLiveMetrics(): Promise<LiveMetrics> {
  const aiGatewayUrl = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:8777';
  const apiKey = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024';
  
  try {
    const response = await fetch(`${aiGatewayUrl}/admin/metrics/live`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch live metrics:', error);
    throw error;
  }
}

// Calculate derived metrics
function calculateDerivedMetrics(metrics: LiveMetrics) {
  const uptimeHours = Math.floor(metrics.uptime_seconds / 3600);
  const uptimeDays = Math.floor(uptimeHours / 24);
  const avgRequestsPerConnection = metrics.active_connections > 0 ? 
    Math.round(metrics.requests_per_second / metrics.active_connections * 100) / 100 : 0;
  
  const totalErrors = Object.values(metrics.error_breakdown).reduce((sum, count) => sum + count, 0);
  const totalRequests = Object.values(metrics.request_breakdown).reduce((sum, count) => sum + count, 0);
  
  const healthScore = Math.max(0, Math.min(100, 
    100 - (metrics.error_rate * 1000) - 
    (metrics.avg_latency > 1000 ? 20 : 0) - 
    (metrics.cpu_usage > 80 ? 15 : 0) - 
    (metrics.memory_usage > 90 ? 15 : 0)
  ));

  return {
    uptime_formatted: `${uptimeDays}d ${uptimeHours % 24}h`,
    avg_requests_per_connection: avgRequestsPerConnection,
    total_errors_last_hour: totalErrors,
    total_requests_last_hour: totalRequests,
    health_score: Math.round(healthScore),
    network_total: metrics.network_in + metrics.network_out,
    resource_utilization: {
      cpu: metrics.cpu_usage,
      memory: metrics.memory_usage,
      disk: metrics.disk_usage,
      overall: Math.round((metrics.cpu_usage + metrics.memory_usage + metrics.disk_usage) / 3)
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const metrics = await fetchLiveMetrics();
    const derived = calculateDerivedMetrics(metrics);
    
    res.status(200).json({
      ...metrics,
      derived,
      meta: {
        collection_time: new Date().toISOString(),
        next_update: new Date(Date.now() + 5000).toISOString(), // Next update in 5 seconds
        data_retention: '24 hours',
        update_frequency: '5 seconds'
      }
    });
  } catch (error: any) {
    console.error('Live metrics API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch live metrics', 
      message: error.message 
    });
  }
}
