/**
 * LessonLifecycleService — Multi-agent lesson authoring pipeline.
 *
 * Manages the full lesson lifecycle:
 *   draft → spec → generating → reviewing → approved → published → archived
 *
 * Each phase is driven by one or more AI agents:
 *   claude-opus      → design_spec, write_content
 *   gpt-5.5          → generate_problem, create_assessment
 *   gemini-image-pro → generate_image (high-quality illustrations)
 *   nano-banana      → generate_image (icons, decorations)
 *   minimax-m3       → write_content (child-facing prompts), generate_audio
 *   human            → manual_review, manual_edit
 *
 * The service is DB-backed (PostgreSQL) with in-memory fallback for pilot mode.
 */

import type { Pool } from 'pg';

// ─── Types ──────────────────────────────────────────────────────────────────

export type LifecycleState =
  | 'draft'
  | 'spec'
  | 'generating'
  | 'reviewing'
  | 'approved'
  | 'published'
  | 'archived';

export type AgentId =
  | 'claude-opus'
  | 'gpt-5.5'
  | 'gemini-image-pro'
  | 'nano-banana'
  | 'minimax-m3'
  | 'local-llm'
  | 'human';

export type TaskType =
  | 'design_spec'
  | 'write_content'
  | 'generate_problem'
  | 'create_assessment'
  | 'generate_image'
  | 'generate_audio'
  | 'review_content'
  | 'review_safety'
  | 'assemble'
  | 'manual_review'
  | 'manual_edit';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type StepType =
  | 'intro'
  | 'concept'
  | 'example'
  | 'interactive'
  | 'concept_check'
  | 'practice'
  | 'quiz'
  | 'passage'
  | 'celebration'
  | 'summary';

export type AssetType =
  | 'illustration'
  | 'diagram'
  | 'icon'
  | 'animation'
  | 'audio_narration'
  | 'background'
  | 'character'
  | 'interactive_spec';

export type ReviewVerdict = 'approved' | 'rejected' | 'revision_requested';

