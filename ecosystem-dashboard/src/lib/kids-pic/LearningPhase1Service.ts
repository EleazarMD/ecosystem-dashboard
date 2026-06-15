import type { Pool } from 'pg';
import { randomUUID } from 'crypto';
import dbPool from '../db/client';

import { PHASE1_STARTER_CONTENT } from './phase1-starter-content';
import type { DeterministicAnswerKey, LearnAgeBand, LearnContentItem } from './phase1-starter-content';

export interface LearnContentQuery {
  skillCode?: string;
  ageBand?: LearnAgeBand;
  limit?: number;
}

export interface GradeAttemptInput {
  childId: string;
  contentItemId: string;
  learnerResponse: unknown;
}

export interface GradeAttemptResult {
  attemptId: string;
  contentItem: LearnContentItem;
  normalizedResponse: string;
  correct: boolean;
  score: number;
  feedback: string;
  masteryEligible: boolean;
  hint?: string;
}

export class LearningPhase1Service {
  private hasContentTableCache: boolean | null = null;
  private hasAttemptsTableCache: boolean | null = null;

  constructor(private readonly db: Pool) {}

  async listContent(query: LearnContentQuery): Promise<LearnContentItem[]> {
    const fromDb = await this.listContentFromDb(query);
    if (fromDb.length > 0) {
      return fromDb;
    }

    const limit = query.limit || 10;
    return PHASE1_STARTER_CONTENT
      .filter((item) => {
        if (query.skillCode && item.skillCode !== query.skillCode) {
          return false;
        }
        if (query.ageBand && item.ageBand !== query.ageBand) {
          return false;
        }
        return item.reviewStatus === 'approved' && item.safetyStatus === 'passed';
      })
      .slice(0, limit);
  }

  async getContentById(contentItemId: string): Promise<LearnContentItem | null> {
    const fromDb = await this.getContentByIdFromDb(contentItemId);
    if (fromDb) {
      return fromDb;
    }

    return PHASE1_STARTER_CONTENT.find((item) => item.id === contentItemId) || null;
  }

  async gradeAttempt(input: GradeAttemptInput): Promise<GradeAttemptResult> {
    const contentItem = await this.getContentById(input.contentItemId);
    if (!contentItem) {
      throw new Error(`Unknown content item: ${input.contentItemId}`);
    }

    const normalizedResponse = normalizeResponse(input.learnerResponse);
    const correct = scoreDeterministicAnswer(contentItem.answerKey, normalizedResponse);
    const score = correct ? 1 : 0;

    const attemptId = randomUUID();
    const masteryEligible =
      contentItem.reviewStatus === 'approved' &&
      contentItem.safetyStatus === 'passed' &&
      !contentItem.lowStakesOnly;

    const feedback = correct
      ? 'Great work - that is correct.'
      : 'Nice effort. Try again using the hint.';

    await this.persistAttempt({
      attemptId,
      childId: input.childId,
      contentItem,
      normalizedResponse,
      correct,
      score,
      feedback,
    });

    return {
      attemptId,
      contentItem,
      normalizedResponse,
      correct,
      score,
      feedback,
      masteryEligible,
      hint: correct ? undefined : contentItem.hintSet[0],
    };
  }

  private async hasTable(tableName: string): Promise<boolean> {
    const result = await this.db.query<{ exists: string | null }>(
      'SELECT to_regclass($1) AS exists',
      [`public.${tableName}`],
    );
    return !!result.rows[0]?.exists;
  }

  private async hasContentTable(): Promise<boolean> {
    if (this.hasContentTableCache !== null) {
      return this.hasContentTableCache;
    }

    try {
      this.hasContentTableCache = await this.hasTable('learning_content_items');
    } catch (error) {
      console.warn('[learn-phase1] failed to check learning_content_items table:', error);
      this.hasContentTableCache = false;
    }

    return this.hasContentTableCache;
  }

  private async hasAttemptsTable(): Promise<boolean> {
    if (this.hasAttemptsTableCache !== null) {
      return this.hasAttemptsTableCache;
    }

    try {
      this.hasAttemptsTableCache = await this.hasTable('learning_attempts');
    } catch (error) {
      console.warn('[learn-phase1] failed to check learning_attempts table:', error);
      this.hasAttemptsTableCache = false;
    }

    return this.hasAttemptsTableCache;
  }

