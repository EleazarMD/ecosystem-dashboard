import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * AI Gateway Single Trace API
 * Get detailed information about a specific trace
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Trace ID is required' });
    }

    const AI_GATEWAY_URL = process.env.AI_GATEWAY_INTERNAL_URL || 'http://localhost:7777';
    
    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/traces/${id}`,
      {
        headers: {
          'X-API-Key': process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024',
        },
      }
    );

    if (response.status === 404) {
      return res.status(404).json({ error: 'Trace not found' });
    }

    if (!response.ok) {
      console.warn(`[Trace Detail API] AI Gateway returned ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch trace' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[Trace Detail API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
