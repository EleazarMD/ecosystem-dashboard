import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Cost Analytics API
 * Provides cost tracking and analytics data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      timeRange = '24h',
      groupBy = 'provider',
      clientId,
      provider,
      model,
    } = req.query;

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    // Build query parameters
    const params = new URLSearchParams({
      timeRange: timeRange.toString(),
      groupBy: groupBy.toString(),
    });
    
    if (clientId) params.append('clientId', clientId.toString());
    if (provider) params.append('provider', provider.toString());
    if (model) params.append('model', model.toString());

    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/costs/analytics?${params.toString()}`,
      {
        headers: {
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[Costs API] AI Gateway returned ${response.status}`);
      return res.status(200).json({
        total: 0,
        breakdown: [],
        trend: [],
        summary: {
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          avgCostPerRequest: 0,
          byProvider: {},
          byModel: {},
          byClient: {},
        },
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Costs API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      total: 0,
      breakdown: [],
    });
  }
}
