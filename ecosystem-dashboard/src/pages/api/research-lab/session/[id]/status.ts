import type { NextApiRequest, NextApiResponse } from 'next';
import { getResearchSession } from '@/lib/db/research-storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await getResearchSession(id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const createdMs = session.created_at ? new Date(session.created_at).getTime() : Date.now();
    const completedMs = session.completed_at ? new Date(session.completed_at).getTime() : undefined;

    return res.status(200).json({
      sessionId: session.session_id,
      status: session.status === 'in_progress' ? 'processing' : session.status,
      question: session.question,
      model: session.model,
      progress: session.progress,
      currentStep: session.current_step,
      createdAt: createdMs,
      completedAt: completedMs,
      report: session.status === 'completed' ? session.report : undefined,
      sources: session.status === 'completed' ? (session.current_sources || []) : undefined,
      cost: session.actual_cost ? Number(session.actual_cost) : undefined,
      errorMessage: session.error_message,
      processingTime: completedMs
        ? completedMs - createdMs
        : Date.now() - createdMs,
    });

  } catch (error) {
    console.error('Error fetching session status:', error);
    res.status(500).json({
      error: 'Failed to fetch session status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
