/**
 * Creative Activity Session API
 * 
 * Endpoints for managing a specific creative activity session.
 * 
 * GET /api/child/creative-activity/[sessionId] - Get session state
 * POST /api/child/creative-activity/[sessionId] - Submit a design choice
 * DELETE /api/child/creative-activity/[sessionId] - Cancel the activity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import {
  getSession,
  processDesignChoice,
  cancelActivity,
} from '@/lib/platform/creative-activity-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await getChildServiceContext(req, res);
  if (!context) return;

  const { sessionId } = req.query;

  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // GET: Get session state
  if (req.method === 'GET') {
    try {
      const session = getSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      if (session.userId !== context.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const currentStep = session.template.designSteps[session.currentStepIndex];

      return res.status(200).json({
        session,
        currentStep,
        options: currentStep?.options,
        isComplete: session.currentStepIndex >= session.template.designSteps.length,
      });
    } catch (error) {
      console.error('[Creative Activity API] Error getting session:', error);
      return res.status(500).json({ error: 'Failed to get session' });
    }
  }

  // POST: Submit a design choice
  if (req.method === 'POST') {
    try {
      const { choiceId, customValue } = req.body;

      const session = getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      if (session.userId !== context.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const result = await processDesignChoice(sessionId, choiceId, customValue);

      return res.status(200).json({
        session: result.session,
        message: result.message,
        currentStep: result.nextStep,
        options: result.nextStep?.options,
        isComplete: result.isComplete,
        summary: result.summary,
      });
    } catch (error: any) {
      console.error('[Creative Activity API] Error processing choice:', error);
      return res.status(400).json({ error: error.message || 'Failed to process choice' });
    }
  }

  // DELETE: Cancel the activity
  if (req.method === 'DELETE') {
    try {
      const session = getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify ownership
      if (session.userId !== context.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      cancelActivity(sessionId);

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Creative Activity API] Error cancelling activity:', error);
      return res.status(500).json({ error: 'Failed to cancel activity' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
