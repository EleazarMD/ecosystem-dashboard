/**
 * Research Session Status API
 * GET /api/research-lab/session/status?sessionId=xxx
 * 
 * Check the status of an async deep research session.
 * Checks in-memory cache first (fast), falls back to database (survives navigation/restart).
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from './create';
import { getResearchSession } from '@/lib/db/research-storage';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Try in-memory cache first (fast path for active sessions)
    const memSession = getSession(sessionId);

    if (memSession) {
      return res.status(200).json({
        sessionId: memSession.sessionId,
        status: memSession.status,
        question: memSession.question,
        model: memSession.model,
        createdAt: memSession.createdAt,
        completedAt: memSession.completedAt,
        report: memSession.status === 'completed' ? memSession.report : undefined,
        sources: memSession.status === 'completed' ? memSession.sources : undefined,
        cost: memSession.cost,
        processingTime: memSession.completedAt 
          ? memSession.completedAt - memSession.createdAt 
          : Date.now() - memSession.createdAt,
      });
    }

    // Fall back to database (survives server restart / navigation)
    const dbSession = await getResearchSession(sessionId);

    if (!dbSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const createdMs = dbSession.created_at ? new Date(dbSession.created_at).getTime() : Date.now();
    const completedMs = dbSession.completed_at ? new Date(dbSession.completed_at).getTime() : undefined;

    return res.status(200).json({
      sessionId: dbSession.session_id,
      status: dbSession.status === 'in_progress' ? 'processing' : dbSession.status,
      question: dbSession.question,
      model: dbSession.model,
      createdAt: createdMs,
      completedAt: completedMs,
      report: dbSession.status === 'completed' ? dbSession.report : undefined,
      sources: dbSession.status === 'completed' ? (dbSession.current_sources || []) : undefined,
      cost: dbSession.actual_cost ? Number(dbSession.actual_cost) : undefined,
      progress: dbSession.progress,
      currentStep: dbSession.current_step,
      errorMessage: dbSession.error_message,
      processingTime: completedMs
        ? completedMs - createdMs
        : Date.now() - createdMs,
    });

  } catch (error) {
    console.error('[Session Status] Error:', error);
    return res.status(500).json({
      error: 'Failed to get session status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
