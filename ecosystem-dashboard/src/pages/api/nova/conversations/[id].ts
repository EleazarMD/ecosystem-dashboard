/**
 * Nova Single Conversation API Proxy
 * 
 * GET /api/nova/conversations/[id] - Get full conversation history
 * DELETE /api/nova/conversations/[id] - Delete a conversation
 */
import type { NextApiRequest, NextApiResponse } from 'next';

const NOVA_TEXT_URL = process.env.NOVA_TEXT_URL || 'http://127.0.0.1:18803';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const conversationId = req.query.id as string;
  const userId = (req.query.user_id as string) || 'dashboard';

  if (!conversationId) {
    return res.status(400).json({ error: 'Conversation ID required' });
  }

  try {
    if (method === 'GET') {
      // Get conversation history
      const response = await fetch(
        `${NOVA_TEXT_URL}/conversations/${conversationId}?user_id=${userId}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Nova API error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (method === 'DELETE') {
      // Delete conversation
      const response = await fetch(
        `${NOVA_TEXT_URL}/conversations/${conversationId}?user_id=${userId}`,
        { 
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' } 
        }
      );

      if (!response.ok) {
        throw new Error(`Nova API error: ${response.status}`);
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[Nova Conversation API] Error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to process conversation request',
      details: error.message 
    });
  }
}
