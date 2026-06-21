/**
 * Assignment Service — Phase 4
 *
 * CRUD operations for parent-assigned learning practice. Parents create
 * assignments targeting specific skills; the planner surfaces them as
 * priority objectives in the child's next plan. Assignments auto-complete
 * when the child answers an activity for that skill correctly.
 *
 * Uses the `learning_assignments` Postgres table (see migration
 * 20260620_learning_assignments_and_phase3_content.sql). Falls back to
 * in-memory store when the table is absent (pilot/no-DB mode).
 */

import type { Pool } from 'pg';

export type AssignmentStatus = 'assigned' | 'completed' | 'archived' | 'cancelled';

export interface LearningAssignment {
  id: string;
  childId: string;
  parentUserId: string;
  skillCode: string;
  title: string | null;
  notes: string | null;
  status: AssignmentStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateAssignmentInput {
  childId: string;
  parentUserId: string;
  skillCode: string;
  title?: string;
  notes?: string;
  dueDate?: string;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
  title?: string;
  notes?: string;
  dueDate?: string | null;
}

// ---------------------------------------------------------------------------
// In-memory fallback store (pilot mode)
// ---------------------------------------------------------------------------

interface InMemoryAssignment extends LearningAssignment {}

const inMemoryStore: InMemoryAssignment[] = [];
let inMemoryIdCounter = 0;

function toInMemoryId(): string {
  inMemoryIdCounter += 1;
  return `asg-mem-${inMemoryIdCounter}`;
}

function rowToAssignment(row: Record<string, unknown>): LearningAssignment {
  return {
    id: String(row.id),
    childId: String(row.child_id),
    parentUserId: String(row.parent_user_id),
    skillCode: String(row.skill_code),
    title: (row.title as string) || null,
    notes: (row.notes as string) || null,
    status: (row.status as AssignmentStatus) || 'assigned',
    dueDate: row.due_date ? String(row.due_date) : null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at as string).toISOString() : null,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AssignmentService {
  constructor(private pool: Pool) {}

  private async tableExists(): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "SELECT to_regclass('public.learning_assignments') AS reg"
      );
      return !!result.rows?.[0]?.reg;
    } catch {
      return false;
    }
  }

  async createAssignment(input: CreateAssignmentInput): Promise<LearningAssignment> {
    if (!input.childId || !input.parentUserId || !input.skillCode) {
      throw new Error('childId, parentUserId, and skillCode are required');
    }

    if (await this.tableExists()) {
      const result = await this.pool.query(
        `INSERT INTO learning_assignments (child_id, parent_user_id, skill_code, title, notes, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          input.childId,
          input.parentUserId,
          input.skillCode,
          input.title || null,
          input.notes || null,
          input.dueDate || null,
        ]
      );
      return rowToAssignment(result.rows[0]);
    }

    // In-memory fallback
    const now = new Date().toISOString();
    const assignment: InMemoryAssignment = {
      id: toInMemoryId(),
      childId: input.childId,
      parentUserId: input.parentUserId,
      skillCode: input.skillCode,
      title: input.title || null,
      notes: input.notes || null,
      status: 'assigned',
      dueDate: input.dueDate || null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    inMemoryStore.push(assignment);
    return assignment;
  }

  async listAssignments(
    childId: string,
    options?: { status?: AssignmentStatus; parentUserId?: string }
  ): Promise<LearningAssignment[]> {
    if (await this.tableExists()) {
      const conditions = ['child_id = $1'];
      const params: unknown[] = [childId];
      let paramIdx = 2;

      if (options?.status) {
        conditions.push(`status = $${paramIdx}`);
        params.push(options.status);
        paramIdx++;
      }
      if (options?.parentUserId) {
        conditions.push(`parent_user_id = $${paramIdx}`);
        params.push(options.parentUserId);
        paramIdx++;
      }

      const result = await this.pool.query(
        `SELECT * FROM learning_assignments
         WHERE ${conditions.join(' AND ')}
         ORDER BY due_date ASC NULLS LAST, created_at DESC`,
        params
      );
      return result.rows.map(rowToAssignment);
    }

    // In-memory fallback
    return inMemoryStore
      .filter((a) => a.childId === childId)
      .filter((a) => !options?.status || a.status === options.status)
      .filter((a) => !options?.parentUserId || a.parentUserId === options.parentUserId)
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  async updateAssignment(
    assignmentId: string,
    input: UpdateAssignmentInput
  ): Promise<LearningAssignment | null> {
    if (await this.tableExists()) {
      const sets: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (input.title !== undefined) {
        sets.push(`title = $${paramIdx}`);
        params.push(input.title);
        paramIdx++;
      }
      if (input.notes !== undefined) {
        sets.push(`notes = $${paramIdx}`);
        params.push(input.notes);
        paramIdx++;
      }
      if (input.dueDate !== undefined) {
        sets.push(`due_date = $${paramIdx}`);
        params.push(input.dueDate);
        paramIdx++;
      }
      if (input.status) {
        sets.push(`status = $${paramIdx}`);
        params.push(input.status);
        paramIdx++;
        if (input.status === 'completed') {
          sets.push(`completed_at = $${paramIdx}`);
          params.push(new Date().toISOString());
          paramIdx++;
        }
      }

      if (sets.length === 0) {
        return this.getAssignment(assignmentId);
      }

      params.push(assignmentId);
      const result = await this.pool.query(
        `UPDATE learning_assignments SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        params
      );
      return result.rows.length > 0 ? rowToAssignment(result.rows[0]) : null;
    }

    // In-memory fallback
    const idx = inMemoryStore.findIndex((a) => a.id === assignmentId);
    if (idx === -1) return null;
    const current = inMemoryStore[idx];
    if (input.title !== undefined) current.title = input.title;
    if (input.notes !== undefined) current.notes = input.notes;
    if (input.dueDate !== undefined) current.dueDate = input.dueDate;
    if (input.status) {
      current.status = input.status;
      if (input.status === 'completed') {
        current.completedAt = new Date().toISOString();
      }
    }
    current.updatedAt = new Date().toISOString();
    return current;
  }

  async getAssignment(assignmentId: string): Promise<LearningAssignment | null> {
    if (await this.tableExists()) {
      const result = await this.pool.query(
        'SELECT * FROM learning_assignments WHERE id = $1',
        [assignmentId]
      );
      return result.rows.length > 0 ? rowToAssignment(result.rows[0]) : null;
    }

    const found = inMemoryStore.find((a) => a.id === assignmentId);
    return found || null;
  }

  /**
   * Auto-complete assignments for a skill when the child answers correctly.
   * Called from the attempt API after grading.
   */
  async completeOnCorrectAnswer(
    childId: string,
    skillCode: string
  ): Promise<number> {
    if (await this.tableExists()) {
      const result = await this.pool.query(
        `UPDATE learning_assignments
         SET status = 'completed', completed_at = NOW()
         WHERE child_id = $1
           AND skill_code = $2
           AND status = 'assigned'`,
        [childId, skillCode]
      );
      return result.rowCount || 0;
    }

    let count = 0;
    for (const a of inMemoryStore) {
      if (a.childId === childId && a.skillCode === skillCode && a.status === 'assigned') {
        a.status = 'completed';
        a.completedAt = new Date().toISOString();
        a.updatedAt = a.completedAt;
        count++;
      }
    }
    return count;
  }

  /**
   * Get active assignment skill codes for the planner. Matches the existing
   * fetchAssignmentSkillCodes contract in plan.ts but uses the service layer.
   */
  async getActiveSkillCodes(childId: string, limit: number): Promise<string[]> {
    const assignments = await this.listAssignments(childId, { status: 'assigned' });
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const a of assignments) {
      const code = a.skillCode.trim();
      if (code && !seen.has(code)) {
        seen.add(code);
        codes.push(code);
        if (codes.length >= limit) break;
      }
    }
    return codes;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let serviceInstance: AssignmentService | null = null;

export function getAssignmentService(pool: Pool): AssignmentService {
  if (!serviceInstance) {
    serviceInstance = new AssignmentService(pool);
  }
  return serviceInstance;
}