  private async listContentFromDb(query: LearnContentQuery): Promise<LearnContentItem[]> {
    if (!(await this.hasContentTable())) {
      return [];
    }

    const limit = query.limit || 10;
    const params: unknown[] = [];
    const clauses: string[] = ["review_status = 'approved'", "safety_status = 'passed'"];

    if (query.skillCode) {
      params.push(query.skillCode);
      clauses.push(`skill_code = $${params.length}`);
    }

    if (query.ageBand) {
      params.push(query.ageBand);
      clauses.push(`age_band = $${params.length}`);
    }

    params.push(limit);

    const sql = `
      SELECT *
      FROM learning_content_items
      WHERE ${clauses.join(' AND ')}
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
      LIMIT $${params.length}
    `;

    try {
      const result = await this.db.query<Record<string, any>>(sql, params);
      return result.rows.map((row) => mapDbContentRow(row)).filter((item): item is LearnContentItem => !!item);
    } catch (error) {
      console.warn('[learn-phase1] failed to read learning content from db, using starter content:', error);
      return [];
    }
  }

  private async getContentByIdFromDb(contentItemId: string): Promise<LearnContentItem | null> {
    if (!(await this.hasContentTable())) {
      return null;
    }

    try {
      const result = await this.db.query<Record<string, any>>(
        'SELECT * FROM learning_content_items WHERE id = $1 LIMIT 1',
        [contentItemId],
      );

      const item = result.rows[0] ? mapDbContentRow(result.rows[0]) : null;
      return item;
    } catch (error) {
      console.warn('[learn-phase1] failed to read content item by id from db:', error);
      return null;
    }
  }

  private async persistAttempt(input: {
    attemptId: string;
    childId: string;
    contentItem: LearnContentItem;
    normalizedResponse: string;
    correct: boolean;
    score: number;
    feedback: string;
  }): Promise<void> {
    if (!(await this.hasAttemptsTable())) {
      return;
    }

    try {
      await this.db.query(
        `INSERT INTO learning_attempts (
          id,
          child_id,
          content_item_id,
          skill_code,
          response_payload,
          normalized_response,
          is_correct,
          score,
          feedback,
          attempted_at
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW())`,
        [
          input.attemptId,
          input.childId,
          input.contentItem.id,
          input.contentItem.skillCode,
          JSON.stringify({ response: input.normalizedResponse }),
          input.normalizedResponse,
          input.correct,
          input.score,
          input.feedback,
        ],
      );
    } catch (error) {
      console.warn('[learn-phase1] failed to persist learning attempt:', error);
    }
  }
}

function mapDbContentRow(row: Record<string, any>): LearnContentItem | null {
  const answerKeyRaw = row.answer_key || row.answerKey;
  const answerKey = normalizeAnswerKey(answerKeyRaw);
  if (!answerKey) {
    return null;
  }

  const hintSetRaw = row.hint_set || row.hintSet;
  const hintSet = Array.isArray(hintSetRaw)
    ? hintSetRaw.map((hint) => String(hint))
    : typeof hintSetRaw === 'string'
      ? [hintSetRaw]
      : [];

  const analyticalTagsRaw = row.analytical_tags || row.analyticalTags;
  const analyticalTags = Array.isArray(analyticalTagsRaw)
    ? analyticalTagsRaw.map((tag) => String(tag))
    : [];

  const item: LearnContentItem = {
    id: String(row.id),
    version: Number.parseInt(String(row.version ?? 1), 10) || 1,
    subject: row.subject === 'reading' ? 'reading' : 'math',
    skillCode: String(row.skill_code || row.skillCode || ''),
    analyticalTags,
    type: row.content_type === 'question' ? 'question' : 'problem',
    ageBand: normalizeAgeBand(row.age_band || row.ageBand),
    minGrade: String(row.min_grade || row.minGrade || '1'),
    maxGrade: String(row.max_grade || row.maxGrade || '5'),
    difficulty: Number.parseInt(String(row.difficulty ?? 1), 10) || 1,
    prompt: String(row.prompt || ''),
    answerKey,
    hintSet,
    provenance: row.provenance === 'authored' ? 'authored' : 'ai_generated',
    reviewStatus: normalizeReviewStatus(row.review_status || row.reviewStatus),
    safetyStatus: normalizeSafetyStatus(row.safety_status || row.safetyStatus),
    lowStakesOnly: parseBoolean(row.low_stakes_only ?? row.lowStakesOnly, false),
  };

  if (!item.skillCode || !item.prompt) {
    return null;
  }

  return item;
}

