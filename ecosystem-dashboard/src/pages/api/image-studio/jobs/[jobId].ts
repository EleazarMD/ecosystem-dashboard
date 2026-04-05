/**
 * Image Generation Job Status API
 * 
 * GET: Get status of a specific job
 * DELETE: Cancel a pending job
 * 
 * Multi-tenant compliant - users can only access their own jobs within their tenant.
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
    model: string;
    width: number;
    height: number;
    resultUrl?: string;
    resultFilename?: string;
    generatedImageId?: string;
    errorMessage?: string;
    generationTimeMs?: number;
    createdAt: string;
    startedAt?: string;
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
      console.log('[Image Jobs API] Could not fetch tenant_id:', e);
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
    // Query with tenant isolation - user can only see their own jobs
    const result = await pool.query(`
      SELECT 
        id, status, progress, prompt, model, width, height,
        result_url, result_filename, generated_image_id,
        error_message, generation_time_ms,
        created_at, started_at, completed_at
      FROM image_generation_jobs
      WHERE id = $1 
        AND user_id = $2
        AND (tenant_id = $3 OR ($3 IS NULL AND tenant_id IS NULL))
    `, [jobId, userId, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const row = result.rows[0];
    
    return res.status(200).json({
      success: true,
      job: {
        id: row.id,
        status: row.status,
        progress: row.progress || { percent: 0, message: 'Queued' },
        prompt: row.prompt,
        model: row.model,
        width: row.width,
        height: row.height,
        resultUrl: row.result_url,
        resultFilename: row.result_filename,
        generatedImageId: row.generated_image_id,
        errorMessage: row.error_message,
        generationTimeMs: row.generation_time_ms,
        createdAt: row.created_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
      },
    });

  } catch (error) {
    console.error('[Image Jobs API] Failed to get job status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job status',
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
        AND status = 'pending'
      RETURNING id, status
    `, [jobId, userId, tenantId]);

    if (result.rows.length === 0) {
      // Check if job exists but can't be cancelled
      const checkResult = await pool.query(`
        SELECT status FROM image_generation_jobs
        WHERE id = $1 AND user_id = $2
      `, [jobId, userId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      const currentStatus = checkResult.rows[0].status;
      return res.status(400).json({
        success: false,
        error: `Cannot cancel job with status: ${currentStatus}`,
        message: 'Only pending jobs can be cancelled',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job cancelled successfully',
    });

  } catch (error) {
    console.error('[Image Jobs API] Failed to cancel job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
    });
  }
}
