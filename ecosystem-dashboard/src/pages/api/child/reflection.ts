/**
 * POST /api/child/reflection
 *
 * Records a learner reflection (metacognition check-in) after a step.
 * The child self-assesses difficulty: easy / just-right / hard.
 * Stored in LearnerMemory for tutor warm-up context next session.
 *
 * Contract: docs/LEARNING_PATH_STUDIO_REVIEW_2026-06.md §3.D
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getLearnerMemory } from '@/domains/learning/learner';
import { logChildActivity } from '@/lib/platform/content-filter-service';
import { readUserId } from '../learn/attempt';

interface ReflectionRequest {
  skillCode?: string;
  stepTitle?: string;
  difficultyRating: 'easy' | 'just-right' | 'hard';
  note?: string;
  wasCompleted: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const childId = readUserId(session);
  if (!childId) {
    return res.status(401).json({ error: 'No user id in session' });
  }

  const { skillCode, stepTitle, difficultyRating, note, wasCompleted } = req.body as ReflectionRequest;

  if (!difficultyRating || !['easy', 'just-right', 'hard'].includes(difficultyRating)) {
    return res.status(400).json({ error: 'difficultyRating must be easy, just-right, or hard' });
  }

  // Record in learner memory
  getLearnerMemory().recordReflection({
    childId,
    timestamp: Date.now(),
    skillCode,
    stepTitle,
    difficultyRating,
    note,
    wasCompleted,
  });

  // Log as child activity for audit trail
  try {
    await logChildActivity(childId, 'learner_reflection', {
      metadata: {
        skillCode,
        stepTitle,
        difficultyRating,
        wasCompleted,
        note: note?.slice(0, 200),
      },
    });
  } catch {
    // best-effort logging
  }

  return res.status(200).json({ ok: true });
}
