import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../../auth/[...nextauth]';
import { getLearningSessionService, type LearningSessionStatus, type UpdateLearningSessionInput } from '@/domains/learning/processes/session-loop';

interface UpdateSessionRequestBody {
  status?: unknown;
  endedAt?: unknown;
  durationSeconds?: unknown;
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

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = asSingleQuery(req.query.id).trim();
  if (!id) {
    return res.status(400).json({ error: 'Session id is required' });
  }

  try {
    const validation = validateUpdateSessionPayload((req.body || {}) as UpdateSessionRequestBody);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const updated = await getLearningSessionService().updateSession(id, validation.value);
    if (!updated) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json({
      session: updated,
      source: 'learning_session_service',
    });
  } catch (error) {
    console.error('[api/learn/session/:id] failed:', error);
    return res.status(500).json({ error: 'Failed to update learning session' });
  }
}

export function validateUpdateSessionPayload(body: UpdateSessionRequestBody):
  | { value: UpdateLearningSessionInput }
  | { error: string } {
  if (body.status !== undefined && !isSessionStatus(body.status)) {
    return { error: 'status must be one of: started, in_progress, completed, abandoned' };
  }

  if (body.endedAt !== undefined) {
    const endedAt = String(body.endedAt).trim();
    if (!endedAt || Number.isNaN(Date.parse(endedAt))) {
      return { error: 'endedAt must be a valid ISO date string when provided' };
    }
  }

  if (body.durationSeconds !== undefined) {
    const durationSeconds = Number(body.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return { error: 'durationSeconds must be a non-negative number when provided' };
    }
  }

  if (body.plan !== undefined && !isObject(body.plan)) {
    return { error: 'plan must be an object when provided' };
  }

  if (body.activities !== undefined && !Array.isArray(body.activities)) {
    return { error: 'activities must be an array when provided' };
  }

  if (body.outcomes !== undefined && !isObject(body.outcomes)) {
    return { error: 'outcomes must be an object when provided' };
  }

  if (body.metadata !== undefined && !isObject(body.metadata)) {
    return { error: 'metadata must be an object when provided' };
  }

  return {
    value: {
      status: body.status as LearningSessionStatus | undefined,
      endedAt: body.endedAt ? String(body.endedAt).trim() : undefined,
      durationSeconds: body.durationSeconds !== undefined ? Number(body.durationSeconds) : undefined,
      plan: body.plan as Record<string, unknown> | undefined,
      activities: body.activities as unknown[] | undefined,
      outcomes: body.outcomes as Record<string, unknown> | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    },
  };
}

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] || '' : value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSessionStatus(value: unknown): value is LearningSessionStatus {
  return value === 'started' || value === 'in_progress' || value === 'completed' || value === 'abandoned';
}
