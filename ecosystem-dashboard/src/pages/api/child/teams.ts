/**
 * Child Learning Teams API
 *
 * Child-facing view of their learning teams.
 *
 * GET /api/child/teams?action=list              — list child's teams
 * GET /api/child/teams?action=teammates&teamId=... — get teammates (info-flow controlled)
 * GET /api/child/teams?action=activities&teamId=... — get team activities
 * POST /api/child/teams?action=complete-activity  — mark activity as completed
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { getLearningTeamService } from '@/lib/learning/LearningTeamService';

function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = readUserId(session);
  const teamService = getLearningTeamService(dbPool);
  const action = asSingleQuery(req.query.action);

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, userId, action, teamService);
      case 'POST':
        return handlePost(req, res, userId, action, teamService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[Child Teams API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  action: string,
  teamService: ReturnType<typeof getLearningTeamService>
) {
  switch (action) {
    case 'list': {
      const teams = await teamService.getTeamsByChild(userId);
      return res.status(200).json({ teams });
    }

    case 'teammates': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      // Verify child is a member of this team
      const teams = await teamService.getTeamsByChild(userId);
      if (!teams.some((t) => t.id === teamId)) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      const teammates = await teamService.getTeammateViews(teamId, userId);
      return res.status(200).json({ teammates });
    }

    case 'activities': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      // Verify child is a member
      const teams = await teamService.getTeamsByChild(userId);
      if (!teams.some((t) => t.id === teamId)) {
        return res.status(403).json({ error: 'Not a team member' });
      }

      const status = asSingleQuery(req.query.status) || undefined;
      const activities = await teamService.getTeamActivities(teamId, status);
      return res.status(200).json({ activities });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  action: string,
  teamService: ReturnType<typeof getLearningTeamService>
) {
  switch (action) {
    case 'complete-activity': {
      const { activityId, score, timeSpentSeconds } = req.body;
      if (!activityId) return res.status(400).json({ error: 'activityId required' });

      await teamService.updateParticipantStatus(activityId, userId, 'completed', {
        score,
        timeSpentSeconds,
      });
      return res.status(200).json({ success: true });
    }

    case 'start-activity': {
      const { activityId } = req.body;
      if (!activityId) return res.status(400).json({ error: 'activityId required' });

      await teamService.updateParticipantStatus(activityId, userId, 'in_progress');
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
