/**
 * API endpoint for AI Gateway provider metrics
 * Returns real-time status of upstream AI providers
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface ProviderMetrics {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'offline';
  latency: number;
  requests_per_minute: number;
  error_rate: number;
  last_request: string;
  quota_used?: number;
  quota_limit?: number;
  endpoint?: string;
}

// AI Gateway client for internal metrics
async function fetchProviderMetrics(): Promise<ProviderMetrics[]> {
  const aiGatewayUrl = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:8777';
  const apiKey = process.env.AI_GATEWAY_ADMIN_KEY || 'ai-gateway-api-key-2024';
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${aiGatewayUrl}/admin/providers/status`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.providers || [];
  } catch (error) {
    console.error('Failed to fetch provider metrics:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const providers = await fetchProviderMetrics();
    
    res.status(200).json({
      timestamp: new Date().toISOString(),
      providers,
      total_providers: providers.length,
      healthy_providers: providers.filter(p => p.status === 'healthy').length,
      degraded_providers: providers.filter(p => p.status === 'degraded').length,
      offline_providers: providers.filter(p => p.status === 'offline' || p.status === 'error').length
    });
  } catch (error: any) {
    console.error('Provider metrics API error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch provider metrics', 
      message: error.message 
    });
  }
}
