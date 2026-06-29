/**
 * AI Content Review API — Phase 7 parent control plane.
 *
 * GET  /api/parent/ai-content-review  → list AI-generated content items
 *   awaiting parent review (art, writing, workspace pages).
 * POST /api/parent/ai-content-review  → approve or reject an item.
 *
 * Items are collected from:
 * - child_activity_log entries with activity_type LIKE 'ai.%'
 * - workspace pages created by children
 * - art studio generations
 *
 * This extends the existing book-content-flags system to cover
 * AI-generated content beyond book reading.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface ReviewItem {
  id: string;
  childId: string;
  childName: string;
  contentType: 'art' | 'writing' | 'workspace_page' | 'chat_message' | 'book_content';
  title: string;
  excerpt: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountType = (session.user as { accountType?: string }).accountType;
  if (accountType === 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const parentId = session.user.id;

  if (req.method === 'GET') {
    try {
      const items: ReviewItem[] = [];

      // 1. Book content flags (existing system)
      try {
        const flagsResult = await pool.query(`
          SELECT
            bcf.id,
            bcf.book_id,
            bcf.page_number,
            bcf.content_excerpt,
            bcf.flag_reason,
            bcf.severity,
            bcf.status,
            bcf.created_at,
            bcf.reviewed_at,
            cb.title as book_title,
            u.id as child_id,
            u.name as child_name
          FROM book_content_flags bcf
          LEFT JOIN children_books cb ON bcf.book_id = cb.id
          LEFT JOIN users u ON bcf.assigned_child_id = u.id
          WHERE bcf.parent_id = $1 OR bcf.parent_id IS NULL
          ORDER BY bcf.created_at DESC
          LIMIT 50
        `, [parentId]);

        for (const row of flagsResult.rows) {
          items.push({
            id: `flag-${row.id}`,
            childId: row.child_id,
            childName: row.child_name || 'Unknown',
            contentType: 'book_content',
            title: row.book_title || `Book page ${row.page_number}`,
            excerpt: row.content_excerpt || row.flag_reason || '',
            status: row.status || 'pending',
            createdAt: row.created_at,
            reviewedAt: row.reviewed_at,
          });
        }
      } catch {
        // table may not exist
      }

      // 2. AI-generated content from activity log
      try {
        const aiResult = await pool.query(`
          SELECT
            cal.id,
            cal.activity_type,
            cal.description,
            cal.metadata,
            cal.created_at,
            u.id as child_id,
            u.name as child_name
          FROM child_activity_log cal
          JOIN users u ON cal.child_user_id = u.id
          WHERE u.parent_user_id = $1
            AND cal.activity_type IN ('ai.art_generation', 'ai.writing', 'ai.workspace_create', 'ai.chat_flagged')
            AND cal.created_at >= NOW() - INTERVAL '7 days'
          ORDER BY cal.created_at DESC
          LIMIT 50
        `, [parentId]);

        for (const row of aiResult.rows) {
          const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {});
          const contentType: ReviewItem['contentType'] =
            row.activity_type === 'ai.art_generation' ? 'art' :
            row.activity_type === 'ai.workspace_create' ? 'workspace_page' :
            row.activity_type === 'ai.chat_flagged' ? 'chat_message' : 'writing';

          items.push({
            id: `ai-${row.id}`,
            childId: row.child_id,
            childName: row.child_name,
            contentType,
            title: meta.title || row.activity_type,
            excerpt: meta.prompt || meta.content || row.description || '',
            status: meta.reviewStatus || 'pending',
            createdAt: row.created_at,
          });
        }
      } catch {
        // table may not exist
      }

      // Sort by created_at desc, pending first
      items.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return res.status(200).json({ success: true, items });
    } catch (error) {
      console.error('[AI Content Review] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch review items' });
    }
  }

  if (req.method === 'POST') {
    const { itemId, action, note } = req.body;

    if (!itemId || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'itemId and action (approve|reject) are required' });
    }

    try {
      // Handle book content flags
      if (itemId.startsWith('flag-')) {
        const flagId = itemId.replace('flag-', '');
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await pool.query(
          `UPDATE book_content_flags SET status = $1, reviewed_at = NOW() WHERE id = $2`,
          [newStatus, flagId],
        );
        return res.status(200).json({ success: true, status: newStatus });
      }

      // Handle AI content review — update metadata in activity log
      if (itemId.startsWith('ai-')) {
        const logId = itemId.replace('ai-', '');
        const result = await pool.query(
          'SELECT metadata FROM child_activity_log WHERE id = $1',
          [logId],
        );

        if (result.rows.length > 0) {
          const meta = typeof result.rows[0].metadata === 'string'
            ? JSON.parse(result.rows[0].metadata)
            : (result.rows[0].metadata || {});
          meta.reviewStatus = action === 'approve' ? 'approved' : 'rejected';
          meta.reviewedAt = new Date().toISOString();
          if (note) meta.reviewNote = note;

          await pool.query(
            'UPDATE child_activity_log SET metadata = $1 WHERE id = $2',
            [JSON.stringify(meta), logId],
          );
        }

        return res.status(200).json({
          success: true,
          status: action === 'approve' ? 'approved' : 'rejected',
        });
      }

      return res.status(404).json({ error: 'Item not found' });
    } catch (error) {
      console.error('[AI Content Review] POST error:', error);
      return res.status(500).json({ error: 'Failed to process review' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
