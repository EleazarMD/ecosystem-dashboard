/**
 * Learning Path Service
 *
 * Generates and manages individualized learning paths for children.
 * Paths are tailored based on child profile, skill progress, interests,
 * and curriculum alignment. Supports adaptive difficulty adjustment.
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface ChildLearningPath {
  id: string;
  childUserId: string;
  title: string;
  description?: string;
  pathEmoji: string;
  source: 'adaptive' | 'parent_assigned' | 'curriculum_aligned' | 'interest_based';
  focusDomains: string[];
  totalSteps: number;
  currentStep: number;
  currentDifficulty: number;
  status: 'active' | 'completed' | 'paused' | 'archived';
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PathStep {
  id: string;
  pathId: string;
  stepNumber: number;
  title: string;
  description?: string;
  stepEmoji: string;
  contentItemId?: string;
  customPrompt?: string;
  customContentType?: string;
  skillCode?: string;
  targetDifficulty?: number;
  hints: string[];
  isCompleted: boolean;
  completedAt?: Date;
  score?: number;
  timeSpentSeconds?: number;
  remediationStepId?: string;
}

export interface PathWithSteps extends ChildLearningPath {
  steps: PathStep[];
  completionPct: number;
}

export interface PathRecommendation {
  title: string;
  description: string;
  pathEmoji: string;
  source: ChildLearningPath['source'];
  focusDomains: string[];
  steps: {
    title: string;
    description?: string;
    stepEmoji: string;
    skillCode?: string;
    customPrompt?: string;
    customContentType?: string;
    targetDifficulty?: number;
    hints?: string[];
  }[];
}

// ============================================================================
// Service
// ============================================================================

export class LearningPathService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Path CRUD
  // ==========================================================================

  async createPath(
    childUserId: string,
    data: {
      title: string;
      description?: string;
      pathEmoji?: string;
      source?: ChildLearningPath['source'];
      focusDomains?: string[];
      totalSteps?: number;
      teamId?: string;
      steps?: {
        title: string;
        description?: string;
        stepEmoji?: string;
        contentItemId?: string;
        customPrompt?: string;
        customContentType?: string;
        skillCode?: string;
        targetDifficulty?: number;
        hints?: string[];
      }[];
    }
  ): Promise<ChildLearningPath> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const pathResult = await client.query(
        `INSERT INTO child_learning_paths
          (child_user_id, title, description, path_emoji, source, focus_domains,
           total_steps, current_step, current_difficulty, team_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1, $8)
         RETURNING *`,
        [
          childUserId,
          data.title,
          data.description || null,
          data.pathEmoji || '🗺️',
          data.source || 'adaptive',
          JSON.stringify(data.focusDomains || []),
          data.totalSteps || data.steps?.length || 5,
          data.teamId || null,
        ]
      );

      const pathId = pathResult.rows[0].id;

      // Insert steps if provided
      if (data.steps && data.steps.length > 0) {
        for (let i = 0; i < data.steps.length; i++) {
          const step = data.steps[i];
          await client.query(
            `INSERT INTO child_learning_path_steps
              (path_id, step_number, title, description, step_emoji, content_item_id,
               custom_prompt, custom_content_type, skill_code, target_difficulty, hints)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              pathId,
              i + 1,
              step.title,
              step.description || null,
              step.stepEmoji || '⭐',
              step.contentItemId || null,
              step.customPrompt || null,
              step.customContentType || null,
              step.skillCode || null,
              step.targetDifficulty || 1,
              JSON.stringify(step.hints || []),
            ]
          );
        }
      }

      await client.query('COMMIT');
      return this.mapPath(pathResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPath(pathId: string): Promise<PathWithSteps | null> {
    const pathResult = await this.pool.query(
      'SELECT * FROM child_learning_paths WHERE id = $1',
      [pathId]
    );
    if (pathResult.rows.length === 0) return null;

    const stepsResult = await this.pool.query(
      'SELECT * FROM child_learning_path_steps WHERE path_id = $1 ORDER BY step_number ASC',
      [pathId]
    );

    const path = this.mapPath(pathResult.rows[0]);
    const steps = stepsResult.rows.map((row) => this.mapStep(row));
    const completedCount = steps.filter((s) => s.isCompleted).length;
    const completionPct = steps.length > 0
      ? Math.round((completedCount / steps.length) * 100 * 10) / 10
      : 0;

    return { ...path, steps, completionPct };
  }

  async getActivePaths(childUserId: string): Promise<PathWithSteps[]> {
    const result = await this.pool.query(
      `SELECT * FROM child_active_path_summary
       WHERE child_user_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [childUserId]
    );

    const paths: PathWithSteps[] = [];
    for (const row of result.rows) {
      const path = await this.getPath(row.path_id);
      if (path) paths.push(path);
    }
    return paths;
  }

  async getAllPaths(childUserId: string): Promise<PathWithSteps[]> {
    const result = await this.pool.query(
      `SELECT * FROM child_learning_paths WHERE child_user_id = $1 ORDER BY created_at DESC`,
      [childUserId]
    );

    const paths: PathWithSteps[] = [];
    for (const row of result.rows) {
      const path = await this.getPath(row.id);
      if (path) paths.push(path);
    }
    return paths;
  }

  async updatePathStatus(
    pathId: string,
    status: ChildLearningPath['status']
  ): Promise<void> {
    if (status === 'completed') {
      await this.pool.query(
        `UPDATE child_learning_paths SET status = 'completed', completed_at = NOW(), current_step = total_steps WHERE id = $1`,
        [pathId]
      );
    } else {
      await this.pool.query(
        'UPDATE child_learning_paths SET status = $2 WHERE id = $1',
        [pathId, status]
      );
    }
  }

  // ==========================================================================
  // Step Progress
  // ==========================================================================

  async completeStep(
    pathId: string,
    stepNumber: number,
    options?: { score?: number; timeSpentSeconds?: number }
  ): Promise<{ pathCompleted: boolean; nextStep?: PathStep }> {
    await this.pool.query(
      `UPDATE child_learning_path_steps
       SET is_completed = true, completed_at = NOW(),
           score = $3, time_spent_seconds = $4
       WHERE path_id = $1 AND step_number = $2`,
      [pathId, stepNumber, options?.score || null, options?.timeSpentSeconds || null]
    );

    // Update path progress
    const stepsResult = await this.pool.query(
      'SELECT * FROM child_learning_path_steps WHERE path_id = $1 ORDER BY step_number ASC',
      [pathId]
    );
    const completedCount = stepsResult.rows.filter((r: any) => r.is_completed).length;
    const totalSteps = stepsResult.rows.length;

    // Adaptive difficulty: if score < 0.5, decrease difficulty; if > 0.85, increase
    let newDifficulty = 1;
    if (options?.score !== undefined) {
      const pathResult = await this.pool.query(
        'SELECT current_difficulty FROM child_learning_paths WHERE id = $1',
        [pathId]
      );
      const currentDiff = pathResult.rows[0]?.current_difficulty || 1;
      if (options.score < 0.5 && currentDiff > 1) {
        newDifficulty = currentDiff - 1;
      } else if (options.score > 0.85 && currentDiff < 5) {
        newDifficulty = currentDiff + 1;
      } else {
        newDifficulty = currentDiff;
      }
    }

    const pathCompleted = completedCount >= totalSteps;

    if (pathCompleted) {
      await this.updatePathStatus(pathId, 'completed');
    } else {
      await this.pool.query(
        `UPDATE child_learning_paths
         SET current_step = $2, current_difficulty = $3 WHERE id = $1`,
        [pathId, completedCount, newDifficulty]
      );
    }

    // Find next incomplete step
    const nextStepRow = stepsResult.rows.find((r: any) => !r.is_completed);
    const nextStep = nextStepRow ? this.mapStep(nextStepRow) : undefined;

    return { pathCompleted, nextStep };
  }

  async getStep(pathId: string, stepNumber: number): Promise<PathStep | null> {
    const result = await this.pool.query(
      'SELECT * FROM child_learning_path_steps WHERE path_id = $1 AND step_number = $2',
      [pathId, stepNumber]
    );
    return result.rows.length > 0 ? this.mapStep(result.rows[0]) : null;
  }

  async getCurrentStep(pathId: string): Promise<PathStep | null> {
    const path = await this.getPath(pathId);
    if (!path) return null;
    return path.steps.find((s) => !s.isCompleted) || null;
  }

  // ==========================================================================
  // Adaptive Path Generation
  // ==========================================================================

  async generateAdaptivePath(
    childUserId: string,
    options?: { focusDomain?: string; teamId?: string }
  ): Promise<PathWithSteps> {
    // Get child's skill progress to identify areas for growth
    const skillResult = await this.pool.query(
      `SELECT s.code, s.name, sd.code as domain_code, sd.name as domain_name,
              COALESCE(ssp.current_score, 0) as score
       FROM skills s
       JOIN skill_domains sd ON sd.id = s.domain_id
       LEFT JOIN student_skill_progress ssp ON ssp.skill_id = s.id
       WHERE s.is_active = true
       ORDER BY ssp.current_score ASC NULLS FIRST
       LIMIT 10`,
      []
    );

    // Get child's name for personalization
    const childResult = await this.pool.query(
      'SELECT name FROM users WHERE id = $1',
      [childUserId]
    );
    const childName = childResult.rows[0]?.name || 'Explorer';

    // Pick focus domain: explicit > lowest-scoring domain
    let focusDomain = options?.focusDomain;
    let focusDomainName = focusDomain || 'mixed';

    if (!focusDomain && skillResult.rows.length > 0) {
      focusDomain = skillResult.rows[0].domain_code;
      focusDomainName = skillResult.rows[0].domain_name;
    }

    // Generate 5 adaptive steps
    const steps = this.generatePathSteps(childName, focusDomain || 'mixed', focusDomainName);

    const path = await this.createPath(childUserId, {
      title: `${childName}'s ${focusDomainName} Adventure`,
      description: `A personalized learning path focused on ${focusDomainName.toLowerCase()} skills.`,
      pathEmoji: '🗺️',
      source: 'adaptive',
      focusDomains: focusDomain ? [focusDomain] : [],
      totalSteps: steps.length,
      teamId: options?.teamId,
      steps,
    });

    return (await this.getPath(path.id))!;
  }

  private generatePathSteps(
    childName: string,
    domainCode: string,
    domainName: string
  ): {
    title: string;
    description?: string;
    stepEmoji: string;
    skillCode?: string;
    customPrompt?: string;
    customContentType?: string;
    targetDifficulty?: number;
    hints?: string[];
  }[] {
    const domainLower = domainName.toLowerCase();

    return [
      {
        title: `Welcome to ${domainName}!`,
        description: `Let's start your ${domainLower} journey with a warm-up.`,
        stepEmoji: '🌱',
        customPrompt: `What do you already know about ${domainLower}? List one thing you're curious about!`,
        customContentType: 'question',
        targetDifficulty: 1,
        hints: ['Think about something you learned recently', 'What sounds fun to learn?'],
      },
      {
        title: `Building ${domainName} Skills`,
        description: `Time to practice the fundamentals.`,
        stepEmoji: '📚',
        skillCode: domainCode ? `${domainCode}_basics` : undefined,
        customPrompt: `Let's practice a ${domainLower} problem together!`,
        customContentType: 'problem',
        targetDifficulty: 2,
        hints: ['Take it step by step', 'Break the problem into smaller parts'],
      },
      {
        title: `${domainName} Challenge`,
        description: `Now let's try something a bit harder!`,
        stepEmoji: '⚡',
        skillCode: domainCode ? `${domainCode}_intermediate` : undefined,
        customPrompt: `Here's a ${domainLower} challenge. Can you solve it?`,
        customContentType: 'problem',
        targetDifficulty: 3,
        hints: ['Remember what you learned in the previous step', 'Try a different approach if you get stuck'],
      },
      {
        title: `Creative ${domainName}`,
        description: `Apply what you've learned in a creative way!`,
        stepEmoji: '🎨',
        customPrompt: `Create something original using ${domainLower}! Write a story, solve a puzzle, or design an experiment.`,
        customContentType: 'writing',
        targetDifficulty: 3,
        hints: ['Be creative!', 'There\'s no wrong answer here', 'Use what you\'ve learned so far'],
      },
      {
        title: `${domainName} Master!`,
        description: `Show off your ${domainLower} mastery with this final challenge!`,
        stepEmoji: '🏆',
        skillCode: domainCode ? `${domainCode}_advanced` : undefined,
        customPrompt: `You've come so far! Here's a final ${domainLower} challenge to prove your mastery.`,
        customContentType: 'reasoning',
        targetDifficulty: 4,
        hints: ['You\'ve got this!', 'Combine everything you\'ve learned'],
      },
    ];
  }

  // ==========================================================================
  // Mapping helpers
  // ==========================================================================

  private mapPath(row: any): ChildLearningPath {
    return {
      id: row.id,
      childUserId: row.child_user_id,
      title: row.title,
      description: row.description,
      pathEmoji: row.path_emoji,
      source: row.source,
      focusDomains: Array.isArray(row.focus_domains) ? row.focus_domains : JSON.parse(row.focus_domains || '[]'),
      totalSteps: row.total_steps,
      currentStep: row.current_step,
      currentDifficulty: row.current_difficulty,
      status: row.status,
      teamId: row.team_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }

  private mapStep(row: any): PathStep {
    return {
      id: row.id,
      pathId: row.path_id,
      stepNumber: row.step_number,
      title: row.title,
      description: row.description,
      stepEmoji: row.step_emoji,
      contentItemId: row.content_item_id,
      customPrompt: row.custom_prompt,
      customContentType: row.custom_content_type,
      skillCode: row.skill_code,
      targetDifficulty: row.target_difficulty,
      hints: Array.isArray(row.hints) ? row.hints : JSON.parse(row.hints || '[]'),
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      score: row.score !== null ? parseFloat(row.score) : undefined,
      timeSpentSeconds: row.time_spent_seconds,
      remediationStepId: row.remediation_step_id,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let pathServiceInstance: LearningPathService | null = null;

export function getLearningPathService(pool: Pool): LearningPathService {
  if (!pathServiceInstance) {
    pathServiceInstance = new LearningPathService(pool);
  }
  return pathServiceInstance;
}
