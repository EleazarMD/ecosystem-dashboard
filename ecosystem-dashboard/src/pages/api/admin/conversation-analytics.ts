/**
 * Conversation Analytics API
 * 
 * Provides analytics and monitoring for real production conversations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is platform admin
  const userResult = await pool.query(
    'SELECT role FROM users WHERE id = $1',
    [session.user.id]
  );

  if (!userResult.rows[0] || userResult.rows[0].role !== 'platform_admin') {
    return res.status(403).json({ error: 'Forbidden - Platform admin only' });
  }

  if (req.method === 'GET') {
    try {
      const { timeframe = '24h', userId } = req.query;

      // Calculate time filter
      let timeFilter = "created_at > NOW() - INTERVAL '24 hours'";
      if (timeframe === '7d') timeFilter = "created_at > NOW() - INTERVAL '7 days'";
      if (timeframe === '30d') timeFilter = "created_at > NOW() - INTERVAL '30 days'";
      if (timeframe === 'all') timeFilter = "1=1";

      // User filter
      const userFilter = userId ? `AND user_id = '${userId}'` : '';

      // Overall statistics
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_messages,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT conversation_id) as total_conversations,
          ROUND(AVG(response_time_ms)) as avg_response_time,
          ROUND(AVG(LENGTH(ai_response))) as avg_response_length,
          COUNT(CASE WHEN interactive_choices_present THEN 1 END) as with_choices,
          COUNT(CASE WHEN error_occurred THEN 1 END) as errors
        FROM test_analytics.chat_simulations
        WHERE run_id IN (
          SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
        )
        AND ${timeFilter}
        ${userFilter}
      `);

      // By subject area
      const subjectResult = await pool.query(`
        SELECT 
          subject_area,
          COUNT(*) as count,
          ROUND(AVG(LENGTH(ai_response))) as avg_length,
          ROUND(AVG(response_time_ms)) as avg_time
        FROM test_analytics.chat_simulations
        WHERE run_id IN (
          SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
        )
        AND ${timeFilter}
        ${userFilter}
        AND subject_area IS NOT NULL
        GROUP BY subject_area
        ORDER BY count DESC
      `);

      // By user
      const userResult = await pool.query(`
        SELECT 
          user_name,
          user_theme,
          user_age,
          COUNT(*) as message_count,
          COUNT(DISTINCT conversation_id) as conversation_count,
          ROUND(AVG(LENGTH(ai_response))) as avg_response_length
        FROM test_analytics.chat_simulations
        WHERE run_id IN (
          SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
        )
        AND ${timeFilter}
        ${userFilter}
        GROUP BY user_name, user_theme, user_age
        ORDER BY message_count DESC
        LIMIT 20
      `);

      // Recent conversations
      const recentResult = await pool.query(`
        SELECT 
          user_name,
          user_theme,
          user_age,
          subject_area,
          LEFT(user_message, 60) as message_preview,
          LENGTH(ai_response) as response_length,
          response_time_ms,
          interactive_choices_present,
          created_at
        FROM test_analytics.chat_simulations
        WHERE run_id IN (
          SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
        )
        AND ${timeFilter}
        ${userFilter}
        ORDER BY created_at DESC
        LIMIT 50
      `);

      // Response length distribution
      const lengthDistResult = await pool.query(`
        SELECT 
          user_theme,
          user_age,
          ROUND(AVG(LENGTH(ai_response))) as avg_length,
          ROUND(STDDEV(LENGTH(ai_response))) as std_dev,
          MIN(LENGTH(ai_response)) as min_length,
          MAX(LENGTH(ai_response)) as max_length
        FROM test_analytics.chat_simulations
        WHERE run_id IN (
          SELECT id FROM test_analytics.test_runs WHERE run_type = 'production'
        )
        AND ${timeFilter}
        ${userFilter}
        GROUP BY user_theme, user_age
        ORDER BY user_age
      `);

      return res.status(200).json({
        timeframe,
        stats: statsResult.rows[0],
        bySubject: subjectResult.rows,
        byUser: userResult.rows,
        recent: recentResult.rows,
        lengthDistribution: lengthDistResult.rows,
      });

    } catch (error) {
      console.error('[Conversation Analytics] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
