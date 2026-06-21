/**
 * Kids Personal Context Graph (PCG) API
 * 
 * Provides access to child's knowledge, progress, achievements, and context
 * for AI characters and connected activities.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { getKidsPCGService } from '@/domains/learning/entities/child-pcg';
import type { KidsPCGService } from '@/domains/learning/entities/child-pcg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;
  const pcgService = getKidsPCGService(pool);

  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res, user, pcgService);
      case 'POST':
        return handlePost(req, res, user, pcgService);
      case 'PUT':
        return handlePut(req, res, user, pcgService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[PCG API] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  pcgService: KidsPCGService
) {
  const { action, childId } = req.query;

  const profile = await pcgService.getOrCreateProfile(user.id);
  const targetChildId = (childId as string) || profile.id;

  if (targetChildId !== profile.id && user.accountType !== 'parent') {
    return res.status(403).json({ error: 'Access denied' });
  }

  switch (action) {
    case 'profile':
      return res.json({ profile });

    case 'context':
      const context = await pcgService.getChildContext(targetChildId);
      return res.json({ context });

    case 'context-summary':
      const summary = await pcgService.generateContextSummary(targetChildId);
      return res.json({ summary });

    case 'knowledge':
      const { sourceTypes, knowledgeTypes, categories, limit } = req.query;
      const knowledge = await pcgService.getRelevantKnowledge(targetChildId, {
        sourceTypes: sourceTypes ? (sourceTypes as string).split(',') : undefined,
        knowledgeTypes: knowledgeTypes ? (knowledgeTypes as string).split(',') : undefined,
        categories: categories ? (categories as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      return res.json({ knowledge });

    case 'search-knowledge':
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }
      const searchResults = await pcgService.searchKnowledge(targetChildId, q as string);
      return res.json({ results: searchResults });

    case 'progress':
      const { category } = req.query;
      const progress = await pcgService.getProgress(targetChildId, category as string);
      return res.json({ progress });

    case 'achievements':
      const achievements = await pcgService.getAchievements(targetChildId);
      return res.json({ achievements });

    case 'characters':
      const characters = await pcgService.getCharacterInteractions(targetChildId);
      return res.json({ characters });

    case 'activities':
      const activityLimit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await pcgService.getRecentActivities(targetChildId, activityLimit);
      return res.json({ activities });

    default:
      return res.json({ profile });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  pcgService: KidsPCGService
) {
  const { action } = req.query;
  const profile = await pcgService.getOrCreateProfile(user.id);

  switch (action) {
    case 'knowledge':
      const knowledgeEntry = await pcgService.addKnowledge({
        childId: profile.id,
        ...req.body,
      });
      return res.json({ entry: knowledgeEntry });

    case 'progress':
      const { category, metricName, value, incrementStreak, targetValue, unit } = req.body;
      const progressEntry = await pcgService.updateProgress(
        profile.id,
        category,
        metricName,
        value,
        { incrementStreak, targetValue, unit }
      );

      const newAchievements = await pcgService.checkAndAwardAchievements(profile.id);

      return res.json({
        progress: progressEntry,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      });

    case 'character-interaction':
      const { characterId, characterName, topic, memorableMoment } = req.body;
      const interaction = await pcgService.recordCharacterInteraction(
        profile.id,
        characterId,
        characterName,
        topic,
        memorableMoment
      );
      return res.json({ interaction });

    case 'activity':
      const activityEntry = await pcgService.logActivity({
        childId: profile.id,
        ...req.body,
      });
      return res.json({ activity: activityEntry });

    case 'check-achievements':
      const achievements = await pcgService.checkAndAwardAchievements(profile.id);
      return res.json({ newAchievements: achievements });

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  pcgService: KidsPCGService
) {
  const { action } = req.query;
  const profile = await pcgService.getOrCreateProfile(user.id);

  switch (action) {
    case 'profile':
      const updatedProfile = await pcgService.updateProfile(profile.id, req.body);
      return res.json({ profile: updatedProfile });

    default:
      return res.status(400).json({ error: 'Unknown action' });
  }
}