export interface Lesson {
  id: string;
  courseCode: string;
  unitCode: string | null;
  lessonCode: string;
  title: string;
  description: string | null;
  lessonEmoji: string;
  subject: string;
  ageBand: string;
  minGrade: string | null;
  maxGrade: string | null;
  difficulty: number;
  skillCodes: string[];
  curriculumStandards: string[];
  estimatedMinutes: number;
  prerequisites: string[];
  lifecycleState: LifecycleState;
  leadAgent: string | null;
  assignedAgents: AgentId[];
  designSpec: LessonDesignSpec | null;
  reviewStatus: string;
  safetyReviewStatus: string;
  contentItemIds: string[];
  createdBy: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonDesignSpec {
  objectives: string[];
  narrativeArc: string;
  visualStyle: string;
  interactionTypes: string[];
  targetSkills: string[];
  adaptationNotes?: string;
}

export interface LessonStep {
  id: string;
  lessonId: string;
  stepNumber: number;
  stepType: StepType;
  title: string;
  description: string | null;
  stepEmoji: string;
  content: Record<string, any> | null;
  visualSpec: Record<string, any> | null;
  contentAgent: string | null;
  visualAgent: string | null;
  reviewStatus: string;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LessonAsset {
  id: string;
  lessonId: string;
  stepId: string | null;
  assetType: AssetType;
  generatingAgent: string;
  generationPrompt: string | null;
  generationParams: Record<string, any> | null;
  assetUrl: string | null;
  assetData: Record<string, any> | null;
  thumbnailUrl: string | null;
  reviewStatus: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  altText: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentTask {
  id: string;
  lessonId: string;
  stepId: string | null;
  agentId: AgentId;
  taskType: TaskType;
  inputPayload: Record<string, any> | null;
  outputPayload: Record<string, any> | null;
  status: TaskStatus;
  dependsOn: string[];
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  qualityScore: number | null;
  reviewNotes: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LessonReview {
  id: string;
  lessonId: string;
  stepId: string | null;
  assetId: string | null;
  reviewerType: 'human' | 'agent';
  reviewerId: string;
  reviewerName: string | null;
  reviewKind: string;
  verdict: ReviewVerdict;
  score: number | null;
  notes: string | null;
  suggestedChanges: Record<string, any>[];
  reviewRound: number;
  createdAt: string;
}

export interface LifecycleEvent {
  id: string;
  lessonId: string;
  fromState: string | null;
  toState: string;
  eventType: string;
  triggeredBy: string | null;
  triggeredByType: string | null;
  eventPayload: Record<string, any> | null;
  notes: string | null;
  createdAt: string;
}

export interface LessonAssignment {
  id: string;
  lessonId: string;
  childUserId: string;
  assignedBy: string;
  dueDate: string | null;
  priority: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
  currentStep: number;
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
  difficultyOverride: number | null;
  adaptations: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ─── Create / Update inputs ──────────────────────────────────────────────────

export interface CreateLessonInput {
  courseCode?: string;
  unitCode?: string;
  lessonCode: string;
  title: string;
  description?: string;
  lessonEmoji?: string;
  subject: string;
  ageBand: string;
  minGrade?: string;
  maxGrade?: string;
  difficulty?: number;
  skillCodes?: string[];
  curriculumStandards?: string[];
  estimatedMinutes?: number;
  prerequisites?: string[];
  createdBy?: string;
  assignedAgents?: AgentId[];
}

export interface CreateStepInput {
  lessonId: string;
  stepNumber: number;
  stepType: StepType;
  title: string;
  description?: string;
  stepEmoji?: string;
  contentAgent?: string;
  visualAgent?: string;
}

export interface CreateAgentTaskInput {
  lessonId: string;
  stepId?: string;
  agentId: AgentId;
  taskType: TaskType;
  inputPayload?: Record<string, any>;
  dependsOn?: string[];
}

export interface CreateReviewInput {
  lessonId: string;
  stepId?: string;
  assetId?: string;
  reviewerType: 'human' | 'agent';
  reviewerId: string;
  reviewerName?: string;
  reviewKind: string;
  verdict: ReviewVerdict;
  score?: number;
  notes?: string;
  suggestedChanges?: Record<string, any>[];
}

// ─── Agent role mapping ─────────────────────────────────────────────────────

export const AGENT_CAPABILITIES: Record<AgentId, TaskType[]> = {
  'claude-opus': ['design_spec', 'write_content', 'review_content', 'assemble'],
  'gpt-5.5': ['generate_problem', 'create_assessment', 'write_content', 'review_content'],
  'gemini-image-pro': ['generate_image'],
  'nano-banana': ['generate_image'],
  'minimax-m3': ['write_content', 'generate_audio', 'create_assessment'],
  'local-llm': ['write_content', 'generate_problem', 'review_safety'],
  'human': ['manual_review', 'manual_edit', 'review_content', 'review_safety'],
};

export const AGENT_LABELS: Record<AgentId, string> = {
  'claude-opus': 'Claude Opus',
  'gpt-5.5': 'GPT 5.5',
  'gemini-image-pro': 'Gemini Image Pro',
  'nano-banana': 'Nano Banana',
  'minimax-m3': 'MiniMax M3',
  'local-llm': 'Local LLM',
  'human': 'Human Reviewer',
};

// ─── Lifecycle transitions ──────────────────────────────────────────────────

export const LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  draft: ['spec'],
  spec: ['generating', 'draft'],
  generating: ['reviewing', 'spec'],
  reviewing: ['approved', 'generating'],
  approved: ['published', 'reviewing'],
  published: ['archived'],
  archived: [],
};

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return LIFECYCLE_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class LessonLifecycleService {
  constructor(private pool: Pool) {}

  private async tableExists(): Promise<boolean> {
    try {
      const result = await this.pool.query(
        "SELECT to_regclass('public.lessons') AS reg"
      );
      return !!result.rows?.[0]?.reg;
    } catch {
      return false;
    }
  }

  // ── Lessons ──────────────────────────────────────────────────────────────

  async createLesson(input: CreateLessonInput): Promise<Lesson> {
    const result = await this.pool.query(
      `INSERT INTO lessons (
        course_code, unit_code, lesson_code, title, description, lesson_emoji,
        subject, age_band, min_grade, max_grade, difficulty,
        skill_codes, curriculum_standards, estimated_minutes, prerequisites,
        created_by, assigned_agents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        input.courseCode || 'default',
        input.unitCode || null,
        input.lessonCode,
        input.title,
        input.description || null,
        input.lessonEmoji || '📚',
        input.subject,
        input.ageBand,
        input.minGrade || null,
        input.maxGrade || null,
        input.difficulty || 1,
        JSON.stringify(input.skillCodes || []),
        JSON.stringify(input.curriculumStandards || []),
        input.estimatedMinutes || 10,
        JSON.stringify(input.prerequisites || []),
        input.createdBy || null,
        JSON.stringify(input.assignedAgents || []),
      ]
    );
    return this.rowToLesson(result.rows[0]);
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    const result = await this.pool.query(
      'SELECT * FROM lessons WHERE id = $1',
      [lessonId]
    );
    return result.rows.length > 0 ? this.rowToLesson(result.rows[0]) : null;
  }

  async getLessonByCode(courseCode: string, lessonCode: string): Promise<Lesson | null> {
    const result = await this.pool.query(
      'SELECT * FROM lessons WHERE course_code = $1 AND lesson_code = $2',
      [courseCode, lessonCode]
    );
    return result.rows.length > 0 ? this.rowToLesson(result.rows[0]) : null;
  }

  async listLessons(filters?: {
    lifecycleState?: LifecycleState;
    subject?: string;
    ageBand?: string;
    assignedAgent?: AgentId;
  }): Promise<Lesson[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (filters?.lifecycleState) {
      conditions.push(`lifecycle_state = $${idx++}`);
      params.push(filters.lifecycleState);
    }
    if (filters?.subject) {
      conditions.push(`subject = $${idx++}`);
      params.push(filters.subject);
    }
    if (filters?.ageBand) {
      conditions.push(`age_band = $${idx++}`);
      params.push(filters.ageBand);
    }
    if (filters?.assignedAgent) {
      conditions.push(`$${idx++} = ANY(assigned_agents)`);
      params.push(filters.assignedAgent);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.pool.query(
      `SELECT * FROM lessons ${where} ORDER BY created_at DESC`,
      params
    );
    return result.rows.map((r) => this.rowToLesson(r));
  }

  async updateLessonState(
    lessonId: string,
    newState: LifecycleState,
    triggeredBy?: string,
    triggeredByType?: 'agent' | 'human' | 'system'
  ): Promise<Lesson | null> {
    const current = await this.getLesson(lessonId);
    if (!current) return null;

    if (!canTransition(current.lifecycleState, newState)) {
      throw new Error(
        `Invalid lifecycle transition: ${current.lifecycleState} → ${newState}`
      );
    }

    const result = await this.pool.query(
      `UPDATE lessons SET lifecycle_state = $1 WHERE id = $2 RETURNING *`,
      [newState, lessonId]
    );

    // Log the event (the trigger also logs, but this adds triggered_by info)
    await this.pool.query(
      `INSERT INTO lesson_lifecycle_events (lesson_id, from_state, to_state, event_type, triggered_by, triggered_by_type)
       VALUES ($1, $2, $3, 'state_change', $4, $5)`,
      [lessonId, current.lifecycleState, newState, triggeredBy || null, triggeredByType || 'system']
    );

    return result.rows.length > 0 ? this.rowToLesson(result.rows[0]) : null;
  }

  async updateLessonDesignSpec(
    lessonId: string,
    spec: LessonDesignSpec
  ): Promise<Lesson | null> {
    const result = await this.pool.query(
      `UPDATE lessons SET design_spec = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(spec), lessonId]
    );
    return result.rows.length > 0 ? this.rowToLesson(result.rows[0]) : null;
  }

  async assignAgent(lessonId: string, agentId: AgentId, lead = false): Promise<void> {
    if (lead) {
      await this.pool.query(
        'UPDATE lessons SET lead_agent = $1 WHERE id = $2',
        [agentId, lessonId]
      );
    }
    // Add to assigned_agents array if not already present
    await this.pool.query(
      `UPDATE lessons SET assigned_agents = 
        CASE WHEN $1 = ANY(assigned_agents) THEN assigned_agents
        ELSE assigned_agents || $1::jsonb END
       WHERE id = $2`,
      [JSON.stringify(agentId), lessonId]
    );

    await this.pool.query(
      `INSERT INTO lesson_lifecycle_events (lesson_id, to_state, event_type, triggered_by, triggered_by_type)
       VALUES ($1, $2, 'agent_assigned', $3, 'system')`,
      [lessonId, agentId, agentId]
    );
  }

  async publishLesson(lessonId: string, publishedBy: string): Promise<Lesson | null> {
    const result = await this.pool.query(
      `UPDATE lessons 
       SET lifecycle_state = 'published', published_by = $1, published_at = NOW(), review_status = 'approved'
       WHERE id = $2 AND lifecycle_state = 'approved'
       RETURNING *`,
      [publishedBy, lessonId]
    );
    return result.rows.length > 0 ? this.rowToLesson(result.rows[0]) : null;
  }

  // ── Steps ────────────────────────────────────────────────────────────────

  async createStep(input: CreateStepInput): Promise<LessonStep> {
    const result = await this.pool.query(
      `INSERT INTO lesson_steps (
        lesson_id, step_number, step_type, title, description, step_emoji,
        content_agent, visual_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.lessonId,
        input.stepNumber,
        input.stepType,
        input.title,
        input.description || null,
        input.stepEmoji || '⭐',
        input.contentAgent || null,
        input.visualAgent || null,
      ]
    );

    await this.pool.query(
      `INSERT INTO lesson_lifecycle_events (lesson_id, to_state, event_type, event_payload)
       VALUES ($1, 'step_created', 'step_created', $2)`,
      [input.lessonId, JSON.stringify({ stepId: result.rows[0].id, stepNumber: input.stepNumber })]
    );

    return this.rowToStep(result.rows[0]);
  }

  async getSteps(lessonId: string): Promise<LessonStep[]> {
    const result = await this.pool.query(
      'SELECT * FROM lesson_steps WHERE lesson_id = $1 ORDER BY step_number',
      [lessonId]
    );
    return result.rows.map((r) => this.rowToStep(r));
  }

  async updateStepContent(
    stepId: string,
    content: Record<string, any>,
    contentAgent?: string
  ): Promise<LessonStep | null> {
    const sets = ['content = $1'];
    const params: any[] = [JSON.stringify(content)];

    if (contentAgent) {
      sets.push(`content_agent = $${params.length + 1}`);
      params.push(contentAgent);
    }

    params.push(stepId);
    const result = await this.pool.query(
      `UPDATE lesson_steps SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows.length > 0 ? this.rowToStep(result.rows[0]) : null;
  }

  async updateStepVisualSpec(
    stepId: string,
    visualSpec: Record<string, any>,
    visualAgent?: string
  ): Promise<LessonStep | null> {
    const sets = ['visual_spec = $1'];
    const params: any[] = [JSON.stringify(visualSpec)];

    if (visualAgent) {
      sets.push(`visual_agent = $${params.length + 1}`);
      params.push(visualAgent);
    }

    params.push(stepId);
    const result = await this.pool.query(
      `UPDATE lesson_steps SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows.length > 0 ? this.rowToStep(result.rows[0]) : null;
  }

  // ── Assets ───────────────────────────────────────────────────────────────

  async createAsset(input: {
    lessonId: string;
    stepId?: string;
    assetType: AssetType;
    generatingAgent: string;
    generationPrompt?: string;
    generationParams?: Record<string, any>;
    assetUrl?: string;
    assetData?: Record<string, any>;
    thumbnailUrl?: string;
    fileSizeBytes?: number;
    mimeType?: string;
    altText?: string;
  }): Promise<LessonAsset> {
    const result = await this.pool.query(
      `INSERT INTO lesson_assets (
        lesson_id, step_id, asset_type, generating_agent,
        generation_prompt, generation_params,
        asset_url, asset_data, thumbnail_url,
        file_size_bytes, mime_type, alt_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.lessonId,
        input.stepId || null,
        input.assetType,
        input.generatingAgent,
        input.generationPrompt || null,
        input.generationParams ? JSON.stringify(input.generationParams) : null,
        input.assetUrl || null,
        input.assetData ? JSON.stringify(input.assetData) : null,
        input.thumbnailUrl || null,
        input.fileSizeBytes || null,
        input.mimeType || null,
        input.altText || null,
      ]
    );

    const asset = this.rowToAsset(result.rows[0]);

    // Link asset to step
    if (input.stepId) {
      await this.pool.query(
        `UPDATE lesson_steps SET asset_ids = asset_ids || $1 WHERE id = $2`,
        [JSON.stringify([asset.id]), input.stepId]
      );
    }

    await this.pool.query(
      `INSERT INTO lesson_lifecycle_events (lesson_id, to_state, event_type, event_payload)
       VALUES ($1, 'asset_generated', 'asset_generated', $2)`,
      [input.lessonId, JSON.stringify({ assetId: asset.id, assetType: input.assetType, agent: input.generatingAgent })]
    );

    return asset;
  }

  async getAssets(lessonId: string): Promise<LessonAsset[]> {
    const result = await this.pool.query(
      'SELECT * FROM lesson_assets WHERE lesson_id = $1 ORDER BY created_at',
      [lessonId]
    );
    return result.rows.map((r) => this.rowToAsset(r));
  }

  // ── Agent Tasks ──────────────────────────────────────────────────────────

  async createTask(input: CreateAgentTaskInput): Promise<AgentTask> {
    const result = await this.pool.query(
      `INSERT INTO lesson_agent_tasks (
        lesson_id, step_id, agent_id, task_type, input_payload, depends_on
      ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.lessonId,
        input.stepId || null,
        input.agentId,
        input.taskType,
        input.inputPayload ? JSON.stringify(input.inputPayload) : null,
        input.dependsOn || [],
      ]
    );
    return this.rowToTask(result.rows[0]);
  }

  async getTasks(lessonId: string): Promise<AgentTask[]> {
    const result = await this.pool.query(
      'SELECT * FROM lesson_agent_tasks WHERE lesson_id = $1 ORDER BY created_at',
      [lessonId]
    );
    return result.rows.map((r) => this.rowToTask(r));
  }

  async getTasksByAgent(agentId: AgentId, status?: TaskStatus): Promise<AgentTask[]> {
    const conditions = ['agent_id = $1'];
    const params: any[] = [agentId];
    if (status) {
      conditions.push(`status = $2`);
      params.push(status);
    }
    const result = await this.pool.query(
      `SELECT * FROM lesson_agent_tasks WHERE ${conditions.join(' AND ')} ORDER BY created_at`,
      params
    );
    return result.rows.map((r) => this.rowToTask(r));
  }

  async startTask(taskId: string): Promise<AgentTask | null> {
    const result = await this.pool.query(
      `UPDATE lesson_agent_tasks 
       SET status = 'in_progress', started_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [taskId]
    );
    return result.rows.length > 0 ? this.rowToTask(result.rows[0]) : null;
  }

  async completeTask(
    taskId: string,
    outputPayload: Record<string, any>,
    qualityScore?: number
  ): Promise<AgentTask | null> {
    const result = await this.pool.query(
      `UPDATE lesson_agent_tasks 
       SET status = 'completed', output_payload = $1, completed_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
           quality_score = $2
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(outputPayload), qualityScore || null, taskId]
    );

    if (result.rows.length > 0) {
      const task = this.rowToTask(result.rows[0]);
      await this.pool.query(
        `INSERT INTO lesson_lifecycle_events (lesson_id, to_state, event_type, event_payload)
         VALUES ($1, $2, 'agent_completed', $3)`,
        [task.lessonId, task.agentId, JSON.stringify({ taskId, taskType: task.taskType })]
      );
    }

    return result.rows.length > 0 ? this.rowToTask(result.rows[0]) : null;
  }

  async failTask(taskId: string, errorMessage: string): Promise<AgentTask | null> {
    const result = await this.pool.query(
      `UPDATE lesson_agent_tasks 
       SET status = 'failed', error_message = $1, completed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [errorMessage, taskId]
    );
    return result.rows.length > 0 ? this.rowToTask(result.rows[0]) : null;
  }

  async getReadyTasks(lessonId: string): Promise<AgentTask[]> {
    // Tasks that are pending and whose dependencies are all completed
    const result = await this.pool.query(
      `SELECT t.* FROM lesson_agent_tasks t
       WHERE t.lesson_id = $1 AND t.status = 'pending'
       AND (
         t.depends_on IS NULL OR array_length(t.depends_on, 1) IS NULL OR
         NOT EXISTS (
           SELECT 1 FROM unnest(t.depends_on) AS dep_id
           JOIN lesson_agent_tasks dep ON dep.id = dep_id
           WHERE dep.status != 'completed'
         )
       )
       ORDER BY t.created_at`,
      [lessonId]
    );
    return result.rows.map((r) => this.rowToTask(r));
  }

  // ── Reviews ──────────────────────────────────────────────────────────────

  async addReview(input: CreateReviewInput): Promise<LessonReview> {
    // Determine review round
    const roundResult = await this.pool.query(
      `SELECT COALESCE(MAX(review_round), 0) + 1 as next_round
       FROM lesson_reviews WHERE lesson_id = $1`,
      [input.lessonId]
    );
    const reviewRound = roundResult.rows[0]?.next_round || 1;

    const result = await this.pool.query(
      `INSERT INTO lesson_reviews (
        lesson_id, step_id, asset_id, reviewer_type, reviewer_id, reviewer_name,
        review_kind, verdict, score, notes, suggested_changes, review_round
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.lessonId,
        input.stepId || null,
        input.assetId || null,
        input.reviewerType,
        input.reviewerId,
        input.reviewerName || null,
        input.reviewKind,
        input.verdict,
        input.score || null,
        input.notes || null,
        JSON.stringify(input.suggestedChanges || []),
        reviewRound,
      ]
    );

    const review = this.rowToReview(result.rows[0]);

    // Update lesson review status based on verdict
    if (input.verdict === 'approved') {
      await this.pool.query(
        `UPDATE lessons SET review_status = 'approved' WHERE id = $1 AND review_status != 'approved'`,
        [input.lessonId]
      );
    } else if (input.verdict === 'rejected') {
      await this.pool.query(
        `UPDATE lessons SET review_status = 'rejected' WHERE id = $1`,
        [input.lessonId]
      );
    } else if (input.verdict === 'revision_requested') {
      await this.pool.query(
        `UPDATE lessons SET review_status = 'revision_requested' WHERE id = $1`,
        [input.lessonId]
      );
    }

    await this.pool.query(
      `INSERT INTO lesson_lifecycle_events (lesson_id, to_state, event_type, event_payload)
       VALUES ($1, $2, 'review_submitted', $3)`,
      [input.lessonId, input.verdict, JSON.stringify({ reviewId: review.id, reviewerId: input.reviewerId })]
    );

    return review;
  }

  async getReviews(lessonId: string): Promise<LessonReview[]> {
    const result = await this.pool.query(
      'SELECT * FROM lesson_reviews WHERE lesson_id = $1 ORDER BY review_round, created_at',
      [lessonId]
    );
    return result.rows.map((r) => this.rowToReview(r));
  }

  // ── Lifecycle Events ─────────────────────────────────────────────────────

  async getLifecycleEvents(lessonId: string): Promise<LifecycleEvent[]> {
    const result = await this.pool.query(
      'SELECT * FROM lesson_lifecycle_events WHERE lesson_id = $1 ORDER BY created_at DESC',
      [lessonId]
    );
    return result.rows.map((r) => this.rowToEvent(r));
  }

  // ── Assignments ──────────────────────────────────────────────────────────

  async assignLessonToChild(
    lessonId: string,
    childUserId: string,
    assignedBy: string,
    dueDate?: string,
    priority?: number
  ): Promise<LessonAssignment> {
    const result = await this.pool.query(
      `INSERT INTO lesson_assignments (lesson_id, child_user_id, assigned_by, due_date, priority)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (lesson_id, child_user_id) DO UPDATE SET
         due_date = EXCLUDED.due_date,
         priority = EXCLUDED.priority,
         status = CASE WHEN lesson_assignments.status = 'completed' THEN lesson_assignments.status ELSE 'assigned' END,
         updated_at = NOW()
       RETURNING *`,
      [lessonId, childUserId, assignedBy, dueDate || null, priority || 0]
    );
    return this.rowToAssignment(result.rows[0]);
  }

  async getChildAssignments(childUserId: string, status?: string): Promise<LessonAssignment[]> {
    const conditions = ['child_user_id = $1'];
    const params: any[] = [childUserId];
    if (status) {
      conditions.push(`status = $2`);
      params.push(status);
    }
    const result = await this.pool.query(
      `SELECT * FROM lesson_assignments WHERE ${conditions.join(' AND ')} ORDER BY priority DESC, created_at DESC`,
      params
    );
    return result.rows.map((r) => this.rowToAssignment(r));
  }

  // ── Full lesson fetch (with steps, assets, tasks) ────────────────────────

  async getFullLesson(lessonId: string): Promise<{
    lesson: Lesson | null;
    steps: LessonStep[];
    assets: LessonAsset[];
    tasks: AgentTask[];
    reviews: LessonReview[];
    events: LifecycleEvent[];
  }> {
    const lesson = await this.getLesson(lessonId);
    if (!lesson) {
      return { lesson: null, steps: [], assets: [], tasks: [], reviews: [], events: [] };
    }

    const [steps, assets, tasks, reviews, events] = await Promise.all([
      this.getSteps(lessonId),
      this.getAssets(lessonId),
      this.getTasks(lessonId),
      this.getReviews(lessonId),
      this.getLifecycleEvents(lessonId),
    ]);

    return { lesson, steps, assets, tasks, reviews, events };
  }

  // ─── Row mappers ─────────────────────────────────────────────────────────

  private rowToLesson(row: Record<string, any>): Lesson {
    return {
      id: String(row.id),
      courseCode: row.course_code,
      unitCode: row.unit_code || null,
      lessonCode: row.lesson_code,
      title: row.title,
      description: row.description || null,
      lessonEmoji: row.lesson_emoji || '📚',
      subject: row.subject,
      ageBand: row.age_band,
      minGrade: row.min_grade || null,
      maxGrade: row.max_grade || null,
      difficulty: row.difficulty || 1,
      skillCodes: row.skill_codes || [],
      curriculumStandards: row.curriculum_standards || [],
      estimatedMinutes: row.estimated_minutes || 10,
      prerequisites: row.prerequisites || [],
      lifecycleState: row.lifecycle_state,
      leadAgent: row.lead_agent || null,
      assignedAgents: row.assigned_agents || [],
      designSpec: row.design_spec || null,
      reviewStatus: row.review_status || 'pending',
      safetyReviewStatus: row.safety_review_status || 'pending',
      contentItemIds: row.content_item_ids || [],
      createdBy: row.created_by || null,
      publishedBy: row.published_by || null,
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private rowToStep(row: Record<string, any>): LessonStep {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      stepNumber: row.step_number,
      stepType: row.step_type,
      title: row.title,
      description: row.description || null,
      stepEmoji: row.step_emoji || '⭐',
      content: row.content || null,
      visualSpec: row.visual_spec || null,
      contentAgent: row.content_agent || null,
      visualAgent: row.visual_agent || null,
      reviewStatus: row.review_status || 'pending',
      assetIds: row.asset_ids || [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private rowToAsset(row: Record<string, any>): LessonAsset {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      stepId: row.step_id ? String(row.step_id) : null,
      assetType: row.asset_type,
      generatingAgent: row.generating_agent,
      generationPrompt: row.generation_prompt || null,
      generationParams: row.generation_params || null,
      assetUrl: row.asset_url || null,
      assetData: row.asset_data || null,
      thumbnailUrl: row.thumbnail_url || null,
      reviewStatus: row.review_status || 'pending',
      fileSizeBytes: row.file_size_bytes || null,
      mimeType: row.mime_type || null,
      altText: row.alt_text || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private rowToTask(row: Record<string, any>): AgentTask {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      stepId: row.step_id ? String(row.step_id) : null,
      agentId: row.agent_id,
      taskType: row.task_type,
      inputPayload: row.input_payload || null,
      outputPayload: row.output_payload || null,
      status: row.status,
      dependsOn: row.depends_on || [],
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      durationMs: row.duration_ms || null,
      qualityScore: row.quality_score !== null ? parseFloat(row.quality_score) : null,
      reviewNotes: row.review_notes || null,
      errorMessage: row.error_message || null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private rowToReview(row: Record<string, any>): LessonReview {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      stepId: row.step_id ? String(row.step_id) : null,
      assetId: row.asset_id ? String(row.asset_id) : null,
      reviewerType: row.reviewer_type,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name || null,
      reviewKind: row.review_kind,
      verdict: row.verdict,
      score: row.score !== null ? parseFloat(row.score) : null,
      notes: row.notes || null,
      suggestedChanges: row.suggested_changes || [],
      reviewRound: row.review_round || 1,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private rowToEvent(row: Record<string, any>): LifecycleEvent {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      fromState: row.from_state || null,
      toState: row.to_state,
      eventType: row.event_type,
      triggeredBy: row.triggered_by || null,
      triggeredByType: row.triggered_by_type || null,
      eventPayload: row.event_payload || null,
      notes: row.notes || null,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private rowToAssignment(row: Record<string, any>): LessonAssignment {
    return {
      id: String(row.id),
      lessonId: String(row.lesson_id),
      childUserId: String(row.child_user_id),
      assignedBy: row.assigned_by,
      dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
      priority: row.priority || 0,
      status: row.status,
      currentStep: row.current_step || 0,
      score: row.score !== null ? parseFloat(row.score) : null,
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
      difficultyOverride: row.difficulty_override || null,
      adaptations: row.adaptations || {},
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
