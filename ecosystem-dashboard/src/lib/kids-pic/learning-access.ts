/**
 * Learning access + usage enforcement.
 *
 * The learning endpoints (attempt / tutor / session) are child-facing and must
 * respect the SAME parental controls that gate chat: allowed hours and the daily
 * usage limit. Those controls + the `child_daily_usage` ledger are keyed by the
 * child's USER id (`users.id` / `parental_controls_config.child_user_id`), NOT the
 * PIC profile id that the learning APIs accept in their request bodies.
 *
 * This helper therefore operates on the authenticated child user id (session id)
 * and is intentionally best-effort: if the controls schema is unavailable it fails
 * OPEN (allows learning) so a missing table never bricks the learning loop, mirroring
 * the existing tutor/chat fallbacks.
 */
import type { Pool } from 'pg';

export interface LearningAccessState {
  /** True only for a child account with active parental controls. */
  controlled: boolean;
  /** False when blocked by allowed-hours or the daily usage limit. */
  allowed: boolean;
  reason?: string;
  currentUsageMinutes: number;
  dailyLimitMinutes: number;
  remainingMinutes: number;
}

const DEFAULT_DAILY_LIMIT_MINUTES = 120;

function uncontrolled(): LearningAccessState {
  return {
    controlled: false,
    allowed: true,
    currentUsageMinutes: 0,
    dailyLimitMinutes: 0,
    remainingMinutes: 0,
  };
}

/**
 * Resolve whether the authenticated user is a controlled child and, if so, whether
 * they may currently use learning (allowed hours + under the daily limit).
 */
export async function getLearningAccessState(pool: Pool, userId: string): Promise<LearningAccessState> {
  if (!userId) {
    return uncontrolled();
  }

  try {
    const result = await pool.query(
      `SELECT
         u.account_type AS account_type,
         COALESCE(pc.is_active, false) AS controls_active,
         COALESCE(pc.daily_usage_limit_minutes, $2) AS daily_limit,
         COALESCE(is_within_allowed_hours(u.id), true) AS within_hours,
         COALESCE(du.total_minutes, 0) AS current_minutes
       FROM users u
       LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
       LEFT JOIN child_daily_usage du
         ON du.child_user_id = u.id AND du.usage_date = CURRENT_DATE
       WHERE u.id = $1`,
      [userId, DEFAULT_DAILY_LIMIT_MINUTES],
    );

    const row = result.rows[0] as
      | {
          account_type: string | null;
          controls_active: boolean | null;
          daily_limit: string | number | null;
          within_hours: boolean | null;
          current_minutes: string | number | null;
        }
      | undefined;

    if (!row) {
      return uncontrolled();
    }

    const dailyLimitMinutes = Number.parseInt(`${row.daily_limit ?? DEFAULT_DAILY_LIMIT_MINUTES}`, 10) || DEFAULT_DAILY_LIMIT_MINUTES;
    const currentUsageMinutes = Number.parseInt(`${row.current_minutes ?? 0}`, 10) || 0;
    const remainingMinutes = Math.max(0, dailyLimitMinutes - currentUsageMinutes);
    const controlled = row.account_type === 'child' && row.controls_active === true;

    if (!controlled) {
      return {
        controlled: false,
        allowed: true,
        currentUsageMinutes,
        dailyLimitMinutes,
        remainingMinutes,
      };
    }

    const withinHours = row.within_hours !== false;
    const overLimit = dailyLimitMinutes > 0 && currentUsageMinutes >= dailyLimitMinutes;

    let allowed = true;
    let reason: string | undefined;
    if (!withinHours) {
      allowed = false;
      reason = 'Learning is outside your allowed hours right now. Come back during your learning time!';
    } else if (overLimit) {
      allowed = false;
      reason = "Time's up for learning today! Come back tomorrow.";
    }

    return {
      controlled: true,
      allowed,
      reason,
      currentUsageMinutes,
      dailyLimitMinutes,
      remainingMinutes,
    };
  } catch (error) {
    console.warn('[learning-access] usage state check failed (allowing):', error);
    return uncontrolled();
  }
}

/**
 * Add `minutes` to the child's daily learning usage ledger. Best-effort and a no-op
 * for non-controlled users; callers should only invoke this for controlled children.
 */
export async function recordLearningUsage(pool: Pool, userId: string, minutes = 1): Promise<void> {
  if (!userId || minutes <= 0) {
    return;
  }

  try {
    await pool.query(
      `INSERT INTO child_daily_usage (child_user_id, usage_date, total_minutes, message_count)
       VALUES ($1, CURRENT_DATE, $2, 1)
       ON CONFLICT (child_user_id, usage_date)
       DO UPDATE SET
         total_minutes = child_daily_usage.total_minutes + $2,
         message_count = child_daily_usage.message_count + 1,
         last_activity_at = NOW()`,
      [userId, minutes],
    );
  } catch (error) {
    console.warn('[learning-access] failed to record usage:', error);
  }
}
