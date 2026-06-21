/**
 * Family Learning Teams API
 *
 * Parent-facing CRUD for learning teams.
 *
 * GET  /api/family/teams?action=list                    — list parent's teams
 * GET  /api/family/teams?action=get&teamId=...          — get team with members
 * GET  /api/family/teams?action=children                — list parent's children
 * POST /api/family/teams?action=create                   — create team
 * POST /api/family/teams?action=update&teamId=...        — update team settings
 * POST /api/family/teams?action=add-member&teamId=...    — add child to team
 * POST /api/family/teams?action=remove-member&teamId=... — remove child from team
 * POST /api/family/teams?action=create-activity&teamId=... — create team activity
 * DELETE /api/family/teams?teamId=...                    — deactivate team
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
      case 'DELETE':
        return handleDelete(req, res, userId, teamService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[Family Teams API] Error:', error);
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
      const teams = await teamService.getTeamsByParent(userId);
      return res.status(200).json({ teams });
    }

    case 'get': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      const team = await teamService.getTeamWithMembers(teamId);
      if (!team) return res.status(404).json({ error: 'Team not found' });
      if (team.parentUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      return res.status(200).json({ team });
    }

    case 'children': {
      const children = await teamService.getChildrenForParent(userId);
      return res.status(200).json({ children });
    }

    case 'activities': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      const team = await teamService.getTeam(teamId);
      if (!team) return res.status(404).json({ error: 'Team not found' });
      if (team.parentUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

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
    case 'create': {
      const { name, description, teamEmoji, maxMembers, infoFlowLevel,
              sharedActivitiesEnabled, peerComparisonEnabled, teamChallengesEnabled } = req.body;

      if (!name) return res.status(400).json({ error: 'Team name required' });

      const team = await teamService.createTeam(userId, {
        name,
        description,
        teamEmoji,
        maxMembers,
        infoFlowLevel,
        sharedActivitiesEnabled,
        peerComparisonEnabled,
        teamChallengesEnabled,
      });
      return res.status(201).json({ team });
    }

    case 'update': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      const team = await teamService.getTeam(teamId);
      if (!team) return res.status(404).json({ error: 'Team not found' });
      if (team.parentUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const updated = await teamService.updateTeam(teamId, req.body);
      return res.status(200).json({ team: updated });
    }

    case 'add-member': {
      const teamId = asSingleQuery(req.query.teamId);
      const { childUserId, role, displayNameToTeam } = req.body;

      if (!teamId || !childUserId) return res.status(400).json({ error: 'teamId and childUserId required' });

      // Verify parent-child relationship
      const verifyResult = await dbPool.query(
        'SELECT 1 FROM users WHERE id = $1 AND parent_user_id = $2',
        [childUserId, userId]
      );
      if (verifyResult.rows.length === 0) return res.status(403).json({ error: 'Not your child' });

      const member = await teamService.addMember(teamId, childUserId, { role, displayNameToTeam });
      return res.status(201).json({ member });
    }

    case 'remove-member': {
      const teamId = asSingleQuery(req.query.teamId);
      const { childUserId } = req.body;

      if (!teamId || !childUserId) return res.status(400).json({ error: 'teamId and childUserId required' });

      await teamService.removeMember(teamId, childUserId);
      return res.status(200).json({ success: true });
    }

    case 'create-activity': {
      const teamId = asSingleQuery(req.query.teamId);
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      const team = await teamService.getTeam(teamId);
      if (!team) return res.status(404).json({ error: 'Team not found' });
      if (team.parentUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

      const activity = await teamService.createTeamActivity(teamId, req.body);
      return res.status(201).json({ activity });
    }

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  teamService: ReturnType<typeof getLearningTeamService>
) {
  const teamId = asSingleQuery(req.query.teamId);
  if (!teamId) return res.status(400).json({ error: 'teamId required' });

  const team = await teamService.getTeam(teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.parentUserId !== userId) return res.status(403).json({ error: 'Not authorized' });

  await teamService.deleteTeam(teamId);
  return res.status(200).json({ success: true });
}
