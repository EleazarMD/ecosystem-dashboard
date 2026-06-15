import { randomUUID } from 'crypto';
import type { Pool } from 'pg';

import dbPool from '../db/client';

export type LearningSessionStatus = 'started' | 'in_progress' | 'completed' | 'abandoned';

export interface LearningSessionRecord {
  id: string;
  childId: string;
  ownerId?: string;
  mode: string;
  status: LearningSessionStatus;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  plan?: Record<string, unknown>;
  activities?: unknown[];
  outcomes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreateLearningSessionInput {
  childId: string;
  ownerId?: string;
  mode?: string;
  status?: LearningSessionStatus;
  plan?: Record<string, unknown>;
  activities?: unknown[];
  outcomes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateLearningSessionInput {
  status?: LearningSessionStatus;
  endedAt?: string;
  durationSeconds?: number;
  plan?: Record<string, unknown>;
  activities?: unknown[];
  outcomes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const memorySessions = new Map<string, LearningSessionRecord>();

export class LearningSessionService {
  private hasSessionsTableCache: boolean | null = null;
  private sessionColumnsCache: Set<string> | null = null;

  constructor(private readonly db: Pool) {}

  async createSession(input: CreateLearningSessionInput): Promise<LearningSessionRecord> {
    const nowIso = new Date().toISOString();
    const record: LearningSessionRecord = {
      id: randomUUID(),
      childId: input.childId,
      ownerId: input.ownerId,
      mode: input.mode || 'guided',
      status: input.status || 'started',
      startedAt: nowIso,
      plan: input.plan,
      activities: input.activities,
      outcomes: input.outcomes,
      metadata: input.metadata,
    };

    const dbRecord = await this.insertIntoDb(record);
    if (dbRecord) {
      return dbRecord;
    }

    memorySessions.set(record.id, record);
    return record;
  }

  async updateSession(sessionId: string, input: UpdateLearningSessionInput): Promise<LearningSessionRecord | null> {
    const dbRecord = await this.updateInDb(sessionId, input);
    if (dbRecord) {
      return dbRecord;
    }

    const existing = memorySessions.get(sessionId);
    if (!existing) {
      return null;
    }

    const nextStatus = input.status || existing.status;
    const endedAt = input.endedAt || (nextStatus === 'completed' && !existing.endedAt ? new Date().toISOString() : existing.endedAt);

    const updated: LearningSessionRecord = {
      ...existing,
      status: nextStatus,
      endedAt,
      durationSeconds: input.durationSeconds ?? existing.durationSeconds,
      plan: input.plan ?? existing.plan,
      activities: input.activities ?? existing.activities,
      outcomes: input.outcomes ?? existing.outcomes,
      metadata: input.metadata ? { ...(existing.metadata || {}), ...input.metadata } : existing.metadata,
    };

    memorySessions.set(sessionId, updated);
    return updated;
  }

  private async hasSessionsTable(): Promise<boolean> {
    if (this.hasSessionsTableCache !== null) {
      return this.hasSessionsTableCache;
    }

    try {
      const result = await this.db.query<{ exists: string | null }>('SELECT to_regclass($1) AS exists', ['public.learning_sessions']);
      this.hasSessionsTableCache = !!result.rows[0]?.exists;
    } catch (error) {
      console.warn('[learn-session] failed to check learning_sessions table:', error);
      this.hasSessionsTableCache = false;
    }

    return this.hasSessionsTableCache;
  }

  private async getSessionColumns(): Promise<Set<string>> {
    if (this.sessionColumnsCache) {
      return this.sessionColumnsCache;
    }

    try {
      const result = await this.db.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'learning_sessions'`,
      );
      this.sessionColumnsCache = new Set(result.rows.map((row) => row.column_name));
    } catch (error) {
      console.warn('[learn-session] failed to read learning_sessions columns:', error);
      this.sessionColumnsCache = new Set<string>();
    }

    return this.sessionColumnsCache;
  }

  private async insertIntoDb(record: LearningSessionRecord): Promise<LearningSessionRecord | null> {
    if (!(await this.hasSessionsTable())) {
      return null;
    }

    const columns = await this.getSessionColumns();
    const idColumn = pickFirstColumn(columns, ['id', 'session_id']);
    const childIdColumn = pickFirstColumn(columns, ['child_id']);

    if (!idColumn || !childIdColumn) {
      return null;
    }

    const entries = [
      [idColumn, record.id],
      [childIdColumn, record.childId],
      [pickFirstColumn(columns, ['owner_id']) || '', record.ownerId],
      [pickFirstColumn(columns, ['mode']) || '', record.mode],
      [pickFirstColumn(columns, ['status']) || '', record.status],
      [pickFirstColumn(columns, ['started_at']) || '', new Date(record.startedAt)],
      [pickFirstColumn(columns, ['ended_at']) || '', record.endedAt ? new Date(record.endedAt) : undefined],
      [pickFirstColumn(columns, ['duration_seconds']) || '', record.durationSeconds],
      [pickFirstColumn(columns, ['plan_payload', 'plan']) || '', toJsonValue(record.plan)],
      [pickFirstColumn(columns, ['activities_payload', 'activities']) || '', toJsonValue(record.activities)],
      [pickFirstColumn(columns, ['outcomes_payload', 'outcomes']) || '', toJsonValue(record.outcomes)],
      [pickFirstColumn(columns, ['metadata']) || '', toJsonValue(record.metadata)],
      [pickFirstColumn(columns, ['created_at']) || '', new Date(record.startedAt)],
      [pickFirstColumn(columns, ['updated_at']) || '', new Date(record.startedAt)],
    ] as Array<[string, unknown]>;

    const filteredEntries: Array<[string, unknown]> = entries.filter(
      ([column, value]) => Boolean(column) && value !== undefined,
    );

    if (filteredEntries.length === 0) {
      return null;
    }

    const fieldNames = filteredEntries.map(([column]) => column);
    const values = filteredEntries.map(([, value]) => value);
    const placeholders = filteredEntries.map((_, index) => `$${index + 1}`);

    try {
      const result = await this.db.query<Record<string, unknown>>(
        `INSERT INTO learning_sessions (${fieldNames.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        values,
      );

      return result.rows[0] ? mapSessionRow(result.rows[0]) : record;
    } catch (error) {
      console.warn('[learn-session] failed to insert learning session:', error);
      return null;
    }
  }

  private async updateInDb(sessionId: string, input: UpdateLearningSessionInput): Promise<LearningSessionRecord | null> {
    if (!(await this.hasSessionsTable())) {
      return null;
    }

    const columns = await this.getSessionColumns();
    const idColumn = pickFirstColumn(columns, ['id', 'session_id']);

    if (!idColumn) {
      return null;
    }

    const normalizedStatus = input.status;
    const endedAt =
      input.endedAt ||
      (normalizedStatus === 'completed' && pickFirstColumn(columns, ['ended_at']) ? new Date().toISOString() : undefined);

    const updates = [
      [pickFirstColumn(columns, ['status']) || '', normalizedStatus],
      [pickFirstColumn(columns, ['ended_at']) || '', endedAt ? new Date(endedAt) : undefined],
      [pickFirstColumn(columns, ['duration_seconds']) || '', input.durationSeconds],
      [pickFirstColumn(columns, ['plan_payload', 'plan']) || '', toJsonValue(input.plan)],
      [pickFirstColumn(columns, ['activities_payload', 'activities']) || '', toJsonValue(input.activities)],
      [pickFirstColumn(columns, ['outcomes_payload', 'outcomes']) || '', toJsonValue(input.outcomes)],
      [pickFirstColumn(columns, ['metadata']) || '', toJsonValue(input.metadata)],
      [pickFirstColumn(columns, ['updated_at']) || '', new Date()],
    ] as Array<[string, unknown]>;

    const filteredUpdates: Array<[string, unknown]> = updates.filter(
      ([column, value]) => Boolean(column) && value !== undefined,
    );

    if (filteredUpdates.length === 0) {
      return null;
    }

    const assignments = filteredUpdates.map(([column], index) => `${column} = $${index + 1}`);
    const values = filteredUpdates.map(([, value]) => value);
    values.push(sessionId);

    try {
      const result = await this.db.query<Record<string, unknown>>(
        `UPDATE learning_sessions
         SET ${assignments.join(', ')}
         WHERE ${idColumn} = $${values.length}
         RETURNING *`,
        values,
      );

      return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
    } catch (error) {
      console.warn('[learn-session] failed to update learning session:', error);
      return null;
    }
  }
}

function pickFirstColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function toJsonValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.stringify(value);
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function mapSessionRow(row: Record<string, unknown>): LearningSessionRecord {
  const id = String(row.id || row.session_id || '');
  const childId = String(row.child_id || '');

  const startedAtRaw = row.started_at || row.created_at || new Date().toISOString();
  const endedAtRaw = row.ended_at;

  return {
    id,
    childId,
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    mode: row.mode ? String(row.mode) : 'guided',
    status: normalizeStatus(row.status),
    startedAt: new Date(String(startedAtRaw)).toISOString(),
    endedAt: endedAtRaw ? new Date(String(endedAtRaw)).toISOString() : undefined,
    durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
    plan: parseJsonValue(row.plan_payload ?? row.plan) as Record<string, unknown> | undefined,
    activities: parseJsonValue(row.activities_payload ?? row.activities) as unknown[] | undefined,
    outcomes: parseJsonValue(row.outcomes_payload ?? row.outcomes) as Record<string, unknown> | undefined,
    metadata: parseJsonValue(row.metadata) as Record<string, unknown> | undefined,
  };
}

function normalizeStatus(value: unknown): LearningSessionStatus {
  if (value === 'started' || value === 'in_progress' || value === 'completed' || value === 'abandoned') {
    return value;
  }

  return 'started';
}

let learningSessionServiceInstance: LearningSessionService | null = null;

export function getLearningSessionService(): LearningSessionService {
  if (!learningSessionServiceInstance) {
    learningSessionServiceInstance = new LearningSessionService(dbPool);
  }

  return learningSessionServiceInstance;
}
