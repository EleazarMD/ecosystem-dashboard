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

    if (session.status !== 'completed' && session.status !== 'failed') {
      return res.status(409).json({
        error: 'Session not yet completed',
        status: session.status,
        progress: session.progress,
        currentStep: session.current_step,
      });
    }

    const createdMs = session.created_at ? new Date(session.created_at).getTime() : Date.now();
    const completedMs = session.completed_at ? new Date(session.completed_at).getTime() : undefined;

    return res.status(200).json({
      sessionId: session.session_id,
      status: session.status,
      question: session.question,
      model: session.model,
      report: session.report,
      sources: session.current_sources || [],
      citations: session.citations,
      cost: session.actual_cost ? Number(session.actual_cost) : undefined,
      inputTokens: session.input_tokens,
      outputTokens: session.output_tokens,
      errorMessage: session.error_message,
      createdAt: createdMs,
      completedAt: completedMs,
      processingTime: completedMs ? completedMs - createdMs : undefined,
      sessionType: session.session_type || 'original',
      parentSessionId: session.parent_session_id,
    });

  } catch (error) {
    console.error('Error fetching session result:', error);
    res.status(500).json({
      error: 'Failed to fetch session result',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
