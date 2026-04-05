/**
 * Child Art Studio - Job Status API
 * 
 * GET: Get status of a specific job
 * DELETE: Cancel a pending job
 * 
 * Multi-tenant compliant - children can only access their own jobs within their tenant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface JobStatusResponse {
  success: boolean;
  job?: {
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
    resultFilename?: string;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
  };
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobStatusResponse>
) {
  const { jobId } = req.query;
  
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Job ID is required',
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

  if (req.method === 'GET') {
    return handleGetStatus(req, res, jobId, userId, tenantId);
  } else if (req.method === 'DELETE') {
    return handleCancelJob(req, res, jobId, userId, tenantId);
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }
}

async function handleGetStatus(
  req: NextApiRequest,
  res: NextApiResponse<JobStatusResponse>,
  jobId: string,
  userId: string,
  tenantId: string | null
) {
  try {
    // Query with tenant isolation - child can only see their own jobs
    const result = await pool.query(`
      SELECT 
        id, status, progress, prompt, model,
        result_url, result_filename, error_message,
        created_at, completed_at, metadata
      FROM image_generation_jobs
      WHERE id = $1 
        AND user_id = $2
        AND (tenant_id = $3 OR ($3 IS NULL AND tenant_id IS NULL))
        AND is_child_request = true
    `, [jobId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: "We couldn't find that artwork. It might have expired. 🎨",
      });
    }

    const row = result.rows[0];
    const metadata = row.metadata || {};
    
    // Friendly progress messages for children
    let progressMessage = 'Getting ready...';
    const percent = row.progress?.percent || 0;
    
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
      progressMessage = 'Your masterpiece is ready! 🎉';
    } else if (row.status === 'failed') {
      progressMessage = 'Oops! Something went wrong. 😕';
    } else if (row.status === 'cancelled') {
      progressMessage = 'Cancelled';
    }
    
    return res.status(200).json({
      success: true,
      job: {
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
        resultFilename: row.result_filename,
        errorMessage: row.error_message,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      },
    });

  } catch (error) {
    console.error('[Child Art Jobs API] Failed to get job status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      message: 'Oops! Something went wrong. Please try again! 🎨',
    });
  }
}

async function handleCancelJob(
  req: NextApiRequest,
  res: NextApiResponse<JobStatusResponse>,
  jobId: string,
  userId: string,
  tenantId: string | null
) {
  try {
    // Only allow cancelling pending jobs - with tenant isolation
    const result = await pool.query(`
      UPDATE image_generation_jobs
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE id = $1 
        AND user_id = $2
        AND (tenant_id = $3 OR ($3 IS NULL AND tenant_id IS NULL))
        AND is_child_request = true
        AND status = 'pending'
      RETURNING id, status
    `, [jobId, userId, tenantId]);

    if (result.rows.length === 0) {
      // Check if job exists but can't be cancelled
      const checkResult = await pool.query(`
        SELECT status FROM image_generation_jobs
        WHERE id = $1 AND user_id = $2 AND is_child_request = true
      `, [jobId, userId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          message: "We couldn't find that artwork. 🎨",
        });
      }

      const currentStatus = checkResult.rows[0].status;
      return res.status(400).json({
        success: false,
        error: `Cannot cancel job with status: ${currentStatus}`,
        message: currentStatus === 'processing' 
          ? "Your artwork is already being created! It'll be done soon. ✨"
          : "This artwork can't be cancelled anymore. 🎨",
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Artwork cancelled! You can create something new. 🎨',
    });

  } catch (error) {
    console.error('[Child Art Jobs API] Failed to cancel job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
      message: 'Oops! Something went wrong. Please try again! 🎨',
    });
  }
}
