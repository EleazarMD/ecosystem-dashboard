/**
 * Parent Child Conversations API
 * 
 * GET: Get conversation summaries for parent's children (for Family Hub)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { 
  getParentConversationSummaries,
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

  // Verify this is a parent account (not a child)
  const userResult = await pool.query(
    `SELECT account_type FROM users WHERE id = $1`,
    [user.id]
  );

  if (userResult.rows[0]?.account_type === 'child') {
    return res.status(403).json({ error: 'This endpoint is for parent accounts only' });
  }

  if (req.method === 'GET') {
    try {
      // Ensure tables exist
      await initConversationHistoryTables();

      const childUserId = req.query.childId as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const flaggedOnly = req.query.flaggedOnly === 'true';

      let summaries = await getParentConversationSummaries(user.id, {
        childUserId,
        limit,
        offset,
        startDate,
        endDate,
      });

      // Filter to flagged only if requested
      if (flaggedOnly) {
        summaries = summaries.filter(s => s.flaggedContent);
      }

      // Get children list for the parent
      const childrenResult = await pool.query(
        `SELECT ca.user_id as id, ca.name, ca.theme, ca.age
         FROM child_accounts ca
         WHERE ca.parent_user_id = $1
         ORDER BY ca.name`,
        [user.id]
      );

      // Get aggregate stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT c.id) as total_conversations,
          SUM(c.message_count) as total_messages,
          COUNT(DISTINCT c.child_user_id) as active_children,
          SUM(CASE WHEN c.flagged_content THEN 1 ELSE 0 END) as flagged_count,
          SUM(CASE WHEN c.creative_mode THEN 1 ELSE 0 END) as creative_sessions
         FROM child_conversations c
         JOIN child_accounts ca ON ca.user_id = c.child_user_id
         WHERE ca.parent_user_id = $1
         ${startDate ? `AND c.started_at >= '${startDate.toISOString()}'` : ''}
         ${endDate ? `AND c.started_at <= '${endDate.toISOString()}'` : ''}`,
        [user.id]
      );

      const stats = statsResult.rows[0] || {};

      return res.status(200).json({
        summaries,
        children: childrenResult.rows,
        stats: {
          totalConversations: parseInt(stats.total_conversations) || 0,
          totalMessages: parseInt(stats.total_messages) || 0,
          activeChildren: parseInt(stats.active_children) || 0,
          flaggedCount: parseInt(stats.flagged_count) || 0,
          creativeSessions: parseInt(stats.creative_sessions) || 0,
        },
        pagination: {
          limit,
          offset,
          hasMore: summaries.length === limit,
        },
      });
    } catch (error) {
      console.error('[Parent Conversations API] Error:', error);
      return res.status(500).json({ error: 'Failed to get conversation summaries' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
