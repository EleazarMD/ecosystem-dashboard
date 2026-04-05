/**
 * Activity Logger
 * 
 * Logs child activities for parent monitoring
 */

import { query } from '@/lib/db';

export type ActivityType = 
  | 'page_view'
  | 'search'
  | 'message'
  | 'image_generation'
  | 'blocked_attempt'
  | 'service_request'
  | 'login'
  | 'logout';

export interface ActivityData {
  path?: string;
  query?: string;
  service?: string;
  content?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a child activity
 */
export async function logActivity(
  childId: string,
  activityType: ActivityType,
  activityData: ActivityData,
  options?: {
    flagged?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await query(
      `INSERT INTO child_activities (
        child_id,
        activity_type,
        activity_data,
        service,
        flagged,
        ip_address,
        user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        childId,
        activityType,
        JSON.stringify(activityData),
        activityData.service || null,
        options?.flagged || false,
        options?.ipAddress || null,
        options?.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('[ActivityLogger] Error logging activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Get activity feed for a child
 */
export async function getActivityFeed(
  childId: string,
  options?: {
    limit?: number;
    offset?: number;
    activityType?: ActivityType;
    flaggedOnly?: boolean;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Array<{
  id: string;
  activityType: ActivityType;
  activityData: ActivityData;
  service: string | null;
  timestamp: Date;
  flagged: boolean;
  parentReviewed: boolean;
}>> {
  try {
    let whereClause = 'WHERE child_id = $1';
    const params: any[] = [childId];
    let paramIndex = 2;

    if (options?.activityType) {
      whereClause += ` AND activity_type = $${paramIndex}`;
      params.push(options.activityType);
      paramIndex++;
    }

    if (options?.flaggedOnly) {
      whereClause += ' AND flagged = true';
    }

    if (options?.startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options?.endDate) {
      whereClause += ` AND timestamp <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await query(
      `SELECT 
        id,
        activity_type,
        activity_data,
        service,
        timestamp,
        flagged,
        parent_reviewed
       FROM child_activities
       ${whereClause}
       ORDER BY timestamp DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return result.rows.map(row => ({
      id: row.id,
      activityType: row.activity_type,
      activityData: row.activity_data,
      service: row.service,
      timestamp: new Date(row.timestamp),
      flagged: row.flagged,
      parentReviewed: row.parent_reviewed,
    }));
  } catch (error) {
    console.error('[ActivityLogger] Error getting activity feed:', error);
    return [];
  }
}

/**
 * Get activity summary statistics
 */
export async function getActivitySummary(
  childId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalActivities: number;
  flaggedCount: number;
  byType: Record<ActivityType, number>;
  byService: Record<string, number>;
}> {
  try {
    // Get total and flagged counts
    const countsResult = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE flagged = true) as flagged
       FROM child_activities
       WHERE child_id = $1
       AND timestamp >= $2
       AND timestamp <= $3`,
      [childId, startDate, endDate]
    );

    // Get counts by type
    const typeResult = await query(
      `SELECT activity_type, COUNT(*) as count
       FROM child_activities
       WHERE child_id = $1
       AND timestamp >= $2
       AND timestamp <= $3
       GROUP BY activity_type`,
      [childId, startDate, endDate]
    );

    // Get counts by service
    const serviceResult = await query(
      `SELECT service, COUNT(*) as count
       FROM child_activities
       WHERE child_id = $1
       AND timestamp >= $2
       AND timestamp <= $3
       AND service IS NOT NULL
       GROUP BY service`,
      [childId, startDate, endDate]
    );

    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.activity_type] = parseInt(row.count);
    });

    const byService: Record<string, number> = {};
    serviceResult.rows.forEach(row => {
      byService[row.service] = parseInt(row.count);
    });

    return {
      totalActivities: parseInt(countsResult.rows[0]?.total || 0),
      flaggedCount: parseInt(countsResult.rows[0]?.flagged || 0),
      byType: byType as Record<ActivityType, number>,
      byService,
    };
  } catch (error) {
    console.error('[ActivityLogger] Error getting activity summary:', error);
    return {
      totalActivities: 0,
      flaggedCount: 0,
      byType: {} as Record<ActivityType, number>,
      byService: {},
    };
  }
}

/**
 * Mark activity as reviewed by parent
 */
export async function markAsReviewed(activityId: string): Promise<void> {
  try {
    await query(
      `UPDATE child_activities
       SET parent_reviewed = true
       WHERE id = $1`,
      [activityId]
    );
  } catch (error) {
    console.error('[ActivityLogger] Error marking as reviewed:', error);
  }
}

/**
 * Get flagged activities count
 */
export async function getFlaggedCount(childId: string): Promise<number> {
  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM child_activities
       WHERE child_id = $1
       AND flagged = true
       AND parent_reviewed = false`,
      [childId]
    );

    return parseInt(result.rows[0]?.count || 0);
  } catch (error) {
    console.error('[ActivityLogger] Error getting flagged count:', error);
    return 0;
  }
}
