/**
 * Admin User Detail API
 * 
 * GET: Get detailed user info including subscription and quota
 * PUT: Update user details
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const currentUser = session.user as any;

  // Check if user is admin
  const adminCheck = await pool.query(
    "SELECT platform_role FROM users WHERE id = $1 AND platform_role IN ('platform-admin', 'administrator')",
    [currentUser.id]
  );

  if (adminCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID required' });
  }

  // GET: Get detailed user info
  if (req.method === 'GET') {
    try {
      // Get user details
      const userResult = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.avatar_url,
          u.account_type,
          u.platform_role,
          u.status,
          u.created_at,
          u.last_active_at,
          u.parent_user_id,
          parent.name as parent_name
        FROM users u
        LEFT JOIN users parent ON parent.id = u.parent_user_id
        WHERE u.id = $1
      `, [id]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Get quota info
      const quotaResult = await pool.query(`
        SELECT 
          uq.*,
          sp.name as plan_name,
          sp.display_name as plan_display_name,
          sp.storage_quota_bytes as plan_storage_quota,
          sp.image_count_limit as plan_image_limit,
          sp.daily_image_generations_limit as plan_daily_limit,
          sp.monthly_image_generations_limit as plan_monthly_limit,
          sp.price_monthly_cents,
          sp.price_yearly_cents
        FROM user_quotas uq
        JOIN subscription_plans sp ON sp.id = uq.subscription_plan_id
        WHERE uq.user_id = $1
      `, [id]);

      const quota = quotaResult.rows[0] || null;

      // Get subscription info
      const subscriptionResult = await pool.query(`
        SELECT 
          s.*,
          sp.name as plan_name,
          sp.display_name as plan_display_name
        FROM subscriptions s
        JOIN subscription_plans sp ON sp.id = s.plan_id
        WHERE s.user_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1
      `, [id]);

      const subscription = subscriptionResult.rows[0] || null;

      // Get recent payments
      const paymentsResult = await pool.query(`
        SELECT 
          id,
          amount_cents,
          currency,
          status,
          description,
          is_simulated,
          created_at
        FROM payments
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [id]);

      // Get children (if parent)
      const childrenResult = await pool.query(`
        SELECT id, name, email, avatar_url, status
        FROM users
        WHERE parent_user_id = $1
      `, [id]);

      // Get usage stats
      const usageResult = await pool.query(`
        SELECT 
          COUNT(*) as total_images,
          SUM(COALESCE(file_size_bytes, 0)) as total_storage
        FROM generated_images
        WHERE user_id = $1
      `, [id]);

      const usage = usageResult.rows[0] || { total_images: 0, total_storage: 0 };

      return res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatar_url,
          accountType: user.account_type,
          platformRole: user.platform_role,
          status: user.status,
          createdAt: user.created_at,
          lastActiveAt: user.last_active_at,
          parentUserId: user.parent_user_id,
          parentName: user.parent_name,
        },
        quota: quota ? {
          planId: quota.subscription_plan_id,
          planName: quota.plan_name,
          planDisplayName: quota.plan_display_name,
          storage: {
            quota: quota.storage_quota_bytes_override || quota.plan_storage_quota,
            used: quota.storage_used_bytes,
            usedPercent: quota.plan_storage_quota 
              ? Math.round((quota.storage_used_bytes / (quota.storage_quota_bytes_override || quota.plan_storage_quota)) * 100)
              : 0,
          },
          images: {
            limit: quota.image_count_limit_override || quota.plan_image_limit,
            count: quota.image_count,
          },
          dailyGenerations: {
            limit: quota.daily_image_generations_limit_override || quota.plan_daily_limit,
            used: quota.daily_image_generations,
          },
          monthlyGenerations: {
            limit: quota.plan_monthly_limit,
            used: quota.monthly_image_generations,
          },
          isQuotaExceeded: quota.is_quota_exceeded,
          pricing: {
            monthly: quota.price_monthly_cents,
            yearly: quota.price_yearly_cents,
          },
        } : null,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          billingCycle: subscription.billing_cycle,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          planName: subscription.plan_name,
          planDisplayName: subscription.plan_display_name,
        } : null,
        payments: paymentsResult.rows.map(p => ({
          id: p.id,
          amount: p.amount_cents,
          currency: p.currency,
          status: p.status,
          description: p.description,
          isSimulated: p.is_simulated,
          date: p.created_at,
        })),
        children: childrenResult.rows,
        usage: {
          totalImages: parseInt(usage.total_images) || 0,
          totalStorage: parseInt(usage.total_storage) || 0,
        },
      });
    } catch (error: any) {
      console.error('[User Detail API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch user details' });
    }
  }

  // PUT: Update user
  if (req.method === 'PUT') {
    const { planId, status, platformRole } = req.body;

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }

      if (platformRole) {
        updates.push(`platform_role = $${paramIndex++}`);
        values.push(platformRole);
      }

      if (updates.length > 0) {
        values.push(id);
        await pool.query(`
          UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `, values);
      }

      // Update plan if provided
      if (planId) {
        await pool.query(`
          UPDATE user_quotas SET subscription_plan_id = $1, updated_at = NOW()
          WHERE user_id = $2
        `, [planId, id]);
      }

      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[User Detail API] Error:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
