/**
 * Check Page Access API
 * 
 * Check if child can access a book page (flagged content check)
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accountType = (session.user as any).accountType;
  if (accountType !== 'child') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { bookId, pageNumber } = req.query;

  if (!bookId || !pageNumber) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Check if page is flagged
    const flagResult = await pool.query(`
      SELECT 
        bcf.*,
        par.id as request_id,
        par.status as request_status,
        par.expires_at as request_expires
      FROM book_content_flags bcf
      LEFT JOIN parental_approval_requests par ON (
        bcf.id = par.flag_id 
        AND par.child_id = $3
        AND par.status IN ('pending', 'approved')
        AND par.expires_at > NOW()
      )
      WHERE bcf.book_id = $1 
        AND bcf.page_number = $2 
        AND bcf.assigned_child_id = $3
    `, [bookId, pageNumber, session.user.id]);

    if (flagResult.rows.length === 0) {
      // No flag - page is accessible
      return res.status(200).json({
        accessible: true,
        flagged: false
      });
    }

    const flag = flagResult.rows[0];

    // Check if already approved
    if (flag.status === 'approved') {
      return res.status(200).json({
        accessible: true,
        flagged: true,
        approved: true,
        flag: {
          reason: flag.flag_reason,
          severity: flag.severity,
          ageRecommendation: flag.age_recommendation
        }
      });
    }

    // Check if there's an active approval request
    if (flag.request_id && flag.request_status === 'approved') {
      return res.status(200).json({
        accessible: true,
        flagged: true,
        approved: true,
        temporaryApproval: true,
        flag: {
          reason: flag.flag_reason,
          severity: flag.severity,
          ageRecommendation: flag.age_recommendation
        }
      });
    }

    if (flag.request_id && flag.request_status === 'pending') {
      return res.status(200).json({
        accessible: false,
        flagged: true,
        pendingApproval: true,
        requestId: flag.request_id,
        expiresAt: flag.request_expires,
        flag: {
          reason: flag.flag_reason,
          severity: flag.severity,
          ageRecommendation: flag.age_recommendation,
          contentExcerpt: flag.content_excerpt
        }
      });
    }

    // Flagged but no request yet
    return res.status(200).json({
      accessible: false,
      flagged: true,
      requiresApproval: true,
      flag: {
        id: flag.id,
        reason: flag.flag_reason,
        severity: flag.severity,
        ageRecommendation: flag.age_recommendation,
        contentExcerpt: flag.content_excerpt
      }
    });

  } catch (error) {
    console.error('[Check Page Access] Error:', error);
    return res.status(500).json({
      error: 'Failed to check page access',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
