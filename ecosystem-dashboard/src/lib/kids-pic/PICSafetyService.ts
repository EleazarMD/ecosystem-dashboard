/**
 * PIC Safety Service
 * 
 * Enforces child cognitive and emotional safety by:
 * 1. Controlling what data parents can access (aggregates only, not raw content)
 * 2. Preventing manipulation of child's knowledge, achievements, and progress
 * 3. Auditing all parental access patterns
 * 4. Detecting potential overreach or excessive monitoring
 * 
 * Core Principle: Parents get INSIGHTS, not SURVEILLANCE
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface LearningSnapshot {
  id: string;
  childId: string;
  snapshotDate: Date;
  totalActivities: number;
  workspaceActivities: number;
  plannerActivities: number;
  journalActivities: number;
  chatActivities: number;
  booksActivities: number;
  artActivities: number;
  dictionaryActivities: number;
  totalTimeMinutes: number;
  avgSessionDurationMinutes: number;
  newAchievementsCount: number;
  goalsProgressPct: number;
  streakStatus: 'growing' | 'maintained' | 'broken';
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  activityDiversityScore: number;
  consistencyScore: number;
}

export interface WellnessIndicator {
  id: string;
  childId: string;
  indicatorDate: Date;
  // Cognitive wellness
  focusScore: number;
  curiosityScore: number;
  persistenceScore: number;
  creativityScore: number;
  // Emotional wellness
  overallSentiment: 'positive' | 'neutral' | 'mixed' | 'concerning';
  engagementLevel: 'high' | 'moderate' | 'low' | 'declining';
  socialInteractionLevel: 'active' | 'moderate' | 'withdrawn';
  // Flags
  needsAttention: boolean;
  attentionReason?: string;
  // Recommendations
  suggestedActivities: string[];
  conversationStarters: string[];
}

export interface ParentalGoal {
  id: string;
  childId: string;
  parentId: string;
  title: string;
  description?: string;
  category: string;
  targetValue?: number;
  targetUnit?: string;
  targetDate?: Date;
  status: 'suggested' | 'adopted' | 'declined' | 'completed' | 'expired';
  childResponse?: string;
  adoptedAt?: Date;
  picRecommendation?: 'appropriate' | 'too_easy' | 'too_hard' | 'not_aligned';
  picReasoning?: string;
  createdAt: Date;
}

export interface AccessLogEntry {
  parentId: string;
  childId: string;
  accessType: string;
  resourceType?: string;
  resourceId?: string;
  accessSource: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SafetyCheckResult {
  allowed: boolean;
  ruleCode: string;
  action: string;
  reason: string;
}

export interface AccessPattern {
  parentId: string;
  childId: string;
  analysisDate: Date;
  totalAccesses: number;
  uniqueAccessTypes: number;
  accessFrequency: 'normal' | 'elevated' | 'excessive';
  patternConcern: 'none' | 'monitoring' | 'review_needed';
  concernReason?: string;
}

export interface ParentInsightsSummary {
  child: {
    id: string;
    displayName: string;
    ageGroup: string;
  };
  weeklyProgress: {
    totalActivities: number;
    totalTimeMinutes: number;
    newAchievements: number;
    topActivities: { category: string; count: number }[];
    trend: 'improving' | 'stable' | 'declining';
  };
  wellness: {
    cognitiveScore: number;
    sentiment: string;
    engagementLevel: string;
    needsAttention: boolean;
    attentionReason?: string;
  };
  achievements: {
    total: number;
    recent: { title: string; icon: string; earnedAt: Date }[];
  };
  goals: {
    active: number;
    completed: number;
    suggested: ParentalGoal[];
  };
  recommendations: {
    activities: string[];
    conversationStarters: string[];
  };
}

// ============================================================================
// PIC Safety Service
// ============================================================================

export class PICSafetyService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Safety Rule Enforcement
  // ==========================================================================

  /**
   * Check if a parent action is allowed by PIC safety rules
   */
  async checkSafetyRule(
    parentId: string,
    childId: string,
    resourceType: string,
    accessType: string
  ): Promise<SafetyCheckResult> {
    // First verify parent-child relationship
    const relationship = await this.pool.query(
      `SELECT 1 FROM users c 
       JOIN users p ON c.parent_user_id = p.id 
       WHERE c.id = (SELECT user_id FROM child_profiles WHERE id = $1)
       AND p.id = $2`,
      [childId, parentId]
    );

    if (relationship.rows.length === 0) {
      return {
        allowed: false,
        ruleCode: 'no_relationship',
        action: 'block',
        reason: 'No parent-child relationship found'
      };
    }

    // Check safety rules
    const result = await this.pool.query(
      `SELECT * FROM check_pic_safety_rule($1, $2, $3, $4)`,
      [parentId, childId, resourceType, accessType]
    );

    if (result.rows.length > 0) {
      const rule = result.rows[0];
      return {
        allowed: rule.allowed,
        ruleCode: rule.rule_code,
        action: rule.action,
        reason: rule.reason
      };
    }

    // Default deny
    return {
      allowed: false,
      ruleCode: 'default_deny',
      action: 'block',
      reason: 'No explicit permission granted'
    };
  }

  /**
   * Log parental access for audit trail
   */
  async logAccess(entry: AccessLogEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO pic_parental_access_log 
       (parent_id, child_id, access_type, resource_type, resource_id, access_source, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.parentId,
        entry.childId,
        entry.accessType,
        entry.resourceType,
        entry.resourceId,
        entry.accessSource,
        entry.ipAddress,
        entry.userAgent
      ]
    );

    // Update daily access patterns
    await this.updateAccessPatterns(entry.parentId, entry.childId);
  }

  /**
   * Update access pattern analysis for a parent-child pair
   */
  private async updateAccessPatterns(parentId: string, childId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // Count today's accesses
    const counts = await this.pool.query(
      `SELECT 
         COUNT(*) as total_accesses,
         COUNT(DISTINCT access_type) as unique_types
       FROM pic_parental_access_log
       WHERE parent_id = $1 AND child_id = $2
       AND DATE(accessed_at) = $3`,
      [parentId, childId, today]
    );

    const totalAccesses = parseInt(counts.rows[0].total_accesses);
    const uniqueTypes = parseInt(counts.rows[0].unique_types);

    // Determine access frequency and concern level
    let accessFrequency: 'normal' | 'elevated' | 'excessive' = 'normal';
    let patternConcern: 'none' | 'monitoring' | 'review_needed' = 'none';
    let concernReason: string | null = null;

    if (totalAccesses > 50) {
      accessFrequency = 'excessive';
      patternConcern = 'review_needed';
      concernReason = 'Unusually high number of accesses today';
    } else if (totalAccesses > 20) {
      accessFrequency = 'elevated';
      patternConcern = 'monitoring';
      concernReason = 'Elevated access frequency';
    }

    // Upsert pattern record
    await this.pool.query(
      `INSERT INTO pic_access_patterns 
       (parent_id, child_id, analysis_date, total_accesses, unique_access_types, access_frequency, pattern_concern, concern_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (parent_id, child_id, analysis_date) DO UPDATE SET
         total_accesses = EXCLUDED.total_accesses,
         unique_access_types = EXCLUDED.unique_access_types,
         access_frequency = EXCLUDED.access_frequency,
         pattern_concern = EXCLUDED.pattern_concern,
         concern_reason = EXCLUDED.concern_reason`,
      [parentId, childId, today, totalAccesses, uniqueTypes, accessFrequency, patternConcern, concernReason]
    );
  }

  // ==========================================================================
  // Learning Snapshots (Aggregated Progress)
  // ==========================================================================

  /**
   * Generate or update today's learning snapshot for a child
   */
  async generateLearningSnapshot(childId: string, date?: Date): Promise<LearningSnapshot> {
    const snapshotDate = date || new Date();
    const dateStr = snapshotDate.toISOString().split('T')[0];

    // Call the database function to generate snapshot
    await this.pool.query(
      `SELECT generate_learning_snapshot($1, $2)`,
      [childId, dateStr]
    );

    // Fetch the generated snapshot
    const result = await this.pool.query(
      `SELECT * FROM pic_learning_snapshots WHERE child_id = $1 AND snapshot_date = $2`,
      [childId, dateStr]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to generate learning snapshot');
    }

    return this.mapLearningSnapshot(result.rows[0]);
  }

  /**
   * Get learning snapshots for a date range (for parent dashboard)
   */
  async getLearningSnapshots(
    parentId: string,
    childId: string,
    startDate: Date,
    endDate: Date,
    accessSource: string = 'dashboard'
  ): Promise<LearningSnapshot[]> {
    // Check safety rules
    const safetyCheck = await this.checkSafetyRule(parentId, childId, 'pic_learning_snapshots', 'view');
    if (!safetyCheck.allowed) {
      throw new Error(`Access denied: ${safetyCheck.reason}`);
    }

    // Log access
    await this.logAccess({
      parentId,
      childId,
      accessType: 'view_progress',
      resourceType: 'pic_learning_snapshots',
      accessSource
    });

    const result = await this.pool.query(
      `SELECT * FROM pic_learning_snapshots 
       WHERE child_id = $1 
       AND snapshot_date BETWEEN $2 AND $3
       ORDER BY snapshot_date DESC`,
      [childId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
    );

    return result.rows.map(row => this.mapLearningSnapshot(row));
  }

  // ==========================================================================
  // Wellness Indicators
  // ==========================================================================

  /**
   * Generate wellness indicators from activity patterns
   * This derives emotional/cognitive signals WITHOUT exposing private content
   */
  async generateWellnessIndicators(childId: string, date?: Date): Promise<WellnessIndicator> {
    const indicatorDate = date || new Date();
    const dateStr = indicatorDate.toISOString().split('T')[0];

    // Get recent activity patterns (last 7 days)
    const activities = await this.pool.query(
      `SELECT 
         activity_type,
         activity_category,
         duration_seconds,
         engagement_score,
         occurred_at
       FROM child_activity_log
       WHERE child_id = $1
       AND occurred_at >= $2::date - INTERVAL '7 days'
       ORDER BY occurred_at DESC`,
      [childId, dateStr]
    );

    // Calculate cognitive wellness scores
    const focusScore = this.calculateFocusScore(activities.rows);
    const curiosityScore = this.calculateCuriosityScore(activities.rows);
    const persistenceScore = this.calculatePersistenceScore(activities.rows);
    const creativityScore = this.calculateCreativityScore(activities.rows);

    // Determine overall sentiment and engagement
    const overallSentiment = this.determineOverallSentiment(activities.rows);
    const engagementLevel = this.determineEngagementLevel(activities.rows);
    const socialInteractionLevel = this.determineSocialLevel(activities.rows);

    // Check if attention is needed
    const { needsAttention, attentionReason } = this.checkNeedsAttention({
      focusScore,
      curiosityScore,
      persistenceScore,
      creativityScore,
      overallSentiment,
      engagementLevel
    });

    // Generate recommendations
    const suggestedActivities = this.generateActivitySuggestions(activities.rows);
    const conversationStarters = this.generateConversationStarters(activities.rows);

    // Upsert wellness indicator
    const result = await this.pool.query(
      `INSERT INTO pic_wellness_indicators 
       (child_id, indicator_date, focus_score, curiosity_score, persistence_score, creativity_score,
        overall_sentiment, engagement_level, social_interaction_level, needs_attention, attention_reason,
        suggested_activities, conversation_starters)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (child_id, indicator_date) DO UPDATE SET
         focus_score = EXCLUDED.focus_score,
         curiosity_score = EXCLUDED.curiosity_score,
         persistence_score = EXCLUDED.persistence_score,
         creativity_score = EXCLUDED.creativity_score,
         overall_sentiment = EXCLUDED.overall_sentiment,
         engagement_level = EXCLUDED.engagement_level,
         social_interaction_level = EXCLUDED.social_interaction_level,
         needs_attention = EXCLUDED.needs_attention,
         attention_reason = EXCLUDED.attention_reason,
         suggested_activities = EXCLUDED.suggested_activities,
         conversation_starters = EXCLUDED.conversation_starters
       RETURNING *`,
      [
        childId, dateStr, focusScore, curiosityScore, persistenceScore, creativityScore,
        overallSentiment, engagementLevel, socialInteractionLevel, needsAttention, attentionReason,
        JSON.stringify(suggestedActivities), JSON.stringify(conversationStarters)
      ]
    );

    return this.mapWellnessIndicator(result.rows[0]);
  }

  /**
   * Get wellness indicators for parent (with safety check)
   */
  async getWellnessIndicators(
    parentId: string,
    childId: string,
    days: number = 7,
    accessSource: string = 'dashboard'
  ): Promise<WellnessIndicator[]> {
    // Check safety rules
    const safetyCheck = await this.checkSafetyRule(parentId, childId, 'pic_wellness_indicators', 'view');
    if (!safetyCheck.allowed) {
      throw new Error(`Access denied: ${safetyCheck.reason}`);
    }

    // Log access
    await this.logAccess({
      parentId,
      childId,
      accessType: 'view_wellness',
      resourceType: 'pic_wellness_indicators',
      accessSource
    });

    const result = await this.pool.query(
      `SELECT * FROM pic_wellness_indicators 
       WHERE child_id = $1 
       AND indicator_date >= CURRENT_DATE - $2 * INTERVAL '1 day'
       ORDER BY indicator_date DESC`,
      [childId, days]
    );

    return result.rows.map(row => this.mapWellnessIndicator(row));
  }

  // ==========================================================================
  // Parental Goals (Suggestions, not mandates)
  // ==========================================================================

  /**
   * Parent suggests a goal for the child
   * PIC evaluates appropriateness, child decides adoption
   */
  async suggestGoal(
    parentId: string,
    childId: string,
    goal: {
      title: string;
      description?: string;
      category: string;
      targetValue?: number;
      targetUnit?: string;
      targetDate?: Date;
    }
  ): Promise<ParentalGoal> {
    // Check safety rules
    const safetyCheck = await this.checkSafetyRule(parentId, childId, 'pic_parental_goals', 'suggest');
    if (!safetyCheck.allowed) {
      throw new Error(`Access denied: ${safetyCheck.reason}`);
    }

    // Check rate limit (max 3 pending suggestions)
    const pendingCount = await this.pool.query(
      `SELECT COUNT(*) FROM pic_parental_goals 
       WHERE parent_id = $1 AND child_id = $2 AND status = 'suggested'`,
      [parentId, childId]
    );

    if (parseInt(pendingCount.rows[0].count) >= 3) {
      throw new Error('Maximum pending goal suggestions reached. Wait for child to respond to existing suggestions.');
    }

    // PIC evaluates the goal
    const { recommendation, reasoning } = await this.evaluateGoal(childId, goal);

    // Log access
    await this.logAccess({
      parentId,
      childId,
      accessType: 'suggest_goal',
      resourceType: 'pic_parental_goals',
      accessSource: 'dashboard'
    });

    // Insert goal suggestion
    const result = await this.pool.query(
      `INSERT INTO pic_parental_goals 
       (child_id, parent_id, title, description, category, target_value, target_unit, target_date, pic_recommendation, pic_reasoning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        childId, parentId, goal.title, goal.description, goal.category,
        goal.targetValue, goal.targetUnit, goal.targetDate,
        recommendation, reasoning
      ]
    );

    return this.mapParentalGoal(result.rows[0]);
  }

  /**
   * Child responds to a goal suggestion
   */
  async respondToGoal(
    childId: string,
    goalId: string,
    response: 'adopt' | 'decline',
    childResponse?: string
  ): Promise<ParentalGoal> {
    const status = response === 'adopt' ? 'adopted' : 'declined';
    const adoptedAt = response === 'adopt' ? new Date() : null;

    const result = await this.pool.query(
      `UPDATE pic_parental_goals 
       SET status = $1, child_response = $2, adopted_at = $3, updated_at = NOW()
       WHERE id = $4 AND child_id = $5 AND status = 'suggested'
       RETURNING *`,
      [status, childResponse, adoptedAt, goalId, childId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found or already responded to');
    }

    return this.mapParentalGoal(result.rows[0]);
  }

  /**
   * Get parental goals for a child
   */
  async getParentalGoals(
    parentId: string,
    childId: string,
    status?: string
  ): Promise<ParentalGoal[]> {
    // Check safety rules
    const safetyCheck = await this.checkSafetyRule(parentId, childId, 'pic_parental_goals', 'view');
    if (!safetyCheck.allowed) {
      throw new Error(`Access denied: ${safetyCheck.reason}`);
    }

    let query = `SELECT * FROM pic_parental_goals WHERE child_id = $1`;
    const params: any[] = [childId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapParentalGoal(row));
  }

  // ==========================================================================
  // Parent Insights Summary (Main Dashboard Data)
  // ==========================================================================

  /**
   * Get comprehensive insights summary for parent dashboard
   * This is the main entry point for parent monitoring
   */
  async getParentInsightsSummary(
    parentId: string,
    childId: string,
    accessSource: string = 'dashboard'
  ): Promise<ParentInsightsSummary> {
    // Verify relationship and log access
    const safetyCheck = await this.checkSafetyRule(parentId, childId, 'pic_learning_snapshots', 'view');
    if (!safetyCheck.allowed) {
      throw new Error(`Access denied: ${safetyCheck.reason}`);
    }

    await this.logAccess({
      parentId,
      childId,
      accessType: 'view_summary',
      resourceType: 'parent_insights',
      accessSource
    });

    // Get child profile (basic info only)
    const profileResult = await this.pool.query(
      `SELECT id, display_name, age_group FROM child_profiles WHERE id = $1`,
      [childId]
    );

    if (profileResult.rows.length === 0) {
      throw new Error('Child profile not found');
    }

    const profile = profileResult.rows[0];

    // Get weekly progress
    const weeklyProgress = await this.getWeeklyProgress(childId);

    // Get latest wellness
    const wellness = await this.getLatestWellness(childId);

    // Get achievements summary
    const achievements = await this.getAchievementsSummary(childId);

    // Get goals summary
    const goals = await this.getGoalsSummary(childId);

    return {
      child: {
        id: profile.id,
        displayName: profile.display_name,
        ageGroup: profile.age_group
      },
      weeklyProgress,
      wellness,
      achievements,
      goals,
      recommendations: {
        activities: wellness.suggestedActivities || [],
        conversationStarters: wellness.conversationStarters || []
      }
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async getWeeklyProgress(childId: string) {
    const result = await this.pool.query(
      `SELECT 
         COALESCE(SUM(total_activities), 0) as total_activities,
         COALESCE(SUM(total_time_minutes), 0) as total_time_minutes,
         COALESCE(SUM(new_achievements_count), 0) as new_achievements
       FROM pic_learning_snapshots
       WHERE child_id = $1
       AND snapshot_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [childId]
    );

    // Get top activities
    const topActivities = await this.pool.query(
      `SELECT activity_category as category, COUNT(*) as count
       FROM child_activity_log
       WHERE child_id = $1
       AND occurred_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY activity_category
       ORDER BY count DESC
       LIMIT 5`,
      [childId]
    );

    // Determine trend
    const trendResult = await this.pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN snapshot_date >= CURRENT_DATE - INTERVAL '7 days' THEN total_activities END), 0) as this_week,
         COALESCE(SUM(CASE WHEN snapshot_date < CURRENT_DATE - INTERVAL '7 days' AND snapshot_date >= CURRENT_DATE - INTERVAL '14 days' THEN total_activities END), 0) as last_week
       FROM pic_learning_snapshots
       WHERE child_id = $1`,
      [childId]
    );

    const thisWeek = parseInt(trendResult.rows[0].this_week);
    const lastWeek = parseInt(trendResult.rows[0].last_week);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (thisWeek > lastWeek * 1.1) trend = 'improving';
    else if (thisWeek < lastWeek * 0.9) trend = 'declining';

    return {
      totalActivities: parseInt(result.rows[0].total_activities),
      totalTimeMinutes: parseInt(result.rows[0].total_time_minutes),
      newAchievements: parseInt(result.rows[0].new_achievements),
      topActivities: topActivities.rows.map(r => ({ category: r.category, count: parseInt(r.count) })),
      trend
    };
  }

  private async getLatestWellness(childId: string) {
    const result = await this.pool.query(
      `SELECT * FROM pic_wellness_indicators 
       WHERE child_id = $1 
       ORDER BY indicator_date DESC 
       LIMIT 1`,
      [childId]
    );

    if (result.rows.length === 0) {
      return {
        cognitiveScore: 0.5,
        sentiment: 'neutral',
        engagementLevel: 'moderate',
        needsAttention: false,
        suggestedActivities: [],
        conversationStarters: []
      };
    }

    const row = result.rows[0];
    const cognitiveScore = (
      parseFloat(row.focus_score || 0) +
      parseFloat(row.curiosity_score || 0) +
      parseFloat(row.persistence_score || 0) +
      parseFloat(row.creativity_score || 0)
    ) / 4;

    return {
      cognitiveScore: Math.round(cognitiveScore * 100) / 100,
      sentiment: row.overall_sentiment || 'neutral',
      engagementLevel: row.engagement_level || 'moderate',
      needsAttention: row.needs_attention || false,
      attentionReason: row.attention_reason,
      suggestedActivities: row.suggested_activities || [],
      conversationStarters: row.conversation_starters || []
    };
  }

  private async getAchievementsSummary(childId: string) {
    const totalResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM child_achievements WHERE child_id = $1`,
      [childId]
    );

    const recentResult = await this.pool.query(
      `SELECT title, icon, earned_at 
       FROM child_achievements 
       WHERE child_id = $1 
       ORDER BY earned_at DESC 
       LIMIT 5`,
      [childId]
    );

    return {
      total: parseInt(totalResult.rows[0].total),
      recent: recentResult.rows.map(r => ({
        title: r.title,
        icon: r.icon,
        earnedAt: new Date(r.earned_at)
      }))
    };
  }

  private async getGoalsSummary(childId: string) {
    const countsResult = await this.pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'adopted') as active,
         COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM pic_parental_goals
       WHERE child_id = $1`,
      [childId]
    );

    const suggestedResult = await this.pool.query(
      `SELECT * FROM pic_parental_goals 
       WHERE child_id = $1 AND status = 'suggested'
       ORDER BY created_at DESC`,
      [childId]
    );

    return {
      active: parseInt(countsResult.rows[0].active || 0),
      completed: parseInt(countsResult.rows[0].completed || 0),
      suggested: suggestedResult.rows.map(row => this.mapParentalGoal(row))
    };
  }

  // Wellness calculation helpers
  private calculateFocusScore(activities: any[]): number {
    if (activities.length === 0) return 0.5;
    const completedTasks = activities.filter(a => a.activity_type === 'task_completed').length;
    const startedTasks = activities.filter(a => a.activity_type === 'task_created').length;
    if (startedTasks === 0) return 0.5;
    return Math.min(1, completedTasks / startedTasks);
  }

  private calculateCuriosityScore(activities: any[]): number {
    if (activities.length === 0) return 0.5;
    const uniqueCategories = new Set(activities.map(a => a.activity_category)).size;
    const uniqueTypes = new Set(activities.map(a => a.activity_type)).size;
    return Math.min(1, (uniqueCategories + uniqueTypes) / 10);
  }

  private calculatePersistenceScore(activities: any[]): number {
    if (activities.length === 0) return 0.5;
    const avgDuration = activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / activities.length;
    return Math.min(1, avgDuration / 600); // 10 minutes = 1.0
  }

  private calculateCreativityScore(activities: any[]): number {
    if (activities.length === 0) return 0.5;
    const creativeActivities = activities.filter(a => 
      ['art-studio', 'workspace', 'journal'].includes(a.activity_category)
    ).length;
    return Math.min(1, creativeActivities / activities.length);
  }

  private determineOverallSentiment(activities: any[]): 'positive' | 'neutral' | 'mixed' | 'concerning' {
    if (activities.length === 0) return 'neutral';
    const avgEngagement = activities.reduce((sum, a) => sum + (a.engagement_score || 0.5), 0) / activities.length;
    if (avgEngagement > 0.7) return 'positive';
    if (avgEngagement > 0.4) return 'neutral';
    if (avgEngagement > 0.2) return 'mixed';
    return 'concerning';
  }

  private determineEngagementLevel(activities: any[]): 'high' | 'moderate' | 'low' | 'declining' {
    if (activities.length === 0) return 'low';
    const recentCount = activities.filter(a => {
      const date = new Date(a.occurred_at);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return date >= threeDaysAgo;
    }).length;

    if (recentCount > 10) return 'high';
    if (recentCount > 5) return 'moderate';
    if (recentCount > 0) return 'low';
    return 'declining';
  }

  private determineSocialLevel(activities: any[]): 'active' | 'moderate' | 'withdrawn' {
    const chatActivities = activities.filter(a => a.activity_category === 'chat').length;
    if (chatActivities > 5) return 'active';
    if (chatActivities > 0) return 'moderate';
    return 'withdrawn';
  }

  private checkNeedsAttention(scores: {
    focusScore: number;
    curiosityScore: number;
    persistenceScore: number;
    creativityScore: number;
    overallSentiment: string;
    engagementLevel: string;
  }): { needsAttention: boolean; attentionReason?: string } {
    if (scores.engagementLevel === 'declining') {
      return { needsAttention: true, attentionReason: 'Activity has declined recently' };
    }
    if (scores.overallSentiment === 'concerning') {
      return { needsAttention: true, attentionReason: 'Engagement patterns suggest low interest' };
    }
    if (scores.focusScore < 0.3 && scores.persistenceScore < 0.3) {
      return { needsAttention: true, attentionReason: 'May benefit from shorter, more engaging activities' };
    }
    return { needsAttention: false };
  }

  private generateActivitySuggestions(activities: any[]): string[] {
    const suggestions: string[] = [];
    const categories = new Set(activities.map(a => a.activity_category));

    if (!categories.has('art-studio')) {
      suggestions.push('Try creating some art together!');
    }
    if (!categories.has('books')) {
      suggestions.push('Reading time could be fun!');
    }
    if (!categories.has('dictionary')) {
      suggestions.push('Explore new words in the dictionary');
    }
    if (activities.length < 5) {
      suggestions.push('Encourage more exploration of different activities');
    }

    return suggestions.slice(0, 3);
  }

  private generateConversationStarters(activities: any[]): string[] {
    const starters: string[] = [];
    
    const recentArt = activities.find(a => a.activity_category === 'art-studio');
    if (recentArt) {
      starters.push('Ask about their recent artwork!');
    }

    const recentBooks = activities.find(a => a.activity_category === 'books');
    if (recentBooks) {
      starters.push('What book are they enjoying?');
    }

    const recentJournal = activities.find(a => a.activity_category === 'journal');
    if (recentJournal) {
      starters.push('They\'ve been journaling - ask about their day!');
    }

    if (starters.length === 0) {
      starters.push('Ask what they\'d like to learn about');
    }

    return starters.slice(0, 3);
  }

  private async evaluateGoal(childId: string, goal: { title: string; category: string; targetValue?: number }): Promise<{ recommendation: string; reasoning: string }> {
    // Get child's current progress in this category
    const progress = await this.pool.query(
      `SELECT current_value, target_value FROM child_progress 
       WHERE child_id = $1 AND category = $2
       ORDER BY updated_at DESC LIMIT 1`,
      [childId, goal.category]
    );

    if (progress.rows.length === 0) {
      return {
        recommendation: 'appropriate',
        reasoning: 'New area for exploration - good opportunity for growth'
      };
    }

    const current = parseFloat(progress.rows[0].current_value || 0);
    const target = goal.targetValue || 0;

    if (target <= current) {
      return {
        recommendation: 'too_easy',
        reasoning: 'Child has already exceeded this target'
      };
    }

    if (target > current * 3) {
      return {
        recommendation: 'too_hard',
        reasoning: 'Target may be too ambitious - consider a smaller step'
      };
    }

    return {
      recommendation: 'appropriate',
      reasoning: 'Goal aligns well with current progress'
    };
  }

  // ==========================================================================
  // Mappers
  // ==========================================================================

  private mapLearningSnapshot(row: any): LearningSnapshot {
    return {
      id: row.id,
      childId: row.child_id,
      snapshotDate: new Date(row.snapshot_date),
      totalActivities: parseInt(row.total_activities || 0),
      workspaceActivities: parseInt(row.workspace_activities || 0),
      plannerActivities: parseInt(row.planner_activities || 0),
      journalActivities: parseInt(row.journal_activities || 0),
      chatActivities: parseInt(row.chat_activities || 0),
      booksActivities: parseInt(row.books_activities || 0),
      artActivities: parseInt(row.art_activities || 0),
      dictionaryActivities: parseInt(row.dictionary_activities || 0),
      totalTimeMinutes: parseInt(row.total_time_minutes || 0),
      avgSessionDurationMinutes: parseFloat(row.avg_session_duration_minutes || 0),
      newAchievementsCount: parseInt(row.new_achievements_count || 0),
      goalsProgressPct: parseFloat(row.goals_progress_pct || 0),
      streakStatus: row.streak_status || 'maintained',
      engagementTrend: row.engagement_trend || 'stable',
      activityDiversityScore: parseFloat(row.activity_diversity_score || 0.5),
      consistencyScore: parseFloat(row.consistency_score || 0.5)
    };
  }

  private mapWellnessIndicator(row: any): WellnessIndicator {
    return {
      id: row.id,
      childId: row.child_id,
      indicatorDate: new Date(row.indicator_date),
      focusScore: parseFloat(row.focus_score || 0.5),
      curiosityScore: parseFloat(row.curiosity_score || 0.5),
      persistenceScore: parseFloat(row.persistence_score || 0.5),
      creativityScore: parseFloat(row.creativity_score || 0.5),
      overallSentiment: row.overall_sentiment || 'neutral',
      engagementLevel: row.engagement_level || 'moderate',
      socialInteractionLevel: row.social_interaction_level || 'moderate',
      needsAttention: row.needs_attention || false,
      attentionReason: row.attention_reason,
      suggestedActivities: row.suggested_activities || [],
      conversationStarters: row.conversation_starters || []
    };
  }

  private mapParentalGoal(row: any): ParentalGoal {
    return {
      id: row.id,
      childId: row.child_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description,
      category: row.category,
      targetValue: row.target_value ? parseFloat(row.target_value) : undefined,
      targetUnit: row.target_unit,
      targetDate: row.target_date ? new Date(row.target_date) : undefined,
      status: row.status,
      childResponse: row.child_response,
      adoptedAt: row.adopted_at ? new Date(row.adopted_at) : undefined,
      picRecommendation: row.pic_recommendation,
      picReasoning: row.pic_reasoning,
      createdAt: new Date(row.created_at)
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let picSafetyServiceInstance: PICSafetyService | null = null;

export function getPICSafetyService(pool: Pool): PICSafetyService {
  if (!picSafetyServiceInstance) {
    picSafetyServiceInstance = new PICSafetyService(pool);
  }
  return picSafetyServiceInstance;
}
