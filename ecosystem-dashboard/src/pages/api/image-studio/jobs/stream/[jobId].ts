import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import pool from '@/lib/db';

/**
 * Server-Sent Events (SSE) endpoint for streaming job progress
 * Allows real-time updates of image generation progress to the frontend
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  // Authenticate user
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = (session.user as any).id;
  const tenantId = (session.user as any).tenantId || (session.user as any).defaultTenantId || null;

  // Verify job belongs to user
  const jobCheck = await pool.query(`
    SELECT id FROM image_generation_jobs
    WHERE id = $1 
      AND user_id = $2
      AND (tenant_id = $3 OR ($3 IS NULL AND tenant_id IS NULL))
  `, [jobId, userId, tenantId]);

  if (jobCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', jobId })}\n\n`);

  let lastStatus = '';
  let lastProgress = 0;
  let pollCount = 0;
  const maxPolls = 120; // 10 minutes at 5 second intervals

  // Poll for job updates
  const pollInterval = setInterval(async () => {
    try {
      pollCount++;

      // Query job status
      const result = await pool.query(`
        SELECT 
          id, status, progress, result_url, result_filename,
          error_message, generation_time_ms, completed_at
        FROM image_generation_jobs
        WHERE id = $1
      `, [jobId]);

      if (result.rows.length === 0) {
        clearInterval(pollInterval);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
        res.end();
        return;
      }

      const job = result.rows[0];
      const currentStatus = job.status;
      const currentProgress = job.progress?.percent || 0;

      // Send update if status or progress changed
      if (currentStatus !== lastStatus || currentProgress !== lastProgress) {
        lastStatus = currentStatus;
        lastProgress = currentProgress;

        const update = {
          type: 'progress',
          jobId,
          status: currentStatus,
          progress: job.progress || { percent: 0, message: 'Queued' },
          timestamp: new Date().toISOString(),
        };

        res.write(`data: ${JSON.stringify(update)}\n\n`);
      }

      // If job completed or failed, send final message and close
      if (currentStatus === 'completed') {
        const finalUpdate = {
          type: 'completed',
          jobId,
          resultUrl: job.result_url,
          resultFilename: job.result_filename,
          generationTimeMs: job.generation_time_ms,
          completedAt: job.completed_at,
        };
        res.write(`data: ${JSON.stringify(finalUpdate)}\n\n`);
        clearInterval(pollInterval);
        res.end();
        return;
      } else if (currentStatus === 'failed') {
        const finalUpdate = {
          type: 'failed',
          jobId,
          errorMessage: job.error_message || 'Generation failed',
        };
        res.write(`data: ${JSON.stringify(finalUpdate)}\n\n`);
        clearInterval(pollInterval);
        res.end();
        return;
      }

      // Timeout after max polls
      if (pollCount >= maxPolls) {
        clearInterval(pollInterval);
        res.write(`data: ${JSON.stringify({ type: 'timeout', message: 'Job timed out' })}\n\n`);
        res.end();
        return;
      }
    } catch (error) {
      console.error('[SSE Stream] Error polling job:', error);
      clearInterval(pollInterval);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`);
      res.end();
    }
  }, 5000); // Poll every 5 seconds

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
    console.log(`[SSE Stream] Client disconnected from job ${jobId}`);
  });
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
