import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import { getLearningSessionService, type CreateLearningSessionInput, type LearningSessionStatus } from '@/lib/kids-pic/LearningSessionService';
import { getLearningAccessState } from '@/lib/kids-pic/learning-access';
import dbPool from '@/lib/db/client';
import { readUserId } from './attempt';

interface CreateSessionRequestBody {
  childId?: unknown;
  ownerId?: unknown;
  mode?: unknown;
  status?: unknown;
  plan?: unknown;
  activities?: unknown;
  outcomes?: unknown;
  metadata?: unknown;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const validation = validateCreateSessionPayload((req.body || {}) as CreateSessionRequestBody);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    // Don't even start a session when the child is out of allowed hours / daily time.
    const access = await getLearningAccessState(dbPool, readUserId(session));
    if (!access.allowed) {
      return res.status(403).json({
        error: 'Learning time limit reached',
        message: access.reason || 'Learning is currently unavailable.',
        usageLimitReached: true,
      });
    }

    const created = await getLearningSessionService().createSession(validation.value);

    return res.status(201).json({
      session: created,
      source: 'learning_session_service',
    });
  } catch (error) {
    console.error('[api/learn/session] failed:', error);
    return res.status(500).json({ error: 'Failed to create learning session' });
  }
}

export function validateCreateSessionPayload(body: CreateSessionRequestBody):
  | { ok: true; value: CreateLearningSessionInput }
  | { ok: false; error: string } {
  const childId = String(body.childId || '').trim();
  if (!childId) {
    return { ok: false, error: 'childId is required' };
  }

  if (body.activities !== undefined && !Array.isArray(body.activities)) {
    return { ok: false, error: 'activities must be an array when provided' };
  }

  if (body.plan !== undefined && !isObject(body.plan)) {
    return { ok: false, error: 'plan must be an object when provided' };
  }

  if (body.outcomes !== undefined && !isObject(body.outcomes)) {
    return { ok: false, error: 'outcomes must be an object when provided' };
  }

  if (body.metadata !== undefined && !isObject(body.metadata)) {
    return { ok: false, error: 'metadata must be an object when provided' };
  }

  if (body.status !== undefined && !isSessionStatus(body.status)) {
    return { ok: false, error: 'status must be one of: started, in_progress, completed, abandoned' };
  }

  return {
    ok: true,
    value: {
      childId,
      ownerId: body.ownerId ? String(body.ownerId).trim() : undefined,
      mode: body.mode ? String(body.mode).trim() : undefined,
      status: body.status as LearningSessionStatus | undefined,
      plan: body.plan as Record<string, unknown> | undefined,
      activities: body.activities as unknown[] | undefined,
      outcomes: body.outcomes as Record<string, unknown> | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSessionStatus(value: unknown): value is LearningSessionStatus {
  return value === 'started' || value === 'in_progress' || value === 'completed' || value === 'abandoned';
}
