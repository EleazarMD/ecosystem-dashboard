/**
 * Child Page Access Request API
 * 
 * Request parental approval to view flagged book page
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow child accounts
  const accountType = (session.user as any).accountType;
  if (accountType !== 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { bookId, pageNumber } = req.body;

  if (!bookId || !pageNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if page is flagged
    const flagResult = await pool.query(`
      SELECT bcf.*, cb.title as book_title
      FROM book_content_flags bcf
      JOIN children_books cb ON bcf.book_id = cb.id
      WHERE bcf.book_id = $1 
        AND bcf.page_number = $2 
        AND bcf.assigned_child_id = $3
        AND bcf.status = 'pending'
    `, [bookId, pageNumber, session.user.id]);

    if (flagResult.rows.length === 0) {
      return res.status(404).json({ error: 'No flag found for this page' });
    }

    const flag = flagResult.rows[0];

    // Get parent ID
    const parentResult = await pool.query(`
      SELECT parent_id FROM family_members 
      WHERE child_id = $1 
      LIMIT 1
    `, [session.user.id]);

    if (parentResult.rows.length === 0) {
      return res.status(400).json({ error: 'No parent found' });
    }

    const parentId = parentResult.rows[0].parent_id;

    // Check for existing pending request
    const existingRequest = await pool.query(`
      SELECT id, status, expires_at 
      FROM parental_approval_requests
      WHERE child_id = $1 
        AND flag_id = $2 
        AND status = 'pending'
        AND expires_at > NOW()
    `, [session.user.id, flag.id]);

    if (existingRequest.rows.length > 0) {
      return res.status(200).json({
        success: true,
        requestId: existingRequest.rows[0].id,
        status: 'pending',
        message: 'Request already sent to parent'
      });
    }

    // Create approval request
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const insertResult = await pool.query(`
      INSERT INTO parental_approval_requests (
        child_id, parent_id, request_type, resource_type,
        resource_id, flag_id, context, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      session.user.id,
      parentId,
      'book_page_access',
      'book_page',
      bookId,
      flag.id,
      JSON.stringify({
        book_title: flag.book_title,
        page_number: pageNumber,
        flag_reason: flag.flag_reason,
        severity: flag.severity
      }),
      expiresAt
    ]);

    const requestId = insertResult.rows[0].id;

    console.log(`[Page Access] Created approval request ${requestId} for child ${session.user.id}`);

    return res.status(201).json({
      success: true,
      requestId,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      message: 'Approval request sent to parent'
    });

  } catch (error) {
    console.error('[Page Access] Error:', error);
    return res.status(500).json({
      error: 'Failed to create approval request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
