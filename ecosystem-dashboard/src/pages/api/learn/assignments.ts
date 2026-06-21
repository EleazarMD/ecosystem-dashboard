/**
 * Parent Assignment API — Phase 4
 *
 * POST   /api/learn/assignments          — create a new assignment
 * GET    /api/learn/assignments           — list assignments for a child
 * PATCH  /api/learn/assignments           — update an assignment (status, notes, due date)
 *
 * Parents create assignments targeting specific skills. The child's next
 * learning plan will prioritize these as "Parent Assignment" activities.
 */

import { randomUUID } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { authOptions } from '../auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { getAssignmentService } from '@/domains/learning/features/assignment-service';
import type {
  AssignmentStatus,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from '@/domains/learning/features/assignment-service';

function asSingleQuery(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] : value;
}

function readUserId(session: { user?: unknown } | null): string {
  const user = session?.user as { id?: unknown } | undefined;
  return typeof user?.id === 'string' ? user.id : '';
}

async function verifyParentChild(
  parentUserId: string,
  childId: string
): Promise<{ ok: boolean; childProfileId?: string; error?: string }> {
  try {
    const result = await dbPool.query(
      `SELECT u.id, cp.id as profile_id
       FROM users u
       LEFT JOIN child_profiles cp ON cp.user_id = u.id
       WHERE u.id = $1 AND u.parent_user_id = $2`,
      [childId, parentUserId]
    );
    if (result.rows.length === 0) {
      return { ok: false, error: 'Child not found or not linked to this parent' };
    }
    return {
      ok: true,
      childProfileId: result.rows[0].profile_id || childId,
    };
  } catch (error) {
    console.warn('[api/learn/assignments] parent-child verification failed:', error);
    return { ok: false, error: 'Verification unavailable' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parentUserId = readUserId(session);
  if (!parentUserId) {
    return res.status(401).json({ error: 'User ID not found in session' });
  }

  const service = getAssignmentService(dbPool);

  // ------------------------------------------------------------------
  // POST — create assignment
  // ------------------------------------------------------------------
  if (req.method === 'POST') {
    const body = (req.body || {}) as Partial<CreateAssignmentInput>;
    const childId = `${body.childId || ''}`.trim();
    const skillCode = `${body.skillCode || ''}`.trim();

    if (!childId || !skillCode) {
      return res.status(400).json({ error: 'childId and skillCode are required' });
    }

    const verified = await verifyParentChild(parentUserId, childId);
    if (!verified.ok) {
      return res.status(403).json({ error: verified.error });
    }

    try {
      const assignment = await service.createAssignment({
        childId: verified.childProfileId || childId,
        parentUserId,
        skillCode,
        title: body.title,
        notes: body.notes,
        dueDate: body.dueDate,
      });
      return res.status(201).json({ assignment });
    } catch (error) {
      console.error('[api/learn/assignments] create error:', error);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  // ------------------------------------------------------------------
  // GET — list assignments
  // ------------------------------------------------------------------
  if (req.method === 'GET') {
    const childId = asSingleQuery(req.query.childId).trim();
    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const verified = await verifyParentChild(parentUserId, childId);
    if (!verified.ok) {
      return res.status(403).json({ error: verified.error });
    }

    const status = asSingleQuery(req.query.status) as AssignmentStatus | '';

    try {
      const assignments = await service.listAssignments(
        verified.childProfileId || childId,
        status ? { status } : undefined
      );
      return res.status(200).json({ assignments });
    } catch (error) {
      console.error('[api/learn/assignments] list error:', error);
      return res.status(500).json({ error: 'Failed to list assignments' });
    }
  }

  // ------------------------------------------------------------------
  // PATCH — update assignment
  // ------------------------------------------------------------------
  if (req.method === 'PATCH') {
    const body = (req.body || {}) as UpdateAssignmentInput & { assignmentId?: string };
    const assignmentId = `${body.assignmentId || ''}`.trim();
    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required' });
    }

    try {
      const existing = await service.getAssignment(assignmentId);
      if (!existing) {
        return res.status(404).json({ error: 'Assignment not found' });
      }

      if (existing.parentUserId !== parentUserId) {
        return res.status(403).json({ error: 'Not authorized to modify this assignment' });
      }

      const updated = await service.updateAssignment(assignmentId, {
        status: body.status,
        title: body.title,
        notes: body.notes,
        dueDate: body.dueDate,
      });
      return res.status(200).json({ assignment: updated });
    } catch (error) {
      console.error('[api/learn/assignments] update error:', error);
      return res.status(500).json({ error: 'Failed to update assignment' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}
