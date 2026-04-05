/**
 * Child Conversations API
 * 
 * GET: List conversations for the current child user
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { 
  getChildConversations, 
  getChildConversationStats,
  initConversationHistoryTables 
} from '@/lib/platform/child-conversation-history';
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
      // Ensure tables exist
      await initConversationHistoryTables();

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const includeStats = req.query.stats === 'true';

      const conversations = await getChildConversations(user.id, limit, offset);

      let stats: Awaited<ReturnType<typeof getChildConversationStats>> | null = null;
      if (includeStats) {
        stats = await getChildConversationStats(user.id);
      }

      return res.status(200).json({
        conversations,
        stats,
        pagination: {
          limit,
          offset,
          hasMore: conversations.length === limit,
        },
      });
    } catch (error) {
      console.error('[Child Conversations API] Error:', error);
      return res.status(500).json({ error: 'Failed to get conversations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
