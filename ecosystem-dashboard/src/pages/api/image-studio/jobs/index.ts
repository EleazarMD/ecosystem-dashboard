/**
 * Image Generation Jobs List API
 * 
 * GET: List all jobs for the current user (with pagination)
 * 
 * Multi-tenant compliant - users can only see their own jobs within their tenant.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

interface JobSummary {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: { percent: number; message: string };
  prompt: string;
  model: string;
  resultUrl?: string;
  generatedImageId?: string;
  createdAt: string;
  completedAt?: string;
}

interface ListJobsResponse {
  success: boolean;
  jobs?: JobSummary[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListJobsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
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

  // Parse query parameters
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string; // Optional filter by status
  const activeOnly = req.query.active === 'true'; // Only pending/processing jobs

  try {
    let whereClause = `user_id = $1 AND (tenant_id = $2 OR ($2 IS NULL AND tenant_id IS NULL))`;
    const params: any[] = [userId, tenantId];
    let paramIndex = 3;

    if (activeOnly) {
      whereClause += ` AND status IN ('pending', 'processing')`;
    } else if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM image_generation_jobs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get jobs with pagination
    const jobsResult = await pool.query(`
      SELECT 
        id, status, progress, prompt, model,
        result_url, generated_image_id,
        created_at, completed_at
      FROM image_generation_jobs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const jobs: JobSummary[] = jobsResult.rows.map(row => ({
      id: row.id,
      status: row.status,
      progress: row.progress || { percent: 0, message: 'Queued' },
      prompt: row.prompt.substring(0, 100) + (row.prompt.length > 100 ? '...' : ''),
      model: row.model,
      resultUrl: row.result_url,
      generatedImageId: row.generated_image_id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));

    return res.status(200).json({
      success: true,
      jobs,
      total,
      hasMore: offset + jobs.length < total,
    });

  } catch (error) {
    console.error('[Image Jobs API] Failed to list jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
    });
  }
}
