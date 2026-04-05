import type { NextApiRequest, NextApiResponse } from 'next';
import { getAudioJobStatus } from '@/lib/audio-generation-jobs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const job = getAudioJobStatus(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  return res.status(200).json({
    status: job.status,
    progress: job.progress,
    message: job.message,
    currentTurn: job.currentTurn,
    totalTurns: job.totalTurns,
    phase: job.phase,
    phaseDetail: job.phaseDetail,
    estimatedTotalMs: job.estimatedTotalMs,
    result: job.result,
    error: job.error,
    elapsedMs: Date.now() - job.startedAt,
  });
}
