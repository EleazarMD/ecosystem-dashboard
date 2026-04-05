/**
 * Parental Approval Requests API
 * 
 * Handle real-time approval requests for flagged content
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountType = (session.user as any).accountType;

  if (req.method === 'GET') {
    // Get pending approval requests for parent
    if (accountType === 'child') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const result = await pool.query(`
        SELECT 
          par.*,
          bcf.page_number,
          bcf.content_excerpt,
          bcf.flag_reason,
          bcf.severity,
          cb.title as book_title,
          cb.cover_url as book_cover,
          u.name as child_name
        FROM parental_approval_requests par
        LEFT JOIN book_content_flags bcf ON par.flag_id = bcf.id
        LEFT JOIN children_books cb ON bcf.book_id = cb.id
        LEFT JOIN users u ON par.child_id = u.id
        WHERE par.parent_id = $1 
          AND par.status = 'pending'
          AND par.expires_at > NOW()
        ORDER BY par.created_at DESC
      `, [session.user.id]);

      return res.status(200).json({
        success: true,
        requests: result.rows
      });

    } catch (error) {
      console.error('[Approval Requests] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }
  }

  if (req.method === 'POST') {
    // Respond to approval request
    const { requestId, action } = req.body;

    if (!requestId || !action || !['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    try {
      // Verify request belongs to this parent
      const checkResult = await pool.query(
        'SELECT * FROM parental_approval_requests WHERE id = $1 AND parent_id = $2',
        [requestId, session.user.id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const request = checkResult.rows[0];

      // Check if expired
      if (new Date(request.expires_at) < new Date()) {
        await pool.query(
          `UPDATE parental_approval_requests SET status = 'expired' WHERE id = $1`,
          [requestId]
        );
        return res.status(410).json({ error: 'Request expired' });
      }

      // Update request status
      const newStatus = action === 'approve' ? 'approved' : 'denied';
      await pool.query(
        `UPDATE parental_approval_requests 
         SET status = $1, responded_at = NOW() 
         WHERE id = $2`,
        [newStatus, requestId]
      );

      // If approved and has flag_id, update flag status
      if (action === 'approve' && request.flag_id) {
        await pool.query(
          `UPDATE book_content_flags 
           SET status = 'approved', parent_id = $1, reviewed_at = NOW() 
           WHERE id = $2`,
          [session.user.id, request.flag_id]
        );
      }

      return res.status(200).json({
        success: true,
        status: newStatus
      });

    } catch (error) {
      console.error('[Approval Requests] Error:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
