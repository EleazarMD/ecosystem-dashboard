/**
 * Kids Personal Identity Core (PIC) Service
 * 
 * Multi-tenant knowledge management for children's activities.
 * Connects Workspace, Planner, Journal, Chat, Books, and Activities.
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface ChildProfile {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  ageGroup: 'early' | 'middle' | 'tween';
  gradeLevel?: string;
  favoriteTopics: string[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  preferredCharacters: string[];
  themePreferences: Record<string, any>;
  currentGoals: Goal[];
  interests: string[];
  strengths: string[];
  areasForGrowth: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  targetDate?: Date;
  progress: number;
  status: 'active' | 'completed' | 'paused';
}

export interface KnowledgeEntry {
  id: string;
  childId: string;
  sourceType: 'workspace' | 'planner' | 'journal' | 'chat' | 'books' | 'activity';
  sourceId?: string;
  sourceContext: Record<string, any>;
  knowledgeType: 'fact' | 'preference' | 'achievement' | 'goal' | 'interest' | 'skill' | 'memory' | 'relationship';
  category: string;
  title?: string;
  content: string;
  keywords: string[];
  entities: Entity[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  importanceScore: number;
  eventDate?: Date;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
}

export interface Entity {
  name: string;
  type: string; // 'person', 'place', 'thing', 'event', 'topic'
  context?: string;
}

export interface ChildProgress {
  id: string;
  childId: string;
  progressType: 'streak' | 'milestone' | 'skill_level' | 'completion' | 'habit';
  category: string;
  metricName: string;
  currentValue: number;
  targetValue?: number;
  unit: string;
  streakCount: number;
  bestStreak: number;
  lastActivityDate?: Date;
}

export interface Achievement {
  id: string;
  childId: string;
  achievementType: 'badge' | 'milestone' | 'certificate' | 'reward';
  achievementCode: string;
  title: string;
  description?: string;
  icon: string;
  category: string;
  earnedAt: Date;
}

export interface CharacterInteraction {
  id: string;
  childId: string;
  characterId: string;
  characterName: string;
  totalInteractions: number;
  lastInteractionAt?: Date;
  favoriteTopics: string[];
  affinityScore: number;
  interactionStyle: string;
  memorableMoments: MemorableMoment[];
}

export interface MemorableMoment {
  date: Date;
  summary: string;
  sentiment: string;
  topic?: string;
}

export interface ActivityLogEntry {
  id: string;
  childId: string;
  activityType: string;
  activityCategory: string;
  sourceType: string;
  sourceId?: string;
  title?: string;
  description?: string;
  metadata: Record<string, any>;
  durationSeconds?: number;
  engagementScore?: number;
  occurredAt: Date;
}

export interface ChildContext {
  profile: ChildProfile;
  recentActivities: ActivityLogEntry[];
  currentProgress: ChildProgress[];
  recentAchievements: Achievement[];
  relevantKnowledge: KnowledgeEntry[];
  characterRelationships: CharacterInteraction[];
}

// ============================================================================
// Kids PIC Service Class
// ============================================================================

export class KidsPICService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  async getOrCreateProfile(userId: string): Promise<ChildProfile> {
    // Try to get existing profile
    const existing = await this.pool.query(
      'SELECT * FROM child_profiles WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return this.mapProfile(existing.rows[0]);
    }

    // Create new profile
    const result = await this.pool.query(
      `INSERT INTO child_profiles (user_id, display_name, age_group)
       VALUES ($1, 'New Explorer', 'middle')
       RETURNING *`,
      [userId]
    );

    return this.mapProfile(result.rows[0]);
  }

  async updateProfile(childId: string, updates: Partial<ChildProfile>): Promise<ChildProfile> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.ageGroup !== undefined) {
      fields.push(`age_group = $${paramIndex++}`);
      values.push(updates.ageGroup);
    }
    if (updates.gradeLevel !== undefined) {
      fields.push(`grade_level = $${paramIndex++}`);
      values.push(updates.gradeLevel);
    }
    if (updates.favoriteTopics !== undefined) {
      fields.push(`favorite_topics = $${paramIndex++}`);
      values.push(JSON.stringify(updates.favoriteTopics));
    }
    if (updates.learningStyle !== undefined) {
      fields.push(`learning_style = $${paramIndex++}`);
      values.push(updates.learningStyle);
    }
    if (updates.interests !== undefined) {
      fields.push(`interests = $${paramIndex++}`);
      values.push(JSON.stringify(updates.interests));
    }
    if (updates.currentGoals !== undefined) {
      fields.push(`current_goals = $${paramIndex++}`);
      values.push(JSON.stringify(updates.currentGoals));
    }

    values.push(childId);

    const result = await this.pool.query(
      `UPDATE child_profiles SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return this.mapProfile(result.rows[0]);
  }

  // ==========================================================================
  // Knowledge Management
  // ==========================================================================

  async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'validFrom' | 'isActive'>): Promise<KnowledgeEntry> {
    const result = await this.pool.query(
      `INSERT INTO child_knowledge_entries 
       (child_id, source_type, source_id, source_context, knowledge_type, category, title, content, keywords, entities, sentiment, importance_score, event_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        entry.childId,
        entry.sourceType,
        entry.sourceId,
        JSON.stringify(entry.sourceContext),
        entry.knowledgeType,
        entry.category,
        entry.title,
        entry.content,
        JSON.stringify(entry.keywords),
        JSON.stringify(entry.entities),
        entry.sentiment,
        entry.importanceScore,
        entry.eventDate
      ]
    );

    return this.mapKnowledge(result.rows[0]);
  }

  async getRelevantKnowledge(
    childId: string,
    options: {
      sourceTypes?: string[];
      knowledgeTypes?: string[];
      categories?: string[];
      keywords?: string[];
      limit?: number;
    } = {}
  ): Promise<KnowledgeEntry[]> {
    let query = 'SELECT * FROM child_knowledge_entries WHERE child_id = $1 AND is_active = true';
    const params: any[] = [childId];
    let paramIndex = 2;

    if (options.sourceTypes?.length) {
      query += ` AND source_type = ANY($${paramIndex++})`;
      params.push(options.sourceTypes);
    }
    if (options.knowledgeTypes?.length) {
      query += ` AND knowledge_type = ANY($${paramIndex++})`;
      params.push(options.knowledgeTypes);
    }
    if (options.categories?.length) {
      query += ` AND category = ANY($${paramIndex++})`;
      params.push(options.categories);
    }

    query += ` ORDER BY importance_score DESC, created_at DESC LIMIT $${paramIndex}`;
    params.push(options.limit || 20);

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapKnowledge(row));
  }

  async searchKnowledge(childId: string, searchQuery: string, limit: number = 10): Promise<KnowledgeEntry[]> {
    const result = await this.pool.query(
      `SELECT * FROM child_knowledge_entries 
       WHERE child_id = $1 AND is_active = true
       AND (content ILIKE $2 OR title ILIKE $2 OR keywords::text ILIKE $2)
       ORDER BY importance_score DESC, created_at DESC
       LIMIT $3`,
      [childId, `%${searchQuery}%`, limit]
    );

    return result.rows.map(row => this.mapKnowledge(row));
  }

  // ==========================================================================
  // Progress Tracking
  // ==========================================================================

  async updateProgress(
    childId: string,
    category: string,
    metricName: string,
    value: number,
    options: { incrementStreak?: boolean; targetValue?: number; unit?: string } = {}
  ): Promise<ChildProgress> {
    // Check if progress record exists
    const existing = await this.pool.query(
      'SELECT * FROM child_progress WHERE child_id = $1 AND category = $2 AND metric_name = $3',
      [childId, category, metricName]
    );

    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      let newStreakCount = current.streak_count;
      let newBestStreak = current.best_streak;

      if (options.incrementStreak) {
        const lastDate = current.last_activity_date ? new Date(current.last_activity_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (lastDate) {
          lastDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff === 1) {
            newStreakCount++;
          } else if (daysDiff > 1) {
            newStreakCount = 1;
          }
        } else {
          newStreakCount = 1;
        }

        newBestStreak = Math.max(newBestStreak, newStreakCount);
      }

      const result = await this.pool.query(
        `UPDATE child_progress 
         SET current_value = $1, streak_count = $2, best_streak = $3, last_activity_date = CURRENT_DATE, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [value, newStreakCount, newBestStreak, current.id]
      );

      return this.mapProgress(result.rows[0]);
    }

    // Create new progress record
    const result = await this.pool.query(
      `INSERT INTO child_progress (child_id, progress_type, category, metric_name, current_value, target_value, unit, streak_count, last_activity_date)
       VALUES ($1, 'completion', $2, $3, $4, $5, $6, $7, CURRENT_DATE)
       RETURNING *`,
      [childId, category, metricName, value, options.targetValue, options.unit || 'count', options.incrementStreak ? 1 : 0]
    );

    return this.mapProgress(result.rows[0]);
  }

  async getProgress(childId: string, category?: string): Promise<ChildProgress[]> {
    let query = 'SELECT * FROM child_progress WHERE child_id = $1';
    const params: any[] = [childId];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    query += ' ORDER BY updated_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapProgress(row));
  }

  // ==========================================================================
  // Achievements
  // ==========================================================================

  async checkAndAwardAchievements(childId: string): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];

    // Get all achievement definitions
    const definitions = await this.pool.query('SELECT * FROM achievement_definitions WHERE is_active = true');

    // Get child's current achievements
    const existing = await this.pool.query(
      'SELECT achievement_code FROM child_achievements WHERE child_id = $1',
      [childId]
    );
    const existingCodes = new Set(existing.rows.map(r => r.achievement_code));

    // Get child's progress
    const progress = await this.getProgress(childId);
    const progressMap = new Map(progress.map(p => [`${p.category}_${p.metricName}`, p]));

    for (const def of definitions.rows) {
      if (existingCodes.has(def.code)) continue;

      let earned = false;
      const metric = progressMap.get(`${def.category}_${def.requirement_metric}`);

      if (metric) {
        switch (def.requirement_type) {
          case 'count':
            earned = metric.currentValue >= def.requirement_value;
            break;
          case 'streak':
            earned = metric.streakCount >= def.requirement_value;
            break;
          case 'milestone':
            earned = metric.currentValue >= def.requirement_value;
            break;
        }
      }

      if (earned) {
        const result = await this.pool.query(
          `INSERT INTO child_achievements (child_id, achievement_type, achievement_code, title, description, icon, category)
           VALUES ($1, 'badge', $2, $3, $4, $5, $6)
           RETURNING *`,
          [childId, def.code, def.title, def.description, def.icon, def.category]
        );

        newAchievements.push(this.mapAchievement(result.rows[0]));
      }
    }

    return newAchievements;
  }

  async getAchievements(childId: string): Promise<Achievement[]> {
    const result = await this.pool.query(
      'SELECT * FROM child_achievements WHERE child_id = $1 ORDER BY earned_at DESC',
      [childId]
    );
    return result.rows.map(row => this.mapAchievement(row));
  }

  // ==========================================================================
  // Character Interactions
  // ==========================================================================

  async recordCharacterInteraction(
    childId: string,
    characterId: string,
    characterName: string,
    topic?: string,
    memorableMoment?: string
  ): Promise<CharacterInteraction> {
    // Get or create interaction record
    const existing = await this.pool.query(
      'SELECT * FROM child_character_interactions WHERE child_id = $1 AND character_id = $2',
      [childId, characterId]
    );

    if (existing.rows.length > 0) {
      const current = existing.rows[0];
      const topics = current.favorite_topics || [];
      const moments = current.memorable_moments || [];

      if (topic && !topics.includes(topic)) {
        topics.push(topic);
      }

      if (memorableMoment) {
        moments.push({
          date: new Date().toISOString(),
          summary: memorableMoment,
          sentiment: 'positive',
          topic
        });
        // Keep only last 20 moments
        if (moments.length > 20) moments.shift();
      }

      const result = await this.pool.query(
        `UPDATE child_character_interactions 
         SET total_interactions = total_interactions + 1, 
             last_interaction_at = NOW(),
             favorite_topics = $1,
             memorable_moments = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [JSON.stringify(topics), JSON.stringify(moments), current.id]
      );

      return this.mapCharacterInteraction(result.rows[0]);
    }

    // Create new interaction record
    const result = await this.pool.query(
      `INSERT INTO child_character_interactions 
       (child_id, character_id, character_name, total_interactions, last_interaction_at, favorite_topics, memorable_moments)
       VALUES ($1, $2, $3, 1, NOW(), $4, $5)
       RETURNING *`,
      [
        childId,
        characterId,
        characterName,
        JSON.stringify(topic ? [topic] : []),
        JSON.stringify(memorableMoment ? [{ date: new Date().toISOString(), summary: memorableMoment, sentiment: 'positive', topic }] : [])
      ]
    );

    return this.mapCharacterInteraction(result.rows[0]);
  }

  async getCharacterInteractions(childId: string): Promise<CharacterInteraction[]> {
    const result = await this.pool.query(
      'SELECT * FROM child_character_interactions WHERE child_id = $1 ORDER BY total_interactions DESC',
      [childId]
    );
    return result.rows.map(row => this.mapCharacterInteraction(row));
  }

  // ==========================================================================
  // Activity Logging
  // ==========================================================================

  async logActivity(entry: Omit<ActivityLogEntry, 'id' | 'occurredAt'>): Promise<ActivityLogEntry> {
    const result = await this.pool.query(
      `INSERT INTO child_activity_log 
       (child_id, activity_type, activity_category, source_type, source_id, title, description, metadata, duration_seconds, engagement_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        entry.childId,
        entry.activityType,
        entry.activityCategory,
        entry.sourceType,
        entry.sourceId,
        entry.title,
        entry.description,
        JSON.stringify(entry.metadata),
        entry.durationSeconds,
        entry.engagementScore
      ]
    );

    return this.mapActivityLog(result.rows[0]);
  }

  async getRecentActivities(childId: string, limit: number = 20): Promise<ActivityLogEntry[]> {
    const result = await this.pool.query(
      'SELECT * FROM child_activity_log WHERE child_id = $1 ORDER BY occurred_at DESC LIMIT $2',
      [childId, limit]
    );
    return result.rows.map(row => this.mapActivityLog(row));
  }

  // ==========================================================================
  // Full Context for AI Characters
  // ==========================================================================

  async getChildContext(childId: string): Promise<ChildContext> {
    const [profile, recentActivities, currentProgress, recentAchievements, relevantKnowledge, characterRelationships] = await Promise.all([
      this.pool.query('SELECT * FROM child_profiles WHERE id = $1', [childId]).then(r => this.mapProfile(r.rows[0])),
      this.getRecentActivities(childId, 10),
      this.getProgress(childId),
      this.pool.query('SELECT * FROM child_achievements WHERE child_id = $1 ORDER BY earned_at DESC LIMIT 5', [childId]).then(r => r.rows.map(row => this.mapAchievement(row))),
      this.getRelevantKnowledge(childId, { limit: 15 }),
      this.getCharacterInteractions(childId)
    ]);

    return {
      profile,
      recentActivities,
      currentProgress,
      recentAchievements,
      relevantKnowledge,
      characterRelationships
    };
  }

  async generateContextSummary(childId: string): Promise<string> {
    const context = await this.getChildContext(childId);
    
    const parts: string[] = [];

    // Profile summary
    parts.push(`${context.profile.displayName} is a ${context.profile.ageGroup} learner.`);
    
    if (context.profile.interests.length > 0) {
      parts.push(`Interests: ${context.profile.interests.slice(0, 5).join(', ')}.`);
    }

    // Recent achievements
    if (context.recentAchievements.length > 0) {
      parts.push(`Recent achievements: ${context.recentAchievements.map(a => a.title).join(', ')}.`);
    }

    // Progress highlights
    const streaks = context.currentProgress.filter(p => p.streakCount > 0);
    if (streaks.length > 0) {
      parts.push(`Current streaks: ${streaks.map(s => `${s.category} (${s.streakCount} days)`).join(', ')}.`);
    }

    // Recent activities
    if (context.recentActivities.length > 0) {
      const recentTypes = [...new Set(context.recentActivities.slice(0, 5).map(a => a.activityType))];
      parts.push(`Recent activities: ${recentTypes.join(', ')}.`);
    }

    return parts.join(' ');
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private mapProfile(row: any): ChildProfile {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      ageGroup: row.age_group,
      gradeLevel: row.grade_level,
      favoriteTopics: row.favorite_topics || [],
      learningStyle: row.learning_style,
      preferredCharacters: row.preferred_characters || [],
      themePreferences: row.theme_preferences || {},
      currentGoals: row.current_goals || [],
      interests: row.interests || [],
      strengths: row.strengths || [],
      areasForGrowth: row.areas_for_growth || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapKnowledge(row: any): KnowledgeEntry {
    return {
      id: row.id,
      childId: row.child_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      sourceContext: row.source_context || {},
      knowledgeType: row.knowledge_type,
      category: row.category,
      title: row.title,
      content: row.content,
      keywords: row.keywords || [],
      entities: row.entities || [],
      sentiment: row.sentiment,
      importanceScore: parseFloat(row.importance_score),
      eventDate: row.event_date ? new Date(row.event_date) : undefined,
      validFrom: new Date(row.valid_from),
      validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
      isActive: row.is_active
    };
  }

  private mapProgress(row: any): ChildProgress {
    return {
      id: row.id,
      childId: row.child_id,
      progressType: row.progress_type,
      category: row.category,
      metricName: row.metric_name,
      currentValue: parseFloat(row.current_value),
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      unit: row.unit,
      streakCount: row.streak_count,
      bestStreak: row.best_streak,
      lastActivityDate: row.last_activity_date ? new Date(row.last_activity_date) : undefined
    };
  }

  private mapAchievement(row: any): Achievement {
    return {
      id: row.id,
      childId: row.child_id,
      achievementType: row.achievement_type,
      achievementCode: row.achievement_code,
      title: row.title,
      description: row.description,
      icon: row.icon,
      category: row.category,
      earnedAt: new Date(row.earned_at)
    };
  }

  private mapCharacterInteraction(row: any): CharacterInteraction {
    return {
      id: row.id,
      childId: row.child_id,
      characterId: row.character_id,
      characterName: row.character_name,
      totalInteractions: row.total_interactions,
      lastInteractionAt: row.last_interaction_at ? new Date(row.last_interaction_at) : undefined,
      favoriteTopics: row.favorite_topics || [],
      affinityScore: parseFloat(row.affinity_score),
      interactionStyle: row.interaction_style,
      memorableMoments: row.memorable_moments || []
    };
  }

  private mapActivityLog(row: any): ActivityLogEntry {
    return {
      id: row.id,
      childId: row.child_id,
      activityType: row.activity_type,
      activityCategory: row.activity_category,
      sourceType: row.source_type,
      sourceId: row.source_id,
      title: row.title,
      description: row.description,
      metadata: row.metadata || {},
      durationSeconds: row.duration_seconds,
      engagementScore: row.engagement_score ? parseFloat(row.engagement_score) : undefined,
      occurredAt: new Date(row.occurred_at)
    };
  }
}

// Singleton instance
let picServiceInstance: KidsPICService | null = null;

export function getKidsPICService(pool: Pool): KidsPICService {
  if (!picServiceInstance) {
    picServiceInstance = new KidsPICService(pool);
  }
  return picServiceInstance;
}
