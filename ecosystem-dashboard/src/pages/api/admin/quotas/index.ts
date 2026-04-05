/**
 * Admin Quota Management API
 * 
 * GET: List all users with their quota status
 * POST: Update user quota or plan
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

  const user = session.user as any;

  // Check if user is admin
  const adminCheck = await pool.query(
    "SELECT platform_role FROM users WHERE id = $1 AND platform_role IN ('platform-admin', 'administrator')",
    [user.id]
  );

  if (adminCheck.rows.length === 0) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // GET: List all users with quota status
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.account_type,
          u.platform_role,
          sp.name as plan_name,
          sp.display_name as plan_display_name,
          uq.storage_used_bytes,
          COALESCE(uq.storage_quota_bytes_override, sp.storage_quota_bytes) as storage_quota_bytes,
          uq.image_count,
          COALESCE(uq.image_count_limit_override, sp.image_count_limit) as image_count_limit,
          uq.daily_image_generations,
          COALESCE(uq.daily_image_generations_limit_override, sp.daily_image_generations_limit) as daily_limit,
          uq.monthly_image_generations,
          sp.monthly_image_generations_limit as monthly_limit,
          uq.is_quota_exceeded,
          uq.created_at,
          uq.updated_at
        FROM users u
        LEFT JOIN user_quotas uq ON uq.user_id = u.id
        LEFT JOIN subscription_plans sp ON sp.id = uq.subscription_plan_id
        ORDER BY u.name
      `);

      // Get available plans
      const plans = await pool.query(`
        SELECT id, name, display_name, storage_quota_bytes, image_count_limit, 
               daily_image_generations_limit, monthly_image_generations_limit
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY storage_quota_bytes NULLS LAST
      `);

      return res.status(200).json({
        users: result.rows,
        plans: plans.rows,
      });
    } catch (error: any) {
      console.error('[Admin Quota API] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch quotas' });
    }
  }

  // POST: Update user quota
  if (req.method === 'POST') {
    const { 
      user_id, 
      subscription_plan_id,
      storage_quota_bytes_override,
      image_count_limit_override,
      daily_image_generations_limit_override,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id required' });
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (subscription_plan_id !== undefined) {
        updates.push(`subscription_plan_id = $${paramIndex++}`);
        values.push(subscription_plan_id);
      }

      if (storage_quota_bytes_override !== undefined) {
        updates.push(`storage_quota_bytes_override = $${paramIndex++}`);
        values.push(storage_quota_bytes_override);
      }

      if (image_count_limit_override !== undefined) {
        updates.push(`image_count_limit_override = $${paramIndex++}`);
        values.push(image_count_limit_override);
      }

      if (daily_image_generations_limit_override !== undefined) {
        updates.push(`daily_image_generations_limit_override = $${paramIndex++}`);
        values.push(daily_image_generations_limit_override);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      values.push(user_id);
      
      const result = await pool.query(`
        UPDATE user_quotas
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramIndex}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User quota not found' });
      }

      return res.status(200).json({
        success: true,
        quota: result.rows[0],
      });
    } catch (error: any) {
      console.error('[Admin Quota API] Error:', error);
      return res.status(500).json({ error: 'Failed to update quota' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
