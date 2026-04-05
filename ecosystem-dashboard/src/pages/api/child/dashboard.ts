/**
 * Child Dashboard API
 * 
 * Returns dashboard data for child accounts including theme preference
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Pool } from 'pg';
import { getChildTheme, ChildThemeId } from '@/lib/child-themes';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as any;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user info and check if child account
    const userResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.account_type,
        u.avatar_emoji,
        u.settings,
        pc.daily_usage_limit_minutes,
        pc.allowed_services,
        pc.blocked_services,
        pc.require_approval_for_image_generation,
        pc.require_approval_for_new_conversations
      FROM users u
      LEFT JOIN parental_controls_config pc ON pc.child_user_id = u.id
      WHERE u.id = $1
    `, [user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];
    
    // Get today's usage
    const today = new Date().toISOString().split('T')[0];
    const usageResult = await pool.query(`
      SELECT 
        COALESCE(total_minutes, 0) as total_minutes,
        COALESCE(message_count, 0) as message_count
      FROM child_daily_usage
      WHERE child_user_id = $1 AND usage_date = $2
    `, [user.id, today]);

    const usage = usageResult.rows[0] || { total_minutes: 0, message_count: 0 };
    const dailyLimit = userData.daily_usage_limit_minutes || 120;

    // Get streak (consecutive days with activity)
    const streakResult = await pool.query(`
      WITH daily_activity AS (
        SELECT DISTINCT DATE(created_at) as activity_date
        FROM child_activity_log
        WHERE child_user_id = $1
        ORDER BY activity_date DESC
      ),
      streak AS (
        SELECT 
          activity_date,
          activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC))::int as grp
        FROM daily_activity
      )
      SELECT COUNT(*) as streak_days
      FROM streak
      WHERE grp = (SELECT grp FROM streak LIMIT 1)
    `, [user.id]);

    const streakDays = parseInt(streakResult.rows[0]?.streak_days || '0');

    // Get achievements (placeholder - would be from achievements table)
    const achievements = [
      { id: '1', name: 'First Chat', emoji: '💬', description: 'Had your first conversation!', earnedAt: new Date().toISOString() },
      { id: '2', name: 'Explorer', emoji: '🔍', description: 'Tried 3 different services', earnedAt: new Date().toISOString() },
    ];

    // Build allowed services list with child-friendly names
    const allServices = [
      { id: 'personal-ai', name: 'AI Chat', emoji: '🤖', description: 'Chat with your AI friend', color: 'purple', path: '/goose-mind' },
      { id: 'goosemind-voice', name: 'Voice Chat', emoji: '🎙️', description: 'Talk to GooseMind', color: 'blue', path: '/goose-mind?mode=voice' },
      { id: 'image-studio', name: 'Art Studio', emoji: '🎨', description: 'Create amazing pictures', color: 'pink', path: '/image-studio' },
      { id: 'workspace', name: 'My Workspace', emoji: '📝', description: 'Write and create', color: 'green', path: '/workspace' },
      { id: 'calendar', name: 'Calendar', emoji: '📅', description: 'See your schedule', color: 'orange', path: '/calendar' },
      { id: 'email-client', name: 'Email', emoji: '✉️', description: 'Check your messages', color: 'teal', path: '/email' },
    ];

    const allowedServiceIds = userData.allowed_services || [];
    const blockedServiceIds = userData.blocked_services || [];

    // Filter services based on parental controls
    const allowedServices = allServices
      .filter(service => {
        // If no allowed list, allow all except blocked
        if (allowedServiceIds.length === 0) {
          return !blockedServiceIds.includes(service.id);
        }
        // Otherwise, must be in allowed and not in blocked
        return allowedServiceIds.includes(service.id) && !blockedServiceIds.includes(service.id);
      })
      .map(service => ({
        ...service,
        isAvailable: true,
        requiresApproval: service.id === 'image-studio' && userData.require_approval_for_image_generation,
      }));

    // Get theme preference from user settings
    const settings = userData.settings || {};
    const themeId = (settings.theme as ChildThemeId) || 'child-default';
    const theme = getChildTheme(themeId);

    return res.status(200).json({
      name: userData.name?.split(' ')[0] || 'Friend',
      avatarEmoji: userData.avatar_emoji || theme.childExtras.avatar.default,
      todayUsageMinutes: usage.total_minutes,
      dailyLimitMinutes: dailyLimit,
      remainingMinutes: Math.max(0, dailyLimit - usage.total_minutes),
      messageCount: usage.message_count,
      streakDays,
      achievements,
      allowedServices,
      blockedServices: blockedServiceIds,
      // Theme data
      themeId,
      theme: {
        id: theme.id,
        name: theme.name,
        colors: theme.colors,
        childExtras: theme.childExtras,
      },
    });
  } catch (error) {
    console.error('[Child Dashboard API] Error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
}
