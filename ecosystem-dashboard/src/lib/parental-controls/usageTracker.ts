/**
 * Usage Tracking System
 * 
 * Tracks child session time and enforces daily usage limits
 */

import { query } from '@/lib/db';

export interface UsageStats {
  todayMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  isOverLimit: boolean;
  activeSessionId?: string;
}

/**
 * Start a new usage session for a child
 */
export async function startSession(
  childId: string,
  service: string = 'dashboard'
): Promise<string> {
  try {
    // End any existing active sessions first
    await endActiveSessions(childId);

    // Create new session
    const result = await query(
      `INSERT INTO child_usage_sessions (child_id, service_used, started_at, last_heartbeat)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id`,
      [childId, service]
    );

    return result.rows[0].id;
  } catch (error) {
    console.error('[UsageTracker] Error starting session:', error);
    throw error;
  }
}

/**
 * Update session heartbeat to keep it alive
 */
export async function updateHeartbeat(sessionId: string): Promise<void> {
  try {
    await query(
      `UPDATE child_usage_sessions 
       SET last_heartbeat = NOW() 
       WHERE id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
  } catch (error) {
    console.error('[UsageTracker] Error updating heartbeat:', error);
  }
}

/**
 * End a usage session
 */
export async function endSession(sessionId: string): Promise<void> {
  try {
    await query(
      `UPDATE child_usage_sessions 
       SET ended_at = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
       WHERE id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
  } catch (error) {
    console.error('[UsageTracker] Error ending session:', error);
  }
}

/**
 * End all active sessions for a child (cleanup)
 */
export async function endActiveSessions(childId: string): Promise<void> {
  try {
    await query(
      `UPDATE child_usage_sessions 
       SET ended_at = NOW(),
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - started_at)) / 60
       WHERE child_id = $1 AND ended_at IS NULL`,
      [childId]
    );
  } catch (error) {
    console.error('[UsageTracker] Error ending active sessions:', error);
  }
}

/**
 * Get today's usage statistics for a child
 */
export async function getTodayUsage(childId: string): Promise<UsageStats> {
  try {
    // Get daily limit from parental controls
    const controlsResult = await query(
      `SELECT daily_usage_limit_minutes, controls_active
       FROM parental_controls
       WHERE child_id = $1`,
      [childId]
    );

    const limitMinutes = controlsResult.rows[0]?.daily_usage_limit_minutes || 0;
    const controlsActive = controlsResult.rows[0]?.controls_active || false;

    // If controls not active, return unlimited
    if (!controlsActive) {
      return {
        todayMinutes: 0,
        limitMinutes: 0,
        remainingMinutes: 999999,
        isOverLimit: false,
      };
    }

    // Get today's total usage
    const usageResult = await query(
      `SELECT 
        COALESCE(SUM(duration_minutes), 0) as completed_minutes,
        COALESCE(
          EXTRACT(EPOCH FROM (NOW() - MIN(started_at))) / 60,
          0
        ) as active_minutes
       FROM child_usage_sessions
       WHERE child_id = $1 
       AND DATE(started_at) = CURRENT_DATE
       AND (ended_at IS NOT NULL OR started_at IS NOT NULL)`,
      [childId]
    );

    const completedMinutes = parseFloat(usageResult.rows[0]?.completed_minutes || 0);
    
    // Check for active session
    const activeResult = await query(
      `SELECT id, started_at
       FROM child_usage_sessions
       WHERE child_id = $1 
       AND ended_at IS NULL
       AND DATE(started_at) = CURRENT_DATE
       ORDER BY started_at DESC
       LIMIT 1`,
      [childId]
    );

    let activeMinutes = 0;
    let activeSessionId: string | undefined;

    if (activeResult.rows.length > 0) {
      activeSessionId = activeResult.rows[0].id;
      const startedAt = new Date(activeResult.rows[0].started_at);
      activeMinutes = (Date.now() - startedAt.getTime()) / 60000;
    }

    const todayMinutes = Math.round(completedMinutes + activeMinutes);
    const remainingMinutes = Math.max(0, limitMinutes - todayMinutes);
    const isOverLimit = todayMinutes >= limitMinutes && limitMinutes > 0;

    return {
      todayMinutes,
      limitMinutes,
      remainingMinutes,
      isOverLimit,
      activeSessionId,
    };
  } catch (error) {
    console.error('[UsageTracker] Error getting today usage:', error);
    return {
      todayMinutes: 0,
      limitMinutes: 0,
      remainingMinutes: 0,
      isOverLimit: false,
    };
  }
}

/**
 * Check if child has exceeded daily limit
 */
export async function checkTimeLimit(childId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remainingMinutes?: number;
}> {
  try {
    const usage = await getTodayUsage(childId);

    if (usage.limitMinutes === 0) {
      // No limit set
      return { allowed: true };
    }

    if (usage.isOverLimit) {
      return {
        allowed: false,
        reason: `You've reached your daily limit of ${usage.limitMinutes} minutes`,
        remainingMinutes: 0,
      };
    }

    return {
      allowed: true,
      remainingMinutes: usage.remainingMinutes,
    };
  } catch (error) {
    console.error('[UsageTracker] Error checking time limit:', error);
    return { allowed: true }; // Fail open on error
  }
}

/**
 * Get usage history for date range
 */
export async function getUsageHistory(
  childId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: string; minutes: number }>> {
  try {
    const result = await query(
      `SELECT 
        DATE(started_at) as date,
        COALESCE(SUM(duration_minutes), 0) as minutes
       FROM child_usage_sessions
       WHERE child_id = $1 
       AND started_at >= $2 
       AND started_at < $3
       GROUP BY DATE(started_at)
       ORDER BY date DESC`,
      [childId, startDate, endDate]
    );

    return result.rows.map(row => ({
      date: row.date,
      minutes: Math.round(parseFloat(row.minutes)),
    }));
  } catch (error) {
    console.error('[UsageTracker] Error getting usage history:', error);
    return [];
  }
}

/**
 * Cleanup stale sessions (no heartbeat in 5+ minutes)
 */
export async function cleanupStaleSessions(): Promise<void> {
  try {
    await query(
      `UPDATE child_usage_sessions 
       SET ended_at = last_heartbeat,
           duration_minutes = EXTRACT(EPOCH FROM (last_heartbeat - started_at)) / 60
       WHERE ended_at IS NULL 
       AND last_heartbeat < NOW() - INTERVAL '5 minutes'`
    );
  } catch (error) {
    console.error('[UsageTracker] Error cleaning up stale sessions:', error);
  }
}
