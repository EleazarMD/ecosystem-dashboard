/**
 * Creative Activity API
 * 
 * Endpoints for managing creative activities that connect Chat to Art-Studio.
 * 
 * GET /api/child/creative-activity - List available activities
 * POST /api/child/creative-activity - Start a new activity
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getChildServiceContext } from '@/lib/platform/child-service-middleware';
import {
  startCreativeActivity,
  getAvailableActivities,
  getAllActivities,
} from '@/lib/platform/creative-activity-service';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const context = await getChildServiceContext(req, res);
  if (!context) return;

  // GET: List available activities
  if (req.method === 'GET') {
    try {
      const { theme } = req.query;

      // Get child's theme if not specified
      let userTheme = theme as string;
      if (!userTheme && context.accountType === 'child') {
        const themeResult = await pool.query(
          'SELECT preferred_theme FROM users WHERE id = $1',
          [context.userId]
        );
        userTheme = themeResult.rows[0]?.preferred_theme || 'minecraft';
      }

      const activities = userTheme 
        ? getAvailableActivities(userTheme)
        : getAllActivities();

      return res.status(200).json({
        activities,
        theme: userTheme,
      });
    } catch (error) {
      console.error('[Creative Activity API] Error listing activities:', error);
      return res.status(500).json({ error: 'Failed to list activities' });
    }
  }

  // POST: Start a new activity
  if (req.method === 'POST') {
    try {
      const { templateId, characterId } = req.body;

      if (!templateId) {
        return res.status(400).json({ error: 'templateId is required' });
      }

      const result = await startCreativeActivity(
        context.userId,
        templateId,
        characterId
      );

      return res.status(201).json({
        session: result.session,
        welcomeMessage: result.welcomeMessage,
        currentStep: result.firstStep,
        options: result.firstStep.options,
      });
    } catch (error: any) {
      console.error('[Creative Activity API] Error starting activity:', error);
      return res.status(400).json({ error: error.message || 'Failed to start activity' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
