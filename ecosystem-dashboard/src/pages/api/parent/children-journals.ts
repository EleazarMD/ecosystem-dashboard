/**
 * Parent API - View Children's Journal Entries
 * 
 * Allows parents to view journal entries from their children
 * that have shared_with_parent = true
 * 
 * Multi-tenant compliant - only shows children within the same tenant
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentUserId = session.user.id;

  // Verify user is a parent
  const parentCheck = await pool.query(
    `SELECT id FROM child_accounts WHERE parent_user_id = $1 LIMIT 1`,
    [parentUserId]
  );

  if (parentCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Not a parent account' });
  }

  // Get tenant_id for multi-tenant isolation
  const tenantResult = await pool.query(
    `SELECT tm.tenant_id FROM tenant_memberships tm WHERE tm.user_id = $1 LIMIT 1`,
    [parentUserId]
  );
  const tenantId = tenantResult.rows[0]?.tenant_id;

  if (req.method === 'GET') {
    return handleGet(req, res, parentUserId, tenantId);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  parentUserId: string,
  tenantId: string | undefined
) {
  const { childId, limit = '20', offset = '0', dateFrom, dateTo } = req.query;

  try {
    // Get all children for this parent
    const childrenResult = await pool.query(
      `SELECT ca.user_id, ca.name, ca.avatar_emoji, ca.theme, u.email
       FROM child_accounts ca
       JOIN users u ON u.id = ca.user_id
       WHERE ca.parent_user_id = $1`,
      [parentUserId]
    );

    const children = childrenResult.rows;

    if (children.length === 0) {
      return res.status(200).json({ 
        children: [],
        entries: [],
        stats: { totalEntries: 0, totalChildren: 0 }
      });
    }

    // Build query for journal entries
    let query = `
      SELECT 
        je.*,
        ca.name as child_name,
        ca.avatar_emoji as child_avatar,
        ca.theme as child_theme
      FROM journal_entries je
      JOIN child_accounts ca ON ca.user_id = je.user_id
      WHERE ca.parent_user_id = $1
        AND je.shared_with_parent = true
        AND je.is_private = false
    `;
    const params: any[] = [parentUserId];
    let paramIndex = 2;

    // Filter by tenant for multi-tenant isolation
    if (tenantId) {
      query += ` AND je.tenant_id = $${paramIndex}`;
      params.push(tenantId);
      paramIndex++;
    }

    // Filter by specific child
    if (childId) {
      query += ` AND je.user_id = $${paramIndex}`;
      params.push(childId);
      paramIndex++;
    }

    // Date filters
    if (dateFrom) {
      query += ` AND je.date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND je.date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    query += ` ORDER BY je.date DESC, je.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const entriesResult = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM journal_entries je
      JOIN child_accounts ca ON ca.user_id = je.user_id
      WHERE ca.parent_user_id = $1
        AND je.shared_with_parent = true
        AND je.is_private = false
    `;
    const countParams: any[] = [parentUserId];

    if (tenantId) {
      countQuery += ` AND je.tenant_id = $2`;
      countParams.push(tenantId);
    }

    const countResult = await pool.query(countQuery, countParams);

    // Get stats per child
    const statsQuery = `
      SELECT 
        ca.user_id,
        ca.name,
        ca.avatar_emoji,
        COUNT(je.id) as entry_count,
        MAX(je.date) as last_entry_date,
        jp.current_streak,
        jp.longest_streak,
        jp.total_entries
      FROM child_accounts ca
      LEFT JOIN journal_entries je ON je.user_id = ca.user_id 
        AND je.shared_with_parent = true 
        AND je.is_private = false
      LEFT JOIN journal_progress jp ON jp.user_id = ca.user_id
      WHERE ca.parent_user_id = $1
      GROUP BY ca.user_id, ca.name, ca.avatar_emoji, jp.current_streak, jp.longest_streak, jp.total_entries
    `;
    const statsResult = await pool.query(statsQuery, [parentUserId]);

    // Format entries
    const entries = entriesResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      childName: row.child_name,
      childAvatar: row.child_avatar,
      childTheme: row.child_theme,
      type: row.type,
      title: row.title,
      content: row.content,
      mood: row.mood,
      date: row.date,
      highlights: row.highlights || [],
      tags: row.tags || [],
      aiEvaluation: row.ai_evaluation,
      createdAt: row.created_at,
    }));

    // Format children stats
    const childrenStats = statsResult.rows.map(row => ({
      userId: row.user_id,
      name: row.name,
      avatar: row.avatar_emoji,
      entryCount: parseInt(row.entry_count) || 0,
      lastEntryDate: row.last_entry_date,
      currentStreak: row.current_streak || 0,
      longestStreak: row.longest_streak || 0,
      totalEntries: row.total_entries || 0,
    }));

    return res.status(200).json({
      children: childrenStats,
      entries,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

  } catch (error) {
    console.error('[Parent Journals API] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch journal entries' });
  }
}
