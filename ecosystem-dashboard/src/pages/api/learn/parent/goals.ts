/**
 * Parent Goals API — CRUD for parent-set learning goals that steer the planner.
 *
 * POST   /api/learn/parent/goals          → create a goal
 * GET    /api/learn/parent/goals          → list goals for a child
 * PATCH  /api/learn/parent/goals          → complete or cancel a goal
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { getParentGoalService } from '@/domains/learning/parent/parent-goal-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentId = (session.user as { id?: string }).id || session.user.email || 'unknown';

  if (req.method === 'POST') {
    const { childId, title, description, skillCodes, durationDays } = req.body;

    if (!childId || !title || !Array.isArray(skillCodes) || skillCodes.length === 0) {
      return res.status(400).json({
        error: 'childId, title, and non-empty skillCodes array are required',
      });
    }

    const goal = getParentGoalService().createGoal({
      childId,
      parentId,
      title,
      description,
      skillCodes,
      durationDays,
    });

    return res.status(201).json(goal);
  }

  if (req.method === 'GET') {
    const childId = (req.query.childId as string || '').trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const includeInactive = req.query.includeInactive === 'true';
    const goals = includeInactive
      ? getParentGoalService().getAllGoals(childId)
      : getParentGoalService().getActiveGoals(childId);

    return res.status(200).json({ goals });
  }

  if (req.method === 'PATCH') {
    const { goalId, action } = req.body;
    if (!goalId || !['complete', 'cancel'].includes(action)) {
      return res.status(400).json({ error: 'goalId and action (complete|cancel) are required' });
    }

    const goal =
      action === 'complete'
        ? getParentGoalService().completeGoal(goalId)
        : getParentGoalService().cancelGoal(goalId);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    return res.status(200).json(goal);
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  return res.status(405).json({ error: 'Method not allowed' });
}
