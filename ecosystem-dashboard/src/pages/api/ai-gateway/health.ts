import { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Health API Endpoint
 * Proxies health check requests to the AI Gateway service
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 AI Gateway Health Check');

    // Check AI Gateway health (Port 8777 for AI operations)
    const response = await fetch('http://localhost:8777/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'dashboard-health-proxy'
      },
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 10000);
        return controller.signal;
      })()
    });

    if (!response.ok) {
      throw new Error(`AI Gateway health check failed with ${response.status}`);
    }

    const result = await response.json();
    
    console.log('✅ AI Gateway health check successful');

    res.json({
      status: 'healthy',
      service: 'ai-gateway-proxy',
      upstream: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ AI Gateway health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'ai-gateway-proxy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
