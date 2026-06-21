/**
 * Learning Team Service
 *
 * Manages small learning teams of 2-3 children with controlled information flow.
 * Parents create teams, assign children, and configure what team members can see
 * about each other (full / limited / anonymous).
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface LearningTeam {
  id: string;
  name: string;
  description?: string;
  teamEmoji: string;
  parentUserId: string;
  tenantId?: string;
  maxMembers: number;
  infoFlowLevel: 'full' | 'limited' | 'anonymous';
  sharedActivitiesEnabled: boolean;
  peerComparisonEnabled: boolean;
  teamChallengesEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  childUserId: string;
  childName: string;
  role: 'member' | 'captain';
  displayNameToTeam?: string;
  joinedAt: Date;
  isActive: boolean;
}

export interface TeamWithMembers extends LearningTeam {
  members: TeamMember[];
  activeMembers: number;
  pendingActivities: number;
  completedActivities: number;
  activePaths: number;
}

export interface TeamActivity {
  id: string;
  teamId: string;
  title: string;
  description?: string;
  activityEmoji: string;
  activityType: 'challenge' | 'collaborative' | 'discussion' | 'quiz_battle' | 'team_quest';
  contentItemId?: string;
  skillCode?: string;
  subject?: string;
  difficulty?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedAt: Date;
  dueAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface TeamActivityParticipant {
  id: string;
  activityId: string;
  childUserId: string;
  childName: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  score?: number;
  startedAt?: Date;
  completedAt?: Date;
  timeSpentSeconds?: number;
}

export interface TeamActivityWithParticipants extends TeamActivity {
  participants: TeamActivityParticipant[];
}

// Info flow controlled teammate view (what a child sees about teammates)
export interface TeammateView {
  displayName: string;
  role: 'member' | 'captain';
  completionStatus?: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  achievementsCount?: number;
  currentPathStep?: number;
}

// ============================================================================
// Service
// ============================================================================

export class LearningTeamService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ==========================================================================
  // Team CRUD
  // ==========================================================================

  async createTeam(
    parentUserId: string,
    data: {
      name: string;
      description?: string;
      teamEmoji?: string;
      maxMembers?: 2 | 3;
      infoFlowLevel?: 'full' | 'limited' | 'anonymous';
      sharedActivitiesEnabled?: boolean;
      peerComparisonEnabled?: boolean;
      teamChallengesEnabled?: boolean;
    }
  ): Promise<LearningTeam> {
    const result = await this.pool.query(
      `INSERT INTO learning_teams
        (name, description, team_emoji, parent_user_id, max_members, info_flow_level,
         shared_activities_enabled, peer_comparison_enabled, team_challenges_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.name,
        data.description || null,
        data.teamEmoji || '🏆',
        parentUserId,
        data.maxMembers || 3,
        data.infoFlowLevel || 'limited',
        data.sharedActivitiesEnabled ?? true,
        data.peerComparisonEnabled ?? false,
        data.teamChallengesEnabled ?? true,
      ]
    );
    return this.mapTeam(result.rows[0]);
  }

  async getTeam(teamId: string): Promise<LearningTeam | null> {
    const result = await this.pool.query(
      'SELECT * FROM learning_teams WHERE id = $1',
      [teamId]
    );
    return result.rows.length > 0 ? this.mapTeam(result.rows[0]) : null;
  }

  async getTeamsByParent(parentUserId: string): Promise<TeamWithMembers[]> {
    const result = await this.pool.query(
      `SELECT * FROM learning_team_summary WHERE parent_user_id = $1 AND is_active = true`,
      [parentUserId]
    );

    const teams: TeamWithMembers[] = [];
    for (const row of result.rows) {
      const team = await this.getTeamWithMembers(row.team_id);
      if (team) teams.push(team);
    }
    return teams;
  }

  async getTeamsByChild(childUserId: string): Promise<TeamWithMembers[]> {
    const result = await this.pool.query(
      `SELECT t.* FROM learning_teams t
       JOIN learning_team_members tm ON tm.team_id = t.id
       WHERE tm.child_user_id = $1 AND tm.is_active = true AND t.is_active = true`,
      [childUserId]
    );

    const teams: TeamWithMembers[] = [];
    for (const row of result.rows) {
      const team = await this.getTeamWithMembers(row.id);
      if (team) teams.push(team);
    }
    return teams;
  }

  async getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
    const team = await this.getTeam(teamId);
    if (!team) return null;

    const members = await this.getTeamMembers(teamId);
    const summaryResult = await this.pool.query(
      'SELECT * FROM learning_team_summary WHERE team_id = $1',
      [teamId]
    );
    const summary = summaryResult.rows[0] || {};

    return {
      ...team,
      members,
      activeMembers: parseInt(summary.active_members || 0),
      pendingActivities: parseInt(summary.pending_activities || 0),
      completedActivities: parseInt(summary.completed_activities || 0),
      activePaths: parseInt(summary.active_paths || 0),
    };
  }

  async updateTeam(
    teamId: string,
    updates: Partial<Pick<LearningTeam,
      'name' | 'description' | 'teamEmoji' | 'infoFlowLevel' |
      'sharedActivitiesEnabled' | 'peerComparisonEnabled' |
      'teamChallengesEnabled' | 'maxMembers'>>
  ): Promise<LearningTeam | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) { fields.push(`name = $${idx++}`); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.teamEmoji !== undefined) { fields.push(`team_emoji = $${idx++}`); values.push(updates.teamEmoji); }
    if (updates.infoFlowLevel !== undefined) { fields.push(`info_flow_level = $${idx++}`); values.push(updates.infoFlowLevel); }
    if (updates.sharedActivitiesEnabled !== undefined) { fields.push(`shared_activities_enabled = $${idx++}`); values.push(updates.sharedActivitiesEnabled); }
    if (updates.peerComparisonEnabled !== undefined) { fields.push(`peer_comparison_enabled = $${idx++}`); values.push(updates.peerComparisonEnabled); }
    if (updates.teamChallengesEnabled !== undefined) { fields.push(`team_challenges_enabled = $${idx++}`); values.push(updates.teamChallengesEnabled); }
    if (updates.maxMembers !== undefined) { fields.push(`max_members = $${idx++}`); values.push(updates.maxMembers); }

    if (fields.length === 0) return this.getTeam(teamId);

    values.push(teamId);
    const result = await this.pool.query(
      `UPDATE learning_teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows.length > 0 ? this.mapTeam(result.rows[0]) : null;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.pool.query('UPDATE learning_teams SET is_active = false WHERE id = $1', [teamId]);
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await this.pool.query(
      `SELECT tm.*, u.name as child_name
       FROM learning_team_members tm
       JOIN users u ON u.id = tm.child_user_id
       WHERE tm.team_id = $1 AND tm.is_active = true
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    return result.rows.map((row) => this.mapTeamMember(row));
  }

  async addMember(
    teamId: string,
    childUserId: string,
    options?: { role?: 'member' | 'captain'; displayNameToTeam?: string }
  ): Promise<TeamMember> {
    // Check team capacity
    const team = await this.getTeam(teamId);
    if (!team) throw new Error('Team not found');

    const memberCount = await this.pool.query(
      'SELECT COUNT(*) as count FROM learning_team_members WHERE team_id = $1 AND is_active = true',
      [teamId]
    );
    if (parseInt(memberCount.rows[0].count) >= team.maxMembers) {
      throw new Error(`Team is full (max ${team.maxMembers} members)`);
    }

    // Generate display name based on info flow level if not provided
    let displayName = options?.displayNameToTeam;
    if (!displayName) {
      const childResult = await this.pool.query(
        'SELECT name FROM users WHERE id = $1',
        [childUserId]
      );
      const childName = childResult.rows[0]?.name || 'Explorer';
      displayName = team.infoFlowLevel === 'anonymous'
        ? `Explorer ${String.fromCharCode(65 + parseInt(memberCount.rows[0].count))}`
        : childName.split(' ')[0];
    }

    const result = await this.pool.query(
      `INSERT INTO learning_team_members (team_id, child_user_id, role, display_name_to_team)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (team_id, child_user_id) DO UPDATE SET
         is_active = true, left_at = NULL, role = EXCLUDED.role,
         display_name_to_team = EXCLUDED.display_name_to_team
       RETURNING *`,
      [teamId, childUserId, options?.role || 'member', displayName]
    );

    const nameResult = await this.pool.query(
      'SELECT name FROM users WHERE id = $1',
      [childUserId]
    );

    return this.mapTeamMember({
      ...result.rows[0],
      child_name: nameResult.rows[0]?.name,
    });
  }

  async removeMember(teamId: string, childUserId: string): Promise<void> {
    await this.pool.query(
      'UPDATE learning_team_members SET is_active = false, left_at = NOW() WHERE team_id = $1 AND child_user_id = $2',
      [teamId, childUserId]
    );
  }

  async getChildrenForParent(parentUserId: string): Promise<{ id: string; name: string }[]> {
    const result = await this.pool.query(
      `SELECT id, name FROM users WHERE parent_user_id = $1 AND account_type = 'child' ORDER BY name`,
      [parentUserId]
    );
    return result.rows;
  }

  // ==========================================================================
  // Info-Flow-Controlled Teammate Views
  // ==========================================================================

  async getTeammateViews(
    teamId: string,
    requestingChildUserId: string
  ): Promise<TeammateView[]> {
    const team = await this.getTeam(teamId);
    if (!team) return [];

    const members = await this.getTeamMembers(teamId);
    const teammates = members.filter((m) => m.childUserId !== requestingChildUserId);

    return teammates.map((m) => {
      const view: TeammateView = {
        displayName: m.displayNameToTeam || m.childName.split(' ')[0],
        role: m.role,
      };

      // Apply info flow controls
      if (team.infoFlowLevel === 'full') {
        // Show everything: progress, score, achievements
        view.completionStatus = 'not_started';
        view.score = 0;
        view.achievementsCount = 0;
        view.currentPathStep = 0;
      } else if (team.infoFlowLevel === 'limited') {
        // Show only completion status
        view.completionStatus = 'not_started';
      }
      // 'anonymous' shows only displayName (pseudonym) and role

      return view;
    });
  }

  // ==========================================================================
  // Team Activities
  // ==========================================================================

  async createTeamActivity(
    teamId: string,
    data: {
      title: string;
      description?: string;
      activityEmoji?: string;
      activityType?: TeamActivity['activityType'];
      contentItemId?: string;
      skillCode?: string;
      subject?: string;
      difficulty?: number;
      dueAt?: Date;
    }
  ): Promise<TeamActivity> {
    const result = await this.pool.query(
      `INSERT INTO team_activities
        (team_id, title, description, activity_emoji, activity_type, content_item_id,
         skill_code, subject, difficulty, due_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        teamId,
        data.title,
        data.description || null,
        data.activityEmoji || '🎯',
        data.activityType || 'challenge',
        data.contentItemId || null,
        data.skillCode || null,
        data.subject || null,
        data.difficulty || null,
        data.dueAt || null,
      ]
    );

    const activity = this.mapActivity(result.rows[0]);

    // Auto-enroll all active team members as participants
    const members = await this.getTeamMembers(teamId);
    for (const member of members) {
      await this.pool.query(
        `INSERT INTO team_activity_participants (activity_id, child_user_id, status)
         VALUES ($1, $2, 'not_started')
         ON CONFLICT DO NOTHING`,
        [activity.id, member.childUserId]
      );
    }

    return activity;
  }

  async getTeamActivities(teamId: string, status?: string): Promise<TeamActivityWithParticipants[]> {
    let query = 'SELECT * FROM team_activities WHERE team_id = $1';
    const params: any[] = [teamId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY assigned_at DESC';

    const result = await this.pool.query(query, params);
    const activities: TeamActivityWithParticipants[] = [];

    for (const row of result.rows) {
      const activity = this.mapActivity(row);
      const participants = await this.getActivityParticipants(activity.id);
      activities.push({ ...activity, participants });
    }

    return activities;
  }

  async getActivityParticipants(activityId: string): Promise<TeamActivityParticipant[]> {
    const result = await this.pool.query(
      `SELECT tap.*, u.name as child_name
       FROM team_activity_participants tap
       JOIN users u ON u.id = tap.child_user_id
       WHERE tap.activity_id = $1
       ORDER BY tap.completed_at DESC NULLS LAST`,
      [activityId]
    );
    return result.rows.map((row) => this.mapParticipant(row));
  }

  async updateParticipantStatus(
    activityId: string,
    childUserId: string,
    status: TeamActivityParticipant['status'],
    options?: { score?: number; feedback?: string; timeSpentSeconds?: number }
  ): Promise<void> {
    const fields: string[] = ['status = $3'];
    const values: any[] = [activityId, childUserId, status];
    let idx = 4;

    if (status === 'in_progress') {
      fields.push(`started_at = COALESCE(started_at, NOW())`);
    }
    if (status === 'completed') {
      fields.push(`completed_at = NOW()`);
    }
    if (options?.score !== undefined) { fields.push(`score = $${idx++}`); values.push(options.score); }
    if (options?.timeSpentSeconds !== undefined) { fields.push(`time_spent_seconds = $${idx++}`); values.push(options.timeSpentSeconds); }

    await this.pool.query(
      `UPDATE team_activity_participants SET ${fields.join(', ')} WHERE activity_id = $1 AND child_user_id = $2`,
      values
    );

    // Check if all participants completed → mark activity as completed
    if (status === 'completed') {
      const pending = await this.pool.query(
        `SELECT COUNT(*) as count FROM team_activity_participants
         WHERE activity_id = $1 AND status NOT IN ('completed', 'skipped')`,
        [activityId]
      );
      if (parseInt(pending.rows[0].count) === 0) {
        await this.pool.query(
          `UPDATE team_activities SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [activityId]
        );
      }
    }
  }

  // ==========================================================================
  // Mapping helpers
  // ==========================================================================

  private mapTeam(row: any): LearningTeam {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      teamEmoji: row.team_emoji,
      parentUserId: row.parent_user_id,
      tenantId: row.tenant_id,
      maxMembers: row.max_members,
      infoFlowLevel: row.info_flow_level,
      sharedActivitiesEnabled: row.shared_activities_enabled,
      peerComparisonEnabled: row.peer_comparison_enabled,
      teamChallengesEnabled: row.team_challenges_enabled,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapTeamMember(row: any): TeamMember {
    return {
      id: row.id,
      teamId: row.team_id,
      childUserId: row.child_user_id,
      childName: row.child_name,
      role: row.role,
      displayNameToTeam: row.display_name_to_team,
      joinedAt: row.joined_at,
      isActive: row.is_active,
    };
  }

  private mapActivity(row: any): TeamActivity {
    return {
      id: row.id,
      teamId: row.team_id,
      title: row.title,
      description: row.description,
      activityEmoji: row.activity_emoji,
      activityType: row.activity_type,
      contentItemId: row.content_item_id,
      skillCode: row.skill_code,
      subject: row.subject,
      difficulty: row.difficulty,
      status: row.status,
      assignedAt: row.assigned_at,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      metadata: row.metadata,
    };
  }

  private mapParticipant(row: any): TeamActivityParticipant {
    return {
      id: row.id,
      activityId: row.activity_id,
      childUserId: row.child_user_id,
      childName: row.child_name,
      status: row.status,
      score: row.score !== null ? parseFloat(row.score) : undefined,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      timeSpentSeconds: row.time_spent_seconds,
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let teamServiceInstance: LearningTeamService | null = null;

export function getLearningTeamService(pool: Pool): LearningTeamService {
  if (!teamServiceInstance) {
    teamServiceInstance = new LearningTeamService(pool);
  }
  return teamServiceInstance;
}
