/**
 * API endpoint for security metrics
 * Proxies requests to AI Gateway security metrics service
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { range = '24h' } = req.query;

  try {
    // Forward request to AI Gateway
    const response = await fetch(
      `${AI_GATEWAY_URL}/api/v1/security/metrics?range=${range}`,
      {
        headers: {
          'X-API-Key': AI_GATEWAY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`AI Gateway responded with ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('[API] Metrics error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
