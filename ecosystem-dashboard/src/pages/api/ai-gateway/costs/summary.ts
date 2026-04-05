import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Cost Summary API
 * Provides aggregated cost summary for dashboard cards
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { timeRange = '24h' } = req.query;

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/costs/summary?timeRange=${timeRange}`,
      {
        headers: {
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Cost Summary API] AI Gateway returned ${response.status}`);
      return res.status(200).json({
        total: 0,
        totalTokens: 0,
        totalRequests: 0,
        avgCostPerRequest: 0,
        byProvider: {},
        byModel: {},
        byClient: {},
        trend: [],
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Cost Summary API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      total: 0,
      totalTokens: 0,
      totalRequests: 0,
      avgCostPerRequest: 0,
      byProvider: {},
      byModel: {},
      byClient: {},
      trend: [],
    });
  }
}
