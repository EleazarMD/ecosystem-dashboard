/**
 * Nova Conversations API Proxy
 * 
 * Proxies conversation history requests to Nova Agent (port 18803).
 * Used by Tesla dashboard and other clients to list/load conversation history.
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_TEXT_URL = process.env.NOVA_TEXT_URL || 'http://127.0.0.1:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const userId = (req.query.user_id as string) || 'dashboard';
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    if (method === 'GET') {
      // List conversations
      const response = await fetch(
        `${NOVA_TEXT_URL}/conversations?user_id=${userId}&limit=${limit}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Nova API error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Nova Conversations API] Error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: error.message 
    });
  }
}