function normalizeAnswerKey(input: unknown): DeterministicAnswerKey | null {
  let normalizedInput: unknown = input;

  if (typeof normalizedInput === 'string') {
    try {
      normalizedInput = JSON.parse(normalizedInput);
    } catch {
      return null;
    }
  }

  if (!normalizedInput || typeof normalizedInput !== 'object') {
    return null;
  }

  const raw = normalizedInput as Record<string, unknown>;
  const kind = raw.kind === 'number' ? 'number' : raw.kind === 'exact_text' ? 'exact_text' : null;
  if (!kind) {
    return null;
  }

  if (kind === 'number') {
    const value = Number(raw.value);
    if (!Number.isFinite(value)) {
      return null;
    }

    const acceptedRaw = raw.acceptedForms ?? raw.accepted_forms;

    return {
      kind,
      value,
      acceptedForms: Array.isArray(acceptedRaw)
        ? acceptedRaw.map((form) => String(form))
        : undefined,
      tolerance: Number.isFinite(Number(raw.tolerance)) ? Number(raw.tolerance) : undefined,
    };
  }

  if (typeof raw.value !== 'string') {
    return null;
  }

  const acceptedRaw = raw.acceptedForms ?? raw.accepted_forms;

  return {
    kind,
    value: raw.value,
    acceptedForms: Array.isArray(acceptedRaw)
      ? acceptedRaw.map((form) => String(form))
      : undefined,
    caseSensitive: parseBoolean(raw.caseSensitive ?? raw.case_sensitive, false),
  };
}

function normalizeAgeBand(value: unknown): LearnAgeBand {
  if (value === 'early' || value === 'middle' || value === 'tween') {
    return value;
  }
  return 'middle';
}

function normalizeReviewStatus(value: unknown): 'draft' | 'approved' | 'retired' {
  if (value === 'draft' || value === 'approved' || value === 'retired') {
    return value;
  }
  return 'draft';
}

function normalizeSafetyStatus(value: unknown): 'pending' | 'passed' | 'failed' {
  if (value === 'pending' || value === 'passed' || value === 'failed') {
    return value;
  }
  return 'pending';
}

function normalizeResponse(response: unknown): string {
  if (typeof response === 'string') {
    return response.trim();
  }
  if (typeof response === 'number' || typeof response === 'boolean') {
    return String(response);
  }

  if (response && typeof response === 'object') {
    const maybeAnswer = (response as Record<string, unknown>).answer;
    if (typeof maybeAnswer === 'string' || typeof maybeAnswer === 'number') {
      return String(maybeAnswer).trim();
    }
  }

  return '';
}

function scoreDeterministicAnswer(answerKey: DeterministicAnswerKey, normalizedResponse: string): boolean {
  if (!normalizedResponse) {
    return false;
  }

  if (answerKey.kind === 'number') {
    const learnerValue = parseNumeric(normalizedResponse);
    if (learnerValue === null) {
      return false;
    }

    const tolerance = answerKey.tolerance ?? 0;
    const target = Number(answerKey.value);
    if (Math.abs(learnerValue - target) <= tolerance) {
      return true;
    }

    return (answerKey.acceptedForms || []).some((form) => {
      const parsed = parseNumeric(form);
      return parsed !== null && Math.abs(learnerValue - parsed) <= tolerance;
    });
  }

  const caseSensitive = answerKey.caseSensitive || false;
  const normalizeText = (value: string) =>
    caseSensitive ? value.trim() : value.trim().toLowerCase();

  const learner = normalizeText(normalizedResponse);
  const accepted = [String(answerKey.value), ...(answerKey.acceptedForms || [])].map(normalizeText);

  return accepted.includes(learner);
}

function parseNumeric(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

let learningPhase1ServiceInstance: LearningPhase1Service | null = null;

export function getLearningPhase1Service(): LearningPhase1Service {
  if (!learningPhase1ServiceInstance) {
    learningPhase1ServiceInstance = new LearningPhase1Service(dbPool);
  }
  return learningPhase1ServiceInstance;
}
