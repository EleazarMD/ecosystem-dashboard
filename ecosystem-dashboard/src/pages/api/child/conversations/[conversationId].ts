/**
 * Child Conversation Detail API
 * 
 * GET: Get a specific conversation with all messages
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getConversationWithMessages } from '@/lib/platform/child-conversation-history';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const { conversationId } = req.query;

  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  // Verify this is a child account
  const userResult = await pool.query(
    `SELECT account_type FROM users WHERE id = $1`,
    [user.id]
  );

  if (userResult.rows[0]?.account_type !== 'child') {
    return res.status(403).json({ error: 'This endpoint is for child accounts only' });
  }

  if (req.method === 'GET') {
    try {
      const conversation = await getConversationWithMessages(conversationId, user.id);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.status(200).json({ conversation });
    } catch (error) {
      console.error('[Child Conversation Detail API] Error:', error);
      return res.status(500).json({ error: 'Failed to get conversation' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
