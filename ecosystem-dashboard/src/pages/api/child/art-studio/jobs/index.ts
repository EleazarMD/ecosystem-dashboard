/**
 * Child Art Studio - Jobs List API
 * 
 * GET: List all jobs for the authenticated child
 * Multi-tenant compliant - children can only see their own jobs.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface JobListResponse {
  success: boolean;
  jobs?: Array<{
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: {
      percent: number;
      message: string;
    };
    prompt: string;
    style?: string;
    styleLabel?: string;
    resultUrl?: string;
    createdAt: string;
    completedAt?: string;
  }>;
  total?: number;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobListResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  const userId = (session.user as any).id;
  const accountType = (session.user as any).accountType || 'adult';
  
  // Only allow child accounts to use this endpoint
  if (accountType !== 'child') {
    return res.status(403).json({
      success: false,
      error: 'This endpoint is for child accounts only',
    });
  }
  
  // Get tenant_id for multi-tenant isolation
  let tenantId = (session.user as any).tenantId || (session.user as any).defaultTenantId || null;
  if (!tenantId) {
    try {
      const tenantResult = await pool.query(
        `SELECT tenant_id FROM tenant_memberships WHERE user_id = $1 ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END LIMIT 1`,
        [userId]
      );
      tenantId = tenantResult.rows[0]?.tenant_id || null;
    } catch (e) {
      console.log('[Child Art Jobs API] Could not fetch tenant_id:', e);
    }
  }

  try {
    // Get all jobs for this child, ordered by creation date (newest first)
    // Only show jobs from the last 24 hours to keep the list manageable
    const result = await pool.query(`
      SELECT 
        id, status, progress, prompt, model,
        result_url, result_filename, error_message,
        created_at, completed_at, metadata
      FROM image_generation_jobs
      WHERE user_id = $1
        AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))
        AND is_child_request = true
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId, tenantId]);

    const jobs = result.rows.map(row => {
      const metadata = row.metadata || {};
      const percent = row.progress?.percent || 0;
      
      // Friendly progress messages
      let progressMessage = 'Getting ready...';
      if (row.status === 'pending') {
        progressMessage = 'Waiting in line... 🎨';
      } else if (row.status === 'processing') {
        if (percent < 30) {
          progressMessage = 'Starting to draw... ✏️';
        } else if (percent < 60) {
          progressMessage = 'Adding colors... 🎨';
        } else if (percent < 90) {
          progressMessage = 'Almost done... ✨';
        } else {
          progressMessage = 'Finishing touches... 🌟';
        }
      } else if (row.status === 'completed') {
        progressMessage = 'Ready! 🎉';
      } else if (row.status === 'failed') {
        progressMessage = 'Oops! 😕';
      } else if (row.status === 'cancelled') {
        progressMessage = 'Cancelled';
      }

      return {
        id: row.id,
        status: row.status,
        progress: {
          percent,
          message: progressMessage,
        },
        prompt: row.prompt,
        style: metadata.style,
        styleLabel: metadata.styleLabel,
        resultUrl: row.result_url,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      };
    });

    return res.status(200).json({
      success: true,
      jobs,
      total: jobs.length,
    });

  } catch (error) {
    console.error('[Child Art Jobs API] Failed to list jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
      message: 'Oops! Something went wrong. Please try again! 🎨',
    });
  }
}
