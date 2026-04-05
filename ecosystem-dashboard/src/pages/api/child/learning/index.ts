/**
 * Child Learning API
 * 
 * Endpoints for managing child's Personal Interest Catalog (PIC),
 * Knowledge Base, and learning progress.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import {
  getAllInterests,
  getTopInterests,
  addInterestManually,
  getKnowledgeEntries,
  getChildAchievements,
  buildPersonalizationContext,
} from '@/lib/platform/child-learning-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  // GET: Fetch learning data for a child
  if (req.method === 'GET') {
    try {
      const { childId, type } = req.query;
      const targetChildId = (childId as string) || user.id;

      // Verify access (parent can view their children, child can view self)
      // TODO: Add proper parent-child relationship check

      switch (type) {
        case 'interests':
          const interests = await getAllInterests(targetChildId);
          return res.status(200).json({ interests });

        case 'top-interests':
          const limit = parseInt(req.query.limit as string) || 10;
          const topInterests = await getTopInterests(targetChildId, limit);
          return res.status(200).json({ interests: topInterests });

        case 'knowledge':
          const category = req.query.category as string;
          const knowledge = await getKnowledgeEntries(targetChildId, {
            category: category as any,
            limit: 50,
          });
          return res.status(200).json({ knowledge });

        case 'achievements':
          const onlyCompleted = req.query.completed === 'true';
          const achievements = await getChildAchievements(targetChildId, onlyCompleted);
          return res.status(200).json({ achievements });

        case 'context':
          const context = await buildPersonalizationContext(targetChildId);
          return res.status(200).json({ context });

        default:
          // Return overview
          const [allInterests, allAchievements, personalizationContext] = await Promise.all([
            getTopInterests(targetChildId, 5),
            getChildAchievements(targetChildId, true),
            buildPersonalizationContext(targetChildId),
          ]);

          return res.status(200).json({
            interests: allInterests,
            achievements: allAchievements.slice(0, 5),
            context: personalizationContext,
          });
      }
    } catch (error) {
      console.error('[Child Learning API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch learning data' });
    }
  }

  // POST: Add interest manually (parent action)
  if (req.method === 'POST') {
    try {
      const { childId, interestName, category, parentNotes } = req.body;

      if (!childId || !interestName || !category) {
        return res.status(400).json({ error: 'childId, interestName, and category are required' });
      }

      // TODO: Verify parent has access to this child

      const interest = await addInterestManually(childId, interestName, category, parentNotes);
      return res.status(201).json({ interest });
    } catch (error) {
      console.error('[Child Learning API] Error:', error);
      return res.status(500).json({ error: 'Failed to add interest' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
