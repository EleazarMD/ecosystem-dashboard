import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8777';
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method, query } = req;

  try {
    if (method === 'GET') {
      // Forward request to AI Gateway
      const params = new URLSearchParams();
      if (query.severity) params.append('severity', query.severity as string);
      if (query.status) params.append('status', query.status as string);
      if (query.type) params.append('type', query.type as string);
      if (query.range) params.append('range', query.range as string);

      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/anomalies?${params.toString()}`,
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
    } else if (method === 'PUT') {
      // Update anomaly status
      const { id, status } = req.body;

      const response = await fetch(
        `${AI_GATEWAY_URL}/api/v1/security/anomalies/${id}`,
        {
          method: 'PUT',
          headers: {
            'X-API-Key': AI_GATEWAY_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(`AI Gateway responded with ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error) {
    console.error('[API] Anomalies error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
