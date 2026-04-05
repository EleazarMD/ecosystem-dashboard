import type { NextApiRequest, NextApiResponse } from 'next';
import { getJobStatus } from '@/lib/script-generation-jobs';

/**
 * Get status of a script generation job
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
    return res.status(400).json({ error: 'jobId is required' });
  }

  const job = getJobStatus(jobId);
  console.log(`📊 [generation-status] Checking job ${jobId}: ${job ? `found (${job.status}, ${job.progress}%)` : 'NOT FOUND'}`);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json({
    status: job.status,
    progress: job.progress,
    message: job.message,
    currentStage: job.currentStage,
    result: job.result,
    error: job.error,
  });
}
